/**
 * IMPRESSUM
 *
 * Pflichtangaben nach § 5 ECG (E-Commerce-Gesetz) und §§ 24, 25
 * Mediengesetz. Fuer einen eingetragenen Verein mit Website gilt beides:
 * § 5 ECG, weil die Seite ein Dienst der Informationsgesellschaft ist, und
 * § 25 MedienG, weil sie eine "wiederkehrende elektronische Publikation"
 * ist (Offenlegung: Medieninhaber, Sitz, Vereinsorgane, Blattlinie).
 *
 * HIER IST NICHTS ERFUNDEN, UND ES IST NICHTS MEHR OFFEN. Diese Seite hatte
 * rote <Todo>-Platzhalter an jeder Stelle, die nur der Verein kennt; alle sind
 * jetzt durch Angaben aus dem Vereinsregisterauszug und den Statuten ersetzt.
 * Wer hier etwas aendert, ersetzt es durch eine belegte Angabe oder setzt den
 * Platzhalter wieder ein — eine halb ausgefuellte Offenlegung ist schlechter
 * als eine sichtbar unfertige.
 *
 * HERKUNFT DER ANGABEN: Name, Sitz, Zustellanschrift, ZVR-Zahl, Behoerde und
 * die Namen der Organe stammen aus dem Vereinsregisterauszug zum Stichtag
 * 25.09.2026; der Vereinszweck aus § 2 der Statuten. Nichts davon ist
 * geschaetzt oder weitergedacht.
 *
 * WAS SICH AENDERN KANN: Die Funktionsperioden laufen "unbestimmt", aber ein
 * Wechsel im Vorstand macht diese Seite falsch — und zwar still, ohne dass
 * irgendetwas kaputtgeht. Nach jeder Generalversammlung, die Funktionen neu
 * besetzt, gehoert dieser Abschnitt gegen den dann aktuellen Auszug
 * geprueft.
 *
 * BEWUSST NICHT ENTHALTEN: ein Link auf die EU-Plattform zur
 * Online-Streitbeilegung (ec.europa.eu/odr). Die Plattform hat den Betrieb
 * am 20. Juli 2025 eingestellt; ein Link darauf waere heute ein toter Link
 * und keine Pflichtangabe mehr. Die Hinweispflicht nach Art. 14 ODR-VO ist
 * mit der Verordnung (EU) 2024/3228 entfallen.
 */

import { LegalPage } from "@/components/legal-page";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/config";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Impressum",
  description:
    "Offenlegung nach § 5 E-Commerce-Gesetz und §§ 24, 25 Mediengesetz für die Website der Jiu-Jitsu Kaisen Academy.",
  path: "/impressum",
});

export default function ImpressumPage(): ReactNode {
  return (
    <LegalPage
      title="Impressum"
      eyebrow="Offenlegung nach § 5 ECG und §§ 24, 25 MedienG"
      lead="Wer diese Website betreibt, wer den Verein vertritt und wo er eingetragen ist."
    >

      {/* ------------------------------------------------------------------
          MEDIENINHABER
          Hier gehoert der Vereinsname exakt so hin, wie er im Vereinsregister
          steht (ZVR-Auszug), samt Rechtsform. "Jiu-Jitsu Kaisen Academy" ist
          der Auftritt nach aussen — der eingetragene Name kann davon
          abweichen, z. B. "Jiu-Jitsu Kaisen Academy - Verein zur Foerderung
          des Brazilian Jiu-Jitsu". Die ZVR-Zahl ist die zehnstellige Zahl aus
          dem Vereinsregisterauszug.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Medieninhaber und Herausgeber</h2>
        <dl>
          <dt>Verein</dt>
          <dd>
            Jiu Jitsu Kaisen Akademie
            {/* Schreibweise exakt aus § 1 Abs. 1 der Statuten: ohne
                Bindestrich, und "Akademie" deutsch. Der Auftritt auf der
                uebrigen Website heisst "Jiu-Jitsu Kaisen Academy" — das darf
                abweichen, das Impressum muss aber den eingetragenen Namen
                tragen. */}
          </dd>

          <dt>Rechtsform</dt>
          <dd>
            Verein nach dem Vereinsgesetz 2002 (VerG)
          </dd>

          <dt>ZVR-Zahl</dt>
          <dd>1414986922</dd>

          <dt>Vereinssitz</dt>
          <dd>Graz (§ 1 Abs. 2 der Statuten)</dd>

          <dt>Zustellanschrift</dt>
          {/* Die Zustellanschrift laut Register ist NICHT die Trainingsstaette.
              Beide stehen hier, getrennt benannt: die eine, weil die Behoerde
              sie fuehrt und ein Impressum nicht von ihr abweichen sollte, die
              andere, weil jeder Besucher sie sucht. Wird die Zustellanschrift
              bei der LPD spaeter auf die Triester Strasse geaendert, faellt
              die erste Zeile weg. */}
          <dd>
            8160 Weiz, Andelberggasse 11
            <br />
            <span className="text-muted-foreground">
              Anschrift laut Vereinsregister
            </span>
          </dd>

          <dt>Trainingsstätte</dt>
          <dd>
            {siteConfig.address.street}, {siteConfig.address.city}
          </dd>

          <dt>Entstehungsdatum</dt>
          <dd>24. September 2026</dd>
        </dl>
      </section>

      {/* ------------------------------------------------------------------
          VERTRETUNGSBEFUGTE
          Nach § 25 Abs. 2 MedienG muessen die Vereinsorgane genannt werden,
          die den Verein nach aussen vertreten — in der Regel Obmann/Obfrau
          und Stellvertretung, so wie im Vereinsregister eingetragen. Nur die
          Namen, keine Privatadressen.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Vertretungsberechtigte Organe</h2>
        <dl>
          <dt>Obmann</dt>
          <dd>Wolfgang Kern</dd>

          <dt>Obmann-Stellvertreter</dt>
          <dd>DI Matthias Ambrosig</dd>

          <dt>Kassier</dt>
          <dd>Liridon Kryeziu</dd>

          <dt>Kassier-Stellvertreter</dt>
          <dd>Walter Kern</dd>

          <dt>Schriftführer</dt>
          <dd>Max Trummer</dd>

          <dt>Schriftführer-Stellvertreter</dt>
          <dd>Ervin Latic</dd>

          <dt>Vertretungsregelung</dt>
          <dd className="text-muted-foreground">
            Der Obmann vertritt den Verein nach außen. Schriftliche
            Ausfertigungen bedürfen zu ihrer Gültigkeit der Unterschriften des
            Obmanns und des Schriftführers, in Geldangelegenheiten der
            Unterschriften des Obmanns und des Kassiers. Im Fall der
            Verhinderung treten die jeweiligen Stellvertreter an ihre Stelle.
          </dd>
        </dl>
      </section>

      <section>
        <h2>Kontakt</h2>
        <dl>
          <dt>E-Mail</dt>
          <dd>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          </dd>

          <dt>Telefon</dt>
          <dd>
            <a href={`tel:${siteConfig.phone.replace(/\s+/g, "")}`}>
              {siteConfig.phone}
            </a>
          </dd>

          <dt>Website</dt>
          <dd>
            <a href={siteConfig.url}>{siteConfig.url.replace(/^https?:\/\//, "")}</a>
          </dd>
        </dl>
      </section>

      {/* ------------------------------------------------------------------
          VEREINSZWECK UND BLATTLINIE
          § 25 Abs. 4 MedienG verlangt die "grundlegende Richtung" (Blattlinie).
          Fuer einen Sportverein genuegt ein kurzer, ehrlicher Satz. Der
          Vereinszweck sollte sinngemaess dem entsprechen, was in den Statuten
          unter "Zweck" steht — bitte dort nachsehen und uebernehmen, nicht neu
          formulieren.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Vereinszweck und grundlegende Richtung</h2>
        <h3>Vereinszweck</h3>
        <p>
          Der Verein ist nicht auf Gewinn gerichtet und verfolgt ausschließlich
          und unmittelbar gemeinnützige Zwecke im Sinne der §§ 34 ff der
          Bundesabgabenordnung. Er bezweckt die Förderung und Ausübung des
          Körpersports, insbesondere des Brazilian Jiu-Jitsu sowie verwandter
          Grappling- und Selbstverteidigungssportarten: deren Vermittlung und
          Pflege, die körperliche Ertüchtigung und persönliche Entwicklung der
          Mitglieder, die Förderung des sportlichen Nachwuchses und der
          Jugendarbeit, die Vorbereitung auf und Teilnahme an Wettkämpfen und
          Lehrgängen sowie die Pflege der Gemeinschaft im Vereinsleben.
          (§ 2 der Statuten)
        </p>
        <h3>Grundlegende Richtung dieser Website (Blattlinie)</h3>
        <p>
          Information über das Trainingsangebot, die Trainingszeiten, die
          Trainerinnen und Trainer sowie die Mitgliedschaft des Vereins. Die
          Website dient der Darstellung des Vereins und seiner sportlichen
          Tätigkeit und verfolgt keine darüber hinausgehenden Zwecke.
        </p>
      </section>

      {/* ------------------------------------------------------------------
          VEREINSBEHOERDE
          Zustaendig ist die Vereinsbehoerde am Vereinssitz. Fuer Vereine mit
          Sitz in Graz ist das in der Regel die Landespolizeidirektion
          Steiermark. Bitte gegen den eigenen Vereinsregisterauszug pruefen —
          dort steht die Behoerde, bei der der Verein tatsaechlich gefuehrt
          wird — und dann den Platzhalter durch die dort genannte Behoerde
          ersetzen.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Zuständige Vereinsbehörde</h2>
        <dl>
          <dt>Behörde</dt>
          <dd>
            Landespolizeidirektion Steiermark, SVA 3
          </dd>

          <dt>Rechtsgrundlage</dt>
          <dd>Vereinsgesetz 2002 (VerG), BGBl. I Nr. 66/2002 idgF</dd>
        </dl>
      </section>

      <section>
        <h2>Haftung für Inhalte und Links</h2>
        <p>
          Die Inhalte dieser Website werden mit Sorgfalt erstellt. Für die
          Richtigkeit, Vollständigkeit und Aktualität der Inhalte kann keine
          Gewähr übernommen werden. Trainingszeiten und Preise können sich
          ändern; verbindlich ist immer die Auskunft im Training.
        </p>
        <p>
          Diese Website verlinkt auf Websites Dritter (unter anderem auf
          Social-Media-Profile des Vereins). Auf deren Inhalte hat der Verein
          keinen Einfluss und übernimmt dafür keine Verantwortung. Für die
          Inhalte verlinkter Seiten ist immer deren jeweiliger Anbieter
          verantwortlich.
        </p>
      </section>

      {/* ------------------------------------------------------------------
          BILDNACHWEIS
          Das hier ist KEIN Platzhalter, sondern eine echte Pflicht, die aus
          dem Projekt selbst folgt: der Hintergrund im Hero wird aus
          OpenStreetMap-Daten gerechnet (scripts/gen-graz-map.py), und die ODbL
          verlangt die Namensnennung. Die Flaechen und Figuren der unteren
          Seitenhaelfte stammen aus gemeinfreien Digitalisaten; die Belege
          liegen in _scout/assets/SOURCES.md. Wenn spaeter eigene Fotos
          dazukommen, gehoeren sie hier ergaenzt.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Bild- und Datennachweis</h2>
        <ul>
          <li>
            Kartendaten des Hintergrundbildes:{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              © OpenStreetMap-Mitwirkende
            </a>
            , verwendet unter der Open Database License (ODbL).
          </li>
          <li>
            Flächen, Tafeln und Figuren der Seite sind aus gemeinfreien
            Digitalisaten japanischer Handrollen des 13. bis 19. Jahrhunderts
            gerechnet (Heiji-Monogatari-Emaki sowie Bestände des Metropolitan
            Museum of Art, Open Access).
          </li>
          <li>
            Schriften: Shippori Mincho B1 und Yuji Syuku, beide unter der SIL
            Open Font License 1.1, selbst gehostet.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------
          STAND
          Datum eintragen, an dem die Platzhalter ersetzt wurden.
          ------------------------------------------------------------------ */}
      <p className="jjk-legal-stand">
        Stand: 4. Oktober 2026
      </p>
    </LegalPage>
  );
}
