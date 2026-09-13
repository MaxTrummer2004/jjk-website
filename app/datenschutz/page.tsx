/**
 * DATENSCHUTZERKLAERUNG
 *
 * Aufgebaut nach Art. 13 DSGVO. Die inhaltlichen Angaben zur Verarbeitung
 * sind NICHT erfunden, sondern aus dem Code dieses Projekts abgelesen:
 *
 *   lib/db.ts             — das Schema: members(name, username, password_hash,
 *                           joined_at) und attendance_votes(member_id,
 *                           training_date, present, created_at)
 *   lib/auth.ts           — bcrypt mit Kostenfaktor 10; Session als
 *                           HS256-JWT im Cookie `jjk_session`, httpOnly,
 *                           sameSite lax, Pfad /, 90 Tage
 *   app/mitglieder/page.tsx — die Rangliste: jedes eingeloggte Mitglied sieht
 *                           Name, Benutzername und Anwesenheitsquote JEDES
 *                           anderen Mitglieds. Das ist eine Offenlegung
 *                           innerhalb des Mitgliederbereichs und steht
 *                           deshalb ausdruecklich in Abschnitt 4.
 *   app/layout.tsx        — Schriften seit dem Umbau selbst gehostet, kein
 *                           Google-CDN mehr
 *
 * Was NUR der Verein weiss — Anschrift, Vertretung, Auftragsverarbeiter-
 * Vertraege, Serverregion der Datenbank — steht als <Todo>-Platzhalter.
 * Ueber jedem Platzhalterabschnitt steht ein Kommentar, was hineingehoert.
 *
 * Kein Tracking, keine Analytics, keine Werbe-Cookies: in package.json ist
 * kein Analyse-Paket eingebunden, und die Seite laedt keine Skripte Dritter.
 * Deshalb gibt es hier auch bewusst KEIN Cookie-Banner und keinen Abschnitt
 * ueber Einwilligungen — das Session-Cookie des Logins ist technisch
 * notwendig (§ 165 Abs. 3 TKG 2021) und braucht keine.
 */

import { LegalPage, Todo } from "@/components/legal-page";
import { createMetadata } from "@/lib/metadata";
import { siteConfig } from "@/lib/config";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = createMetadata({
  title: "Datenschutzerklärung",
  description:
    "Welche personenbezogenen Daten die Website der Jiu-Jitsu Kaisen Academy verarbeitet, warum, wie lange und wer sie zu sehen bekommt.",
  path: "/datenschutz",
});

export default function DatenschutzPage(): ReactNode {
  return (
    <LegalPage
      title="Datenschutzerklärung"
      eyebrow="Information nach Art. 13 DSGVO"
      lead="Welche Daten diese Website verarbeitet, warum, wie lange sie bleiben und wer sie sieht."
    >
      <div className="jjk-legal-notice">
        <strong>An den Auftraggeber</strong>
        Jede rot markierte Stelle ist ein Platzhalter. Die Beschreibungen der
        Verarbeitung selbst sind aus dem Code abgelesen und stimmen mit dem
        überein, was die Anwendung tatsächlich tut — wenn sich der
        Mitgliederbereich ändert, muss diese Seite mitgeändert werden.
      </div>

      {/* ------------------------------------------------------------------
          VERANTWORTLICHER
          Dieselben Angaben wie im Impressum. Wenn dort der eingetragene
          Vereinsname und die Zustellanschrift stehen, hier wortgleich
          uebernehmen — Verantwortlicher im Sinne der DSGVO ist der Verein,
          nicht eine einzelne Person.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Verantwortlicher</h2>
        <p>
          Verantwortlich für die Verarbeitung personenbezogener Daten auf dieser
          Website im Sinne von Art. 4 Z 7 DSGVO ist:
        </p>
        <dl>
          <dt>Verein</dt>
          <dd>
            <Todo>VOLLSTÄNDIGER VEREINSNAME LAUT VEREINSREGISTER</Todo>
          </dd>

          <dt>Anschrift</dt>
          <dd>
            <Todo>ZUSTELLANSCHRIFT DES VEREINS</Todo>
          </dd>

          <dt>Vertreten durch</dt>
          <dd>
            <Todo>VERTRETUNGSBERECHTIGTE PERSON</Todo>
          </dd>

          <dt>E-Mail</dt>
          <dd>
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>
          </dd>
        </dl>
        {/* Ein eigener Datenschutzbeauftragter ist fuer einen Sportverein
            dieser Groesse nach Art. 37 DSGVO in aller Regel NICHT
            verpflichtend. Falls doch einer bestellt wurde, hier nennen —
            sonst diesen Absatz so stehen lassen. */}
        <p>
          Ein Datenschutzbeauftragter ist nicht bestellt; eine Bestellpflicht
          nach Art. 37 DSGVO besteht für den Verein nicht. Anfragen zum
          Datenschutz richten Sie bitte direkt an die oben genannte
          E-Mail-Adresse.
        </p>
      </section>

      <section>
        <h2>Überblick: was hier verarbeitet wird</h2>
        <p>
          Diese Website ist in zwei Teile getrennt, und die beiden verarbeiten
          sehr unterschiedlich viel:
        </p>
        <ul>
          <li>
            <strong>Der öffentliche Teil</strong> (Startseite, Impressum,
            Datenschutz) verarbeitet keine personenbezogenen Daten über die
            technisch unvermeidbaren Server-Protokolldaten hinaus. Es gibt keine
            Analyse-Werkzeuge, kein Tracking, keine Werbenetzwerke, keine
            Social-Media-Einbettungen und keine Inhalte von fremden Servern.
          </li>
          <li>
            <strong>Der Mitgliederbereich</strong> unter{" "}
            <a href="/mitglieder">/mitglieder</a> verarbeitet Zugangsdaten und
            Anwesenheiten. Er ist nur nach Registrierung und Login zugänglich.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------
          SERVER-LOGFILES
          Vercel protokolliert Requests. Wie lange genau, haengt vom gebuchten
          Plan ab (Hobby / Pro / Enterprise) — das steht im Vercel-Dashboard
          unter Observability bzw. in den Limits des Plans. Bitte dort
          nachsehen und die tatsaechliche Aufbewahrungsdauer eintragen.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Server-Protokolldaten</h2>
        <p>
          Beim Aufruf der Website übermittelt Ihr Browser technisch notwendige
          Daten, die der Hosting-Dienstleister protokolliert. Das sind
          insbesondere:
        </p>
        <ul>
          <li>IP-Adresse des anfragenden Geräts</li>
          <li>Datum und Uhrzeit der Anfrage</li>
          <li>aufgerufene Adresse und übertragene Datenmenge</li>
          <li>Statuscode der Antwort</li>
          <li>Browsertyp und Betriebssystem (User-Agent)</li>
          <li>Herkunftsseite, falls der Aufruf über einen Link erfolgte</li>
        </ul>
        <dl>
          <dt>Zweck</dt>
          <dd>
            Auslieferung der Website, Betriebssicherheit, Erkennung und
            Abwehr von Angriffen und Missbrauch.
          </dd>

          <dt>Rechtsgrundlage</dt>
          <dd>
            Art. 6 Abs. 1 lit. f DSGVO — berechtigtes Interesse am sicheren und
            störungsfreien Betrieb der Website.
          </dd>

          <dt>Speicherdauer</dt>
          <dd>
            <Todo>
              AUFBEWAHRUNGSDAUER DER SERVER-LOGS laut Vercel-Plan — im
              Vercel-Dashboard unter Observability nachsehen
            </Todo>
          </dd>
        </dl>
        <p>
          Diese Daten werden nicht mit anderen Datenquellen zusammengeführt und
          nicht dazu verwendet, einzelne Besucherinnen und Besucher zu
          identifizieren.
        </p>
      </section>

      <section>
        <h2>Mitgliederbereich: Konto und Anwesenheit</h2>
        <p>
          Der Mitgliederbereich ist eine Anwesenheitsliste für das Training. Wer
          ein Konto anlegt, gibt folgende Daten an, und folgende Daten entstehen
          durch die Nutzung:
        </p>

        <h3>Welche Daten gespeichert werden</h3>
        <ul>
          <li>
            <strong>Name</strong> — frei gewählt bei der Registrierung, dient
            der Zuordnung im Training.
          </li>
          <li>
            <strong>Benutzername</strong> — frei gewählt, dient dem Login.
          </li>
          <li>
            <strong>Passwort</strong> — wird <strong>nicht</strong> gespeichert.
            Gespeichert wird ausschließlich ein Hash, der mit dem Verfahren
            bcrypt (Kostenfaktor 10, mit individuellem Salt) berechnet wird. Aus
            diesem Hash lässt sich das Passwort nicht zurückrechnen; auch der
            Verein kann Ihr Passwort nicht einsehen.
          </li>
          <li>
            <strong>Beitrittsdatum des Kontos</strong> — das Datum der
            Registrierung. Es ist der Startpunkt, ab dem die Anwesenheitsquote
            gerechnet wird.
          </li>
          <li>
            <strong>Anwesenheitseinträge</strong> — je Trainingstag ein Eintrag
            mit der Angabe anwesend oder nicht anwesend, dem Trainingsdatum und
            dem Zeitpunkt der Eintragung. Die Eintragung erfolgt durch das
            Mitglied selbst.
          </li>
        </ul>
        <p>
          Darüber hinaus werden im Mitgliederbereich keine weiteren Daten
          erhoben: keine E-Mail-Adresse, keine Telefonnummer, keine Adresse, kein
          Geburtsdatum, keine Zahlungsdaten.
        </p>

        <h3>Wer diese Daten sieht</h3>
        <p>
          Der Mitgliederbereich enthält eine Rangliste. Jedes eingeloggte
          Mitglied sieht darin <strong>Name, Benutzername und
          Anwesenheitsquote aller anderen Mitglieder</strong>. Das ist die
          Funktion des Bereichs und keine Panne — wer sich registriert, macht
          seine Trainingsanwesenheit für die übrigen Mitglieder sichtbar. Für
          Personen ohne Konto ist nichts davon zugänglich.
        </p>

        <h3>Zweck und Rechtsgrundlage</h3>
        <dl>
          <dt>Zweck</dt>
          <dd>
            Führen einer Anwesenheitsübersicht für das Training sowie
            Verwaltung des Zugangs zum Mitgliederbereich.
          </dd>

          <dt>Rechtsgrundlage</dt>
          <dd>
            Art. 6 Abs. 1 lit. b DSGVO — die Verarbeitung erfolgt zur
            Durchführung des Mitgliedschaftsverhältnisses, dessen Teil die
            Teilnahme am Training ist. Soweit die Nutzung des Bereichs
            freiwillig über das Mitgliedschaftsverhältnis hinausgeht, stützt
            sich die Verarbeitung zusätzlich auf Art. 6 Abs. 1 lit. f DSGVO
            (berechtigtes Interesse des Vereins an einer nachvollziehbaren
            Trainingsorganisation).
          </dd>

          <dt>Freiwilligkeit</dt>
          <dd>
            Die Registrierung ist freiwillig. Wer kein Konto anlegt, kann
            trainieren wie zuvor; es entsteht kein Nachteil.
          </dd>
        </dl>

        {/* ----------------------------------------------------------------
            SPEICHERDAUER
            Hier steht bewusst noch kein Zeitraum, weil es im Code keinen gibt:
            weder actions.ts noch db.ts loeschen jemals etwas, und es gibt
            derzeit auch keine Funktion "Konto loeschen". Der Verein muss
            festlegen, wie lange Konten und Anwesenheitseintraege aufbewahrt
            werden (ueblich: bis zum Austritt plus die Frist fuer moegliche
            Rechtsansprueche), und diese Frist hier eintragen — und sie dann
            auch einhalten.
            ---------------------------------------------------------------- */}
        <h3>Speicherdauer</h3>
        <p>
          <Todo>
            AUFBEWAHRUNGSFRIST FÜR KONTEN UND ANWESENHEITSEINTRÄGE festlegen —
            z. B. Löschung des Kontos samt Einträgen binnen X Monaten nach
            Austritt oder auf Wunsch
          </Todo>
        </p>
        <p>
          Bis dahin gilt: Ein Konto kann jederzeit gelöscht werden. Schicken Sie
          dafür eine formlose Nachricht an{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>. Mit dem
          Konto werden auch alle zugehörigen Anwesenheitseinträge gelöscht.
        </p>
      </section>

      <section>
        <h2>Cookies</h2>
        <p>
          Diese Website setzt genau ein Cookie, und nur dann, wenn Sie sich im
          Mitgliederbereich anmelden:
        </p>
        <dl>
          <dt>Name</dt>
          <dd>
            <code>jjk_session</code>
          </dd>

          <dt>Inhalt</dt>
          <dd>
            Ein signiertes Token (JWT, Verfahren HS256), das ausschließlich die
            interne Mitglieds-Nummer und die Gültigkeitsdauer enthält. Es
            enthält weder Ihr Passwort noch Ihren Namen.
          </dd>

          <dt>Zweck</dt>
          <dd>
            Sie bleiben angemeldet, ohne bei jedem Seitenaufruf erneut das
            Passwort eingeben zu müssen.
          </dd>

          <dt>Eigenschaften</dt>
          <dd>
            <code>httpOnly</code> (für JavaScript im Browser nicht lesbar),{" "}
            <code>sameSite=lax</code> (wird nicht an fremde Seiten
            mitgeschickt), im Betrieb zusätzlich <code>secure</code> (nur über
            HTTPS).
          </dd>

          <dt>Laufzeit</dt>
          <dd>90 Tage; beim Abmelden wird es sofort gelöscht.</dd>

          <dt>Rechtsgrundlage</dt>
          <dd>
            § 165 Abs. 3 TKG 2021 in Verbindung mit Art. 6 Abs. 1 lit. b DSGVO.
            Das Cookie ist für den ausdrücklich gewünschten Dienst &bdquo;Login&ldquo;
            unbedingt erforderlich und bedarf daher keiner Einwilligung. Aus
            demselben Grund gibt es auf dieser Website kein Cookie-Banner.
          </dd>
        </dl>
        <p>
          Weitere Cookies werden nicht gesetzt — insbesondere keine für Analyse,
          Reichweitenmessung oder Werbung.
        </p>
      </section>

      {/* ------------------------------------------------------------------
          AUFTRAGSVERARBEITER
          Beide brauchen einen Auftragsverarbeitungsvertrag nach Art. 28 DSGVO.
          Vercel und Neon stellen beide standardmaessig ein DPA bereit, das
          sich im jeweiligen Dashboard abschliessen bzw. herunterladen laesst —
          das muss der Verein tun und danach hier vermerken, ab wann es gilt.
          Bei Neon ist ausserdem die Region der Datenbank wichtig: sie kann in
          der EU (z. B. Frankfurt) oder in den USA liegen, und davon haengt
          Abschnitt "Datenübermittlung in Drittländer" ab. Die Region steht im
          Neon-Dashboard beim Projekt.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Empfänger und Auftragsverarbeiter</h2>
        <p>
          Die Daten werden nicht verkauft und nicht zu Werbezwecken
          weitergegeben. Zum Betrieb der Website sind zwei Dienstleister
          eingebunden, die als Auftragsverarbeiter nach Art. 28 DSGVO tätig
          werden:
        </p>

        <h3>Hosting: Vercel</h3>
        <dl>
          <dt>Anbieter</dt>
          <dd>
            Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA
          </dd>

          <dt>Verarbeitet</dt>
          <dd>
            Server-Protokolldaten sowie alle Daten, die beim Aufruf der Website
            technisch durchlaufen.
          </dd>

          <dt>Auftragsverarbeitungsvertrag</dt>
          <dd>
            <Todo>
              DPA MIT VERCEL abschließen und hier Datum bzw. Fundstelle
              eintragen
            </Todo>
          </dd>
        </dl>

        <h3>Datenbank: Neon</h3>
        <dl>
          <dt>Anbieter</dt>
          <dd>
            Neon Inc. (Neon Serverless Postgres),{" "}
            <Todo>FIRMENANSCHRIFT LAUT NEON-VERTRAG</Todo>
          </dd>

          <dt>Verarbeitet</dt>
          <dd>
            Die Konto- und Anwesenheitsdaten des Mitgliederbereichs (Tabellen{" "}
            <code>members</code> und <code>attendance_votes</code>).
          </dd>

          <dt>Serverstandort</dt>
          <dd>
            <Todo>
              REGION DER NEON-DATENBANK — im Neon-Dashboard beim Projekt
              ablesen, z. B. eu-central-1 (Frankfurt)
            </Todo>
          </dd>

          <dt>Auftragsverarbeitungsvertrag</dt>
          <dd>
            <Todo>
              DPA MIT NEON abschließen und hier Datum bzw. Fundstelle eintragen
            </Todo>
          </dd>
        </dl>
      </section>

      {/* ------------------------------------------------------------------
          DRITTLANDTRANSFER
          Haengt an der Antwort aus dem Abschnitt darueber. Liegt die
          Neon-Datenbank in der EU, betrifft dieser Abschnitt nur Vercel.
          Liegt sie in den USA, betrifft er beide. Bitte pruefen, ob die
          jeweilige US-Gesellschaft unter dem EU-U.S. Data Privacy Framework
          zertifiziert ist — nachsehen auf dataprivacyframework.gov — und das
          Ergebnis hier eintragen.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Datenübermittlung in Drittländer</h2>
        <p>
          Soweit Daten an Server außerhalb der EU bzw. des EWR übermittelt
          werden, stützt sich die Übermittlung auf:
        </p>
        <ul>
          <li>
            <Todo>
              ZERTIFIZIERUNG NACH DEM EU-U.S. DATA PRIVACY FRAMEWORK prüfen
              (dataprivacyframework.gov) und hier eintragen, für welche
              Dienstleister sie vorliegt
            </Todo>
          </li>
          <li>
            ergänzend die Standardvertragsklauseln der EU-Kommission
            (Durchführungsbeschluss (EU) 2021/914), soweit sie Bestandteil des
            jeweiligen Auftragsverarbeitungsvertrags sind.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------
          KONTAKTAUFNAHME
          Das E-Mail-Feld im Footer der Startseite ist derzeit OHNE FUNKTION:
          der Knopf daneben ist ein type="button" ohne Handler, es wird nichts
          abgeschickt und nichts gespeichert (components/footer-4.tsx). Sobald
          daraus eine echte Anmeldung wird, gehoert hier ein eigener Abschnitt
          hin: welcher Versanddienst, welche Einwilligung, wie der Abmeldeweg
          aussieht.
          ------------------------------------------------------------------ */}
      <section>
        <h2>Kontaktaufnahme per E-Mail oder Telefon</h2>
        <p>
          Wenn Sie uns schreiben oder anrufen, verarbeiten wir Ihre Angaben, um
          die Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO bei Anfragen zu Mitgliedschaft oder Probetraining, sonst Art. 6
          Abs. 1 lit. f DSGVO. Die Nachrichten werden gelöscht, sobald sie nicht
          mehr benötigt werden und keine gesetzlichen Aufbewahrungspflichten
          entgegenstehen.
        </p>
        <p>
          Das Eingabefeld für die E-Mail-Adresse im Fußbereich der Startseite
          ist derzeit ohne Funktion: es wird nichts übermittelt und nichts
          gespeichert. Sollte daraus ein echter Newsletter werden, wird diese
          Erklärung vorher entsprechend ergänzt.
        </p>
      </section>

      <section>
        <h2>Schriften und externe Inhalte</h2>
        <p>
          Alle Schriften dieser Website liegen auf dem eigenen Server und werden
          von dort ausgeliefert. Es besteht <strong>keine</strong> Verbindung zu
          Google Fonts oder einem anderen Schrift-Dienst; beim Aufruf der Seite
          wird Ihre IP-Adresse an keinen Dritten übermittelt. Ebenso werden keine
          Karten, Videos, Schaltflächen oder sonstigen Inhalte von fremden
          Servern nachgeladen.
        </p>
        <p>
          Die Links zu den Social-Media-Profilen des Vereins sind gewöhnliche
          Links. Es werden dort keine Inhalte eingebettet, und es fließen keine
          Daten ab, solange Sie einen dieser Links nicht selbst anklicken. Was
          nach dem Klick geschieht, richtet sich nach der Datenschutzerklärung
          des jeweiligen Anbieters.
        </p>
      </section>

      <section>
        <h2>Ihre Rechte</h2>
        <p>Nach der DSGVO stehen Ihnen gegenüber dem Verein folgende Rechte zu:</p>
        <ul>
          <li>
            <strong>Auskunft</strong> (Art. 15 DSGVO) — welche Daten über Sie
            gespeichert sind, woher sie stammen und wer sie erhält.
          </li>
          <li>
            <strong>Berichtigung</strong> (Art. 16 DSGVO) — unrichtige Daten
            richtigstellen zu lassen.
          </li>
          <li>
            <strong>Löschung</strong> (Art. 17 DSGVO) — Ihre Daten löschen zu
            lassen, soweit keine Aufbewahrungspflicht entgegensteht.
          </li>
          <li>
            <strong>Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO).
          </li>
          <li>
            <strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO) — Ihre Daten in
            einem gängigen, maschinenlesbaren Format zu erhalten.
          </li>
          <li>
            <strong>Widerspruch</strong> (Art. 21 DSGVO) gegen Verarbeitungen,
            die auf ein berechtigtes Interesse gestützt sind.
          </li>
        </ul>
        <p>
          Für alle diese Anliegen genügt eine formlose Nachricht an{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>. Wir
          antworten innerhalb eines Monats.
        </p>

        <h3>Beschwerderecht</h3>
        <p>
          Wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen die
          DSGVO verstößt, können Sie sich bei der Aufsichtsbehörde beschweren:
        </p>
        <dl>
          <dt>Behörde</dt>
          <dd>Österreichische Datenschutzbehörde</dd>

          <dt>Anschrift</dt>
          <dd>Barichgasse 40&ndash;42, 1030 Wien</dd>

          <dt>Web</dt>
          <dd>
            <a href="https://www.dsb.gv.at" target="_blank" rel="noreferrer">
              dsb.gv.at
            </a>
          </dd>
        </dl>
      </section>

      <section>
        <h2>Datensicherheit</h2>
        <ul>
          <li>
            Die Website wird ausschließlich verschlüsselt übertragen (HTTPS).
          </li>
          <li>
            Passwörter werden ausschließlich als bcrypt-Hash mit individuellem
            Salt gespeichert, niemals im Klartext.
          </li>
          <li>
            Das Session-Cookie ist <code>httpOnly</code> und damit für
            JavaScript im Browser nicht auslesbar; das enthaltene Token ist
            serverseitig signiert und kann nicht gefälscht werden.
          </li>
          <li>
            Der Mitgliederbereich ist ohne gültige Anmeldung nicht erreichbar.
          </li>
        </ul>
      </section>

      <section>
        <h2>Keine automatisierte Entscheidungsfindung</h2>
        <p>
          Es findet keine automatisierte Entscheidungsfindung einschließlich
          Profiling im Sinne von Art. 22 DSGVO statt. Die Anwesenheitsquote im
          Mitgliederbereich ist eine reine Rechnung aus selbst eingetragenen
          Werten und hat keine rechtliche Wirkung.
        </p>
      </section>

      <section>
        <h2>Änderungen dieser Erklärung</h2>
        <p>
          Diese Erklärung wird angepasst, sobald sich die Website oder die
          Rechtslage ändert. Maßgeblich ist immer die hier veröffentlichte
          Fassung.
        </p>
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
