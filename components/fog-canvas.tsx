"use client";

/**
 * FogCanvas — zwei Platten, ein Nebelfeld, rohes WebGL.
 *
 * ── Warum kein three.js, obwohl es im Projekt liegt ─────────────────────────
 * Weil hier nichts dreidimensional ist. Was gebraucht wird, ist ein Rechteck in
 * Fenstergröße und ein Fragment-Shader; three.js brächte eine Szene, eine
 * Kamera, einen Renderer und ein Materialsystem mit, von denen kein Teil
 * benutzt würde. Dazu kommt die Erfahrung aus dem Wassereffekt über den
 * About-Ovalen: der Absturz `Cannot read properties of null (reading 'alpha')`
 * kam nicht vom Speicher, sondern vom ABRÄUMEN — `postprocessing` las die
 * Kontext-Attribute, nachdem der Kontext schon weg war. Hier gibt es nichts
 * abzuräumen, was das nicht überlebt: ein Kontext, ein Programm, zwei Texturen,
 * und der Kontextverlust ist ein behandelter Fall statt einer Ausnahme.
 *
 * ── Was der Shader tut ──────────────────────────────────────────────────────
 * Ein Rauschfeld (fBm, vier Oktaven Value-Noise) mit zwei Driftgeschwindig-
 * keiten, und es tut DREI Dinge gleichzeitig — das ist der ganze Trick, und
 * der Grund, warum der Effekt teuer aussieht und billig ist:
 *
 *   1  Es verschiebt die Bildkoordinaten um Bruchteile eines Prozents. Das
 *      Bild atmet. Ohne diesen Schritt liegt Nebel ÜBER einem Foto; mit ihm
 *      steht das Foto IM Nebel.
 *   2  Es liegt als Schwade darüber, unten dichter als oben, warm getönt dort,
 *      wo das Feuer ist, und kalt im Rest.
 *   3  Es ist die Auflösung: beim Verlassen der Sektion frisst dasselbe Feld
 *      das Bild in Zungen auf, statt es auszublenden.
 *
 * Punkt 3 ist der eigentliche Gewinn. Fünf Anläufe an Sektionsübergängen sind
 * an derselben Erkenntnis gescheitert — ein Übergang braucht einen Unterschied,
 * keine bessere Kurve — und der Nebel IST der Unterschied.
 *
 * ── Wie die Werte hereinkommen ──────────────────────────────────────────────
 * Über ein Ref, nicht über Props. Der Scroll schreibt sechzig Mal pro Sekunde;
 * ginge das durch React, wäre jeder Frame ein Renderdurchlauf des ganzen
 * Teilbaums. Der Aufrufer füllt `state.current`, die Schleife liest es.
 */

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

export interface FogState {
  /** Wie weit das Feuer angefacht ist. 0 = kalte Platte, 1 = volles Licht. */
  ember: number;
  /** Dichte der Schwaden. */
  fog: number;
  /** 0 = der Nebel ist Wetter, 1 = er IST die Nacht und deckt alles zu. */
  night: number;
}

export interface FogCanvasProps {
  cold: string;
  glow: string;
  /** Der Faktor, mit dem die zu hell gespeicherte Platte heruntergezogen wird. */
  exposure: number;
  state: RefObject<FogState>;
  className?: string;
}

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`;

// !! KEINE BACKTICKS in den beiden Shader-Strings unten. Sie stehen in
// Template-Literalen; ein Backtick in einem GLSL-KOMMENTAR beendet den String,
// und der Fehler erscheint als Syntaxfehler zwanzig Zeilen spaeter an einer
// Stelle, die voellig in Ordnung ist. Dreimal passiert.
// Value-Noise statt Simplex: ein Drittel des Codes, und bei vier Oktaven und
// einem Motiv, das absichtlich strukturlos ist, sieht niemand den Unterschied.
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
uniform float uFog;
uniform float uNight;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm3(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * vnoise(p); p = p * 2.03 + vec2(17.3, 9.1); a *= 0.5;
  }
  return v;
}

float fbm5(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * vnoise(p); p = p * 2.06 + vec2(11.7, 23.4); a *= 0.5;
  }
  return v;
}

// Der Erwartungswert von fbm ist 0.41 — GEMESSEN, mit einer Sonde, die das
// Feld als Graustufe ausgegeben hat, nicht geschaetzt. Und die Verteilung ist
// eng (plus/minus etwa 0.08), weil eine Summe von Zufallsgroessen nach dem
// zentralen Grenzwertsatz um ihren Mittelwert klumpt. Jede Schwelle, die man
// ohne Spreizung darauf setzt, schneidet mitten in diesen Klumpen: die Dichte
// lag dreimal hintereinander zwischen 0.07 und 0.11, und ein Nebel mit acht
// Prozent Deckkraft ist keiner. Deshalb geht KEIN Rauschwert ungespreizt in
// eine Schwelle.
float spread(float v, float k) { return (v - 0.41) * k + 0.5; }

void main() {
  // ---- cover ------------------------------------------------------------
  // Dasselbe wie object-fit: cover, aber im Shader, weil die Textur danach
  // noch verschoben wird und ein CSS-Beschnitt dann nicht mehr stimmen wuerde.
  float screenAspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  if (screenAspect > uTexAspect) {
    uv.y = (uv.y - 0.5) * (uTexAspect / screenAspect) + 0.5;
  } else {
    uv.x = (uv.x - 0.5) * (screenAspect / uTexAspect) + 0.5;
  }
  vec2 q = vec2(uv.x * uTexAspect, uv.y);

  // ---- DOMAIN WARPING ---------------------------------------------------
  // Der Unterschied zwischen driftendem Rauschen und Nebel. Rauschen, das man
  // nur verschiebt, behaelt seine Form — dieselben Ballen wandern starr durchs
  // Bild wie eine Tapete hinter einem Fenster. Echter Nebel VERFORMT sich beim
  // Ziehen: er wird gestreckt, gefaltet, aufgerissen. Erreicht wird das, indem
  // die Koordinaten selbst mit Rauschen verbogen werden, bevor das eigentliche
  // Feld daraus gelesen wird. Kostet einen zweiten Rauschaufruf und traegt die
  // gesamte Glaubwuerdigkeit des Effekts.
  vec2 w = vec2(
    fbm3(q * 1.30 + vec2(uTime * -0.0090, uTime * 0.0040)),
    fbm3(q * 1.30 + vec2(5.7, 2.3) + vec2(uTime * -0.0062, uTime * -0.0031))
  ) - 0.41;

  // ---- Drei Schichten ---------------------------------------------------
  // Fern gross und langsam, nah klein und schnell — die einzige Tiefe, die ein
  // flaches Bild haben kann. ALLE nach links: gegenlaeufige Lagen heben sich
  // auf und der Nebel steht (der erste Versuch). Und langsam, denn mehr als
  // etwa zwei Prozent der Bildbreite pro Sekunde sieht aus, als zoege jemand
  // ein Tuch weg.
  float far  = fbm5(q * 0.85 + w * 1.05 + vec2(uTime * -0.0115, uTime * 0.0018));
  float mid  = fbm5(q * 1.90 + w * 0.75 + vec2(uTime * -0.0230, uTime * -0.0026));
  float near = fbm3(q * 3.90 + w * 0.45 + vec2(uTime * -0.0420, uTime * 0.0044));
  float field = spread(far * 0.52 + mid * 0.32 + near * 0.16, 4.0);

  // Die Baenke: eine vierte, sehr grosse Lage, die selbst nichts zeichnet,
  // sondern entscheidet, WO ueberhaupt Nebel liegt. Anisotrop, weil Baenke
  // horizontal lang und vertikal flach sind — 0.80 zu 2.20 heisst knapp drei
  // mal so breit wie hoch. Und mitverbogen, sonst driftet eine starre Maske
  // ueber ein verformtes Feld, und genau das sieht man.
  //
  // Die Frequenz ist hier kritisch: bei 0.42 lag ueber den ganzen Bildschirm
  // WENIGER ALS EINE Rauschzelle, der Wert war konstant 0.08, und die Maske
  // hat alles gleichmaessig auf ein Zwoelftel gedrueckt.
  float macro = spread(fbm3(vec2(q.x * 0.80, q.y * 2.20) + w * 0.60
                            + vec2(uTime * -0.0125, uTime * 0.0014)), 2.0);
  float banks = mix(0.22, 1.0, smoothstep(0.10, 0.90, macro));

  // ---- Das Bild atmet ---------------------------------------------------
  // Dasselbe Feld verschiebt die Bildkoordinaten um Bruchteile eines Prozents.
  // Ohne diesen Schritt liegt Nebel UEBER einem Bild; mit ihm ist er die Luft,
  // in der das Bild steht. Mehr als ein halbes Prozent wird zur
  // Wasseroberflaeche.
  vec2 warp = w * 0.011 * (0.35 + uFog);
  vec3 cold = texture2D(uCold, uv + warp).rgb * uExposure;
  vec3 glow = texture2D(uGlow, uv + warp * 1.4).rgb;
  // 0.42, nicht 1.0: die Lichtplatte traegt ihren vollen Wertebereich, und
  // voll aufgeschlagen war der Hero ein orangefarbenes Wallpaper.
  vec3 col = 1.0 - (1.0 - cold) * (1.0 - glow * uEmber * 0.42);

  // ---- Verteilung -------------------------------------------------------
  // Ueberall, aber unten mehr: Nebel sammelt sich am Boden und duennt nach
  // oben aus — er hoert dort nur nicht auf. Selbst ganz oben bleiben 45
  // Prozent, sonst ist die obere Bildhaelfte eine andere Aufnahme.
  //
  // Mit 1.0 minus, NICHT mit vertauschten smoothstep-Kanten: edge0 >= edge1
  // ist laut GLSL-Spezifikation UNDEFINIERT. Ein vertauschtes Paar compiliert
  // anstandslos, laeuft, und liefert je nach Treiber etwas anderes — hier war
  // es konstant null, zweimal, ohne eine einzige Fehlermeldung.
  float low = 1.0 - smoothstep(0.0, 1.05, vUv.y);
  float height = 0.45 + 0.55 * low;

  // Die untersten Zeilen sind GESCHLOSSEN: dort wird die Rauschmaske
  // ueberblendet statt multipliziert. Sonst reissen auch am Boden Loecher auf,
  // und eine Nebeldecke mit Loechern im Boden ist keine.
  float closed = smoothstep(0.0, 0.22, vUv.y);
  float density = clamp(mix(1.0, smoothstep(0.18, 0.80, field) * banks, closed)
                        * height * uFog * 1.55, 0.0, 1.0);

  // ---- Die Farbe --------------------------------------------------------
  // HELL, und das war der Grund, warum der Nebel zweimal unsichtbar blieb: er
  // lag bei 0.15, also 38 von 255, auf einem Bild, das an den hellen Stellen
  // ueber 150 steht. Ein Nebel, der DUNKLER ist als das, was hinter ihm liegt,
  // dunkelt ab; nebeln tut er nicht. Nebel STREUT Licht und ist deshalb immer
  // heller als sein Hintergrund. Ueber dem Feuer verschwindet er von allein,
  // und das ist richtig so.
  //
  // Nur zur Haelfte warm: ein Nebel, der die Farbe des Feuers vollstaendig
  // annimmt, ist kein Nebel mehr, sondern Rauch, und das Bild wird braun.
  float warmth = clamp(dot(glow, vec3(0.4)) * 3.0, 0.0, 1.0) * 0.55
                 * (1.0 - uNight);
  vec3 fogCol = mix(vec3(0.52, 0.500, 0.512), vec3(0.82, 0.545, 0.365), warmth);

  // Zur Nacht hin kippt genau diese Farbe durch: erst weiss, dann grau, dann
  // Nacht. DAS ist der Uebergang — der Nebel blendet das Bild nicht aus, er
  // zieht es zu und wird dabei selbst zu dem Dunkel, in dem die Wand darunter
  // liegt. Ein Effekt, der zwei Dinge gleichzeitig tut, braucht kein drittes.
  fogCol = mix(fogCol, vec3(0.012, 0.012, 0.014), smoothstep(0.15, 0.85, uNight));

  // mix statt Aufaddieren: aufaddierter Nebel wird hell und bleibt trotzdem
  // durchsichtig, gemischter deckt.
  col = mix(col, fogCol, density);

  // Die letzten Prozent nehmen den Canvas ganz heraus, damit unter der
  // klebenden Buehne nichts mehr rechnet, was ohnehin einfarbig ist.
  float alpha = 1.0 - smoothstep(0.82, 1.0, uNight);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    // Nicht werfen: ein Hero ohne Nebel ist ein Hero, ein Hero mit einer
    // Ausnahme im Render ist eine weiße Seite.
    console.error("FogCanvas:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

/**
 * `unit` ist nicht optional und der Grund dafuer hat einen Nachmittag gekostet:
 * `onload` feuert IRGENDWANN, und bis dahin hat das Setup laengst eine andere
 * Textureinheit aktiv geschaltet. Ein `bindTexture` ohne vorheriges
 * `activeTexture` bindet dann in die falsche Einheit — die zweite Platte
 * ueberschreibt die erste, und der Shader liest zweimal dasselbe Bild oder
 * zweimal nichts. Sichtbar war das als flaches Braun ohne Motiv.
 */
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
  // Ein Pixel, bis das Bild da ist — sonst ist die Textur „incomplete" und
  // der erste Frame schwarz mit einer Warnung in der Konsole.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  const img = new Image();
  img.crossOrigin = "anonymous";
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

export function FogCanvas({
  cold,
  glow,
  exposure,
  state,
  className = "",
}: FogCanvasProps): ReactNode {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      // Das Bild wird über einen dunklen Grund gelegt und trägt sein Alpha
      // selbst — ohne das multipliziert der Compositor ein zweites Mal.
      premultipliedAlpha: true,
      powerPreference: "low-power",
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
      console.error("FogCanvas:", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, "uRes"),
      texAspect: gl.getUniformLocation(prog, "uTexAspect"),
      time: gl.getUniformLocation(prog, "uTime"),
      exposure: gl.getUniformLocation(prog, "uExposure"),
      ember: gl.getUniformLocation(prog, "uEmber"),
      fog: gl.getUniformLocation(prog, "uFog"),
      night: gl.getUniformLocation(prog, "uNight"),
    };

    let aspect = 16 / 10;
    const texCold = loadTexture(gl, 0, cold, (a) => {
      aspect = a;
    });
    const texGlow = loadTexture(gl, 1, glow, () => undefined);
    gl.uniform1i(gl.getUniformLocation(prog, "uCold"), 0);
    gl.uniform1i(gl.getUniformLocation(prog, "uGlow"), 1);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.uniform1f(u.exposure, exposure);

    // Die Auflösung des Canvas ist eine Kostenfrage, keine Qualitätsfrage:
    // unter driftendem Nebel ist zwischen 1× und 2× Gerätepixeln nichts zu
    // sehen, aber die Füllrate vervierfacht sich. Seit der Shader mit Domain
    // Warping arbeitet, sind es 22 Rauschabtastungen pro Pixel — bei 1.5× auf
    // einem 4K-Schirm wären das über 200 Millionen pro Bild. Ein Bild, das
    // absichtlich keine harte Kante enthält, braucht keine Gerätepixel.
    const dpr = (): number => Math.min(window.devicePixelRatio || 1, 1.0);
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

    // Läuft nur, solange die Sektion zu sehen ist. Ein Vollbild-Shader, der
    // unter zehn Bildschirmen Inhalt weiterrechnet, ist der Grund, warum
    // Lüfter angehen.
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        visible = e.isIntersecting;
        if (visible && raf === 0) raf = requestAnimationFrame(frame);
      },
      { rootMargin: "10% 0px" },
    );
    io.observe(canvas);

    let raf = 0;
    let t0 = 0;
    const frame = (t: number): void => {
      if (t0 === 0) t0 = t;
      resize();
      const s = state.current;
      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.texAspect, aspect);
      gl.uniform1f(u.time, (t - t0) / 1000);
      gl.uniform1f(u.ember, s?.ember ?? 0);
      gl.uniform1f(u.fog, s?.fog ?? 0.5);
      gl.uniform1f(u.night, s?.night ?? 0);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = visible ? requestAnimationFrame(frame) : 0;
    };
    raf = requestAnimationFrame(frame);

    // Ein verlorener Kontext ist ein normaler Betriebszustand (Tab lange im
    // Hintergrund, Grafiktreiber neu gestartet) und keine Ausnahme. Ohne das
    // Abfangen läuft die Schleife weiter und wirft bei jedem Frame.
    const onLost = (e: Event): void => {
      e.preventDefault();
      cancelAnimationFrame(raf);
      raf = 0;
    };
    canvas.addEventListener("webglcontextlost", onLost);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteBuffer(buf);
      gl.deleteTexture(texCold);
      gl.deleteTexture(texGlow);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [cold, glow, exposure, state]);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}

export default FogCanvas;
