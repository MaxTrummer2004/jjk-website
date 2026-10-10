"use client";

import type { MouseEvent, ReactNode } from "react";
import { useSectionTransition } from "@/lib/section-transition";

/**
 * Interner Link mit dem Seitenuebergang (Abdunkeln + Treppen), egal ob er zu
 * einem Abschnitt derselben Seite oder zu einer anderen Seite fuehrt. Ein
 * echtes <a href>, damit Mittelklick, "In neuem Tab oeffnen" und Links ohne
 * JavaScript weiter funktionieren — nur der normale Linksklick wird
 * abgefangen.
 */
export function TransitionLink({
  href,
  className,
  children,
  onClick,
  "aria-label": ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  /** Laeuft vor dem Uebergang, z. B. Menue schliessen oder ein Cookie setzen. */
  onClick?: () => void;
  "aria-label"?: string;
}): ReactNode {
  const { navigate } = useSectionTransition();
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={className}
      onClick={(e: MouseEvent<HTMLAnchorElement>) => {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onClick?.();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

export default TransitionLink;
