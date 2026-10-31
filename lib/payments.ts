import { sql } from "@/lib/db";
import type { MemberRecord } from "@/lib/members";
import { MollieError, mollie, type MolliePayment } from "@/lib/mollie";
import {
  ENROLLMENT_FEE_CENTS,
  PLAN_INFO,
  dueCents,
  monthKey,
  monthLabel,
} from "@/lib/membership";

/**
 * Der Zahlungsstand eines Mitglieds, fuer den roten bzw. gruenen Block.
 *
 * Gruen heisst: Einschreibgebuehr bezahlt UND fuer diesen Monat bezahlt
 * ("Alle Kurse") bzw. der Block bezahlt (10er-Block). Alles andere ist rot, und der
 * Block sagt, welcher Posten offen ist und wie viel.
 *
 * 10er-Block: Hier steht nur "bezahlt / nicht bezahlt". Die verbrauchten
 * Einheiten zu zaehlen kommt mit der Trainingsanmeldung — vorher gibt es
 * keine verlaessliche Quelle dafuer, wer wann da war. Eine Blockzahlung
 * traegt als period den Monat des Kaufs, damit ein zweiter Block spaeter
 * eine eigene Zeile bekommt.
 */

export interface DueItem {
  key: "enrollment" | "month" | "block";
  label: string;
  cents: number;
  paid: boolean;
}

export interface PaymentStatus {
  month: string;
  monthLabel: string;
  items: DueItem[];
  allPaid: boolean;
}

export async function getPaymentStatus(member: MemberRecord, now = new Date()): Promise<PaymentStatus | null> {
  if (member.feeExempt || !member.plan) return null;
  const month = monthKey(now);
  const plan = PLAN_INFO[member.plan];

  const rows = await sql<{ kind: string; period: string | null }>`
    select kind, period::text as period from payments where member_id = ${member.id}
  `;
  const has = (kind: string, period?: string): boolean =>
    rows.some((r) => r.kind === kind && (period === undefined || r.period === period));

  const items: DueItem[] = [
    {
      key: "enrollment",
      label: "Einschreibgebühr",
      cents: ENROLLMENT_FEE_CENTS,
      paid: has("enrollment"),
    },
    plan.monthly
      ? {
          key: "month",
          label: `Beitrag ${monthLabel(month)}`,
          cents: dueCents(member.plan, member.reducedVerified),
          paid: has("month", month),
        }
      : {
          key: "block",
          label: "10er-Block",
          cents: dueCents(member.plan, member.reducedVerified),
          paid: has("block"),
        },
  ];

  return { month, monthLabel: monthLabel(month), items, allPaid: items.every((i) => i.paid) };
}

/**
 * Was der Statusblock nach der Rueckkehr vom Checkout sagt (31.10.2026).
 *   confirming — Zahlung laeuft noch oder ist bezahlt, aber der Webhook hat
 *                sie noch nicht eingetragen: "Seite neu laden"
 *   canceled   — abgebrochen, abgelaufen oder fehlgeschlagen
 *   failed     — Mollie hat das Anlegen abgelehnt (?zahlung=fehler,
 *                app/mitglieder/pay-actions.ts)
 */
export type PayNotice = "confirming" | "canceled" | "failed";

const STILL_RUNNING = new Set(["open", "pending", "authorized", "paid"]);
const GAVE_UP = new Set(["canceled", "expired", "failed"]);

/**
 * Hinweis fuer /mitglieder?zahlung=1. Vorher stand "Zahlung wird bestaetigt"
 * allein wegen des Parameters da — auch nach einem Abbruch im Checkout und
 * fuer immer, wenn der Monat (Dauerauftrag, nicht online) noch offen war und
 * der rote Block deshalb blieb. Jetzt entscheidet die letzte Zahlung aus
 * mollie_checkouts, und auch das nur, solange online noch etwas offen ist:
 * ist Einmaliges bezahlt und eingetragen, gibt es nichts zu bestaetigen,
 * egal was der Monat macht.
 *
 * Ein Mollie-Aufruf, und nur mit ?zahlung=1 in der Adresse (also direkt nach
 * dem Checkout). Antwortet Mollie nicht, bleibt es beim alten Hinweis: wer
 * gerade bezahlt hat, soll nicht "abgebrochen" lesen, weil Mollie hakt.
 */
export async function checkoutNotice(memberId: number, status: PaymentStatus): Promise<PayNotice | null> {
  if (!status.items.some((i) => !i.paid && i.key !== "month")) return null;
  const rows = await sql<{ payment_id: string }>`
    select payment_id from mollie_checkouts where member_id = ${memberId}
  `;
  const id = rows[0]?.payment_id;
  if (!id?.startsWith("tr_")) return null;
  try {
    const payment = await mollie<MolliePayment>("GET", `/payments/${id}`);
    if (STILL_RUNNING.has(payment.status)) return "confirming";
    if (GAVE_UP.has(payment.status)) return "canceled";
    return null;
  } catch (err) {
    if (err instanceof MollieError && err.status === 404) return null;
    console.error("[zahlung] Status beim Zurueckkommen", `Mitglied #${memberId}`, err instanceof Error ? err.message : "unbekannt");
    return "confirming";
  }
}
