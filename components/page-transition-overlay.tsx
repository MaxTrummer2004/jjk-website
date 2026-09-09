"use client";

import { useState, useEffect } from "react";
import Preloader from "@/components/preloader";
import { subscribePageTransition, subscribePageTransitionDismiss } from "@/lib/page-transition";

export function PageTransitionOverlay() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubTrigger = subscribePageTransition(() => {
      setActive(true);
      setLoading(true);
    });
    const unsubDismiss = subscribePageTransitionDismiss(() => {
      setLoading(false);
    });
    return () => {
      unsubTrigger();
      unsubDismiss();
    };
  }, []);

  // Fallback: nie länger als 4s zugedeckt bleiben
  useEffect(() => {
    if (!loading) return;
    const t = setTimeout(() => setLoading(false), 4000);
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
