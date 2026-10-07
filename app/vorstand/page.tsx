import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ensureSchema, sql } from "@/lib/db";
import { getCurrentMember, isBoard } from "@/lib/members";
import {
  ENROLLMENT_FEE_CENTS,
  PLAN_INFO,
  dueCents,
  euro,
  isPlan,
  monthKey,
  monthLabel,
} from "@/lib/membership";
import {
  admitAction,
  deleteRejectedAction,
  rejectAction,
  toggleFlagAction,
  togglePaymentAction,
} from "./actions";
import { ResetPassword } from "./reset-password";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vorstand · JJK Academy",
  robots: { index: false, follow: false },
};

/**
 * /vorstand — Antraege und Beitraege. Nur fuer die E-Mail-Adressen in
 * BOARD_EMAILS (siehe lib/members.ts); alle anderen landen auf /mitglieder.
 *
 * Bewusst ohne Client-JavaScript bis auf das Passwortfeld: jedes Haekchen ist
 * ein kleines Formular mit einer Server Action. Das funktioniert auf jedem
 * Handy und braucht keinen Zustand im Browser, der vom Server abweichen kann.
 */

type Row = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  birth_date: string | null;
  guardian_first_name: string | null;
  guardian_last_name: string | null;
  guardian_phone: string | null;
  guardian_email: string | null;
  plan: string | null;
  status: string;
  reduced_requested: boolean;
  reduced_verified: boolean;
  guardian_consent_received: boolean;
  consent_photos: boolean;
  consent_whatsapp: boolean;
  is_minor: boolean;
  applied_at: string | null;
};

type PayRow = { member_id: number; kind: string; period: string | null; source: string };

const RED = "#dc2626";
const GREEN = "#16a34a";

function Toggle({
  memberId,
  action,
  fields,
  on,
  label,
}: {
  memberId: number;
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
  on: boolean;
  label: string;
}): ReactNode {
  return (
    <form action={action}>
      <input type="hidden" name="member_id" value={memberId} />
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button
        type="submit"
        aria-pressed={on}
        className="inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors"
        style={
          on
            ? { background: GREEN, borderColor: GREEN, color: "white" }
            : { borderColor: "var(--border)", color: "var(--foreground)" }
        }
      >
        <span aria-hidden="true">{on ? "✓" : "○"}</span>
        {label}
      </button>
    </form>
  );
}

function Details({ m }: { m: Row }): ReactNode {
  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-foreground-dim hover:text-foreground">Daten anzeigen</summary>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-foreground-dim">
        <dt>E-Mail</dt>
        <dd className="text-foreground">{m.email ?? "—"}</dd>
        <dt>Telefon</dt>
        <dd className="text-foreground">{m.phone ?? "—"}</dd>
        <dt>Adresse</dt>
        <dd className="text-foreground">{m.address ?? "—"}</dd>
        <dt>Geburtsdatum</dt>
        <dd className="text-foreground">{m.birth_date ?? "—"}</dd>
        {m.is_minor ? (
          <>
            <dt>Erziehungsber.</dt>
            <dd className="text-foreground">
              {m.guardian_first_name} {m.guardian_last_name} · {m.guardian_phone}
              {m.guardian_email ? ` · ${m.guardian_email}` : ""}
            </dd>
          </>
        ) : null}
        <dt>Fotos/Videos</dt>
        <dd className="text-foreground">{m.consent_photos ? "ja" : "nein"}</dd>
        <dt>WhatsApp</dt>
        <dd className="text-foreground">{m.consent_whatsapp ? "ja" : "nein"}</dd>
      </dl>
      <div className="mt-3">
        <p className="mb-1.5 text-foreground-dim">Passwort zurücksetzen</p>
        <ResetPassword memberId={m.id} />
      </div>
    </details>
  );
}

export default async function BoardPage(): Promise<ReactNode> {
  const me = await getCurrentMember();
  if (!isBoard(me)) redirect("/mitglieder");

  await ensureSchema();
  const month = monthKey(new Date());

  const members = await sql<Row>`
    select id, name, email, phone, address, birth_date::text as birth_date,
      guardian_first_name, guardian_last_name, guardian_phone, guardian_email,
      plan, status, reduced_requested, reduced_verified, guardian_consent_received,
      consent_photos, consent_whatsapp, applied_at::text as applied_at,
      (birth_date is not null and birth_date > (current_date - interval '18 years')) as is_minor
    from members
    order by name asc
  `;
  const payments = await sql<PayRow>`
    select member_id, kind, period::text as period, source from payments
  `;

  const paid = (id: number, kind: string, period?: string): boolean =>
    payments.some(
      (p) => p.member_id === id && p.kind === kind && (period === undefined || p.period === period)
    );

  const pending = members.filter((m) => m.status === "pending");
  const rejected = members.filter((m) => m.status === "rejected");
  const active = members.filter((m) => m.status === "active" && isPlan(m.plan));
  const allOk = (m: Row): boolean => {
    if (!isPlan(m.plan)) return false;
    const regular = PLAN_INFO[m.plan].monthly ? paid(m.id, "month", month) : paid(m.id, "block");
    return paid(m.id, "enrollment") && regular;
  };
  const openCount = active.filter((m) => !allOk(m)).length;

  return (
    <main id="main-content" className="min-h-screen bg-background-deep">
      <div className="mx-auto w-full max-w-[60rem] px-5 py-16 sm:px-8 sm:py-20">
        <Link
          href="/mitglieder"
          className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card-plate px-5 text-sm font-medium text-foreground-dim hover:text-foreground"
        >
          <span aria-hidden="true">←</span> Mitgliederbereich
        </Link>

        <h1 className="jjk-section-title mt-10">Vorstand</h1>

        {/* ── Antraege ─────────────────────────────────────────────── */}
        <section className="mt-12">
          <h2 className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.24em] text-accent">
            Offene Anträge ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-dim">Keine offenen Anträge.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-4">
              {pending.map((m) => {
                const blocked = m.is_minor && !m.guardian_consent_received;
                return (
                  <li key={m.id} className="rounded-xl border border-border bg-card-plate p-5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="text-lg font-medium text-foreground">
                        {m.name}
                        {m.is_minor ? (
                          <span className="ml-2 rounded bg-accent/20 px-1.5 py-0.5 text-xs text-accent">
                            unter 18
                          </span>
                        ) : null}
                      </p>
                      <p className="text-sm text-foreground-dim">
                        {isPlan(m.plan) ? PLAN_INFO[m.plan].label : "—"}
                        {m.reduced_requested ? " · ermäßigt beantragt" : ""}
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {m.is_minor ? (
                        <Toggle memberId={m.id} action={toggleFlagAction} fields={{ flag: "guardian" }} on={m.guardian_consent_received} label="Elternunterschrift" />
                      ) : null}
                      {m.reduced_requested ? (
                        <Toggle memberId={m.id} action={toggleFlagAction} fields={{ flag: "reduced" }} on={m.reduced_verified} label="Ausweis geprüft" />
                      ) : null}
                      <form action={admitAction}>
                        <input type="hidden" name="member_id" value={m.id} />
                        <button
                          type="submit"
                          disabled={blocked}
                          title={blocked ? "Erst die Unterschrift eines Erziehungsberechtigten" : undefined}
                          className="jjk-btn jjk-btn-loud h-9 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Aufnehmen
                        </button>
                      </form>
                      <form action={rejectAction}>
                        <input type="hidden" name="member_id" value={m.id} />
                        <button type="submit" className="h-9 rounded-md border border-border px-3 text-sm text-foreground-dim hover:text-foreground">
                          Ablehnen
                        </button>
                      </form>
                    </div>
                    <Details m={m} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ── Beitraege ────────────────────────────────────────────── */}
        <section className="mt-16">
          <h2 className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.24em] text-accent">
            Beiträge {monthLabel(month)} · {openCount} offen
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {active.map((m) => {
              const plan = isPlan(m.plan) ? m.plan : "flex";
              const info = PLAN_INFO[plan];
              const ok = allOk(m);
              return (
                <li key={m.id} className="rounded-xl border border-border bg-card-plate p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      aria-label={ok ? "alles bezahlt" : "offen"}
                      className="inline-block size-4 shrink-0 rounded-full"
                      style={{ background: ok ? GREEN : RED }}
                    />
                    <span className="min-w-[10rem] flex-1 font-medium text-foreground">{m.name}</span>
                    <span className="text-sm text-foreground-dim">
                      {info.label.replace("ALL IN – ", "")} · {euro(dueCents(plan, m.reduced_verified))}
                      {m.reduced_verified ? " erm." : ""}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Toggle
                      memberId={m.id}
                      action={togglePaymentAction}
                      fields={{ kind: "enrollment" }}
                      on={paid(m.id, "enrollment")}
                      label={`Einschreibung ${euro(ENROLLMENT_FEE_CENTS)}`}
                    />
                    {info.monthly ? (
                      <Toggle memberId={m.id} action={togglePaymentAction} fields={{ kind: "month" }} on={paid(m.id, "month", month)} label={monthLabel(month)} />
                    ) : (
                      <Toggle memberId={m.id} action={togglePaymentAction} fields={{ kind: "block" }} on={paid(m.id, "block")} label="10er-Block" />
                    )}
                    {m.reduced_requested ? (
                      <Toggle memberId={m.id} action={toggleFlagAction} fields={{ flag: "reduced" }} on={m.reduced_verified} label="Ausweis geprüft" />
                    ) : null}
                  </div>
                  <Details m={m} />
                </li>
              );
            })}
          </ul>
          {active.length === 0 ? (
            <p className="mt-4 text-sm text-foreground-dim">Noch keine aufgenommenen Mitglieder mit Mitgliedschaft.</p>
          ) : null}
        </section>

        {/* ── Abgelehnt ────────────────────────────────────────────── */}
        {rejected.length > 0 ? (
          <section className="mt-16">
            <h2 className="font-mono text-[0.72rem] font-medium uppercase tracking-[0.24em] text-accent">
              Abgelehnt ({rejected.length})
            </h2>
            <p className="mt-2 text-sm text-foreground-dim">
              Laut Datenschutzerklärung werden abgelehnte Anträge gelöscht. Löschen ist endgültig.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {rejected.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card-plate px-4 py-3">
                  <span className="text-foreground">{m.name}</span>
                  <form action={deleteRejectedAction}>
                    <input type="hidden" name="member_id" value={m.id} />
                    <button type="submit" className="h-9 rounded-md border px-3 text-sm" style={{ borderColor: RED, color: RED }}>
                      Endgültig löschen
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
