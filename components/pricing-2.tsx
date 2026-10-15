"use client";

/**
 * Was es kostet — fuenf Angebote in zwei Gruppen.
 *
 * ── Warum Zeilen und keine Spalten ──────────────────────────────────────────
 * Die Vorgaenger-Fassung hatte zwei Kaesten nebeneinander, davor drei, davor
 * eine Bento-Wand. Mit fuenf Angeboten traegt keine Spaltenform mehr: auf
 * 380 px waeren das fuenf Wischer oder eine Tabelle, die quer laeuft, und auf
 * dem Desktop fuenf gleich laute Kaesten, in denen nichts mehr hervorsticht.
 *
 * Zeilen loesen beides. Eine Zeile ist am Handy genauso lesbar wie am Desktop,
 * sie wird nur laenger. Und eine Zeile kann leise sein, waehrend die daneben
 * laut ist — fuenf Kaesten koennen das nicht.
 *
 * ── Warum zwei Gruppen ──────────────────────────────────────────────────────
 * "Einmal ansehen" und "hier trainieren" sind keine fuenf Stufen derselben
 * Frage, sondern zwei Fragen. Wer noch nie auf einer Matte stand, waehlt nicht
 * zwischen Jahresvertrag und Zehnerblock — er will wissen, was ihn das erste
 * Mal kostet. Deshalb zuerst der Einstieg, dann die Mitgliedschaft.
 *
 * ── Wie das Jahr hervorgehoben ist ──────────────────────────────────────────
 * Mit einer Zahl, nicht mit einem Etikett: "240 € weniger als Flex". Ein "Beliebt!" behauptet einen Vorteil, eine Differenz zeigt
 * ihn. Dazu eine Glutkante links und ein waermerer Grund. Kein Vergroessern,
 * kein Schlagschatten — diese Seite hat keine Tiefe, in die etwas hineinragen
 * koennte, und eine Zeile, die abhebt, kommt von einer anderen Website.
 */

import { motion } from "motion/react";
import { pricing } from "@/lib/config";
import { KanjiLabel } from "@/components/kanji-label";
import StaggeredText from "@/components/staggered-text";
import type { ReactNode } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

/** "pro Monat" wird neben der Zahl zu "/ Monat". */
function unit(per: string): string {
  return per.startsWith("pro ") ? `/ ${per.slice(4)}` : per;
}

interface Plan {
  readonly name: string;
  readonly price: string;
  /** Schueler-/Studentenpreis, gleich gross neben dem regulaeren. */
  readonly reduced?: string;
  readonly per: string;
  readonly note: string;
  readonly featured: boolean;
}

function PlanRows({
  label,
  plans,
  from,
}: {
  label: string;
  plans: readonly Plan[];
  from: number;
}): ReactNode {
  return (
    <div>
      <p className="jjk-plan-group mb-3">{label}</p>
      <div className="jjk-plans">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.45, delay: 0.06 * (from + i), ease }}
            className="jjk-plan"
            {...(plan.featured ? { "data-featured": "" } : {})}
          >
            {/* Jede Zeile gleich gebaut (Rueckmeldung 15.10.2026: "ich weiss
                nicht, was zu was gehoert"): links Name mit Nebenzeile darunter,
                rechts bzw. am Handy darunter der Preisblock mit Beschriftung
                oben und Zahl darunter. Auch "gratis" steht in so einem Block. */}
            <span className="jjk-plan-head">
              <span className="jjk-plan-name">{plan.name}</span>
              {plan.note ? <span className="jjk-plan-note">{plan.note}</span> : null}
            </span>
            {plan.reduced ? (
              <span className="jjk-plan-price jjk-plan-price-duo">
                <span className="jjk-plan-amt">
                  <span className="jjk-plan-amt-label">Regulär</span>
                  <span className="jjk-plan-amt-value">
                    {plan.price} €
                    {plan.per ? <span className="jjk-plan-amt-unit">{unit(plan.per)}</span> : null}
                  </span>
                </span>
                <span className="jjk-plan-amt">
                  <span className="jjk-plan-amt-label">Schüler &amp; Studenten</span>
                  <span className="jjk-plan-amt-value">
                    {plan.reduced} €
                    {plan.per ? <span className="jjk-plan-amt-unit">{unit(plan.per)}</span> : null}
                  </span>
                </span>
              </span>
            ) : (
              <span className="jjk-plan-price jjk-plan-price-duo jjk-plan-price-one">
                <span className="jjk-plan-amt">
                  <span className="jjk-plan-amt-label">Für alle</span>
                  <span className="jjk-plan-amt-value">
                    {plan.price === "gratis" ? "gratis" : `${plan.price} €`}
                    {plan.per ? <span className="jjk-plan-amt-unit">{unit(plan.per)}</span> : null}
                  </span>
                </span>
              </span>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export default function Pricing2(): ReactNode {
  return (
    <section className="w-full px-4 pt-20 pb-0 sm:px-6 sm:py-36 lg:px-8">
      <div className="mx-auto w-full max-w-[1400px]">
        <KanjiLabel kanji="入門" furigana="にゅうもん" gloss="Mitgliedschaft" />
        <StaggeredText
          text="Kosten"
          as="h2"
          segmentBy="words"
          direction="bottom"
          delay={70}
          duration={0.7}
          blur
          className="jjk-section-title max-w-3xl"
        />

        <div className="mt-12 flex flex-col gap-10 sm:mt-16">
          <PlanRows label="Teste die Akademie" plans={pricing.single} from={0} />
          <div>
            <PlanRows label="Mitgliedschaft" plans={pricing.membership} from={2} />
            {/* Was drin ist — direkt unter dem Preis (Vorstand, 12.10.2026). */}
            <ul className="jjk-benefits">
              {pricing.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Einschreibgebuehr, Ausweis-Hinweis und "Mitglied wirst du ..." sind
            auf Wunsch des Vorstands (15.10.2026) von der Seite. Die Gebuehr
            steht in den Bedingungen und in der Beitrittserklaerung. */}
      </div>
    </section>
  );
}
