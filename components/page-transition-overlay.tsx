"use client";

import { useState, useEffect, useRef } from "react";
import Preloader from "@/components/preloader";
import { subscribePageTransition, subscribePageTransitionDismiss } from "@/lib/page-transition";

// Stairs brauchen ~600ms für Entry (7 Stufen × Stagger). Mindestens so lange
// zeigen, damit Exit-Animation nach echtem Reveal spielt, nicht sofort.
const MIN_DISPLAY_MS = 700;

export function PageTransitionOverlay() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const activeAtRef = useRef<number>(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubTrigger = subscribePageTransition(() => {
      activeAtRef.current = Date.now();
      setActive(true);
      setLoading(true);
    });
    const unsubDismiss = subscribePageTransitionDismiss(() => {
      const elapsed = Date.now() - activeAtRef.current;
      const wait = Math.max(0, MIN_DISPLAY_MS - elapsed);
      dismissTimerRef.current = setTimeout(() => setLoading(false), wait);
    });
    return () => {
      unsubTrigger();
      unsubDismiss();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // Fallback: nie länger als 5s zugedeckt bleiben
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 5000);
    return () => clearTimeout(t);
  }, [loading]);

  if (!active) return null;

  return (
    <Preloader
      loading={loading}
      variant="stairs"
      position="fixed"
      bgColor="#030304"
      stairCount={7}
      stairsRevealFrom="left"
      stairsRevealDirection="up"
      loadingText=""
      zIndex={200}
      onLoadingComplete={() => setActive(false)}
    />
  );
}
