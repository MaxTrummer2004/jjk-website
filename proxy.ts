/**
 * Eingeloggte landen im Mitgliederbereich, nicht auf dem Titelbild.
 *
 * Die Datei heisst proxy.ts und nicht middleware.ts: Next 16 hat die alte
 * Namenskonvention als veraltet markiert und warnt bei jedem Build.
 *
 * Wer angemeldet ist, kennt die Seite. Er kommt wegen der Anwesenheitsliste
 * und nicht wegen des Hero-Bildes, und sich jedes Mal durch die ganze
 * Startseite zu scrollen ist eine Zumutung, die mit jedem Besuch waechst.
 *
 * ── Warum hier und nicht in app/page.tsx ────────────────────────────────────
 * Ein Cookie-Zugriff in der Seite selbst macht sie dynamisch: Next müsste sie
 * bei jedem Aufruf neu rendern, auch fuer die neunundneunzig Prozent der
 * Besucher, die gar kein Cookie haben. Die Middleware sieht das Cookie, ohne
 * dass die Seite ihre statische Auslieferung verliert.
 *
 * ── Warum nur das Cookie geprueft wird und nicht das Token ──────────────────
 * Hier faellt keine Zugriffsentscheidung. Wer ein gefaelschtes Cookie
 * mitbringt, wird auf /mitglieder geschickt — und dort von
 * getSessionMemberId() als nicht eingeloggt behandelt und bekommt das
 * Login-Formular. Das Token in der Middleware zu pruefen hiesse, jede
 * Anfrage an die Startseite eine Signaturpruefung kosten zu lassen, um am
 * Ende dasselbe Ergebnis zu bekommen.
 *
 * ── Der Ausweg ──────────────────────────────────────────────────────────────
 * jjk_home setzt der "← Startseite"-Link im Mitgliederbereich (siehe
 * app/mitglieder/home-link.tsx). Ohne ihn koennte ein Mitglied die
 * oeffentliche Seite nie wieder sehen, und ich selbst meine eigene Website
 * auch nicht.
 */

import { NextResponse, type NextRequest } from "next/server";
import { HOME_OVERRIDE_COOKIE, SESSION_COOKIE } from "@/lib/session-cookies";

export default function proxy(request: NextRequest): NextResponse {
  const loggedIn = request.cookies.has(SESSION_COOKIE);
  const wantsHome = request.cookies.has(HOME_OVERRIDE_COOKIE);

  if (loggedIn && !wantsHome) {
    return NextResponse.redirect(new URL("/mitglieder", request.url));
  }
  return NextResponse.next();
}

// Nur die Startseite. Alles andere — auch /impressum, /datenschutz und die
// statischen Dateien — laeuft unberuehrt durch.
export const config = { matcher: "/" };
