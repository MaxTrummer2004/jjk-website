import type { Metadata } from "next";
import type { ReactNode } from "react";
import { createMetadata } from "@/lib/metadata";

// 30.10.2026: eigene Metadaten. Vorher erbte /mitglieder von der Wurzel
// index,follow und canonical = Startseite. noindex steht jetzt hier im
// <head>, und robots.txt sperrt /mitglieder NICHT mehr — sonst liest Google
// das noindex nie (Begruendung in app/robots.ts). Im Layout statt in
// page.tsx, damit es fuer jede kuenftige Unterseite mitgilt.
export const metadata: Metadata = createMetadata({
  title: "Mitgliederbereich",
  description: "Anmeldung und Mitgliederbereich der Jiu-Jitsu Kaisen Academy.",
  path: "/mitglieder",
  noIndex: true,
});

export default function MitgliederLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
