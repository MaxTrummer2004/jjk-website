"use client";

import { useActionState, useState, type ReactNode } from "react";
import Link from "next/link";
import { joinAction, type JoinState } from "./actions";
import {
  ENROLLMENT_FEE_CENTS,
  PLANS,
  PLAN_INFO,
  euro,
  isAdult,
} from "@/lib/membership";
import { MembershipTerms } from "./terms";

const initial: JoinState = {};

const input =
  "w-full rounded-lg border-2 border-white/10 bg-background/60 px-4 py-3 text-foreground placeholder:text-foreground-dim/60 transition-colors focus:border-accent/60 focus:outline-none";

function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  defaultValue,
  onChange,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string | undefined;
  onChange?: ((value: string) => void) | undefined;
  hint?: string;
}): ReactNode {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-foreground">
        {label}
        {required ? null : <span className="font-normal text-foreground-dim"> (optional)</span>}
      </span>
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        className={input}
      />
      {hint ? <span className="text-xs text-foreground-dim">{hint}</span> : null}
    </label>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }): ReactNode {
  return (
    <fieldset className="flex flex-col gap-5 border-t border-border pt-8">
      <legend className="-mt-3 bg-background-deep pr-3">
        <span className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.24em] text-accent">
          {title}
        </span>
        {note ? <span className="ml-2 text-xs text-foreground-dim">{note}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

export function JoinForm(): ReactNode {
  const [state, action, pending] = useActionState(joinAction, initial);
  const v = state.values ?? {};
  const [birth, setBirth] = useState(v.birth_date ?? "");
  // Der Elternblock erscheint, sobald das Geburtsdatum auf unter 18 zeigt.
  // Der Server prueft dasselbe noch einmal — diese Anzeige ist Bequemlichkeit,
  // keine Kontrolle.
  const minor = /^\d{4}-\d{2}-\d{2}$/.test(birth) && !isAdult(birth);

  return (
    <form key={state.attempt ?? 0} action={action} className="mt-12 flex flex-col gap-12">
      <Section title="Daten des Mitglieds">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Vorname" name="first_name" autoComplete="given-name" defaultValue={v.first_name} />
          <Field label="Nachname" name="last_name" autoComplete="family-name" defaultValue={v.last_name} />
        </div>
        <Field label="Adresse" name="address" autoComplete="street-address" defaultValue={v.address} hint="Straße, Hausnummer, PLZ, Ort" />
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Geburtsdatum" name="birth_date" type="date" autoComplete="bday" defaultValue={v.birth_date} onChange={setBirth} />
          <Field label="Telefonnummer" name="phone" type="tel" autoComplete="tel" defaultValue={v.phone} />
        </div>
        <Field label="E-Mail-Adresse" name="email" type="email" autoComplete="email" defaultValue={v.email} hint="Damit loggst du dich später im Mitgliederbereich ein." />
      </Section>

      {minor ? (
        <Section title="Erziehungsberechtigte" note="weil du unter 18 bist">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Vorname" name="guardian_first_name" defaultValue={v.guardian_first_name} />
            <Field label="Nachname" name="guardian_last_name" defaultValue={v.guardian_last_name} />
            <Field label="Telefonnummer" name="guardian_phone" type="tel" defaultValue={v.guardian_phone} />
            <Field label="E-Mail-Adresse" name="guardian_email" type="email" required={false} defaultValue={v.guardian_email} />
          </div>
          <p className="rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm leading-relaxed text-foreground">
            Laut unseren Statuten braucht die Aufnahme Minderjähriger die{" "}
            <strong>schriftliche</strong> Zustimmung eines Erziehungsberechtigten. Den Antrag kannst
            du jetzt stellen &mdash; unterschrieben wird beim ersten Training vor Ort.
          </p>
        </Section>
      ) : null}

      <Section title="Mitgliedschaft">
        <p className="text-sm leading-relaxed text-foreground-dim">
          Mit jeder Mitgliedschaft „Alle Kurse“ kannst du alle Kurse im Stundenplan so oft besuchen, wie du
          willst.
        </p>
        <div className="flex flex-col gap-3" role="radiogroup">
          {PLANS.map((plan) => {
            const info = PLAN_INFO[plan];
            const per = info.monthly ? " / Monat" : " einmalig";
            // Die guenstigste Monatsvariante hervorheben (Vorstand, 10.10.2026).
            const cheapest = plan === "year";
            return (
              <label
                key={plan}
                className="flex cursor-pointer items-start gap-4 rounded-xl border-2 border-white/10 bg-background/40 p-4 transition-colors hover:border-white/25 has-[:checked]:border-accent has-[:checked]:bg-accent/10"
              >
                <input
                  type="radio"
                  name="plan"
                  value={plan}
                  required
                  defaultChecked={v.plan === plan}
                  className="mt-1 size-4 accent-[var(--accent)]"
                />
                <span className="flex flex-1 flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <span>
                    {cheapest ? (
                      <span className="mb-0.5 block font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-accent">
                        Günstigste Variante
                      </span>
                    ) : null}
                    <span className="block font-medium text-foreground">{info.label}</span>
                    <span className="block text-sm text-foreground-dim">{info.detail}</span>
                  </span>
                  <span className="shrink-0 text-sm sm:text-right">
                    <span className={`block font-semibold ${cheapest ? "text-base font-bold text-accent-bright" : "text-foreground"}`}>
                      {euro(info.regularCents)}
                      {per}
                    </span>
                    <span className="block text-foreground-dim">
                      Schüler/Studenten {euro(info.reducedCents)}
                    </span>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input type="checkbox" name="reduced" defaultChecked={v.reduced === "on"} className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span>
            Ich bin Schüler/in oder Student/in.{" "}
            <span className="text-foreground-dim">
              Der ermäßigte Preis gilt, sobald du einen gültigen Ausweis im Training gezeigt hast.
            </span>
          </span>
        </label>
        <p className="border-l-2 border-accent pl-4 text-sm leading-relaxed text-foreground-dim">
          <strong className="text-foreground">Einmalige Einschreibgebühr: {euro(ENROLLMENT_FEE_CENTS)}.</strong>{" "}
          Fällt nur bei der allerersten Anmeldung an &mdash; für alle Angebote und alle Mitglieder
          gleich. Sie wiederholt sich nicht jährlich.
        </p>
      </Section>

      <Section title="Zugang zum Mitgliederbereich">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Passwort" name="password" type="password" autoComplete="new-password" hint="Mindestens 8 Zeichen." />
          <Field label="Passwort wiederholen" name="password2" type="password" autoComplete="new-password" />
        </div>
      </Section>

      <Section title="Bedingungen & Datenschutz">
        <MembershipTerms />
        <p className="text-sm text-foreground-dim">Freiwillig &mdash; jederzeit schriftlich widerrufbar:</p>
        <label className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
          <input type="checkbox" name="consent_photos" defaultChecked={v.consent_photos === "on"} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
          <span>
            <strong>Fotos &amp; Videos:</strong> Ich bin einverstanden, dass im Training, bei Turnieren
            und Veranstaltungen Fotos und Videos von mir gemacht und für Dokumentations- und
            Werbezwecke des Vereins verwendet werden dürfen (Homepage, Instagram und andere Social
            Media, Presse).
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm leading-relaxed text-foreground">
          <input type="checkbox" name="consent_whatsapp" defaultChecked={v.consent_whatsapp === "on"} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
          <span>
            <strong>WhatsApp:</strong> Ich bin einverstanden, über vereinsinterne WhatsApp-Gruppen
            Informationen der JJKA zu erhalten (z.&nbsp;B. Trainingszeiten, Einladungen,
            Neuigkeiten). Es wird keine Werbung verschickt.
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-border bg-card-plate p-4 text-sm leading-relaxed text-foreground">
          <input type="checkbox" name="accept_terms" required defaultChecked={v.accept_terms === "on"} className="mt-1 size-4 shrink-0 accent-[var(--accent)]" />
          <span>
            Ich beantrage den Beitritt zur Jiu Jitsu Kaisen Academy als außerordentliches Mitglied und
            bestätige, dass ich die{" "}
            <Link href="/bedingungen" className="underline underline-offset-2 hover:text-accent">
              Bedingungen der Mitgliedschaft
            </Link>
            , den Haftungsausschluss und die{" "}
            <Link href="/datenschutz" className="underline underline-offset-2 hover:text-accent">
              Datenschutzerklärung
            </Link>{" "}
            gelesen habe und damit einverstanden bin.
          </span>
        </label>
      </Section>

      {state.error ? (
        <p role="alert" className="rounded-lg border border-accent/50 bg-accent/10 px-4 py-3 text-sm text-foreground">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <button type="submit" disabled={pending} className="jjk-btn jjk-btn-loud disabled:opacity-50">
          {pending ? "Wird gesendet…" : "Beitritt beantragen"}
        </button>
        <p className="text-sm text-foreground-dim">
          Schon Mitglied?{" "}
          <Link href="/mitglieder" className="font-medium text-foreground hover:text-accent">
            Einloggen
          </Link>
        </p>
      </div>
    </form>
  );
}
