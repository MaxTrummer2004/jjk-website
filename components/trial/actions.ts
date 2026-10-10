"use server";

import { ensureSchema, sql } from "@/lib/db";

/**
 * Probetraining-Anfrage. Speichert nur in die Datenbank; der Vorstand sieht
 * sie unter /vorstand. Kein Mailversand — dafuer gibt es (noch) keinen
 * Dienst, und eine Website, die Mails verschickt, braucht einen weiteren
 * Auftragsverarbeiter in der Datenschutzerklaerung.
 *
 * Spam: ein unsichtbares Feld ("website"), das Menschen leer lassen und
 * einfache Bots ausfuellen. Wer es fuellt, bekommt "danke" und es wird nichts
 * gespeichert.
 */

export interface TrialState {
  ok?: boolean;
  error?: string;
}

const DAYS = new Set(["", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]);

export async function requestTrialAction(_prev: TrialState, formData: FormData): Promise<TrialState> {
  if (String(formData.get("website") ?? "") !== "") return { ok: true };

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const contact = String(formData.get("contact") ?? "").trim().slice(0, 200);
  const day = String(formData.get("day") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);

  if (!name) return { error: "Bitte deinen Namen angeben." };
  if (contact.length < 5) {
    return { error: "Bitte eine E-Mail-Adresse, Telefonnummer oder deinen Instagram-Namen angeben." };
  }
  if (!DAYS.has(day)) return { error: "Ungültiger Tag." };

  await ensureSchema();
  await sql`
    insert into trial_requests (name, contact, preferred_day, message)
    values (${name}, ${contact}, ${day || null}, ${message || null})
  `;
  return { ok: true };
}
