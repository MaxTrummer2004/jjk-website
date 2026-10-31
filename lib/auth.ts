import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ensureSchema, sql } from "@/lib/db";
import {
  HOME_OVERRIDE_COOKIE,
  MEMBER_HINT_COOKIE,
  SESSION_COOKIE,
} from "@/lib/session-cookies";

/**
 * Login-Sessions fuer den Mitgliederbereich: ein signiertes JWT in einem
 * httpOnly-Cookie (kein Passwort, keine DB-Session-Tabelle noetig — das
 * Token traegt die Mitglieds-ID und ist server-seitig gegen Faelschung
 * geschuetzt, per AUTH_SECRET).
 *
 * Seit 31.10.2026 traegt es ausserdem `sv`, die Sitzungsversion des Kontos
 * (members.session_version). Vorher war ein einmal ausgestelltes Token 90
 * Tage gueltig, egal was passierte: Passwort geaendert, vom Vorstand
 * zurueckgesetzt, per Einrichtungslink neu gesetzt — das alte Cookie auf dem
 * fremden Rechner kam weiter hinein. Jetzt zaehlt jede dieser Aktionen die
 * Version hoch, und getCurrentMember() (lib/members.ts) weist jedes Token mit
 * einer anderen Version ab. Eine Sitzungstabelle braucht das nicht: der
 * Vergleich laeuft in derselben Abfrage, die das Mitglied ohnehin laedt.
 */
const COOKIE_NAME = SESSION_COOKIE;
const SESSION_SECONDS = 60 * 60 * 24 * 90; // 90 Tage eingeloggt bleiben

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET fehlt. Im Scalingo-Dashboard unter Environment setzen " +
        "(irgendein langer, zufaelliger String reicht)."
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * bcryptjs steht seit dem Upgrade auf 3.x (vorher 2.4.3). Das war die Frage,
 * an der es haengt: BLEIBEN BESTEHENDE HASHES PRUEFBAR? Ja — geprueft, nicht
 * vermutet. Ein mit 2.4.3 erzeugter Hash ($2a$10$…) verifiziert unter 3.0.3
 * sowohl mit compare() als auch mit compareSync() gegen das richtige Passwort
 * true und gegen ein falsches false. Das Format ist dasselbe geblieben; neu
 * erzeugte Hashes tragen nur das Praefix $2b$ statt $2a$, was beide Versionen
 * lesen.
 *
 * Mitgegangen ist @types/bcryptjs: 3.x bringt eigene Typen mit, das
 * DefinitelyTyped-Paket waere ab jetzt eine zweite, aeltere Deklaration
 * derselben Modulnamen.
 */
export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Laengengrenzen fuer Eingaben, bevor gerechnet wird (31.10.2026).
 *
 * bcrypt liest nur die ersten 72 BYTE eines Passworts, der Rest wird still
 * abgeschnitten: "72 x a" und "72 x a + irgendwas" waeren dasselbe Passwort,
 * und wer sich ein langes Passwort ausdenkt, glaubt an eine Sicherheit, die
 * es nicht gibt. Neue Passwoerter ueber 72 Byte werden deshalb abgewiesen
 * statt gekuerzt (Umlaute zaehlen in UTF-8 doppelt).
 *
 * Beim PRUEFEN (Login, aktuelles Passwort) gilt die Grenze NICHT: wer vor
 * heute ein laengeres Passwort gesetzt hat, kommt damit weiter hinein, weil
 * bcrypt beim Pruefen genauso abschneidet wie beim Setzen. Dort nur eine
 * grobe Obergrenze, damit niemand ein Megabyte durch den Encoder schickt.
 *
 * E-Mail: 254 Zeichen ist die Obergrenze nach RFC 5321. Sie steht VOR jedem
 * regulaeren Ausdruck — /^[^\s@]+@[^\s@]+\.[^\s@]+$/ braucht auf 40 000
 * Punkten 2,4 s (gemessen), quadratisch im Rueckverfolgen.
 */
export const MAX_PASSWORD_BYTES = 72;
export const MAX_PASSWORD_CHECK_CHARS = 1024;
export const MAX_EMAIL_CHARS = 254;

export function passwordTooLong(password: string): boolean {
  return new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES;
}

export const PASSWORD_TOO_LONG =
  "Das Passwort ist zu lang (höchstens 72 Zeichen, Umlaute zählen doppelt).";

/**
 * Ein Hash, gegen den nie jemand gewinnt — nur damit ein Login mit
 * unbekannter Adresse genauso lange rechnet wie einer mit falschem Passwort
 * (30.10.2026). Vorher kam "falsch" bei unbekannter Adresse sofort, bei
 * bekannter nach ~70 ms bcrypt: an der Antwortzeit liess sich ablesen, wer
 * Mitglied ist. Einmal je Prozess erzeugt, beim ersten Bedarf, mit derselben
 * Kostenstufe wie hashPassword().
 */
let dummyHash: Promise<string> | null = null;

export async function verifyPassword(
  password: string,
  hash: string | null | undefined
): Promise<boolean> {
  // Kein Konto, oder ein per SQL mit Einrichtungslink angelegtes ohne
  // Passwort (Platzhalter statt bcrypt-Hash): niemand kommt hinein. Gerechnet
  // wird trotzdem, gegen den Blindhash, damit die Zeit nichts verraet.
  if (!hash || !hash.startsWith("$2")) {
    dummyHash ??= hashPassword(crypto.randomUUID());
    await bcrypt.compare(password, await dummyHash);
    return false;
  }
  return bcrypt.compare(password, hash);
}

/**
 * `remember` entscheidet ueber die Lebensdauer, nicht ueber den Inhalt: mit
 * Haken 90 Tage, ohne Haken ein Sitzungs-Cookie, das mit dem Browser endet.
 * Das JWT traegt in beiden Faellen dieselbe Ablaufzeit — ein Token, das laenger
 * gilt als sein Cookie, schadet niemandem, eines das kuerzer gilt wuerde mitten
 * im Training abgewiesen.
 */
export async function createSession(
  memberId: number,
  remember = true
): Promise<void> {
  // Die Version kommt aus der Datenbank, nicht vom Aufrufer: so kann kein
  // Aufrufer (Login, Beitritt, Einrichtungslink, Passwortwechsel) ein Token
  // mit veralteter Version ausstellen, das sofort wieder abgewiesen wuerde.
  // Eine Abfrage je Login, nicht je Seitenaufruf.
  await ensureSchema();
  const rows = await sql<{ session_version: number }>`
    select session_version from members where id = ${memberId}
  `;
  const sv = rows[0]?.session_version ?? 0;
  // `rm` merkt sich den Haken, damit ein neu ausgestelltes Token (nach dem
  // Passwortwechsel) dieselbe Cookie-Lebensdauer bekommt wie das alte.
  const token = await new SignJWT({ memberId, sv, rm: remember })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  const lifetime = remember ? { maxAge: SESSION_SECONDS } : {};
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...lifetime,
  });
  store.set(MEMBER_HINT_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...lifetime,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  store.delete(MEMBER_HINT_COOKIE);
  // Sonst bliebe die Weiterleitung fuer den Rest der Sitzung ausgesetzt und der
  // naechste Login landete wieder auf der Startseite.
  store.delete(HOME_OVERRIDE_COOKIE);
}

export interface SessionClaims {
  memberId: number;
  /** Sitzungsversion beim Ausstellen; muss zu members.session_version passen. */
  sv: number;
  /** Haken "eingeloggt bleiben" beim Login. */
  remember: boolean;
  /** Ausgestellt um (Sekunden seit 1970). */
  iat: number;
}

/**
 * Liest und prueft NUR die Signatur des Cookies — nicht, ob die Sitzung noch
 * gilt. Hiess bis 31.10.2026 getSessionMemberId(); umbenannt, damit niemand
 * es weiter als "wer ist eingeloggt" benutzt und dabei an der Sitzungs-
 * version vorbeigeht. Die einzige Stelle, die daraus ein Mitglied macht, ist
 * getCurrentMember() in lib/members.ts.
 *
 * Tokens von vor dem 31.10.2026 haben kein `sv`. Sie gelten als Version 0:
 * die Spalte entsteht mit Vorgabe 0 fuer jede bestehende Zeile, ein altes
 * Token passt also genau so lange, bis das Konto zum ersten Mal hochzaehlt —
 * danach ist es ungueltig wie jedes andere. Wer beim Deploy eingeloggt ist,
 * bleibt es; widerrufbar ist trotzdem jedes Token. Ohne `rm` gilt "merken",
 * weil das JWT ohnehin 90 Tage traegt und der Haken vorgewaehlt ist.
 */
export async function readSessionClaims(): Promise<SessionClaims | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.memberId !== "number") return null;
    return {
      memberId: payload.memberId,
      sv: typeof payload.sv === "number" ? payload.sv : 0,
      remember: typeof payload.rm === "boolean" ? payload.rm : true,
      iat: typeof payload.iat === "number" ? payload.iat : 0,
    };
  } catch {
    return null;
  }
}
