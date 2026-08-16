import type { ReactNode } from "react";

export function NavLogo(): ReactNode {
  return (
    <a
      href="#top"
      aria-label="JJK — Jiu-Jitsu Kaisen Academy"
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
