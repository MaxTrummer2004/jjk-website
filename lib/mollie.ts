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

export function isMollieConfigured(): boolean {
  return Boolean(process.env.MOLLIE_API_KEY);
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

export class MollieError extends Error {}

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
    throw new MollieError(`Mollie ${method} ${path}: ${res.status} ${detail}`);
  }
  return json as T;
}

export interface MolliePayment {
  id: string;
  status: string;
  sequenceType?: string;
  amount: { value: string; currency: string };
  customerId?: string;
  subscriptionId?: string;
  createdAt: string;
  paidAt?: string;
  metadata?: Record<string, unknown> | null;
  _links?: { checkout?: { href: string } };
}
