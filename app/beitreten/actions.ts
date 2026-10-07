"use server";

import { redirect } from "next/navigation";
import { ensureSchema, sql } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { isAdult, isPlan } from "@/lib/membership";

/**
 * Die Beitrittserklaerung, online.
 *
 * Das Ergebnis ist nach § 5 Abs. 2 der Statuten ein ANTRAG: ueber die Aufnahme
 * entscheidet der Vorstand. Das Konto entsteht deshalb mit status 'pending'.
 * Man ist sofort eingeloggt, sieht aber nur den eigenen Status — die Rangliste
 * und alles andere erst nach der Aufnahme (siehe app/mitglieder/page.tsx).
 *
 * Minderjaehrige: § 5 Abs. 1 verlangt die SCHRIFTLICHE Zustimmung der
 * Erziehungsberechtigten. Ein Haekchen im Browser ist keine Schriftform. Die
 * Elterndaten werden hier erfasst, die Unterschrift aber im Training geleistet;
 * der Vorstand hakt sie ab, erst dann ist die Aufnahme moeglich.
 */

export interface JoinState {
  error?: string;
  /** Die Eingaben zurueck, damit ein Fehler das Formular nicht leert. */
  values?: Record<string, string>;
  /** Zaehlt hoch, damit das Formular mit den alten Werten neu aufgebaut wird. */
  attempt?: number;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const TEXT_FIELDS = [
  "first_name",
  "last_name",
  "address",
  "birth_date",
  "phone",
  "email",
  "plan",
  "guardian_first_name",
  "guardian_last_name",
  "guardian_phone",
  "guardian_email",
] as const;

const BOX_FIELDS = ["reduced", "consent_photos", "consent_whatsapp", "accept_terms"] as const;

export async function joinAction(prev: JoinState, formData: FormData): Promise<JoinState> {
  const v: Record<string, string> = {};
  for (const key of TEXT_FIELDS) v[key] = String(formData.get(key) ?? "").trim();
  for (const key of BOX_FIELDS) v[key] = formData.get(key) !== null ? "on" : "";
  v.email = (v.email ?? "").toLowerCase();
  v.guardian_email = (v.guardian_email ?? "").toLowerCase();

  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  const attempt = (prev.attempt ?? 0) + 1;
  const fail = (error: string): JoinState => ({ error, values: v, attempt });

  if (!v.first_name || !v.last_name) return fail("Bitte Vor- und Nachnamen angeben.");
  if (!v.address) return fail("Bitte deine Adresse angeben.");
  if (!v.phone) return fail("Bitte eine Telefonnummer angeben.");
  if (!EMAIL_RE.test(v.email ?? "")) return fail("Die E-Mail-Adresse sieht nicht gültig aus.");

  const birth = v.birth_date ?? "";
  if (!DATE_RE.test(birth) || Number.isNaN(Date.parse(birth))) {
    return fail("Bitte ein gültiges Geburtsdatum angeben.");
  }
  if (new Date(birth) > new Date()) return fail("Das Geburtsdatum liegt in der Zukunft.");

  const minor = !isAdult(birth);
  if (minor) {
    if (!v.guardian_first_name || !v.guardian_last_name || !v.guardian_phone) {
      return fail(
        "Du bist unter 18: Bitte Namen und Telefonnummer eines Erziehungsberechtigten angeben."
      );
    }
    if (v.guardian_email && !EMAIL_RE.test(v.guardian_email)) {
      return fail("Die E-Mail-Adresse des Erziehungsberechtigten sieht nicht gültig aus.");
    }
  }

  if (!isPlan(v.plan)) return fail("Bitte eine Mitgliedschaft auswählen.");
  if (password.length < 8) return fail("Das Passwort braucht mindestens 8 Zeichen.");
  if (password !== password2) return fail("Die beiden Passwörter stimmen nicht überein.");
  if (!v.accept_terms) {
    return fail("Bitte bestätige die Bedingungen der Mitgliedschaft und den Datenschutz.");
  }

  await ensureSchema();

  const existing = await sql`select id from members where email = ${v.email}`;
  if (existing.length > 0) {
    return fail(
      "Mit dieser E-Mail-Adresse gibt es schon einen Antrag oder ein Konto. Einfach im Mitgliederbereich einloggen."
    );
  }

  const passwordHash = await hashPassword(password);
  const name = `${v.first_name} ${v.last_name}`;
  const g = (key: string): string | null => (minor && v[key] ? (v[key] as string) : null);

  let inserted: Record<string, unknown>[];
  try {
    inserted = await sql`
    insert into members (
      name, password_hash, email, first_name, last_name, address, birth_date, phone,
      guardian_first_name, guardian_last_name, guardian_phone, guardian_email,
      plan, reduced_requested, consent_photos, consent_whatsapp,
      terms_accepted_at, status, applied_at
    ) values (
      ${name}, ${passwordHash}, ${v.email}, ${v.first_name}, ${v.last_name}, ${v.address},
      ${birth}, ${v.phone},
      ${g("guardian_first_name")}, ${g("guardian_last_name")}, ${g("guardian_phone")},
      ${g("guardian_email")},
      ${v.plan}, ${v.reduced === "on"}, ${v.consent_photos === "on"},
      ${v.consent_whatsapp === "on"},
      now(), 'pending', now()
    )
    returning id
  `;
  } catch (err) {
    // Zwei Antraege mit derselben Adresse gleichzeitig: der Unique-Index
    // faengt den zweiten. 23505 = unique_violation.
    if ((err as { code?: string }).code === "23505") {
      return fail("Mit dieser E-Mail-Adresse gibt es schon einen Antrag oder ein Konto.");
    }
    throw err;
  }

  await createSession(inserted[0]?.id as number, true);
  redirect("/mitglieder");
}
