"use server";

import { revalidatePath } from "next/cache";
import { ensureSchema, sql } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  MAX_EMAIL_CHARS,
  MAX_PASSWORD_CHECK_CHARS,
  PASSWORD_TOO_LONG,
  createSession,
  destroySession,
  hashPassword,
  passwordTooLong,
  readSessionClaims,
  verifyPassword,
} from "@/lib/auth";
import { getCurrentMember } from "@/lib/members";
import { mostRecentTrainingDay, toDateOnly } from "@/lib/attendance";
import { clientIp, hit, refund, type Limit } from "@/lib/rate-limit";
import { hashSetupToken } from "@/lib/setup-token";

export interface ActionResult {
  error?: string;
}

const LOGIN_IP: Limit = { bucket: "login-ip", max: 50, windowSeconds: 15 * 60 };
const LOGIN_EMAIL: Limit = { bucket: "login-email", max: 8, windowSeconds: 15 * 60 };

// Grenzen fuer die beiden anderen Stellen, an denen bcrypt rechnet
// (31.10.2026). Ein bcrypt-Lauf mit Kostenstufe 10 haelt den Node-Prozess
// rund 70 ms fest; ohne Grenze legten etwa zehn Anfragen pro Sekunde die
// ganze Seite lahm. Anders als beim Login gibt es hier KEIN refund: auch ein
// erfolgreicher Versuch rechnet (Pruefen und neu Hashen), und wer sein
// eigenes Passwort kennt, koennte sonst endlos im Kreis aendern.
//   Einrichtungslink 10 / 15 min je IP — ein Mensch braucht einen Versuch,
//                    hoechstens zwei, wenn die Wiederholung nicht passt
//   Passwortwechsel   5 / 15 min je Konto — ein Konto gibt es fuer jeden,
//                    der /beitreten ausfuellt; 20 / 15 min je IP gegen viele
//                    solche Konten von einer Maschine
const SETUP_IP: Limit = { bucket: "setup-ip", max: 10, windowSeconds: 15 * 60 };
const CHANGE_MEMBER: Limit = { bucket: "pwchange-member", max: 5, windowSeconds: 15 * 60 };
const CHANGE_IP: Limit = { bucket: "pwchange-ip", max: 20, windowSeconds: 15 * 60 };

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
  // Uebergrosse Eingaben gar nicht erst pruefen (lib/auth.ts). Nach dem
  // Zaehler, damit auch sie als Fehlversuch zaehlen.
  if (email.length > MAX_EMAIL_CHARS || password.length > MAX_PASSWORD_CHECK_CHARS) {
    return { error: "E-Mail-Adresse oder Passwort falsch." };
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
 * Den Link erzeugt der Vorstand unter /vorstand (Trainer und Vorstand, oder
 * "Passwort vergessen"). Er gilt einmal und 72 Stunden (lib/setup-token.ts).
 *
 * Reihenfolge seit 31.10.2026: Grenze, dann Token, dann bcrypt. Vorher wurde
 * das neue Passwort gehasht, BEVOR feststand, ob der Token ueberhaupt passt —
 * jeder beliebige 16-Zeichen-Unsinn kostete einen vollen bcrypt-Lauf, und
 * schon zehn solche Anfragen pro Sekunde reichten, um den Prozess zu
 * saettigen. Jetzt kostet ein falscher Token eine Indexsuche.
 */
export async function setupPasswordAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await ensureSchema();
  if (!(await hit(SETUP_IP, await clientIp()))) {
    return { error: "Zu viele Versuche. Bitte in 15 Minuten nochmal." };
  }
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  // Echte Tokens haben 48 Zeichen; alles ueber 128 ist kein Link von uns.
  if (token.length < 16 || token.length > 128) return { error: "Der Link ist ungültig." };
  if (password.length < 8) return { error: "Das Passwort braucht mindestens 8 Zeichen." };
  if (passwordTooLong(password)) return { error: PASSWORD_TOO_LONG };
  if (password !== password2) return { error: "Die beiden Passwörter stimmen nicht überein." };

  const tokenHash = hashSetupToken(token);
  const found = await sql<{ id: number; expired: boolean }>`
    select id, (setup_token_expires_at is null or setup_token_expires_at <= now()) as expired
    from members where setup_token_hash = ${tokenHash}
  `;
  const target = found[0];
  if (!target) return { error: "Der Link ist ungültig oder wurde schon benutzt." };
  if (target.expired) {
    return { error: "Der Link ist abgelaufen. Bitte beim Vorstand einen neuen anfordern." };
  }

  const hash = await hashPassword(password);
  // Die Bedingung steht im UPDATE noch einmal: zwei gleichzeitige Absendungen
  // desselben Links rechnen beide, aber nur eine findet die Zeile noch vor.
  // session_version + 1 meldet jede andere Sitzung dieses Kontos ab — wer
  // einen Link fuer "Passwort vergessen" bekommt, soll nicht neben einem
  // noch offenen fremden Login weiterarbeiten.
  const rows = await sql<{ id: number }>`
    update members
    set password_hash = ${hash}, setup_token_hash = null, setup_token_expires_at = null,
        setup_token = null, session_version = session_version + 1
    where id = ${target.id} and setup_token_hash = ${tokenHash}
      and setup_token_expires_at > now()
    returning id
  `;
  const id = rows[0]?.id;
  if (!id) return { error: "Der Link ist ungültig oder wurde schon benutzt." };

  await createSession(id, true);
  redirect("/mitglieder");
}

/**
 * Eigenes Passwort aendern, im Mitgliederbereich.
 *
 * Seit 31.10.2026 meldet das alle ANDEREN Sitzungen des Kontos ab (Version
 * hoch), und genau diese eine bleibt eingeloggt: das Cookie wird mit der neuen
 * Version neu ausgestellt, mit derselben Lebensdauer wie vorher. Wer sein
 * Passwort aendert, weil es jemand anderes kennt, will genau das. Ein offener
 * Einrichtungslink verfaellt dabei mit — er wuerde das neue Passwort sonst
 * wieder ueberschreiben koennen.
 */
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
  if (passwordTooLong(password)) return { error: PASSWORD_TOO_LONG };
  if (password !== password2) return { error: "Die beiden neuen Passwörter stimmen nicht überein." };
  if (current.length > MAX_PASSWORD_CHECK_CHARS) return { error: "Das aktuelle Passwort stimmt nicht." };

  // Erst das Konto, dann die IP: ist das Konto schon gesperrt, wird der
  // IP-Zaehler nicht weiter beschrieben (wie beim Login).
  const byMember = await hit(CHANGE_MEMBER, `m${member.id}`);
  const byIp = byMember ? await hit(CHANGE_IP, await clientIp()) : true;
  if (!byMember || !byIp) {
    return { error: "Zu viele Versuche. Bitte in 15 Minuten nochmal." };
  }

  const rows = await sql<{ password_hash: string }>`
    select password_hash from members where id = ${member.id}
  `;
  if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) {
    return { error: "Das aktuelle Passwort stimmt nicht." };
  }
  const hash = await hashPassword(password);
  await sql`
    update members
    set password_hash = ${hash}, session_version = session_version + 1,
        setup_token_hash = null, setup_token_expires_at = null, setup_token = null
    where id = ${member.id}
  `;
  const claims = await readSessionClaims();
  await createSession(member.id, claims?.remember ?? true);
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
