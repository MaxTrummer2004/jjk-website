import type { ReactNode } from "react";
import { ensureSchema, sql } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";
import {
  computeStats,
  mostRecentTrainingDay,
  toDateOnly,
  type AttendanceVote,
} from "@/lib/attendance";
import { AuthForm } from "./auth-form";
import { VoteForm } from "./vote-form";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

interface MemberRow {
  id: number;
  name: string;
  username: string;
  joined_at: string;
}

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Zeigt einen freundlichen Hinweis statt eines kaputten 500ers, wenn die
 * Postgres-Verbindung (noch) fehlt — das ist der einzige Schritt, den nur
 * ihr in Vercel selbst machen koennt (Datenbank anlegen + AUTH_SECRET
 * setzen), nicht etwas, das sich per Code-Aenderung loesen liesse.
 */
function SetupHint({ message }: { message: string }): ReactNode {
  return (
    <section className="mx-auto flex min-h-[60svh] max-w-lg flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="font-display text-2xl text-foreground">
        Mitgliederbereich noch nicht eingerichtet
      </h1>
      <p className="text-sm leading-relaxed text-foreground-dim">{message}</p>
    </section>
  );
}

export default async function MitgliederPage(): Promise<ReactNode> {
  try {
    await ensureSchema();
  } catch {
    return (
      <SetupHint message="Es fehlt entweder die Postgres-Datenbank oder AUTH_SECRET in den Vercel-Umgebungsvariablen des Projekts. Beides unter Project Settings → Environment Variables anlegen, danach neu deployen." />
    );
  }

  const memberId = await getSessionMemberId();

  if (!memberId) {
    return (
      <section className="mx-auto flex min-h-[80svh] max-w-lg flex-col items-center justify-center gap-8 px-6 py-24">
        <div className="text-center">
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            Mitgliederbereich
          </h1>
          <p className="mt-3 text-sm text-foreground-dim">
            Rangliste, Streaks und deine Trainings-Quote — nur für
            angemeldete Mitglieder.
          </p>
        </div>
        <AuthForm />
      </section>
    );
  }

  const [membersResult, votesResult] = await Promise.all([
    sql<MemberRow>`select id, name, username, joined_at from members order by id asc`,
    sql<{ member_id: number; training_date: string; present: boolean }>`
      select member_id, training_date::text as training_date, present
      from attendance_votes
      order by training_date asc
    `,
  ]);

  const votesByMember = new Map<number, AttendanceVote[]>();
  for (const v of votesResult.rows) {
    const list = votesByMember.get(v.member_id) ?? [];
    list.push({ training_date: v.training_date, present: v.present });
    votesByMember.set(v.member_id, list);
  }

  const ranked = membersResult.rows
    .map((m) => {
      const votes = votesByMember.get(m.id) ?? [];
      const stats = computeStats(new Date(m.joined_at), votes);
      return { ...m, stats };
    })
    .sort((a, b) => {
      if (b.stats.presentDays !== a.stats.presentDays) {
        return b.stats.presentDays - a.stats.presentDays;
      }
      return b.stats.reliabilityPct - a.stats.reliabilityPct;
    });

  const me = ranked.find((m) => m.id === memberId);
  const trainingDate = toDateOnly(mostRecentTrainingDay(new Date()));
  const myVote = (votesByMember.get(memberId) ?? []).find(
    (v) => v.training_date === trainingDate
  );

  const podium = ranked.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-24 sm:px-6 sm:py-28 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            Mitgliederbereich
          </h1>
          <p className="mt-2 text-sm text-foreground-dim">
            Hallo {me?.name ?? "Mitglied"} 👋
          </p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-full border border-white/10 px-5 py-2 text-sm text-foreground-dim transition-colors hover:text-foreground"
          >
            Abmelden
          </button>
        </form>
      </div>

      {me && (
        <div className="mt-8">
          <VoteForm
            trainingDateLabel={formatDateLabel(trainingDate)}
            currentVote={myVote ? myVote.present : null}
          />
        </div>
      )}

      {me && (
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-card p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {me.stats.presentDays}
            </div>
            <div className="mt-1 text-[0.65rem] tracking-wide text-foreground-dim uppercase">
              Trainings
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card p-4 text-center">
            <div className="text-2xl font-bold text-accent">
              {me.stats.attendancePct}%
            </div>
            <div className="mt-1 text-[0.65rem] tracking-wide text-foreground-dim uppercase">
              Anwesenheit
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card p-4 text-center">
            <div className="text-2xl font-bold text-foreground">
              {me.stats.reliabilityPct}%
            </div>
            <div className="mt-1 text-[0.65rem] tracking-wide text-foreground-dim uppercase">
              Zuverlässigkeit
            </div>
          </div>
        </div>
      )}

      {/* ---------- PODIUM ---------- */}
      {podium.length > 0 && (
        <div className="mt-12">
          <h2 className="font-display text-xl text-foreground">Podium</h2>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {podium.map((m, i) => (
              <div
                key={m.id}
                className="rounded-2xl border p-4 text-center"
                style={{
                  borderColor:
                    i === 0
                      ? "rgba(255,215,0,0.4)"
                      : i === 1
                        ? "rgba(224,224,224,0.35)"
                        : "rgba(205,127,50,0.4)",
                  background: "var(--card)",
                  transform: i === 0 ? "translateY(-8px)" : undefined,
                }}
              >
                <div className="text-2xl">{medals[i]}</div>
                <div className="mt-1 truncate text-sm font-semibold text-foreground">
                  {m.name}
                </div>
                <div className="mt-1 text-lg font-bold text-foreground">
                  {m.stats.presentDays}
                </div>
                <div className="text-[0.6rem] tracking-wide text-foreground-dim uppercase">
                  Trainings
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ---------- RANGLISTE ---------- */}
      <div className="mt-12">
        <h2 className="font-display text-xl text-foreground">Rangliste</h2>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-foreground-dim">
                <th className="px-4 py-3 font-medium">#</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 text-right font-medium">Trainings</th>
                <th className="px-4 py-3 text-right font-medium">
                  Anwesenheit
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  Zuverlässigkeit
                </th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((m, i) => (
                <tr
                  key={m.id}
                  className="border-b border-white/5 last:border-0"
                  style={
                    m.id === memberId
                      ? { backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)" }
                      : undefined
                  }
                >
                  <td className="px-4 py-3 text-foreground-dim">{i + 1}</td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {m.name}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {m.stats.presentDays}
                  </td>
                  <td className="px-4 py-3 text-right text-foreground-dim">
                    {m.stats.attendancePct}%
                  </td>
                  <td className="px-4 py-3 text-right text-foreground-dim">
                    {m.stats.reliabilityPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-foreground-dim">
          Zuverlässigkeit zählt, wie oft abgestimmt wurde (nicht, ob man da
          war) — jede 5. verpasste Abstimmung wird verziehen und drückt die
          Quote nicht.
        </p>
      </div>
    </section>
  );
}
