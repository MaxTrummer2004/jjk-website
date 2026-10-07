import type { ReactNode } from "react";
import { siteConfig } from "@/lib/config";
import { PLAN_INFO, euro, type Plan } from "@/lib/membership";
import type { PaymentStatus } from "@/lib/payments";

/**
 * Der Statusblock oben im Mitgliederbereich. Server-Komponente: sie bekommt
 * fertige Daten und rendert nur.
 *
 * Zwei Teile. Oben der Aufnahmestand, solange der Antrag offen ist — mit dem,
 * was konkret noch fehlt. Darunter der Zahlungsstand: ROT, solange etwas
 * offen ist, GRUEN, wenn fuer diesen Monat alles passt. Die Farben sind hier
 * wortwoertlich gemeint (Vorgabe des Vorstands) und deshalb keine
 * Theme-Tokens: das Akzentrot der Seite ist Zinnober und waere neben einem
 * Warnrot nicht zu unterscheiden.
 *
 * Diesen Block sieht nur das Mitglied selbst. Die Liste aller Mitglieder mit
 * Zahlungsstand gibt es ausschliesslich unter /vorstand.
 */

const RED = "#dc2626";
const GREEN = "#16a34a";

export interface StatusPanelProps {
  status: "pending" | "active" | "rejected";
  plan: Plan | null;
  reducedRequested: boolean;
  reducedVerified: boolean;
  isMinor: boolean;
  guardianConsentReceived: boolean;
  payment: PaymentStatus | null;
  firstName: string;
  /** Fuer den Verwendungszweck: "Vor- und Nachname + Monat" laut Formular. */
  fullName: string;
}

function BankDetails({ purpose }: { purpose: string }): ReactNode {
  const { holder, iban, bic } = siteConfig.bank;
  if (!iban) {
    return (
      <p className="mt-3 text-sm text-white/85">
        Die Bankverbindung bekommst du im Training. Bar oder per Überweisung &mdash; frag einfach
        den Vorstand.
      </p>
    );
  }
  return (
    <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm text-white/90">
      <dt className="text-white/70">Empfänger</dt>
      <dd>{holder}</dd>
      <dt className="text-white/70">IBAN</dt>
      <dd className="font-mono">{iban}</dd>
      {bic ? (
        <>
          <dt className="text-white/70">BIC</dt>
          <dd className="font-mono">{bic}</dd>
        </>
      ) : null}
      <dt className="text-white/70">Zweck</dt>
      <dd>{purpose}</dd>
    </dl>
  );
}

export function StatusPanel(props: StatusPanelProps): ReactNode {
  const { status, payment } = props;

  if (status === "rejected") {
    return (
      <section className="rounded-2xl border border-border bg-card-plate p-6 text-sm leading-relaxed text-foreground-dim">
        Dein Antrag wurde vom Vorstand nicht angenommen. Bei Fragen erreichst du uns unter{" "}
        <a href={`mailto:${siteConfig.email}`} className="text-foreground underline">
          {siteConfig.email}
        </a>
        .
      </section>
    );
  }

  const missing: string[] = [];
  if (status === "pending") {
    if (props.isMinor && !props.guardianConsentReceived) {
      missing.push("Unterschrift eines Erziehungsberechtigten (beim Training)");
    }
    if (props.reducedRequested && !props.reducedVerified) {
      missing.push("Schüler- oder Studentenausweis zeigen (beim Training)");
    }
  }

  const open = payment ? payment.items.filter((i) => !i.paid) : [];
  const openCents = open.reduce((sum, i) => sum + i.cents, 0);

  return (
    <div className="flex flex-col gap-4">
      {status === "pending" ? (
        <section className="rounded-2xl border border-border bg-card-plate p-6">
          <p className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.24em] text-accent">
            Antrag offen
          </p>
          <h2 className="mt-2 text-xl font-medium text-foreground">
            Danke, {props.firstName}. Dein Antrag ist da.
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground-dim">
            Über die Aufnahme entscheidet der Vorstand, meistens beim nächsten Training. Danach
            siehst du hier alles &mdash; Anwesenheit, Rangliste und mehr.
          </p>
          {props.plan ? (
            <p className="mt-3 text-sm text-foreground">
              Gewählt: <strong>{PLAN_INFO[props.plan].label}</strong>
              {props.reducedRequested ? " (Schüler/Studenten)" : ""}
            </p>
          ) : null}
          {missing.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-1.5 text-sm text-foreground">
              {missing.map((m) => (
                <li key={m} className="flex gap-2">
                  <span aria-hidden="true" className="text-accent">
                    ○
                  </span>
                  {m}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {payment ? (
        payment.allPaid ? (
          <section
            className="rounded-2xl p-6 text-white shadow-lg"
            style={{ background: GREEN }}
            aria-label="Zahlungsstatus"
          >
            <p className="text-sm font-medium uppercase tracking-wider text-white/80">
              {payment.monthLabel}
            </p>
            <p className="mt-1 text-2xl font-semibold">✓ Alles bezahlt</p>
          </section>
        ) : (
          <section
            className="rounded-2xl p-6 text-white shadow-lg"
            style={{ background: RED }}
            aria-label="Zahlungsstatus"
          >
            <p className="text-sm font-medium uppercase tracking-wider text-white/80">
              {payment.monthLabel}
            </p>
            <p className="mt-1 text-2xl font-semibold">Offen: {euro(openCents)}</p>
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {open.map((i) => (
                <li key={i.key} className="flex justify-between gap-4">
                  <span>{i.label}</span>
                  <span className="tabular-nums">{euro(i.cents)}</span>
                </li>
              ))}
            </ul>
            {props.reducedRequested && !props.reducedVerified ? (
              <p className="mt-3 text-xs text-white/80">
                Regulärer Preis, bis der Ausweis gezeigt wurde.
              </p>
            ) : null}
            <BankDetails purpose={`${props.fullName}, ${payment.monthLabel}`} />
          </section>
        )
      ) : null}
    </div>
  );
}
