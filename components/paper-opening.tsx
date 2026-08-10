"use client";

/**
 * PaperOpening — ein Blatt Papier, in das die vier Zeichen geschnitten sind.
 *
 * ── Was der Leser sieht ─────────────────────────────────────────────────────
 * Die Seite öffnet auf nacktem Papier: formatfüllend, dunkel, keine Malerei
 * darauf. Faser, Stockflecken, die Knicke vom Aufgerolltsein. In das Blatt sind
 * 柔術廻戦 GESCHNITTEN — nicht gedruckt und nicht geprägt, eine Kerbe mit einer
 * nahen und einer fernen Wand, die von einem einzigen streifenden Licht so
 * getroffen wird, dass die zugewandte Wand schwarz bleibt und die abgewandte
 * einen Rest fängt. Man liest die Schrift deshalb zuerst gar nicht als Schrift,
 * sondern als Vertiefung; erst nach zwei Sekunden kippt es.
 *
 * Dann scrollt er, und das ist die ganze Bedienung — kein Klick, kein Tor, und
 * die Seite hält den Scroll an keiner Stelle fest. Vier Bewegungen:
 *
 *   1  Der Grund jeder Kerbe wird warm. Nicht Flamme, Glut, und zuerst nur an
 *      den dicksten Stellen — Kreuzungen, Ecken, Pinselansätze.
 *   2  Die Glut steigt im Kanal hoch und füllt ihn.
 *   3  Sie tritt über die Kante und beleuchtet das Papier. Erst JETZT sieht man
 *      die Faser: das Blatt war die ganze Zeit da, sichtbar wird es durch die
 *      Schrift.
 *   4  Der Raum sinkt weg, das Licht zieht sich auf ein Nest zusammen — und in
 *      demselben Zug öffnet die Fackel sich aus dem Zeiger. Es ist keine zweite
 *      Lichtquelle: die Fackel übernimmt eine, die schon brennt.
 *
 * ── Warum das die Naht zur Wand schließt ────────────────────────────────────
 * Die alte Eröffnung endete auf einem Bild, das ausging, und übergab an eine
 * Wand, die man mit dem Zeiger abtastet. Zwischen beiden lag ein gehaltener
 * Scroll, ein Klick-Tor und eine Zeitschaltung, damit die Zustände sich trafen.
 * Hier gibt es nichts zu treffen: der letzte Zustand dieser Sektion IST der
 * erste der Wand — fast schwarz, ein warmer Fleck am Zeiger. Niemand merkt,
 * wann die eine aufhört. Deshalb hat sie keinen Ausgang, sondern nur ein Ende.
 *
 * ── Wie es rechnet ──────────────────────────────────────────────────────────
 * Ein ScrollTrigger, ein Fortschrittswert, sieben CSS-Variablen. Kein React-
 * State pro Bild und keine Animation, die selbst läuft: alles, was sich
 * bewegt, ist eine Funktion der Scrollposition, und ein Leser, der zurück-
 * scrollt, sieht das Blatt wieder kalt werden. Die Kurven stehen unten in
 * `apply` als Zahlenpaare, nicht in der Stylesheet — dort wäre jede Änderung
 * eine Suche über 4000 Zeilen.
 *
 * ── Die drei Platten ────────────────────────────────────────────────────────
 *   paper-cold-*.webp    das Blatt und die Kerbe. Ändert sich nie.
 *   paper-glow-*.webp    die Glut IM Kanal.
 *   paper-spill-*.webp   was ihr Licht auf dem Papier anrichtet.
 *
 * Zwei Layouts, weil vier Zeichen nebeneinander in einem Hochformat
 * briefmarkengroß wären: `wide` in einer Reihe, `tall` als Block 2×2. Die Wahl
 * trifft `<picture>` über eine Media-Query auf das Seitenverhältnis, nicht
 * JavaScript — sonst wäre die erste Platte erst nach der Hydration bekannt.
 * Alle drei Platten haben pro Layout dieselbe Geometrie; ein Pixel Versatz
 * liest sich als Licht, das neben seiner Quelle sitzt.
 *
 * Erzeugt von scripts/gen-paper.py. Quelle ist der leere Anfang derselben
 * Sanjō-Rolle, aus der auch die Wand und die vier Tafeln kommen.
 */

import { useEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { setOpeningDone } from "@/lib/opening";
import { useReducedMotion } from "@/lib/motion";
import { siteConfig } from "@/lib/config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/** Ein Abschnitt des Fortschritts, auf 0…1 normiert und weich an den Enden. */
function seg(p: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Wie weit die Fackel offen ist, wenn sie dem Leser übergeben wird. */
const HANDOVER = 0.66;

export function PaperOpening(): ReactNode {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const handed = useRef<boolean>(false);

  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    // Unter reduzierter Bewegung ist die Sektion schlicht das Blatt mit
    // glühender Schrift — kein Ablauf, keine Übergabe, und die Fackel gehört
    // von der ersten Sekunde an dem Leser.
    if (reduced) {
      stage.style.setProperty("--ember", "1");
      stage.style.setProperty("--fill", "130%");
      stage.style.setProperty("--spill", "0.8");
      stage.style.setProperty("--night", "0");
      stage.style.setProperty("--converge", "1.4");
      stage.style.setProperty("--cue", "1");
      setOpeningDone(true);
      return;
    }

    setOpeningDone(false);
    handed.current = false;

    // Die Fackel wird in den Koordinaten der WallLight geführt, weil ein Pool,
    // der über eine Sektionsgrenze läuft, von beiden Seiten gezeichnet und
    // zusammengesetzt wird (components/lit-wall.tsx). Jede Sektion zieht dafür
    // ihren eigenen Abstand zur Wandoberkante ab — und diese Bühne KLEBT, ihr
    // Abstand wächst also mit jedem gescrollten Pixel. Ohne die Zeile unten
    // wandert die Fackel beim Scrollen aus dem Bild.
    const wall = root.closest<HTMLElement>(".jjk-wall-light");

    const apply = (p: number): void => {
      // ── Die vier Bewegungen ───────────────────────────────────────────────
      // Sie überlappen absichtlich. Eine Bewegung, die endet, bevor die
      // nächste beginnt, liest sich als vier Ereignisse; überlappend liest sie
      // sich als eines, das seinen Ort wechselt.
      const ember = 0.42 * seg(p, 0.05, 0.28) + 0.58 * seg(p, 0.24, 0.5);
      // Von unterhalb der Zeichenzone bis über sie hinaus. Die Maske ist ein
      // Verlauf von unten; 38 % ist die Unterkante der Glyphen im Bild.
      const fill = 34 + 96 * seg(p, 0.06, 0.46);
      const spill = seg(p, 0.4, 0.72);
      const night = seg(p, 0.58, 0.9);
      // Der Raum zieht sich um das letzte Nest zusammen. 1.5 ist weiter als
      // die Bildecke, 0.26 ist ein Fleck.
      const converge = 1.5 - 1.24 * seg(p, 0.72, 1);
      const rest = 1 - 0.55 * seg(p, 0.82, 1);
      // Die Fackel wächst aus einem Punkt, während der Raum dunkel wird —
      // dieselbe Kurve, gegenläufig. `--pool-open` ist registriert (siehe
      // globals.css), sonst würde sie in voller Größe erscheinen.
      const pool = seg(p, HANDOVER, 0.94);
      // Der Hinweis nach unten verschwindet, sobald der Leser ihn befolgt hat.
      const cue = 1 - seg(p, 0.02, 0.12);

      const s = stage.style;
      s.setProperty(
        "--sec-y",
        (stage.getBoundingClientRect().top -
          (wall ? wall.getBoundingClientRect().top : 0)).toFixed(1) + "px",
      );
      s.setProperty("--ember", (ember * rest).toFixed(3));
      s.setProperty("--fill", fill.toFixed(1) + "%");
      s.setProperty("--spill", (spill * rest).toFixed(3));
      s.setProperty("--night", night.toFixed(3));
      s.setProperty("--converge", converge.toFixed(3));
      s.setProperty("--pool-open", pool.toFixed(3));
      s.setProperty("--cue", cue.toFixed(3));
      s.setProperty("--torch-on", p >= HANDOVER ? "1" : "0");

      // Die Rauchfahne am Zeiger übernimmt genau dann, wenn die Fackel aufgeht
      // — siehe lib/opening.ts. Ein Flag, kein Vergleich pro Bild: sonst
      // schreibt jeder Frame denselben Wert in einen Store mit Listenern.
      const open = p >= HANDOVER;
      if (open !== handed.current) {
        handed.current = open;
        setOpeningDone(open);
      }
    };

    apply(0);

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => apply(self.progress),
    });

    return () => {
      trigger.kill();
      setOpeningDone(true);
    };
  }, [reduced]);

  return (
    <section
      ref={rootRef}
      className="jjk-paper"
      aria-label={siteConfig.fullName}
    >
      <div ref={stageRef} className="jjk-paper-stage">
        {/* Die kalte Platte. `fetchPriority="high"`, weil sie das erste Bild
            der Seite ist und alles andere darauf wartet; die beiden Licht-
            platten dürfen nachkommen, sie werden erst gebraucht, wenn der
            Leser scrollt. */}
        <picture>
          <source media="(max-aspect-ratio: 0.95)" srcSet="/img/paper-cold-tall.webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="jjk-paper-plate jjk-paper-cold"
            src="/img/paper-cold-wide.webp"
            alt=""
            fetchPriority="high"
            decoding="async"
            draggable={false}
          />
        </picture>

        {/* Die Nacht und die Fackel darin. Dieselben zwei Elemente wie an der
            Wand darunter — components/lit-wall.tsx —, mit demselben Zeiger und
            demselben Radius aus derselben WallLight. Zwei Beleuchtungen, die
            gleich aussehen sollen, driften; deshalb gibt es nur eine. */}
        <div className="jjk-veil jjk-paper-veil" aria-hidden="true" />
        <div className="jjk-candle jjk-paper-candle" aria-hidden="true" />

        {/* Glut und Ausstrahlung liegen ÜBER der Nacht, nicht darunter: am
            Ende soll der Raum dunkel sein und das letzte Nest trotzdem
            brennen. Läge der Schleier darüber, ginge mit dem Raum auch das
            Feuer aus, und die Fackel hätte nichts zu übernehmen. */}
        <div className="jjk-paper-fire" aria-hidden="true">
          <picture>
            <source media="(max-aspect-ratio: 0.95)" srcSet="/img/paper-glow-tall.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="jjk-paper-plate jjk-paper-glow"
              src="/img/paper-glow-wide.webp"
              alt=""
              decoding="async"
              draggable={false}
            />
          </picture>
          <picture>
            <source media="(max-aspect-ratio: 0.95)" srcSet="/img/paper-spill-tall.webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="jjk-paper-plate jjk-paper-spill"
              src="/img/paper-spill-wide.webp"
              alt=""
              decoding="async"
              draggable={false}
            />
          </picture>
        </div>

        <h1 className="sr-only">
          {siteConfig.fullName} — Brazilian Jiu-Jitsu in Graz
        </h1>

        {/* Das Wenige, was neben der Gravur stehen darf. Klein, an den Rand
            gesetzt und mit dem Raum verblassend: die Zeichen sind das
            Ereignis, das hier ist die Bildunterschrift. */}
        <div className="jjk-paper-mark" aria-hidden="true">
          <span className="jjk-paper-kana" lang="ja">
            じゅうじゅつかいせん
          </span>
          <span className="jjk-paper-name">
            {siteConfig.fullName.toUpperCase()} · GRAZ
          </span>
        </div>

        <div className="jjk-paper-cue" aria-hidden="true">
          <span className="jjk-paper-cue-jp" lang="ja">
            さきへ
          </span>
          <span className="jjk-paper-cue-en">SCROLL</span>
          <span className="jjk-paper-cue-arrow" />
        </div>
      </div>
    </section>
  );
}

export default PaperOpening;
