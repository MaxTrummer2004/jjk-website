import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Scalingo laeuft nicht serverless, sondern als langlebiger Node-Prozess.
  // Mit "standalone" bauet Next einen self-contained Server (.next/standalone/
  // server.js) inkl. der tatsaechlich benutzten node_modules — kein `next
  // start`, kein Mitschleppen des ganzen Projekts auf dem Dyno.
  output: "standalone",
  // Pin the workspace root to this project (multiple lockfiles exist on the machine)
  turbopack: {
    root: projectRoot,
  },
  // React Bits Pro blocks ship as third-party source that doesn't satisfy this
  // project's very strict TS config — don't fail the build on them.
  typescript: { ignoreBuildErrors: true },
  // Disable source maps in production to protect code
  productionBrowserSourceMaps: false,
  // 30.10.2026: kein "X-Powered-By: Next.js" mehr. Schuetzt nichts, verraet
  // aber jedem Scanner gratis, wonach er suchen soll.
  poweredByHeader: false,
  // 30.10.2026: console.log/info/debug fliegen in Produktion raus,
  // console.error und console.warn BLEIBEN. Vorher stand hier `true` fuer
  // Produktion, und das hat auch error/warn gestrichen — auf dem Server, nicht
  // nur im Browser. Ein gescheiterter Mailversand oder ein kaputter
  // Mollie-Webhook hinterliess damit im Scalingo-Log genau nichts. Die
  // Ausnahme gilt fuer Client und Server gleich; die paar Warnungen, die
  // dadurch auch im Browser stehen bleiben, sind der billigere Preis.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  // 30.10.2026: HTTP → HTTPS. Stand heute lieferte http://jjk.academy/ ein
  // 200, ohne Umleitung und ohne HSTS. Scalingo kann das am Router erzwingen
  // ("Force HTTPS") und der Verein schaltet es ein — aber die App soll nicht
  // davon abhaengen, dass jemand diesen Schalter kennt. Scalingo terminiert
  // TLS am Router und sagt per X-Forwarded-Proto, wie die Anfrage ankam.
  //
  // Umgeleitet wird NUR bei X-Forwarded-Proto exakt "http" (`has` vergleicht
  // verankert, "https" trifft nicht). Fehlt der Kopf, gibt es keinen Router
  // davor — lokal, `npm run dev`, curl auf den Standalone-Server —, und eine
  // Umleitung schickte auf ein https://localhost, das es nicht gibt, oder
  // drehte hinter einem Proxy ohne diesen Kopf eine Endlosschleife.
  //
  // Warum hier und NICHT in proxy.ts: Next fuellt einen fehlenden
  // X-Forwarded-Proto selbst mit "http" auf (base-server.js, `??=`), BEVOR
  // der Proxy laeuft. Dort ist "kein Kopf" von "Router sagt http" nicht zu
  // unterscheiden — ausprobiert: curl ohne Kopf auf den Standalone-Server gab
  // 308. Die redirects() hier prueft der Router von Next vorher, an den rohen
  // Koepfen. Billiger ist es obendrein: kein Proxy-Lauf pro Anfrage.
  //
  // Nur im Produktionsbuild (redirects() wird beim Bauen ausgewertet).
  // 308 statt 301: behaelt Methode und Rumpf, ein POST bleibt ein POST. Der
  // Zielhost ist der angefragte (ohne Port), damit auch die
  // *.scalingo.io-Adresse auf sich selbst umleitet. Die Query haengt Next
  // selbst an.
  //
  // /api/ ist ausgenommen: dort rufen Maschinen, keine Browser. Mollie ruft
  // den Webhook mit der URL, die lib/mollie.ts mitschickt (https://…);
  // folgte ein Absender einer Umleitung nicht, waere eine Zahlungsmeldung
  // verloren. Der Webhook traegt nur die Zahlungs-ID, den Status fragt der
  // Server per HTTPS bei Mollie nach — ueber HTTP liegt dort nichts offen.
  async redirects() {
    if (process.env.NODE_ENV !== "production") return [];
    return [
      {
        source: "/:path((?!api/).*)",
        has: [
          { type: "header", key: "x-forwarded-proto", value: "http" },
          { type: "host", value: "(?<host>.+)" },
        ],
        destination: "https://:host/:path",
        statusCode: 308,
      },
    ];
  },
  // 30.10.2026: Sicherheitskoepfe fuer JEDE Antwort, auch public/ und
  // _next/static. Bewusst ohne volle Content-Security-Policy: three.js im
  // Hero, GSAP und die vielen inline gesetzten style-Attribute brauchen
  // 'unsafe-inline'/'unsafe-eval'-Ausnahmen, und eine CSP, die das falsch
  // trifft, zeigt eine schwarze Seite. Das ist ein eigener Schritt mit
  // eigenem Test (zuerst als Content-Security-Policy-Report-Only).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Ein Jahr, inkl. Subdomains, OHNE preload.
          // includeSubDomains ist geprueft (DNS am 30.10.2026): einzige
          // Subdomain mit HTTP ist www, und die hat ein gueltiges Zertifikat
          // (https://www.jjk.academy → 301 auf https://jjk.academy). Die
          // brevo1/brevo2._domainkey-CNAMEs und die MX-Weiterleitung sind
          // reines DNS/SMTP, HSTS gilt nur fuer Browser-HTTP und beruehrt sie
          // nicht. Wer spaeter eine Subdomain ohne TLS anlegt, muss das wissen:
          // Browser, die jjk.academy gesehen haben, oeffnen sie nur per HTTPS.
          // Kein preload: der Eintrag in die Browser-Preload-Listen ist
          // praktisch unumkehrbar (Monate bis zur Entfernung) und bindet jede
          // kuenftige Subdomain. max-age allein laesst sich jederzeit mit
          // max-age=0 zuruecknehmen. Ueber HTTP ausgeliefert ignorieren
          // Browser den Kopf (RFC 6797) — lokal stoert er also nicht.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          // Kein MIME-Raten: eine hochgeladene oder falsch typisierte Datei
          // wird nie als Skript ausgefuehrt.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Fremde Seiten sehen nur die Domain, nie den Pfad — Links wie
          // /konto-einrichten?token=… duerfen nicht im Referer stehen.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Kein Einbetten in fremde iframes (Clickjacking auf Login und
          // Beitrittsformular). Die Seite bettet sich selbst nirgends ein.
          // Kommt spaeter eine CSP, wandert das als frame-ancestors 'self'
          // dorthin.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
