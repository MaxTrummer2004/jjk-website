import { sql } from "@/lib/db";
import type { MemberRecord } from "@/lib/members";
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
 * (ALL IN) bzw. der Block bezahlt (10er-Block). Alles andere ist rot, und der
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
  if (!member.plan) return null;
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
