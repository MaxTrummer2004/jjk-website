"use client";

import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

export interface CardSpreadCard {
  id?: string;
  src?: string;
  alt?: string;
}

export interface CardSpreadProps {
  cards?: CardSpreadCard[];
  cardWidth?: number;
  cardHeight?: number;
  cardRadius?: number;
  radius?: number;
  arc?: number;
  cardColor?: string;
  cardPadding?: number;
  borderColor?: string;
  shadow?: number;
  lift?: number;
  push?: number;
  pushReach?: number;
  restOpacity?: number;
  stiffness?: number;
  damping?: number;
  mass?: number;
  stagger?: number;
  fit?: boolean;
  maxScale?: number;
  interactive?: boolean;
  className?: string;
  style?: CSSProperties;
  /** Custom card content rendered instead of the default img. */
  renderCard?: (index: number, card: CardSpreadCard) => ReactNode;
}

const DEG = Math.PI / 180;
const ENTRY_CURVE = [0.16, 1, 0.3, 1] as const;

const clamp = (value: number, low: number, high: number) =>
  Math.min(Math.max(value, low), high);

interface Frame {
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
}

const measure = (
  span: number,
  radius: number,
  cardWidth: number,
  cardHeight: number,
  lift: number,
): Frame => {
  const half = cardWidth / 2;
  const reach = [-lift, cardHeight];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (let step = 0; step <= 48; step += 1) {
    const angle = (-span / 2 + (span * step) / 48) * DEG;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const edge of [-half, half]) {
      for (const depth of reach) {
        const local = depth - radius;
        const x = edge * cos - local * sin;
        const y = edge * sin + local * cos;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  return {
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
    pivotX: -minX,
    pivotY: -minY,
  };
};

interface CardProps {
  index: number;
  card: CardSpreadCard;
  angle: number;
  raised: boolean;
  faded: number;
  layer: number;
  left: number;
  top: number;
  orbit: number;
  width: number;
  height: number;
  radius: number;
  padding: number;
  paper: string;
  border: string;
  shadow: number;
  lift: number;
  stagger: number;
  stiffness: number;
  damping: number;
  mass: number;
  still: boolean;
  interactive: boolean;
  renderCard?: (index: number, card: CardSpreadCard) => ReactNode;
  onEnter: (index: number) => void;
  onLeave: () => void;
}

const Card = memo(function Card({
  index,
  card,
  angle,
  raised,
  faded,
  layer,
  left,
  top,
  orbit,
  width,
  height,
  radius,
  padding,
  paper,
  border,
  shadow,
  lift,
  stagger,
  stiffness,
  damping,
  mass,
  still,
  interactive,
  renderCard,
  onEnter,
  onLeave,
}: CardProps) {
  const spring = still
    ? ({ duration: 0 } as const)
    : ({ type: "spring", stiffness, damping, mass } as const);

  return (
    <motion.div
      className="absolute"
      style={{
        left,
        top: top - orbit,
        width,
        height,
        marginLeft: -width / 2,
        transformOrigin: `50% ${orbit}px`,
        zIndex: layer,
      }}
      initial={still ? false : { rotate: 0 }}
      animate={{ rotate: angle }}
      transition={spring}
    >
      <motion.div
        className="h-full w-full"
        animate={{ y: raised ? -lift : 0 }}
        transition={spring}
      >
        <motion.div
          className="h-full w-full"
          initial={still ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: still ? 0 : 0.5,
            delay: still ? 0 : stagger * index,
            ease: ENTRY_CURVE as unknown as [number, number, number, number],
          }}
        >
          <motion.div
            className="h-full w-full"
            animate={{ opacity: faded }}
            transition={{ duration: still ? 0 : 0.22 }}
            onPointerEnter={() => onEnter(index)}
            onFocus={() => onEnter(index)}
            onBlur={onLeave}
            tabIndex={interactive ? 0 : -1}
          >
            <div
              className="relative h-full w-full overflow-hidden"
              style={{
                borderRadius: radius,
                background: paper,
                padding,
                border: `1px solid ${border}`,
                boxShadow:
                  shadow > 0
                    ? `0 ${Math.round(18 * shadow)}px ${Math.round(42 * shadow)}px rgba(0,0,0,${clamp(shadow * 0.9, 0, 1)})`
                    : "none",
              }}
            >
              {renderCard ? (
                renderCard(index, card)
              ) : card.src ? (
                <img
                  src={card.src}
                  alt={card.alt ?? ""}
                  draggable={false}
                  loading="lazy"
                  className="block h-full w-full object-cover"
                  style={{ borderRadius: Math.max(radius - padding, 0) }}
                />
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
});

const CardSpread = ({
  cards = [],
  cardWidth = 168,
  cardHeight = 252,
  cardRadius = 12,
  radius = 440,
  arc = 88,
  cardColor = "#ffffff",
  cardPadding = 0,
  borderColor = "transparent",
  shadow = 0.28,
  lift = 26,
  push = 3.6,
  pushReach = 3,
  restOpacity = 1,
  stiffness = 150,
  damping = 16,
  mass = 1,
  stagger = 0.06,
  fit = true,
  maxScale = 1,
  interactive = true,
  className,
  style,
  renderCard,
}: CardSpreadProps) => {
  const reduceMotion = useReducedMotion();
  const shell = useRef<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState(1);
  const [active, setActive] = useState<number | null>(null);

  const deck = cards.length > 0 ? cards : [];
  const count = deck.length;

  const geometry = useMemo(() => {
    const span = clamp(arc, 0, 340);
    return {
      span,
      step: count > 1 ? span / (count - 1) : 0,
      frame: measure(
        span,
        Math.max(radius, cardHeight),
        cardWidth,
        cardHeight,
        Math.max(lift, 0),
      ),
    };
  }, [arc, count, radius, cardWidth, cardHeight, lift]);

  const orbit = Math.max(radius, cardHeight);

  useEffect(() => {
    const node = shell.current;
    if (!node || !fit) return;

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect;
      if (!box || box.width === 0 || box.height === 0) return;
      const next = Math.min(
        maxScale,
        box.width / geometry.frame.width,
        box.height / geometry.frame.height,
      );
      setMeasured(Number.isFinite(next) && next > 0 ? next : maxScale);
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, [fit, maxScale, geometry.frame.width, geometry.frame.height]);

  const scale = fit ? measured : maxScale;

  const enter = useCallback(
    (index: number) => {
      if (interactive) setActive(index);
    },
    [interactive],
  );

  const leave = useCallback(() => {
    if (interactive) setActive(null);
  }, [interactive]);

  const middle = (count - 1) / 2;
  const still = Boolean(reduceMotion);

  return (
    <div
      ref={shell}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        className,
      )}
      style={style}
      onPointerLeave={leave}
    >
      <div
        className="relative"
        style={{
          width: geometry.frame.width,
          height: geometry.frame.height,
          transform: `scale(${scale})`,
        }}
      >
        {deck.map((card, index) => {
          let shift = 0;
          if (active !== null && active !== index) {
            const gap = index - active;
            const reach = Math.abs(gap);
            if (reach <= pushReach) {
              shift = Math.sign(gap) * push * (pushReach + 1 - reach);
            }
          }

          const raised = active === index;

          return (
            <Card
              key={card.id ?? `card-${index}`}
              index={index}
              card={card}
              angle={-geometry.span / 2 + geometry.step * index + shift}
              raised={raised}
              faded={active === null || raised ? 1 : clamp(restOpacity, 0, 1)}
              layer={
                raised
                  ? count + 2
                  : Math.round(count - Math.abs(index - middle))
              }
              left={geometry.frame.pivotX}
              top={geometry.frame.pivotY}
              orbit={orbit}
              width={cardWidth}
              height={cardHeight}
              radius={cardRadius}
              padding={cardPadding}
              paper={cardColor}
              border={borderColor}
              shadow={shadow}
              lift={lift}
              stagger={stagger}
              stiffness={stiffness}
              damping={damping}
              mass={mass}
              still={still}
              interactive={interactive}
              {...(renderCard !== undefined ? { renderCard } : {})}
              onEnter={enter}
              onLeave={leave}
            />
          );
        })}
      </div>
    </div>
  );
};

export default CardSpread;
