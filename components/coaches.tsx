"use client";

import { motion } from "motion/react";
import { coaches } from "@/lib/config";
import ProfileCard from "@/components/profile-card";
import { KanjiLabel } from "@/components/kanji-label";

const ease = [0.22, 1, 0.36, 1] as const;

type CoachMeta = {
  innerGradient: string;
  behindGlowColor: string;
  handle: string;
};

const beltMeta: Record<string, CoachMeta> = {
  black: {
    innerGradient: "linear-gradient(145deg, #1a0f0f99 0%, #8b122244 100%)",
    behindGlowColor: "rgba(139, 18, 32, 0.55)",
    handle: "",
  },
  brown: {
    innerGradient: "linear-gradient(145deg, #3d1f0f99 0%, #8b432544 100%)",
    behindGlowColor: "rgba(107, 67, 37, 0.55)",
    handle: "",
  },
  purple: {
    innerGradient: "linear-gradient(145deg, #1f0f3d99 0%, #6d28d944 100%)",
    behindGlowColor: "rgba(109, 40, 217, 0.55)",
    handle: "",
  },
  blue: {
    innerGradient: "linear-gradient(145deg, #0f1f3d99 0%, #2f6bff44 100%)",
    behindGlowColor: "rgba(47, 107, 255, 0.55)",
    handle: "",
  },
};

const coachHandlesByIndex: string[] = [
  "cobra_mendes",
  "marina_silva",
  "lucas_weber",
  "ana_koenig",
];

const coachAvatars: string[] = [
  "",
  "https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=600&auto=format&fit=crop",
  "",
  "https://images.unsplash.com/photo-1594381898411-846e7d193883?w=600&auto=format&fit=crop",
];

export function Coaches() {
  return (
    <section id="coaches" className="bg-background py-24 lg:py-32">
      <div className="mx-auto max-w-[1500px] px-5 sm:px-8 lg:px-12">
        <div className="mb-14 max-w-3xl lg:mb-20">
          <KanjiLabel kanji="師範" furigana="しはん" gloss="Coaches" />
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-accent">
            The Team
          </span>
          <h2 className="font-display mt-4 text-5xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
            Learn from black belts
            <br />
            who love to teach
          </h2>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {coaches.map((c, i) => {
            const meta = beltMeta[c.beltColor] ?? beltMeta.black;
            const handle = coachHandlesByIndex[i] ?? c.name.toLowerCase().replace(/\s+/g, "_");
            return (
              <motion.div
                key={c.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: (i % 4) * 0.08, ease }}
                className="flex flex-col gap-4"
              >
                <div id={`cursor-coach-${i}`}>
                <ProfileCard
                  name={c.name.replace(/\s*["""][^"""]*["""]/g, "").trim()}
                  title={c.role}
                  handle={handle}
                  status={c.belt}
                  contactText="Book a Class"
                  avatarUrl={coachAvatars[i]}
                  miniAvatarUrl={coachAvatars[i]}
                  innerGradient={meta.innerGradient}
                  behindGlowColor={meta.behindGlowColor}
                  behindGlowSize="45%"
                  enableTilt
                  showUserInfo
                  showContact={false}
                  onContactClick={() => {
                    document
                      .getElementById("pricing")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                />
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {c.bio}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
