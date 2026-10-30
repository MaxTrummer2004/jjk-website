"use server";

import { revalidatePath } from "next/cache";
import { ensureSchema, sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { getCurrentMember } from "@/lib/members";
import { mostRecentTrainingDay, toDateOnly } from "@/lib/attendance";
import { clientIp, hit, refund, type Limit } from "@/lib/rate-limit";

export interface ActionResult {
  error?: string;
}

const LOGIN_IP: Limit = { bucket: "login-ip", max: 50, windowSeconds: 15 * 60 };
const LOGIN_EMAIL: Limit = { bucket: "login-email", max: 8, windowSeconds: 15 * 60 };

/**
 * Registrieren gibt es hier nicht mehr: ein Konto entsteht nur noch ueber die
 * Beitrittserklaerung (app/beitreten). Mit ihr ist auch `lookupUsernameAction`
 * gegangen — sie lieferte OHNE Login zu jedem Benutzernamen den echten Namen,
 * also eine Liste, wer Mitglied ist, fuer jeden, der raten mag.
 */
export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await ensureSchema();

  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  // Grenze gegen Passwort-Raten (30.10.2026), zwei Zaehler:
  //   je IP    50 Fehlversuche / 15 min — eine Maschine, die viele Konten abklappert
  //            (50 statt 20, Review 30.10.2026: geteilte IP im Gym-WLAN)
  //   je Konto  8 Fehlversuche / 15 min — viele Maschinen gegen ein Konto
  // Gezaehlt wird VOR bcrypt und bei Erfolg zurueckgegeben (refund), netto
  // also nur Fehlversuche. Erst pruefen und nur bei Fehlschlag zaehlen liesse
  // hundert parallele Anfragen alle am Zaehler vorbei, solange bcrypt rechnet.
  // Ist die Grenze erreicht, wird auch das RICHTIGE Passwort abgewiesen, ohne
  // es zu pruefen — sonst waere die Sperre ein Orakel. Nach Ablauf des
  // Fensters geht es von selbst wieder; dauerhaft sperrt nichts. Der Preis:
  // wer die Adresse eines Mitglieds kennt, kann dessen Login 15 Minuten lang
  // blockieren. Das ist das kleinere Uebel gegenueber unbegrenztem Raten.
  const ip = await clientIp();
  // Erst die IP: ist sie schon gesperrt, wird der Zaehler je Adresse gar
  // nicht erst beruehrt (sonst schriebe ein gesperrter Angreifer weiter
  // billig Zeilen in rate_limits).
  const byIp = await hit(LOGIN_IP, ip);
  const byEmail = byIp && email ? await hit(LOGIN_EMAIL, email) : true;
  if (!byIp || !byEmail) {
    return { error: "Zu viele Versuche. Bitte in 15 Minuten nochmal." };
  }

  const result = await sql<{ id: number; password_hash: string }>`
    select id, password_hash from members where email = ${email}
  `;
  const row = result[0];
  // Ohne Konto rechnet verifyPassword gegen einen Blindhash — gleiche Dauer,
  // damit die Antwortzeit nicht verraet, ob die Adresse Mitglied ist.
  if (!(await verifyPassword(password, row?.password_hash)) || !row) {
    return { error: "E-Mail-Adresse oder Passwort falsch." };
  }
  await Promise.all([refund(LOGIN_IP, ip), refund(LOGIN_EMAIL, email)]);

  // Kein Haken heisst: das Cookie endet mit dem Browser. Das ist der Grund,
  // warum es den Haken gibt — an einem geteilten Rechner soll das Schliessen
  // des Fensters reichen.
  await createSession(row.id, formData.get("remember") !== null);
  revalidatePath("/mitglieder");
  return {};
}

/**
 * Passwort ueber einen Einrichtungslink festlegen (/konto-einrichten?token=…).
 * Den Link erzeugt der Vorstand per SQL fuer Trainer- und Vorstandskonten.
 * Der Token gilt genau einmal und wird beim Setzen geloescht.
 */
export async function setupPasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await ensureSchema();
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  if (token.length < 16) return { error: "Der Link ist ungültig." };
  if (password.length < 8) return { error: "Das Passwort braucht mindestens 8 Zeichen." };
  if (password !== password2) return { error: "Die beiden Passwörter stimmen nicht überein." };

  const hash = await hashPassword(password);
  const rows = await sql<{ id: number }>`
    update members set password_hash = ${hash}, setup_token = null
    where setup_token = ${token}
    returning id
  `;
  const id = rows[0]?.id;
  if (!id) return { error: "Der Link ist ungültig oder wurde schon benutzt." };

  await createSession(id, true);
  redirect("/mitglieder");
}

/** Eigenes Passwort aendern, im Mitgliederbereich. */
export async function changePasswordAction(
  _prev: ActionResult & { ok?: boolean },
  formData: FormData
): Promise<ActionResult & { ok?: boolean }> {
  await ensureSchema();
  const member = await getCurrentMember();
  if (!member) return { error: "Bitte zuerst einloggen." };

  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  if (password.length < 8) return { error: "Das neue Passwort braucht mindestens 8 Zeichen." };
  if (password !== password2) return { error: "Die beiden neuen Passwörter stimmen nicht überein." };

  const rows = await sql<{ password_hash: string }>`
    select password_hash from members where id = ${member.id}
  `;
  if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) {
    return { error: "Das aktuelle Passwort stimmt nicht." };
  }
  const hash = await hashPassword(password);
  await sql`update members set password_hash = ${hash} where id = ${member.id}`;
  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  revalidatePath("/mitglieder");
}

export async function voteAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await ensureSchema();

  const member = await getCurrentMember();
  if (!member) return { error: "Bitte zuerst einloggen." };
  if (member.status !== "active") {
    return { error: "Abstimmen geht, sobald der Vorstand dich aufgenommen hat." };
  }
  const memberId = member.id;

  const present = formData.get("present") === "true";
  const trainingDate = toDateOnly(mostRecentTrainingDay(new Date()));

  await sql`
    insert into attendance_votes (member_id, training_date, present)
    values (${memberId}, ${trainingDate}, ${present})
    on conflict (member_id, training_date)
    do update set present = excluded.present
  `;
  revalidatePath("/mitglieder");
  return {};
}
