"use client";

/**
 * RippleCanvas — die beiden Heroplatten, und Wasser darüber.
 *
 * ── Was es ist ──────────────────────────────────────────────────────────────
 * Der Zeiger zieht Ringe durch das Bild, wie ein Finger über eine Wasserfläche.
 * Es gab das schon einmal auf dieser Seite — über den vier Ovalen im
 * About-Abschnitt (components/water-ripple.tsx) — und es ist auf Ansage
 * entfernt worden, nachdem es abgestürzt ist.
 *
 * ── Warum das hier eine NEUE Datei ist und kein Wiedereinhängen ─────────────
 * Der alte Effekt läuft auf @react-three/fiber plus @react-three/postprocessing,
 * und der Absturz kam aus genau dieser Ecke: `Cannot read properties of null
 * (reading 'alpha')`, ausgelöst nicht vom Speicher, sondern vom ABRÄUMEN —
 * `postprocessing` liest die Kontext-Attribute, nachdem der Kontext schon weg
 * ist. Auf vier kleinen Ovalen war das ein Ärgernis; auf einem Vollbild-Hero,
 * der das Erste ist, was jeder sieht, wäre es fahrlässig.
 *
 * Hier gibt es nichts, was das nicht überlebt: ein Kontext, ein Programm, zwei
 * Texturen, Kontextverlust als behandelter Fall. Dieselbe Bauweise wie
 * components/fog-canvas.tsx, die in dieser Sektion schon einmal getragen hat.
 *
 * ── Wie die Wellen entstehen ────────────────────────────────────────────────
 * NICHT über eine Wellengleichung mit zwei Framebuffern. Das wäre die
 * lehrbuchrichtige Lösung und hier die falsche: sie braucht Fließkomma-
 * Texturen (eine Erweiterung, die nicht überall da ist), zwei zusätzliche
 * Renderziele und einen Zustand, der über Bilder hinweg konsistent bleiben
 * muss — drei Dinge, die kaputtgehen können, damit das Wasser physikalisch
 * korrekt ist, was niemand nachprüft.
 *
 * Stattdessen: eine Handvoll RINGE. Bewegt sich der Zeiger weit genug, wird
 * ein Ring gesetzt — Ort und Startzeit, mehr nicht. Jeder Ring ist eine
 * gedämpfte Sinuswelle, die nach außen läuft und verklingt; die Verschiebung
 * ist ihre Summe. Acht gleichzeitig sind mehr, als man je auslöst, und die
 * ganze Physik steht in vier Zeilen Shader.
 *
 * ── Was verzerrt wird ───────────────────────────────────────────────────────
 * Beide Platten, kalt und Licht, weil sie zwei Hälften derselben Aufnahme sind
 * und ein Pixel Versatz zwischen ihnen sich als Licht liest, das neben seiner
 * Quelle sitzt. Der Nebel darüber und die Tönung bleiben DOM und wabern NICHT
 * mit: der Nebel ist Wetter vor dem Bild, keine Eigenschaft des Bildes.
 */

import { useEffect, useRef, type ReactNode } from "react";

export interface RippleCanvasProps {
  cold: string;
  glow: string;
  /** Der Faktor, mit dem die zu hell gespeicherten Platten gedämpft werden. */
  exposure: number;
  /** Deckkraft der Lichtplatte, als Getter — der Scroll schreibt sie. */
  read: () => { ember: number; plate: number };
  className?: string;
}

const MAX_RIPPLES = 8;

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// KEINE BACKTICKS in diesem String — er steht in einem Template-Literal, und
// ein Backtick in einem GLSL-Kommentar beendet ihn. Der Fehler erscheint dann
// zwanzig Zeilen spaeter an einer voellig gesunden Stelle.
const FRAG = `
precision highp float;
varying vec2 vUv;

uniform sampler2D uCold;
uniform sampler2D uGlow;
uniform vec2  uRes;
uniform float uTexAspect;
uniform float uTime;
uniform float uExposure;
uniform float uEmber;
uniform float uPlate;
uniform vec3  uRipples[${MAX_RIPPLES}];   // x, y, Startzeit

// Wellenlaenge, Ausbreitung, Daempfung. AMP ist absichtlich winzig: mehr als
// ein Prozent Verschiebung ist keine Wasseroberflaeche mehr, sondern eine
// Linse.
const float SPEED = 0.34;
const float FREQ  = 44.0;
const float DECAY = 2.6;    // wie schnell ein Ring mit der Zeit verklingt
const float WIDTH = 0.13;   // Breite der Front, in Bildschirmbreiten
const float AMP   = 0.010;

void main() {
  float screenAspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  if (screenAspect > uTexAspect) {
    uv.y = (uv.y - 0.5) * (uTexAspect / screenAspect) + 0.5;
  } else {
    uv.x = (uv.x - 0.5) * (screenAspect / uTexAspect) + 0.5;
  }

  // Die Ringe werden im BILDSCHIRM-Seitenverhaeltnis gerechnet, nicht in uv:
  // sonst ist ein Ring auf einem breiten Fenster ein Ei.
  vec2 p = vec2(vUv.x * screenAspect, vUv.y);
  vec2 push = vec2(0.0);

  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec3 r = uRipples[i];
    float age = uTime - r.z;
    if (r.z <= 0.0 || age < 0.0 || age > 4.0) continue;

    vec2 d = p - vec2(r.x * screenAspect, r.y);
    float dist = length(d);
    float front = dist - age * SPEED;                 // wo die Front steht
    // Nur in einem Band um die Front passiert etwas. Ohne das schwingt die
    // ganze Flaeche mit und es sieht aus wie Wackelpudding.
    float band = exp(-front * front / (WIDTH * WIDTH));
    float wave = sin(front * FREQ) * band * exp(-age * DECAY);
    push += normalize(d + 1e-6) * wave;
  }

  vec2 warped = uv + push * AMP;

  vec3 cold = texture2D(uCold, warped).rgb * uExposure;
  vec3 glow = texture2D(uGlow, warped).rgb;
  vec3 col = 1.0 - (1.0 - cold) * (1.0 - glow * uEmber * 0.42);

  // Wo die Welle steht, faengt die Oberflaeche ausserdem einen Glanz. Das ist
  // der Unterschied zwischen einer verschobenen Textur und Wasser: eine
  // Woelbung reflektiert.
  float sheen = clamp(length(push) * 4.0, 0.0, 1.0);
  col += vec3(0.22, 0.13, 0.09) * sheen;

  gl_FragColor = vec4(col * uPlate, uPlate);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error("RippleCanvas:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** `unit` ist nicht optional: `onload` feuert irgendwann, und bis dahin ist
 *  längst eine andere Textureinheit aktiv. Ein `bindTexture` ohne vorheriges
 *  `activeTexture` bindet dann in die falsche — die zweite Platte überschreibt
 *  die erste, und der Shader liest zweimal dasselbe Bild. */
function loadTexture(
  gl: WebGLRenderingContext,
  unit: number,
  url: string,
  onReady: (aspect: number) => void,
): WebGLTexture | null {
  const tex = gl.createTexture();
  if (!tex) return null;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  const img = new Image();
  img.onload = () => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    onReady(img.naturalWidth / img.naturalHeight);
  };
  img.src = url;
  return tex;
}

export function RippleCanvas({
  cold,
  glow,
  exposure,
  read,
  className = "",
}: RippleCanvasProps): ReactNode {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", {
      alpha: true, antialias: false, depth: false, stencil: false,
      premultipliedAlpha: true, powerPreference: "low-power",
    });
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error("RippleCanvas:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      texAspect: gl.getUniformLocation(prog, "uTexAspect"),
      time: gl.getUniformLocation(prog, "uTime"),
      ember: gl.getUniformLocation(prog, "uEmber"),
      plate: gl.getUniformLocation(prog, "uPlate"),
      ripples: gl.getUniformLocation(prog, "uRipples"),
    };

    let aspect = 3 / 2;
    const texCold = loadTexture(gl, 0, cold, (a) => { aspect = a; });
    const texGlow = loadTexture(gl, 1, glow, () => undefined);
    gl.uniform1i(gl.getUniformLocation(prog, "uCold"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "uGlow"), 1);
    gl.uniform1f(gl.getUniformLocation(prog, "uExposure"), exposure);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Der Ringpuffer. Drei Zahlen pro Ring, und der aelteste wird ueberschrieben
    // — ohne Verwaltung, weil er ohnehin laengst verklungen ist.
    const ripples = new Float32Array(MAX_RIPPLES * 3);
    let slot = 0;
    let lastX = -1;
    let lastY = -1;
    let t0 = 0;
    let now = 0;

    const onMove = (e: PointerEvent): void => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height;
      // Erst ab einer Mindestdistanz ein neuer Ring: sonst setzt ein
      // langsam wandernder Zeiger sechzig pro Sekunde, sie ueberlagern sich
      // zu einer stehenden Welle, und der Effekt sieht aus wie ein Fehler.
      const d = Math.hypot(x - lastX, y - lastY);
      if (lastX >= 0 && d < 0.045) return;
      lastX = x;
      lastY = y;
      ripples[slot * 3] = x;
      ripples[slot * 3 + 1] = y;
      ripples[slot * 3 + 2] = now;
      slot = (slot + 1) % MAX_RIPPLES;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    const dpr = (): number => Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = (): void => {
      const w = Math.round(canvas.clientWidth * dpr());
      const h = Math.round(canvas.clientHeight * dpr());
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    };
    resize();
    window.addEventListener("resize", resize, { passive: true });

    let visible = true;
    const io = new IntersectionObserver((entries) => {
      const e = entries[0];
      if (!e) return;
      visible = e.isIntersecting;
      if (visible && raf === 0) raf = requestAnimationFrame(frame);
    }, { rootMargin: "10% 0px" });
    io.observe(canvas);

    let raf = 0;
    const frame = (t: number): void => {
      if (t0 === 0) t0 = t;
      now = (t - t0) / 1000;
      resize();
      const st = read();
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.texAspect, aspect);
      gl.uniform1f(u.time, now);
      gl.uniform1f(u.ember, st.ember);
      gl.uniform1f(u.plate, st.plate);
      gl.uniform3fv(u.ripples, ripples);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    raf = requestAnimationFrame(frame);

    // Ein verlorener Kontext ist ein Betriebszustand, keine Ausnahme.
    const onLost = (e: Event): void => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buf);
      gl.deleteTexture(texCold);
      gl.deleteTexture(texGlow);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [cold, glow, exposure, read]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export default RippleCanvas;
