"use client";

import React, { useRef, useEffect, useState, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import gsap from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";

gsap.registerPlugin(Draggable, InertiaPlugin);

export interface CircleGalleryProps {
  /** Array of image URLs or gradients to display in the gallery */
  images?: string[];

  /** Radius of the circle as a percentage of viewport (10-50) */
  radiusPercent?: number;

  /** Width of each item in pixels */
  itemWidth?: number;

  /** Height of each item in pixels */
  itemHeight?: number;

  /** Scale factor for items (0.5-1.5) */
  itemScale?: number;

  /** Border radius for items in pixels */
  borderRadius?: number;

  /** Enable drag rotation */
  enableDrag?: boolean;

  /** Throw resistance for inertia (0-1, lower = more inertia) */
  throwResistance?: number;

  /** Duration for initial animation in seconds */
  animationDuration?: number;

  /** Show item numbers on cards */
  showNumbers?: boolean;

  /** Auto-spin speed in degrees per second (0 = disabled) */
  autoSpin?: number;

  /** Custom class for wrapper */
  className?: string;

  /** Custom class for items */
  itemClassName?: string;

  /** Callback when an item is clicked */
  onItemClick?: (index: number, image: string) => void;

  /** Custom content rendered inside each card */
  renderItem?: (index: number, image: string) => ReactNode;
}

export const CircleGallery: React.FC<CircleGalleryProps> = ({
  images = [],
  radiusPercent = 38,
  itemWidth = 280,
  itemHeight = 400,
  itemScale = 0.85,
  borderRadius = 8,
  enableDrag = true,
  throwResistance = 0.35,
  animationDuration = 0.9,
  showNumbers = true,
  autoSpin = 0,
  className,
  itemClassName,
  onItemClick,
  renderItem,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const draggableRef = useRef<Draggable[] | null>(null);
  const autoSpinRef = useRef<gsap.core.Tween | null>(null);
  const isDraggingRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

  const defaultImages = [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1511497584788-876760111969?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=500&auto=format&fit=crop&q=60",
    "https://images.unsplash.com/photo-1502082553048-f009c37129b9?w=500&auto=format&fit=crop&q=60",
  ];
  const displayItems = images.length > 0 ? images : defaultImages;
  const totalItems = displayItems.length;

  const calculateCirclePositions = useCallback(
    (animated = false) => {
      if (!wheelRef.current) return;

      const viewportDimension = Math.min(window.innerWidth, window.innerHeight);
      const circleRadius = viewportDimension * (radiusPercent / 100);
      const fullCircle = 2 * Math.PI;
      const stepAngle = fullCircle / totalItems;

      const currentRotation =
        gsap.getProperty(wheelRef.current, "rotation") || 0;
      const rotationInRadians = (currentRotation as number) * (Math.PI / 180);

      itemRefs.current.forEach((item, idx) => {
        if (!item) return;

        const angle = idx * stepAngle + rotationInRadians;
        const xPosition = circleRadius * Math.cos(angle);
        const yPosition = circleRadius * Math.sin(angle);

        if (animated) {
          gsap.to(item, {
            x: xPosition,
            y: yPosition,
            rotation: -(currentRotation as number),
            duration: 0.4,
            ease: "power2.out",
          });
        } else {
          gsap.set(item, {
            x: xPosition,
            y: yPosition,
            rotation: -(currentRotation as number),
          });
        }
      });
    },
    [totalItems, radiusPercent],
  );

  const setupDraggable = useCallback(() => {
    if (!wheelRef.current || !enableDrag || focusedIndex !== null) return;

    if (draggableRef.current) {
      draggableRef.current[0]?.kill();
    }

    const updateItemRotations = function (this: Draggable) {
      const wheelRotation = this.rotation || 0;

      itemRefs.current.forEach((item) => {
        if (item) {
          gsap.set(item, {
            rotation: -wheelRotation,
          });
        }
      });
    };

    draggableRef.current = Draggable.create(wheelRef.current, {
      type: "rotation",
      inertia: true,
      throwResistance: throwResistance,
      onDrag: updateItemRotations,
      onThrowUpdate: updateItemRotations,
      onPress: () => {
        if (autoSpinRef.current) {
          autoSpinRef.current.kill();
          autoSpinRef.current = null;
        }
        isDraggingRef.current = false;
      },
      onDragStart: () => {
        isDraggingRef.current = true;
      },
      onDragEnd: () => {
        setTimeout(() => {
          isDraggingRef.current = false;
        }, 50);
      },
      trigger: containerRef.current,
    });
  }, [enableDrag, throwResistance, focusedIndex]);

  const initializeGallery = useCallback(() => {
    if (!wheelRef.current) return;

    const items = itemRefs.current.filter((item) => item !== null);

    const timeline = gsap.timeline({
      onComplete: () => {
        setIsReady(true);
        setupDraggable();
      },
    });

    for (let i = 0; i < totalItems; i++) {
      const item = items[i];
      if (!item) continue;
      const staggerDelay = (totalItems - 1 - i) * 0.1;

      timeline.to(
        item,
        {
          opacity: 1,
          scale: itemScale,
          duration: 0.5,
          ease: "power2.out",
        },
        staggerDelay,
      );
    }

    const lastAnimationEnd = (totalItems - 1) * 0.1 + 0.5;
    timeline.to({}, { duration: 0.3 }, lastAnimationEnd);

    const viewportDimension = Math.min(window.innerWidth, window.innerHeight);
    const circleRadius = viewportDimension * (radiusPercent / 100);
    const fullCircle = 2 * Math.PI;
    const stepAngle = fullCircle / totalItems;

    const circleStartTime = lastAnimationEnd + 0.3;
    for (let i = 0; i < totalItems; i++) {
      const item = items[i];
      if (!item) continue;
      const angle = i * stepAngle;
      const xPosition = circleRadius * Math.cos(angle);
      const yPosition = circleRadius * Math.sin(angle);

      timeline.to(
        item,
        {
          x: xPosition,
          y: yPosition,
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          duration: animationDuration,
          ease: "power2.inOut",
        },
        circleStartTime,
      );
    }
  }, [totalItems, radiusPercent, itemScale, animationDuration, setupDraggable]);

  useEffect(() => {
    const handleResize = () => {
      if (isReady) {
        calculateCirclePositions(true);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isReady, calculateCirclePositions]);

  useEffect(() => {
    if (isReady) {
      calculateCirclePositions(true);
    }
  }, [radiusPercent, isReady, calculateCirclePositions]);

  useEffect(() => {
    const items = itemRefs.current.filter((item) => item !== null);
    if (items.length > 0) {
      gsap.set(items, {
        x: 0,
        y: 0,
        rotation: 0,
        scale: 0,
        opacity: 0,
        boxShadow: "0 0 0 rgba(0, 0, 0, 0)",
      });
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      initializeGallery();
    }, 50);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (focusedIndex !== null && draggableRef.current) {
      draggableRef.current[0]?.kill();
      draggableRef.current = null;
    } else if (focusedIndex === null && isReady && enableDrag) {
      setupDraggable();
    }
  }, [focusedIndex, isReady, enableDrag, setupDraggable]);

  useEffect(() => {
    if (
      !isReady ||
      !wheelRef.current ||
      autoSpin === 0 ||
      focusedIndex !== null
    ) {
      if (autoSpinRef.current) {
        autoSpinRef.current.kill();
        autoSpinRef.current = null;
      }
      return;
    }

    const currentRotation =
      (gsap.getProperty(wheelRef.current, "rotation") as number) || 0;

    autoSpinRef.current = gsap.to(wheelRef.current, {
      rotation: currentRotation + (autoSpin > 0 ? 360 : -360),
      duration: Math.abs(360 / autoSpin),
      ease: "none",
      repeat: -1,
      onUpdate: function () {
        const wheelRotation =
          gsap.getProperty(wheelRef.current, "rotation") || 0;
        itemRefs.current.forEach((item) => {
          if (item) {
            gsap.set(item, {
              rotation: -(wheelRotation as number),
            });
          }
        });
      },
    });

    return () => {
      if (autoSpinRef.current) {
        autoSpinRef.current.kill();
        autoSpinRef.current = null;
      }
    };
  }, [isReady, autoSpin, focusedIndex]);

  useEffect(() => {
    return () => {
      if (draggableRef.current) {
        draggableRef.current[0]?.kill();
      }
      if (autoSpinRef.current) {
        autoSpinRef.current.kill();
      }
      gsap.killTweensOf(wheelRef.current);
      gsap.killTweensOf(itemRefs.current);
    };
  }, []);

  const handleItemClick = (index: number, image: string) => {
    if (isDraggingRef.current) return;

    if (focusedIndex !== null && focusedIndex !== index) {
      return;
    }

    if (focusedIndex === index) {
      setFocusedIndex(null);

      const viewportDimension = Math.min(window.innerWidth, window.innerHeight);
      const circleRadius = viewportDimension * (radiusPercent / 100);
      const fullCircle = 2 * Math.PI;
      const stepAngle = fullCircle / totalItems;
      const currentRotation =
        gsap.getProperty(wheelRef.current, "rotation") || 0;
      const rotationInRadians = (currentRotation as number) * (Math.PI / 180);

      itemRefs.current.forEach((item, idx) => {
        if (item) {
          const angle = idx * stepAngle + rotationInRadians;
          const xPosition = circleRadius * Math.cos(angle);
          const yPosition = circleRadius * Math.sin(angle);

          gsap.to(item, {
            x: xPosition,
            y: yPosition,
            scale: itemScale,
            zIndex: 100 + idx,
            filter: "blur(0px)",
            duration: 0.6,
            ease: "power2.inOut",
          });
        }
      });
    } else {
      setFocusedIndex(index);

      itemRefs.current.forEach((item, idx) => {
        if (item) {
          if (idx === index) {
            gsap.to(item, {
              x: 0,
              y: 0,
              scale: itemScale * 1.8,
              zIndex: 1000,
              filter: "blur(0px)",
              duration: 0.6,
              ease: "power2.out",
            });
          } else {
            gsap.to(item, {
              scale: itemScale * 0.85,
              filter: "blur(5px)",
              duration: 0.6,
              ease: "power2.inOut",
            });
          }
        }
      });
    }

    if (onItemClick) {
      onItemClick(index, image);
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (focusedIndex !== null && e.target === containerRef.current) {
      setFocusedIndex(null);

      const viewportDimension = Math.min(window.innerWidth, window.innerHeight);
      const circleRadius = viewportDimension * (radiusPercent / 100);
      const fullCircle = 2 * Math.PI;
      const stepAngle = fullCircle / totalItems;
      const currentRotation =
        gsap.getProperty(wheelRef.current, "rotation") || 0;
      const rotationInRadians = (currentRotation as number) * (Math.PI / 180);

      itemRefs.current.forEach((item, idx) => {
        if (item) {
          const angle = idx * stepAngle + rotationInRadians;
          const xPosition = circleRadius * Math.cos(angle);
          const yPosition = circleRadius * Math.sin(angle);

          gsap.to(item, {
            x: xPosition,
            y: yPosition,
            scale: itemScale,
            zIndex: 100 + idx,
            filter: "blur(0px)",
            duration: 0.6,
            ease: "power2.inOut",
          });
        }
      });
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-screen overflow-hidden flex items-center justify-center",
        enableDrag && !focusedIndex && "cursor-grab active:cursor-grabbing",
        className,
      )}
      style={{ perspective: "2200px" }}
      onClick={handleContainerClick}
    >
      <div
        ref={wheelRef}
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        )}
        style={{ transformOrigin: "center center" }}
      >
        {displayItems.map((image, index) => (
          <div
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 overflow-hidden cursor-pointer select-none transition-shadow duration-300",
              focusedIndex === index && "ring-4 ring-white/50",
              itemClassName,
            )}
            style={{
              width: `${itemWidth}px`,
              height: `${itemHeight}px`,
              borderRadius: `${borderRadius}px`,
              transformOrigin: "center center",
              background:
                image.startsWith("linear-gradient") ||
                image.startsWith("radial-gradient")
                  ? image
                  : `url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
            onClick={() => handleItemClick(index, image)}
          >
            {showNumbers && (
              <div className="absolute top-2 left-2 text-white/80 text-sm font-bold z-10 drop-shadow-md">
                {String(index + 1).padStart(3, "0")}
              </div>
            )}
            {renderItem && renderItem(index, image)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CircleGallery;
