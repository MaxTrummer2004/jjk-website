"use server";

import { revalidatePath } from "next/cache";
import { ensureSchema, sql } from "@/lib/db";
import { createSession, destroySession, verifyPassword } from "@/lib/auth";
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
