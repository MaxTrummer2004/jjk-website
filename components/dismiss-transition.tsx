"use client";

import { useEffect } from "react";
import { dismissPageTransition } from "@/lib/page-transition";

export function DismissTransition() {
  useEffect(() => {
    dismissPageTransition();
  }, []);
  return null;
}
