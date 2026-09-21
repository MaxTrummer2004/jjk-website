"use client";

/**
 * StreetMap — die Nachbarschaft des Gyms, gezeichnet und angezuendet.
 *
 * ── Warum keine Karten-Kachel ───────────────────────────────────────────────
 * Weil eine Kachel von Mapbox oder Google aussieht wie Mapbox oder Google. Die
 * Seite ist Tusche auf Schwarz mit einer Glut darin; eine fremde Karte mitten
 * drin ist ein Fenster in eine andere Software. Dazu kaeme ein Token, ein
 * Drittanbieter-Aufruf bei jedem Seitenaufruf und ein Eintrag mehr in der
 * Datenschutzerklaerung.
 *
 * Stattdessen liegen die echten Strassen als Zahlen im Repo:
 * public/data/graz-streets.json, einmalig aus OpenStreetMap geholt (950 m um
 * Kasernstrasse 4), auf Stuetzpunkte eingedampft und in Meter relativ zum Gym
 * umgerechnet. Zur Laufzeit wird nichts nachgeladen ausser dieser einen Datei.
 *
 * ── Was passiert ────────────────────────────────────────────────────────────
 * Die Karte liegt kalt da: ein schwacher Abdruck aus Fusswegen und Gleisen,
 * darueber das Strassennetz in einem Grau, das man gerade so sieht. Mit dem
 * Scrollen laeuft eine Front vom Gym nach aussen, und was sie erreicht,
 * brennt — entlang der Strassen, nicht als Kreis ueber sie hinweg. In der
 * Mitte bleibt die Glut am hellsten, am Rand kippt sie nach Zinnober.
 *
 * Das ist derselbe Gedanke wie im Hero (etwas entzuendet sich und breitet sich
 * aus), nur dass hier die Form, die es annimmt, eine Ortsangabe ist: wer das
 * sieht, hat die Adresse gelesen, ohne sie zu lesen.
 *
 * ── Wie es gezeichnet wird ──────────────────────────────────────────────────
 * Zwei Ebenen, aus einem Grund. Fusswege und Gleise sind zusammen rund 2200
 * Linien; die jeden Frame neu zu stroken waere Verschwendung, denn sie
 * bewegen sich nie. Sie werden einmal auf eine Offscreen-Flaeche gezeichnet
 * und danach als fertiges Bild kopiert. Animiert werden nur die knapp 400
 * Linien, die tatsaechlich brennen.
 *
 * Canvas 2D, nicht WebGL: bei dieser Menge ist das schneller fertig als ein
 * Shader-Kontext hochzufahren, und die Seite hat ohnehin genug davon gehabt.
 */

import { useEffect, useRef, type ReactNode } from "react";
import type { MotionValue } from "motion/react";

interface Raw {
  center: [number, number];
  radius: number;
  address: string;
  attribution: string;
  layers: Record<string, number[][]>;
  labels: { n: string; x: number; y: number }[];
}

/** Eine Linie, fertig fuer den Zeichner: Punkte und ihr Abstand zum Gym. */
interface Line {
  p: Float32Array;
  /** Abstand jedes Punktes vom Gym, in Metern. */
  d: Float32Array;
}

const COLD = "rgba(243, 239, 233, 0.085)";
const FAINT = "rgba(243, 239, 233, 0.042)";
const WATER = "rgba(96, 126, 158, 0.3)";

/** Die Glut nach aussen: heiss am Gym, Zinnober am Rand. */
function fire(t: number, alpha: number): string {
  const stops: [number, number, number][] = [
    [255, 200, 130],
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
    let water: Line[] = [];
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
        for (let i = 0; i < d.length; i++) {
          d[i] = Math.hypot(p[i * 2]!, p[i * 2 + 1]!);
        }
        return { p, d };
      });

    /** Fusswege und Gleise: einmal zeichnen, danach nur noch kopieren. */
    const bakeBackdrop = (): void => {
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
        g.strokeStyle = color;
        g.lineWidth = width;
        g.beginPath();
        for (const ln of lines) {
          const p = ln.p;
          g.moveTo(p[0]! * scale, p[1]! * scale);
          for (let i = 1; i < p.length / 2; i++) {
            g.lineTo(p[i * 2]! * scale, p[i * 2 + 1]! * scale);
          }
        }
        g.stroke();
      };

      paint(toLines(data.layers.path), FAINT, 0.6);
      paint(toLines(data.layers.rail), "rgba(243, 239, 233, 0.07)", 0.9);
      backdrop = c;
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
      // Der Radius der Daten soll die kurze Seite gerade fuellen; etwas
      // darueber hinaus, damit die Ecken nicht leer laufen.
      scale = (Math.max(w, h) / 2 / (data?.radius ?? 950)) * 1.32;
      bakeBackdrop();
      shown = -1;
    };

    /**
     * Eine Linie bis zur Front. Der Abschnitt, in dem die Front gerade steht,
     * wird anteilig interpoliert — sonst springt jede Strasse in ganzen
     * Stuecken an statt zu wachsen.
     */
    const strokeTo = (ln: Line, front: number): void => {
      const { p, d } = ln;
      const n = d.length;
      if (d[0]! > front && d[n - 1]! > front) {
        let any = false;
        for (let i = 0; i < n; i++) if (d[i]! <= front) { any = true; break; }
        if (!any) return;
      }
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
      if (Math.abs(eased - shown) < 0.0015) return;
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
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      for (const ln of hot) {
        const p = ln.p;
        ctx.moveTo(p[0]! * scale, p[1]! * scale);
        for (let i = 1; i < p.length / 2; i++) ctx.lineTo(p[i * 2]! * scale, p[i * 2 + 1]! * scale);
      }
      ctx.stroke();

      ctx.strokeStyle = WATER;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      for (const ln of water) {
        const p = ln.p;
        ctx.moveTo(p[0]! * scale, p[1]! * scale);
        for (let i = 1; i < p.length / 2; i++) ctx.lineTo(p[i * 2]! * scale, p[i * 2 + 1]! * scale);
      }
      ctx.stroke();

      // Heiss: in Ringen, damit die Farbe nach aussen kippt, ohne pro Linie
      // den Zeichenzustand zu wechseln.
      const reach = (data.radius + 60) * eased;
      const RINGS = 7;
      for (let r = 0; r < RINGS; r++) {
        const inner = (reach * r) / RINGS;
        const outer = (reach * (r + 1)) / RINGS;
        if (outer <= 0) continue;
        const t = data.radius > 0 ? outer / data.radius : 0;
        ctx.strokeStyle = fire(t, 0.92);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (const ln of hot) {
          if (ln.d[0]! > outer && ln.d[ln.d.length - 1]! > outer) {
            let touches = false;
            for (let i = 0; i < ln.d.length; i++) {
              if (ln.d[i]! <= outer) { touches = true; break; }
            }
            if (!touches) continue;
          }
          strokeTo({ p: ln.p, d: ln.d }, outer);
        }
        ctx.save();
        ctx.beginPath();
        ctx.arc(0, 0, outer * scale, 0, Math.PI * 2);
        if (inner > 0) {
          ctx.arc(0, 0, inner * scale, 0, Math.PI * 2, true);
        }
        ctx.clip("evenodd");
        ctx.stroke();
        ctx.restore();
      }

      // Die Glut um die Front herum.
      if (eased > 0 && eased < 1) {
        const rr = reach * scale;
        const g = ctx.createRadialGradient(0, 0, Math.max(0, rr - 40), 0, 0, rr + 40);
        g.addColorStop(0, "rgba(255, 106, 31, 0)");
        g.addColorStop(0.6, "rgba(255, 106, 31, 0.09)");
        g.addColorStop(1, "rgba(255, 106, 31, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(0, 0, rr + 40, 0, Math.PI * 2);
        ctx.fill();
      }

      // Das Gym.
      const pulse = 0.6 + 0.4 * eased;
      ctx.strokeStyle = `rgba(255, 177, 74, ${0.35 + 0.5 * eased})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 24 + 10 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 106, 31, ${0.2 * eased})`;
      ctx.stroke();
      ctx.fillStyle = `rgba(255, 200, 130, ${0.55 + 0.45 * eased})`;
      ctx.beginPath();
      ctx.arc(0, 0, 4.2, 0, Math.PI * 2);
      ctx.fill();
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
        ];
        water = toLines(json.layers.water);
        layout();
        tick();
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
    </div>
  );
}

export default StreetMap;
