"use client";

/**
 * StreetMap — die Gegend um das Gym, gezeichnet, angezuendet und beschriftet.
 *
 * ── Warum keine Karten-Kachel ───────────────────────────────────────────────
 * Weil eine Kachel von Mapbox oder Google aussieht wie Mapbox oder Google. Die
 * Seite ist Tusche auf Schwarz mit einer Glut darin; eine fremde Karte mitten
 * drin ist ein Fenster in andere Software. Dazu kaemen ein Token, ein
 * Drittanbieter-Aufruf bei jedem Seitenaufruf und ein Eintrag mehr in der
 * Datenschutzerklaerung.
 *
 * Stattdessen liegen die echten Strassen als Zahlen im Repo:
 * public/data/graz-streets.json, einmalig aus OpenStreetMap geholt und in
 * Meter relativ zum Gym umgerechnet. Zur Laufzeit wird nichts nachgeladen
 * ausser dieser einen Datei.
 *
 * ── Zwei Radien, aus einem Grund ────────────────────────────────────────────
 * Bis 1 km liegt das volle Netz bis hinunter zu Fusswegen: das ist die
 * Nachbarschaft, in der jemand zu Fuss steht. Darueber hinaus bis 3,15 km nur
 * noch die grossen Achsen, Bahn und die Mur — genug, um Graz zu erkennen, und
 * nicht so viel, dass die Datei dick wird. Das ist auch der Grund fuer den
 * weiten Ausschnitt ueberhaupt: eine Karte ohne Wahrzeichen sagt niemandem,
 * WO das ist.
 *
 * ── Was passiert ────────────────────────────────────────────────────────────
 * Die Karte liegt kalt da. Mit dem Scrollen laeuft eine Front vom Gym nach
 * aussen, und was sie erreicht, brennt — entlang der Strassen, nicht als Kreis
 * ueber sie hinweg. UND: erreicht die Front ein Wahrzeichen, faellt dessen
 * Beschriftung von oben ins Bild. Ostbahnhof nach 400 m, Messe nach 700,
 * Jakominiplatz nach 1,5 km, Hauptplatz nach 2, Hauptbahnhof nach 2,9.
 *
 * Die beiden Dinge haengen damit zusammen, statt nebeneinanderher zu laufen:
 * das Feuer ist nicht Dekoration, es ist das, was die Stadt aufdeckt.
 *
 * ── Wie es gezeichnet wird ──────────────────────────────────────────────────
 * Fusswege, Gleise und Wasser bewegen sich nie — die werden einmal auf eine
 * Offscreen-Flaeche gebacken und danach als fertiges Bild kopiert. Animiert
 * werden nur die Linien, die brennen koennen. Die Glut laeuft in Ringen, damit
 * die Farbe nach aussen kippen kann, ohne pro Linie den Zeichenzustand zu
 * wechseln. Canvas 2D statt WebGL: bei dieser Menge schneller fertig, als ein
 * Shader-Kontext hochzufahren.
 *
 * Die Beschriftungen sind echtes DOM, kein Canvas-Text: scharf auf jedem
 * Bildschirm, vorlesbar, und sie kosten pro Bild nur das Schreiben von zwei
 * Style-Eigenschaften.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MotionValue } from "motion/react";

interface Mark {
  n: string;
  x: number;
  y: number;
  d: number;
  s: "left" | "right";
  sub: string;
}

interface Raw {
  center: [number, number];
  inner: number;
  radius: number;
  address: string;
  attribution: string;
  layers: Record<string, number[][]>;
  marks: Mark[];
}

interface Line {
  p: Float32Array;
  d: Float32Array;
  /** kleinster und groesster Abstand der Linie zum Gym, fuer den Schnelltest */
  lo: number;
  hi: number;
}

const COLD = "rgba(243, 239, 233, 0.075)";
const FAINT = "rgba(243, 239, 233, 0.04)";
const RAILC = "rgba(243, 239, 233, 0.055)";
const WATER = "rgba(96, 126, 158, 0.26)";

/** Die Glut nach aussen: heiss am Gym, Zinnober am Rand. */
function fire(t: number, alpha: number): string {
  const stops: [number, number, number][] = [
    [255, 205, 140],
    [255, 177, 74],
    [255, 106, 31],
    [211, 32, 42],
  ];
  const u = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
  const i = Math.min(Math.floor(u), stops.length - 2);
  const f = u - i;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  const c = a.map((v, k) => Math.round(v + (b[k]! - v) * f));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

function km(m: number): string {
  return m < 950
    ? `${Math.round(m / 10) * 10} m`
    : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export function StreetMap({
  progress,
  from = 0.55,
  className = "",
}: {
  /** 0–1 ueber die gepinnte Strecke. */
  progress: MotionValue<number>;
  /** Ab welchem Fortschritt die Front losgeht. */
  from?: number;
  className?: string;
}): ReactNode {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [marks, setMarks] = useState<Mark[]>([]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let dead = false;
    let raf = 0;
    let data: Raw | null = null;
    let hot: Line[] = [];
    let backdrop: HTMLCanvasElement | null = null;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let scale = 1;
    let shown = -1;

    const toLines = (arrs: number[][] | undefined): Line[] =>
      (arrs ?? []).map((flat) => {
        const p = new Float32Array(flat);
        const d = new Float32Array(p.length / 2);
        let lo = Infinity;
        let hi = 0;
        for (let i = 0; i < d.length; i++) {
          const v = Math.hypot(p[i * 2]!, p[i * 2 + 1]!);
          d[i] = v;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        return { p, d, lo, hi };
      });

    const path = (lines: Line[], g: CanvasRenderingContext2D): void => {
      for (const ln of lines) {
        const p = ln.p;
        g.moveTo(p[0]! * scale, p[1]! * scale);
        for (let i = 1; i < p.length / 2; i++) {
          g.lineTo(p[i * 2]! * scale, p[i * 2 + 1]! * scale);
        }
      }
    };

    /** Was sich nie bewegt: einmal zeichnen, danach nur noch kopieren. */
    const bake = (): void => {
      if (!data) return;
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(h * dpr));
      const g = c.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.translate(w / 2, h / 2);
      g.lineCap = "round";
      g.lineJoin = "round";

      const paint = (lines: Line[], color: string, width: number): void => {
        if (!lines.length) return;
        g.strokeStyle = color;
        g.lineWidth = width;
        g.beginPath();
        path(lines, g);
        g.stroke();
      };

      paint(toLines(data.layers.path), FAINT, 0.6);
      paint(toLines(data.layers.farrail), RAILC, 0.7);
      paint(toLines(data.layers.rail), RAILC, 0.9);
      paint(toLines(data.layers.farwater), WATER, 1.8);
      paint(toLines(data.layers.water), WATER, 2.4);
      backdrop = c;
    };

    const place = (): void => {
      if (!data) return;
      for (let i = 0; i < data.marks.length; i++) {
        const el = markRefs.current[i];
        const m = data.marks[i]!;
        if (!el) continue;
        el.style.left = `${w / 2 + m.x * scale}px`;
        el.style.top = `${h / 2 + m.y * scale}px`;
      }
    };

    const layout = (): void => {
      const r = wrap.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      // Der volle Radius soll auf die KURZE Seite passen. Dass links und
      // rechts etwas frei bleibt, ist gewollt: die Daten enden ohnehin als
      // Kreis, und eine runde Platte ist ein Bild, ein angeschnittenes
      // Rechteck waere ein Ausschnitt.
      scale = (Math.min(w, h) / 2 / (data?.radius ?? 3150)) * 0.98;
      bake();
      place();
      shown = -1;
    };

    /**
     * Eine Linie bis zur Front. Der Abschnitt, in dem die Front gerade steht,
     * wird anteilig interpoliert — sonst springt jede Strasse in ganzen
     * Stuecken an, statt zu wachsen.
     */
    const strokeTo = (ln: Line, front: number): void => {
      const { p, d } = ln;
      const n = d.length;
      let open = false;
      for (let i = 0; i < n - 1; i++) {
        const a = d[i]!;
        const b = d[i + 1]!;
        const ax = p[i * 2]! * scale;
        const ay = p[i * 2 + 1]! * scale;
        const bx = p[i * 2 + 2]! * scale;
        const by = p[i * 2 + 3]! * scale;
        if (a <= front && b <= front) {
          if (!open) { ctx.moveTo(ax, ay); open = true; }
          ctx.lineTo(bx, by);
        } else if (a <= front) {
          const t = (front - a) / (b - a || 1);
          if (!open) { ctx.moveTo(ax, ay); open = true; }
          ctx.lineTo(ax + (bx - ax) * t, ay + (by - ay) * t);
          open = false;
        } else if (b <= front) {
          const t = (a - front) / (a - b || 1);
          ctx.moveTo(ax + (bx - ax) * t, ay + (by - ay) * t);
          ctx.lineTo(bx, by);
          open = true;
        } else {
          open = false;
        }
      }
    };

    const draw = (v: number): void => {
      if (!data) return;
      const eased = Math.min(Math.max((v - from) / (1 - from), 0), 1);
      if (Math.abs(eased - shown) < 0.0012) return;
      shown = eased;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#07070a";
      ctx.fillRect(0, 0, w, h);
      if (backdrop) ctx.drawImage(backdrop, 0, 0, w, h);

      ctx.translate(w / 2, h / 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Kalt: das ganze Netz, damit die Front etwas hat, worauf sie laeuft.
      ctx.strokeStyle = COLD;
      ctx.lineWidth = 1;
      ctx.beginPath();
      path(hot, ctx);
      ctx.stroke();

      // Heiss, in Ringen — die Farbe kippt nach aussen, ohne dass pro Linie
      // der Zeichenzustand gewechselt werden muss.
      const reach = data.radius * eased;
      const RINGS = 8;
      for (let r = 0; r < RINGS; r++) {
        const inner = (reach * r) / RINGS;
        const outer = (reach * (r + 1)) / RINGS;
        if (outer <= 0) continue;
        ctx.strokeStyle = fire(outer / data.radius, 0.92);
        ctx.lineWidth = outer < data.inner ? 1.4 : 1.1;
        ctx.beginPath();
        for (const ln of hot) {
          if (ln.lo > outer || ln.hi < inner) continue;
          strokeTo(ln, outer);
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, outer * scale, 0, Math.PI * 2);
        if (inner > 0) ctx.arc(0, 0, inner * scale, 0, Math.PI * 2, true);
        ctx.clip("evenodd");
        ctx.stroke();
        ctx.restore();
      }

      // Die Glut um die Front herum.
      if (eased > 0.01 && eased < 0.999) {
        const rr = reach * scale;
        const g = ctx.createRadialGradient(0, 0, Math.max(0, rr - 46), 0, 0, rr + 46);
        g.addColorStop(0, "rgba(255, 106, 31, 0)");
        g.addColorStop(0.6, "rgba(255, 106, 31, 0.085)");
        g.addColorStop(1, "rgba(255, 106, 31, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rr + 46, 0, Math.PI * 2);
        ctx.fill();
      }

      // Das Gym.
      ctx.strokeStyle = `rgba(255, 177, 74, ${0.35 + 0.5 * eased})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255, 106, 31, ${0.22 * eased})`;
      ctx.beginPath();
      ctx.arc(0, 0, 22 + 12 * eased, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 205, 140, ${0.55 + 0.45 * eased})`;
      ctx.beginPath();
      ctx.arc(0, 0, 3.8, 0, Math.PI * 2);
      ctx.fill();

      // Die Wahrzeichen: jedes faellt von oben ins Bild, sobald die Front es
      // erreicht hat. Direkt auf den Stil geschrieben statt ueber React —
      // pro Bild sind das zwei Eigenschaften, ein Re-Render waere das
      // Hundertfache.
      for (let i = 0; i < data.marks.length; i++) {
        const el = markRefs.current[i];
        if (!el) continue;
        const m = data.marks[i]!;
        const t = Math.min(Math.max((reach - m.d) / 260, 0), 1);
        const e = 1 - Math.pow(1 - t, 3);
        el.style.opacity = `${e}`;
        el.style.transform = `translate(-50%, -50%) translateY(${(1 - e) * -26}px)`;
      }
    };

    const tick = (): void => {
      if (dead) return;
      draw(progress.get());
      raf = requestAnimationFrame(tick);
    };

    void fetch("/data/graz-streets.json")
      .then((r) => r.json() as Promise<Raw>)
      .then((json) => {
        if (dead) return;
        data = json;
        hot = [
          ...toLines(json.layers.major),
          ...toLines(json.layers.mid),
          ...toLines(json.layers.minor),
          ...toLines(json.layers.far),
        ];
        setMarks(json.marks);
        // Ein Bild warten, damit die Beschriftungen im DOM stehen, bevor sie
        // positioniert werden.
        requestAnimationFrame(() => {
          if (dead) return;
          layout();
          tick();
        });
      })
      .catch(() => {
        // Ohne Daten bleibt die Flaeche schwarz; die Adresse darueber steht
        // als echter Text im Markup und ist davon nicht betroffen.
      });

    const ro = new ResizeObserver(() => layout());
    ro.observe(wrap);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [progress, from]);

  return (
    <div ref={wrapRef} className={`relative h-full w-full ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />

      {marks.map((m, i) => (
        <div
          key={m.n}
          ref={(el) => { markRefs.current[i] = el; }}
          className="pointer-events-none absolute flex items-center gap-2"
          style={{ opacity: 0, transform: "translate(-50%, -50%)", flexDirection: m.s === "left" ? "row-reverse" : "row" }}
        >
          <span
            aria-hidden="true"
            className="block size-[7px] shrink-0 rounded-full"
            style={{ background: "rgba(255,177,74,0.85)", boxShadow: "0 0 0 3px rgba(255,106,31,0.16)" }}
          />
          <span className={`flex flex-col leading-tight ${m.s === "left" ? "items-end text-right" : "items-start text-left"}`}>
            <span className="text-[0.72rem] font-semibold whitespace-nowrap text-foreground/90">
              {m.n}
            </span>
            <span className="font-mono text-[0.56rem] tracking-wide whitespace-nowrap text-foreground/40">
              {km(m.d)}
              {m.sub ? ` · ${m.sub}` : ""}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

export default StreetMap;
