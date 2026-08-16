"use client";

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, type PanInfo, type Transition } from "motion/react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SkewedCarouselItem {
  src?: string;
  title: string;
  alt?: string;
}

export interface SkewedCarouselProps {
  items?: SkewedCarouselItem[];
  initialIndex?: number;
  cardWidth?: number;
  aspectRatio?: string;
  rotation?: number;
  inactiveScale?: number;
  perspective?: number;
  borderRadius?: number;
  titleBlur?: number;
  speed?: number;
  showTitles?: boolean;
  showControls?: boolean;
  showDots?: boolean;
  loop?: boolean;
  autoplay?: boolean;
  autoplayDelay?: number;
  enableDrag?: boolean;
  enableKeyboard?: boolean;
  className?: string;
  onIndexChange?: (index: number) => void;
  /** Custom card content — replaces the default img + caption. */
  renderContent?: (item: SkewedCarouselItem, index: number, focused: boolean) => ReactNode;
}

const DEFAULT_ITEMS: SkewedCarouselItem[] = [
  { src: "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?q=80&w=500&auto=format&fit=crop", title: "Vanishing Point" },
  { src: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=500&auto=format&fit=crop", title: "Glass and Gravity" },
  { src: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?q=80&w=500&auto=format&fit=crop", title: "Cut From the Sky" },
  { src: "https://images.unsplash.com/photo-1479839672679-a46483c0e7c8?q=80&w=500&auto=format&fit=crop", title: "Stacked in White" },
  { src: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=500&auto=format&fit=crop", title: "The Long Curve" },
];

const FLICK_DISTANCE = 45;
const FLICK_WEIGHT = 0.08;

const settle = (value: number, count: number, wrap: boolean) => {
  if (count < 1) return 0;
  if (wrap) return ((value % count) + count) % count;
  return value < 0 ? 0 : value > count - 1 ? count - 1 : value;
};

const spring = (bounce: number, seconds: number, speed: number): Transition => ({
  type: "spring",
  bounce,
  duration: seconds * speed,
});

interface SlideProps {
  item: SkewedCarouselItem;
  index: number;
  offset: number;
  focused: boolean;
  width: number;
  aspectRatio: string;
  rotation: number;
  scale: number;
  perspective: number;
  radius: number;
  blur: number;
  captioned: boolean;
  transition: Transition;
  renderContent?: (item: SkewedCarouselItem, index: number, focused: boolean) => ReactNode;
  onPick: () => void;
}

const Slide = ({
  item,
  index,
  offset,
  focused,
  width,
  aspectRatio,
  rotation,
  scale,
  perspective,
  radius,
  blur,
  captioned,
  transition,
  renderContent,
  onPick,
}: SlideProps) => (
  <div style={{ perspective }}>
    <motion.div
      className="will-change-[transform,scale]"
      style={{ width, aspectRatio }}
      animate={{ rotateY: offset * -rotation, scale: focused ? 1 : scale }}
      transition={transition}
    >
      <button
        type="button"
        onClick={onPick}
        tabIndex={focused ? 0 : -1}
        aria-label={item.title}
        aria-current={focused}
        style={{ borderRadius: radius }}
        className="relative block h-full w-full cursor-pointer overflow-hidden border-0 bg-transparent p-0 outline-none focus-visible:[outline:2px_solid_currentColor] focus-visible:[outline-offset:4px]"
      >
        {renderContent ? (
          renderContent(item, index, focused)
        ) : item.src ? (
          <>
            <img
              src={item.src}
              alt={item.alt ?? item.title}
              draggable={false}
              className="h-full w-full object-cover"
            />
            {captioned && (
              <>
                <motion.span
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/80 via-black/30 to-transparent"
                  animate={{ opacity: focused ? 1 : 0 }}
                  transition={transition}
                />
                <motion.span
                  aria-hidden={!focused}
                  className="pointer-events-none absolute inset-x-0 bottom-0 block px-3.5 pb-3 text-left text-sm font-medium leading-snug tracking-[-0.01em] text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.35)]"
                  animate={{
                    opacity: focused ? 1 : 0,
                    filter: `blur(${focused ? 0 : blur}px)`,
                    y: focused ? 0 : 10,
                  }}
                  transition={transition}
                >
                  {item.title}
                </motion.span>
              </>
            )}
          </>
        ) : null}
      </button>
    </motion.div>
  </div>
);

interface RailProps {
  items: SkewedCarouselItem[];
  current: number;
  token: string;
  transition: Transition;
  onPick: (index: number) => void;
}

const Rail = ({ items, current, token, transition, onPick }: RailProps) => (
  <div className="flex w-44 items-center gap-1.5 sm:w-56">
    {items.map((item, index) => (
      <button
        key={`rail-${item.src ?? item.title}-${index}`}
        type="button"
        onClick={() => onPick(index)}
        aria-label={`Show ${item.title}`}
        aria-current={index === current}
        className="relative h-0.5 flex-1 cursor-pointer rounded-full bg-current/20 transition-colors duration-200 before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] hover:bg-current/45"
      >
        {index === current && (
          <motion.span
            layoutId={token}
            className="absolute inset-0 rounded-full bg-current"
            transition={transition}
          />
        )}
      </button>
    ))}
  </div>
);

const Arrow = ({
  side,
  disabled,
  onPress,
}: {
  side: "prev" | "next";
  disabled: boolean;
  onPress: () => void;
}) => {
  const Glyph = side === "prev" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={side === "prev" ? "Previous slide" : "Next slide"}
      className="cursor-pointer p-1 opacity-40 transition-opacity duration-200 hover:opacity-100 disabled:pointer-events-none disabled:opacity-15"
    >
      <Glyph size={16} strokeWidth={2.25} />
    </button>
  );
};

const SkewedCarousel: React.FC<SkewedCarouselProps> = ({
  items = DEFAULT_ITEMS,
  initialIndex = 1,
  cardWidth = 200,
  aspectRatio = "3 / 4",
  rotation = 60,
  inactiveScale = 0.85,
  perspective = 800,
  borderRadius = 8,
  titleBlur = 2,
  speed = 1,
  showTitles = true,
  showControls = true,
  showDots = true,
  loop = false,
  autoplay = false,
  autoplayDelay = 3000,
  enableDrag = true,
  enableKeyboard = true,
  className,
  onIndexChange,
  renderContent,
}) => {
  const count = items.length;
  const token = useId();
  const [focused, setFocused] = useState(() => settle(initialIndex, count, false));
  const report = useRef(onIndexChange);

  useEffect(() => { report.current = onIndexChange; }, [onIndexChange]);
  useEffect(() => { report.current?.(focused); }, [focused]);

  const focusSlide = useCallback(
    (index: number) => setFocused(settle(index, count, loop)),
    [count, loop],
  );

  const step = useCallback(
    (delta: number) => setFocused((from) => settle(from + delta, count, loop)),
    [count, loop],
  );

  useEffect(() => {
    if (!autoplay || count <= 1) return;
    const tick = window.setInterval(
      () => setFocused((from) => from + 1 >= count && !loop ? from : settle(from + 1, count, loop)),
      Math.max(autoplayDelay, 400),
    );
    return () => window.clearInterval(tick);
  }, [autoplay, autoplayDelay, count, loop]);

  const motions = useMemo(
    () => ({
      strip: spring(0.2, 0.8, speed),
      card: spring(0.1, 1, speed),
      rail: spring(0.25, 0.5, speed),
    }),
    [speed],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!enableKeyboard) return;
    const delta = event.key === "ArrowLeft" ? -1 : event.key === "ArrowRight" ? 1 : 0;
    if (!delta) return;
    event.preventDefault();
    step(delta);
  };

  const onPanEnd = (_: unknown, info: PanInfo) => {
    const thrown = info.offset.x + info.velocity.x * FLICK_WEIGHT;
    if (Math.abs(thrown) < FLICK_DISTANCE) return;
    step(thrown < 0 ? 1 : -1);
  };

  const head = !loop && focused === 0;
  const tail = !loop && focused >= count - 1;

  return (
    <div
      tabIndex={0}
      role="group"
      aria-roledescription="carousel"
      aria-label="Image carousel"
      onKeyDown={onKeyDown}
      className={cn(
        "relative flex w-full select-none flex-col items-center overflow-hidden text-neutral-900 outline-none dark:text-neutral-100",
        className,
      )}
    >
      <div style={{ width: cardWidth }}>
        <motion.div
          className="flex w-fit"
          style={{ touchAction: "pan-y" }}
          animate={{ x: -focused * cardWidth }}
          transition={motions.strip}
          {...(enableDrag ? { onPanEnd } : {})}
        >
          {items.map((item, index) => (
            <Slide
              key={`${item.src ?? item.title}-${index}`}
              item={item}
              index={index}
              offset={index - focused}
              focused={index === focused}
              width={cardWidth}
              aspectRatio={aspectRatio}
              rotation={rotation}
              scale={inactiveScale}
              perspective={perspective}
              radius={borderRadius}
              blur={titleBlur}
              captioned={showTitles}
              transition={motions.card}
              {...(renderContent !== undefined ? { renderContent } : {})}
              onPick={() => focusSlide(index)}
            />
          ))}
        </motion.div>
      </div>

      {(showControls || showDots) && (
        <div className="mt-9 flex items-center gap-4">
          {showControls && <Arrow side="prev" disabled={head} onPress={() => step(-1)} />}
          {showDots && (
            <Rail
              items={items}
              current={focused}
              token={token}
              transition={motions.rail}
              onPick={focusSlide}
            />
          )}
          {showControls && <Arrow side="next" disabled={tail} onPress={() => step(1)} />}
        </div>
      )}
    </div>
  );
};

export default SkewedCarousel;
