import { ensureSchema, sql } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";
import { isPlan, type MemberStatus, type Plan } from "@/lib/membership";

/**
 * Serverseitige Helfer rund um das eingeloggte Mitglied.
 *
 * Importiert lib/auth.ts und damit `next/headers` — darf also NIE aus einer
 * Client-Komponente geladen werden. Typen und reine Rechnungen stehen in
 * lib/membership.ts.
 */

export interface MemberRecord {
  id: number;
  name: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  status: MemberStatus;
  plan: Plan | null;
  reducedRequested: boolean;
  reducedVerified: boolean;
  isMinor: boolean;
  guardianConsentReceived: boolean;
  joinedAt: string;
}

type Row = {
  id: number;
  name: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  status: string;
  plan: string | null;
  reduced_requested: boolean;
  reduced_verified: boolean;
  is_minor: boolean;
  guardian_consent_received: boolean;
  joined_at: string;
};

function toStatus(value: string): MemberStatus {
  return value === "pending" || value === "rejected" ? value : "active";
}

export function toRecord(r: Row): MemberRecord {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    firstName: r.first_name,
    lastName: r.last_name,
    status: toStatus(r.status),
    plan: isPlan(r.plan) ? r.plan : null,
    reducedRequested: r.reduced_requested,
    reducedVerified: r.reduced_verified,
    isMinor: r.is_minor,
    guardianConsentReceived: r.guardian_consent_received,
    joinedAt: r.joined_at,
  };
}

/** Die Spaltenliste fuer toRecord(), einmal statt in jeder Abfrage. */
export const MEMBER_COLUMNS = `
  id, name, email, first_name, last_name, status, plan,
  reduced_requested, reduced_verified, guardian_consent_received,
  joined_at::text as joined_at,
  (birth_date is not null and birth_date > (current_date - interval '18 years')) as is_minor
`;

export async function getMember(id: number): Promise<MemberRecord | null> {
  await ensureSchema();
  const rows = await sql.query<Row>(
    `select ${MEMBER_COLUMNS} from members where id = ${Number(id)}`
  );
  const row = rows[0];
  return row ? toRecord(row) : null;
}

export async function getCurrentMember(): Promise<MemberRecord | null> {
  const id = await getSessionMemberId();
  if (!id) return null;
  return getMember(id);
}

/**
 * Wer Vorstand ist, steht in der Umgebungsvariable BOARD_EMAILS (Komma-Liste),
 * gesetzt im Scalingo-Dashboard — NICHT in der Datenbank. Trennzeichen egal. Eine Rolle in der
 * Datenbank liesse sich ueber jede Luecke im Code hochstufen; eine
 * Umgebungsvariable aendert nur, wer Zugang zum Hosting hat.
 */
export function isBoardEmail(email: string | null): boolean {
  if (!email) return false;
  const list = (process.env.BOARD_EMAILS ?? "")
    // Komma, Strichpunkt oder Leerzeichen — im Scalingo-Dashboard wurde die
    // Liste zuerst mit Leerzeichen eingetragen, und dann war niemand Vorstand.
    .split(/[\s,;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export function isBoard(member: MemberRecord | null): boolean {
  return member !== null && member.status === "active" && isBoardEmail(member.email);
}
