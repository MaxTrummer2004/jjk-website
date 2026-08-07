"use client";

import { useRef, useCallback, useEffect } from "react";
import { motion } from "motion/react";
import { schedule, type ScheduleClass } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";

const ease = [0.22, 1, 0.36, 1] as const;

const kindStyle: Record<
  ScheduleClass["kind"],
  { bar: string; time: string; badge: string; label: string }
> = {
  gi:   { bar: "bg-accent",           time: "text-accent",           badge: "bg-accent/10 text-accent border border-accent/25",              label: "Gi"       },
  nogi: { bar: "bg-gold",             time: "text-gold",             badge: "bg-gold/10 text-gold border border-gold/25",                    label: "No-Gi"    },
  kids: { bar: "bg-accent",          time: "text-ember",          badge: "bg-accent/10 text-ember border border-accent/25",           label: "Kids"     },
  open: { bar: "bg-muted-foreground", time: "text-muted-foreground", badge: "bg-muted text-muted-foreground border border-border",           label: "Open Mat" },
};

function TiltCard({ children }: { children: React.ReactNode }) {
  const wrapRef  = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const glowRef  = useRef<HTMLDivElement>(null);
  const target   = useRef({ rx: 0, ry: 0 });
  const current  = useRef({ rx: 0, ry: 0 });
  const raf      = useRef<number | undefined>(undefined);

  useEffect(() => {
    const tick = () => {
      const t = target.current;
      const c = current.current;
      c.rx += (t.rx - c.rx) * 0.1;
      c.ry += (t.ry - c.ry) * 0.1;
      if (innerRef.current)
        innerRef.current.style.transform = `rotateX(${c.rx}deg) rotateY(${c.ry}deg)`;
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    const px = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const py = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    target.current = { rx: py * -10, ry: px * 10 };
    if (glowRef.current) {
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      glowRef.current.style.background =
        `radial-gradient(280px circle at ${x}px ${y}px, rgba(164,18,31,0.22) 0%, transparent 70%)`;
      glowRef.current.style.opacity = "1";
    }
  }, []);

  const onLeave = useCallback(() => {
    target.current = { rx: 0, ry: 0 };
    if (glowRef.current) glowRef.current.style.opacity = "0";
  }, []);

  return (
    <div
      ref={wrapRef}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ perspective: "800px" }}
      className="h-full"
    >
      <div
        ref={innerRef}
        style={{ transformStyle: "preserve-3d", willChange: "transform" }}
        className="relative h-full rounded-2xl"
      >
        <div
          ref={glowRef}
          className="pointer-events-none absolute inset-0 z-20 rounded-2xl opacity-0 transition-opacity duration-300"
        />
        {children}
      </div>
    </div>
  );
}

export function Schedule() {
  return (
    <section id="schedule" className="border-t border-border bg-card py-24 lg:py-32">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">

        <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <KanjiLabel kanji="時間割" furigana="じかんわり" gloss="Schedule" />
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
              Weekly Schedule
            </span>
            <h2 className="font-display mt-4 text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
              Find your mat time
            </h2>
          </div>
          <div className="flex flex-wrap gap-5">
            {Object.values(kindStyle).map((k) => (
              <span key={k.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className={`h-2 w-2 rounded-full ${k.bar}`} />
                {k.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {schedule.map((col, i) => (
            <motion.div
              key={col.day}
              id={`cursor-sched-${i}`}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease }}
              className="h-full"
            >
              <TiltCard>
                {/* Gradient border wrapper */}
                <div className="group relative h-full rounded-2xl bg-gradient-to-b from-border/80 via-border/30 to-border/10 p-px transition-all duration-500 hover:from-accent/50 hover:via-accent/20 hover:to-border/10 hover:shadow-lg hover:shadow-accent/10">
                  <div className="relative flex h-full flex-col overflow-hidden rounded-[15px] bg-background">

                    {/* Day header */}
                    <div className="relative overflow-hidden">
                      {/* bg with subtle gradient */}
                      <div className="absolute inset-0 bg-gradient-to-b from-accent/12 via-accent/5 to-transparent" />
                      {/* top accent line */}
                      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-accent to-transparent opacity-70" />
                      <div className="relative px-4 pb-4 pt-5">
                        <p className="font-display text-center text-2xl font-bold uppercase tracking-[0.2em] text-foreground">
                          {col.day}
                        </p>
                        <p className="mt-0.5 text-center text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">
                          {col.classes.length} {col.classes.length === 1 ? "class" : "classes"}
                        </p>
                      </div>
                      {/* separator */}
                      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    </div>

                    {/* Classes */}
                    <div className="flex flex-col gap-1.5 p-3">
                      {col.classes.map((c, j) => {
                        const s = kindStyle[c.kind];
                        return (
                          <div
                            key={j}
                            className="relative overflow-hidden rounded-xl px-3 py-2.5 transition-colors duration-200 hover:bg-accent/8"
                          >
                            {/* left accent bar */}
                            <div className={`absolute inset-y-2 left-0 w-[3px] rounded-full ${s.bar}`} />
                            <div className="pl-2">
                              <div className="flex items-center justify-between gap-1">
                                <span className={`font-mono text-[11px] font-bold tracking-wider ${s.time}`}>
                                  {c.time}
                                </span>
                                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide ${s.badge}`}>
                                  {s.label}
                                </span>
                              </div>
                              <p className="mt-0.5 text-[13px] font-semibold leading-snug text-foreground">
                                {c.name}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          New to the mats? Drop in to any{" "}
          <span className="font-semibold text-foreground">Fundamentals</span> class — no booking required.
        </p>
      </div>
    </section>
  );
}
