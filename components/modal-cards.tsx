"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface CardData {
  /** Unique identifier for the card */
  id: string;
  /** Image URL for the card (optional — omit when using renderCardFace) */
  imageUrl?: string;
  /** Title displayed on the card overlay */
  title: string;
  /** Description shown when card is expanded */
  description: string;
  /** Optional gradient color for the backdrop (defaults to purple #6366f1) */
  gradientColor?: string;
}

export interface ModalCardsProps {
  /** Array of card data to display */
  cards?: CardData[];
  /** Additional CSS classes for the container */
  className?: string;
  /** Default gradient color for all cards (can be overridden per card) */
  gradientColor?: string;
  /** Animation speed preset (default: "normal") */
  animationSpeed?: "slow" | "normal" | "fast" | "none";
  /** Override spring stiffness for animations */
  springStiffness?: number;
  /** Override spring damping for animations */
  springDamping?: number;
  /** Animation variant for modal entry (default: "scale") */
  animationVariant?: "scale" | "fade" | "slide";
  /** Close modal when clicking backdrop (default: true) */
  closeOnBackdropClick?: boolean;
  /** Close modal when pressing Escape key (default: true) */
  closeOnEscape?: boolean;
  /** Show close button in modal (default: true) */
  showCloseButton?: boolean;
  /** Aria label for modal accessibility */
  ariaLabel?: string;
  /** Position of backdrop gradient (default: "50% 10%") */
  backdropGradientPosition?: string;
  /** Custom CSS classes for modal container */
  modalClassName?: string;
  /** Custom CSS classes for backdrop */
  backdropClassName?: string;
  /** Replaces the image element on each card face (and in the modal top area) */
  renderCardFace?: (card: CardData) => ReactNode;
  /** Replaces the entire image+overlay section in the expanded modal */
  renderModalTop?: (card: CardData) => ReactNode;
  /** Background color for the modal container (default: system light-dark) */
  modalBgColor?: string;
}

const defaultCards: CardData[] = [
  {
    id: "1",
    imageUrl:
      "https://images.unsplash.com/photo-1682687220742-aba13b6e50ba?w=800&h=600&fit=crop",
    title: "Mountain Vista",
    description:
      "Breathtaking views from the summit, where clouds dance below and peaks stretch endlessly into the horizon. Experience the majesty of nature's grand architecture.",
    gradientColor: "#6366f1",
  },
  {
    id: "2",
    imageUrl:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop",
    title: "Ocean Waves",
    description:
      "The rhythmic pulse of the ocean, where turquoise waters meet golden shores. Feel the power and serenity of the endless sea as waves crash against ancient rocks.",
    gradientColor: "#14b8a6",
  },
  {
    id: "3",
    imageUrl:
      "https://images.unsplash.com/photo-1511593358241-7eea1f3c84e5?w=800&h=600&fit=crop",
    title: "Forest Path",
    description:
      "Wander through emerald corridors where sunlight filters through ancient trees. Discover the peaceful harmony of a woodland sanctuary untouched by time.",
    gradientColor: "#10b981",
  },
];

const ANIMATION_SPEEDS = {
  slow: { duration: 0.6, springStiffness: 200, springDamping: 25 },
  normal: { duration: 0.4, springStiffness: 300, springDamping: 30 },
  fast: { duration: 0.2, springStiffness: 400, springDamping: 35 },
  none: { duration: 0, springStiffness: 500, springDamping: 50 },
};

const ModalCards = ({
  cards = defaultCards,
  className,
  gradientColor = "#6366f1",
  animationSpeed = "normal",
  springStiffness,
  springDamping,
  animationVariant = "scale",
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  ariaLabel = "Card details modal",
  backdropGradientPosition = "50% 10%",
  modalClassName,
  backdropClassName,
  renderCardFace,
  renderModalTop,
  modalBgColor,
}: ModalCardsProps) => {
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  const speedConfig = ANIMATION_SPEEDS[animationSpeed];
  const finalStiffness = springStiffness ?? speedConfig.springStiffness;
  const finalDamping = springDamping ?? speedConfig.springDamping;
  const isAnimationDisabled = animationSpeed === "none";

  const springTransition = {
    type: "spring" as const,
    stiffness: finalStiffness,
    damping: finalDamping,
  };

  const smoothSpring = {
    type: "spring" as const,
    stiffness: finalStiffness * 1.3,
    damping: finalDamping * 1.2,
  };

  const softSpring = {
    type: "spring" as const,
    stiffness: finalStiffness * 0.7,
    damping: finalDamping * 0.9,
  };

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (selectedCard) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedCard]);

  useEffect(() => {
    if (!closeOnEscape || !selectedCard) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedCard(null);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [selectedCard, closeOnEscape]);

  const handleClose = () => {
    if (closeOnBackdropClick) {
      setSelectedCard(null);
    }
  };

  const handleImageLoad = (id: string) => {
    setLoadedImages((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  const getInitialAnimation = () => {
    if (isAnimationDisabled) return { opacity: 1 };

    switch (animationVariant) {
      case "fade":
        return { opacity: 0 };
      case "slide":
        return { opacity: 0, y: 50 };
      case "scale":
      default:
        return { opacity: 0, scale: 0.9 };
    }
  };

  const getAnimateAnimation = () => {
    if (isAnimationDisabled) return { opacity: 1 };

    switch (animationVariant) {
      case "fade":
        return { opacity: 1 };
      case "slide":
        return { opacity: 1, y: 0 };
      case "scale":
      default:
        return { opacity: 1, scale: 1 };
    }
  };

  const getExitAnimation = () => {
    if (isAnimationDisabled) return { opacity: 1 };

    switch (animationVariant) {
      case "fade":
        return { opacity: 0 };
      case "slide":
        return { opacity: 0, y: 50 };
      case "scale":
      default:
        return { opacity: 0, scale: 0.9 };
    }
  };

  return (
    <div className={cn("relative w-full @container", className)}>
      <div className="grid grid-cols-1 @md:grid-cols-2 @xl:grid-cols-3 gap-6 p-4">
        {cards.map((card) => (
          <motion.div
            key={card.id}
            layoutId={`card-${card.id}`}
            onClick={() => setSelectedCard(card)}
            className="relative cursor-pointer rounded-2xl overflow-hidden group border aspect-4/3"
            {...(isAnimationDisabled ? {} : { whileTap: { scale: 0.98 } })}
            transition={isAnimationDisabled ? { duration: 0 } : smoothSpring}
          >
            {renderCardFace ? (
              renderCardFace(card)
            ) : (
              <>
                {card.imageUrl && (
                  <motion.img
                    layoutId={`image-${card.id}`}
                    src={card.imageUrl}
                    alt={card.title}
                    className={cn(
                      "w-full h-full object-cover transition-opacity duration-500",
                      loadedImages.has(card.id) ? "opacity-100" : "opacity-0",
                    )}
                    onLoad={() => handleImageLoad(card.id)}
                  />
                )}
                <motion.div
                  layoutId={`overlay-${card.id}`}
                  className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/50 to-transparent p-6 pt-12"
                >
                  <div className="flex items-end justify-between">
                    <motion.h3
                      layoutId={`title-${card.id}`}
                      className="text-white text-xl font-bold"
                    >
                      {card.title}
                    </motion.h3>
                    <motion.div
                      layoutId={`icon-${card.id}`}
                      className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white group-hover:bg-white/30 transition-colors"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M8 3V13M3 8H13"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </motion.div>
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        ))}
      </div>

      {mounted &&
        createPortal(
          <AnimatePresence mode="wait">
            {selectedCard && (
              <>
                <motion.div
                  initial={
                    isAnimationDisabled
                      ? { opacity: 1 }
                      : { opacity: 0, backdropFilter: "blur(0px)" }
                  }
                  animate={
                    isAnimationDisabled
                      ? { opacity: 1 }
                      : { opacity: 1, backdropFilter: "blur(8px)" }
                  }
                  exit={
                    isAnimationDisabled
                      ? { opacity: 1 }
                      : { opacity: 0, backdropFilter: "blur(0px)" }
                  }
                  transition={
                    isAnimationDisabled
                      ? { duration: 0 }
                      : {
                          duration: speedConfig.duration,
                          ease: [0.32, 0.72, 0, 1],
                        }
                  }
                  onClick={handleClose}
                  className={cn(
                    "fixed inset-0 z-999999",
                    closeOnBackdropClick && "cursor-pointer",
                    backdropClassName,
                  )}
                  style={{
                    background: `radial-gradient(125% 125% at ${backdropGradientPosition}, light-dark(#fff, #0a0a0a) 40%, ${selectedCard.gradientColor || gradientColor} 100%)`,
                  }}
                  role="button"
                  aria-label={closeOnBackdropClick ? "Close modal" : undefined}
                  tabIndex={closeOnBackdropClick ? 0 : -1}
                />

                <div
                  className="fixed inset-0 z-1000000 flex items-center justify-center p-8 pointer-events-none"
                  role="dialog"
                  aria-modal="true"
                  aria-label={ariaLabel}
                >
                  <motion.div
                    {...(animationVariant === "scale" ? { layoutId: `card-${selectedCard.id}` } : {})}
                    initial={getInitialAnimation()}
                    animate={getAnimateAnimation()}
                    exit={getExitAnimation()}
                    className={cn(
                      "relative rounded-2xl overflow-hidden max-w-3xl w-full max-h-[80vh] bg-white shadow-2xl pointer-events-auto",
                      modalClassName,
                    )}
                    style={{
                      backgroundColor: modalBgColor ?? "light-dark(#fff, #0a0a0a)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                    transition={
                      isAnimationDisabled ? { duration: 0 } : springTransition
                    }
                  >
                    {renderModalTop ? (
                      <div className="relative">
                        {renderModalTop(selectedCard)}
                        {showCloseButton && (
                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCard(null);
                            }}
                            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
                            {...(isAnimationDisabled ? {} : { whileHover: { scale: 1.1, rotate: 90 }, whileTap: { scale: 0.9 } })}
                            transition={isAnimationDisabled ? { duration: 0 } : smoothSpring}
                            aria-label="Close modal"
                          >
                            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            </svg>
                          </motion.button>
                        )}
                      </div>
                    ) : (
                      <motion.div className="relative h-96">
                        {selectedCard.imageUrl && (
                          <motion.img
                            {...(animationVariant === "scale" ? { layoutId: `image-${selectedCard.id}` } : {})}
                            src={selectedCard.imageUrl}
                            alt={selectedCard.title}
                            className="w-full h-full object-cover"
                            transition={isAnimationDisabled ? { duration: 0 } : springTransition}
                          />
                        )}
                        <motion.div
                          {...(animationVariant === "scale" ? { layoutId: `overlay-${selectedCard.id}` } : {})}
                          className="absolute bottom-0 left-0 right-0 bg-linear-to-t from-black/80 via-black/50 to-transparent p-6 pt-12"
                          transition={isAnimationDisabled ? { duration: 0 } : springTransition}
                        >
                          <div className="flex items-end justify-between">
                            <motion.h3
                              {...(animationVariant === "scale" ? { layoutId: `title-${selectedCard.id}` } : {})}
                              className="text-white text-3xl font-bold"
                              transition={isAnimationDisabled ? { duration: 0 } : springTransition}
                            >
                              {selectedCard.title}
                            </motion.h3>
                            {showCloseButton && (
                              <motion.button
                                {...(animationVariant === "scale" ? { layoutId: `icon-${selectedCard.id}` } : {})}
                                onClick={(e) => { e.stopPropagation(); setSelectedCard(null); }}
                                className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors"
                                {...(isAnimationDisabled ? {} : { whileHover: { scale: 1.1, rotate: 90 }, whileTap: { scale: 0.9 } })}
                                transition={isAnimationDisabled ? { duration: 0 } : smoothSpring}
                                aria-label="Close modal"
                              >
                                <svg width="20" height="20" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                              </motion.button>
                            )}
                          </div>
                        </motion.div>
                      </motion.div>
                    )}

                    <motion.div
                      className="p-8 overflow-y-auto"
                      initial={
                        isAnimationDisabled ? { opacity: 1 } : { opacity: 0 }
                      }
                      animate={{ opacity: 1 }}
                      exit={
                        isAnimationDisabled ? { opacity: 1 } : { opacity: 0 }
                      }
                      transition={
                        isAnimationDisabled
                          ? { duration: 0 }
                          : {
                              duration: speedConfig.duration * 0.75,
                              delay: speedConfig.duration * 0.375,
                              ease: [0.32, 0.72, 0, 1],
                            }
                      }
                    >
                      <motion.p
                        className="text-foreground/70 text-lg leading-relaxed"
                        initial={
                          isAnimationDisabled
                            ? { opacity: 1, y: 0 }
                            : { opacity: 0, y: 10 }
                        }
                        animate={{ opacity: 1, y: 0 }}
                        exit={
                          isAnimationDisabled
                            ? { opacity: 1, y: 0 }
                            : { opacity: 0, y: 10 }
                        }
                        transition={
                          isAnimationDisabled ? { duration: 0 } : softSpring
                        }
                      >
                        {selectedCard.description}
                      </motion.p>
                    </motion.div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
};

ModalCards.displayName = "ModalCards";

export default ModalCards;
