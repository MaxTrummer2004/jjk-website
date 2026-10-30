"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { siteConfig } from "@/lib/config";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { getCurrentMember, getMember, isBoard, type MemberRecord } from "@/lib/members";
import { ENROLLMENT_FEE_CENTS, PLAN_INFO, dueCents, monthKey } from "@/lib/membership";
import { admissionMail, sendMail } from "@/lib/mail";
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

/**
 * Aufnehmen nach § 5 Abs. 2. Minderjaehrige erst mit Elternunterschrift (§ 5 Abs. 1).
 *
 * Seit 30.10.2026 mit Willkommensmail: was zu zahlen ist und wie, inklusive
 * Dauerauftrag fuer den Monatsbeitrag (lib/mail.ts, admissionMail). Das
 * UPDATE prueft den Status noch einmal selbst und liefert die Zeile zurueck,
 * damit ein Doppelklick auf "Aufnehmen" nicht zwei Mails verschickt.
 *
 * Bei Minderjaehrigen geht die Mail an die eigene Adresse UND, wenn
 * angegeben, an die der Erziehungsberechtigten: das Konto laeuft auf das
 * Kind (Login per eigener Adresse), den Dauerauftrag richten aber in der
 * Regel die Eltern ein, die nach § 5 Abs. 1 ohnehin zugestimmt haben. Die
 * Elternadresse ist im Formular freiwillig, deshalb nur "wenn angegeben".
 */
export async function admitAction(formData: FormData): Promise<void> {
  const me = await requireBoard();
  const target = await getMember(idFrom(formData));
  if (!target || target.status !== "pending") return;
  if (target.isMinor && !target.guardianConsentReceived) return;
  const admitted = await sql<{ guardian_email: string | null }>`
    update members
    set status = 'active', decided_at = now(), decided_by = ${me.id}, joined_at = current_date
    where id = ${target.id} and status = 'pending'
    returning guardian_email
  `;
  const row = admitted[0];
  if (row && target.email) {
    // Ein Mailfehler darf die Aufnahme nicht zuruecknehmen: sie steht schon
    // in der Datenbank, und der Mitgliederbereich zeigt dasselbe.
    try {
      const guardian = target.isMinor && row.guardian_email ? row.guardian_email : null;
      const mail = admissionMail({
        firstName: target.firstName ?? target.name,
        fullName: target.name,
        plan: target.plan,
        reducedRequested: target.reducedRequested,
        reducedVerified: target.reducedVerified,
        feeExempt: target.feeExempt,
        payOnline: isMollieConfigured(),
        guardianCopy: guardian !== null,
      });
      await sendMail({
        // Gleiche Adresse zweimal (Kind meldet sich mit der Elternadresse an)
        // lehnt Brevo ab, und dann bekaeme niemand die Bankdaten (Review
        // 30.10.2026).
        to: guardian && guardian !== target.email ? [target.email, guardian] : target.email,
        ...mail,
        replyTo: siteConfig.email,
      });
    } catch (err) {
      console.error("[admit] Willkommensmail", target.id, err);
    }
  }
  done();
}

/** Doppelzahlung erledigt (rueckerstattet oder geklaert). Die Zeile bleibt
 *  mit Datum stehen — sie gehoert zu den Zahlungsaufzeichnungen. */
export async function resolvePaymentIssueAction(formData: FormData): Promise<void> {
  const me = await requireBoard();
  const id = Number(formData.get("issue_id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await sql`
    update payment_issues set resolved_at = now(), resolved_by = ${me.id}
    where id = ${id} and resolved_at is null
  `;
  revalidatePath("/vorstand");
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

/** Probetraining-Anfrage erledigt: loeschen. Laut Datenschutzerklaerung
 *  bleiben Anfragen nur, bis sie beantwortet sind. */
export async function deleteTrialRequestAction(formData: FormData): Promise<void> {
  await requireBoard();
  const id = Number(formData.get("request_id"));
  if (!Number.isInteger(id) || id <= 0) return;
  await sql`delete from trial_requests where id = ${id}`;
  revalidatePath("/vorstand");
}


export interface StaffState {
  link?: string;
  name?: string;
  error?: string;
}

function setupLink(token: string): string {
  const base = (process.env.SITE_URL ?? siteConfig.url).replace(/\/$/, "");
  return `${base}/konto-einrichten?token=${token}`;
}

/**
 * Konto fuer Trainer oder Vorstand anlegen: beitragsfrei, sofort aufgenommen,
 * ohne Passwort. Zurueck kommt ein Einrichtungslink, den der Vorstand
 * weiterschickt; damit legt die Person ihr Passwort selbst fest.
 * Den Vorstandsbereich sieht trotzdem nur, wer in BOARD_EMAILS steht.
 */
export async function createStaffAction(_prev: StaffState, formData: FormData): Promise<StaffState> {
  const me = await requireBoard();
  const first = String(formData.get("first_name") ?? "").trim();
  const last = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!first || !last) return { error: "Vor- und Nachname fehlen." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Die E-Mail-Adresse sieht nicht gültig aus." };

  const existing = await sql<{ id: number }>`select id from members where email = ${email}`;
  if (existing[0]) return { error: "Mit dieser E-Mail gibt es schon ein Konto." };

  const token = randomBytes(24).toString("hex");
  const name = `${first} ${last}`;
  await sql`
    insert into members (name, first_name, last_name, email, password_hash, status, fee_exempt,
      applied_at, decided_at, decided_by, setup_token)
    values (${name}, ${first}, ${last}, ${email}, '!', 'active', true,
      now(), now(), ${me.id}, ${token})
  `;
  done();
  return { link: setupLink(token), name };
}

/** Neuen Einrichtungslink fuer ein bestehendes Konto (z. B. Passwort vergessen). */
export async function newSetupLinkAction(_prev: StaffState, formData: FormData): Promise<StaffState> {
  await requireBoard();
  const id = idFrom(formData);
  const token = randomBytes(24).toString("hex");
  const rows = await sql<{ name: string }>`
    update members set setup_token = ${token} where id = ${id} returning name
  `;
  if (!rows[0]) return { error: "Konto nicht gefunden." };
  return { link: setupLink(token), name: rows[0].name };
}
