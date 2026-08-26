import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

/**
 * Login-Sessions fuer den Mitgliederbereich: ein signiertes JWT in einem
 * httpOnly-Cookie (kein Passwort, keine DB-Session-Tabelle noetig — das
 * Token traegt nur die Mitglieds-ID und ist server-seitig gegen
 * Faelschung geschuetzt, per AUTH_SECRET).
 */
const COOKIE_NAME = "jjk_session";
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

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSession(memberId: number): Promise<void> {
  const token = await new SignJWT({ memberId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
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
