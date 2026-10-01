import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  HOME_OVERRIDE_COOKIE,
  MEMBER_HINT_COOKIE,
  SESSION_COOKIE,
} from "@/lib/session-cookies";

/**
 * Login-Sessions fuer den Mitgliederbereich: ein signiertes JWT in einem
 * httpOnly-Cookie (kein Passwort, keine DB-Session-Tabelle noetig — das
 * Token traegt nur die Mitglieds-ID und ist server-seitig gegen
 * Faelschung geschuetzt, per AUTH_SECRET).
 */
const COOKIE_NAME = SESSION_COOKIE;
const SESSION_SECONDS = 60 * 60 * 24 * 90; // 90 Tage eingeloggt bleiben

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET fehlt. In Vercel unter Project Settings -> Environment " +
        "Variables setzen (irgendein langer, zufaelliger String reicht)."
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

export function verifyPassword(password: string, hash: string): Promise<boolean> {
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
  const token = await new SignJWT({ memberId })
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

export async function getSessionMemberId(): Promise<number | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.memberId === "number" ? payload.memberId : null;
  } catch {
    return null;
  }
}
