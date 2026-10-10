import type { ReactNode } from "react";
import { HomeLink } from "./home-link";
import { ensureSchema, sql } from "@/lib/db";
import { getCurrentMember, isBoard } from "@/lib/members";
import { getPaymentStatus } from "@/lib/payments";
import { isMollieConfigured } from "@/lib/mollie";
import { StatusPanel } from "./status-panel";
import { PendingView } from "./pending-view";
import {
  computeStats,
  mostRecentTrainingDay,
  toDateOnly,
  type AttendanceVote,
} from "@/lib/attendance";
import { AuthLogin } from "./auth-login";
import { MemberProfile } from "./member-profile";
import { DismissTransition } from "@/components/dismiss-transition";

export const dynamic = "force-dynamic";

const PLAN_LABEL_SHORT = {
  year: "Alle Kurse Jahr",
  quarter: "Alle Kurse 3 Monate",
  flex: "Alle Kurse Flex",
  block: "10er-Block",
} as const;

// `type`, nicht `interface`: nur Type-Aliase bekommen von TypeScript eine
// implizite Index-Signatur. Als `interface` erfuellt MemberRow den Constraint
// `SqlRow = Record<string, unknown>` in lib/db.ts nicht — sql<MemberRow>`...`
// scheitert dann an TS2344, waehrend das anonyme Objekt eine Zeile weiter
// unten durchgeht.
type MemberRow = {
  id: number;
  name: string;
  joined_at: string;
};

const BackLink = HomeLink;

function formatDateLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/**
 * Zeigt einen freundlichen Hinweis statt eines kaputten 500ers, wenn die
 * Postgres-Verbindung (noch) fehlt — das ist der einzige Schritt, den nur
 * ihr bei Scalingo selbst machen koennt (Postgres-Addon anlegen +
 * AUTH_SECRET setzen), nicht etwas, das sich per Code-Aenderung loesen
 * liesse.
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

export default async function MitgliederPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<ReactNode> {
  const justReturned = (await searchParams).zahlung === "1";
  try {
    await ensureSchema();
  } catch {
    return (
      <SetupHint message="Es fehlt entweder das Postgres-Addon oder AUTH_SECRET in den Umgebungsvariablen der App. Beides im Scalingo-Dashboard unter Environment anlegen, danach neu deployen." />
    );
  }

  const member = await getCurrentMember();

  if (!member) {
    return <><DismissTransition /><AuthLogin /></>;
  }
  const memberId = member.id;

  const payment = await getPaymentStatus(member);
  const statusPanel = (
    <StatusPanel
      status={member.status}
      plan={member.plan}
      reducedRequested={member.reducedRequested}
      reducedVerified={member.reducedVerified}
      isMinor={member.isMinor}
      guardianConsentReceived={member.guardianConsentReceived}
      payment={payment}
      firstName={member.firstName ?? member.name.split(" ")[0] ?? member.name}
      fullName={member.name}
      payEnabled={isMollieConfigured()}
      hasSubscription={Boolean(member.mollieSubscriptionId)}
      justReturned={justReturned}
    />
  );

  // Antrag offen oder abgelehnt: nur der eigene Status. Rangliste und
  // Abstimmung gibt es erst nach der Aufnahme durch den Vorstand (§ 5 Abs. 2
  // der Statuten) — vorher waere man in einer Liste, in die man noch nicht
  // gehoert, und saehe die Namen aller anderen.
  if (member.status !== "active") {
    return (
      <>
        <DismissTransition />
        <PendingView>{statusPanel}</PendingView>
      </>
    );
  }

  // Die Rangliste zeigt nur aufgenommene Mitglieder — offene Antraege haben
  // dort nichts verloren.
  const [membersResult, votesResult] = await Promise.all([
    sql<MemberRow>`select id, name, joined_at from members where status = 'active' order by id asc`,
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
    <>
      <DismissTransition />
      <MemberProfile
        memberId={memberId}
        name={me?.name ?? member.name}
        subtitle={member.plan ? PLAN_LABEL_SHORT[member.plan] : "Mitglied"}
        status={statusPanel}
        boardLink={isBoard(member)}
        stats={me?.stats ?? { presentDays: 0, attendancePct: 0, reliabilityPct: 0 }}
        ranked={ranked}
        trainingDateLabel={formatDateLabel(trainingDate)}
        currentVote={myVote ? myVote.present : null}
      />
    </>
  );
}
