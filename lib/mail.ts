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
    if (!res.ok) console.error("[mail]", res.status, await res.text());
  } catch (err) {
    console.error("[mail]", err);
  }
}

/** Die Vorstandsadressen aus BOARD_EMAILS, fuer Benachrichtigungen. */
export function boardEmails(): string[] {
  return (process.env.BOARD_EMAILS ?? "")
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
