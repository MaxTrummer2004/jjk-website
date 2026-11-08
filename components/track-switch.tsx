"use client";

import type { ReactNode } from "react";
import type { Track } from "@/lib/membership";

/**
 * Umschalter "Alle Kurse" / "Nur Boxen (ohne BJJ)" (Vorstand, 08.11.2026).
 * Steht in der Preissektion der Startseite und in der Beitrittserklaerung;
 * je nach Stellung zeigen beide die Boxen-Tarife statt "Alle Kurse".
 */
export function TrackSwitch({
  value,
  onChange,
  className,
}: {
  value: Track;
  onChange: (track: Track) => void;
  className?: string;
}): ReactNode {
  const options: { id: Track; label: string }[] = [
    { id: "all", label: "Alle Kurse" },
    { id: "box", label: "Nur Boxen (ohne BJJ)" },
  ];
  return (
    <div role="group" aria-label="Angebot wählen" className={`jjk-track ${className ?? ""}`}>
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className="jjk-track-btn"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
