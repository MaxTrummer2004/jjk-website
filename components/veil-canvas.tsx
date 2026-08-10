"use client";

/**
 * VeilCanvas — der Nebel, der den Hero auffrisst.
 *
 * ── Was hier passiert ──────────────────────────────────────────────────────
 * Eine Flaeche in der Farbe der Seite deckt den Hero zu, aber nicht als
 * gleichmaessige Blende: WANN ein Pixel gedeckt wird, steht in einer
 * Graustufenkarte (/img/veil-luma.webp). Dunkel geht zuerst, hell zuletzt.
 * Weil diese Karte aus echtem Nebel gerechnet ist — aus dem Alphakanal von
 * veil-smoke.webp, siehe scripts/gen-veil-luma.py —, hat die Deckung die Form
 * von Nebelschwaden und nicht die einer Blende.
 *
 * Der Shader ist "luma" aus gl-transitions (gre, MIT), mit einer Aenderung:
 * dort steht step(), hier ein smoothstep-Band. step() schneidet wie ein
 * Messer; das Band franst aus wie saugendes Papier. Ein weiches Band ist die
 * einzige Zeile Unterschied zwischen "Effekt" und "Wetter".
 *
 *   https://github.com/gl-transitions/gl-transitions  (transitions/luma.glsl)
 *
 * ── Warum das eine imperative Schnittstelle hat ────────────────────────────
 * Der Fortschritt kommt aus einem ScrollTrigger und aendert sich in jedem
 * Bild. Ein useState darauf waere ein React-Rendering pro Scrollpixel. Der
 * Aufrufer ruft stattdessen `set(p)` auf dem Ref; gezeichnet wird nur, wenn
 * sich der Wert wirklich geaendert hat.
 *
 * ── Wenn WebGL fehlt ───────────────────────────────────────────────────────
 * Dann zeichnet diese Ebene nichts, und der Uebergang haengt trotzdem nicht:
 * .jjk-gate-blackout deckt am Ende ohnehin flaechig zu. Diese Ebene macht den
 * Weg dorthin schoen, sie ist nicht dafuer zustaendig, dass er stattfindet.
 */

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ReactNode,
} from "react";

export interface VeilCanvasHandle {
  /** Fortschritt 0..1 setzen. 0 = nichts gedeckt, 1 = alles gedeckt. */
  set: (p: number) => void;
}

export interface VeilCanvasProps {
  className?: string;
  /** Pfad der Luma-Karte. */
  map?: string;
}

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

/* Kein Backtick in GLSL-Kommentaren — der beendet dieses Template-Literal,
   und der Syntaxfehler erscheint dann zwanzig Zeilen weiter unten. */
const FRAG = `
precision mediump float;
uniform sampler2D u_luma;
uniform float u_p;
uniform vec2 u_res;
uniform vec3 u_color;
void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  uv.y = 1.0 - uv.y;
  float m = texture2D(u_luma, uv).r;

  /* Die Bandbreite der weichen Kante. Der Fortschritt wird um sie herum
     gedehnt, damit p = 0 wirklich nichts und p = 1 wirklich alles deckt —
     ohne das bliebe an beiden Enden ein Rest stehen. */
  float w = 0.085;
  float p = u_p * (1.0 + 2.0 * w) - w;

  /* Die einzige Stelle, an der man sich in GLSL lautlos verrechnen kann:
     smoothstep mit edge0 >= edge1 ist UNDEFINIERT. Deshalb wird nie die
     Reihenfolge der Kanten getauscht, sondern das Ergebnis invertiert. */
  float a = 1.0 - smoothstep(p - w, p + w, m);
  gl_FragColor = vec4(u_color, a);
}
`;

function compile(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/** Die Farbe der Seite als 0..1-Tripel. Steht in CSS und nicht hier, damit es
 *  genau eine Stelle gibt, an der sie definiert ist. */
function pageColor(): [number, number, number] {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--background")
    .trim();
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(raw);
  if (!m) return [7 / 255, 7 / 255, 10 / 255];
  return [
    parseInt(m[1] ?? "07", 16) / 255,
    parseInt(m[2] ?? "07", 16) / 255,
    parseInt(m[3] ?? "0a", 16) / 255,
  ];
}

export const VeilCanvas = forwardRef<VeilCanvasHandle, VeilCanvasProps>(
  function VeilCanvas({ className, map = "/img/veil-luma.webp" }, ref): ReactNode {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawRef = useRef<((p: number) => void) | null>(null);
    const lastRef = useRef(-1);
    const pendingRef = useRef(0);

    useImperativeHandle(
      ref,
      () => ({
        set: (p: number): void => {
          pendingRef.current = p;
          const draw = drawRef.current;
          if (!draw) return;
          if (Math.abs(p - lastRef.current) < 0.0015) return;
          lastRef.current = p;
          draw(p);
        },
      }),
      [],
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const gl = canvas.getContext("webgl", {
        alpha: true,
        premultipliedAlpha: false,
        antialias: false,
        depth: false,
        stencil: false,
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
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 3, -1, -1, 3]),
        gl.STATIC_DRAW,
      );
      const aPos = gl.getAttribLocation(prog, "a_pos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      const uP = gl.getUniformLocation(prog, "u_p");
      const uRes = gl.getUniformLocation(prog, "u_res");
      const uColor = gl.getUniformLocation(prog, "u_color");
      gl.uniform1i(gl.getUniformLocation(prog, "u_luma"), 0);

      const c = pageColor();
      if (uColor) gl.uniform3f(uColor, c[0], c[1], c[2]);

      let ready = false;

      const size = (): void => {
        // Halbe Aufloesung reicht: was gezeichnet wird, ist eine weiche
        // Nebelkante ohne Detail. Das spart auf grossen Schirmen spuerbar
        // Fuellrate, waehrend gleichzeitig der Hero-Shader laeuft.
        const d = Math.min(window.devicePixelRatio || 1, 1.5) * 0.5;
        const w = Math.max(2, Math.round(canvas.clientWidth * d));
        const h = Math.max(2, Math.round(canvas.clientHeight * d));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        gl.viewport(0, 0, canvas.width, canvas.height);
        if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      };

      const draw = (p: number): void => {
        if (!ready) return;
        size();
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (p <= 0.0005) return;
        if (uP) gl.uniform1f(uP, p);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      };

      const tex = gl.createTexture();
      const img = new Image();
      img.onload = (): void => {
        // activeTexture VOR bindTexture. Andernfalls landen mehrere Texturen
        // in derselben Einheit und die letzte gewinnt — in diesem Projekt
        // schon einmal als "flaches Braun ohne Motiv" aufgetreten.
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.LUMINANCE,
          gl.LUMINANCE,
          gl.UNSIGNED_BYTE,
          img,
        );
        // Die Karte ist nicht zweierpotent. CLAMP_TO_EDGE und LINEAR sind
        // dafuer die einzige zulaessige Kombination ohne Mipmaps.
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        ready = true;
        draw(pendingRef.current);
      };
      img.src = map;

      drawRef.current = draw;

      const onResize = (): void => draw(pendingRef.current);
      window.addEventListener("resize", onResize);

      const onLost = (e: Event): void => {
        e.preventDefault();
        ready = false;
        drawRef.current = null;
      };
      canvas.addEventListener("webglcontextlost", onLost);

      return () => {
        window.removeEventListener("resize", onResize);
        canvas.removeEventListener("webglcontextlost", onLost);
        drawRef.current = null;
      };
    }, [map]);

    return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
  },
);

export default VeilCanvas;
