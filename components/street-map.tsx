"use client";

/**
 * StreetMap — die Gegend um das Gym: von Graz hinunter bis vor die Tuer.
 *
 * ── Warum keine Karten-Kachel ───────────────────────────────────────────────
 * Weil eine Kachel von Mapbox oder Google aussieht wie Mapbox oder Google. Die
 * Seite ist Tusche auf Schwarz mit einer Glut darin; eine fremde Karte mitten
 * drin ist ein Fenster in andere Software. Dazu kaemen ein Token, ein
 * Drittanbieter-Aufruf bei jedem Seitenaufruf und ein Eintrag mehr in der
 * Datenschutzerklaerung. Die Daten liegen stattdessen als Zahlen im Repo,
 * einmalig aus OpenStreetMap geholt.
 *
 * ── Eine Groesse, an der alles haengt ───────────────────────────────────────
 * `view` ist der sichtbare Radius in Metern und laeuft von 3150 (man sieht
 * Graz) auf 320 (man steht vor der Tuer). Daran haengen Massstab, Detailstufe,
 * Faerbung und die Beschriftungen.
 *
 * ── Was hier beim letzten Mal falsch war ────────────────────────────────────
 * Drei Dinge, alle aus derselben Wurzel: es war keine Karte, es war ein Bild
 * von Linien.
 *
 * KEINE HIERARCHIE. Autobahn und Wohnstrasse wurden mit derselben Breite
 * gezeichnet (`lineWidth = view < 900 ? 1.7 : 1.2`, eine Zeile fuer alles).
 * Jede Karte seit hundert Jahren macht das Gegenteil, und zwar nicht aus
 * Tradition: das Auge folgt den dicken Linien und findet sich damit zurecht,
 * ohne zu lesen. Jetzt vier Klassen mit eigener Breite UND eigener Helligkeit.
 *
 * ALLES GLUEHTE. Die Glut lag ueber der gesamten Flaeche, also schrie jede
 * Linie gleich laut und der Blick fand keinen Halt — eine Heatmap, kein Ort.
 * Jetzt ist der Grundton ein ruhiges Warmgrau, und die Glut ist ein enger Hof
 * um das Gym, der beim Hineinfahren mitwandert. Figur und Grund.
 *
 * GRUNDRISSE ALS SYMBOLE. Die Wahrzeichen trugen ihren echten Gebaeudeumriss
 * aus OSM. Die Idee traegt nicht: auf eine Einheitsbox normiert ist die einzige
 * Auskunft, die ein Grundriss hat — wie gross das Ding ist — wegnormiert, und
 * bei der Groesse, in der so ein Symbol neben einer Beschriftung sitzen kann,
 * sind Stadion, Bahnhofshalle und Platzflaeche nicht zu unterscheiden. Jetzt
 * tragen alle sieben denselben schlichten Ring; die Auskunft steckt in der
 * Entfernung daneben.
 *
 * DER SCHLUSS WAR LEER. Ganz unten angekommen sah man weniger als am Anfang,
 * weil in den Daten nur Strassen lagen. Bei 320 m Sichtweite ist ein
 * Strassennetz fast nichts — da will man den Block sehen. Jetzt liegen 442
 * Gebaeudegrundrisse im Umkreis von 480 m darin, und das eigene Haus ist
 * hervorgehoben. Der letzte Blick ist damit der dichteste.
 *
 * ── Wahrzeichen bleiben im Bild ─────────────────────────────────────────────
 * Bis 15.10.2026 verschwand ein Wahrzeichen, sobald `view` unter seine
 * Entfernung fiel — also genau dann, wenn man anfing, die Gegend zu verstehen.
 * Das Einkaufszentrum (2,4 km) war nur ein paar Prozent der Strecke zu sehen,
 * am Handy im Hochformat lag es von Anfang an ausserhalb des Rahmens. Der
 * Vorstand: "man bekommt die drei Punkte nicht wirklich mit".
 *
 * Jetzt bleiben alle Marken bis zum Schluss: wandert ein Wahrzeichen aus dem
 * Rahmen, haelt seine Marke am Rand in der Richtung an, in der es liegt, mit
 * einem Pfeil nach draussen — so, wie Karten-Apps Ziele ausserhalb des
 * Ausschnitts zeigen. Eine gestrichelte Linie vom Gym zur Marke macht die
 * Entfernung, die daneben steht, als Richtung lesbar. Der Rahmen, in dem die
 * Marken bleiben, laesst oben den Maps-Hinweis frei und unten die Adressplatte,
 * sobald die erscheint (`reserveBottom`).
 *
 * ── Detailstufen ────────────────────────────────────────────────────────────
 * Fusswege waren weit draussen ein grauer Schmierfleck und nah dran sinnvoll,
 * die Fernstrassen umgekehrt. Beide werden jetzt ueber `view` ein- und
 * ausgeblendet. Das raeumt beide Enden auf und spart nebenbei Zeichenarbeit.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MotionValue } from "motion/react";
import { Clapperboard, Goal, ShoppingBag, TrainFront, type LucideIcon } from "lucide-react";

interface Mark {
  n: string;
  x: number;
  y: number;
  d: number;
  s: "left" | "right";
  sub: string;
}

interface Raw {
  inner: number;
  radius: number;
  layers: Record<string, number[][]>;
  marks: Mark[];
  home?: number[];
}

interface Line {
  p: Float32Array;
  d: Float32Array;
  lo: number;
  hi: number;
}

/** Ein belegtes Rechteck in Rahmen-Koordinaten (Ursprung = Gym), fuer die Kollisionspruefung der Beschriftungen. */
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Eine Marke nach der Lagebestimmung; wird erst NACH der Randblende gezeichnet. */
interface Pin {
  x: number;
  y: number;
  dx: number;
  dy: number;
  e: number;
  dockE: number;
}

const NEAR = 320;

/**
 * Welche Wahrzeichen die Karte traegt.
 *
 * In public/data/graz-streets.json liegen sieben, hier stehen vier. Sieben
 * Beschriftungen auf einem Bild sind Schrifttapete; vier lassen sich lesen,
 * ohne dass man den Kopf danach dreht. Die Auswahl mischt bewusst die Arten —
 * Bahnhof, Brauerei, Stadion, Einkaufszentrum — statt dreimal dasselbe zu
 * nennen, und haengt je zwei nach links und rechts, damit das Bild nicht
 * kippt.
 *
 * Zum Tauschen genuegt diese Liste: die uebrigen vier (Zentrum Puntigam,
 * Brauerei Puntigam, Center West, Murpark) liegen bereits in der Datei, es
 * braucht also keine neue Abfrage. Die Namen muessen mit `n` dort
 * uebereinstimmen.
 *
 * Kino und Bahnhof sind der Sonderfall: sie liegen keine 90 m auseinander.
 * Ihre Beschriftungen zeigen deshalb voneinander weg (`s` in der Datendatei),
 * solange beide noch im Rahmen liegen. Wer hier eine davon gegen etwas anderes
 * tauscht, sollte die Seiten wieder pruefen.
 */
const SHOWN = [
  "Cineplexx",
  "Bahnhof Puntigam",
  "Shopping City Seiersberg",
  "Stadion Liebenau",
];
const PAPER = "232, 222, 210";

/**
 * Ein Zeichen je Art, damit man die Marken beim Ueberfliegen unterscheidet,
 * ohne zu lesen. Der Schluessel ist `sub` aus der Datendatei.
 */
const ICONS: Record<string, LucideIcon> = {
  Bahnhof: TrainFront,
  Kino: Clapperboard,
  Einkaufszentrum: ShoppingBag,
  Stadion: Goal,
};

function clamp01(v: number): number {
  return Math.min(Math.max(v, 0), 1);
}

/** 1, sobald `view` unter `b` liegt; 0 oberhalb von `a`. */
function lod(view: number, a: number, b: number): number {
  return Math.min(Math.max((a - view) / (a - b), 0), 1);
}

/** Die Glut: heiss am Gym, Zinnober am Rand des Hofs. */
function fire(t: number, alpha: number): string {
  const stops: [number, number, number][] = [
    [255, 226, 186],
    [255, 177, 74],
    [255, 106, 31],
    [196, 34, 44],
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
  reserveBottom,
  className = "",
}: {
  progress: MotionValue<number>;
  from?: number;
  /** Hoehe in px, die die Marken am unteren Rand freilassen (die Adressplatte, sobald sie da ist). */
  reserveBottom?: MotionValue<number>;
  className?: string;
}): ReactNode {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const homeRef = useRef<HTMLDivElement>(null);
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
    let far: Line[] = [];
    let major: Line[] = [];
    let mid: Line[] = [];
    let minor: Line[] = [];
    let paths: Line[] = [];
    let rails: Line[] = [];
    let water: Line[] = [];
    let blds: Float32Array[] = [];
    let home: Float32Array | null = null;
    let w = 0;
    let h = 0;
    let dpr = 1;

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

    const trace = (lines: Line[], s: number, limit: number): void => {
      for (const ln of lines) {
        if (ln.lo > limit) continue;
        const p = ln.p;
        ctx.moveTo(p[0]! * s, p[1]! * s);
        for (let i = 1; i < p.length / 2; i++) ctx.lineTo(p[i * 2]! * s, p[i * 2 + 1]! * s);
      }
    };

    /** Nur die Stuecke einer Linie zwischen `inner` und `outer`. */
    const band = (ln: Line, inner: number, outer: number, s: number): void => {
      const { p, d } = ln;
      for (let i = 0; i < d.length - 1; i++) {
        let a = d[i]!;
        let b = d[i + 1]!;
        let ax = p[i * 2]!;
        let ay = p[i * 2 + 1]!;
        let bx = p[i * 2 + 2]!;
        let by = p[i * 2 + 3]!;
        if ((a < inner && b < inner) || (a > outer && b > outer)) continue;
        if (a < inner) { const t = (inner - a) / (b - a); ax += (bx - ax) * t; ay += (by - ay) * t; a = inner; }
        if (b < inner) { const t = (inner - b) / (a - b); bx += (ax - bx) * t; by += (ay - by) * t; b = inner; }
        if (a > outer) { const t = (a - outer) / (a - b); ax += (bx - ax) * t; ay += (by - ay) * t; }
        if (b > outer) { const t = (b - outer) / (b - a); bx += (ax - bx) * t; by += (ay - by) * t; }
        ctx.moveTo(ax * s, ay * s);
        ctx.lineTo(bx * s, by * s);
      }
    };

    const poly = (flat: Float32Array | number[], s: number, scale = 1): void => {
      ctx.moveTo(flat[0]! * s * scale, flat[1]! * s * scale);
      for (let i = 1; i < flat.length / 2; i++) {
        ctx.lineTo(flat[i * 2]! * s * scale, flat[i * 2 + 1]! * s * scale);
      }
      ctx.closePath();
    };

    const draw = (v: number): void => {
      if (!data) return;
      const raw = Math.min(Math.max((v - from) / (1 - from), 0), 1);
      const eased = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;

      const view = data.radius + (NEAR - data.radius) * eased;
      // Den Rahmen FUELLEN, nicht eine Scheibe hineinlegen: vorher lief der
      // Massstab ueber die kurze Seite, also endete die Karte als ausgerissener
      // Kreis mit totem Schwarz daneben. Karten laufen an den Kanten hinaus.
      const s = Math.max(w, h) / 2 / view;
      // Symbolgroesse in Bildpunkten, also unabhaengig vom Massstab — und
      // genau deshalb am Handy zu gross: derselbe Ring, der auf 1400 px eine
      // Marke ist, ist auf 380 px ein Fleck. `k` bindet die Symbole an die
      // kleinere Kante des Rahmens, nach unten und oben begrenzt, damit sie
      // weder verschwinden noch das Bild zudecken.
      const k = Math.min(1, Math.max(0.6, Math.min(w, h) / 620));
      const limit = view * 1.6;

      const pathA = lod(view, 900, 480);
      const bldA = lod(view, 720, 400);
      const farA = 1 - lod(view, 1600, 700);
      // Der Glut-Hof waechst nicht mit: in Metern schrumpft er mit `view`,
      // auf dem Schirm bleibt er gleich gross und wandert mit nach unten.
      const halo = view * 0.34;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#07070a";
      ctx.fillRect(0, 0, w, h);
      ctx.translate(w / 2, h / 2);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // ── Grund ────────────────────────────────────────────────────────────
      if (bldA > 0.01) {
        ctx.fillStyle = `rgba(${PAPER}, ${0.045 * bldA})`;
        ctx.strokeStyle = `rgba(${PAPER}, ${0.1 * bldA})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        for (const b of blds) poly(b, s);
        ctx.fill();
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(96, 126, 158, 0.26)";
      ctx.lineWidth = Math.max(1.4, 2.6 * Math.min(1, 900 / view));
      ctx.beginPath();
      trace(water, s, limit);
      ctx.stroke();

      ctx.strokeStyle = `rgba(${PAPER}, 0.07)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      trace(rails, s, limit);
      ctx.stroke();

      if (pathA > 0.01) {
        ctx.strokeStyle = `rgba(${PAPER}, ${0.09 * pathA})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        trace(paths, s, limit);
        ctx.stroke();
      }

      // ── Das Strassennetz, nach Klassen ───────────────────────────────────
      // Breite UND Helligkeit steigen mit der Bedeutung. Das ist der ganze
      // Unterschied zwischen "Linien" und "Karte".
      const zoomW = Math.min(1.5, Math.max(0.85, 700 / view + 0.55));
      const ROADS: { lines: Line[]; w: number; a: number }[] = [
        { lines: minor, w: 0.9, a: 0.17 },
        { lines: mid, w: 1.5, a: 0.3 },
        { lines: far, w: 1.9, a: 0.34 * farA },
        { lines: major, w: 2.4, a: 0.46 },
      ];
      for (const r of ROADS) {
        if (r.a < 0.01) continue;
        ctx.strokeStyle = `rgba(${PAPER}, ${r.a})`;
        ctx.lineWidth = r.w * zoomW;
        ctx.beginPath();
        trace(r.lines, s, limit);
        ctx.stroke();
      }

      // ── Die Glut, nur im Hof um das Gym ──────────────────────────────────
      const BANDS = 5;
      for (const r of ROADS) {
        if (r.a < 0.01) continue;
        for (let k = 0; k < BANDS; k++) {
          const inner = (halo * k) / BANDS;
          const outer = (halo * (k + 1)) / BANDS;
          ctx.strokeStyle = fire(outer / halo, 0.85);
          ctx.lineWidth = r.w * zoomW * 1.05;
          ctx.beginPath();
          for (const ln of r.lines) {
            if (ln.lo > outer || ln.hi < inner) continue;
            band(ln, inner, outer, s);
          }
          ctx.stroke();
        }
      }

      // Das eigene Haus.
      if (home && bldA > 0.01) {
        ctx.beginPath();
        poly(home, s);
        ctx.fillStyle = `rgba(255, 140, 60, ${0.3 * bldA})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 214, 158, ${0.9 * bldA})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      // ── Wahrzeichen: Lage, Linie, Beschriftung ───────────────────────────
      // Erst alle Masse LESEN, dann schreiben: ein offsetWidth nach einem
      // style.left im selben Bild erzwingt ein synchrones Layout.
      const wrapRect = wrap.getBoundingClientRect();
      const homeEl = homeRef.current;
      const boxes: Box[] = [];
      if (homeEl) {
        const hr = homeEl.getBoundingClientRect();
        boxes.push({ x: hr.left - wrapRect.left - w / 2, y: hr.top - wrapRect.top - h / 2, w: hr.width, h: hr.height });
      }
      const sizes = data.marks.map((_, i) => {
        const el = markRefs.current[i];
        return el ? { w: el.offsetWidth, h: el.offsetHeight } : { w: 0, h: 0 };
      });

      // Der Rahmen, in dem die Marken bleiben: oben unter dem Maps-Hinweis
      // und dem OSM-Vermerk, unten ueber der Adressplatte, sobald die kommt.
      // Seitlich so viel, dass Ring und Pfeil noch Platz haben.
      const reserve = reserveBottom?.get() ?? 0;
      const dock = {
        l: -w / 2 + 22 * k,
        r: w / 2 - 22 * k,
        t: -h / 2 + 60,
        b: h / 2 - 26 - reserve,
      };
      const pins: Pin[] = [];

      ctx.setLineDash([2 * k, 6 * k]);
      for (let i = 0; i < data.marks.length; i++) {
        const m = data.marks[i]!;
        const el = markRefs.current[i];
        // Gestaffelt kurz nach dem Aufziehen, der naechste zuerst — und dann
        // bleiben sie. Das Ausblenden nach `view` ist weg, siehe Kopf.
        const inT = clamp01((eased - i * 0.05) / 0.1);
        const e = 1 - Math.pow(1 - inT, 3);

        if (e < 0.01) {
          if (el) el.style.visibility = "hidden";
          continue;
        }

        const rx = m.x * s;
        const ry = m.y * s + (1 - e) * -30;
        const r = Math.max(1, Math.hypot(rx, ry));
        const dx = rx / r;
        const dy = ry / r;

        // Der Strahl vom Gym zum Wahrzeichen, geschnitten mit dem Rahmen:
        // davor liegt die Marke auf dem Ort selbst, dahinter haelt sie am Rand.
        let tEdge = Infinity;
        let side = 0; // 0 links, 1 rechts, 2 oben, 3 unten
        if (dx < 0 && dock.l / dx < tEdge) { tEdge = dock.l / dx; side = 0; }
        if (dx > 0 && dock.r / dx < tEdge) { tEdge = dock.r / dx; side = 1; }
        if (dy < 0 && dock.t / dy < tEdge) { tEdge = dock.t / dy; side = 2; }
        if (dy > 0 && dock.b / dy < tEdge) { tEdge = dock.b / dy; side = 3; }
        const mx = dx * Math.min(r, tEdge);
        const my = dy * Math.min(r, tEdge);
        // Weich statt schlagartig: auf den letzten 70 px vor dem Rand wandert
        // die Beschriftung von "neben dem Ring" nach "innen vom Ring".
        const dockT = clamp01((r - (tEdge - 70)) / 70);
        const dockE = dockT * dockT * (3 - 2 * dockT);
        pins.push({ x: mx, y: my, dx, dy, e, dockE });

        // Die Linie vom Gym zur Marke. Fruehere Fassung hatte eine
        // Fuehrungslinie zwischen Ring und Beschriftung, die nebeneinander
        // lagen — zwei Striche fuer null Auskunft, und sie flog raus. Diese
        // hier verbindet zwei Dinge, die NICHT nebeneinander liegen: das Gym
        // und einen Punkt am Rand. Sie ist die Entfernung als Richtung.
        const gap = 26 * k;
        if (Math.hypot(mx, my) > gap + 12 * k) {
          ctx.beginPath();
          ctx.moveTo(dx * gap, dy * gap);
          ctx.lineTo(mx - dx * 9 * k, my - dy * 9 * k);
          ctx.strokeStyle = `rgba(255, 170, 90, ${0.1 * e})`;
          ctx.lineWidth = 3;
          ctx.stroke();
          ctx.strokeStyle = `rgba(255, 190, 132, ${0.5 * e})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        if (!el) continue;
        const { w: lw, h: lh } = sizes[i]!;

        // Platz A: neben dem Ring, Seite aus der Datendatei.
        const sideDir = m.s === "left" ? -1 : 1;
        const ax = sideDir < 0 ? mx - 13 * k - lw : mx + 13 * k;
        const ay = my - lh / 2;
        // Platz B: nach innen, von der Kante weg, an der die Marke haelt.
        let bx: number;
        let by: number;
        if (side === 0) { bx = mx + 12 * k; by = my - lh / 2; }
        else if (side === 1) { bx = mx - 12 * k - lw; by = my - lh / 2; }
        else if (side === 2) { bx = mx - lw / 2; by = my + 11 * k; }
        else { bx = mx - lw / 2; by = my - 11 * k - lh; }

        let lx = ax + (bx - ax) * dockE;
        let ly = ay + (by - ay) * dockE;
        lx = Math.min(Math.max(lx, -w / 2 + 8), w / 2 - 8 - lw);
        ly = Math.min(Math.max(ly, dock.t + 2), dock.b - lh);

        // Nichts liegt auf etwas anderem: Beschriftungen weichen einander
        // und der Gym-Marke aus. Wer oben oder unten am Rand haengt, rueckt
        // zur Seite (bleibt also auf Hoehe seiner Marke), alle anderen nach
        // unten. Ein paar Durchgaenge reichen fuer vier Marken.
        const alongEdge = dockE > 0.5 && side >= 2;
        for (let pass = 0; pass < 4; pass++) {
          let moved = false;
          for (const q of boxes) {
            if (lx < q.x + q.w + 6 && lx + lw + 6 > q.x && ly < q.y + q.h + 6 && ly + lh + 6 > q.y) {
              if (alongEdge) lx = lx + lw / 2 >= q.x + q.w / 2 ? q.x + q.w + 6 : q.x - 6 - lw;
              else ly = q.y + q.h + 6;
              moved = true;
            }
          }
          if (!moved) break;
        }
        boxes.push({ x: lx, y: ly, w: lw, h: lh });

        el.style.visibility = "visible";
        el.style.opacity = `${e}`;
        // Auf ganze Pixel: auf halben Pixeln zittert Text beim Zoomen, und
        // genau das liest sich als unfertig.
        el.style.left = `${Math.round(w / 2 + lx)}px`;
        el.style.top = `${Math.round(h / 2 + ly)}px`;
      }
      ctx.setLineDash([]);

      // ── Das Gym ──────────────────────────────────────────────────────────
      // Hier lagen vier Dinge uebereinander: ein Schein, ein pulsender Ring,
      // vier Striche im Kreis und ein Punkt. Der pulsende Ring war der
      // schlimmste — eine Linie auf 0,1 bis 0,22 Deckung, die dauernd ihre
      // Groesse aendert, hat keinen festen Platz, und der Blick wird von der
      // Bewegung angezogen, obwohl dort nichts zu lesen ist. Geblieben sind
      // drei ruhige Ringe um einen vollen Punkt: eine Zielscheibe, wie sie
      // jede Karte kennt, und sie steht still.
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 52 * k);
      glow.addColorStop(0, "rgba(255, 150, 70, 0.34)");
      glow.addColorStop(1, "rgba(255, 106, 31, 0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, 52 * k, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(255, 140, 60, 0.42)";
      ctx.lineWidth = 2 * k;
      ctx.beginPath();
      ctx.arc(0, 0, 19 * k, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "rgba(255, 226, 186, 0.95)";
      ctx.lineWidth = 3 * k;
      ctx.beginPath();
      ctx.arc(0, 0, 10.5 * k, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 240, 220, 1)";
      ctx.beginPath();
      ctx.arc(0, 0, 4.2 * k, 0, Math.PI * 2);
      ctx.fill();

      // ── Rand ─────────────────────────────────────────────────────────────
      // Statt einer harten Datenkante eine weiche Blende ins Schwarz. Damit
      // ist der Uebergang eine Entscheidung und kein Artefakt.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rr = Math.hypot(w, h) / 2;
      const edge = ctx.createRadialGradient(w / 2, h / 2, rr * 0.52, w / 2, h / 2, rr);
      edge.addColorStop(0, "rgba(7, 7, 10, 0)");
      edge.addColorStop(1, "rgba(7, 7, 10, 1)");
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, w, h);

      // ── Die Marken, ueber der Blende ─────────────────────────────────────
      // Am Rand angedockt laegen sie mitten in der Blende und wuerden halb
      // geschluckt; die Linie darf dort verblassen, das Zeichen nicht.
      ctx.translate(w / 2, h / 2);
      for (const p of pins) {
        // Ein Ring, mehr nicht. Die Auskunft steckt in der Entfernung
        // daneben, nicht in der Form des Punktes. Vorher 1,3 px auf 0,7
        // Deckung: auf einem Schirm mit Glut darunter war das eine Andeutung,
        // kein Zeichen. Ein Symbol muss ueberleben, wenn es klein ist.
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5 * k, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 214, 158, ${0.95 * p.e})`;
        ctx.lineWidth = 2.2 * k;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.2 * k, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 236, 206, ${p.e})`;
        ctx.fill();

        // Der Pfeil nach draussen: nur, wenn die Marke am Rand haelt.
        if (p.dockE > 0.01) {
          const tx = p.x + p.dx * 12 * k;
          const ty = p.y + p.dy * 12 * k;
          const px = -p.dy;
          const py = p.dx;
          ctx.beginPath();
          ctx.moveTo(tx - p.dx * 4 * k + px * 4 * k, ty - p.dy * 4 * k + py * 4 * k);
          ctx.lineTo(tx, ty);
          ctx.lineTo(tx - p.dx * 4 * k - px * 4 * k, ty - p.dy * 4 * k - py * 4 * k);
          ctx.strokeStyle = `rgba(255, 214, 158, ${0.9 * p.e * p.dockE})`;
          ctx.lineWidth = 1.8 * k;
          ctx.stroke();
        }
      }
    };

    const layout = (): void => {
      const r = wrap.getBoundingClientRect();
      const nw = Math.max(1, Math.round(r.width));
      const nh = Math.max(1, Math.round(r.height));
      const nd = Math.min(window.devicePixelRatio || 1, 2);
      // Eine Zuweisung an canvas.width LEERT die Flaeche, auch bei gleichem
      // Wert — und der ResizeObserver feuert waehrend des Wachsens in jedem
      // Bild, nach den rAF-Rueckrufen. Nur bei echter Aenderung anfassen.
      if (nw === w && nh === h && nd === dpr) return;
      w = nw;
      h = nh;
      dpr = nd;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (data) draw(progress.get());
    };

    let complained = false;
    const tick = (): void => {
      if (dead) return;
      try {
        draw(progress.get());
      } catch (err) {
        if (!complained) {
          complained = true;
          console.error("[StreetMap] Fehler beim Zeichnen:", err);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    void fetch("/data/graz-streets.json")
      .then((r) => r.json() as Promise<Raw>)
      .then((json) => {
        if (dead) return;
        data = json;
        far = toLines(json.layers.far);
        major = toLines(json.layers.major);
        mid = toLines(json.layers.mid);
        minor = toLines(json.layers.minor);
        paths = toLines(json.layers.path);
        rails = [...toLines(json.layers.rail), ...toLines(json.layers.farrail)];
        water = [...toLines(json.layers.water), ...toLines(json.layers.farwater)];
        blds = (json.layers.bld ?? []).map((b) => new Float32Array(b));
        home = json.home ? new Float32Array(json.home) : null;
        // Einmal filtern, nicht an zwei Stellen: Canvas und Beschriftungen
        // laufen ueber denselben Index, ein Unterschied waere ein Versatz.
        json.marks = json.marks.filter((m) => SHOWN.includes(m.n));
        setMarks(json.marks);
        requestAnimationFrame(() => {
          if (dead) return;
          layout();
          tick();
        });
      })
      .catch((err: unknown) => {
        console.error("[StreetMap] graz-streets.json konnte nicht geladen werden:", err);
      });

    const ro = new ResizeObserver(() => layout());
    ro.observe(wrap);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [progress, from, reserveBottom]);

  return (
    <div ref={wrapRef} className={`relative h-full w-full ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />

      {/* Die eigene Marke traegt als einzige eine gefuellte Platte: sie ist
          der Punkt, um den es geht, und muss sich von den vier Wahrzeichen
          unterscheiden, ohne groesser zu sein. */}
      <div ref={homeRef} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[24px] sm:translate-y-[34px]">
        <span className="block rounded-md bg-[#ff6a1f] px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.14em] whitespace-nowrap text-[#120703] sm:px-2.5 sm:py-1 sm:text-[0.62rem] sm:tracking-[0.18em]">
          JJK Academy
        </span>
      </div>

      {/* Die Lage (left/top) setzt der Zeichenschritt oben, aus demselben
          Massstab wie die Ringe im Canvas. Warme Kante statt Weiss: die Platte
          gehoert zur Glut, nicht zur Benutzeroberflaeche. */}
      {marks.map((m, i) => {
        const Icon = ICONS[m.sub];
        return (
          <div
            key={m.n}
            ref={(el) => { markRefs.current[i] = el; }}
            className="pointer-events-none absolute flex flex-col gap-0.5 rounded-md border border-[#ffbe84]/25 bg-[#0b0b10]/90 px-2 py-1 leading-tight shadow-[0_8px_20px_-10px_rgba(0,0,0,0.9)] backdrop-blur-[2px] sm:px-2.5 sm:py-1.5"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            <span className="flex items-center gap-1.5 text-[0.72rem] font-semibold whitespace-nowrap text-foreground sm:text-[0.82rem]">
              {Icon ? <Icon className="size-3 shrink-0 text-[#ffbe84]" strokeWidth={2} aria-hidden="true" /> : null}
              {m.n}
            </span>
            <span className="font-mono text-[0.58rem] tracking-wide whitespace-nowrap text-[#ffbe84] sm:text-[0.64rem]">
              {km(m.d)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default StreetMap;
