"use server";

import { redirect } from "next/navigation";
import { ensureSchema, sql } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { PLAN_INFO, isAdult, isPlan } from "@/lib/membership";
import { boardEmails, sendMail } from "@/lib/mail";
import { clientIp, hit, type Limit } from "@/lib/rate-limit";
import { MAX, lineError, nameError } from "@/lib/input";

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
 *
 * Missbrauch (30.10.2026): Honigtopf-Feld "website" und hoechstens fuenf
 * Antraege je IP und Stunde (lib/rate-limit.ts). Die E-Mail-Adresse wird
 * weiterhin NICHT bestaetigt — deshalb wird auch niemand mehr allein ueber
 * seine Adresse aufgenommen, siehe initialStatus unten.
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

const NAME_FIELDS = ["first_name", "last_name", "guardian_first_name", "guardian_last_name"] as const;

const BOX_FIELDS = ["reduced", "consent_photos", "consent_whatsapp", "accept_terms"] as const;

/**
 * Fuenf Antraege je IP und Stunde (30.10.2026). Jeder Antrag schickt eine
 * Mail an eine unbestaetigte Adresse und eine an den Vorstand; ohne Grenze
 * waere das Formular ein Mailrelay. Fuenf reicht fuer eine Familie, die am
 * selben WLAN mehrere Kinder anmeldet. Gezaehlt wird erst nach der
 * Formularpruefung — ein Tippfehler kostet nichts —, aber VOR der Abfrage
 * "gibt es die Adresse schon", damit sich nicht beliebig ausprobieren laesst,
 * wer Mitglied ist.
 */
// 20 statt 5 (Review 30.10.2026): eine Gruppe im WLAN der Akademie teilt
// sich eine IP, und sollte Scalingos Router doch eine gemeinsame Adresse
// liefern, saesse die ganze Seite in diesem Topf. Die Mailflut an fremde
// Adressen begrenzt schon die Pruefung "gibt es die Adresse schon".
const JOIN_IP: Limit = { bucket: "join-ip", max: 20, windowSeconds: 60 * 60 };

export async function joinAction(prev: JoinState, formData: FormData): Promise<JoinState> {
  // Honigtopf wie beim Probetraining (components/trial): ein Feld, das
  // Menschen nie sehen und einfache Bots ausfuellen. Der Bot bekommt
  // dieselbe Weiterleitung wie ein echter Antrag, es entsteht aber weder
  // Konto noch Mail — er soll nicht merken, woran er gescheitert ist.
  // Die Log-Zeile ist fuer den Fall, dass ein Passwortmanager das Feld
  // fuellt: sonst verschwaende ein echter Antrag ohne jede Spur.
  if (String(formData.get("website") ?? "") !== "") {
    console.warn("[beitreten] Honigtopf ausgefuellt, Antrag verworfen");
    redirect("/mitglieder");
  }

  const v: Record<string, string> = {};
  for (const key of TEXT_FIELDS) v[key] = String(formData.get(key) ?? "").trim();
  for (const key of BOX_FIELDS) v[key] = formData.get(key) !== null ? "on" : "";
  v.email = (v.email ?? "").toLowerCase();
  v.guardian_email = (v.guardian_email ?? "").toLowerCase();
  // NFC (31.10.2026): "Jürgen" kommt je nach Tastatur als ein Zeichen oder
  // als u + Trema. Gleich gespeichert, gleich lang gezaehlt.
  for (const key of NAME_FIELDS) v[key] = (v[key] ?? "").normalize("NFC");

  const password = String(formData.get("password") ?? "");
  const password2 = String(formData.get("password2") ?? "");
  const attempt = (prev.attempt ?? 0) + 1;
  const fail = (error: string): JoinState => ({ error, values: v, attempt });

  if (!v.first_name || !v.last_name) return fail("Bitte Vor- und Nachnamen angeben.");
  if (!v.address) return fail("Bitte deine Adresse angeben.");
  if (!v.phone) return fail("Bitte eine Telefonnummer angeben.");
  // Laengen und Zeichen (31.10.2026, Sicherheitsreview): bis dahin ging
  // jedes Feld in beliebiger Laenge in Datenbank und Vorstandsmail, und der
  // Vorname in die Bestaetigung an eine unbestaetigte Adresse. Grenzen und
  // Begruendung in lib/input.ts; join-form.tsx setzt dieselben maxLength.
  // VOR EMAIL_RE: dessen "[^\s@]+\.[^\s@]+$" probiert bei einer langen
  // Kette aus Punkten quadratisch viele Aufteilungen durch — gemessen
  // 2,5 s fuer 40 000 Zeichen, bei 1 MB (Next' Grenze fuer Server Actions)
  // waeren es Minuten, in denen der Prozess sonst nichts tut.
  const tooMuch =
    nameError(v.first_name ?? "", "Der Vorname") ??
    nameError(v.last_name ?? "", "Der Nachname") ??
    lineError(v.address ?? "", "Die Adresse", MAX.address) ??
    lineError(v.phone ?? "", "Die Telefonnummer", MAX.phone) ??
    lineError(v.email ?? "", "Die E-Mail-Adresse", MAX.email);
  if (tooMuch) return fail(tooMuch);
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
    const guardianTooMuch =
      nameError(v.guardian_first_name ?? "", "Der Vorname des Erziehungsberechtigten") ??
      nameError(v.guardian_last_name ?? "", "Der Nachname des Erziehungsberechtigten") ??
      lineError(v.guardian_phone ?? "", "Die Telefonnummer des Erziehungsberechtigten", MAX.phone) ??
      lineError(v.guardian_email ?? "", "Die E-Mail-Adresse des Erziehungsberechtigten", MAX.email);
    if (guardianTooMuch) return fail(guardianTooMuch);
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

  if (!(await hit(JOIN_IP, await clientIp()))) {
    return fail(
      "Von diesem Anschluss kamen in der letzten Stunde schon mehrere Anträge. Bitte später nochmal versuchen oder uns im Training ansprechen."
    );
  }

  const existing = await sql`select id from members where email = ${v.email}`;
  if (existing.length > 0) {
    return fail(
      "Mit dieser E-Mail-Adresse gibt es schon einen Antrag oder ein Konto. Einfach im Mitgliederbereich einloggen."
    );
  }

  const passwordHash = await hashPassword(password);
  // JEDER Antrag beginnt als 'pending', auch mit einer Adresse aus
  // BOARD_EMAILS (30.10.2026). Bis dahin wurde eine Vorstandsadresse sofort
  // aufgenommen — aber niemand prueft, dass die Adresse dem Antragsteller
  // gehoert. Wer eine Vorstandsadresse kannte, die noch kein Konto hatte,
  // konnte sich damit eintragen und war im selben Moment Vorstand: alle
  // Mitgliederdaten, Aufnahmen, Passwort-Links. BOARD_EMAILS sagt, WELCHE
  // Adresse Vorstand ist; dass man sie besitzt, bewies das Formular nie.
  //
  // Das allererste Vorstandsmitglied (es gibt noch niemanden, der aufnehmen
  // koennte): Antrag hier normal stellen, dann im Scalingo-Dashboard unter
  // Addons → PostgreSQL → "Run a console" (oder `scalingo --app <app>
  // pgsql-console`) von Hand aufnehmen:
  //   update members set status = 'active', decided_at = now()
  //   where email = 'vorname@jjk.academy' and status = 'pending';
  // Ab dann nimmt dieses Konto die weiteren Vorstandsmitglieder unter
  // /vorstand auf. Vorher pruefen, dass der Antrag wirklich von der Person
  // stammt (Name, Telefon) — genau das ist die Pruefung, die hier fehlt.
  const initialStatus = "pending";
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
      now(), ${initialStatus}, now()
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

  // Bestaetigung an den Antragsteller und Hinweis an den Vorstand.
  // Wartet nicht auf Fehler: sendMail wirft nie.
  const planLabel = PLAN_INFO[v.plan].label;
  await Promise.all([
    sendMail({
      to: v.email,
      subject: "Dein Beitrittsantrag ist angekommen",
      // "Hallo," ohne Namen (31.10.2026): die Adresse ist unbestaetigt, der
      // Name frei eingegeben. Auch nach der Pruefung oben bliebe er Text,
      // den ein Fremder in eine von uns signierte Mail an ein fremdes
      // Postfach schreibt ("Max, ruf sofort 0664… an"). Ohne ihn steht in
      // dieser Mail kein einziges frei eingegebenes Zeichen mehr — der
      // Tarif kommt aus PLAN_INFO. Persoenlich wird erst die Aufnahme-Mail,
      // nachdem der Vorstand den Antrag gesehen hat.
      text: [
        "Hallo,",
        "",
        "danke für deinen Antrag bei der Jiu Jitsu Kaisen Akademie. Er ist bei uns angekommen.",
        "",
        `Gewählt: ${planLabel}${v.reduced === "on" ? " (Schüler/Studenten)" : ""}`,
        "",
        "Über die Aufnahme entscheidet der Vorstand, meistens beim nächsten Training. Den Stand siehst du jederzeit im Mitgliederbereich: https://jjk.academy/mitglieder",
        minor ? "\nWeil du unter 18 bist, unterschreibt ein Erziehungsberechtigter beim ersten Training die Zustimmung." : "",
        "",
        // Zahlung erst NACH der Aufnahme (30.10.2026): die Aufnahme-Mail
        // (app/vorstand/actions.ts) bringt Einschreibgebuehr und Dauerauftrag
        // samt IBAN. Hier nur ankuendigen, damit niemand vorher ueberweist.
        PLAN_INFO[v.plan].monthly
          ? "Sobald dich der Vorstand aufgenommen hat, bekommst du eine Mail mit allem zur Zahlung (Einschreibgebühr und Dauerauftrag für den Monatsbeitrag)."
          : "Sobald dich der Vorstand aufgenommen hat, bekommst du eine Mail mit allem zur Zahlung.",
        "",
        "Bis bald auf der Matte!",
        "Jiu Jitsu Kaisen Akademie",
      ].join("\n"),
    }),
    sendMail({
      to: boardEmails(),
      subject: `Neuer Beitrittsantrag: ${name}`,
      text: `${name} hat einen Antrag gestellt (${planLabel}${minor ? ", unter 18" : ""}).\n\nAufnehmen unter https://jjk.academy/vorstand`,
      replyTo: v.email,
    }),
  ]);

  await createSession(inserted[0]?.id as number, true);
  redirect("/mitglieder");
}
