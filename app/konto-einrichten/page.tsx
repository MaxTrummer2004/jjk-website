import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ensureSchema, sql } from "@/lib/db";
import { createMetadata } from "@/lib/metadata";
import { hashSetupToken } from "@/lib/setup-token";
import { DismissTransition } from "@/components/dismiss-transition";
import { SetupForm } from "./setup-form";

// 30.10.2026: ueber createMetadata, damit canonical/og:url nicht mehr von der
// Wurzel geerbt auf die Startseite zeigen (noindex plus canonical auf eine
// andere URL sind fuer Google widerspruechliche Signale).
export const metadata: Metadata = createMetadata({
  title: "Konto einrichten",
  path: "/konto-einrichten",
  noIndex: true,
});

export const dynamic = "force-dynamic";

/**
 * Passwort festlegen ueber einen Einrichtungslink.
 *
 * Fuer Konten, die der Vorstand unter /vorstand anlegt (Trainer, Vorstand,
 * beitragsfrei) oder fuer die er einen neuen Link erzeugt: der Link
 * /konto-einrichten?token=… wird weitergegeben, und die Person legt ihr
 * Passwort selbst fest. Danach ist der Token weg.
 *
 * Seit 31.10.2026 wird nach dem SHA-256 des Tokens gesucht (nur der steht in
 * der Datenbank, lib/setup-token.ts), und ein Link ueber 72 Stunden sagt
 * "abgelaufen" statt "ungueltig" — damit die Person weiss, dass sie nichts
 * falsch kopiert hat, sondern einen neuen braucht.
 */
export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}): Promise<ReactNode> {
  const { token = "" } = await searchParams;
  await ensureSchema();
  const rows =
    token.length >= 16
      ? await sql<{ first_name: string | null; name: string; expired: boolean }>`
          select first_name, name,
            (setup_token_expires_at is null or setup_token_expires_at <= now()) as expired
          from members where setup_token_hash = ${hashSetupToken(token)}
        `
      : [];
  const found = rows[0];
  const member = found && !found.expired ? found : undefined;

  return (
    <main id="main-content" className="flex min-h-screen items-center justify-center bg-background-deep px-5 py-16">
      <DismissTransition />
      <div className="w-full max-w-md rounded-2xl p-6 shadow-2xl sm:p-8" style={{ background: "var(--card)" }}>
        {member ? (
          <>
            <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">Konto einrichten</h1>
            <p className="mb-6 text-sm text-foreground-dim">
              Hallo {member.first_name ?? member.name}, leg hier dein Passwort fest. Danach bist du
              eingeloggt.
            </p>
            <SetupForm token={token} />
          </>
        ) : found ? (
          <>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Link abgelaufen</h1>
            <p className="text-sm text-foreground-dim">
              Dieser Link galt 72 Stunden und ist abgelaufen. Bitte beim Vorstand einen neuen
              anfordern.
            </p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold text-foreground">Link ungültig</h1>
            <p className="text-sm text-foreground-dim">
              Dieser Link ist ungültig oder wurde schon benutzt. Wenn dein Passwort schon gesetzt
              ist, logg dich unter{" "}
              <a href="/mitglieder" className="text-foreground underline">
                jjk.academy/mitglieder
              </a>{" "}
              ein.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
