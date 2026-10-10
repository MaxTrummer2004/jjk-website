"use client";

import { useIsDesktop } from "@/lib/use-is-desktop";
import { useSectionTransition } from "@/lib/section-transition";
import type { ReactNode } from "react";

export function NavLogo(): ReactNode {
  const isDesktop = useIsDesktop();
  const { navigate } = useSectionTransition();

  const href = isDesktop ? "#top" : "/mitglieder";
  const label = isDesktop
    ? "JJK: Jiu-Jitsu Kaisen Academy"
    : "Für Mitglieder";

  // Beide Faelle laufen jetzt ueber denselben Uebergang wie jeder andere Link.
  const handleClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    navigate(href);
  };

  return (
    <a
      href={href}
      aria-label={label}
      onClick={handleClick}
      className="group inline-flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
    >
      <span className="border-border bg-background flex h-13 w-13 items-center justify-center rounded-full border transition-transform duration-500 group-hover:rotate-180">
        <span
          className="text-foreground text-base leading-none"
          style={{
            fontFamily: "var(--font-jp)",
            fontWeight: 700,
          }}
          aria-hidden="true"
        >
          柔
        </span>
      </span>
    </a>
  );
}
