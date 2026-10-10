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
 *                           Name und Anwesenheitsquote JEDES
 *                           anderen Mitglieds. Das ist eine Offenlegung
 *                           innerhalb des Mitgliederbereichs und steht
 *                           deshalb ausdruecklich in Abschnitt 4.
 *   app/layout.tsx        — Schriften seit dem Umbau selbst gehostet, kein
 *                           Google-CDN mehr
 *
 * Seit 4. Oktober 2026 laeuft alles bei Scalingo SAS (Strasbourg), Region
 * osc-fr1, Rechenzentren Paris-Pantin und Magny-les-Hameaux. Vorher: Vercel
 * (USA) plus Neon/Databricks. Ein Drittlandabschnitt ist deshalb entfallen,
 * Platzhalter gibt es keine mehr.
 *
 * Kein Tracking, keine Analytics, keine Werbe-Cookies: in package.json ist
 * kein Analyse-Paket eingebunden, und die Seite laedt keine Skripte Dritter.
 * Deshalb gibt es hier auch bewusst KEIN Cookie-Banner und keinen Abschnitt
 * ueber Einwilligungen — das Session-Cookie des Logins ist technisch
 * notwendig (§ 165 Abs. 3 TKG 2021) und braucht keine.
 */

import { LegalPage } from "@/components/legal-page";
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
            Jiu Jitsu Kaisen Akademie
          </dd>

          <dt>Anschrift</dt>
          <dd>
            8160 Weiz, Andelberggasse 11
            <br />
            <span className="text-muted-foreground">
              Anschrift laut Vereinsregister. Trainingsstätte:{" "}
              {siteConfig.address.street}, {siteConfig.address.city}
            </span>
          </dd>

          <dt>Vertreten durch</dt>
          <dd>
            Wolfgang Kern (Obmann)
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
            technisch unvermeidbaren Server-Protokolldaten hinaus &mdash;
            außer Sie schicken uns über &bdquo;Probetraining ausmachen&ldquo;
            von sich aus eine Anfrage. Es gibt keine
            Analyse-Werkzeuge, kein Tracking, keine Werbenetzwerke, keine
            Social-Media-Einbettungen und keine Inhalte von fremden Servern.
          </li>
          <li>
            <strong>Die Beitrittserklärung</strong> unter{" "}
            <a href="/beitreten">/beitreten</a> und der{" "}
            <strong>Mitgliederbereich</strong> unter{" "}
            <a href="/mitglieder">/mitglieder</a> verarbeiten die Angaben aus dem
            Beitritt, Zugangsdaten, den Zahlungsstand und Anwesenheiten. Der
            Mitgliederbereich ist nur nach Login zugänglich.
          </li>
        </ul>
      </section>

      {/* ------------------------------------------------------------------
          SERVER-LOGFILES
          Scalingo haelt alle Logs ein Jahr (doc.scalingo.com/platform/app/logs,
          "all logs on Scalingo are kept for 1 year"; im DPA Art. 12 als zwoelf
          Monate). Die Router-Logs — also die Zeile pro Request mit IP — sind
          laut derselben Doku "not enable by default" und fuer diese App nicht
          eingeschaltet. Plan-abhaengig ist daran nichts.
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
            Art. 6 Abs. 1 lit. f DSGVO: berechtigtes Interesse am sicheren und
            störungsfreien Betrieb der Website.
          </dd>

          <dt>Speicherdauer</dt>
          <dd>
            Ein Jahr. Scalingo schreibt dazu: &bdquo;all logs on Scalingo are
            kept for 1 year&ldquo; und begründet das mit französischem und
            europäischem Recht, das Betreiber zur Vorhaltung von
            Verbindungsdaten verpflichtet. Im Auftragsverarbeitungsvertrag ist
            dieselbe Frist als zwölf Monate genannt.
          </dd>

          <dt>Umfang</dt>
          <dd>
            Die Protokollierung der einzelnen Seitenaufrufe
            (&bdquo;Router-Logs&ldquo;, die Liste oben) ist bei Scalingo
            standardmäßig <strong>nicht eingeschaltet</strong> und für diese
            Website nicht aktiviert. Protokolliert wird, was die Anwendung
            selbst ausgibt, sowie Verbindungsdaten auf Netzebene.
          </dd>
        </dl>
        <p>
          Diese Daten werden nicht mit anderen Datenquellen zusammengeführt und
          nicht dazu verwendet, einzelne Besucherinnen und Besucher zu
          identifizieren.
        </p>
      </section>

      <section>
        <h2>Beitritt und Mitgliederbereich</h2>
        <p>
          Über die Beitrittserklärung auf dieser Website beantragen Sie die
          Mitgliedschaft im Verein. Über die Aufnahme entscheidet der Vorstand
          (§ 5 Abs. 2 der Statuten). Mit dem Antrag entsteht zugleich Ihr Zugang
          zum Mitgliederbereich.
        </p>

        {/* ----------------------------------------------------------------
            Die Liste entspricht 1:1 den Spalten in lib/db.ts (members,
            payments, attendance_votes). Wer dort eine Spalte ergaenzt, muss
            sie hier nachtragen.

            Offen: Die Beitrittserklaerung (PDF) nennt eine "Meldung an den
            Dachverband". Ueber diese Website wird nichts an einen Dachverband
            uebermittelt. Sobald feststeht, welcher Verband das ist und welche
            Daten er bekommt, gehoert das als Empfaenger hierher.
            ---------------------------------------------------------------- */}
        <h3>Welche Daten gespeichert werden</h3>
        <ul>
          <li>
            <strong>Aus der Beitrittserklärung</strong>: Vor- und Nachname,
            Adresse, Geburtsdatum, Telefonnummer, E-Mail-Adresse, die gewählte
            Mitgliedschaft und ob Sie den Schüler- oder Studentenpreis
            beantragen.
          </li>
          <li>
            <strong>Bei Minderjährigen</strong>: Vor- und Nachname,
            Telefonnummer und, falls angegeben, E-Mail-Adresse eines
            Erziehungsberechtigten sowie der Vermerk, ob dessen schriftliche
            Zustimmung vorliegt. Die unterschriebene Zustimmung selbst wird auf
            Papier aufbewahrt, nicht auf der Website.
          </li>
          <li>
            <strong>Ausweis</strong>: nur der Vermerk, dass der Vorstand einen
            gültigen Schüler- oder Studentenausweis gesehen hat. Es wird keine
            Kopie, kein Foto und keine Ausweisnummer gespeichert.
          </li>
          <li>
            <strong>Einwilligungen</strong>: ob Sie der Verwendung von Fotos und
            Videos und der Aufnahme in vereinsinterne WhatsApp-Gruppen
            zugestimmt haben (jeweils ja/nein), sowie der Zeitpunkt, zu dem Sie
            die Bedingungen der Mitgliedschaft bestätigt haben.
          </li>
          <li>
            <strong>Antrag und Aufnahme</strong>: Datum des Antrags, Stand
            (offen, aufgenommen, abgelehnt), Datum der Entscheidung und welches
            Vorstandsmitglied sie eingetragen hat.
          </li>
          <li>
            <strong>Passwort</strong>: wird <strong>nicht</strong> gespeichert.
            Gespeichert wird ausschließlich ein Hash, der mit dem Verfahren
            bcrypt (Kostenfaktor 10, mit individuellem Salt) berechnet wird. Aus
            diesem Hash lässt sich das Passwort nicht zurückrechnen; auch der
            Verein kann Ihr Passwort nicht einsehen.
          </li>
          <li>
            <strong>Zahlungsstand</strong>: je bezahltem Posten
            (Einschreibgebühr, Monatsbeitrag, 10er-Block) die Art, der Monat,
            der Betrag, wann er eingetragen wurde und von wem. Es werden keine
            Kontonummern, Kartendaten oder Bankauszüge gespeichert.
          </li>
          <li>
            <strong>Anwesenheitseinträge</strong>: je Trainingstag ein Eintrag
            mit der Angabe anwesend oder nicht anwesend, dem Trainingsdatum und
            dem Zeitpunkt der Eintragung. Die Eintragung erfolgt durch das
            Mitglied selbst.
          </li>
        </ul>

        <h3>Wer diese Daten sieht</h3>
        <ul>
          <li>
            <strong>Sie selbst</strong> sehen im Mitgliederbereich Ihren
            Aufnahmestand und Ihren eigenen Zahlungsstand.
          </li>
          <li>
            <strong>Andere aufgenommene Mitglieder</strong> sehen in der
            Rangliste Ihren <strong>Namen und Ihre Anwesenheitsquote</strong>{" "}
            &mdash; sonst nichts, insbesondere nicht Ihren Zahlungsstand und
            keine Kontaktdaten. Solange ein Antrag offen ist, erscheint er in
            keiner Liste, und man sieht auch selbst noch keine anderen
            Mitglieder.
          </li>
          <li>
            <strong>Der Vorstand</strong> sieht alle oben genannten Angaben
            aller Mitglieder, einschließlich Kontaktdaten und Zahlungsstand. Er
            braucht sie für Aufnahme, Beitragsabrechnung und
            Mitgliederverwaltung.
          </li>
        </ul>

        <h3>Zweck und Rechtsgrundlage</h3>
        <dl>
          <dt>Beitritt, Mitgliederverwaltung, Beiträge</dt>
          <dd>
            Art. 6 Abs. 1 lit. b DSGVO: Die Angaben sind für die Aufnahme und die
            Durchführung des Mitgliedschaftsverhältnisses erforderlich. Ohne sie
            ist ein Beitritt nicht möglich. Das gilt auch für die Angaben zu
            Erziehungsberechtigten, weil die Aufnahme Minderjähriger nach § 5
            Abs. 1 der Statuten deren schriftliche Zustimmung voraussetzt.
          </dd>

          <dt>Fotos, Videos, WhatsApp</dt>
          <dd>
            Art. 6 Abs. 1 lit. a DSGVO: Ihre Einwilligung. Sie ist freiwillig,
            keine Voraussetzung für die Mitgliedschaft und jederzeit für die
            Zukunft widerrufbar, formlos an{" "}
            <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>.
          </dd>

          <dt>Anwesenheitsliste</dt>
          <dd>
            Art. 6 Abs. 1 lit. b DSGVO, weil die Teilnahme am Training Teil des
            Mitgliedschaftsverhältnisses ist; soweit die Nutzung darüber
            hinausgeht, Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse des
            Vereins an einer nachvollziehbaren Trainingsorganisation). Das
            Eintragen der Anwesenheit ist freiwillig.
          </dd>
        </dl>

        <h3>Speicherdauer</h3>
        <p>
          Mitgliedsdaten und Anwesenheitseinträge werden spätestens zwölf
          Monate nach dem Austritt aus dem Verein gelöscht, auf Wunsch
          jederzeit früher. Die Frist gibt dem Verein Zeit, offene Beiträge und
          Ansprüche aus der Mitgliedschaft abzuwickeln, und ist nicht länger als
          dafür nötig.
        </p>
        <p>
          Ausgenommen sind die Aufzeichnungen über Zahlungen: Sie bewahrt der
          Verein so lange auf, wie gesetzliche Aufbewahrungspflichten es
          verlangen, in der Regel sieben Jahre (§ 132 BAO).
        </p>
        <p>
          Abgelehnte Anträge löscht der Vorstand, auf Wunsch sofort.
        </p>
        <p>
          Bis dahin gilt: Ein Konto kann jederzeit gelöscht werden. Schicken Sie
          dafür eine formlose Nachricht an{" "}
          <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a>. Mit dem
          Konto werden auch alle zugehörigen Anwesenheitseinträge gelöscht.
        </p>
      </section>

      <section>
        <h2>Cookies und lokale Speicherung</h2>
        <p>
          Diese Website setzt drei Cookies. Zwei davon nur, wenn Sie sich im
          Mitgliederbereich anmelden; das dritte nur, wenn Sie dort auf
          &bdquo;Startseite&ldquo; klicken. Wer sich nicht anmeldet, bekommt
          kein einziges Cookie.
        </p>
        <dl>
          <dt>
            <code>jjk_session</code>
          </dt>
          <dd>
            Ein signiertes Token (JWT, Verfahren HS256), das ausschließlich die
            interne Mitglieds-Nummer und die Gültigkeitsdauer enthält &mdash;
            weder Ihr Passwort noch Ihren Namen. Es hält Sie angemeldet.
            Eigenschaften: <code>httpOnly</code> (für JavaScript im Browser
            nicht lesbar), <code>sameSite=lax</code> (wird nicht an fremde
            Seiten mitgeschickt), im Betrieb zusätzlich <code>secure</code>
            (nur über HTTPS). Laufzeit: 90 Tage, wenn Sie beim Anmelden
            &bdquo;Angemeldet bleiben&ldquo; angehakt lassen, sonst nur bis zum
            Schließen des Browsers. Beim Abmelden wird es sofort gelöscht.
          </dd>

          <dt>
            <code>jjk_member</code>
          </dt>
          <dd>
            Enthält nur den Wert <code>1</code> und damit die einzige Auskunft,
            dass in diesem Browser jemand angemeldet ist &mdash; keine Nummer,
            keinen Namen, kein Token. Es wird gesetzt, weil die Startseite als
            fertige Datei ausgeliefert wird und erst im Browser entscheidet, ob
            die Schaltfläche &bdquo;Mitglied werden&ldquo; oder &bdquo;Mein
            Bereich&ldquo; heißt. Gleiche Laufzeit wie <code>jjk_session</code>,
            wird zusammen mit ihm gelöscht.
          </dd>

          <dt>
            <code>jjk_home</code>
          </dt>
          <dd>
            Enthält nur den Wert <code>1</code>. Angemeldete Mitglieder werden
            beim Aufruf der Startseite in den Mitgliederbereich geleitet; dieses
            Cookie setzt die Weiterleitung aus, wenn Sie dort auf
            &bdquo;Startseite&ldquo; klicken, damit Sie den öffentlichen Teil
            auch wirklich sehen können. Es endet mit dem Schließen des Browsers.
          </dd>

          <dt>Rechtsgrundlage für alle drei</dt>
          <dd>
            § 165 Abs. 3 TKG 2021 in Verbindung mit Art. 6 Abs. 1 lit. b DSGVO.
            Alle drei sind für ausdrücklich gewünschte Funktionen &mdash;
            Anmelden und Bedienen des Mitgliederbereichs &mdash; unbedingt
            erforderlich und bedürfen daher keiner Einwilligung. Aus demselben
            Grund gibt es auf dieser Website kein Cookie-Banner.
          </dd>
        </dl>
        <p>
          Im lokalen Speicher Ihres Browsers legt die Website nichts ab. Hier
          stand bis zum 5. Oktober 2026 ein Eintrag
          <code>jjk.intro.seen</code>, der festhielt, dass Sie die
          Eröffnungsanimation schon gesehen hatten; die Animation läuft jetzt
          bei jedem Aufruf, der Eintrag wird nicht mehr geschrieben. Ein alter
          Eintrag aus früheren Besuchen wird nicht mehr gelesen und kann über
          die Browsereinstellungen gelöscht werden.
        </p>
        <p>
          Weitere Cookies werden nicht gesetzt: insbesondere keine für Analyse,
          Reichweitenmessung oder Werbung.
        </p>
      </section>

      <section>
        <h2>Empfänger und Auftragsverarbeiter</h2>
        <p>
          Die Daten werden nicht verkauft und nicht zu Werbezwecken
          weitergegeben. Zum Betrieb der Website ist ein einziger Dienstleister
          eingebunden, der als Auftragsverarbeiter nach Art. 28 DSGVO tätig
          wird; für Online-Zahlungen kommt ein Zahlungsdienstleister dazu
          (siehe unten):
        </p>

        <dl>
          <dt>Anbieter</dt>
          <dd>
            Scalingo SAS, 13 rue Jacques Peirotes, 67000 Strasbourg,
            Frankreich. Datenschutzbeauftragter: dpo@scalingo.com
          </dd>

          <dt>Verarbeitet</dt>
          <dd>
            Den gesamten Betrieb: Auslieferung der Website, Server-Protokolle
            und die Datenbank des Mitgliederbereichs (Tabellen{" "}
            <code>members</code> und <code>attendance_votes</code>).
          </dd>

          <dt>Serverstandort</dt>
          <dd>
            Paris-Pantin und Magny-les-Hameaux, Frankreich (Region{" "}
            <code>osc-fr1</code>). Auch die Sicherungskopien der Datenbank und
            die archivierten Protokolle liegen dort.
          </dd>

          <dt>Auftragsverarbeitungsvertrag</dt>
          <dd>
            Scalingos Data Processing Agreement, abrufbar unter
            scalingo.com/data-processing-agreement. Es ist nach seinem eigenen
            Wortlaut &bdquo;an integral part of the Agreement&ldquo; und gilt
            mit dem Vertrag, ohne dass es gesondert abgeschlossen werden muss.
          </dd>

          <dt>Unterauftragsverarbeiter</dt>
          <dd>
            Für das Hosting genau einer: OUTSCALE, 1 rue Royale, 92210
            Saint-Cloud, Frankreich, für den Betrieb der Rechenzentren. Der
            Vertrag vermerkt dazu ausdrücklich &bdquo;N/A (no transfer)&ldquo;
            — es findet keine Übermittlung außerhalb der EU statt. Eine
            geplante Änderung muss Scalingo ankündigen; der Verein kann ihr
            binnen acht Kalendertagen widersprechen.
          </dd>
        </dl>

        {/* ----------------------------------------------------------------
            MOLLIE
            Rolle laut mollie.com/legal/privacy: "For all activities and
            purposes mentioned in this Privacy Statement, Mollie acts as the
            controller" — darunter "To process payments". Deshalb hier als
            eigener Verantwortlicher und NICHT als Auftragsverarbeiter.
            Anschrift aus dem DPA (mollie.com/legal/data-processing-agreement).
            Was die Website selbst speichert: lib/db.ts, Spalten
            mollie_customer_id, mollie_subscription_id, payments.provider_ref.
            ---------------------------------------------------------------- */}
        <h3>Online-Zahlung</h3>
        <dl>
          <dt>Anbieter</dt>
          <dd>
            Mollie B.V., Keizersgracht 126, 1015 CW Amsterdam, Niederlande, ein
            von der niederländischen Zentralbank zugelassenes
            E-Geld-Institut.
          </dd>

          <dt>Was übermittelt wird</dt>
          <dd>
            Wenn Sie im Mitgliederbereich auf &bdquo;Jetzt bezahlen&ldquo;
            tippen: Ihr Name, Ihre E-Mail-Adresse, der Betrag und wofür
            bezahlt wird. Ihre Bankdaten geben Sie direkt bei Mollie bzw. Ihrer
            Bank ein, nicht auf dieser Website. Bei Monatsbeiträgen erteilen
            Sie dabei ein SEPA-Lastschriftmandat, über das Mollie die folgenden
            Beiträge abbucht.
          </dd>

          <dt>Was der Verein davon sieht</dt>
          <dd>
            Auf der Website wird nur gespeichert, welche Posten bezahlt sind,
            sowie die Kennungen, die Mollie für Sie, Ihre Zahlungen und Ihr
            Lastschrift-Abo vergibt. Im Konto des Vereins bei Mollie sind
            zusätzlich die Angaben zur jeweiligen Zahlung einsehbar, bei
            Lastschriften auch Kontoinhaber und IBAN.
          </dd>

          <dt>Rolle und Rechtsgrundlage</dt>
          <dd>
            Mollie verarbeitet die Zahlungsdaten als eigener Verantwortlicher,
            unter anderem wegen seiner Pflichten als Finanzinstitut
            (Geldwäsche- und Betrugsprävention). Die Übermittlung an Mollie
            erfolgt nach Art. 6 Abs. 1 lit. b DSGVO zur Abwicklung der
            Mitgliedsbeiträge. Mehr dazu in der Datenschutzerklärung von Mollie
            unter mollie.com/privacy.
          </dd>
        </dl>
      </section>

      {/* ------------------------------------------------------------------
          KEIN DRITTLANDABSCHNITT MEHR
          Bis zum 4. Oktober 2026 lief die Seite bei Vercel (USA) mit einer
          Datenbank bei Neon/Databricks, zuerst in Virginia, dann in Frankfurt.
          Beides ist abgeloest. Anbieter, Rechenzentren, Sicherungskopien und
          Protokollarchive liegen jetzt vollstaendig in Frankreich, und der
          einzige Unterauftragsverarbeiter sitzt ebenfalls dort. Damit gibt es
          nichts mehr zu rechtfertigen — der Abschnitt entfaellt ersatzlos,
          statt mit einer Floskel ueber Standardvertragsklauseln stehen zu
          bleiben, die niemanden mehr betrifft.
          ------------------------------------------------------------------ */}

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
        <h2>Kontaktaufnahme und Probetraining-Anfrage</h2>
        <p>
          Wenn Sie uns schreiben oder anrufen, verarbeiten wir Ihre Angaben, um
          die Anfrage zu beantworten. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO bei Anfragen zu Mitgliedschaft oder Probetraining, sonst Art. 6
          Abs. 1 lit. f DSGVO. Die Nachrichten werden gelöscht, sobald sie nicht
          mehr benötigt werden und keine gesetzlichen Aufbewahrungspflichten
          entgegenstehen.
        </p>
        <p>
          Über &bdquo;Probetraining ausmachen&ldquo; auf der Startseite können
          Sie uns eine Anfrage schicken. Gespeichert werden der Name, die
          angegebene Kontaktmöglichkeit (E-Mail, Telefon oder Instagram-Name),
          der Wunschtag, Ihre Nachricht und der Zeitpunkt. Sehen kann die
          Anfrage nur der Vorstand. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO (Anbahnung der Teilnahme am Training). Die Anfrage wird
          gelöscht, sobald sie erledigt ist, spätestens nach drei Monaten.
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
            <strong>Auskunft</strong> (Art. 15 DSGVO): welche Daten über Sie
            gespeichert sind, woher sie stammen und wer sie erhält.
          </li>
          <li>
            <strong>Berichtigung</strong> (Art. 16 DSGVO): unrichtige Daten
            richtigstellen zu lassen.
          </li>
          <li>
            <strong>Löschung</strong> (Art. 17 DSGVO): Ihre Daten löschen zu
            lassen, soweit keine Aufbewahrungspflicht entgegensteht.
          </li>
          <li>
            <strong>Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO).
          </li>
          <li>
            <strong>Datenübertragbarkeit</strong> (Art. 20 DSGVO): Ihre Daten in
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
          <li>
            Der Hosting-Dienstleister verschlüsselt alle auf der Plattform
            gespeicherten Daten im Ruhezustand und wechselt die Schlüssel
            regelmäßig.
          </li>
          <li>
            Von der Datenbank werden regelmäßig Sicherungskopien angelegt,
            redundant und an mehreren Orten gespeichert und auf
            Wiederherstellbarkeit getestet.
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

      <p className="jjk-legal-stand">Stand: 8. Oktober 2026</p>
    </LegalPage>
  );
}
