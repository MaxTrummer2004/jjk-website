"use server";

import { revalidatePath } from "next/cache";
import { ensureSchema, sql } from "@/lib/db";
import {
  createSession,
  destroySession,
  getSessionMemberId,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import { mostRecentTrainingDay, toDateOnly } from "@/lib/attendance";

export interface ActionResult {
  error?: string;
}

const USERNAME_RE = /^[a-z0-9_.-]{3,24}$/;

export async function registerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await ensureSchema();

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name) return { error: "Bitte deinen Namen eingeben." };
  if (!USERNAME_RE.test(username)) {
    return {
      error: "Benutzername: 3–24 Zeichen, nur Buchstaben, Zahlen, . _ -",
    };
  }
  if (password.length < 6) {
    return { error: "Passwort braucht mindestens 6 Zeichen." };
  }

  const existing = await sql`select id from members where username = ${username}`;
  if (existing.rows.length > 0) {
    return { error: "Der Benutzername ist schon vergeben." };
  }

  const passwordHash = await hashPassword(password);
  const inserted = await sql`
    insert into members (name, username, password_hash)
    values (${name}, ${username}, ${passwordHash})
    returning id
  `;
  const memberId = inserted.rows[0]?.id as number;
  await createSession(memberId);
  revalidatePath("/mitglieder");
  return {};
}

export async function loginAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await ensureSchema();

  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  const result = await sql`
    select id, password_hash from members where username = ${username}
  `;
  const row = result.rows[0];
  if (!row || !(await verifyPassword(password, row.password_hash as string))) {
    return { error: "Benutzername oder Passwort falsch." };
  }

  await createSession(row.id as number);
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

  const memberId = await getSessionMemberId();
  if (!memberId) return { error: "Bitte zuerst einloggen." };

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
