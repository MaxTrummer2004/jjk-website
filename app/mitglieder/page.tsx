import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Mitglieder — Jiu-Jitsu Kaisen Academy",
  robots: { index: false },
};

export default function MitgliederPage(): ReactNode {
  return (
    <main
      className="min-h-screen bg-background flex flex-col items-center justify-center gap-10 px-6 text-center"
      id="main-content"
    >
      <p
        className="font-sans text-base tracking-widest text-foreground/60"
        style={{ letterSpacing: "0.18em" }}
      >
        Hier kommt der Mitgliederbereich rein.
      </p>

      <Link
        href="/"
        className="font-sans text-xs tracking-widest uppercase"
        style={{
          letterSpacing: "0.28em",
          color: "rgba(192, 28, 20, 0.7)",
          textDecoration: "none",
        }}
      >
        ← Zurück
      </Link>
    </main>
  );
}
