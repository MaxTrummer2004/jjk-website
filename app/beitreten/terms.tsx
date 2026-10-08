import type { ReactNode } from "react";

/**
 * "Bedingungen der Mitgliedschaft" — Seite 2 der Beitrittserklaerung des
 * Vereins (PDF, Oktober 2026), inhaltlich unveraendert uebernommen. Wer hier
 * etwas aendert, aendert die Vertragsbedingungen: nur zusammen mit dem PDF und
 * nach Vorstandsbeschluss.
 */

export const TERMS_SECTIONS: { title: string; items: ReactNode[] }[] = [
  {
    title: "Art der Mitgliedschaft",
    items: [
      <>
        <strong>Außerordentliche Mitgliedschaft:</strong> Jede Mitgliedschaft laut dieser
        Beitrittserklärung (ALL IN Jahresbindung, ALL IN 3-Monatsbindung, ALL IN Flex und
        10er-Block) ist ausschließlich eine außerordentliche Mitgliedschaft. Sie berechtigt zur
        Teilnahme am Trainingsangebot. Stimm- und Wahlrecht in der Generalversammlung haben nur
        ordentliche Mitglieder. Näheres regeln die Vereinsstatuten.
      </>,
    ],
  },
  {
    title: "Zahlung & Laufzeit",
    items: [
      <>
        Der Mitgliedsbeitrag ist monatlich im Voraus auf das Vereinskonto zu überweisen. Der
        10er-Block und die Einschreibgebühr sind einmalig im Voraus zu bezahlen.
      </>,
      <>
        <strong>Keine Kündigung notwendig:</strong> Mitgliedschaften mit Bindung (3 Monate bzw. 12
        Monate) enden automatisch mit Ablauf der Bindungsdauer. Wer weitertrainieren möchte, schließt
        einfach eine neue Mitgliedschaft ab.
      </>,
      <>
        <strong>ALL IN Flex:</strong> Du kannst trainieren, solange dein Beitrag bezahlt ist. Wird
        ein Monat nicht bezahlt, ruht in diesem Monat das Trainingsrecht &mdash; die
        Vereinsmitgliedschaft bleibt bestehen und du kannst jederzeit wieder einsteigen.
      </>,
      <>
        <strong>10er-Block:</strong> 10 Trainingseinheiten ohne Bindung und ohne Ablaufdatum.
      </>,
    ],
  },
  {
    title: "Pausieren bei Verletzung oder Krankheit",
    items: [
      <>
        Fällst du durch eine Verletzung oder Krankheit länger als 3 Wochen aus, kannst du deine
        Mitgliedschaft einmal pro Jahr pausieren. Dafür ist ein ärztliches Attest vorzulegen.
      </>,
      <>
        Während der Pause fallen keine Beiträge an; eine laufende Bindung verlängert sich um die
        Dauer der Pause.
      </>,
    ],
  },
  {
    title: "Haftungsausschluss & Gesundheit",
    items: [
      <>
        Brazilian Jiu-Jitsu, Ringen und Boxen sind Kontaktsportarten mit erhöhtem
        Verletzungsrisiko. Die Teilnahme an Training, Sparring, Open Mat und Veranstaltungen erfolgt
        auf eigene Gefahr und eigene Verantwortung.
      </>,
      <>
        Ich bestätige, dass mir keine gesundheitlichen Gründe bekannt sind, die gegen das Training
        sprechen. Verletzungen, Beschwerden oder Erkrankungen teile ich vor dem Training dem Trainer
        mit.
      </>,
      <>
        Ich befolge die Anweisungen der Trainer und die Regeln auf der Matte &mdash; insbesondere
        wird jedes Abklopfen (Tap) sofort respektiert.
      </>,
      <>
        Eine Haftung des Vereins, seiner Trainer und Funktionäre ist &mdash; soweit gesetzlich
        zulässig &mdash; ausgeschlossen. Dies gilt nicht für vorsätzlich oder grob fahrlässig
        verursachte Schäden sowie für Personenschäden.
      </>,
      <>
        Für mitgebrachte Kleidung, Wertsachen und Garderobe wird keine Haftung übernommen. Der
        Abschluss einer privaten Unfallversicherung wird empfohlen.
      </>,
    ],
  },
  {
    title: "Datenschutz (DSGVO)",
    items: [
      <>
        Die angegebenen Daten werden vom Verein ausschließlich für die Mitgliederverwaltung, die
        Beitragsabrechnung und die Meldung an den Dachverband elektronisch gespeichert und
        verarbeitet und nicht an Dritte zu Werbezwecken weitergegeben.
      </>,
      <>
        Du hast jederzeit das Recht auf Auskunft, Berichtigung und Löschung deiner Daten. Anfragen
        bitte an info@jjk.academy.
      </>,
    ],
  },
];

export function MembershipTerms(): ReactNode {
  return (
    <details className="group rounded-lg border border-border bg-card-plate">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 text-sm font-medium text-foreground">
        Bedingungen der Mitgliedschaft lesen
        <span aria-hidden="true" className="text-accent transition-transform group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="flex flex-col gap-6 border-t border-border px-4 py-5">
        {TERMS_SECTIONS.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-accent">{section.title}</h3>
            <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-sm leading-relaxed text-foreground-dim marker:text-accent">
              {section.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
