import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ensureSchema, sql } from "@/lib/db";
import { DismissTransition } from "@/components/dismiss-transition";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = {
  title: "Konto einrichten",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Passwort festlegen ueber einen Einrichtungslink.
 *
 * Fuer Konten, die der Vorstand per SQL anlegt (Trainer, Vorstand,
 * beitragsfrei): das Konto bekommt einen `setup_token`, der Link
 * /konto-einrichten?token=… wird weitergegeben, und die Person legt ihr
 * Passwort selbst fest. Danach ist der Token weg.
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
      ? await sql<{ first_name: string | null; name: string }>`
          select first_name, name from members where setup_token = ${token}
        `
      : [];
  const member = rows[0];

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
