"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getCurrentMember } from "@/lib/members";
import { getPaymentStatus } from "@/lib/payments";
import { PLAN_INFO } from "@/lib/membership";
import {
  FIRST_PAYMENT_METHODS,
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
 */
export async function startPaymentAction(): Promise<void> {
  if (!isMollieConfigured()) return;
  const member = await getCurrentMember();
  if (!member || member.status !== "active" || !member.plan || !member.email) return;

  const status = await getPaymentStatus(member);
  if (!status) return;
  // Mit laufendem Abo wird der Monat abgebucht, nicht hier bezahlt — sonst
  // zahlte man doppelt. Hier bleibt dann nur, was das Abo nicht abdeckt.
  const open = status.items.filter(
    (i) => !i.paid && !(i.key === "month" && member.mollieSubscriptionId)
  );
  if (open.length === 0) return;
  const total = open.reduce((s, i) => s + i.cents, 0);

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

  // Monatsbeitrag ohne Abo: "first" — EPS legt dabei das SEPA-Mandat an, aus
  // dem der Webhook das Abo macht. Alles andere (Block, Einschreibgebuehr
  // allein, Nachzahlung bei laufendem Abo): eine einfache Zahlung.
  const first = PLAN_INFO[member.plan].monthly && !member.mollieSubscriptionId;

  const payment = await mollie<MolliePayment>("POST", "/payments", {
    amount: { currency: "EUR", value: toValue(total) },
    description: `JJK ${open.map((i) => i.label).join(" + ")} – ${member.name}`.slice(0, 255),
    redirectUrl: `${siteUrl()}/mitglieder?zahlung=1`,
    webhookUrl: webhookUrl(),
    customerId,
    sequenceType: first ? "first" : "oneoff",
    ...(first ? { method: FIRST_PAYMENT_METHODS } : {}),
    locale: "de_AT",
    metadata: {
      memberId: member.id,
      items: open.map((i) => ({ kind: i.key, cents: i.cents, period: status.month })),
      startSubscription: first,
    },
  });

  const href = payment._links?.checkout?.href;
  if (!href) throw new Error("Mollie hat keinen Checkout-Link geliefert.");
  redirect(href);
}

/**
 * ALL IN Flex beenden: das Abo wird bei Mollie gekuendigt, es wird nichts
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
