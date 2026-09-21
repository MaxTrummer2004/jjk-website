"use client";

/**
 * StreetMap — die Gegend um das Gym: herauszoomen, und was sichtbar wird, brennt.
 *
 * ── Warum keine Karten-Kachel ───────────────────────────────────────────────
 * Weil eine Kachel von Mapbox oder Google aussieht wie Mapbox oder Google. Die
 * Seite ist Tusche auf Schwarz mit einer Glut darin; eine fremde Karte mitten
 * drin ist ein Fenster in andere Software. Dazu kaemen ein Token, ein
 * Drittanbieter-Aufruf bei jedem Seitenaufruf und ein Eintrag mehr in der
 * Datenschutzerklaerung.
 *
 * Die echten Strassen liegen als Zahlen im Repo, einmalig aus OpenStreetMap
 * geholt: bis 1 km das volle Netz bis hinunter zu Fusswegen, darueber bis
 * 3,15 km nur noch grosse Achsen, Bahn und die Mur.
 *
 * ── Eine Bewegung, nicht drei ───────────────────────────────────────────────
 * Vorher liefen Zoom, Feuer und Beschriftungen als getrennte Zeitachsen
 * nebeneinanderher, und der Zusammenhang war keiner. Jetzt ist es EINE Groesse:
 * `view`, der sichtbare Radius. Er geht von 320 m (man steht vor der Tuer) auf
 * 3150 m (man sieht Graz). Alles haengt daran —
 *
 *   der Massstab, also der Zoom;
 *   die Faerbung, denn die Glut wird ueber `view` normiert: das Gym bleibt der
 *     heisseste Punkt, egal wie weit man draussen ist, und der Rand kippt nach
 *     Zinnober. Beim Herauszoomen kuehlt also alles nach aussen weg, was gerade
 *     noch heiss war — die Stadt waechst aus dem Gym heraus;
 *   und die Wahrzeichen, die einfallen, sobald der Ausschnitt sie erreicht.
 *
 * ── Was hier mal falsch war ─────────────────────────────────────────────────
 * Die Faerbung lief ueber `ctx.clip()` in Ringen, und dazwischen stand ein
 * `ctx.beginPath()` fuer die Maske. Das LOESCHT den gerade gebauten
 * Strassenpfad, also wurde am Ende die Maske selbst gestrichen: sichtbar als
 * saubere konzentrische Kreise und fast keine Strassen. Jetzt gibt es keine
 * Maske mehr — `strokeBand` gibt von vornherein nur die Stuecke aus, die in
 * den jeweiligen Abstandsring fallen, und schneidet an beiden Grenzen
 * anteilig ab.
 *
 * ── Warum Gebaeudeumrisse ───────────────────────────────────────────────────
 * Ein Punkt neben "Uhrturm" ist eine Behauptung; der Grundriss des Uhrturms
 * ist eine Auskunft. Die sieben Umrisse kommen aus OSM (das Stadion, die
 * Bahnhofshalle, der Hauptplatz als Platzflaeche) und werden auf eine
 * Einheitsbox normiert — gezeichnet werden sie in FESTER Pixelgroesse, nicht
 * im Kartenmassstab: der Uhrturm hat 1186 m2 und waere sonst zwei Pixel.
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
  /** Gebaeudeumriss, auf eine Einheitsbox normiert. */
  o?: number[];
}

interface Raw {
  inner: number;
  radius: number;
  layers: Record<string, number[][]>;
  marks: Mark[];
}

interface Line {
  p: Float32Array;
  d: Float32Array;
  lo: number;
  hi: number;
}

const NEAR = 320;
const COLD = "rgba(243, 239, 233, 0.07)";
const FAINT = "rgba(243, 239, 233, 0.038)";
const RAILC = "rgba(243, 239, 233, 0.05)";
const WATER = "rgba(96, 126, 158, 0.24)";
const ICON = 30;

/** Die Glut: heiss am Gym, Zinnober am Rand des Ausschnitts. */
function fire(t: number, alpha: number): string {
  const stops: [number, number, number][] = [
    [255, 214, 158],
    [255, 177, 74],
    [255, 106, 31],
    [205, 34, 44],
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
  return m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`;
}

export function StreetMap({
  progress,
  from = 0.55,
  className = "",
}: {
  progress: MotionValue<number>;
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
    let cold: { lines: Line[]; color: string; width: number }[] = [];
    let w = 0;
    let h = 0;
    let dpr = 1;
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

    const layout = (): void => {
      const r = wrap.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width));
      h = Math.max(1, Math.round(r.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      shown = -1;
    };

    /** Nur die Stuecke einer Linie, die zwischen `inner` und `outer` liegen. */
    const strokeBand = (ln: Line, inner: number, outer: number, s: number): void => {
      const { p, d } = ln;
      for (let i = 0; i < d.length - 1; i++) {
        let a = d[i]!;
        let b = d[i + 1]!;
        let ax = p[i * 2]!;
        let ay = p[i * 2 + 1]!;
        let bx = p[i * 2 + 2]!;
        let by = p[i * 2 + 3]!;
        if ((a < inner && b < inner) || (a > outer && b > outer)) continue;
        // An beiden Grenzen anteilig abschneiden, sonst springt eine Strasse
        // in ganzen Stuecken von Farbe zu Farbe statt durchzulaufen.
        if (a < inner) { const t = (inner - a) / (b - a); ax += (bx - ax) * t; ay += (by - ay) * t; a = inner; }
        if (b < inner) { const t = (inner - b) / (a - b); bx += (ax - bx) * t; by += (ay - by) * t; b = inner; }
        if (a > outer) { const t = (a - outer) / (a - b); ax += (bx - ax) * t; ay += (by - ay) * t; }
        if (b > outer) { const t = (b - outer) / (b - a); bx += (ax - bx) * t; by += (ay - by) * t; }
        ctx.moveTo(ax * s, ay * s);
        ctx.lineTo(bx * s, by * s);
      }
    };

    const whole = (lines: Line[], s: number, limit: number): void => {
      for (const ln of lines) {
        if (ln.lo > limit) continue;
        const p = ln.p;
        ctx.moveTo(p[0]! * s, p[1]! * s);
        for (let i = 1; i < p.length / 2; i++) ctx.lineTo(p[i * 2]! * s, p[i * 2 + 1]! * s);
      }
    };

    const draw = (v: number): void => {
      if (!data) return;
      const raw = Math.min(Math.max((v - from) / (1 - from), 0), 1);
      // Weich anfahren und weich auslaufen, damit der Zoom nicht ruckt.
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      if (Math.abs(eased - shown) < 0.0008) return;
      shown = eased;

      const view = NEAR + (data.radius - NEAR) * eased;
      const s = (Math.min(w, h) / 2 / view) * 0.96;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#07070a";
      ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2, h / 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Was nicht brennt: Fusswege, Gleise, die Mur.
      for (const layer of cold) {
        ctx.strokeStyle = layer.color;
        ctx.lineWidth = layer.width;
        ctx.beginPath();
        whole(layer.lines, s, view * 1.5);
        ctx.stroke();
      }

      // Das Strassennetz kalt, damit die Glut etwas hat, worauf sie liegt.
      ctx.strokeStyle = COLD;
      ctx.lineWidth = 1;
      ctx.beginPath();
      whole(hot, s, view * 1.5);
      ctx.stroke();

      // Und heiss, in Baendern. Kein clip(), keine Maske: `strokeBand` gibt
      // nur aus, was in das Band faellt.
      const BANDS = 7;
      for (let r = 0; r < BANDS; r++) {
        const inner = (view * r) / BANDS;
        const outer = (view * (r + 1)) / BANDS;
        ctx.strokeStyle = fire(outer / view, 0.9);
        ctx.lineWidth = view < 900 ? 1.7 : 1.2;
        ctx.beginPath();
        for (const ln of hot) {
          if (ln.lo > outer || ln.hi < inner) continue;
          strokeBand(ln, inner, outer, s);
        }
        ctx.stroke();
      }

      // ── Die Wahrzeichen ───────────────────────────────────────────────────
      for (let i = 0; i < data.marks.length; i++) {
        const m = data.marks[i]!;
        const t = Math.min(Math.max((view * 0.88 - m.d) / 240, 0), 1);
        const e = 1 - Math.pow(1 - t, 3);
        const el = markRefs.current[i];
        const mx = m.x * s;
        const my = m.y * s;
        const drop = (1 - e) * -30;

        if (el) {
          el.style.opacity = `${e}`;
          el.style.left = `${w / 2 + mx}px`;
          el.style.top = `${h / 2 + my + drop + ICON * 0.72}px`;
          el.style.visibility = e < 0.01 ? "hidden" : "visible";
        }
        if (e < 0.01 || !m.o) continue;

        // Der Grundriss, in fester Pixelgroesse. Fuellung sehr schwach, Kante
        // sichtbar: ein Symbol, das trotzdem das echte Gebaeude ist.
        ctx.save();
        ctx.translate(mx, my + drop);
        ctx.beginPath();
        const o = m.o;
        ctx.moveTo(o[0]! * ICON * 0.5, o[1]! * ICON * 0.5);
        for (let k = 1; k < o.length / 2; k++) {
          ctx.lineTo(o[k * 2]! * ICON * 0.5, o[k * 2 + 1]! * ICON * 0.5);
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 177, 74, ${0.1 * e})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 196, 120, ${0.72 * e})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
        ctx.restore();
      }

      // ── Das Gym ───────────────────────────────────────────────────────────
      // Unmissverstaendlich groesser und heisser als alles andere: vorher war
      // es ein 3,8-px-Punkt zwischen sechs gleich aussehenden Punkten.
      const beat = 0.5 + 0.5 * Math.sin(performance.now() / 900);
      ctx.strokeStyle = `rgba(255, 106, 31, ${0.1 + 0.12 * beat})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, 30 + 9 * beat, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 196, 120, 0.9)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 0, 17, 0, Math.PI * 2);
      ctx.stroke();

      // Vier Marken statt eines geschlossenen Rings: ein Fadenkreuz liest sich
      // als "genau hier", ein Kreis nur als "irgendwo da".
      ctx.strokeStyle = "rgba(255, 214, 158, 0.85)";
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const ang = (Math.PI / 2) * k;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 21, Math.sin(ang) * 21);
        ctx.lineTo(Math.cos(ang) * 29, Math.sin(ang) * 29);
        ctx.stroke();
      }

      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
      glow.addColorStop(0, "rgba(255, 214, 158, 0.34)");
      glow.addColorStop(1, "rgba(255, 106, 31, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "rgba(255, 226, 190, 0.98)";
      ctx.beginPath();
      ctx.arc(0, 0, 5.4, 0, Math.PI * 2);
      ctx.fill();
    };

    const tick = (): void => {
      if (dead) return;
      shown = -1; // der Puls laeuft weiter, also jedes Bild neu
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
        cold = [
          { lines: toLines(json.layers.path), color: FAINT, width: 0.6 },
          { lines: toLines(json.layers.farrail), color: RAILC, width: 0.7 },
          { lines: toLines(json.layers.rail), color: RAILC, width: 0.9 },
          { lines: toLines(json.layers.farwater), color: WATER, width: 1.8 },
          { lines: toLines(json.layers.water), color: WATER, width: 2.4 },
        ];
        setMarks(json.marks);
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

      {/* Das Gym, als Text. Der Grundriss ist im Canvas, der Name gehoert ins
          DOM: scharf, vorlesbar, und er sitzt fest in der Mitte. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[38px] text-center">
        <span className="block font-mono text-[0.58rem] font-semibold uppercase tracking-[0.26em] text-[#ffc478]">
          JJK Academy
        </span>
      </div>

      {marks.map((m, i) => (
        <div
          key={m.n}
          ref={(el) => { markRefs.current[i] = el; }}
          className="pointer-events-none absolute flex -translate-x-1/2 flex-col leading-tight"
          style={{ opacity: 0, visibility: "hidden", alignItems: "center" }}
        >
          <span className="text-[0.7rem] font-semibold whitespace-nowrap text-foreground/85">
            {m.n}
          </span>
          <span className="font-mono text-[0.55rem] tracking-wide whitespace-nowrap text-foreground/35">
            {km(m.d)}
            {m.sub ? ` · ${m.sub}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

export default StreetMap;
