"use client";

import { useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { VoteForm } from "./vote-form";
import { logoutAction } from "./actions";

const container: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1],
      staggerChildren: 0.07,
      delayChildren: 0.15,
    },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

const tabs = ["Abstimmung", "Rangliste", "Podium"] as const;
type Tab = (typeof tabs)[number];

const medals = ["🥇", "🥈", "🥉"];

interface MemberStats {
  presentDays: number;
  attendancePct: number;
  reliabilityPct: number;
}

interface RankedMember {
  id: number;
  name: string;
  username: string;
  stats: MemberStats;
}

interface Props {
  memberId: number;
  name: string;
  username: string;
  stats: MemberStats;
  ranked: RankedMember[];
  trainingDateLabel: string;
  currentVote: boolean | null;
}

type View = "profil" | "rangliste";

export function MemberProfile({
  memberId,
  name,
  username,
  stats,
  ranked,
  trainingDateLabel,
  currentVote,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("Abstimmung");
  const [view, setView] = useState<View>("profil");
  const reduceMotion = useReducedMotion();

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const podium = ranked.slice(0, 3);

  const profileStats = [
    { value: String(stats.presentDays), label: "Trainings" },
    { value: `${stats.attendancePct}%`, label: "Anwesenheit" },
    { value: `${stats.reliabilityPct}%`, label: "Zuverlässigkeit" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen w-full px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24"
    >
      {/* View switcher */}
      <div className="mx-auto mb-8 flex w-full max-w-lg rounded-full border border-white/10 bg-white/[0.04] p-1">
        {(["profil", "rangliste"] as View[]).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`relative flex-1 cursor-pointer rounded-full px-3 py-2 text-sm font-medium capitalize transition-colors duration-200 focus-visible:outline-none ${
              view === v ? "text-accent-foreground" : "text-foreground-dim hover:text-foreground"
            }`}
          >
            {view === v && (
              <motion.span
                layoutId="viewTab"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 rounded-full"
                style={{ background: "var(--accent)" }}
              />
            )}
            <span className="relative z-10">{v === "profil" ? "Profil" : "Rangliste"}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {view === "profil" ? (
          <motion.div
            key="profil"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full items-start lg:items-center"
          >
      <div className="mx-auto flex w-full max-w-[1400px] items-center justify-center">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/40"
          style={{ background: "var(--card)" }}
        >
          {/* Spotlight glow */}
          <motion.div
            aria-hidden="true"
            animate={{ opacity: reduceMotion ? 0.6 : [0.45, 0.8, 0.45] }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { duration: 7, repeat: Infinity, ease: "easeInOut" }
            }
            className="pointer-events-none absolute -top-28 left-1/2 h-64 w-[30rem] max-w-none -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: "color-mix(in srgb, var(--accent) 18%, transparent)", opacity: 0.6 }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-12 top-0 h-px"
            style={{ background: "linear-gradient(to right, transparent, color-mix(in srgb, var(--accent) 40%, transparent), transparent)" }}
          />

          <div className="relative px-6 pb-6 pt-8 sm:px-8 sm:pb-8 sm:pt-10">
            {/* Avatar */}
            <motion.div variants={item} className="relative mx-auto h-24 w-24">
              <div
                aria-hidden="true"
                className="absolute -inset-2 rounded-full blur-xl"
                style={{ background: "color-mix(in srgb, var(--accent) 25%, transparent)" }}
              />
              <div
                className="relative flex h-full w-full items-center justify-center rounded-full p-[3px]"
                style={{ background: "linear-gradient(to bottom, color-mix(in srgb, var(--accent) 50%, transparent), color-mix(in srgb, var(--accent) 10%, transparent))" }}
              >
                <div
                  className="flex h-full w-full items-center justify-center rounded-full text-2xl font-bold text-accent"
                  style={{ background: "var(--background-deep)" }}
                >
                  {initials}
                </div>
              </div>
            </motion.div>

            {/* Name */}
            <motion.div variants={item} className="mt-5 text-center">
              <h1 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
                {name}
              </h1>
              <p className="mt-1.5 text-sm text-foreground-dim">@{username} · JJK Academy</p>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={item}
              className="mt-7 flex items-stretch justify-center divide-x divide-white/10 border-y border-white/10 py-4"
            >
              {profileStats.map((stat) => (
                <div key={stat.label} className="px-5 text-center sm:px-7">
                  <p className="text-lg font-semibold tabular-nums tracking-tight text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs text-foreground-dim">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            {/* Tabs */}
            <motion.div
              variants={item}
              role="group"
              aria-label="Mitgliederbereich"
              className="mt-6 flex rounded-full border border-white/10 bg-white/[0.04] p-1"
            >
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  aria-pressed={activeTab === tab}
                  className={`relative flex-1 cursor-pointer rounded-full px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                    activeTab === tab ? "text-accent-foreground" : "text-foreground-dim hover:text-foreground"
                  }`}
                >
                  {activeTab === tab && (
                    <motion.span
                      layoutId="memberTab"
                      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute inset-0 rounded-full"
                      style={{ background: "var(--accent)" }}
                    />
                  )}
                  <span className="relative z-10">{tab}</span>
                </button>
              ))}
            </motion.div>

            {/* Tab content */}
            <motion.div variants={item} className="relative mt-4">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {activeTab === "Abstimmung" && (
                    <VoteForm
                      trainingDateLabel={trainingDateLabel}
                      currentVote={currentVote}
                    />
                  )}

                  {activeTab === "Rangliste" && (
                    <div className="max-h-52 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03]">
                      {ranked.map((m, i) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 border-b border-white/5 px-4 py-2.5 last:border-0 text-sm"
                          style={
                            m.id === memberId
                              ? { backgroundColor: "color-mix(in srgb, var(--accent) 12%, transparent)" }
                              : undefined
                          }
                        >
                          <span className="w-5 shrink-0 text-center text-xs tabular-nums text-foreground-dim">{i + 1}</span>
                          <span className="flex-1 truncate font-medium text-foreground">{m.name}</span>
                          <span className="tabular-nums text-foreground-dim">{m.stats.presentDays}</span>
                          <span className="w-12 text-right tabular-nums text-foreground-dim">{m.stats.attendancePct}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "Podium" && (
                    <div className="flex flex-col gap-2.5">
                      {podium.map((m, i) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3.5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                          style={
                            i === 0
                              ? { borderColor: "rgba(255,215,0,0.3)" }
                              : i === 1
                                ? { borderColor: "rgba(224,224,224,0.2)" }
                                : { borderColor: "rgba(205,127,50,0.3)" }
                          }
                        >
                          <span className="text-xl">{medals[i]}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">{m.name}</span>
                            <span className="block truncate text-xs text-foreground-dim">{m.stats.presentDays} Trainings · {m.stats.attendancePct}%</span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Logout */}
            <motion.div variants={item} className="mt-3">
              <form action={logoutAction}>
                <motion.button
                  type="submit"
                  whileTap={{ scale: 0.985 }}
                  className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                  style={{ background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  <LogOut className="h-4 w-4" />
                  Abmelden
                </motion.button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>
          </motion.div>
        ) : (
          <motion.div
            key="rangliste"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto w-full max-w-4xl"
          >
            {/* Podium */}
            {ranked.length > 0 && (
              <div className="mb-10">
                <h2 className="font-display text-xl text-foreground mb-4">Podium</h2>
                <div className="grid grid-cols-3 gap-3">
                  {ranked.slice(0, 3).map((m, i) => (
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
                      <div className="mt-1 truncate text-sm font-semibold text-foreground">{m.name}</div>
                      <div className="mt-1 text-lg font-bold text-foreground">{m.stats.presentDays}</div>
                      <div className="text-[0.6rem] tracking-wide text-foreground-dim uppercase">Trainings</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full ranking table */}
            <h2 className="font-display text-xl text-foreground mb-4">Rangliste</h2>
            <div className="overflow-x-auto rounded-2xl border border-white/10">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-foreground-dim">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 text-right font-medium">Trainings</th>
                    <th className="px-4 py-3 text-right font-medium">Anwesenheit</th>
                    <th className="px-4 py-3 text-right font-medium">Zuverlässigkeit</th>
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
                      <td className="px-4 py-3 font-medium text-foreground">{m.name}</td>
                      <td className="px-4 py-3 text-right text-foreground">{m.stats.presentDays}</td>
                      <td className="px-4 py-3 text-right text-foreground-dim">{m.stats.attendancePct}%</td>
                      <td className="px-4 py-3 text-right text-foreground-dim">{m.stats.reliabilityPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-foreground-dim">
              Zuverlässigkeit zählt, wie oft abgestimmt wurde. Jede 5. verpasste Abstimmung wird verziehen.
            </p>

          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex justify-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-card px-4 py-2.5 text-sm font-medium text-foreground-dim transition-colors hover:border-white/20 hover:text-foreground"
        >
          <span aria-hidden>←</span> Startseite
        </Link>
      </div>
    </motion.div>
  );
}
