import { NextResponse } from "next/server";
import { ensureSchema, sql } from "@/lib/db";
import { getMember } from "@/lib/members";
import { PLAN_INFO, dueCents, monthKey } from "@/lib/membership";
import { mollie, toCents, toValue, webhookUrl, type MolliePayment } from "@/lib/mollie";

/**
 * Mollie-Webhook. Mollie schickt NUR die Zahlungs-ID (form-encoded "id=tr_…");
 * den Status holen wir selbst ueber die API. Dadurch ist der Aufruf
 * faelschungssicher: wer hier eine ID hineinschickt, bekommt nur das
 * eingetragen, was Mollie zu dieser ID tatsaechlich als bezahlt meldet.
 *
 * Antwort immer 200, auch bei unbekannten IDs (Empfehlung der Mollie-Doku);
 * bei einem echten Fehler 500, dann wiederholt Mollie (bis zu zehnmal).
 */

type Item = { kind: "enrollment" | "month" | "block"; cents: number; period: string };

const ok = (): NextResponse => new NextResponse(null, { status: 200 });

async function record(
  memberId: number,
  kind: string,
  period: string | null,
  cents: number,
  ref: string
): Promise<void> {
  await sql`
    insert into payments (member_id, kind, period, amount_cents, source, provider_ref)
    values (${memberId}, ${kind}, ${period}, ${cents}, 'online', ${ref})
    on conflict do nothing
  `;
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
    const payment = await mollie<MolliePayment>("GET", `/payments/${id}`);
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
      // Hand, gewinnt der Handeintrag, und das hier geht still durch.
      await sql`
        insert into payments (member_id, kind, period, amount_cents, source, provider_ref)
        values (${memberId}, 'month', ${period}, ${toCents(payment.amount.value)}, 'online', ${payment.id})
        on conflict do nothing
      `;
      return ok();
    }

    // ── Zahlung aus dem Mitgliederbereich ────────────────────────────
    const memberId = Number(payment.metadata?.memberId);
    const items = (payment.metadata?.items ?? []) as Item[];
    if (!memberId || !Array.isArray(items)) return ok();

    for (const item of items) {
      const period = item.kind === "enrollment" ? null : item.period;
      // provider_ref ist eindeutig; bei mehreren Posten einer Zahlung haengt
      // die Art dran.
      await record(memberId, item.kind, period, item.cents, `${payment.id}:${item.kind}`);
    }

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
