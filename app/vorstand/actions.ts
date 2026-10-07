"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getCurrentMember, getMember, isBoard, type MemberRecord } from "@/lib/members";
import { ENROLLMENT_FEE_CENTS, PLAN_INFO, dueCents, monthKey } from "@/lib/membership";
import { isMollieConfigured, mollie, toValue } from "@/lib/mollie";

/**
 * Vorstandsaktionen. JEDE prueft selbst, ob der Aufrufer Vorstand ist — eine
 * Server Action ist ein oeffentlicher Endpunkt, egal ob die Seite, die sie
 * anbietet, geschuetzt ist.
 */

async function requireBoard(): Promise<MemberRecord> {
  const me = await getCurrentMember();
  if (!isBoard(me) || !me) throw new Error("Nur fuer den Vorstand.");
  return me;
}

function idFrom(formData: FormData): number {
  const id = Number(formData.get("member_id"));
  if (!Number.isInteger(id) || id <= 0) throw new Error("Ungueltige Mitglieds-ID.");
  return id;
}

function done(): void {
  revalidatePath("/vorstand");
  revalidatePath("/mitglieder");
}

/** Aufnehmen nach § 5 Abs. 2. Minderjaehrige erst mit Elternunterschrift (§ 5 Abs. 1). */
export async function admitAction(formData: FormData): Promise<void> {
  const me = await requireBoard();
  const target = await getMember(idFrom(formData));
  if (!target || target.status !== "pending") return;
  if (target.isMinor && !target.guardianConsentReceived) return;
  await sql`
    update members
    set status = 'active', decided_at = now(), decided_by = ${me.id}, joined_at = current_date
    where id = ${target.id}
  `;
  done();
}

export async function rejectAction(formData: FormData): Promise<void> {
  const me = await requireBoard();
  const id = idFrom(formData);
  await sql`
    update members
    set status = 'rejected', decided_at = now(), decided_by = ${me.id}
    where id = ${id} and status = 'pending'
  `;
  done();
}

/**
 * Abgelehnte Antraege loeschen — die Datenschutzerklaerung sagt zu, dass der
 * Vorstand das tut. Nur fuer status = 'rejected': ein aufgenommenes Mitglied
 * hat Zahlungsaufzeichnungen, die laenger aufbewahrt werden muessen.
 */
export async function deleteRejectedAction(formData: FormData): Promise<void> {
  await requireBoard();
  const id = idFrom(formData);
  await sql`delete from members where id = ${id} and status = 'rejected'`;
  done();
}

/** Schaltet ein Haekchen um: Elternunterschrift oder Ausweis. */
export async function toggleFlagAction(formData: FormData): Promise<void> {
  await requireBoard();
  const id = idFrom(formData);
  const flag = String(formData.get("flag"));
  if (flag === "guardian") {
    await sql`update members set guardian_consent_received = not guardian_consent_received where id = ${id}`;
  } else if (flag === "reduced") {
    await sql`update members set reduced_verified = not reduced_verified where id = ${id}`;
    // Laeuft ein SEPA-Abo, bucht es sonst weiter den alten Betrag ab.
    const m = await getMember(id);
    if (m?.plan && m.mollieCustomerId && m.mollieSubscriptionId?.startsWith("sub_") && isMollieConfigured()) {
      await mollie("PATCH", `/customers/${m.mollieCustomerId}/subscriptions/${m.mollieSubscriptionId}`, {
        amount: { currency: "EUR", value: toValue(dueCents(m.plan, m.reducedVerified)) },
      });
    }
  } else {
    return;
  }
  done();
}

/**
 * Bezahlt / nicht bezahlt umschalten. `kind` ist enrollment, month oder block.
 * Der Betrag wird beim Abhaken festgehalten — aendert sich spaeter ein Preis,
 * bleibt sichtbar, was damals verlangt war.
 */
export async function togglePaymentAction(formData: FormData): Promise<void> {
  const me = await requireBoard();
  const target = await getMember(idFrom(formData));
  if (!target || !target.plan) return;
  const kind = String(formData.get("kind"));
  const month = monthKey(new Date());

  let period: string | null;
  let cents: number;
  if (kind === "enrollment") {
    period = null;
    cents = ENROLLMENT_FEE_CENTS;
  } else if (kind === "month" && PLAN_INFO[target.plan].monthly) {
    period = month;
    cents = dueCents(target.plan, target.reducedVerified);
  } else if (kind === "block" && !PLAN_INFO[target.plan].monthly) {
    period = month;
    cents = dueCents(target.plan, target.reducedVerified);
  } else {
    return;
  }

  // Block: "bezahlt" heisst, irgendeine Blockzahlung existiert (siehe
  // lib/payments.ts). Umschalten loescht deshalb beim Block JEDE.
  const existing =
    kind === "block"
      ? await sql`select id from payments where member_id = ${target.id} and kind = 'block'`
      : period === null
        ? await sql`select id from payments where member_id = ${target.id} and kind = ${kind} and period is null`
        : await sql`select id from payments where member_id = ${target.id} and kind = ${kind} and period = ${period}`;

  if (existing.length > 0) {
    const ids = existing.map((r) => r.id as number);
    await sql`delete from payments where id = any(${ids}::int[]) and source = 'manual'`;
  } else {
    await sql`
      insert into payments (member_id, kind, period, amount_cents, source, recorded_by)
      values (${target.id}, ${kind}, ${period}, ${cents}, 'manual', ${me.id})
    `;
  }
  done();
}

export interface ResetState {
  message?: string;
  error?: string;
}

/**
 * Passwort zuruecksetzen. Der Vorstand legt ein neues fest und sagt es dem
 * Mitglied persoenlich. Kein Versand per Mail — dafuer gibt es (noch) keinen
 * Versanddienst.
 */
export async function resetPasswordAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  await requireBoard();
  const id = idFrom(formData);
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Mindestens 8 Zeichen." };
  const hash = await hashPassword(password);
  await sql`update members set password_hash = ${hash} where id = ${id}`;
  return { message: "Neues Passwort gesetzt." };
}
