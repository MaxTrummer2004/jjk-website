import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { logoutAction } from "./actions";
import { HomeLink } from "./home-link";

/**
 * Was ein Mitglied mit offenem (oder abgelehntem) Antrag sieht: nur den
 * eigenen Statusblock, den Weg zurueck und das Abmelden. Keine Rangliste,
 * keine Namen anderer Mitglieder.
 */
export function PendingView({ children }: { children: ReactNode }): ReactNode {
  return (
    <main
      id="main-content"
      className="flex min-h-screen w-full items-start justify-center px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="flex w-full max-w-lg flex-col gap-6">
        <HomeLink />
        {children}
        <form action={logoutAction}>
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border bg-card-plate text-sm font-medium text-foreground transition-colors hover:border-border-hot focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </form>
      </div>
    </main>
  );
}
