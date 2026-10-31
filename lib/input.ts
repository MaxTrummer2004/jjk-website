/**
 * Pruefung freier Texteingaben fuer Beitritt und Probetraining (31.10.2026).
 *
 * Anlass (Sicherheitsreview): Beide Formulare schicken eine Mail von
 * info@jjk.academy, DKIM-signiert, an eine Adresse, die niemand bestaetigt
 * hat. Der Vorname stand bis dahin wortwoertlich in "Hallo ${vorname}," —
 * ohne Laengengrenze. Ein Vorname wie "Max, dein Konto wird gesperrt,
 * melde dich unter https://…" machte aus dem Formular ein Werkzeug fuer
 * Phishing mit unserem Absender und unserer Brevo-Reputation. Die Mails an
 * unbestaetigte Adressen nennen den Namen deshalb gar nicht mehr (siehe die
 * beiden actions.ts); diese Datei begrenzt zusaetzlich, was ueberhaupt
 * gespeichert und an den Vorstand gemailt wird.
 *
 * Bewusst KEINE Positivliste von Buchstaben: "Đorđe", "Nguyễn", "O'Brien",
 * "Anna-Lena", "Øster" sollen durchgehen, und eine Liste erlaubter Zeichen
 * vergisst immer jemanden. Verboten ist nur, was in einem Namen nie vorkommt,
 * in einem Phishing-Text aber immer: Zeilenumbrueche und Steuerzeichen,
 * Links ("://", "www."), E-Mail-Adressen ("@") und spitze Klammern.
 * Ziffern bleiben erlaubt — sie sperren keinen Missbrauch, den das Weglassen
 * des Namens in der Mail nicht schon sperrt.
 *
 * Reine Funktionen ohne Server-Importe: join-form.tsx liest die Grenzen fuer
 * maxLength von hier, damit Browser und Server dieselbe Zahl kennen.
 */

/**
 * Hoechstlaengen in UTF-16-Einheiten — dieselbe Zaehlweise wie das
 * maxLength-Attribut im Browser, also schneidet keiner der beiden frueher ab
 * als der andere. 254 fuer E-Mail ist die Grenze aus RFC 5321.
 */
export const MAX = {
  name: 60,
  address: 200,
  phone: 30,
  email: 254,
  /** Probetraining: E-Mail, Telefon oder Instagram-Name. */
  contact: 120,
  message: 1000,
} as const;

/**
 * Steuerzeichen (C0, DEL, C1 — darin \n, \r, \t), Zeilen-/Absatztrenner und
 * die Bidi-Steuerzeichen, mit denen sich Text rueckwaerts darstellen laesst
 * ("moc.lapyap" erscheint als "paypal.com"). Nicht ganz \p{Cf}: darin liegt
 * auch der Zero-Width-Non-Joiner, den persische Namen brauchen.
 */
const CONTROL_RE = /[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/;

/** Was in einem Namen nie steht: Link, Mailadresse, Markup. */
const NOT_A_NAME_RE = /:\/\/|www\.|@|[<>]/i;

/** Einzeiliges Feld ohne Steuerzeichen. */
export function hasControlChars(value: string): boolean {
  return CONTROL_RE.test(value);
}

/**
 * Prueft einen Vor- oder Nachnamen. Zurueck kommt die Fehlermeldung oder
 * null. `label` steht im Satz: "Der Vorname ist zu lang …".
 */
export function nameError(value: string, label: string): string | null {
  if (value.length > MAX.name) {
    return `${label} ist zu lang (höchstens ${MAX.name} Zeichen).`;
  }
  if (hasControlChars(value) || NOT_A_NAME_RE.test(value)) {
    return `${label} darf keine Links, E-Mail-Adressen, Zeilenumbrüche oder Zeichen wie < > enthalten.`;
  }
  return null;
}

/** Laenge und Steuerzeichen fuer ein sonstiges einzeiliges Feld. */
export function lineError(value: string, label: string, max: number): string | null {
  if (value.length > max) return `${label} ist zu lang (höchstens ${max} Zeichen).`;
  if (hasControlChars(value)) return `${label} darf keine Zeilenumbrüche oder Steuerzeichen enthalten.`;
  return null;
}
