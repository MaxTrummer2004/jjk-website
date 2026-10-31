import { createHash, randomBytes } from "node:crypto";

/**
 * Einrichtungslinks (/konto-einrichten?token=…), 31.10.2026.
 *
 * In der Datenbank steht nur der SHA-256 des Tokens (members.setup_token_hash)
 * und wann er ablaeuft — den Token selbst kennt nur, wer den Link hat. Warum
 * und wie die Altbestaende umgezogen sind: lib/db.ts.
 *
 * 72 Stunden: lang genug fuer "Link per WhatsApp am Freitag, eingerichtet am
 * Sonntag", kurz genug, dass ein vergessener Link im Chatverlauf nicht Monate
 * spaeter noch ein Konto oeffnet. Danach erzeugt der Vorstand einen neuen.
 */
export const SETUP_TOKEN_HOURS = 72;

export function newSetupToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString("hex");
  return { token, hash: hashSetupToken(token) };
}

export function hashSetupToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}
