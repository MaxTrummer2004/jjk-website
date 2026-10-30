import { siteConfig } from "@/lib/config";

/**
 * Mollie, direkt ueber die REST-API (https://api.mollie.com/v2/), ohne SDK —
 * vier Aufrufe rechtfertigen keine Abhaengigkeit.
 *
 * Aktiv erst, wenn MOLLIE_API_KEY gesetzt ist (Scalingo → Environment). Ohne
 * Schluessel gibt es keinen Bezahlknopf, und der Mitgliederbereich verhaelt
 * sich wie vor der Online-Zahlung. So entscheidet der Vorstand, wann es live
 * geht, nicht der naechste Push.
 *
 * Ablauf bei "Alle Kurse" (monatlich):
 *   1. Erste Zahlung mit sequenceType "first" ueber EPS: Einschreibgebuehr +
 *      aktueller Monat. Mollie legt dabei ein SEPA-Lastschriftmandat an
 *      (docs.mollie.com/docs/recurring-payments: eps → directdebit).
 *   2. Ist sie bezahlt, legt der Webhook ein Abo an: ab dem naechsten
 *      Monatsersten, "1 month", bei Bindung mit begrenzter Anzahl (Jahr 11,
 *      3 Monate 2 — der erste Monat ist schon bezahlt), bei Flex unbegrenzt.
 *   3. Jede Abbuchung kommt als Webhook und wird als payments-Zeile mit
 *      source = 'online' eingetragen. Der Status wird von selbst gruen.
 *
 * 10er-Block: eine einzelne Zahlung (oneoff), kein Abo.
 */

const API = "https://api.mollie.com/v2";

/** Methoden fuer die erste Zahlung. EPS erzeugt ein SEPA-Mandat — genau das
 *  ist gewollt (Vorgabe: Beitraege immer per SEPA). In Mollie muessen dafuer
 *  "EPS" UND "SEPA Direct Debit" aktiviert sein. */
export const FIRST_PAYMENT_METHODS = ["eps"];

/**
 * Testzahlungen zaehlen nur ausserhalb der Produktion (30.10.2026). Mit einem
 * test_-Schluessel im Live-Betrieb konnte ein Mitglied im Test-Checkout von
 * Mollie auf "paid" klicken, und der Webhook trug das als echte Zahlung ein:
 * gruener Status, kein Geld. Wer im Live-Betrieb bewusst testen will, setzt
 * MOLLIE_ALLOW_TEST=1 bei Scalingo und nimmt es danach wieder heraus.
 */
export function testPaymentsAllowed(): boolean {
  return process.env.NODE_ENV !== "production" || process.env.MOLLIE_ALLOW_TEST === "1";
}

function isTestKey(): boolean {
  return process.env.MOLLIE_API_KEY?.startsWith("test_") ?? false;
}

/** Ein test_-Schluessel im Live-Betrieb gilt als NICHT eingerichtet: ein
 *  Bezahlknopf, dessen Ergebnis der Webhook ohnehin verwirft, ist schlimmer
 *  als keiner. Ohne Knopf zeigt der Statusblock die Bankdaten. */
export function isMollieConfigured(): boolean {
  if (!process.env.MOLLIE_API_KEY) return false;
  return !isTestKey() || testPaymentsAllowed();
}

/** Hinweis fuer /vorstand, wenn der Schluessel nicht zum Betrieb passt; sonst null. */
export function mollieKeyWarning(): string | null {
  if (!isTestKey() || process.env.NODE_ENV !== "production") return null;
  return testPaymentsAllowed()
    ? "Mollie läuft mit einem Testschlüssel und MOLLIE_ALLOW_TEST=1: Testzahlungen werden wie echte verbucht. Nach dem Testen bei Scalingo den Live-Schlüssel eintragen und MOLLIE_ALLOW_TEST entfernen."
    : "MOLLIE_API_KEY ist ein Testschlüssel (test_…). Der Bezahlknopf ist deshalb ausgeblendet, Testzahlungen werden nicht verbucht. Für echte Zahlungen bei Scalingo den Live-Schlüssel (live_…) eintragen.";
}

export function siteUrl(): string {
  return (process.env.SITE_URL ?? siteConfig.url).replace(/\/$/, "");
}

export function webhookUrl(): string {
  return `${siteUrl()}/api/mollie/webhook`;
}

/** 9000 → "90.00". Alle Beispiele der Mollie-Doku haben zwei Nachkommastellen. */
export function toValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function toCents(value: string): number {
  return Math.round(Number(value) * 100);
}

/** `status` ist der HTTP-Status von Mollie, damit Aufrufer 404 (unbekannte
 *  ID) von einem echten Fehler unterscheiden koennen. */
export class MollieError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
  }
}

export async function mollie<T = Record<string, unknown>>(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: unknown
): Promise<T> {
  const key = process.env.MOLLIE_API_KEY;
  if (!key) throw new MollieError("MOLLIE_API_KEY fehlt.");
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!res.ok) {
    const detail = typeof json.detail === "string" ? json.detail : res.statusText;
    throw new MollieError(`Mollie ${method} ${path}: ${res.status} ${detail}`, res.status);
  }
  return json as T;
}

export interface MolliePayment {
  id: string;
  status: string;
  /** "live" oder "test" — welcher Schluessel die Zahlung angelegt hat. */
  mode?: "live" | "test";
  sequenceType?: string;
  amount: { value: string; currency: string };
  customerId?: string;
  subscriptionId?: string;
  createdAt: string;
  paidAt?: string;
  metadata?: Record<string, unknown> | null;
  _links?: { checkout?: { href: string } };
}
