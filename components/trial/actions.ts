"use server";

import { ensureSchema, sql } from "@/lib/db";
import { boardEmails, sendMail } from "@/lib/mail";
import { clientIp, hit, type Limit } from "@/lib/rate-limit";

/**
 * Probetraining-Anfrage. Speichert in die Datenbank (der Vorstand sieht sie
 * unter /vorstand) und schickt ueber Brevo (lib/mail.ts) zwei Mails: eine
 * Eingangsbestaetigung an den Anfragenden, falls er eine E-Mail-Adresse
 * angegeben hat, und einen Hinweis an BOARD_EMAILS. Ohne BREVO_API_KEY
 * entfallen beide still, gespeichert wird trotzdem.
 *
 * Spam: ein unsichtbares Feld ("website"), das Menschen leer lassen und
 * einfache Bots ausfuellen. Wer es fuellt, bekommt "danke" und es wird nichts
 * gespeichert.
 *
 * Seit 30.10.2026 zusaetzlich eine Mengengrenze (lib/rate-limit.ts). Die
 * Bestaetigung geht an eine Adresse, die niemand bestaetigt hat — ohne Grenze
 * koennte jeder ueber dieses Formular fremde Postfaecher mit Mails in unserem
 * Namen fuellen. Drei Anfragen je IP und Stunde, drei je Kontaktangabe und
 * Tag: mehr braucht kein Mensch, der ein Probetraining will.
 */
const TRIAL_IP: Limit = { bucket: "trial-ip", max: 3, windowSeconds: 60 * 60 };
const TRIAL_CONTACT: Limit = { bucket: "trial-contact", max: 3, windowSeconds: 24 * 60 * 60 };

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
  // Beide Zaehler laufen immer (kein Kurzschluss), damit auch ein Versuch,
  // der an der IP scheitert, beim Kontakt mitzaehlt. Kontakt klein und ohne
  // Leerzeichen, sonst waere "A@x.at" ein anderer Schluessel als "a@x.at ".
  const [byIp, byContact] = await Promise.all([
    hit(TRIAL_IP, await clientIp()),
    hit(TRIAL_CONTACT, contact.toLowerCase().replace(/\s+/g, "")),
  ]);
  if (!byIp || !byContact) {
    return {
      error:
        "Dazu sind in letzter Zeit schon mehrere Anfragen bei uns eingegangen. Bitte versuch es später nochmal.",
    };
  }

  await sql`
    insert into trial_requests (name, contact, preferred_day, message)
    values (${name}, ${contact}, ${day || null}, ${message || null})
  `;

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  await Promise.all([
    isEmail
      ? sendMail({
          to: contact,
          subject: "Deine Anfrage fürs Probetraining ist angekommen",
          text: `Hallo ${name},\n\ndanke für deine Anfrage, sie ist bei uns angekommen, wir melden uns bei dir.\n\nJiu Jitsu Kaisen Akademie\nhttps://jjk.academy`,
        })
      : Promise.resolve(),
    sendMail({
      to: boardEmails(),
      subject: `Probetraining-Anfrage: ${name}`,
      text: `${name}\nKontakt: ${contact}\nWunschtag: ${day || "egal"}\n${message ? `\n${message}\n` : ""}\nAlle Anfragen: https://jjk.academy/vorstand`,
      ...(isEmail ? { replyTo: contact } : {}),
    }),
  ]);
  return { ok: true };
}
