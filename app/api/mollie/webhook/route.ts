import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { getMember } from "@/lib/members";
import { PLAN_INFO, dueCents, monthKey } from "@/lib/membership";
import { boardEmails, duplicatePaymentMail, sendMail } from "@/lib/mail";
import {
  MollieError,
  mollie,
  testPaymentsAllowed,
  toCents,
  toValue,
  webhookUrl,
  type MolliePayment,
} from "@/lib/mollie";

/**
 * Mollie-Webhook. Mollie schickt NUR die Zahlungs-ID (form-encoded "id=tr_…");
 * den Status holen wir selbst ueber die API. Dadurch ist der Aufruf
 * faelschungssicher: wer hier eine ID hineinschickt, bekommt nur das
 * eingetragen, was Mollie zu dieser ID tatsaechlich als bezahlt meldet.
 *
 * Antwort immer 200, auch bei unbekannten IDs (Empfehlung der Mollie-Doku);
 * bei einem echten Fehler 500, dann wiederholt Mollie (bis zu zehnmal).
 * Bis 30.10.2026 stimmte das fuer unbekannte IDs nicht: mollie() wirft bei
 * 404, und jede ausgedachte tr_-ID landete als 500 im Log. Jetzt 200.
 *
 * Testzahlungen (mode "test") zaehlen im Live-Betrieb nicht, siehe
 * testPaymentsAllowed() in lib/mollie.ts.
 *
 * Doppelt bezahlt (30.10.2026): Ist ein Posten schon eingetragen, war die
 * Antwort frueher `on conflict do nothing` — Geld da, keine Spur. Jetzt wird
 * unterschieden: dieselbe Mollie-Zahlung noch einmal (Wiederholung) geht
 * still durch; ein ANDERER Eintrag fuer denselben Posten (Haekchen von Hand,
 * zweite Online-Zahlung) wird als payment_issues-Zeile festgehalten und dem
 * Vorstand gemailt. Zurueckerstattet wird bewusst nicht automatisch: ob das
 * Geld zurueck soll oder z. B. fuer den naechsten Block gilt, klaert der
 * Vorstand mit dem Mitglied.
 */

type Item = { kind: "enrollment" | "month" | "block"; cents: number; period: string };

const ok = (): NextResponse => new NextResponse(null, { status: 200 });

type Recorded = { kind: string; period: string | null; cents: number };

/**
 * Traegt einen Posten ein. Zurueck kommt der Posten, wenn er schon von
 * ANDERER Seite eingetragen war (Doppelzahlung), sonst null — auch dann,
 * wenn genau diese Zahlung schon drinsteht (Mollie wiederholt den Webhook).
 */
async function record(
  memberId: number,
  kind: string,
  period: string | null,
  cents: number,
  ref: string
): Promise<Recorded | null> {
  const inserted = await sql`
    insert into payments (member_id, kind, period, amount_cents, source, provider_ref)
    values (${memberId}, ${kind}, ${period}, ${cents}, 'online', ${ref})
    on conflict do nothing
    returning id
  `;
  if (inserted.length > 0) return null;
  const same = await sql`select 1 from payments where provider_ref = ${ref}`;
  return same.length > 0 ? null : { kind, period, cents };
}

/**
 * Doppelzahlungen festhalten und den Vorstand benachrichtigen. Die Mail geht
 * nur fuer Zeilen, die dieser Aufruf neu angelegt hat — Wiederholungen des
 * Webhooks schicken keine zweite.
 */
async function reportDuplicates(memberId: number, paymentId: string, dups: Recorded[]): Promise<void> {
  if (dups.length === 0) return;
  const member = await getMember(memberId);
  const name = member?.name ?? `Mitglied #${memberId}`;
  const fresh: Recorded[] = [];
  for (const d of dups) {
    const rows = await sql`
      insert into payment_issues (member_id, member_name, provider_ref, kind, period, amount_cents)
      values (${member ? memberId : null}, ${name}, ${`${paymentId}:${d.kind}`}, ${d.kind}, ${d.period}, ${d.cents})
      on conflict (provider_ref) do nothing
      returning id
    `;
    if (rows.length > 0) fresh.push(d);
  }
  if (fresh.length === 0) return;
  console.error("[mollie webhook] Doppelzahlung", paymentId, name, fresh);
  await sendMail({ to: boardEmails(), ...duplicatePaymentMail({ memberName: name, paymentId, items: fresh }) });
}

/** Erster Tag des Folgemonats, YYYY-MM-DD, in Wiener Zeit. */
function nextMonthStart(now: Date): string {
  const [y, m] = monthKey(now).split("-").map(Number) as [number, number];
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${String(nm).padStart(2, "0")}-01`;
}

export async function POST(request: Request): Promise<NextResponse> {
  const form = await request.formData().catch(() => null);
  const id = form?.get("id");
  if (typeof id !== "string" || !id.startsWith("tr_")) return ok();

  try {
    await ensureSchema();
    let payment: MolliePayment;
    try {
      payment = await mollie<MolliePayment>("GET", `/payments/${id}`);
    } catch (err) {
      // Unbekannte ID (oder eine des anderen Modus): nichts zu tun, und kein
      // 500, das Mollie zu Wiederholungen verleitet.
      if (err instanceof MollieError && err.status === 404) return ok();
      throw err;
    }
    if (payment.mode === "test" && !testPaymentsAllowed()) {
      console.error("[mollie webhook] Testzahlung im Live-Betrieb ignoriert:", payment.id, payment.status);
      return ok();
    }
    if (payment.status !== "paid") return ok();

    // ── Abbuchung aus dem Abo ────────────────────────────────────────
    if (payment.subscriptionId) {
      const rows = await sql<{ id: number }>`
        select id from members where mollie_subscription_id = ${payment.subscriptionId}
      `;
      const memberId = rows[0]?.id ?? Number(payment.metadata?.memberId);
      if (!memberId) return ok();
      const period = monthKey(new Date(payment.createdAt));
      // Ein Index pro (Mitglied, Art, Monat): kam derselbe Monat schon von
      // Hand (seit 15.10.2026 der Normalfall: Dauerauftrag), gewinnt der
      // Handeintrag. Still ist das aber nicht mehr — ein altes Abo, das
      // neben dem Dauerauftrag weiterbucht, ist genau eine Doppelzahlung.
      const dup = await record(memberId, "month", period, toCents(payment.amount.value), payment.id);
      await reportDuplicates(memberId, payment.id, dup ? [dup] : []);
      return ok();
    }

    // ── Zahlung aus dem Mitgliederbereich ────────────────────────────
    const memberId = Number(payment.metadata?.memberId);
    const items = (payment.metadata?.items ?? []) as Item[];
    if (!memberId || !Array.isArray(items)) return ok();

    const dups: Recorded[] = [];
    for (const item of items) {
      const period = item.kind === "enrollment" ? null : item.period;
      // provider_ref ist eindeutig; bei mehreren Posten einer Zahlung haengt
      // die Art dran.
      const dup = await record(memberId, item.kind, period, item.cents, `${payment.id}:${item.kind}`);
      if (dup) dups.push(dup);
    }
    await reportDuplicates(memberId, payment.id, dups);

    if (payment.metadata?.startSubscription === true) {
      const member = await getMember(memberId);
      // Mollie ruft den Webhook unter Umstaenden doppelt und fast
      // gleichzeitig. Wer das Abo anlegen darf, entscheidet ein atomares
      // UPDATE: nur der Aufruf, der die leere Spalte mit 'creating' belegt,
      // macht weiter. Geht das Anlegen schief, wird die Spalte freigegeben.
      const claim = await sql`
        update members set mollie_subscription_id = 'creating'
        where id = ${memberId} and mollie_subscription_id is null
        returning id
      `;
      if (claim.length > 0 && member?.plan && PLAN_INFO[member.plan].monthly && member.mollieCustomerId) {
        // Erster Monat ist mit dieser Zahlung bezahlt; das Abo beginnt am
        // naechsten Monatsersten. Bindung: Jahr 12 Monate → noch 11,
        // 3 Monate → noch 2. Flex: ohne Ende.
        const times = member.plan === "year" ? 11 : member.plan === "quarter" ? 2 : null;
        let sub: { id: string };
        try {
          sub = await mollie<{ id: string }>(
          "POST",
          `/customers/${member.mollieCustomerId}/subscriptions`,
          {
            amount: { currency: "EUR", value: toValue(dueCents(member.plan, member.reducedVerified)) },
            interval: "1 month",
            startDate: nextMonthStart(new Date()),
            ...(times ? { times } : {}),
            description: `JJK Mitgliedsbeitrag ${PLAN_INFO[member.plan].label}`,
            webhookUrl: webhookUrl(),
            metadata: { memberId },
          }
          );
        } catch (err) {
          await sql`update members set mollie_subscription_id = null where id = ${memberId} and mollie_subscription_id = 'creating'`;
          throw err;
        }
        await sql`update members set mollie_subscription_id = ${sub.id} where id = ${memberId}`;
      } else if (claim.length > 0) {
        await sql`update members set mollie_subscription_id = null where id = ${memberId} and mollie_subscription_id = 'creating'`;
      }
    }
    return ok();
  } catch (err) {
    console.error("[mollie webhook]", err);
    return new NextResponse(null, { status: 500 });
  }
}
