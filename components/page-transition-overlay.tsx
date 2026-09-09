"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Preloader from "@/components/preloader";
import { subscribePageTransition } from "@/lib/page-transition";

export function PageTransitionOverlay() {
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    return subscribePageTransition(() => {
      setActive(true);
      setLoading(true);
    });
  }, []);

  useEffect(() => {
    if (active) {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

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
