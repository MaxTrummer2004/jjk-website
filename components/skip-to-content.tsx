import type { ReactNode } from "react";

// 31.10.2026: deutsch. Hier stand "Skip to main content" aus dem Template,
// auf einer Seite mit lang="de" — ein Screenreader las es mit deutscher
// Aussprache vor, und es war der erste Tab-Halt jeder Seite.
export function SkipToContent(): ReactNode {
  return (
    <a href="#main-content" className="skip-to-content">
      Zum Inhalt springen
    </a>
  );
}
