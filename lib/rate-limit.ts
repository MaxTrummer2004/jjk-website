import { createHash, createHmac } from "node:crypto";
import { headers } from "next/headers";
import { ensureSchema, sql } from "@/lib/db";

/**
 * Mengenbegrenzung fuer die drei offenen Tueren der Seite: Beitritt,
 * Probetraining, Login (30.10.2026).
 *
 * Warum ueberhaupt: Beitritt und Probetraining verschicken Mails an eine
 * Adresse, die NIEMAND bestaetigt hat. Ohne Grenze ist das ein Mailrelay mit
 * unserem Absender und unserer Brevo-Reputation — jeder kann beliebige
 * Postfaecher mit "Dein Antrag ist angekommen" fluten, und Brevo sperrt am
 * Ende UNS. Beim Login ist es das Raten von Passwoertern.
 *
 * Warum Postgres und nicht eine Map im Speicher: Scalingo kann mehrere
 * Container hochfahren (und startet bei jedem Deploy neu). Ein Zaehler im
 * Prozess waere pro Container und pro Neustart wieder bei null — mit zwei
 * Containern also doppelt so viele Versuche, nach einem Deploy unbegrenzt
 * viele. Die Datenbank teilen alle Container.
 *
 * Verfahren: festes Zeitfenster. Je (bucket, key, Fensterbeginn) eine Zeile,
 * hochgezaehlt mit EINEM `insert ... on conflict do update ... returning` —
 * atomar, auch wenn zwei Anfragen in derselben Millisekunde kommen. Ein
 * gleitendes Fenster waere genauer (am Fensterrand sind kurz bis zu 2x max
 * moeglich), braucht aber eine Zeile pro Versuch. Fuer "kein Massenversand,
 * kein Durchprobieren" reicht das feste.
 *
 * Gespeichert werden NICHT die IP-Adressen und E-Mails selbst, sondern ein
 * HMAC davon (Schluessel AUTH_SECRET). Ohne den Schluessel laesst sich aus
 * der Tabelle nicht zurueckrechnen, wer es war — auch nicht durch Ausprobieren
 * aller vier Milliarden IPv4-Adressen. Zeilen leben hoechstens zwei Tage.
 *
 * Faellt die Abfrage aus, wird DURCHGELASSEN (fail open), mit Logeintrag.
 * Begruendung: Der Zaehler liegt in derselben Datenbank wie die Mitglieder.
 * Ist sie weg, scheitert der Beitritt / Login ohnehin eine Zeile spaeter;
 * ist nur der Zaehler kaputt (etwa ein Fehler in genau dieser Datei), soll
 * das nicht jeden Login der Akademie sperren. Gezielt herbeifuehren kann ein
 * Angreifer so einen Ausfall nicht.
 */

export interface Limit {
  /** Name des Zaehlers, z. B. "login-ip". Steht so in der Tabelle. */
  bucket: string;
  /** So viele Treffer sind im Fenster erlaubt; der naechste ist zu viel. */
  max: number;
  windowSeconds: number;
}

/** Aelteste Zeile, die noch gebraucht wird: das laengste Fenster ist ein Tag. */
const KEEP_HOURS = 48;

function digest(key: string): string {
  const secret = process.env.AUTH_SECRET;
  // Ohne AUTH_SECRET laeuft ohnehin kein Login (lib/auth.ts wirft); fuer
  // Beitritt/Probetraining dann wenigstens ein einfacher Hash statt Klartext.
  const h = secret ? createHmac("sha256", secret) : createHash("sha256");
  return h.update(key).digest("hex").slice(0, 40);
}

let warnedNoIp = false;

/**
 * Die IP des Besuchers, wie sie Scalingos Router meldet.
 *
 * Genommen wird der LETZTE Eintrag von X-Forwarded-For, nicht der erste. Der
 * erste ist, was der Browser selbst mitschickt, falls er den Header setzt —
 * haengt der Router seine Beobachtung nur hinten an (so macht es nginx mit
 * $proxy_add_x_forwarded_for), koennte jeder per gefaelschtem Header jedes
 * Mal eine neue "IP" sein und die Grenze waere wirkungslos. Der letzte
 * Eintrag stammt vom letzten Proxy vor der App, also vom Router; ersetzt der
 * Router den Header ganz, ist erster gleich letzter. Scalingos Dokumentation
 * sagt nur "originating IP address of the client", nicht ob angehaengt oder
 * ersetzt wird — der letzte Eintrag ist in beiden Faellen richtig.
 *
 * Kommt einmal ein CDN VOR Scalingo dazu (Cloudflare o. ae.), ist der letzte
 * Eintrag dessen Knoten und alle Besucher teilen sich einen Zaehler. Dann
 * hier den Header des CDN lesen (z. B. cf-connecting-ip).
 *
 * Next haengt selbst NICHTS an: base-server.js setzt X-Forwarded-For nur,
 * wenn er fehlt (`??=`, auf die Socket-Adresse — lokal also "::1"). Geprueft
 * an next 16.3.5. Fehlt trotzdem jede Angabe, kommt null zurueck: die
 * IP-Grenze entfaellt dann, die je Adresse bleibt.
 * Ein gemeinsamer Ersatzschluessel wuerde stattdessen ALLE Besucher in einen
 * Topf werfen und nach fuenf Antraegen die ganze Seite sperren.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const last = forwarded?.split(",").map((s) => s.trim()).filter(Boolean).pop();
  const ip = last ?? h.get("x-real-ip")?.trim() ?? null;
  if (!ip && !warnedNoIp) {
    warnedNoIp = true;
    console.warn("[rate-limit] keine Client-IP (X-Forwarded-For fehlt) — IP-Grenzen aus");
  }
  return ip || null;
}

/**
 * Zaehlt einen Treffer und sagt, ob er noch erlaubt war.
 * `key` null (keine IP bekannt) zaehlt nichts und erlaubt.
 */
export async function hit(limit: Limit, key: string | null): Promise<boolean> {
  if (!key) return true;
  try {
    await ensureSchema();
    const w = limit.windowSeconds;
    const rows = await sql<{ hits: number }>`
      insert into rate_limits (bucket, key, window_start, hits)
      values (
        ${limit.bucket}, ${digest(key)},
        to_timestamp(floor(extract(epoch from now()) / ${w}::int) * ${w}::int), 1
      )
      on conflict (bucket, key, window_start) do update set hits = rate_limits.hits + 1
      returning hits
    `;
    maybeSweep();
    return (rows[0]?.hits ?? 0) <= limit.max;
  } catch (err) {
    console.error("[rate-limit]", limit.bucket, err);
    return true;
  }
}

/**
 * Nimmt einen Treffer im laufenden Fenster zurueck. Fuer den Login: gezaehlt
 * wird VOR der Passwortpruefung (sonst liefen parallele Anfragen alle am
 * Zaehler vorbei, solange bcrypt rechnet), und ein erfolgreicher Versuch
 * gibt seinen Treffer danach wieder her. Netto zaehlen so nur Fehlversuche.
 */
export async function refund(limit: Limit, key: string | null): Promise<void> {
  if (!key) return;
  try {
    const w = limit.windowSeconds;
    await sql`
      update rate_limits set hits = greatest(hits - 1, 0)
      where bucket = ${limit.bucket} and key = ${digest(key)}
        and window_start = to_timestamp(floor(extract(epoch from now()) / ${w}::int) * ${w}::int)
    `;
  } catch (err) {
    console.error("[rate-limit]", limit.bucket, err);
  }
}

/**
 * Alte Fenster wegraeumen — bei etwa jedem fuenfzigsten Treffer, nicht bei
 * jedem. Ein eigener Zeitplan (Cron) waere noch ein bewegliches Teil mehr;
 * so raeumt der Verkehr hinter sich selbst auf. Nicht abgewartet: der
 * Besucher soll nicht auf das Aufraeumen warten.
 */
function maybeSweep(): void {
  if (Math.random() >= 0.02) return;
  sql`
    delete from rate_limits where window_start < now() - make_interval(hours => ${KEEP_HOURS}::int)
  `.catch((err: unknown) => console.error("[rate-limit] aufraeumen", err));
}
