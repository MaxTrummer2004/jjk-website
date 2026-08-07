"use client";

/**
 * EmberSmoke — the single WebGL layer on the site.
 *
 * A volumetric fbm smoke plume that follows the pointer, coloured like the
 * candle shot in the JJK opening: deep red body, orange mid, hot amber core.
 * Adapted from the React Bits GhostCursor shader.
 *
 * Design notes:
 *  - ONE canvas for the whole page (fixed, full viewport) so there is exactly
 *    one WebGL context no matter how many sections use the effect.
 *  - The render loop parks itself when the trail has fully faded, so an idle
 *    tab costs nothing.
 *  - Disabled entirely on coarse pointers and under prefers-reduced-motion.
 */

import { useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { useReducedMotion } from "@/lib/motion";

export interface EmberSmokeProps {
  className?: string;
  style?: CSSProperties;
  /** Number of stored trail points — longer means a longer smear. */
  trailLength?: number;
  /** Velocity retained after the pointer stops (0–1). */
  inertia?: number;
  /**
   * Size of the plume around the pointer, as a multiplier on the shader's
   * base radius. 1 is the original React Bits blob — far too big for a cursor
   * effect; the default here keeps it a tight puff of smoke.
   */
  radius?: number;
  /**
   * Overall opacity of the plume. Below 1 it stops being smoke you cannot see
   * through and starts being light — which is what the candlelit section wants.
   */
  alpha?: number;
  /**
   * Whether the plume responds to the pointer. Flipping this to false fades the
   * trail out and parks the render loop, but keeps the WebGL context alive —
   * unmounting the component instead would tear the context down and rebuild it
   * on every scroll across the boundary.
   */
  active?: boolean;
  grainIntensity?: number;
  bloomStrength?: number;
  bloomRadius?: number;
  bloomThreshold?: number;
  brightness?: number;
  /** Body colour of the plume. */
  color?: string;
  /** Hot core colour mixed into the plume. */
  coreColor?: string;
  mixBlendMode?: CSSProperties["mixBlendMode"];
  edgeIntensity?: number;
  maxDevicePixelRatio?: number;
  targetPixels?: number;
  fadeDelayMs?: number;
  fadeDurationMs?: number;
  zIndex?: number;
}

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform float iTime;
  uniform vec3  iResolution;
  uniform vec2  iMouse;
  uniform vec2  iPrevMouse[MAX_TRAIL_LENGTH];
  uniform float iOpacity;
  uniform float iScale;
  uniform float iRadius;
  uniform float iAlpha;
  uniform vec3  iBaseColor;
  uniform vec3  iCoreColor;
  uniform float iBrightness;
  uniform float iEdgeIntensity;
  varying vec2  vUv;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f *= f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
  }

  float fbm(vec2 p){
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p = m * p * 2.0;
      a *= 0.5;
    }
    return v;
  }

  // Horizontal squash so the plume reads as a rising column, not a ball.
  const vec2 SQUASH = vec2(1.35, 1.0);

  vec4 plume(vec2 p, vec2 origin, float intensity, float reach) {
    // Smoke drifts upward, so bias the domain warp along -y over time.
    vec2 drift = vec2(0.0, iTime * 0.06);
    vec2 q = vec2(fbm(p * iScale + drift + iTime * 0.10),
                  fbm(p * iScale + drift + vec2(5.2, 1.3) + iTime * 0.10));
    vec2 r = vec2(fbm(p * iScale + q * 1.5 + iTime * 0.15),
                  fbm(p * iScale + q * 1.5 + vec2(8.3, 2.8) + iTime * 0.15));
    float smoke = fbm(p * iScale + r * 0.8);

    float distFactor = 1.0 - smoothstep(0.0, reach, length((p - origin) * SQUASH));

    float alpha = pow(smoke, 2.5) * distFactor;

    // Hot core near the origin, cooling to deep red at the edges.
    float heat = pow(clamp(distFactor, 0.0, 1.0), 2.2);
    vec3 col = mix(iBaseColor, iCoreColor, heat * (0.55 + 0.45 * sin(iTime * 0.7)));

    return vec4(col * alpha * intensity, alpha * intensity);
  }

  void main() {
    vec2 aspect = vec2(iResolution.x / iResolution.y, 1.0);
    vec2 uv = (gl_FragCoord.xy / iResolution.xy * 2.0 - 1.0) * aspect;
    vec2 mouse = (iMouse * 2.0 - 1.0) * aspect;

    // How far one puff reaches. Beyond it the contribution is exactly zero,
    // which is what makes the early-outs below safe.
    //
    // Deliberately NOT scaled by iOpacity: the original React Bits shader
    // shrank the blob while it faded in, which reads as the smoke lagging
    // behind the cursor. Size is constant now; only alpha fades.
    float reach = (0.5 + 0.3 * (1.0 / iScale)) * iRadius;

    vec3 colorAcc = vec3(0.0);
    float alphaAcc = 0.0;

    if (length((uv - mouse) * SQUASH) < reach) {
      vec4 head = plume(uv, mouse, 1.0, reach);
      colorAcc += head.rgb;
      alphaAcc += head.a;
    }

    for (int i = 0; i < MAX_TRAIL_LENGTH; i++) {
      vec2 pm = (iPrevMouse[i] * 2.0 - 1.0) * aspect;
      float t = 1.0 - float(i) / float(MAX_TRAIL_LENGTH);
      t = pow(t, 2.0);
      if (t <= 0.01) continue;
      // Cull by distance before touching fbm. plume() costs five octaves times
      // three calls, and this loop runs per trail point per pixel — without the
      // cull a full-screen canvas melts even on decent hardware.
      if (length((uv - pm) * SQUASH) >= reach) continue;
      vec4 bt = plume(uv, pm, t * 0.8, reach);
      colorAcc += bt.rgb;
      alphaAcc += bt.a;
    }

    colorAcc *= iBrightness;

    vec2 uv01 = gl_FragCoord.xy / iResolution.xy;
    float edgeDist = min(min(uv01.x, 1.0 - uv01.x), min(uv01.y, 1.0 - uv01.y));
    float distFromEdge = clamp(edgeDist * 2.0, 0.0, 1.0);
    float k = clamp(iEdgeIntensity, 0.0, 1.0);
    float edgeMask = mix(1.0 - k, 1.0, distFromEdge);

    gl_FragColor = vec4(colorAcc, clamp(alphaAcc * iOpacity * edgeMask * iAlpha, 0.0, 1.0));
  }
`;

const UNPREMULTIPLY = {
  uniforms: { tDiffuse: { value: null as THREE.Texture | null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float a = max(c.a, 1e-5);
      gl_FragColor = vec4(clamp(c.rgb / a, 0.0, 1.0), c.a);
    }
  `,
};

export default function EmberSmoke({
  className = "",
  style,
  trailLength = 30,
  inertia = 0.55,
  radius = 0.45,
  alpha = 1,
  active = true,
  grainIntensity = 0.08,
  bloomStrength = 0.55,
  bloomRadius = 1.1,
  bloomThreshold = 0.02,
  brightness = 1.15,
  color = "#b3141c",
  coreColor = "#ff9c3c",
  mixBlendMode = "screen",
  edgeIntensity = 0.35,
  maxDevicePixelRatio = 0.75,
  targetPixels,
  fadeDelayMs = 900,
  fadeDurationMs = 2200,
  zIndex = 5,
}: EmberSmokeProps): ReactNode {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const activeRef = useRef(active);
  const wakeRef = useRef<(() => void) | null>(null);
  // Radius and alpha are refs, not dependencies. As dependencies they would
  // tear down and rebuild the WebGL context every time the pointer crossed a
  // section boundary — the same trap `active` fell into.
  const radiusRef = useRef(radius);
  const alphaRef = useRef(alpha);

  useEffect(() => {
    radiusRef.current = radius;
    alphaRef.current = alpha;
    wakeRef.current?.();
  }, [radius, alpha]);

  // Kept in a ref so toggling `active` never re-runs the GL setup effect.
  useEffect(() => {
    activeRef.current = active;
    // Wake the loop so the trail can fade out rather than freezing on screen.
    wakeRef.current?.();
  }, [active]);

  const pixelBudget = targetPixels ?? 0.85e6;
  const mergedStyle = useMemo<CSSProperties>(() => ({ zIndex, ...style }), [zIndex, style]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || prefersReducedMotion) return;
    if (typeof window === "undefined") return;
    // Pointer-driven effect: pointless (and costly) on touch devices.
    if (!window.matchMedia("(pointer: fine)").matches) return;

    let alive = true; // effect-local liveness flag, distinct from the `active` prop
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        depth: false,
        stencil: false,
        powerPreference: "high-performance",
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
      });
    } catch {
      // No WebGL — the CSS atmosphere already carries the look.
      return;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    if (mixBlendMode) renderer.domElement.style.mixBlendMode = String(mixBlendMode);
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);

    const maxTrail = Math.max(1, Math.floor(trailLength));
    const trail: THREE.Vector2[] = Array.from(
      { length: maxTrail },
      () => new THREE.Vector2(0.5, 0.5)
    );
    let head = 0;

    const base = new THREE.Color(color);
    const core = new THREE.Color(coreColor);

    // Kept in a local so TypeScript keeps the literal shape — indexing through
    // `material.uniforms` would widen every entry to `IUniform | undefined`.
    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector3(1, 1, 1) },
      iMouse: { value: new THREE.Vector2(0.5, 0.5) },
      iPrevMouse: { value: trail.map((v) => v.clone()) },
      iOpacity: { value: 0 },
      iScale: { value: 1 },
      iRadius: { value: radius },
      iAlpha: { value: alpha },
      iBaseColor: { value: new THREE.Vector3(base.r, base.g, base.b) },
      iCoreColor: { value: new THREE.Vector3(core.r, core.g, core.b) },
      iBrightness: { value: brightness },
      iEdgeIntensity: { value: edgeIntensity },
    };

    const material = new THREE.ShaderMaterial({
      defines: { MAX_TRAIL_LENGTH: maxTrail },
      uniforms,
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    scene.add(new THREE.Mesh(geometry, material));

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    );
    composer.addPass(bloom);

    const filmUniforms = {
      tDiffuse: { value: null as THREE.Texture | null },
      iTime: { value: 0 },
      intensity: { value: grainIntensity },
    };

    const filmPass = new ShaderPass({
      uniforms: filmUniforms,
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main(){
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform float iTime;
        uniform float intensity;
        varying vec2 vUv;
        float hash1(float n){ return fract(sin(n) * 43758.5453); }
        void main(){
          vec4 color = texture2D(tDiffuse, vUv);
          float n = hash1(vUv.x * 1000.0 + vUv.y * 2000.0 + iTime) * 2.0 - 1.0;
          color.rgb += n * intensity * color.rgb;
          gl_FragColor = color;
        }
      `,
    });
    composer.addPass(filmPass);
    composer.addPass(new ShaderPass(UNPREMULTIPLY));

    let hasValidSize = false;

    const resize = (): void => {
      if (!alive) return;
      const w = Math.floor(window.innerWidth);
      const h = Math.floor(window.innerHeight);
      if (w <= 0 || h <= 0) {
        hasValidSize = false;
        return;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, maxDevicePixelRatio);
      const need = w * h * dpr * dpr;
      const scale =
        need <= pixelBudget ? 1 : Math.max(0.5, Math.min(1, Math.sqrt(pixelBudget / Math.max(1, need))));
      const pixelRatio = dpr * scale;

      renderer.setPixelRatio(pixelRatio);
      renderer.setSize(w, h, false);
      composer.setPixelRatio?.(pixelRatio);
      composer.setSize(w, h);

      const wpx = Math.max(1, Math.floor(w * pixelRatio));
      const hpx = Math.max(1, Math.floor(h * pixelRatio));
      uniforms.iResolution.value.set(wpx, hpx, 1);
      uniforms.iScale.value = Math.max(
        0.5,
        Math.min(2, Math.min(Math.max(1, w), Math.max(1, h)) / 600)
      );
      // Half-res bloom. UnrealBloomPass runs a five-level mip chain every
      // frame and is by far the most expensive thing in the composer; at this
      // blur radius the lost detail is invisible and it costs a quarter as much.
      bloom.setSize(Math.max(1, Math.round(wpx * 0.5)), Math.max(1, Math.round(hpx * 0.5)));
      hasValidSize = true;
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });

    const start = performance.now();
    const currentMouse = new THREE.Vector2(0.5, 0.5);
    const velocity = new THREE.Vector2(0, 0);
    let fadeOpacity = 0;
    let lastMoveTime = performance.now();
    let pointerActive = false;
    let running = false;
    let raf: number | null = null;

    // Last position written into the trail, in normalised screen space. The
    // gap between this and the live pointer is what gets interpolated below.
    const lastSampled = new THREE.Vector2(0.5, 0.5);
    // Spacing between trail samples, normalised. Roughly a fifth of the plume
    // radius, so consecutive puffs overlap and read as one continuous ribbon.
    const SAMPLE_STEP = 0.012;

    const animate = (): void => {
      if (!alive) return;
      if (!hasValidSize) {
        raf = requestAnimationFrame(animate);
        return;
      }

      const now = performance.now();
      const t = (now - start) / 1000;

      const mouse = uniforms.iMouse.value;

      if (!activeRef.current) pointerActive = false;

      if (pointerActive) {
        velocity.set(currentMouse.x - mouse.x, currentMouse.y - mouse.y);
        mouse.copy(currentMouse);
        // Ramp in fast. The old 0.06/frame took ~17 frames to reach full
        // opacity, which looked exactly like the smoke failing to keep up.
        fadeOpacity = Math.min(1, fadeOpacity + 0.3);
      } else {
        velocity.multiplyScalar(inertia);
        if (velocity.lengthSq() > 1e-6) mouse.add(velocity);
        const dt = now - lastMoveTime;
        if (dt > fadeDelayMs) {
          fadeOpacity = Math.max(0, 1 - Math.min(1, (dt - fadeDelayMs) / fadeDurationMs));
        }
      }

      // Walk the ring buffer ALONG the path travelled since the last frame,
      // not one sample per frame. At a medium mouse speed the pointer moves
      // several hundred pixels between frames; one sample per frame leaves the
      // trail as a string of disconnected puffs, which is what read as
      // "the smoke can't follow" and as stuttering.
      const dx = mouse.x - lastSampled.x;
      const dy = mouse.y - lastSampled.y;
      const travelled = Math.hypot(dx, dy);
      const steps = Math.min(trail.length, Math.max(1, Math.ceil(travelled / SAMPLE_STEP)));
      for (let s = 1; s <= steps; s++) {
        const f = s / steps;
        head = (head + 1) % trail.length;
        trail[head]?.set(lastSampled.x + dx * f, lastSampled.y + dy * f);
      }
      lastSampled.copy(mouse);

      const arr = uniforms.iPrevMouse.value;
      for (let i = 0; i < trail.length; i++) {
        const dst = arr[i];
        const src = trail[(head - i + trail.length) % trail.length];
        if (dst && src) dst.copy(src);
      }

      // Ease toward the target rather than snapping: crossing into the
      // candlelit section should feel like the flame growing, not like a cut.
      uniforms.iRadius.value += (radiusRef.current - uniforms.iRadius.value) * 0.06;
      uniforms.iAlpha.value += (alphaRef.current - uniforms.iAlpha.value) * 0.06;

      uniforms.iOpacity.value = fadeOpacity;
      uniforms.iTime.value = t;
      filmUniforms.iTime.value = t;

      composer.render();

      if (!pointerActive && fadeOpacity <= 0.001) {
        running = false;
        raf = null;
        return;
      }
      raf = requestAnimationFrame(animate);
    };

    const ensureLoop = (): void => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(animate);
      }
    };
    wakeRef.current = ensureLoop;

    const onPointerMove = (e: PointerEvent): void => {
      if (!activeRef.current) return;
      const x = Math.min(1, Math.max(0, e.clientX / Math.max(1, window.innerWidth)));
      const y = Math.min(1, Math.max(0, 1 - e.clientY / Math.max(1, window.innerHeight)));
      currentMouse.set(x, y);
      pointerActive = true;
      lastMoveTime = performance.now();
      ensureLoop();
    };

    const onPointerOut = (e: PointerEvent): void => {
      if (e.relatedTarget) return;
      pointerActive = false;
      lastMoveTime = performance.now();
      ensureLoop();
    };

    const onVisibility = (): void => {
      if (document.hidden) {
        pointerActive = false;
        lastMoveTime = 0;
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      wakeRef.current = null;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("visibilitychange", onVisibility);
      scene.clear();
      geometry.dispose();
      material.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.parentElement?.removeChild(renderer.domElement);
    };
    // `radius` and `alpha` are deliberately absent below: they are read through
    // refs inside the loop. Listing them would rebuild the WebGL context every
    // time the pointer crossed a section boundary.
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [
    prefersReducedMotion,
    trailLength,
    inertia,
    grainIntensity,
    bloomStrength,
    bloomRadius,
    bloomThreshold,
    brightness,
    color,
    coreColor,
    mixBlendMode,
    edgeIntensity,
    maxDevicePixelRatio,
    pixelBudget,
    fadeDelayMs,
    fadeDurationMs,
  ]);

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 ${className}`}
      style={mergedStyle}
    />
  );
}
