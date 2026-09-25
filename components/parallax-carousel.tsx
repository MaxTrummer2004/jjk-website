"use client";

import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { cn } from "@/lib/utils";

export interface ParallaxCarouselProps {
  /** Ordered list of image URLs. Each becomes a plane in the carousel. */
  images: string[];
  /** Plane width in CSS pixels. */
  imageWidth?: number;
  /** Plane height in CSS pixels. */
  imageHeight?: number;
  /** Horizontal gap between planes in CSS pixels. */
  gap?: number;
  /**
   * UV-space horizontal shift applied as planes drift away from screen
   * centre. Higher = more dramatic counter-motion inside each plane.
   * Range: roughly 0..0.6.
   */
  parallaxIntensity?: number;
  /**
   * Maximum normalised parallax travel (as a fraction of viewport
   * width). The texture is automatically zoomed in by this much so the
   * plane never shows empty space, regardless of how the parallax
   * shifts the texture. Higher = more pronounced parallax sweep, but
   * also more zoom on the source image. Range: 0.1..1.0.
   */
  uvScale?: number;
  /** Smoothing factor applied to the scroll lerp each frame (0..1). */
  lerp?: number;
  /** Multiplier on wheel deltas. */
  wheelSensitivity?: number;
  /** Multiplier on pointer-drag deltas. */
  dragSensitivity?: number;
  /** Loop endlessly horizontally (planes wrap around the strip). */
  loop?: boolean;
  /** Fixed border radius applied to each plane (CSS pixels). */
  borderRadius?: number;
  /** Idle drift speed in CSS px/s when the user is not interacting. 0 = none. */
  autoplaySpeed?: number;
  /** Pause autoplay while hovering. */
  pauseOnHover?: boolean;
  /** Show a subtle progress indicator at the bottom. Loop mode hides it. */
  showProgress?: boolean;
  /**
   * Meldet pro Bild, wo seine Karte gerade steht — Pixel, relativ zur Mitte
   * des Containers.
   *
   * Das Karussell ist WebGL: es gibt keine DOM-Karten, auf die man eine
   * Beschriftung legen koennte. Statt Text in die Textur zu backen (unscharf,
   * nicht markierbar, fuer Screenreader unsichtbar) meldet es hier seine
   * Geometrie nach aussen, und der Aufrufer legt echtes HTML darueber.
   *
   * ACHTUNG: wird in JEDEM Bild gerufen. Der Aufrufer schreibt damit direkt
   * auf `style` von Refs — wer hier `setState` aufruft, rendert die Seite
   * sechzigmal pro Sekunde neu.
   */
  onLayout?: (items: { i: number; x: number }[]) => void;
  /**
   * Index der Karte unter dem Zeiger (Position im gerenderten Streifen, nicht
   * im `images`-Array — bei Endlosbetrieb wiederholen sich die Bilder, und
   * hervorheben soll sich nur die eine Karte, auf der man steht).
   */
  hoverIndex?: number | null;
  /** Container class names. */
  className?: string;
  /** Container inline styles. */
  style?: React.CSSProperties;
}

export interface ParallaxCarouselRef {
  /** Scroll to a specific image index (0-based). */
  scrollToIndex: (index: number) => void;
  /** Reset scroll position to the start. */
  reset: () => void;
}

const PLANE_VERTEX = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const PLANE_FRAGMENT = `
precision highp float;

varying vec2 vUv;

uniform sampler2D uMap;
uniform vec2 uPlanePx;
uniform vec2 uTexPx;
uniform float uShift;
uniform float uIntensity;
uniform float uMaxShift;
uniform float uRadiusPx;
uniform float uHasTexture;
// uFocus: liegt der Zeiger auf DIESER Karte. uAny: liegt er auf irgendeiner.
// Zwei Werte statt einem, damit ohne Zeiger niemand abgedunkelt wird — sonst
// waere der Ruhezustand des Karussells dunkler als sein Hover-Zustand.
uniform float uFocus;
uniform float uAny;

vec2 coverFit(vec2 uv, vec2 planeSize, vec2 texSize) {
  float planeAspect = planeSize.x / max(planeSize.y, 1.0);
  float texAspect = texSize.x / max(texSize.y, 1.0);
  vec2 ratio = vec2(
    min(planeAspect / max(texAspect, 0.0001), 1.0),
    min((1.0 / planeAspect) / max(1.0 / texAspect, 0.0001), 1.0)
  );
  return uv * ratio + (1.0 - ratio) * 0.5;
}

float roundedBoxAlpha(vec2 uv, vec2 sizePx, float radiusPx) {
  vec2 p = (uv - 0.5) * sizePx;
  vec2 half_ = sizePx * 0.5 - vec2(radiusPx);
  vec2 d = abs(p) - half_;
  float outside = length(max(d, 0.0));
  float inside = min(max(d.x, d.y), 0.0);
  float dist = outside + inside - radiusPx;
  return clamp(0.5 - dist, 0.0, 1.0);
}

void main() {
  vec2 uv = coverFit(vUv, uPlanePx, uTexPx);

  float zoom = 1.0 / (1.0 + 2.0 * uMaxShift);
  uv = (uv - 0.5) * zoom + 0.5;

  uv.x += uShift * uIntensity * zoom;

  vec4 tex;
  if (uHasTexture > 0.5) {
    tex = texture2D(uMap, uv);
  } else {
    tex = vec4(mix(vec3(0.07), vec3(0.12), vUv.y), 1.0);
  }

  float mask = uRadiusPx > 0.5 ? roundedBoxAlpha(vUv, uPlanePx, uRadiusPx) : 1.0;
  tex.rgb *= mix(1.0, mix(0.6, 1.16, uFocus), uAny);
  gl_FragColor = vec4(tex.rgb, tex.a * mask);
}
`;

// One GPU texture per URL, ref-counted with subscriber pattern so concurrent
// Plane mounts (loop repeats) share a single load and a single texture object.
const textureCache = new Map<
  string,
  {
    texture: THREE.Texture | null;
    refCount: number;
    subscribers: Array<(t: THREE.Texture | null) => void>;
  }
>();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function buildUniforms() {
  return {
    uMap: { value: null as THREE.Texture | null },
    uPlanePx: { value: new THREE.Vector2(1, 1) },
    uTexPx: { value: new THREE.Vector2(1, 1) },
    uShift: { value: 0 },
    uIntensity: { value: 0.4 },
    uMaxShift: { value: 0.2 },
    uRadiusPx: { value: 0 },
    uHasTexture: { value: 0 },
    uFocus: { value: 0 },
    uAny: { value: 0 },
  };
}

interface ScrollState {
  current: number;
  target: number;
  limit: number;
}

interface PlaneProps {
  src: string;
  index: number;
  imageWidth: number;
  imageHeight: number;
  gap: number;
  parallaxIntensity: number;
  uvScale: number;
  borderRadius: number;
  loop: boolean;
  totalCount: number;
  scrollRef: React.RefObject<ScrollState>;
  /** Index der Karte unter dem Zeiger, oder null. */
  hoverIndex: number | null;
}

/**
 * Rechnet dieselbe Anordnung wie `Plane`, aber einmal fuer alle, und reicht
 * sie nach aussen. Absichtlich hier statt beim Aufrufer nachgebaut: die
 * Umbruchrechnung fuer den Endlosmodus gehoert an EINE Stelle, sonst laufen
 * Beschriftung und Bild irgendwann auseinander.
 */
const LayoutReporter: React.FC<{
  count: number;
  sources: number;
  imageWidth: number;
  gap: number;
  loop: boolean;
  scrollRef: React.RefObject<ScrollState>;
  onLayout: ((items: { i: number; x: number }[]) => void) | undefined;
}> = ({ count, sources, imageWidth, gap, loop, scrollRef, onLayout }) => {
  const buf = useRef<{ i: number; x: number }[]>([]);
  useFrame(() => {
    if (!onLayout) return;
    const scroll = scrollRef.current;
    if (!scroll) return;
    const stride = imageWidth + gap;
    const strip = count * stride;
    const half = strip * 0.5;
    const out = buf.current;
    out.length = 0;
    for (let k = 0; k < count; k++) {
      let x = k * stride - scroll.current;
      if (loop && count > 0) {
        x = ((((x + half) % strip) + strip) % strip) - half;
      }
      out.push({ i: sources > 0 ? k % sources : 0, x });
    }
    onLayout(out);
  });
  return null;
};

const Plane: React.FC<PlaneProps> = ({
  src,
  index,
  imageWidth,
  imageHeight,
  gap,
  parallaxIntensity,
  uvScale,
  borderRadius,
  loop,
  totalCount,
  scrollRef,
  hoverIndex,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const textureRef = useRef<THREE.Texture | null>(null);
  const { size } = useThree();

  const [uniforms] = React.useState(buildUniforms);

  // Waehrend des Renderns auf ein Ref zu schreiben ist verboten (React kann
  // einen Durchlauf verwerfen); der Wert wird deshalb im Effect nachgezogen.
  const hoverRef = useRef(hoverIndex);
  useEffect(() => {
    hoverRef.current = hoverIndex;
  }, [hoverIndex]);
  const focusRef = useRef(0);
  const anyRef = useRef(0);

  const propsRef = useRef({
    parallaxIntensity,
    uvScale,
    borderRadius,
    imageWidth,
    imageHeight,
    gap,
    loop,
  });
  useEffect(() => {
    propsRef.current = {
      parallaxIntensity,
      uvScale,
      borderRadius,
      imageWidth,
      imageHeight,
      gap,
      loop,
    };
  }, [
    parallaxIntensity,
    uvScale,
    borderRadius,
    imageWidth,
    imageHeight,
    gap,
    loop,
  ]);

  useEffect(() => {
    if (!src) return;
    let alive = true;

    let entry = textureCache.get(src);
    if (!entry) {
      entry = { texture: null, refCount: 0, subscribers: [] };
      textureCache.set(src, entry);
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin("anonymous");
      loader.load(
        src,
        (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.wrapS = THREE.ClampToEdgeWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          const e = textureCache.get(src);
          if (e) {
            e.texture = tex;
            e.subscribers.forEach((cb) => cb(tex));
            e.subscribers = [];
          } else {
            // All refs were released before the load finished.
            tex.dispose();
          }
        },
        undefined,
        () => {
          const e = textureCache.get(src);
          if (e) {
            e.subscribers.forEach((cb) => cb(null));
            e.subscribers = [];
          }
        },
      );
    }
    entry.refCount++;

    if (entry.texture) {
      textureRef.current = entry.texture;
    } else {
      entry.subscribers.push((tex) => {
        if (alive) textureRef.current = tex;
      });
    }

    return () => {
      alive = false;
      textureRef.current = null;
      const e = textureCache.get(src);
      if (e) {
        e.refCount--;
        if (e.refCount <= 0) {
          if (e.texture) e.texture.dispose();
          textureCache.delete(src);
        }
      }
    };
  }, [src]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const mat = mesh.material as THREE.ShaderMaterial;
    const u = mat.uniforms;
    const p = propsRef.current;
    const scroll = scrollRef.current;
    if (!scroll) return;

    const planeStride = p.imageWidth + p.gap;
    let offsetPx = index * planeStride - scroll.current;

    if (p.loop && totalCount > 0) {
      const stripLength = totalCount * planeStride;
      const halfStrip = stripLength * 0.5;
      offsetPx =
        ((((offsetPx + halfStrip) % stripLength) + stripLength) % stripLength) -
        halfStrip;
    }

    // Hover, weich angefahren statt geschaltet: ein harter Sprung auf einer
    // Karte, die man gerade mit dem Zeiger streift, liest sich als Flackern.
    const hv = hoverRef.current;
    const wantFocus = hv === index ? 1 : 0;
    const wantAny = hv === null ? 0 : 1;
    focusRef.current += (wantFocus - focusRef.current) * 0.14;
    anyRef.current += (wantAny - anyRef.current) * 0.14;
    if (u["uFocus"]) u["uFocus"].value = focusRef.current;
    if (u["uAny"]) u["uAny"].value = anyRef.current;

    mesh.position.x = offsetPx;
    mesh.position.y = 0;
    const lift = 1 + 0.035 * focusRef.current;
    mesh.scale.set(p.imageWidth * lift, p.imageHeight * lift, 1);

    const viewport = Math.max(size.width, 1);
    const norm = clamp(offsetPx / viewport, -p.uvScale, p.uvScale);
    if (u["uShift"]) u["uShift"].value = -norm;
    if (u["uIntensity"]) u["uIntensity"].value = p.parallaxIntensity;
    if (u["uMaxShift"]) u["uMaxShift"].value = p.uvScale * p.parallaxIntensity;
    if (u["uRadiusPx"]) u["uRadiusPx"].value = p.borderRadius;
    if (u["uPlanePx"]) (u["uPlanePx"].value as THREE.Vector2).set(p.imageWidth, p.imageHeight);

    if (textureRef.current?.image) {
      if (u["uMap"]) u["uMap"].value = textureRef.current;
      const img = textureRef.current.image as HTMLImageElement;
      if (u["uTexPx"]) (u["uTexPx"].value as THREE.Vector2).set(
        img.naturalWidth || img.width || 1,
        img.naturalHeight || img.height || 1,
      );
      if (u["uHasTexture"]) u["uHasTexture"].value = 1;
    } else {
      if (u["uHasTexture"]) u["uHasTexture"].value = 0;
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial
        vertexShader={PLANE_VERTEX}
        fragmentShader={PLANE_FRAGMENT}
        uniforms={uniforms}
        transparent
      />
    </mesh>
  );
};

const CameraRig: React.FC = () => {
  const camRef = useRef<THREE.OrthographicCamera>(null);
  const { size, set } = useThree();

  useEffect(() => {
    const cam = camRef.current;
    if (!cam) return;
    cam.left = -size.width / 2;
    cam.right = size.width / 2;
    cam.top = size.height / 2;
    cam.bottom = -size.height / 2;
    cam.near = 0.1;
    cam.far = 1000;
    cam.position.set(0, 0, 10);
    cam.updateProjectionMatrix();
    set({ camera: cam });
  }, [size.width, size.height, set]);

  return <orthographicCamera ref={camRef} />;
};

const ParallaxCarousel = React.forwardRef<
  ParallaxCarouselRef,
  ParallaxCarouselProps
>(
  (
    {
      images,
      imageWidth = 420,
      imageHeight = 560,
      gap = 32,
      parallaxIntensity = 0.4,
      uvScale = 0.85,
      lerp = 0.08,
      wheelSensitivity = 1,
      dragSensitivity = 1.4,
      loop = false,
      borderRadius = 16,
      autoplaySpeed = 0,
      pauseOnHover = true,
      showProgress = true,
      onLayout,
      hoverIndex = null,
      className,
      style,
    },
    ref,
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rafRef = useRef<number | null>(null);
    const hoverRef = useRef(false);
    const draggingRef = useRef(false);
    const lastPointerXRef = useRef(0);
    const lastFrameTsRef = useRef<number | null>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    const scrollRef = useRef<ScrollState>({
      current: 0,
      target: 0,
      limit: 0,
    });

    const settingsRef = useRef({
      lerp,
      wheelSensitivity,
      dragSensitivity,
      autoplaySpeed,
      loop,
      pauseOnHover,
      imageWidth,
      gap,
      count: images.length,
    });
    useEffect(() => {
      settingsRef.current = {
        lerp,
        wheelSensitivity,
        dragSensitivity,
        autoplaySpeed,
        loop,
        pauseOnHover,
        imageWidth,
        gap,
        count: images.length,
      };
    }, [
      lerp,
      wheelSensitivity,
      dragSensitivity,
      autoplaySpeed,
      loop,
      pauseOnHover,
      imageWidth,
      gap,
      images.length,
    ]);

    // How many times to repeat the image list so the strip always covers the
    // canvas. Starts at 1 and is updated on first ResizeObserver callback.
    const [repeat, setRepeat] = useState(1);

    const recomputeLimit = useCallback(() => {
      const node = containerRef.current;
      if (!node) return;
      const cw = node.clientWidth;
      const total = images.length * (imageWidth + gap) - gap;
      scrollRef.current.limit = loop
        ? Number.POSITIVE_INFINITY
        : Math.max(0, total - cw);
      if (loop && cw > 0) {
        const stride = imageWidth + gap;
        const needed = cw + imageWidth * 2;
        const r = Math.max(1, Math.ceil(needed / (images.length * stride)));
        setRepeat(r);
      }
    }, [images.length, imageWidth, gap, loop]);

    useEffect(() => {
      recomputeLimit();
      const node = containerRef.current;
      if (!node || typeof ResizeObserver === "undefined") return;
      const ro = new ResizeObserver(recomputeLimit);
      ro.observe(node);
      return () => ro.disconnect();
    }, [recomputeLimit]);

    const tickRef = useRef<((now: number) => void) | null>(null);
    useEffect(() => {
      const tick = (now: number) => {
        const s = scrollRef.current;
        const settings = settingsRef.current;

        const last = lastFrameTsRef.current ?? now;
        const dt = Math.max(0, (now - last) / 1000);
        lastFrameTsRef.current = now;

        if (
          settings.autoplaySpeed !== 0 &&
          !draggingRef.current &&
          !(settings.pauseOnHover && hoverRef.current)
        ) {
          s.target += settings.autoplaySpeed * dt;
        }

        if (!settings.loop) {
          s.target = clamp(s.target, 0, s.limit);
        }

        const k = clamp(settings.lerp, 0.001, 1);
        s.current += (s.target - s.current) * k;

        if (progressBarRef.current && !settings.loop && s.limit > 0) {
          const ratio = clamp(s.current / s.limit, 0, 1);
          progressBarRef.current.style.transform = `scaleX(${ratio})`;
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      tickRef.current = tick;
      rafRef.current = requestAnimationFrame(tick);
      return () => {
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        tickRef.current = null;
        lastFrameTsRef.current = null;
      };
    }, []);

    useEffect(() => {
      const node = containerRef.current;
      if (!node) return;

      const onWheel = (e: WheelEvent) => {
        const settings = settingsRef.current;
        const delta =
          Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
        scrollRef.current.target += delta * settings.wheelSensitivity;
      };

      const onPointerDown = (e: PointerEvent) => {
        draggingRef.current = true;
        lastPointerXRef.current = e.clientX;
        node.setPointerCapture(e.pointerId);
        node.style.cursor = "grabbing";
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!draggingRef.current) return;
        const settings = settingsRef.current;
        const dx = e.clientX - lastPointerXRef.current;
        lastPointerXRef.current = e.clientX;
        scrollRef.current.target -= dx * settings.dragSensitivity;
      };

      const onPointerUp = (e: PointerEvent) => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        try {
          node.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
        node.style.cursor = "grab";
      };

      const onEnter = () => {
        hoverRef.current = true;
      };
      const onLeave = () => {
        hoverRef.current = false;
      };

      node.addEventListener("wheel", onWheel, { passive: true });
      node.addEventListener("pointerdown", onPointerDown);
      node.addEventListener("pointermove", onPointerMove);
      node.addEventListener("pointerup", onPointerUp);
      node.addEventListener("pointercancel", onPointerUp);
      node.addEventListener("pointerleave", onPointerUp);
      node.addEventListener("mouseenter", onEnter);
      node.addEventListener("mouseleave", onLeave);

      return () => {
        node.removeEventListener("wheel", onWheel);
        node.removeEventListener("pointerdown", onPointerDown);
        node.removeEventListener("pointermove", onPointerMove);
        node.removeEventListener("pointerup", onPointerUp);
        node.removeEventListener("pointercancel", onPointerUp);
        node.removeEventListener("pointerleave", onPointerUp);
        node.removeEventListener("mouseenter", onEnter);
        node.removeEventListener("mouseleave", onLeave);
      };
    }, []);

    const scrollToIndex = useCallback((idx: number) => {
      const settings = settingsRef.current;
      const target = idx * (settings.imageWidth + settings.gap);
      scrollRef.current.target = settings.loop
        ? target
        : clamp(target, 0, scrollRef.current.limit);
    }, []);

    const reset = useCallback(() => {
      scrollRef.current.target = 0;
      scrollRef.current.current = 0;
    }, []);

    useImperativeHandle(ref, () => ({ scrollToIndex, reset }), [
      scrollToIndex,
      reset,
    ]);

    // In loop mode, tile the image list enough times so that stripLength always
    // exceeds containerWidth + imageWidth on each side. This prevents a plane
    // from wrapping back into the visible area while still on screen.
    const renderImages = useMemo(() => {
      if (!loop || repeat <= 1) return images;
      return Array.from(
        { length: images.length * repeat },
        (_, i) => images[i % images.length]!,
      );
    }, [loop, images, repeat]);

    const planeKeys = useMemo(
      () => renderImages.map((src, i) => `${i}-${src}`),
      [renderImages],
    );

    return (
      <div
        ref={containerRef}
        className={cn(
          "relative w-full h-full overflow-hidden select-none",
          className,
        )}
        style={{
          cursor: "grab",
          touchAction: "pan-y",
          ...style,
        }}
      >
        <Canvas
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
          className="absolute! inset-0 w-full h-full"
        >
          <CameraRig />
          <LayoutReporter
            count={renderImages.length}
            sources={images.length}
            imageWidth={imageWidth}
            gap={gap}
            loop={loop}
            scrollRef={scrollRef}
            onLayout={onLayout}
          />
          {renderImages.map((src, i) => (
            <Plane
              key={planeKeys[i]}
              src={src}
              index={i}
              imageWidth={imageWidth}
              imageHeight={imageHeight}
              gap={gap}
              parallaxIntensity={parallaxIntensity}
              uvScale={uvScale}
              borderRadius={borderRadius}
              loop={loop}
              totalCount={renderImages.length}
              scrollRef={scrollRef}
              hoverIndex={hoverIndex}
            />
          ))}
        </Canvas>

        {showProgress && !loop && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 h-[2px] w-32 bg-white/15 rounded-full overflow-hidden pointer-events-none"
            aria-hidden
          >
            <div
              ref={progressBarRef}
              className="h-full w-full bg-white/80 origin-left"
              style={{ transform: "scaleX(0)" }}
            />
          </div>
        )}
      </div>
    );
  },
);

ParallaxCarousel.displayName = "ParallaxCarousel";

export default ParallaxCarousel;
