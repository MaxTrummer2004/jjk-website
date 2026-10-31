/**
 * E-Mails ueber Brevo (Sendinblue SAS, Paris) — die Domain jjk.academy ist bei
 * Brevo bereits eingerichtet (DKIM-Eintraege brevo1/brevo2 bei Namecheap).
 *
 * Aktiv erst, wenn BREVO_API_KEY bei Scalingo gesetzt ist. Ohne Schluessel
 * wird nichts verschickt und nichts geht kaputt: Antraege und Anfragen landen
 * so oder so in der Datenbank und unter /vorstand. Ein Mailfehler bricht nie
 * einen Antrag ab — er wird nur ins Log geschrieben.
 *
 * API: POST https://api.brevo.com/v3/smtp/email, Header "api-key".
 */

import { siteConfig } from "@/lib/config";
import { ENROLLMENT_FEE_CENTS, PLAN_INFO, dueCents, euro, monthLabel, type Plan } from "@/lib/membership";

const FROM_EMAIL = process.env.MAIL_FROM ?? "info@jjk.academy";
const FROM_NAME = "Jiu Jitsu Kaisen Akademie";

export function isMailConfigured(): boolean {
  return Boolean(process.env.BREVO_API_KEY);
}

export async function sendMail(opts: {
  to: string | string[];
  subject: string;
  text: string;
  replyTo?: string;
}): Promise<void> {
  const key = process.env.BREVO_API_KEY;
  if (!key) return;
  const to = (Array.isArray(opts.to) ? opts.to : [opts.to]).filter(Boolean).map((email) => ({ email }));
  if (to.length === 0) return;
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": key, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: FROM_NAME, email: FROM_EMAIL },
        to,
        subject: opts.subject,
        textContent: opts.text,
        ...(opts.replyTo ? { replyTo: { email: opts.replyTo } } : {}),
      }),
      cache: "no-store",
    });
    if (!res.ok) console.error("[mail]", res.status, redactForLog(await res.text()));
  } catch (err) {
    console.error("[mail]", err);
  }
}

/**
 * Brevos Fehlertext fuers Log (31.10.2026). Er nennt mitunter die
 * Empfaengeradresse ("email is not valid: max@…"), und Scalingo bewahrt Logs
 * ein Jahr auf — laenger, als wir manche dieser Adressen ueberhaupt
 * speichern (Probetraining: drei Monate). Adressen werden zu "<email>", der
 * Rest auf 300 Zeichen gekappt; Status und Fehlercode reichen zur Diagnose.
 */
export function redactForLog(text: string): string {
  const clean = text.replace(/[^\s"'<>(),;:\\]+@[^\s"'<>(),;:\\]+/g, "<email>");
  return clean.length > 300 ? `${clean.slice(0, 300)}…` : clean;
}

/** Die Vorstandsadressen aus BOARD_EMAILS, fuer Benachrichtigungen. */
export function boardEmails(): string[] {
  return (process.env.BOARD_EMAILS ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

// ── Mailtexte (30.10.2026) ────────────────────────────────────────────────
// Reine Funktionen, die nur Text bauen: so laesst sich jeder Text ohne Brevo
// pruefen, und die Aktionen bleiben kurz.

/** "enrollment" → "Einschreibgebühr", wie im Statusblock (lib/payments.ts). */
export function paymentKindLabel(kind: string, period: string | null): string {
  if (kind === "enrollment") return "Einschreibgebühr";
  if (kind === "block") return "10er-Block";
  return period ? `Beitrag ${monthLabel(period)}` : "Monatsbeitrag";
}

/**
 * Die Mail zur Aufnahme. Vorher nahm der Vorstand still auf, und das Mitglied
 * erfuhr erst beim naechsten Login, dass es zahlen soll — und nirgends, dass
 * der Monatsbeitrag per Dauerauftrag laeuft, den nur es selbst anlegen kann.
 *
 * Der Betrag kommt aus dueCents(), derselben Rechnung wie Statusblock und
 * Vorstandsliste: ermaessigt erst mit geprueftem Ausweis. Ist die Ermaessigung
 * beantragt, aber noch nicht geprueft, sagt die Mail das dazu, statt den
 * kleineren Betrag zu versprechen.
 */
export function admissionMail(m: {
  firstName: string;
  fullName: string;
  plan: Plan | null;
  reducedRequested: boolean;
  reducedVerified: boolean;
  feeExempt: boolean;
  /** Mollie eingerichtet: Einmaliges online, sonst ueberweisen. */
  payOnline: boolean;
  /** Die Mail geht auch an die Erziehungsberechtigten. */
  guardianCopy: boolean;
}): { subject: string; text: string } {
  const site = (process.env.SITE_URL ?? siteConfig.url).replace(/\/$/, "");
  const area = `${site}/mitglieder`;
  const { holder, iban, bic } = siteConfig.bank;
  const bank = (purpose: string): string[] =>
    iban
      ? [`Empfänger: ${holder}`, `IBAN: ${iban}`, ...(bic ? [`BIC: ${bic}`] : []), `Verwendungszweck: ${purpose}`]
      : ["Die Bankverbindung bekommst du im Training."];

  const lines: string[] = [
    `Hallo ${m.firstName},`,
    "",
    "der Vorstand hat dich aufgenommen. Willkommen bei der Jiu Jitsu Kaisen Akademie!",
  ];
  if (m.guardianCopy) {
    lines.push("", "Weil du unter 18 bist, geht diese Mail auch an deine Erziehungsberechtigten.");
  }

  if (m.plan && !m.feeExempt) {
    const info = PLAN_INFO[m.plan];
    const fee = dueCents(m.plan, m.reducedVerified);
    const oneOff = [
      `Einschreibgebühr (${euro(ENROLLMENT_FEE_CENTS)})`,
      ...(info.monthly ? [] : [`10er-Block (${euro(fee)})`]),
    ];
    const oneOffLabel = info.monthly ? "Einschreibgebühr" : "Einschreibgebühr + 10er-Block";
    lines.push(
      "",
      `Deine Mitgliedschaft: ${info.label}${m.reducedVerified ? " (Schüler/Studenten)" : ""}`,
      "",
      "Was jetzt noch zu tun ist:",
      "",
      // Nummeriert nur, wenn es zwei Schritte gibt (Dauerauftrag dazu).
      `${info.monthly ? "1. " : ""}${oneOff.join(" und ")} bezahlen`
    );
    if (m.payOnline) {
      lines.push("Das geht online im Mitgliederbereich per EPS-Überweisung:", area);
    } else {
      lines.push("Bitte überweise den Betrag auf das Vereinskonto:", "", ...bank(`${m.fullName}, ${oneOffLabel}`));
    }
    if (info.monthly) {
      lines.push(
        "",
        "2. Dauerauftrag für den Monatsbeitrag einrichten",
        `Bitte richte bei deiner Bank einen Dauerauftrag über ${euro(fee)} zum Monatsersten ein:`,
        "",
        ...bank(`${m.fullName}, Mitgliedsbeitrag`)
      );
      lines.push("", "Sobald ein Beitrag eingeht, hakt ihn der Vorstand ab.");
    }
    if (m.reducedRequested && !m.reducedVerified) {
      lines.push(
        "",
        info.monthly
          ? `Den ermäßigten Beitrag (${euro(info.reducedCents)}) gibt es, sobald du deinen Schüler- oder Studentenausweis im Training gezeigt hast. Danach kannst du den Dauerauftrag anpassen.`
          : `Den ermäßigten Preis (${euro(info.reducedCents)}) gibt es, sobald du deinen Schüler- oder Studentenausweis im Training gezeigt hast. Bis dahin steht im Mitgliederbereich der reguläre.`
      );
    }
    lines.push("", `Was gerade offen ist, siehst du jederzeit im Mitgliederbereich: ${area}`);
  } else {
    lines.push("", `Im Mitgliederbereich findest du ab jetzt alles Weitere: ${area}`);
  }

  lines.push(
    "",
    `Fragen? Antworte einfach auf diese Mail oder ruf uns an: ${siteConfig.phone}`,
    "",
    "Bis bald auf der Matte!",
    "Jiu Jitsu Kaisen Akademie"
  );
  return { subject: "Willkommen bei der Jiu Jitsu Kaisen Akademie", text: lines.join("\n") };
}

/** Mail an den Vorstand: Geld fuer einen Posten, der schon bezahlt war. */
export function duplicatePaymentMail(d: {
  memberName: string;
  paymentId: string;
  items: { kind: string; period: string | null; cents: number }[];
}): { subject: string; text: string } {
  const site = (process.env.SITE_URL ?? siteConfig.url).replace(/\/$/, "");
  const total = d.items.reduce((s, i) => s + i.cents, 0);
  return {
    subject: `Doppelzahlung von ${d.memberName}, bitte rückerstatten`,
    text: [
      `Über Mollie ist eine Zahlung von ${d.memberName} eingegangen, deren Posten schon als bezahlt eingetragen war:`,
      "",
      ...d.items.map((i) => `- ${paymentKindLabel(i.kind, i.period)}: ${euro(i.cents)}`),
      "",
      `Mollie-Zahlung: ${d.paymentId} (doppelt: ${euro(total)})`,
      "",
      "Das Geld ist also zweimal da. Bitte im Mollie-Dashboard die Zahlung öffnen und den doppelten Betrag rückerstatten, oder mit dem Mitglied klären, wofür er gelten soll.",
      `Danach den Hinweis unter ${site}/vorstand als erledigt markieren.`,
    ].join("\n"),
  };
}
