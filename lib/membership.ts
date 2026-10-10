/**
 * Die Mitgliedschaften als Daten — fuer die Beitrittserklaerung, den
 * Statusblock im Mitgliederbereich und die Beitragsliste des Vorstands.
 *
 * Diese Datei importiert nichts vom Server und darf deshalb von Client-
 * Komponenten geladen werden (siehe lib/session-cookies.ts, warum das zaehlt).
 *
 * Die Betraege stehen hier in Cent und ein zweites Mal als Anzeigetext in
 * lib/config.ts (`pricing`). Das ist Absicht und ein bekannter Preis: die
 * Preissektion der Startseite formuliert frei ("240 € weniger als Flex"), hier
 * wird gerechnet. Wer einen Preis aendert, aendert ihn an BEIDEN Stellen. Quelle
 * ist die Beitrittserklaerung des Vereins, Stand 6. Oktober 2026.
 */

export const PLANS = ["year", "quarter", "flex", "block"] as const;
export type Plan = (typeof PLANS)[number];

export interface PlanInfo {
  label: string;
  detail: string;
  /** Regulaer, in Cent. Bei den Varianten "Alle Kurse" pro Monat, beim Block einmalig. */
  regularCents: number;
  /** Schueler/Studenten, in Cent. */
  reducedCents: number;
  /** true: monatlich im Voraus faellig. false: einmalig (10er-Block). */
  monthly: boolean;
}

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  year: {
    label: "Alle Kurse – Jahresbindung",
    detail: "Unbegrenzt trainieren · 12 Monate Laufzeit",
    regularCents: 7000,
    reducedCents: 5500,
    monthly: true,
  },
  quarter: {
    label: "Alle Kurse – 3-Monatsbindung",
    detail: "Unbegrenzt trainieren · 3 Monate Laufzeit",
    regularCents: 8000,
    reducedCents: 6500,
    monthly: true,
  },
  flex: {
    label: "Alle Kurse – Flex",
    detail: "Unbegrenzt trainieren · ohne Bindung · monatlich im Voraus",
    regularCents: 9000,
    reducedCents: 7500,
    monthly: true,
  },
  block: {
    label: "10er-Block",
    detail: "10 Trainingseinheiten · ohne Bindung · kein Ablaufdatum",
    regularCents: 14000,
    reducedCents: 12500,
    monthly: false,
  },
};

/** Einmalig bei der allerersten Anmeldung, fuer alle Angebote gleich. */
export const ENROLLMENT_FEE_CENTS = 2000;

export function isPlan(value: unknown): value is Plan {
  return typeof value === "string" && (PLANS as readonly string[]).includes(value);
}

export function euro(cents: number): string {
  const whole = cents % 100 === 0;
  return `${(cents / 100).toLocaleString("de-AT", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  })} €`;
}

/**
 * Der Preis, der fuer dieses Mitglied gilt. Ermaessigt erst, wenn der Vorstand
 * den Ausweis gesehen hat — vorher regulaer. So steht nie ein Betrag im
 * Statusblock, den der Kassier spaeter nachfordern muss.
 */
export function dueCents(plan: Plan, reducedVerified: boolean): number {
  const info = PLAN_INFO[plan];
  return reducedVerified ? info.reducedCents : info.regularCents;
}

/**
 * Erster Tag des Monats als YYYY-MM-DD — der Schluessel einer Monatszahlung.
 *
 * In Wiener Zeit, nicht in der des Servers: Scalingo laeuft auf UTC, und in
 * der ersten Stunde eines Monats waere dort noch der alte. Wer am 1. um 0:30
 * nachsieht, soll den neuen Monat sehen.
 */
export function monthKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  return `${y}-${m}-01`;
}

const MONTHS = [
  "Jänner", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

/** "2026-10-01" → "Oktober 2026". */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`;
}

/** Volljaehrig am Stichtag? Geburtsdatum als YYYY-MM-DD. */
export function isAdult(birthDate: string, today: Date = new Date()): boolean {
  const [y, m, d] = birthDate.split("-").map(Number);
  if (!y || !m || !d) return false;
  const eighteenth = new Date(y + 18, m - 1, d);
  return eighteenth <= today;
}

export type MemberStatus = "pending" | "active" | "rejected";
