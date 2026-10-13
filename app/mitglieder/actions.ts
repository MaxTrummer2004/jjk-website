"use server";

import { revalidatePath } from "next/cache";
import { ensureSchema, sql } from "@/lib/db";
import { redirect } from "next/navigation";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { getCurrentMember } from "@/lib/members";
import { mostRecentTrainingDay, toDateOnly } from "@/lib/attendance";

export interface ActionResult {
  error?: string;
}

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

  const result = await sql`
    select id, password_hash, status from members where email = ${email}
  `;
  const row = result[0];
  if (!row || !(await verifyPassword(password, row.password_hash as string))) {
    return { error: "E-Mail-Adresse oder Passwort falsch." };
  }

  // Kein Haken heisst: das Cookie endet mit dem Browser. Das ist der Grund,
  // warum es den Haken gibt — an einem geteilten Rechner soll das Schliessen
  // des Fensters reichen.
  await createSession(row.id as number, formData.get("remember") !== null);
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
