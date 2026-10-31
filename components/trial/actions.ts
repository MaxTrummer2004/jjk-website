"use server";

import { ensureSchema, sql } from "@/lib/db";
import { boardEmails, sendMail } from "@/lib/mail";
import { clientIp, hit, type Limit } from "@/lib/rate-limit";
import { MAX, lineError, nameError } from "@/lib/input";

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
 *
 * Seit 31.10.2026 (Sicherheitsreview): Name hoechstens 60 Zeichen und ohne
 * Links, Mailadressen, Umbrueche (lib/input.ts), Kontakt hoechstens 120. Die
 * Bestaetigung an den Anfragenden enthaelt KEIN frei eingegebenes Zeichen
 * mehr, weder Name noch Nachricht — siehe dort. Ausserdem raeumt jede neue
 * Anfrage die ueber drei Monate alten weg, siehe unten.
 */
// 10 statt 3 je IP (Review 30.10.2026), aus demselben Grund wie beim
// Beitritt: geteilte IP im Gym-WLAN. Die Grenze je Kontakt bleibt bei 3.
const TRIAL_IP: Limit = { bucket: "trial-ip", max: 10, windowSeconds: 60 * 60 };
const TRIAL_CONTACT: Limit = { bucket: "trial-contact", max: 3, windowSeconds: 24 * 60 * 60 };

export interface TrialState {
  ok?: boolean;
  error?: string;
  /** Die Eingaben zurueck, wie beim Beitritt: ein Fehler soll die Nachricht
   *  nicht loeschen (React setzt das Formular nach jeder Action zurueck). */
  values?: Record<string, string>;
  /** Zaehlt hoch, damit trial-form.tsx mit den alten Werten neu aufbaut. */
  attempt?: number;
}

const DAYS = new Set(["", "Mo", "Di", "Mi", "Do", "Fr", "Sa"]);

export async function requestTrialAction(prev: TrialState, formData: FormData): Promise<TrialState> {
  if (String(formData.get("website") ?? "") !== "") return { ok: true };

  // Kein stilles Abschneiden mehr bei Name und Kontakt (31.10.2026): wer
  // mehr schreibt, bekommt eine Meldung. Die Nachricht wird weiter bei 1000
  // gekappt — das Textfeld laesst ohnehin nicht mehr zu, und mehr als die
  // Laenge wird an ihr bewusst nicht geprueft: sie geht nur an den Vorstand.
  const name = String(formData.get("name") ?? "").trim().normalize("NFC");
  const contact = String(formData.get("contact") ?? "").trim();
  const day = String(formData.get("day") ?? "");
  const message = String(formData.get("message") ?? "").trim().slice(0, MAX.message);

  const attempt = (prev.attempt ?? 0) + 1;
  const fail = (error: string): TrialState => ({ error, values: { name, contact, day, message }, attempt });

  if (!name) return fail("Bitte deinen Namen angeben.");
  const nameProblem = nameError(name, "Der Name");
  if (nameProblem) return fail(nameProblem);
  if (contact.length < 5) {
    return fail("Bitte eine E-Mail-Adresse, Telefonnummer oder deinen Instagram-Namen angeben.");
  }
  const contactProblem = lineError(contact, "Die Kontaktangabe", MAX.contact);
  if (contactProblem) return fail(contactProblem);
  if (!DAYS.has(day)) return fail("Ungültiger Tag.");

  await ensureSchema();
  // Beide Zaehler laufen immer (kein Kurzschluss), damit auch ein Versuch,
  // der an der IP scheitert, beim Kontakt mitzaehlt. Kontakt klein und ohne
  // Leerzeichen, sonst waere "A@x.at" ein anderer Schluessel als "a@x.at ".
  const [byIp, byContact] = await Promise.all([
    hit(TRIAL_IP, await clientIp()),
    hit(TRIAL_CONTACT, contact.toLowerCase().replace(/\s+/g, "")),
  ]);
  if (!byIp || !byContact) {
    return fail(
      "Dazu sind in letzter Zeit schon mehrere Anfragen bei uns eingegangen. Bitte versuch es später nochmal."
    );
  }

  await sql`
    insert into trial_requests (name, contact, preferred_day, message)
    values (${name}, ${contact}, ${day || null}, ${message || null})
  `;
  // Drei Monate, wie die Datenschutzerklaerung verspricht (31.10.2026). Bis
  // dahin raeumte das nur app/vorstand/page.tsx beim Oeffnen auf — schaute
  // der Vorstand ein halbes Jahr nicht hinein, lagen die Anfragen ein halbes
  // Jahr. Jetzt auch hier, bei jeder neuen Anfrage; die Stelle unter
  // /vorstand bleibt, fuer Zeiten ohne neue Anfragen. Ein Fehler beim
  // Aufraeumen darf die Anfrage nicht scheitern lassen: sie ist schon
  // gespeichert, und der naechste Aufruf raeumt mit.
  await sql`delete from trial_requests where created_at < now() - interval '3 months'`.catch(
    (err: unknown) => console.error("[probetraining] aufraeumen", err)
  );

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  await Promise.all([
    isEmail
      ? sendMail({
          to: contact,
          subject: "Deine Anfrage fürs Probetraining ist angekommen",
          // Weder Name noch Nachricht (31.10.2026): die Adresse ist
          // unbestaetigt, und jedes frei eingegebene Zeichen hier waere Text
          // eines Fremden in einer von uns signierten Mail an ein fremdes
          // Postfach. Der Vorstand sieht beides in seiner Mail unten.
          text: `Hallo,\n\ndanke für deine Anfrage, sie ist bei uns angekommen, wir melden uns bei dir.\n\nJiu Jitsu Kaisen Akademie\nhttps://jjk.academy`,
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
