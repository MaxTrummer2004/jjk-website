/**
 * Die Namen der drei Cookies des Mitgliederbereichs — und sonst nichts.
 *
 * Eigene Datei, weil lib/auth.ts `next/headers` importiert und damit
 * ausschliesslich auf dem Server laufen kann. Die Kopfleiste und der
 * "← Startseite"-Link brauchen aber zwei dieser Namen im Browser. Wer die
 * Konstante von dort holt, zieht das ganze Modul mit — der Build bricht genau
 * daran ab, und zwar erst beim Bündeln, nicht bei tsc.
 *
 * Eine Datei mit drei Zeichenketten ist dafuer der ganze Preis.
 */

/** Das signierte JWT. httpOnly — nur der Server liest es. */
export const SESSION_COOKIE = "jjk_session";

/**
 * Sagt nur: hier ist jemand eingeloggt. Absichtlich NICHT httpOnly, damit die
 * statisch ausgelieferte Startseite im Browser entscheiden kann, ob der Knopf
 * "Jetzt anmelden" oder "Mein Bereich" heisst. Es traegt keine Entscheidung,
 * die Schutz braucht.
 */
export const MEMBER_HINT_COOKIE = "jjk_member";

/**
 * Setzt der "← Startseite"-Link, damit die Weiterleitung von / auf
 * /mitglieder fuer diesen Besuch aussetzt.
 */
export const HOME_OVERRIDE_COOKIE = "jjk_home";
