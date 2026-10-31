"use client";

import { useState, type ReactNode } from "react";
import { MotionConfig, motion, type Variants } from "motion/react";
import { TransitionLink } from "@/components/transition-link";
import { useReducedMotion } from "@/lib/motion";
import { VoteForm } from "./vote-form";
import { ChangePassword } from "./change-password";
import { logoutAction } from "./actions";
import { HomeLink } from "./home-link";

/**
 * Der Mitgliederbereich nach der Aufnahme (Umbau 31.10.2026, Begruendung
 * ausfuehrlich in app/globals.css unter "DER MITGLIEDERBEREICH").
 *
 * Kurz: Kopfzeile ueber die volle Breite (Rolle, Name, rechts die vier
 * Verweise), darunter ab lg zwei Spalten — links Abstimmung, Zahlen, Beitrag,
 * rechts Podium und EINE Rangliste. Vorher gab es zwei Navigationen
 * uebereinander (Profil | Rangliste oben, Abstimmung | Rangliste | Podium in
 * der Karte) und damit zwei Ranglisten mit verschiedenen Spalten. Jetzt steht
 * alles gleichzeitig da; es sind bei 1440 px 1136 px Breite, und die
 * Rangliste braucht keinen Klick mehr.
 *
 * Kein Avatar mehr. Die Initialen im leuchtenden Kreis waren die einzige
 * runde Form und der einzige Glanz auf der Seite und sagten nichts, was der
 * Name daneben nicht schon sagt. Ein Siegel als Ersatz waere eine zweite
 * Bedeutung fuer die Hanko-Form, die oben auf der Startseite der Eingang
 * HIERHER ist.
 */

const ease = [0.22, 1, 0.36, 1] as const;

interface MemberStats {
  presentDays: number;
  attendancePct: number;
  reliabilityPct: number;
}

interface RankedMember {
  id: number;
  name: string;
  stats: MemberStats;
}

interface Props {
  memberId: number;
  name: string;
  /** Augenbraue ueber dem Namen: Rolle, bei Mitgliedern mit dem Tarif. */
  eyebrow: string;
  /** Der Statusblock (app/mitglieder/status-panel.tsx), vom Server gerendert. */
  status: ReactNode;
  /** Nur fuer den Vorstand: Verweis auf /vorstand. */
  boardLink: boolean;
  stats: MemberStats;
  ranked: RankedMember[];
  trainingDateLabel: string;
  /** Der Abstimmungstag ist heute (nicht der letzte Trainingstag davor). */
  isToday: boolean;
  currentVote: boolean | null;
}

export function MemberProfile({
  memberId,
  name,
  eyebrow,
  status,
  boardLink,
  stats,
  ranked,
  trainingDateLabel,
  isToday,
  currentVote,
}: Props): ReactNode {
  const [pwOpen, setPwOpen] = useState(false);
  const reduce = useReducedMotion();

  // Zurueckhaltend: die Bloecke blenden nacheinander ein und heben sich um
  // 10 px. Bei "weniger Bewegung" nur die Blende, ohne Weg und ohne Versatz.
  // MotionConfig "user" sichert dasselbe ab, falls der erste Render noch den
  // Server-Wert (false) aus lib/motion.tsx sieht.
  const block: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 10 },
    visible: { opacity: 1, y: 0, transition: { duration: reduce ? 0.2 : 0.5, ease } },
  };
  const page: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: reduce ? 0 : 0.06 } },
  };

  const podium = ranked.slice(0, 3);
  const profileStats = [
    { value: String(stats.presentDays), label: "Trainings" },
    { value: `${stats.attendancePct}%`, label: "Anwesenheit" },
    { value: `${stats.reliabilityPct}%`, label: "Zuverlässigkeit" },
  ];

  return (
    <MotionConfig reducedMotion="user">
      <main id="main-content" className="min-h-screen w-full bg-background-deep">
        <motion.div
          variants={page}
          initial="hidden"
          animate="visible"
          className="mx-auto w-full max-w-[75rem] px-4 py-12 sm:px-8 sm:py-16 lg:py-20"
        >
          <motion.header
            variants={block}
            className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between lg:gap-10 lg:pb-9"
          >
            <div className="min-w-0">
              <p className="jjk-mb-eyebrow">{eyebrow}</p>
              <h1 className="jjk-section-title mt-3 wrap-break-word">{name}</h1>
            </div>
            <nav aria-label="Konto" className="jjk-mb-links lg:shrink-0 lg:justify-end">
              {boardLink ? (
                <TransitionLink href="/vorstand" className="jjk-mb-link">
                  Vorstandsbereich <span aria-hidden="true">→</span>
                </TransitionLink>
              ) : null}
              <button
                type="button"
                className="jjk-mb-link"
                aria-expanded={pwOpen}
                aria-controls="passwort"
                onClick={() => setPwOpen((o) => !o)}
              >
                Passwort ändern
              </button>
              <form action={logoutAction} className="contents">
                <button type="submit" className="jjk-mb-link">
                  Abmelden
                </button>
              </form>
              <HomeLink className="jjk-mb-link" />
            </nav>
          </motion.header>

          {/* Das Formular bleibt eingehaengt, wenn es zu ist: so steht
              "Passwort geändert." noch da, wenn man es wieder aufklappt, und
              ein halb getipptes Passwort ist nicht weg. */}
          <ChangePassword id="passwort" open={pwOpen} />

          <div className="mt-8 grid gap-12 lg:mt-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,6fr)] lg:gap-14">
            <div className="flex min-w-0 flex-col gap-8">
              <motion.div variants={block}>
                <VoteForm
                  trainingDateLabel={trainingDateLabel}
                  isToday={isToday}
                  currentVote={currentVote}
                />
              </motion.div>

              <motion.section variants={block} aria-label="Deine Zahlen">
                <dl className="jjk-mb-stats">
                  {profileStats.map((s) => (
                    <div key={s.label} className="jjk-mb-stat">
                      <dt>{s.label}</dt>
                      <dd>{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                  Zuverlässigkeit zählt, wie oft abgestimmt wurde. Jede 5. verpasste Abstimmung
                  wird verziehen.
                </p>
              </motion.section>

              <motion.div variants={block}>{status}</motion.div>
            </div>

            <div className="flex min-w-0 flex-col gap-10">
              {podium.length > 0 ? (
                <motion.section variants={block} aria-labelledby="podium-title">
                  <h2 id="podium-title" className="jjk-mb-eyebrow">
                    Podium
                  </h2>
                  <ol className="jjk-mb-podium mt-4">
                    {podium.map((m, i) => (
                      <li key={m.id} data-first={i === 0 ? "" : undefined}>
                        <span className="jjk-mb-podium-rank">{i + 1}</span>
                        <span className="jjk-mb-podium-name">{m.name}</span>
                        <span className="jjk-mb-podium-meta">
                          {m.stats.presentDays} Trainings · {m.stats.attendancePct}%
                        </span>
                      </li>
                    ))}
                  </ol>
                </motion.section>
              ) : null}

              <motion.section variants={block} aria-labelledby="rangliste-title">
                <h2 id="rangliste-title" className="jjk-mb-eyebrow">
                  Rangliste
                </h2>
                <div className="jjk-mb-rank-wrap jjk-mb-plate mt-4">
                  <table className="jjk-mb-rank">
                    <colgroup>
                      <col className="jjk-mb-rank-pos" />
                      <col />
                      <col className="jjk-mb-rank-num" />
                      <col className="jjk-mb-rank-num" />
                      <col className="jjk-mb-rank-num" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th scope="col">#</th>
                        <th scope="col">Name</th>
                        <RankHead short="Tr." long="Trainings" />
                        <RankHead short="Anw." long="Anwesenheit" />
                        <RankHead short="Zuv." long="Zuverlässigkeit" />
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((m, i) => (
                        <tr
                          key={m.id}
                          data-me={m.id === memberId ? "" : undefined}
                          aria-current={m.id === memberId ? "true" : undefined}
                        >
                          <td>{i + 1}</td>
                          <td title={m.name}>{m.name}</td>
                          <td>{m.stats.presentDays}</td>
                          <td>{m.stats.attendancePct}%</td>
                          <td>{m.stats.reliabilityPct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.section>
            </div>
          </div>
        </motion.div>
      </main>
    </MotionConfig>
  );
}

function RankHead({ short, long }: { short: string; long: string }): ReactNode {
  return (
    <th scope="col">
      <span className="jjk-mb-th-short" aria-hidden="true">
        {short}
      </span>
      <span className="jjk-mb-th-long">{long}</span>
    </th>
  );
}
