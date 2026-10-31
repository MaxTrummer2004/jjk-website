import type { ReactNode } from "react";
import { siteConfig } from "@/lib/config";
import { PLAN_INFO, euro, type Plan } from "@/lib/membership";
import type { PayNotice, PaymentStatus } from "@/lib/payments";
import { cancelFlexAction, startPaymentAction } from "./pay-actions";
import { PayButton } from "./pay-button";

/**
 * Der Statusblock im Mitgliederbereich. Server-Komponente: sie bekommt
 * fertige Daten und rendert nur.
 *
 * Zwei Teile. Oben der Aufnahmestand, solange der Antrag offen ist — mit dem,
 * was konkret noch fehlt. Darunter der Zahlungsstand.
 *
 * Bis 31.10.2026 war der Zahlungsstand eine volle Flaeche in Rot (#dc2626),
 * Gruen (#16a34a) oder Bernstein (#b45309), mit Schatten — eine Vorgabe des
 * Vorstands, damit man den Stand auf einen Blick sieht. Der Auftraggeber hat
 * das mit dem Umbau des Bereichs ersetzt ("Layout irgendwie schlecht",
 * Entwurf freigegeben): drei Ampelfarben auf einer Seite, deren einzige Farbe
 * Zinnober ist, lasen sich als fremdes Bauteil. Der Blick-Effekt bleibt, nur
 * in der Sprache der Seite:
 *   offen         Platte mit Glutkante links (data-due), "Offen: 90 €" gross,
 *                 Betrag in Zinnober, Bezahlknopf als einzige rote Flaeche
 *   wird abgebucht  Platte ohne Kante, Etikett grau — nichts zu tun
 *   alles bezahlt   eine ruhige Zeile, keine Platte
 *   beitragsfrei    ein Satz
 * Rot heisst damit ueberall auf der Seite dasselbe: hier fehlt etwas von dir.
 *
 * Diesen Block sieht nur das Mitglied selbst. Die Liste aller Mitglieder mit
 * Zahlungsstand gibt es ausschliesslich unter /vorstand.
 */

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
  /** Hinweis nach dem Checkout bzw. einem Fehler beim Anlegen
   *  (lib/payments.ts, checkoutNotice); null, wenn es nichts zu sagen gibt. */
  payNotice: PayNotice | null;
  /** Trainer/Vorstand: kein Beitrag, kein Zahlungsblock. */
  feeExempt?: boolean;
}

function BankDetails({ purpose }: { purpose: string }): ReactNode {
  const { holder, iban, bic } = siteConfig.bank;
  if (!iban) {
    return (
      <p className="mt-3 text-sm text-foreground-dim">
        Die Bankverbindung bekommst du im Training. Bar oder per Überweisung, frag einfach
        den Vorstand.
      </p>
    );
  }
  // Etiketten in der Mono wie ueberall, die Werte gross genug zum Abtippen.
  // wrap-break-word, weil der Zweck den vollen Namen traegt und am Handy sonst
  // ueber den Rand laeuft.
  return (
    <dl className="mt-4 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 gap-y-2 text-sm text-foreground">
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">Empfänger</dt>
      <dd className="wrap-break-word">{holder}</dd>
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">IBAN</dt>
      <dd className="wrap-break-word font-mono">{iban}</dd>
      {bic ? (
        <>
          <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">BIC</dt>
          <dd className="wrap-break-word font-mono">{bic}</dd>
        </>
      ) : null}
      <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-muted-foreground">Zweck</dt>
      <dd className="wrap-break-word">{purpose}</dd>
    </dl>
  );
}

/** Hinweis nach dem Checkout: eine abgesetzte Zeile in der Platte, keine
 *  zweite Farbe. Vorher bg-black/20 mit runden Ecken auf dem roten Grund. */
const NOTICE = "mt-5 border border-border bg-background-deep/50 px-4 py-3 text-sm leading-relaxed text-foreground";

export function StatusPanel(props: StatusPanelProps): ReactNode {
  const { status, payment } = props;

  if (status === "rejected") {
    return (
      <section className="jjk-mb-plate p-6 text-sm leading-relaxed text-foreground-dim sm:p-8">
        Dein Antrag wurde vom Vorstand nicht angenommen. Bei Fragen erreichst du uns unter{" "}
        <a
          href={`mailto:${siteConfig.email}`}
          className="text-foreground underline decoration-accent underline-offset-4"
        >
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
        <section className="jjk-mb-plate p-6 sm:p-8" data-due="">
          <p className="jjk-mb-eyebrow">Antrag offen</p>
          <h2 className="mt-3 font-display text-2xl font-bold leading-snug text-foreground sm:text-[1.75rem]">
            Danke, {props.firstName}. Dein Antrag ist da.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-foreground-dim sm:text-base">
            Über die Aufnahme entscheidet der Vorstand, meistens beim nächsten Training. Danach
            siehst du hier alles: Anwesenheit, Rangliste und mehr.
          </p>
          {props.plan ? (
            <p className="mt-4 text-sm text-foreground">
              Gewählt: <strong>{PLAN_INFO[props.plan].label}</strong>
              {props.reducedRequested ? " (Schüler/Studenten)" : ""}
            </p>
          ) : null}
          {/* .jjk-benefits: der Zinnoberstrich vor jedem Punkt, wie in den
              Preisen. Vorher ein Kreis-Zeichen, das in keiner der vier
              Schriften steht und auf eine Systemschrift zurueckfiel. */}
          {missing.length > 0 ? (
            <ul className="jjk-benefits">
              {missing.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {/* Trainer/Vorstand: ein Satz. "Trainer & Vorstand" steht schon als
          Augenbraue ueber dem Namen, eine eigene Platte dafuer war ein Kasten
          ohne Inhalt. */}
      {props.feeExempt && status === "active" ? (
        <p className="text-sm text-foreground-dim">Beitragsfrei, hier ist nichts zu zahlen.</p>
      ) : null}

      {payment && status === "pending" ? (
        <p className="text-sm text-foreground-dim">
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
  payNotice,
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
      <section aria-label="Zahlungsstatus">
        <p className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-3">
          <span className="jjk-mb-eyebrow" data-quiet="">
            {payment.monthLabel}
          </span>
          <span className="text-sm text-foreground">Alles bezahlt</span>
        </p>
        {hasSubscription && plan === "flex" ? <CancelFlex /> : null}
      </section>
    );
  }

  if (payable.length === 0) {
    return (
      <section className="jjk-mb-plate p-5 sm:p-7" aria-label="Zahlungsstatus">
        <p className="jjk-mb-eyebrow" data-quiet="">
          {payment.monthLabel}
        </p>
        <p className="mt-3 font-display text-2xl font-bold text-foreground">
          Wird abgebucht: {euro(openCents)}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-foreground-dim">
          Du musst nichts tun. Eine SEPA-Lastschrift braucht ein paar Tage, bis sie hier als bezahlt
          erscheint.
        </p>
        {plan === "flex" ? <CancelFlex /> : null}
      </section>
    );
  }

  // Seit 15.10.2026 (Vorstand): Monatsbeitraege per Dauerauftrag aufs
  // Vereinskonto, online ueber Mollie nur noch Einmaliges (Einschreibgebuehr,
  // 10er-Block). Lastschriften kosten pro Buchung Gebuehren.
  const monthOpen = payable.find((i) => i.key === "month");
  const oneOff = payable.filter((i) => i.key !== "month");
  const oneOffCents = oneOff.reduce((s, i) => s + i.cents, 0);

  return (
    <section className="jjk-mb-plate p-5 sm:p-7" data-due="" aria-label="Zahlungsstatus">
      <p className="jjk-mb-eyebrow">{payment.monthLabel}</p>
      <p className="mt-3 font-display text-[1.75rem] font-bold leading-none text-foreground sm:text-[2rem]">
        Offen: <span className="text-accent-bright">{euro(payableCents)}</span>
      </p>
      <ul className="mt-5 border-t border-border text-sm text-foreground-dim">
        {payable.map((i) => (
          <li key={i.key} className="flex justify-between gap-4 border-b border-border/60 py-2.5">
            <span>{i.label}</span>
            <span className="tabular-nums text-foreground">{euro(i.cents)}</span>
          </li>
        ))}
      </ul>
      {reducedRequested && !reducedVerified ? (
        <p className="mt-3 text-xs text-muted-foreground">Regulärer Preis, bis der Ausweis gezeigt wurde.</p>
      ) : null}

      {payNotice === "confirming" ? (
        <p role="status" className={NOTICE}>
          Zahlung wird bestätigt, das dauert meist nur Sekunden. Seite neu laden.
        </p>
      ) : payNotice === "canceled" ? (
        <p role="status" className={NOTICE}>
          Zahlung abgebrochen – du kannst es nochmal versuchen.
        </p>
      ) : payNotice === "failed" && oneOff.length > 0 ? (
        // Bankdaten mit dem Zweck fuer die Einmalposten: der Monat hat unten
        // seinen eigenen Zweck ("Mitgliedsbeitrag").
        <div role="status" className={NOTICE}>
          <p>
            Die Zahlung konnte gerade nicht gestartet werden. Bitte versuch es gleich nochmal oder
            überweise den Betrag:
          </p>
          <BankDetails purpose={`${fullName}, ${oneOff.map((i) => i.label).join(" + ")}`} />
        </div>
      ) : null}

      {payEnabled && oneOff.length > 0 ? (
        <form action={startPaymentAction} className="mt-6">
          {/* "zahlungspflichtig" steht im Knopf, weil § 8 Abs. 2 FAGG das fuer
              Online-Bestellungen verlangt (Button-Loesung). */}
          <PayButton>
            {oneOff.map((i) => i.label).join(" + ")} jetzt zahlungspflichtig bezahlen{" "}
            {/* Am Handy brach der Knopf vor dem Eurozeichen um, "€" stand
                allein in der dritten Zeile (390 px, gemessen). */}
            <span className="whitespace-nowrap">· {euro(oneOffCents)}</span>
          </PayButton>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
            Einmalige Zahlung online über Mollie.
          </p>
        </form>
      ) : null}

      {monthOpen ? (
        <div className="mt-7 border-t border-border pt-6">
          <p className="text-sm font-semibold text-foreground">Monatsbeitrag per Dauerauftrag</p>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground-dim">
            Richte bei deiner Bank einmal einen Dauerauftrag über {euro(monthOpen.cents)} zum
            Monatsersten ein. Sobald der Beitrag da ist, hakt ihn der Vorstand ab.
          </p>
          <BankDetails purpose={`${fullName}, Mitgliedsbeitrag`} />
        </div>
      ) : !payEnabled ? (
        <BankDetails purpose={`${fullName}, ${payable.map((i) => i.label).join(" + ")}`} />
      ) : null}
    </section>
  );
}

function CancelFlex(): ReactNode {
  return (
    <form action={cancelFlexAction} className="mt-3">
      <button
        type="submit"
        className="text-sm text-foreground-dim underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-accent"
      >
        Flex beenden (keine weiteren Abbuchungen)
      </button>
    </form>
  );
}
