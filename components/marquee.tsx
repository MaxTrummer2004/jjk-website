import { marquee } from "@/lib/config";

/**
 * The band directly under the hero. A hard-edged strip of the deepest
 * background colour so it reads as a cut between the title card and the page,
 * with a hot hairline on both edges and a kanji as the separator glyph.
 */
export function Marquee() {
  const items = [...marquee, ...marquee];
  return (
    <section
      aria-hidden="true"
      className="relative overflow-hidden bg-background-deep py-5 sm:py-6"
    >
      <div className="jjk-rule absolute inset-x-0 top-0" />
      <div className="jjk-rule absolute inset-x-0 bottom-0" />

      <div className="marquee-mask flex overflow-hidden">
        <div className="animate-marquee flex shrink-0 items-center whitespace-nowrap">
          {items.map((item, i) => (
            <span key={i} className="flex items-center">
              <span className="font-display px-6 text-2xl uppercase tracking-wide text-foreground/70 sm:text-3xl">
                {item}
              </span>
              <span className="font-jp text-lg text-accent/80">柔</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
