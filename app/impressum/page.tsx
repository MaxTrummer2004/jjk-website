/**
 * IMPRESSUM
 *
 * Pflichtangaben nach § 5 ECG (E-Commerce-Gesetz) und §§ 24, 25
 * Mediengesetz. Fuer einen eingetragenen Verein mit Website gilt beides:
 * § 5 ECG, weil die Seite ein Dienst der Informationsgesellschaft ist, und
 * § 25 MedienG, weil sie eine "wiederkehrende elektronische Publikation"
 * ist (Offenlegung: Medieninhaber, Sitz, Vereinsorgane, Blattlinie).
 *
 * HIER IST NICHTS ERFUNDEN. Jede Angabe, die nur der Verein selbst kennt,
 * steht als <Todo>-Platzhalter und faellt im Browser rot auf. Ueber jedem
 * Platzhalterabschnitt steht ein Kommentar, was dort hineingehoert.
 *
 * BEWUSST NICHT ENTHALTEN: ein Link auf die EU-Plattform zur
 * Online-Streitbeilegung (ec.europa.eu/odr). Die Plattform hat den Betrieb
 * am 20. Juli 2025 eingestellt; ein Link darauf waere heute ein toter Link
 * und keine Pflichtangabe mehr. Die Hinweispflicht nach Art. 14 ODR-VO ist
 * mit der Verordnung (EU) 2024/3228 entfallen.
 */

import { LegalPage, Todo } from "@/components/legal-page";
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
      <div className="jjk-legal-notice">
        <strong>An den Auftraggeber</strong>
        Jede rot markierte Stelle ist ein Platzhalter und muss vor dem
        Veröffentlichen durch die echte Angabe ersetzt werden. Solange auch nur
        eine davon stehen bleibt, erfüllt diese Seite die Offenlegungspflicht
        nicht.
      </div>

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
            <Todo>VOLLSTÄNDIGER VEREINSNAME LAUT VEREINSREGISTER</Todo>
          </dd>

          <dt>Rechtsform</dt>
          <dd>
            Verein nach dem Vereinsgesetz 2002 (VerG)
          </dd>

          <dt>ZVR-Zahl</dt>
          <dd>
            <Todo>ZVR-ZAHL</Todo>
          </dd>

          <dt>Vereinssitz</dt>
          <dd>
            <Todo>VEREINSSITZ — politische Gemeinde laut Statuten, z. B. Graz</Todo>
          </dd>

          <dt>Anschrift</dt>
          <dd>
            <Todo>ZUSTELLANSCHRIFT DES VEREINS</Todo>
            <br />
            {/* Die Trainingsstaette steht hier als Hinweis, weil sie im Rest
                der Seite genannt wird (lib/config.ts). Sie ist NICHT
                automatisch die Zustelladresse des Vereins — wenn beides
                dasselbe ist, den Platzhalter oben einfach durch diese Zeile
                ersetzen und den Zusatz loeschen. */}
            <span className="text-muted-foreground">
              (Trainingsstätte laut Website: {siteConfig.address.street},{" "}
              {siteConfig.address.city})
            </span>
          </dd>
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
          <dt>Obmann / Obfrau</dt>
          <dd>
            <Todo>VERTRETUNGSBERECHTIGTE PERSON</Todo>
          </dd>

          <dt>Stellvertretung</dt>
          <dd>
            <Todo>STELLVERTRETUNG — oder diese Zeile streichen, falls es keine gibt</Todo>
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
          <Todo>
            VEREINSZWECK LAUT STATUTEN — der Wortlaut aus dem Statutenpunkt
            &bdquo;Zweck&ldquo;, sinngemäß übernommen
          </Todo>
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
            <Todo>
              VEREINSBEHÖRDE LAUT VEREINSREGISTERAUSZUG — bei Vereinssitz in
              Graz üblicherweise die Landespolizeidirektion Steiermark
            </Todo>
          </dd>

          <dt>Rechtsgrundlage</dt>
          <dd>Vereinsgesetz 2002 (VerG), BGBl. I Nr. 66/2002 idgF</dd>
        </dl>
      </section>

      {/* ------------------------------------------------------------------
          UMSATZSTEUER
          Nur ausfuellen, falls der Verein unternehmerisch taetig und
          umsatzsteuerpflichtig ist (dann besteht eine UID-Nummer). Viele
          gemeinnuetzige Sportvereine sind das NICHT — in dem Fall diesen
          ganzen Abschnitt ersatzlos loeschen statt "keine UID" hinzuschreiben.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Umsatzsteuer</h2>
        <p>
          <Todo>
            UID-NUMMER, falls der Verein umsatzsteuerpflichtig ist — sonst
            diesen Abschnitt ganz entfernen
          </Todo>
        </p>
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
        Stand: <Todo>DATUM</Todo>
      </p>
    </LegalPage>
  );
}
