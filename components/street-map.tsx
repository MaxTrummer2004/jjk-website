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
 * Ihre Beschriftungen zeigen deshalb voneinander weg (`s` in der Datendatei).
 * Wer hier eine davon gegen etwas anderes tauscht, sollte die Seiten wieder
 * pruefen.
 */
const SHOWN = [
  "Cineplexx",
  "Bahnhof Puntigam",
  "Shopping City Seiersberg",
  "Stadion Liebenau",
];
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

const PAPER = "232, 222, 210";

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

interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/**
 * Rahmen schmal oder niedrig genug, dass der Desktop-Satz der Marken nicht passt.
 *
 * Der Massstab laeuft ueber die LANGE Seite (`max(w, h) / 2 / view`). Am Handy
 * (350 x 795) reicht der Blick seitwaerts deshalb nur 0,44 * view weit: Bahnhof
 * Puntigam (x = -522 m) lag bei view 1100 schon 40 px links ausserhalb, der
 * Stadion-Eintrag rechts, und die Beschriftungen standen halb im Rahmen. Der
 * kompakte Satz zoomt anfangs weiter heraus, setzt jede Beschriftung auf einen
 * Platz, der ganz im Rahmen liegt (Seite waehlen, ueber/unter den Ring, bei
 * Bedarf mit Strich), und blendet Ringe aus, die am Rand oder unter dem
 * Maps-Hinweis liegen. Gemessen am 390x844: vorher bis zu 192 px abgeschnitten,
 * nachher 0. Der Desktop-Pfad ist bildpunktgleich.
 */
function isCompact(w: number, h: number): boolean {
  return w < 640 || h < 400;
}

const clamp01 = (v: number): number => Math.min(Math.max(v, 0), 1);

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
  const acadRef = useRef<HTMLDivElement>(null);
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
    // Nur fuer den kompakten Satz (siehe isCompact): gemessene Kasten der
    // Beschriftungen und der Flaechen, denen sie ausweichen muessen, alle in
    // Koordinaten um die Rahmenmitte.
    let sizes: ({ w: number; h: number } | null)[] = [];
    let obstacles: Box[] = [];
    let acad: Box | null = null;
    const lastPick: number[] = [];

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
      const compact = isCompact(w, h);
      const s0 = Math.max(w, h) / 2 / view;
      // Am Handy ist die kurze Seite 350 px, die lange 795: der Massstab laeuft
      // ueber die lange, also reicht der Blick seitwaerts nur view * w/h
      // (0,44 * view) weit. Ein Wahrzeichen im Abstand d liegt dann zwar im
      // Kreis um das Gym, aber meist links oder rechts ausserhalb des Rahmens.
      // Deshalb faehrt der kompakte Rahmen anfangs weiter heraus (F < 1), so
      // weit, dass die seitlichsten Wahrzeichen hineinpassen, und landet
      // gegen Ende wieder genau auf dem alten Massstab. Auf dem Desktop ist
      // F = 1, die Rechnung bleibt Bit fuer Bit dieselbe.
      let F = 1;
      if (compact) {
        let xm = 1;
        let ym = 1;
        for (const m of data.marks) {
          xm = Math.max(xm, Math.abs(m.x));
          ym = Math.max(ym, Math.abs(m.y));
        }
        const sStart = Math.max(w, h) / 2 / data.radius;
        const F0 = Math.min(
          1,
          Math.max(0.5, Math.min((w / 2 - 40) / (xm * sStart), (h / 2 - 80) / (ym * sStart))),
        );
        const t = clamp01(eased / 0.6);
        F = F0 + (1 - F0) * t * t * (3 - 2 * t);
      }
      const s = s0 * F;
      // Symbolgroesse in Bildpunkten, also unabhaengig vom Massstab — und
      // genau deshalb am Handy zu gross: derselbe Ring, der auf 1400 px eine
      // Marke ist, ist auf 380 px ein Fleck. `k` bindet die Symbole an die
      // kleinere Kante des Rahmens, nach unten und oben begrenzt, damit sie
      // weder verschwinden noch das Bild zudecken.
      const k = Math.min(1, Math.max(0.6, Math.min(w, h) / 620));
      const limit = (view * 1.6) / F;

      const pathA = lod(view, 900, 480);
      const bldA = lod(view, 720, 400);
      const farA = 1 - lod(view, 1600, 700);
      // Der Glut-Hof waechst nicht mit: in Metern schrumpft er mit `view`,
      // auf dem Schirm bleibt er gleich gross und wandert mit nach unten.
      const halo = (view * 0.34) / F;

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

      // ── Wahrzeichen ──────────────────────────────────────────────────────
      // Kompakter Rahmen: erst alle Ringe festlegen, dann jede Beschriftung auf
      // einen Platz setzen, der ganz im Rahmen liegt und nichts beruehrt. Der
      // Desktop-Satz weiter unten bleibt davon unberuehrt.
      const ringR = 5.5 * k + 1.1 * k;
      const fitA: number[] = [];
      const spot: ({ x: number; y: number; w: number; h: number; far: boolean } | null)[] = [];
      if (compact) {
        const dots: { x: number; y: number; a: number }[] = [];
        for (let i = 0; i < data.marks.length; i++) {
          const m = data.marks[i]!;
          const inT = Math.min(Math.max((eased - i * 0.03) / 0.09, 0), 1);
          const outT = Math.min(Math.max((view - m.d) / 420, 0), 1);
          const dropE = 1 - Math.pow(1 - inT, 3);
          const x = m.x * s;
          const y = m.y * s + (1 - dropE) * -30;
          // Ein Ring, der am Rand oder unter dem Maps-Hinweis sitzt, blendet
          // aus, statt halb im Bild zu stehen.
          let clear = Math.min(w / 2 - Math.abs(x), h / 2 - Math.abs(y)) - 12;
          for (const o of obstacles) {
            const dx = Math.max(o.l - x, 0, x - o.r);
            const dy = Math.max(o.t - y, 0, y - o.b);
            clear = Math.min(clear, Math.hypot(dx, dy) - 10);
          }
          const a = clamp01(clear / 18);
          fitA[i] = a;
          dots.push({ x, y, a: dropE * outT * a });
        }
        const hit = (a: Box, b: Box, pad: number): boolean =>
          a.l < b.r + pad && b.l < a.r + pad && a.t < b.b + pad && b.t < a.b + pad;
        const gap = 13 * k;
        // Pro Wahrzeichen alle Plaetze, die fuer sich genommen gehen: ganz im
        // Rahmen, nicht auf Hinweis, Quellenangabe, Gym-Marke oder fremdem Ring.
        const options: { c: number; box: Box }[][] = [];
        for (let i = 0; i < data.marks.length; i++) {
          const dot = dots[i]!;
          const size = sizes[i];
          options[i] = [];
          spot[i] = null;
          if (dot.a < 0.01 || !size) continue;
          const m = data.marks[i]!;
          const pref = m.s === "left" ? 0 : 1;
          const shift = size.h / 2 + ringR + 4;
          // Reihenfolge: gewuenschte Seite, andere Seite, dann unter bzw. ueber
          // dem Ring.
          const cands: { side: number; dy: number }[] = [
            { side: pref, dy: 0 },
            { side: 1 - pref, dy: 0 },
            { side: pref, dy: shift },
            { side: pref, dy: -shift },
            { side: 1 - pref, dy: shift },
            { side: 1 - pref, dy: -shift },
            // Notfall bei zwei dicht beieinander liegenden Ringen: eine
            // Beschriftung weiter weg, aber noch auf der Hoehe des Rings.
            { side: pref, dy: shift + size.h + 4 },
            { side: pref, dy: -(shift + size.h + 4) },
            { side: 1 - pref, dy: shift + size.h + 4 },
            { side: 1 - pref, dy: -(shift + size.h + 4) },
          ];
          for (let c = 0; c < cands.length; c++) {
            const { side, dy } = cands[c]!;
            const l = side === 0 ? dot.x - gap - size.w : dot.x + gap;
            const box: Box = { l, r: l + size.w, t: dot.y + dy - size.h / 2, b: dot.y + dy + size.h / 2 };
            if (box.l < -w / 2 + 8 || box.r > w / 2 - 8 || box.t < -h / 2 + 8 || box.b > h / 2 - 8) continue;
            if (obstacles.some((o) => hit(box, o, 6))) continue;
            if (acad && hit(box, acad, 6)) continue;
            if (hit(box, { l: -14 * k, r: 14 * k, t: -14 * k, b: 14 * k }, 3)) continue;
            // Der eigene Ring gehoert zur Beschriftung (bei dy = 0 sitzt sie
            // direkt daneben); jeder fremde Ring ist ein Hindernis.
            const ringHit = dots.some(
              (d, j) =>
                d.a > 0.01 &&
                (j !== i || dy !== 0) &&
                hit(box, { l: d.x - ringR, r: d.x + ringR, t: d.y - ringR, b: d.y + ringR }, 3),
            );
            if (ringHit) continue;
            options[i]!.push({ c, box });
          }
        }
        // Zwei dicht beieinander liegende Marken (Kino und Bahnhof) brauchen
        // einen gemeinsamen Satz: die eine ueber, die andere unter den Ringen.
        // Das findet kein Eins-nach-dem-anderen, also alle Kombinationen
        // durchgehen (hoechstens vier Marken mit je neun Plaetzen) und die mit
        // den kuerzesten Wegen nehmen. Die zuletzt gewaehlte Lage ist etwas
        // billiger, damit nichts hin- und herspringt, solange es noch passt.
        const todo = options.map((_, i) => i).filter((i) => options[i]!.length > 0);
        const costOf = (i: number, c: number): number => c + (lastPick[i] === c ? 0 : 1.5);
        let bestCost = Infinity;
        let best: { i: number; o: { c: number; box: Box } }[] = [];
        const cur: { i: number; o: { c: number; box: Box } }[] = [];
        const solve = (n: number, cost: number): void => {
          if (cost >= bestCost) return;
          if (n === todo.length) {
            bestCost = cost;
            best = cur.slice();
            return;
          }
          const i = todo[n]!;
          for (const o of options[i]!) {
            if (cur.some((q) => hit(o.box, q.o.box, 6))) continue;
            cur.push({ i, o });
            solve(n + 1, cost + costOf(i, o.c));
            cur.pop();
          }
        };
        solve(0, 0);
        if (best.length === 0 && todo.length > 0) {
          // Es geht nicht fuer alle: die vorderen behalten ihren Platz, wer
          // keinen findet, bleibt ohne Beschriftung — lieber keine als eine
          // abgeschnittene oder uebereinanderliegende.
          for (const i of todo) {
            const o = options[i]!.find((q) => !best.some((t) => hit(q.box, t.o.box, 6)));
            if (o) best.push({ i, o });
          }
        }
        for (const { i, o } of best) {
          spot[i] = { x: o.box.l, y: o.box.t, w: o.box.r - o.box.l, h: o.box.b - o.box.t, far: o.c >= 6 };
          lastPick[i] = o.c;
        }
      }

      const placed: { x: number; y: number }[] = [];
      for (let i = 0; i < data.marks.length; i++) {
        const m = data.marks[i]!;
        const inT = Math.min(Math.max((eased - i * 0.03) / 0.09, 0), 1);
        const outT = Math.min(Math.max((view - m.d) / 420, 0), 1);
        const dropE = 1 - Math.pow(1 - inT, 3);
        const e = dropE * outT * (compact ? fitA[i]! : 1);
        const el = markRefs.current[i];
        const mx = m.x * s;
        const my = m.y * s + (1 - dropE) * -30;

        if (e < 0.01) {
          if (el) el.style.visibility = "hidden";
          continue;
        }

        // Ein Ring, mehr nicht. Die Auskunft steckt in der Entfernung
        // daneben, nicht in der Form des Punktes.
        ctx.beginPath();
        // Vorher 1,3 px auf 0,7 Deckung: auf einem Schirm mit Glut darunter
        // war das eine Andeutung, kein Zeichen. Ein Symbol muss ueberleben,
        // wenn es klein ist.
        ctx.arc(mx, my, 5.5 * k, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 214, 158, ${0.95 * e})`;
        ctx.lineWidth = 2.2 * k;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(mx, my, 2.2 * k, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 236, 206, ${e})`;
        ctx.fill();

        if (!el) continue;
        // Die Fuehrungslinie ist weg. Sie war 0,9 px auf 0,3 Deckung, also
        // gerade noch sichtbar, und sie musste etwas verbinden, was ohnehin
        // nebeneinander liegt: zwei Striche fuer null Auskunft. Stattdessen
        // sitzt die Beschriftung direkt neben dem Ring, auf einer eigenen
        // Platte — damit hat sie eine Kante und liegt nicht auf den Strassen.
        if (compact) {
          const sp = spot[i];
          if (!sp) {
            el.style.visibility = "hidden";
            continue;
          }
          el.style.visibility = "visible";
          el.style.opacity = `${e}`;
          el.style.left = `${Math.round(w / 2 + sp.x)}px`;
          el.style.top = `${Math.round(h / 2 + sp.y)}px`;
          el.style.transform = "none";
          if (sp.far) {
            // Liegt die Beschriftung nicht mehr am Ring, haelt ein Strich beide
            // zusammen.
            const ex = Math.min(Math.max(mx, sp.x), sp.x + sp.w);
            const ey = Math.min(Math.max(my, sp.y), sp.y + sp.h);
            ctx.beginPath();
            ctx.moveTo(mx, my);
            ctx.lineTo(ex, ey);
            ctx.strokeStyle = `rgba(255, 214, 158, ${0.85 * e})`;
            ctx.lineWidth = Math.max(1, 1.5 * k);
            ctx.stroke();
          }
          continue;
        }
        const dir = m.s === "left" ? -1 : 1;
        const lx = mx + dir * 13 * k;
        let ly = my;
        for (const q of placed) {
          if (Math.abs(q.x - lx) < 170 && Math.abs(q.y - ly) < 30) ly = q.y + 34;
        }
        placed.push({ x: lx, y: ly });

        el.style.visibility = "visible";
        el.style.opacity = `${e}`;
        // Auf ganze Pixel: auf halben Pixeln zittert Text beim Zoomen, und
        // genau das liest sich als unfertig.
        el.style.left = `${Math.round(w / 2 + lx)}px`;
        el.style.top = `${Math.round(h / 2 + ly)}px`;
        el.style.transform = `translateY(-50%) ${m.s === "left" ? "translateX(-100%)" : ""}`;
      }

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
      // Kompakt und herausgezoomt endet die Kartendatei INNERHALB des Rahmens
      // (data.radius * s < rr): die Blende muss dann am Datenrand schwarz sein,
      // sonst steht dort eine harte Kreiskante.
      const rEdge = compact ? Math.min(rr, data.radius * s) : rr;
      const edge = ctx.createRadialGradient(w / 2, h / 2, rEdge * 0.52, w / 2, h / 2, rEdge);
      edge.addColorStop(0, "rgba(7, 7, 10, 0)");
      edge.addColorStop(1, "rgba(7, 7, 10, 1)");
      ctx.fillStyle = edge;
      ctx.fillRect(0, 0, w, h);
    };

    // Kasten in Koordinaten um die Rahmenmitte (wie ctx nach translate).
    const boxOf = (el: Element, r: DOMRect, pad = 0): Box => {
      const b = el.getBoundingClientRect();
      return {
        l: b.left - r.left - r.width / 2 - pad,
        r: b.right - r.left - r.width / 2 + pad,
        t: b.top - r.top - r.height / 2 - pad,
        b: b.bottom - r.top - r.height / 2 + pad,
      };
    };

    const measure = (): void => {
      const r = wrap.getBoundingClientRect();
      // Alles, was der Rahmen traegt und worauf keine Beschriftung liegen darf
      // (Maps-Hinweis, Quellenangabe): vom Aufrufer mit data-map-obstacle
      // markiert, damit hier keine Masse von dort stehen.
      obstacles = Array.from(
        wrap.parentElement?.querySelectorAll("[data-map-obstacle]") ?? [],
      ).map((el) => boxOf(el, r));
      acad = acadRef.current ? boxOf(acadRef.current, r) : null;
      sizes = markRefs.current.map((el) =>
        el ? { w: el.offsetWidth, h: el.offsetHeight } : null,
      );
    };

    const layout = (): void => {
      measure();
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
        // Die Beschriftungen entstehen erst nach dem Laden der Datei; fehlt
        // ihr Mass noch, jetzt nachholen.
        if (data && data.marks.some((_, i) => !sizes[i])) measure();
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
  }, [progress, from]);

  return (
    <div ref={wrapRef} className={`relative h-full w-full ${className}`}>
      <canvas ref={canvasRef} className="block h-full w-full" aria-hidden="true" />

      {/* Die eigene Marke traegt als einzige eine gefuellte Platte: sie ist
          der Punkt, um den es geht, und muss sich von den vier Wahrzeichen
          unterscheiden, ohne groesser zu sein. */}
      <div ref={acadRef} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 translate-y-[24px] sm:translate-y-[34px]">
        <span className="block rounded-md bg-[#ff6a1f] px-2 py-0.5 font-mono text-[0.55rem] font-semibold uppercase tracking-[0.14em] whitespace-nowrap text-[#120703] sm:px-2.5 sm:py-1 sm:text-[0.62rem] sm:tracking-[0.18em]">
          JJK Academy
        </span>
      </div>

      {marks.map((m, i) => {
        const Icon = ICONS[m.sub];
        return (
          <div
            key={m.n}
            ref={(el) => { markRefs.current[i] = el; }}
            className="pointer-events-none absolute flex flex-col gap-0.5 rounded-md border border-white/12 bg-[#0b0b10]/88 px-2 py-1 leading-tight backdrop-blur-[2px] sm:px-2.5 sm:py-1.5"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            <span className="flex items-center gap-1.5 text-[0.7rem] font-semibold whitespace-nowrap text-foreground sm:text-[0.8rem]">
              {Icon ? <Icon className="size-3 shrink-0 text-[#ffbe84]" strokeWidth={2} aria-hidden="true" /> : null}
              {m.n}
            </span>
            <span className="font-mono text-[0.55rem] tracking-wide whitespace-nowrap text-[#ffbe84] sm:text-[0.6rem]">
              {km(m.d)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default StreetMap;
