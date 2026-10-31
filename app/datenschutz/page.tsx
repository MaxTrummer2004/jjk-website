/**
 * DATENSCHUTZERKLAERUNG
 *
 * Aufgebaut nach Art. 13 DSGVO. Die inhaltlichen Angaben zur Verarbeitung
 * sind NICHT erfunden, sondern aus dem Code dieses Projekts abgelesen:
 *
 *   lib/db.ts             — das Schema (Stand 31.10.2026), jede Tabelle mit
 *                           Personenbezug:
 *                             members — Beitrittsdaten, Erziehungsberechtigte,
 *                               Einwilligungen, Aufnahmestand, password_hash,
 *                               plan/Ermaessigung, fee_exempt, setup_token,
 *                               mollie_customer_id, mollie_subscription_id
 *                             attendance_votes(member_id, training_date,
 *                               present, created_at)
 *                             payments(member_id, kind, period, amount_cents,
 *                               source, recorded_by, recorded_at, provider_ref)
 *                             payment_issues(member_id, member_name,
 *                               provider_ref, kind, period, amount_cents,
 *                               created_at, resolved_at, resolved_by)
 *                             mollie_checkouts(member_id, payment_id,
 *                               items_key, checkout_url, created_at)
 *                             trial_requests(name, contact, preferred_day,
 *                               message, created_at)
 *                             rate_limits(bucket, key, window_start, hits) —
 *                               key ist HMAC-SHA256 (AUTH_SECRET) von IP,
 *                               E-Mail bzw. Probetraining-Kontakt
 *   lib/rate-limit.ts     — Mengengrenzen fuer Login, Beitritt, Probetraining;
 *                           Zeilen ueber 48 h raeumt ein Aufraeumen bei etwa
 *                           jedem fuenfzigsten Treffer weg (kein Zeitplaner)
 *   lib/mail.ts + alle sendMail-Aufrufe — fuenf Mailarten, siehe Abschnitt
 *                           E-Mail-Versand
 *   lib/auth.ts           — bcrypt mit Kostenfaktor 10; Session als
 *                           HS256-JWT im Cookie `jjk_session`, httpOnly,
 *                           sameSite lax, Pfad /, 90 Tage mit "Angemeldet
 *                           bleiben" (und nach dem Beitritt), sonst
 *                           Sitzungs-Cookie
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
            technisch unvermeidbaren Server-Protokolldaten hinaus,
            außer Sie schicken uns über &bdquo;Probetraining&ldquo;
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

          31.10.2026: Die Anwendung selbst schreibt nur console.error/warn ins
          Log (next.config.ts, removeConsole). Namen und E-Mail-Adressen
          werden dort seit heute nicht mehr ausgegeben (Webhook, Mailfehler).
          Wer ein neues console.error mit Personenbezug einbaut, macht den
          Satz unter "Umfang" falsch.
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
            selbst ausgibt, sowie Verbindungsdaten auf Netzebene. Die
            Anwendung schreibt nur Fehlermeldungen und Warnungen in das
            Protokoll, ohne Namen, E-Mail-Adressen oder Inhalte aus
            Formularen.
          </dd>
        </dl>
        <p>
          Diese Daten werden nicht mit anderen Datenquellen zusammengeführt und
          nicht dazu verwendet, einzelne Besucherinnen und Besucher zu
          identifizieren.
        </p>
      </section>

      {/* ------------------------------------------------------------------
          SCHUTZ VOR MISSBRAUCH (31.10.2026)
          lib/rate-limit.ts, Tabelle rate_limits. Gespeichert wird nur
          HMAC-SHA256(AUTH_SECRET, Wert), auf 40 Hex-Zeichen gekuerzt — ohne
          AUTH_SECRET ein einfacher SHA-256. Pseudonym, nicht anonym: wer den
          Schluessel hat, kann eine bekannte IP nachrechnen. Deshalb hier als
          personenbezogen behandelt.
          Grenzen: login-ip 50 / 15 min, login-email 8 / 15 min, join-ip
          20 / h, trial-ip 10 / h, trial-contact 3 / Tag.
          Geloescht wird nicht auf die Minute: rate-limit.ts raeumt Zeilen
          ueber 48 h bei etwa jedem fuenfzigsten Treffer weg. Ohne Verkehr
          bleiben sie entsprechend laenger — daher "nach etwa zwei Tagen".
          ------------------------------------------------------------------ */}
      <section>
        <h2>Schutz vor Missbrauch</h2>
        <p>
          Anmeldung, Beitrittserklärung und Probetraining-Anfrage sind gegen
          massenhafte Nutzung gesichert: gegen das Durchprobieren von
          Passwörtern und dagegen, dass jemand über die Formulare fremde
          Postfächer mit Mails in unserem Namen füllt. Dafür zählt die Website
          für ein kurzes Zeitfenster, wie oft eine Anfrage von derselben
          IP-Adresse, mit derselben E-Mail-Adresse oder mit derselben
          Kontaktangabe kam.
        </p>
        <dl>
          <dt>Was gespeichert wird</dt>
          <dd>
            Nicht die IP-Adresse oder E-Mail-Adresse selbst, sondern ein daraus
            berechneter Prüfwert (HMAC-SHA256 mit einem geheimen Schlüssel des
            Servers), dazu das Zeitfenster und die Zahl der Versuche. Ohne den
            Schlüssel lässt sich aus dem Prüfwert nicht zurückrechnen, von wem
            die Anfrage kam.
          </dd>

          <dt>Rechtsgrundlage</dt>
          <dd>
            Art. 6 Abs. 1 lit. f DSGVO: berechtigtes Interesse am Schutz der
            Mitgliederkonten und an einem missbrauchsfreien Betrieb der
            Formulare.
          </dd>

          <dt>Speicherdauer</dt>
          <dd>
            Einträge, die älter als zwei Tage sind, werden im laufenden Betrieb
            automatisch gelöscht, also nach etwa zwei Tagen.
          </dd>
        </dl>
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
            payments, payment_issues, mollie_checkouts, attendance_votes).
            Wer dort eine Spalte ergaenzt, muss sie hier nachtragen.
            31.10.2026: setup_token/fee_exempt (Einrichtungslink, Konten fuer
            Trainer) und die beiden Zahlungstabellen vom 30.10. nachgetragen.

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
            <strong>Einrichtungslink</strong>: Legt der Vorstand ein Konto
            selbst an (etwa für Trainer, dann beitragsfrei) oder schickt er
            einen neuen Link zum Festlegen des Passworts, wird dafür ein
            zufälliger Code gespeichert. Er wird gelöscht, sobald das Passwort
            festgelegt ist.
          </li>
          <li>
            <strong>Zahlungsstand</strong>: je bezahltem Posten
            (Einschreibgebühr, Monatsbeitrag, 10er-Block) die Art, der Monat,
            der Betrag, ob er von Hand oder online eingetragen wurde, wann und
            von wem. Es werden keine Kontonummern, Kartendaten oder
            Bankauszüge gespeichert.
          </li>
          <li>
            <strong>Online-Zahlung</strong>: die zuletzt begonnene Zahlung mit
            den bezahlten Posten und dem Link zur Bezahlseite, damit ein
            zweiter Klick keine zweite Zahlung anlegt. Geht online Geld für
            einen Posten ein, der schon bezahlt war, wird das mit Ihrem Namen,
            dem Posten, dem Betrag und der Kennung der Zahlung festgehalten,
            zusammen mit dem Vermerk, wann und von wem es erledigt wurde
            (siehe &bdquo;Online-Zahlung&ldquo; unten).
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
            und sonst nichts, insbesondere nicht Ihren Zahlungsstand und
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

        {/* ----------------------------------------------------------------
            31.10.2026: Es gibt im Code KEINEN Status "ausgetreten" und keine
            Loeschfunktion fuer aufgenommene Mitglieder — /vorstand loescht
            nur abgelehnte Antraege. Die zwoelf Monate sind deshalb eine
            Pflicht des Vereins, die der Vorstand von Hand erfuellt (Scalingo
            -> PostgreSQL-Konsole: delete from members where id = ...). Vorher
            stand hier ein Passiv, das nach Automatik klang.
            Achtung beim Loeschen: payments, attendance_votes und
            mollie_checkouts haengen mit "on delete cascade" am Mitglied und
            verschwinden mit; payment_issues bleibt (member_id wird null, der
            Name steht in member_name). Die sieben Jahre fuer Zahlungen muss
            der Verein also ausserhalb der Website erfuellen (Kontoauszug,
            Mollie, Kassabuch) — oder vor dem Loeschen exportieren.
            ---------------------------------------------------------------- */}
        <h3>Speicherdauer</h3>
        <p>
          Nach dem Austritt aus dem Verein löscht der Vorstand Mitgliedsdaten
          und Anwesenheitseinträge, spätestens zwölf Monate danach, auf Wunsch
          jederzeit früher. Das geschieht von Hand, nicht automatisch. Die
          Frist gibt dem Verein Zeit, offene Beiträge und Ansprüche aus der
          Mitgliedschaft abzuwickeln, und ist nicht länger als dafür nötig.
        </p>
        <p>
          Ausgenommen sind die Aufzeichnungen über Zahlungen, einschließlich
          der Vermerke über doppelt eingegangene Zahlungen: Sie bewahrt der
          Verein so lange auf, wie gesetzliche Aufbewahrungspflichten es
          verlangen, in der Regel sieben Jahre (§ 132 BAO), gerechnet ab dem
          Ende des Kalenderjahres, in dem die letzte Zahlung verbucht wurde.
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

      {/* ------------------------------------------------------------------
          COOKIES — abgeglichen 31.10.2026 mit lib/auth.ts und
          lib/session-cookies.ts. Das JWT traegt memberId, iat, exp und ab
          heute einen session_version-Zaehler (alle Sitzungen eines Kontos
          auf einmal beenden). Darum "technische Angaben zu seiner
          Gueltigkeit" statt einer Aufzaehlung: kein neues personenbezogenes
          Datum, und der Satz bleibt richtig, wenn weitere solche Felder
          dazukommen. Der Beitritt ruft createSession(id, true) — also
          immer 90 Tage, ohne Haekchen.
          ------------------------------------------------------------------ */}
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
            interne Mitglieds-Nummer und technische Angaben zu seiner
            Gültigkeit enthält, weder Ihr Passwort noch Ihren Namen. Es hält
            Sie angemeldet.
            Eigenschaften: <code>httpOnly</code> (für JavaScript im Browser
            nicht lesbar), <code>sameSite=lax</code> (wird nicht an fremde
            Seiten mitgeschickt), im Betrieb zusätzlich <code>secure</code>
            (nur über HTTPS). Laufzeit: 90 Tage, wenn Sie beim Anmelden
            &bdquo;Angemeldet bleiben&ldquo; angehakt lassen, sonst nur bis zum
            Schließen des Browsers. Nach dem Absenden der Beitrittserklärung
            sind Sie automatisch für 90 Tage angemeldet. Beim Abmelden wird es
            sofort gelöscht.
          </dd>

          <dt>
            <code>jjk_member</code>
          </dt>
          <dd>
            Enthält nur den Wert <code>1</code> und damit die einzige Auskunft,
            dass in diesem Browser jemand angemeldet ist: keine Nummer,
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
            Alle drei sind für ausdrücklich gewünschte Funktionen
            (Anmelden und Bedienen des Mitgliederbereichs) unbedingt
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
          weitergegeben. Zum Betrieb der Website sind zwei Dienstleister
          eingebunden, die als Auftragsverarbeiter nach Art. 28 DSGVO tätig
          werden: Scalingo für Hosting und Datenbank, Brevo für den
          E-Mail-Versand. Für Online-Zahlungen kommt Mollie dazu, das die
          Zahlungsdaten als eigener Verantwortlicher verarbeitet (siehe
          unten).
        </p>

        <h3>Hosting und Datenbank</h3>
        <dl>
          <dt>Anbieter</dt>
          <dd>
            Scalingo SAS, 13 rue Jacques Peirotes, 67000 Strasbourg,
            Frankreich. Datenschutzbeauftragter: dpo@scalingo.com
          </dd>

          <dt>Verarbeitet</dt>
          <dd>
            Den gesamten Betrieb: Auslieferung der Website, Server-Protokolle
            und die Datenbank. Darin liegen Mitglieder und Anträge
            (<code>members</code>), Anwesenheiten
            (<code>attendance_votes</code>), bezahlte Posten
            (<code>payments</code>), doppelt eingegangene Zahlungen
            (<code>payment_issues</code>), die zuletzt begonnene Online-Zahlung
            je Mitglied (<code>mollie_checkouts</code>),
            Probetraining-Anfragen (<code>trial_requests</code>) und die
            Prüfwerte des Missbrauchsschutzes (<code>rate_limits</code>).
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
            Vertrag vermerkt dazu ausdrücklich &bdquo;N/A (no transfer)&ldquo;:
            Es findet keine Übermittlung außerhalb der EU statt. Eine
            geplante Änderung muss Scalingo ankündigen; der Verein kann ihr
            binnen acht Kalendertagen widersprechen.
          </dd>
        </dl>

        {/* ----------------------------------------------------------------
            BREVO — nur aktiv, wenn BREVO_API_KEY gesetzt ist (lib/mail.ts).
            Anschrift vor dem Live-Schalten aus brevo.com/legal pruefen.

            31.10.2026: die Liste unten ist jeder sendMail-Aufruf im Code:
              app/beitreten/actions.ts       Bestaetigung + Vorstand (replyTo
                                             Antragsteller)
              app/vorstand/actions.ts        Aufnahme (admissionMail), an das
                                             Mitglied und bei Minderjaehrigen
                                             an guardian_email, falls da
              components/trial/actions.ts    Bestaetigung nur bei E-Mail als
                                             Kontakt + Vorstand
              app/api/mollie/webhook         Doppelzahlung an den Vorstand
                                             (duplicatePaymentMail)
            An Brevo geht: to, replyTo, subject, textContent — kein eigenes
            Namensfeld, der Name steht nur im Text. Wer einen weiteren
            sendMail-Aufruf einbaut, traegt ihn hier ein.
            ---------------------------------------------------------------- */}
        <h3>E-Mail-Versand</h3>
        <p>
          Über Brevo (Sendinblue SAS, Paris, Frankreich) verschickt die
          Website als Auftragsverarbeiter nach Art. 28 DSGVO diese Nachrichten:
        </p>
        <ul>
          <li>
            <strong>Beitrittsantrag</strong>: eine Eingangsbestätigung an Sie
            mit Ihrem Vornamen und der gewählten Mitgliedschaft, und eine
            Benachrichtigung an den Vorstand mit Ihrem Namen, der gewählten
            Mitgliedschaft und gegebenenfalls dem Vermerk, dass Sie unter 18
            sind. Antwortet der Vorstand darauf, geht die Antwort an Ihre
            E-Mail-Adresse.
          </li>
          <li>
            <strong>Aufnahme</strong>: eine Willkommensmail an Sie mit der
            gewählten Mitgliedschaft, den zu zahlenden Beträgen und der
            Bankverbindung des Vereins. Bei Minderjährigen geht sie zusätzlich
            an die E-Mail-Adresse des Erziehungsberechtigten, falls diese
            angegeben wurde.
          </li>
          <li>
            <strong>Probetraining-Anfrage</strong>: eine Eingangsbestätigung an
            Sie, wenn Sie als Kontakt eine E-Mail-Adresse angegeben haben, und
            eine Benachrichtigung an den Vorstand mit Name, Kontaktangabe,
            Wunschtag und Nachricht.
          </li>
          <li>
            <strong>Doppelt eingegangene Zahlung</strong>: eine
            Benachrichtigung an den Vorstand mit Ihrem Namen, den betroffenen
            Posten, den Beträgen und der Kennung der Zahlung bei Mollie, damit
            er den Betrag zurückerstatten oder mit Ihnen klären kann.
          </li>
        </ul>
        <p>
          Übermittelt werden dafür nur die Empfängeradressen, gegebenenfalls
          eine Adresse für Antworten, sowie Betreff und Text der Nachricht.
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO: Die Nachrichten
          dienen der Abwicklung von Anfrage, Antrag, Mitgliedschaft und
          Beiträgen.
        </p>

        {/* ----------------------------------------------------------------
            MOLLIE
            Rolle laut mollie.com/legal/privacy: "For all activities and
            purposes mentioned in this Privacy Statement, Mollie acts as the
            controller" — darunter "To process payments". Deshalb hier als
            eigener Verantwortlicher und NICHT als Auftragsverarbeiter.
            Anschrift aus dem DPA (mollie.com/legal/data-processing-agreement).
            Was die Website selbst speichert: lib/db.ts, Spalten
            mollie_customer_id, mollie_subscription_id, payments.provider_ref,
            dazu seit 30.10.2026 mollie_checkouts (payment_id, items_key,
            checkout_url) und payment_issues.
            An Mollie geht (app/mitglieder/pay-actions.ts): Kunde mit name,
            email, metadata.memberId; Zahlung mit Betrag, Beschreibung
            "JJK <Posten> - <Name>", metadata memberId + Posten. Die
            Mitglieds-Nummer steht deshalb (31.10.2026) mit im Text.
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
            tippen: Ihr Name, Ihre E-Mail-Adresse, Ihre interne
            Mitglieds-Nummer, der Betrag und wofür bezahlt wird. Ihre Bankdaten geben Sie direkt bei Mollie bzw. Ihrer
            Bank ein, nicht auf dieser Website. Online bezahlt werden nur
            Einschreibgebühr und 10er-Block; Monatsbeiträge laufen per
            Dauerauftrag direkt auf das Vereinskonto, ohne Mollie. Auf dem
            Kontoauszug des Vereins erscheinen dabei Ihr Name und Ihre IBAN.
          </dd>

          <dt>Was der Verein davon sieht</dt>
          <dd>
            Auf der Website wird nur gespeichert, welche Posten bezahlt sind,
            sowie die Kennungen, die Mollie für Sie und Ihre Zahlungen
            vergibt, und der Link zur zuletzt begonnenen Zahlung. Geht für
            einen schon bezahlten Posten noch einmal Geld ein, hält die
            Website das fest und benachrichtigt den Vorstand per E-Mail. Im
            Konto des Vereins bei Mollie sind zusätzlich die Angaben zur
            jeweiligen Zahlung einsehbar.
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

          PROBETRAINING, Loeschung (geprueft 31.10.2026): "erledigt" =
          Knopf unter /vorstand (deleteTrialRequestAction). Die drei Monate
          setzt kein Zeitplaner durch, sondern ein delete beim Aufruf von
          /vorstand und (ab 31.10.2026) bei jeder neuen Anfrage. Der Text
          verspricht keinen taeglichen Lauf und bleibt deshalb so. Die
          Benachrichtigungsmail an BOARD_EMAILS liegt aber im Postfach des
          Vorstands und faellt NICHT unter diese Loeschung. Offen: das muss
          der Verein selbst regeln (Mails mitloeschen) oder hier nennen.
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
          Über die Seite &bdquo;Probetraining&ldquo; können
          Sie uns eine Anfrage schicken. Gespeichert werden der Name, die
          angegebene Kontaktmöglichkeit (E-Mail, Telefon oder Instagram-Name),
          der Wunschtag, Ihre Nachricht und der Zeitpunkt. Sehen kann die
          Anfrage nur der Vorstand. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b
          DSGVO (Anbahnung der Teilnahme am Training). Die Anfrage wird
          gelöscht, sobald sie erledigt ist, spätestens nach drei Monaten.
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
        <h2>Übermittlung in Länder außerhalb der EU</h2>
        <p>
          Website, Datenbank, E-Mail-Versand und Online-Zahlung laufen
          ausschließlich bei Anbietern mit Sitz und Servern in der EU (siehe
          oben). Dabei verlassen Ihre Daten die EU nicht.
        </p>
        <p>
          Anders ist es bei den Diensten der Meta-Gruppe, die der Verein für
          seinen Auftritt und die Kommunikation nutzt: Instagram und WhatsApp
          (siehe die beiden folgenden Abschnitte). Meta kann Daten in die USA
          übermitteln. Grundlage ist der Angemessenheitsbeschluss der
          EU-Kommission zum EU-US Data Privacy Framework vom 10. Juli 2023
          (Art. 45 DSGVO); die Meta Platforms, Inc. ist danach zertifiziert. Die
          Liste der zertifizierten Unternehmen führt das US-Handelsministerium
          unter dataprivacyframework.gov.
        </p>
      </section>

      <section>
        <h2>Präsenz auf Instagram</h2>
        <p>
          Der Verein betreibt ein Profil auf Instagram
          (instagram.com/jiu.jitsu.kaisen_). Anbieter ist die Meta Platforms
          Ireland Limited, Merrion Road, Dublin 4, D04 X2K5, Irland
          (&bdquo;Meta&ldquo;). Wenn Sie das Profil besuchen, ihm folgen oder
          mit Beiträgen interagieren, verarbeitet Meta Ihre Daten nach eigenen
          Regeln, etwa um Nutzungsstatistiken zu erstellen oder Werbung
          anzuzeigen. Das geschieht auch dann, wenn Sie kein Instagram-Konto
          haben oder nicht eingeloggt sind.
        </p>
        <p>
          Für die Statistiken, die Meta dem Verein über das Profil bereitstellt
          (&bdquo;Insights&ldquo;), sind der Verein und Meta gemeinsam
          verantwortlich (Art. 26 DSGVO). Meta hat dazu eine Vereinbarung
          vorgegeben und übernimmt darin die Hauptverantwortung, auch für die
          Erfüllung Ihrer Rechte. Der Verein sieht nur zusammengefasste Zahlen,
          keine Daten einzelner Personen. Rechtsgrundlage ist unser berechtigtes
          Interesse an einer Darstellung des Vereins dort, wo viele
          Interessierte unterwegs sind (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
        <p>
          Meta kann Daten auch in die USA übermitteln. Die Meta Platforms, Inc.
          ist nach dem EU-US Data Privacy Framework zertifiziert; für die USA
          besteht damit ein Angemessenheitsbeschluss der EU-Kommission
          (Art. 45 DSGVO). Näheres in der Datenschutzrichtlinie von Instagram:{" "}
          <a href="https://privacycenter.instagram.com/policy" target="_blank" rel="noopener noreferrer">
            privacycenter.instagram.com/policy
          </a>
          . Ihre Rechte können Sie sowohl gegenüber Meta als auch gegenüber dem
          Verein geltend machen; Anfragen, die nur Meta erfüllen kann, leiten
          wir weiter.
        </p>
        <p>
          Schreiben Sie uns auf Instagram eine Nachricht, verwenden wir Ihren
          Profilnamen und die Nachricht nur, um zu antworten.
        </p>
      </section>

      <section>
        <h2>WhatsApp-Gruppen des Vereins</h2>
        <p>
          Für Absprachen zum Training gibt es vereinsinterne WhatsApp-Gruppen.
          Aufgenommen wird nur, wer in der Beitrittserklärung eingewilligt hat
          (Art. 6 Abs. 1 lit. a DSGVO). Die Teilnahme ist freiwillig und keine
          Voraussetzung für die Mitgliedschaft.
        </p>
        <p>
          In der Gruppe sehen die anderen Mitglieder Ihre Telefonnummer, Ihren
          WhatsApp-Namen und Ihr Profilbild, je nach Ihren Einstellungen.
          Anbieter ist die WhatsApp Ireland Limited, Merrion Road, Dublin 4,
          D04 X2K5, Irland, ein Unternehmen der Meta-Gruppe. WhatsApp
          verschlüsselt Nachrichten Ende-zu-Ende, verarbeitet aber
          Verbindungs- und Nutzungsdaten (etwa wer wann mit wem kommuniziert)
          und kann diese in die USA übermitteln. Die Meta Platforms, Inc. ist
          nach dem EU-US Data Privacy Framework zertifiziert (Art. 45 DSGVO).
          Für die Verarbeitung durch WhatsApp selbst gilt dessen
          Datenschutzrichtlinie:{" "}
          <a href="https://www.whatsapp.com/legal/privacy-policy-eea" target="_blank" rel="noopener noreferrer">
            whatsapp.com/legal/privacy-policy-eea
          </a>
          .
        </p>
        <p>
          Sie können die Einwilligung jederzeit widerrufen: Verlassen Sie die
          Gruppe oder sagen Sie dem Vorstand Bescheid, dann nehmen wir Sie heraus
          und vermerken den Widerruf. Was bis dahin in der Gruppe geschrieben
          wurde, bleibt auf den Geräten der anderen Mitglieder; darauf hat der
          Verein keinen Zugriff.
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

        <p>
          Neben der DSGVO gilt in Österreich das Datenschutzgesetz (DSG). Es
          ergänzt die DSGVO unter anderem beim Auskunfts-, Berichtigungs- und
          Löschungsrecht.
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
            Fehlgeschlagene Anmeldeversuche, Beitrittserklärungen und
            Probetraining-Anfragen sind in ihrer Zahl begrenzt (siehe
            &bdquo;Schutz vor Missbrauch&ldquo;).
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
        <p>
          Für Ihr Konto sind Sie mitverantwortlich: Wählen Sie ein eigenes,
          nicht anderswo verwendetes Passwort, geben Sie es nicht weiter und
          melden Sie sich an fremden Geräten wieder ab. Wenn Sie vermuten, dass
          jemand Ihr Passwort kennt, ändern Sie es im Mitgliederbereich oder
          sagen Sie dem Vorstand Bescheid.
        </p>
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

      <p className="jjk-legal-stand">Stand: 31. Oktober 2026</p>
    </LegalPage>
  );
}
