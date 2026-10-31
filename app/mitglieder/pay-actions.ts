"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getCurrentMember } from "@/lib/members";
import { getPaymentStatus } from "@/lib/payments";
import {
  MollieError,
  isMollieConfigured,
  mollie,
  siteUrl,
  toValue,
  webhookUrl,
  type MolliePayment,
} from "@/lib/mollie";

/**
 * "Jetzt bezahlen": erzeugt eine Mollie-Zahlung ueber alles, was gerade offen
 * ist, und schickt das Mitglied zum Checkout. Was bezahlt wurde, traegt erst
 * der Webhook ein (app/api/mollie/webhook) — nie diese Aktion, denn ein
 * Mitglied, das vom Checkout zurueckkommt, hat noch nicht bezahlt.
 *
 * Doppelte Zahlungen (30.10.2026): Vorher legte jeder Klick eine neue Zahlung
 * an. Doppelklick, zweiter Tab oder "zurueck und nochmal" ergaben zwei offene
 * Zahlungen ueber dieselben Posten; wer beide bezahlte, zahlte doppelt, und
 * der Webhook verwarf die zweite still. Jetzt merkt sich mollie_checkouts
 * (lib/db.ts) die letzte Zahlung je Mitglied samt Postenliste:
 *   - offen und dieselben Posten → zurueck in DEREN Checkout,
 *   - schon bezahlt oder in Bearbeitung (EPS braucht manchmal Minuten) →
 *     keine neue, zurueck in den Mitgliederbereich,
 *   - abgelaufen, abgebrochen, fehlgeschlagen oder andere Posten → neue.
 * Zwei gleichzeitige Klicks entscheidet ein bedingtes UPDATE bzw. INSERT auf
 * die Zeile, die beide gelesen haben: nur einer legt an, der andere wartet
 * auf dessen Checkout-Link. Was trotzdem doppelt durchgeht (zwei Zahlungen
 * mit verschiedenen Posten, Haekchen von Hand plus Online-Zahlung), faengt
 * der Webhook als payment_issues ab.
 */

/** Ein haengengebliebenes 'creating:' (Absturz zwischen Sperre und Anlegen)
 *  blockiert hoechstens so lange. */
const CLAIM_STALE_SECONDS = 60;

/**
 * Mollie lehnt ab oder ist nicht erreichbar (31.10.2026, End-to-End-Test):
 * vorher flog der Fehler weiter, und das Mitglied sah Nexts englische
 * Fehlerseite. Jetzt zurueck in den Mitgliederbereich, der rote Block sagt
 * auf Deutsch, was los ist, und zeigt die Bankdaten (status-panel.tsx).
 */
const FAILED = "/mitglieder?zahlung=fehler";

/** Ins Log nur Mitglieds-ID, HTTP-Status und Meldung — kein Name, keine
 *  Adresse: Logs liegen ein Jahr bei Scalingo. Mollies Meldung nennt Pfad
 *  und Grund (z. B. "422 ... amount"), nicht die Daten der Anfrage. */
function logPayError(step: string, memberId: number, err: unknown): void {
  const status = err instanceof MollieError ? (err.status ?? "-") : "-";
  const message = err instanceof Error ? err.message : "unbekannt";
  console.error(`[zahlung] ${step}`, `Mitglied #${memberId}`, status, message);
}

/** Mollie-Status, bei denen das Geld unterwegs oder schon da ist. */
const IN_FLIGHT = new Set(["pending", "authorized", "paid"]);

type CheckoutRow = { payment_id: string; items_key: string; checkout_url: string | null; stale: boolean };

async function readCheckout(memberId: number): Promise<CheckoutRow | null> {
  const rows = await sql<CheckoutRow>`
    select payment_id, items_key, checkout_url,
      created_at < now() - make_interval(secs => ${CLAIM_STALE_SECONDS}) as stale
    from mollie_checkouts where member_id = ${memberId}
  `;
  return rows[0] ?? null;
}

/** Ein anderer Klick legt gerade an: auf dessen Checkout warten (max. ~10 s). */
async function followOtherClick(memberId: number): Promise<never> {
  for (let i = 0; i < 20; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const row = await readCheckout(memberId);
    if (!row || !row.payment_id.startsWith("creating:")) {
      if (row?.checkout_url) redirect(row.checkout_url);
      break;
    }
  }
  redirect("/mitglieder");
}

export async function startPaymentAction(): Promise<void> {
  if (!isMollieConfigured()) return;
  const member = await getCurrentMember();
  if (!member || member.status !== "active" || !member.plan || !member.email) return;

  const status = await getPaymentStatus(member);
  if (!status) return;
  // Monatsbeitraege laufen seit 15.10.2026 per Dauerauftrag, online wird
  // nur noch Einmaliges bezahlt (Einschreibgebuehr, 10er-Block).
  const open = status.items.filter((i) => !i.paid && i.key !== "month");
  if (open.length === 0) return;
  const total = open.reduce((s, i) => s + i.cents, 0);
  const itemsKey = open.map((i) => `${i.key}:${i.cents}`).join("+");

  // ── Laufende Zahlung wiederverwenden ──────────────────────────────
  const seen = await readCheckout(member.id);
  if (seen?.payment_id.startsWith("tr_") && seen.items_key === itemsKey) {
    const prev = await mollie<MolliePayment>("GET", `/payments/${seen.payment_id}`).catch((err: unknown) => {
      // 404: Zahlung gibt es nicht mehr (z. B. Schluessel gewechselt) → neu.
      if (err instanceof MollieError && err.status === 404) return null;
      // Sonst KEINE neue anlegen: die alte koennte gerade bezahlt werden.
      logPayError("Zahlung lesen", member.id, err);
      return "error" as const;
    });
    if (prev === "error") redirect(FAILED);
    const href = prev?._links?.checkout?.href;
    if (prev?.status === "open" && href) redirect(href);
    if (prev && IN_FLIGHT.has(prev.status)) redirect("/mitglieder?zahlung=1");
  }
  if (seen?.payment_id.startsWith("creating:") && !seen.stale) await followOtherClick(member.id);

  // ── Sperre: nur wer die gelesene Zeile noch vorfindet, legt an ─────
  const claim = `creating:${randomBytes(8).toString("hex")}`;
  const claimed = seen
    ? await sql`
        update mollie_checkouts
        set payment_id = ${claim}, items_key = ${itemsKey}, checkout_url = null, created_at = now()
        where member_id = ${member.id} and payment_id = ${seen.payment_id}
        returning member_id
      `
    : await sql`
        insert into mollie_checkouts (member_id, payment_id, items_key)
        values (${member.id}, ${claim}, ${itemsKey})
        on conflict (member_id) do nothing
        returning member_id
      `;
  if (claimed.length === 0) await followOtherClick(member.id);

  let href: string | null = null;
  try {
    let customerId = member.mollieCustomerId;
    if (!customerId) {
      const customer = await mollie<{ id: string }>("POST", "/customers", {
        name: member.name,
        email: member.email,
        metadata: { memberId: member.id },
      });
      customerId = customer.id;
      await sql`update members set mollie_customer_id = ${customerId} where id = ${member.id}`;
    }

    // Nur noch einfache Einmalzahlungen; kein SEPA-Mandat, kein Abo.
    const payment = await mollie<MolliePayment>("POST", "/payments", {
      amount: { currency: "EUR", value: toValue(total) },
      description: `JJK ${open.map((i) => i.label).join(" + ")} – ${member.name}`.slice(0, 255),
      redirectUrl: `${siteUrl()}/mitglieder?zahlung=1`,
      webhookUrl: webhookUrl(),
      customerId,
      sequenceType: "oneoff",
      locale: "de_AT",
      metadata: {
        memberId: member.id,
        items: open.map((i) => ({ kind: i.key, cents: i.cents, period: status.month })),
        startSubscription: false,
      },
    });
    const link = payment._links?.checkout?.href;
    if (!link) throw new Error("Mollie hat keinen Checkout-Link geliefert.");
    await sql`
      update mollie_checkouts set payment_id = ${payment.id}, checkout_url = ${link}
      where member_id = ${member.id} and payment_id = ${claim}
    `;
    href = link;
  } catch (err) {
    logPayError("Zahlung anlegen", member.id, err);
    // Sperre freigeben, sonst wartet der naechste Klick eine Minute.
    await sql`delete from mollie_checkouts where member_id = ${member.id} and payment_id = ${claim}`.catch(
      (e: unknown) => logPayError("Sperre freigeben", member.id, e)
    );
  }
  // redirect() wirft (NEXT_REDIRECT) und steht deshalb hinter dem try: im
  // catch oben landete sonst der Redirect selbst als "Fehler".
  redirect(href ?? FAILED);
}

/**
 * Flex beenden: das Abo wird bei Mollie gekuendigt, es wird nichts
 * mehr abgebucht. Laut Bedingungen "ohne Bindung" — der bereits bezahlte
 * Monat bleibt. Nur fuer Flex; Bindungen enden von selbst.
 */
export async function cancelFlexAction(): Promise<void> {
  const member = await getCurrentMember();
  if (
    !member ||
    member.plan !== "flex" ||
    !member.mollieSubscriptionId?.startsWith("sub_") ||
    !member.mollieCustomerId
  ) {
    return;
  }
  await mollie(
    "DELETE",
    `/customers/${member.mollieCustomerId}/subscriptions/${member.mollieSubscriptionId}`
  );
  await sql`update members set mollie_subscription_id = null where id = ${member.id}`;
  revalidatePath("/mitglieder");
}
