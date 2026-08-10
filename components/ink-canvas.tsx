"use client";

/**
 * Ink-Canvas — WebGL-Overlay fuer den Tusche-Seitenuebergang.
 *
 * Positionierung: position:fixed, inset:0, z-index:9999, pointer-events:none.
 * Beim progress=0 wird der Canvas nicht gezeichnet (Seite transparent).
 * Beim progress=1 ist die Seite vollstaendig mit schwarzer "Tusche" bedeckt.
 *
 * Shader: luma-Karte (/img/ink-luma.webp) steuert die Reihenfolge.
 * Dunkle Pixel (niedrige Luma) werden zuerst opak — wie Tinte, die vom
 * Strich nach aussen waechst. smoothstep(l-0.04, l+0.04, progress) statt
 * step(), damit die Kante weich wie Papier ist und nicht scharf wie Messer.
 * Kanten-Parameter immer l-band < l+band: niemals vertauschen (GLSL-Regel).
 *
 * Fehlerbehandlung: kein WebGL -> sofort navigieren (via setWebGLAvailable).
 * Kontextverlust -> Fallback, kein Haengenbleiben.
 */

import { useEffect, useRef, useState } from "react";
import { useInkTransition } from "@/lib/ink-transition-context";

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

/* Kein Backtick in GLSL-Kommentaren. Dieser Kommentar ist in JS. */
const FRAG = `
precision mediump float;
uniform sampler2D u_luma;
uniform float u_progress;
uniform vec2 u_resolution;
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  uv.y = 1.0 - uv.y;
  float l = texture2D(u_luma, uv).r;
  float alpha = smoothstep(l - 0.04, l + 0.04, u_progress);
  gl_FragColor = vec4(0.0, 0.0, 0.0, alpha);
}
`;

interface GLState {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  uProgress: WebGLUniformLocation;
  uResolution: WebGLUniformLocation;
  texReady: boolean;
}

function compileShader(
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

function buildProgram(gl: WebGLRenderingContext): WebGLProgram | null {
  const v = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const f = compileShader(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!v || !f) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, v);
  gl.attachShader(prog, f);
  gl.linkProgram(prog);
  gl.deleteShader(v);
  gl.deleteShader(f);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return prog;
}

function initGL(
  canvas: HTMLCanvasElement,
  onFail: () => void,
): GLState | null {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    premultipliedAlpha: false,
    antialias: false,
  }) as WebGLRenderingContext | null;
  if (!gl) { onFail(); return null; }

  const program = buildProgram(gl);
  if (!program) { onFail(); return null; }

  /* Fullscreen quad als zwei Dreiecke im TRIANGLE_STRIP. */
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const aPos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  gl.useProgram(program);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const uProgress = gl.getUniformLocation(program, "u_progress");
  const uResolution = gl.getUniformLocation(program, "u_resolution");
  const uLuma = gl.getUniformLocation(program, "u_luma");
  if (!uProgress || !uResolution || !uLuma) { onFail(); return null; }

  gl.uniform1i(uLuma, 0);

  const state: GLState = {
    gl,
    program,
    uProgress,
    uResolution,
    texReady: false,
  };

  /* Textur laden. activeTexture VOR bindTexture. */
  const tex = gl.createTexture();
  const img = new Image();
  img.onload = () => {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE,
      gl.UNSIGNED_BYTE, img,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    state.texReady = true;
  };
  img.onerror = onFail;
  img.src = "/img/ink-luma.webp";

  return state;
}

function draw(state: GLState, canvas: HTMLCanvasElement, progress: number) {
  if (!state.texReady) return;
  const { gl, uProgress, uResolution } = state;
  const w = canvas.width;
  const h = canvas.height;
  gl.viewport(0, 0, w, h);
  gl.uniform2f(uResolution, w, h);
  gl.uniform1f(uProgress, progress);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

export function InkCanvas(): React.ReactNode {
  const { progress, setWebGLAvailable } = useInkTransition();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GLState | null>(null);

  /* Dieser Uebergang wird erst gebraucht, wenn jemand klickt — es gibt keinen
     Grund, seinen WebGL-Kontext und seine Textur in dasselbe Bild zu legen wie
     den Aufbau der Seite. `requestIdleCallback` schiebt beides in die erste
     freie Luecke danach. Das Zeitlimit ist die Notbremse fuer Browser ohne
     diese Funktion. */
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };
    if (typeof w.requestIdleCallback === "function") {
      const handle = w.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(handle);
    }
    const t = window.setTimeout(() => setReady(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onFail = () => setWebGLAvailable(false);

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (glRef.current && progress > 0) {
        draw(glRef.current, canvas, progress);
      }
    };

    glRef.current = initGL(canvas, onFail);
    if (!glRef.current) return;

    resize();
    window.addEventListener("resize", resize);

    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      setWebGLAvailable(false);
    });
    canvas.addEventListener("webglcontextrestored", () => {
      glRef.current = initGL(canvas, onFail);
      setWebGLAvailable(true);
    });

    return () => {
      window.removeEventListener("resize", resize);
    };
    // `ready` gehoert in die Abhaengigkeiten: der Effekt laeuft beim ersten
    // Mal ins Leere, weil es den Canvas noch nicht gibt.
  }, [ready, setWebGLAvailable]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !glRef.current) return;
    if (progress === 0) {
      const { gl } = glRef.current;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      return;
    }
    draw(glRef.current, canvas, progress);
  }, [progress]);

  if (!ready) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        display: "block",
      }}
      aria-hidden="true"
    />
  );
}
