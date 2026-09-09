"use client";

import { useState, useEffect, type ReactNode } from "react";
import Preloader from "@/components/preloader";

export function MitgliederTransition({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 480);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
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
      />
      {children}
    </>
  );
}
