import type { ReactNode } from "react";
import Link from "next/link";
import { ensureSchema, sql } from "@/lib/db";
import { getSessionMemberId } from "@/lib/auth";
import {
  computeStats,
  mostRecentTrainingDay,
  toDateOnly,
  type AttendanceVote,
} from "@/lib/attendance";
import { AuthLogin } from "./auth-login";
import { MemberProfile } from "./member-profile";

export const dynamic = "force-dynamic";

interface MemberRow {
  id: number;
  name: string;
  username: string;
  joined_at: string;
}

function BackLink(): ReactNode {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card px-4 py-2.5 text-sm font-medium text-foreground-dim transition-colors hover:border-white/20 hover:text-foreground"
    >
      <span aria-hidden>←</span> Startseite
    </Link>
  );
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
      <BackLink />
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
    return <AuthLogin />;
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
  for (const v of votesResult) {
    const list = votesByMember.get(v.member_id) ?? [];
    list.push({ training_date: v.training_date, present: v.present });
    votesByMember.set(v.member_id, list);
  }

  const ranked = membersResult
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

  return (
    <MemberProfile
      memberId={memberId}
      name={me?.name ?? "Mitglied"}
      username={me?.username ?? ""}
      stats={me?.stats ?? { presentDays: 0, attendancePct: 0, reliabilityPct: 0 }}
      ranked={ranked}
      trainingDateLabel={formatDateLabel(trainingDate)}
      currentVote={myVote ? myVote.present : null}
    />
  );
}
