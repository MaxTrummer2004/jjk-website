/**
 * BEDINGUNGEN DER MITGLIEDSCHAFT
 *
 * Eine eigene Seite, weil Zahlungsdienstleister (Mollie) bei der Pruefung
 * sichtbare Vertragsbedingungen und Kuendigungs-/Ruecktrittsinformationen
 * auf der Website erwarten. Vorher standen die Bedingungen nur zugeklappt im
 * Formular auf /beitreten.
 *
 * Die Abschnitte "Art der Mitgliedschaft" bis "Datenschutz" kommen aus
 * app/beitreten/terms.tsx (TERMS_SECTIONS) — EINE Quelle fuer Formular und
 * Seite, damit beide nie auseinanderlaufen. Inhaltlich sind sie die
 * Beitrittserklaerung des Vereins (PDF, Oktober 2026).
 *
 * Neu hier und NICHT aus dem PDF: Vertragspartner, Vertragsschluss, Zahlung
 * online und das Ruecktrittsrecht. Letzteres folgt dem Muster nach Anhang I
 * Teil A und B FAGG. Ob der Verein als Unternehmer im Sinne des KSchG gilt
 * (dann ist die Belehrung Pflicht), ist nicht abschliessend geklaert; sie
 * steht trotzdem hier, weil eine Belehrung zu viel nichts kostet, eine
 * fehlende aber die Ruecktrittsfrist um zwoelf Monate verlaengert (§ 12 FAGG).
 * Vor dem Live-Schalten der Online-Zahlung juristisch pruefen lassen.
 *
 * Preise kommen aus lib/membership.ts — nicht hier abtippen.
 */

import { LegalPage } from "@/components/legal-page";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/config";
import { ENROLLMENT_FEE_CENTS, PLANS, PLAN_INFO, euro } from "@/lib/membership";
import { TERMS_SECTIONS } from "@/app/beitreten/terms";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Bedingungen der Mitgliedschaft",
  description:
    "Mitgliedschaften, Preise, Zahlung, Laufzeit, Rücktrittsrecht und Haftung bei der Jiu Jitsu Kaisen Akademie.",
  path: "/bedingungen",
});

const VEREIN = "Jiu Jitsu Kaisen Akademie";
const ANSCHRIFT = "Andelberggasse 11, 8160 Weiz, Österreich";

export default function BedingungenPage(): ReactNode {
  return (
    <LegalPage
      title="Bedingungen der Mitgliedschaft"
      eyebrow="Vertragsbedingungen"
      lead="Was eine Mitgliedschaft kostet, wie man bezahlt, wie sie endet und wie man zurücktritt."
    >
      <section>
        <h2>Vertragspartner</h2>
        <p>
          {VEREIN}, eingetragener Verein, ZVR-Zahl 1414986922, Sitz Graz.
          Zustellanschrift: {ANSCHRIFT}. E-Mail:{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>, Telefon:{" "}
          <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}>{siteConfig.phone}</a>.
          Trainingsstätte: {siteConfig.address.street}, {siteConfig.address.city}.
        </p>
      </section>

      <section>
        <h2>Mitgliedschaften und Preise</h2>
        <ul>
          {PLANS.map((plan) => {
            const info = PLAN_INFO[plan];
            const per = info.monthly ? " pro Monat" : " einmalig";
            return (
              <li key={plan}>
                <strong>{info.label}</strong>: {euro(info.regularCents)}
                {per}, Schüler und Studenten {euro(info.reducedCents)}
                {per}. {info.detail}.
              </li>
            );
          })}
          <li>
            <strong>Einschreibgebühr</strong>: {euro(ENROLLMENT_FEE_CENTS)} einmalig, bei der
            allerersten Anmeldung, für alle Angebote gleich.
          </li>
          <li>
            <strong>Probetraining</strong>: gratis.
          </li>
        </ul>
        <p>
          Der ermäßigte Preis gilt gegen Vorlage eines gültigen Schüler- oder Studentenausweises.
          Alle Preise sind Endpreise.
        </p>
      </section>

      <section>
        <h2>Vertragsschluss</h2>
        <p>
          Mit dem Absenden der Beitrittserklärung auf dieser Website stellen Sie einen Antrag auf
          Aufnahme als außerordentliches Mitglied. Über die Aufnahme entscheidet der Vorstand
          (§ 5 Abs. 2 der Statuten); mit der Aufnahme kommt die Mitgliedschaft zustande. Die
          Aufnahme Minderjähriger setzt die schriftliche Zustimmung eines Erziehungsberechtigten
          voraus (§ 5 Abs. 1 der Statuten).
        </p>
      </section>

      <section>
        <h2>Zahlung</h2>
        <p>
          Mitgliedsbeiträge sind monatlich im Voraus fällig, der 10er-Block und die
          Einschreibgebühr einmalig im Voraus. Online wird über den Zahlungsdienstleister Mollie
          B.V. (Amsterdam) bezahlt. Bei den Mitgliedschaften „Alle Kurse“ erteilen Sie mit der ersten
          Zahlung per EPS ein SEPA-Lastschriftmandat; die folgenden Monatsbeiträge werden damit
          jeweils zum Monatsersten abgebucht &mdash; bei Bindung bis zu deren Ende, bei Flex,
          bis Sie Flex im Mitgliederbereich beenden.
        </p>
      </section>

      {TERMS_SECTIONS.map((section) => (
        <section key={section.title}>
          <h2>{section.title}</h2>
          <ul>
            {section.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      ))}

      <section>
        <h2>Austritt aus dem Verein</h2>
        <p>
          Das Ende einer Mitgliedschaft nach diesen Bedingungen (Ablauf der Bindung, Beenden von
          Flex) beendet das Trainingsangebot. Der Austritt aus dem Verein selbst richtet sich nach
          § 6 der Statuten.
        </p>
      </section>

      <section>
        <h2>Rücktrittsrecht</h2>
        <p>
          Sie haben das Recht, binnen vierzehn Tagen ohne Angabe von Gründen von diesem Vertrag
          zurückzutreten. Die Rücktrittsfrist beträgt vierzehn Tage ab dem Tag des
          Vertragsabschlusses.
        </p>
        <p>
          Um Ihr Rücktrittsrecht auszuüben, müssen Sie uns ({VEREIN}, {ANSCHRIFT}, E-Mail:{" "}
          {siteConfig.email}) mittels einer eindeutigen Erklärung (z.&nbsp;B. ein mit der Post
          versandter Brief oder eine E-Mail) über Ihren Entschluss, von diesem Vertrag
          zurückzutreten, informieren. Sie können dafür das unten stehende Muster-Formular
          verwenden, das jedoch nicht vorgeschrieben ist. Zur Wahrung der Rücktrittsfrist reicht
          es aus, dass Sie die Mitteilung über die Ausübung des Rücktrittsrechts vor Ablauf der
          Rücktrittsfrist absenden.
        </p>
        <h3>Folgen des Rücktritts</h3>
        <p>
          Wenn Sie von diesem Vertrag zurücktreten, haben wir Ihnen alle Zahlungen, die wir von
          Ihnen erhalten haben, unverzüglich und spätestens binnen vierzehn Tagen ab dem Tag
          zurückzuzahlen, an dem die Mitteilung über Ihren Rücktritt von diesem Vertrag bei uns
          eingegangen ist. Für diese Rückzahlung verwenden wir dasselbe Zahlungsmittel, das Sie
          bei der ursprünglichen Transaktion eingesetzt haben, es sei denn, mit Ihnen wurde
          ausdrücklich etwas anderes vereinbart; in keinem Fall werden Ihnen wegen dieser
          Rückzahlung Entgelte berechnet.
        </p>
        <p>
          Haben Sie verlangt, dass die Dienstleistungen während der Rücktrittsfrist beginnen
          sollen, so haben Sie uns einen angemessenen Betrag zu zahlen, der dem Anteil der bis zu
          dem Zeitpunkt, zu dem Sie uns von der Ausübung des Rücktrittsrechts hinsichtlich dieses
          Vertrags unterrichten, bereits erbrachten Dienstleistungen im Vergleich zum
          Gesamtumfang der im Vertrag vorgesehenen Dienstleistungen entspricht.
        </p>
        <h3>Muster-Rücktrittsformular</h3>
        <p>
          (Wenn Sie von dem Vertrag zurücktreten wollen, füllen Sie bitte dieses Formular aus und
          senden Sie es zurück.)
        </p>
        <p>
          An {VEREIN}, {ANSCHRIFT}, {siteConfig.email}:
          <br />
          Hiermit trete(n) ich/wir (*) von dem von mir/uns (*) abgeschlossenen Vertrag über die
          Erbringung der folgenden Dienstleistung zurück: Mitgliedschaft (Art: ___)
          <br />
          Abgeschlossen am (*) ___
          <br />
          Name des/der Verbraucher(s): ___
          <br />
          Anschrift des/der Verbraucher(s): ___
          <br />
          Unterschrift des/der Verbraucher(s) (nur bei Mitteilung auf Papier): ___
          <br />
          Datum: ___
          <br />
          (*) Unzutreffendes streichen.
        </p>
      </section>

      <p className="jjk-legal-stand">Stand: 8. Oktober 2026</p>
    </LegalPage>
  );
}
