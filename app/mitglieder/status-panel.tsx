import type { ReactNode } from "react";
import { siteConfig } from "@/lib/config";
import { PLAN_INFO, euro, type Plan } from "@/lib/membership";
import type { PaymentStatus } from "@/lib/payments";
import { cancelFlexAction, startPaymentAction } from "./pay-actions";

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
/** "Wird abgebucht": weder offen noch erledigt. Bernstein statt Rot, weil
 *  nichts zu tun ist — Rot mit Bezahlknopf fuehrte hier zu doppelter Zahlung. */
const AMBER = "#b45309";

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
  /** Mollie eingerichtet (MOLLIE_API_KEY gesetzt) — sonst Bankdaten statt Knopf. */
  payEnabled: boolean;
  /** Laufendes SEPA-Abo bei Mollie: der Monat wird abgebucht, nicht bezahlt. */
  hasSubscription: boolean;
  /** Gerade vom Mollie-Checkout zurueck (?zahlung=1). */
  justReturned: boolean;
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

      {payment && status === "pending" ? (
        <p className="px-1 text-sm text-foreground-dim">
          Bezahlen kannst du, sobald der Vorstand dich aufgenommen hat.
        </p>
      ) : null}

      {payment && status === "active" ? (
        <PaymentBlock {...props} payment={payment} open={open} openCents={openCents} />
      ) : null}
    </div>
  );
}

function PaymentBlock({
  payment,
  open,
  openCents,
  payEnabled,
  hasSubscription,
  justReturned,
  plan,
  reducedRequested,
  reducedVerified,
  fullName,
}: StatusPanelProps & {
  payment: PaymentStatus;
  open: PaymentStatus["items"];
  openCents: number;
}): ReactNode {
  // Mit Abo ist der offene Monat kein Grund zum Handeln: er wird abgebucht.
  const payable = open.filter((i) => !(i.key === "month" && hasSubscription));
  const payableCents = payable.reduce((s, i) => s + i.cents, 0);

  if (payment.allPaid) {
    return (
      <section className="rounded-2xl p-6 text-white shadow-lg" style={{ background: GREEN }} aria-label="Zahlungsstatus">
        <p className="text-sm font-medium uppercase tracking-wider text-white/80">{payment.monthLabel}</p>
        <p className="mt-1 text-2xl font-semibold">✓ Alles bezahlt</p>
        {hasSubscription ? (
          <p className="mt-2 text-sm text-white/85">Der Beitrag wird monatlich automatisch per SEPA-Lastschrift abgebucht.</p>
        ) : null}
        {hasSubscription && plan === "flex" ? <CancelFlex /> : null}
      </section>
    );
  }

  if (payable.length === 0) {
    return (
      <section className="rounded-2xl p-6 text-white shadow-lg" style={{ background: AMBER }} aria-label="Zahlungsstatus">
        <p className="text-sm font-medium uppercase tracking-wider text-white/80">{payment.monthLabel}</p>
        <p className="mt-1 text-2xl font-semibold">Wird abgebucht: {euro(openCents)}</p>
        <p className="mt-2 text-sm text-white/85">
          Du musst nichts tun. Eine SEPA-Lastschrift braucht ein paar Tage, bis sie hier als bezahlt
          erscheint.
        </p>
        {plan === "flex" ? <CancelFlex /> : null}
      </section>
    );
  }

  const firstPayment = payEnabled && plan !== null && PLAN_INFO[plan].monthly && !hasSubscription;

  return (
    <section className="rounded-2xl p-6 text-white shadow-lg" style={{ background: RED }} aria-label="Zahlungsstatus">
      <p className="text-sm font-medium uppercase tracking-wider text-white/80">{payment.monthLabel}</p>
      <p className="mt-1 text-2xl font-semibold">Offen: {euro(payableCents)}</p>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {payable.map((i) => (
          <li key={i.key} className="flex justify-between gap-4">
            <span>{i.label}</span>
            <span className="tabular-nums">{euro(i.cents)}</span>
          </li>
        ))}
      </ul>
      {reducedRequested && !reducedVerified ? (
        <p className="mt-3 text-xs text-white/80">Regulärer Preis, bis der Ausweis gezeigt wurde.</p>
      ) : null}

      {justReturned ? (
        <p className="mt-4 rounded-lg bg-black/20 px-3 py-2 text-sm">
          Zahlung wird bestätigt &mdash; das dauert meist nur Sekunden. Seite neu laden.
        </p>
      ) : null}

      {payEnabled ? (
        <form action={startPaymentAction} className="mt-5">
          {/* "zahlungspflichtig" steht im Knopf, weil § 8 Abs. 2 FAGG das fuer
              Online-Bestellungen verlangt (Button-Loesung). */}
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-white text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ color: RED }}
          >
            Jetzt zahlungspflichtig bezahlen · {euro(payableCents)}
          </button>
          {firstPayment ? (
            <p className="mt-3 text-xs leading-relaxed text-white/85">
              Du bezahlst per EPS-Überweisung über Mollie. Dabei erteilst du ein
              SEPA-Lastschriftmandat: ab nächstem Monat wird der Beitrag automatisch von deinem Konto
              abgebucht{plan === "flex" ? ", bis du Flex hier beendest" : ", bis die Bindung endet"}.
            </p>
          ) : (
            <p className="mt-3 text-xs leading-relaxed text-white/85">Bezahlt wird über Mollie.</p>
          )}
        </form>
      ) : (
        <BankDetails purpose={`${fullName}, ${payment.monthLabel}`} />
      )}
    </section>
  );
}

function CancelFlex(): ReactNode {
  return (
    <form action={cancelFlexAction} className="mt-4">
      <button type="submit" className="text-sm text-white/85 underline underline-offset-2 hover:text-white">
        ALL IN Flex beenden (keine weiteren Abbuchungen)
      </button>
    </form>
  );
}
