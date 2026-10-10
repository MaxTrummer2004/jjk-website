import type { ReactNode } from "react";
import { DismissTransition } from "@/components/dismiss-transition";

/**
 * Ein Template wird – anders als das Layout – bei JEDEM Seitenwechsel neu
 * eingehaengt. Genau dafuer ist es hier: DismissTransition meldet "Zielseite
 * ist da", und die Treppen des Seitenuebergangs oeffnen sich. Vorher stand
 * das nur in /mitglieder; jede andere Zielseite blieb bis zum 5-Sekunden-
 * Notausgang zugedeckt.
 */
export default function Template({ children }: { children: ReactNode }): ReactNode {
  return (
    <>
      <DismissTransition />
      {children}
    </>
  );
}
