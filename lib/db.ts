import { Pool } from "pg";

/**
 * Mitglieder-Datenbank (Postgres auf Scalingo).
 *
 * Vorher lief das ueber `@neondatabase/serverless`. Der Treiber spricht mit
 * Neon ueber HTTPS und funktioniert gegen einen normalen Postgres NICHT — mit
 * dem Umzug zu Scalingo ist er deshalb raus und durch `pg` ersetzt.
 *
 * Die exportierte Schnittstelle ist bewusst identisch geblieben, damit kein
 * Aufrufer sich aendern muss:
 *   - `sql\`...\`` ist ein Tagged Template und liefert DIREKT ein Array von
 *     Zeilen zurueck (kein `{ rows, rowCount }`-Objekt) — genau wie bei Neon.
 *   - `sql.query(text)` fuehrt reines DDL/SQL ohne Parameter aus und liefert
 *     ebenfalls die Zeilen als Array.
 *
 * EIN Pool, modulweit — nicht pro Anfrage einen neuen. `pg` verwaltet darin
 * mehrere Verbindungen und reicht sie an die Requests weiter; ein Pool pro
 * Request wuerde bei jedem Aufruf einen TCP+TLS-Handshake zahlen und die
 * Verbindungen der DB in Minuten aufbrauchen.
 *
 * Verbindung aus SCALINGO_POSTGRESQL_URL (so heisst die Variable, die Scalingo
 * dem Dyno automatisch setzt), hilfsweise DATABASE_URL.
 *
 * `ensureSchema()` legt die Tabellen an, falls sie noch fehlen — einmal pro
 * Server-Prozess ausgefuehrt (nicht bei jedem Request neu), damit das erste
 * Deployment ohne manuelle Migration funktioniert.
 */
type SqlRow = Record<string, unknown>;

interface Sql {
  <T extends SqlRow = SqlRow>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T extends SqlRow = SqlRow>(text: string): Promise<T[]>;
}

let pool: Pool | null = null;

function getConnectionString(): string {
  const url =
    process.env.SCALINGO_POSTGRESQL_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "Keine Datenbank-Verbindung gefunden (SCALINGO_POSTGRESQL_URL bzw. " +
        "DATABASE_URL fehlt). Auf Scalingo setzt das PostgreSQL-Addon " +
        "SCALINGO_POSTGRESQL_URL automatisch; lokal die Variable in " +
        ".env.local eintragen."
    );
  }
  return url;
}

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: getConnectionString(),
      // TLS erzwingen, Zertifikatskette nicht pruefen.
      //
      // Das ist eine Abwaegung und keine Empfehlung von Scalingo: deren
      // Dokumentation schweigt zur Zertifikatspruefung voellig — sie nennt
      // weder eine CA zum Herunterladen noch `sslmode=verify-full`, und die
      // Verbindungszeichenfolge, die sie ausgeben, traegt `sslmode=prefer`.
      //
      // `prefer` ist das Schlechteste von beidem: es versucht TLS, faellt
      // aber stillschweigend auf eine UNVERSCHLUESSELTE Verbindung zurueck,
      // wenn der Server nicht mitspielt, und prueft das Zertifikat ohnehin
      // nicht. Diese Einstellung hier ist strenger: ohne TLS keine
      // Verbindung. Was fehlt, ist die Pruefung, wer am anderen Ende sitzt.
      //
      // Solange App und Datenbank im selben Scalingo-Netz liegen, ist das
      // vertretbar. Wer es besser machen will, holt sich die Zertifikatskette
      // des Servers (openssl s_client -starttls postgres) und haengt sie hier
      // als `ca` ein — dann verifiziert Node wieder. Dazu gehoert, im
      // Dashboard unter Settings "Force TLS connections" einzuschalten; sonst
      // erlaubt die Datenbank weiterhin Klartextverbindungen von anderswo.
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

// Tagged-Template-Werte -> parametrisierte Query ($1, $2, ...). So landen die
// Werte als gebundene Parameter beim Treiber, nie im Query-Text — dieselbe
// SQL-Injection-Sicherheit, die Neons Tagged Template bot.
function buildQuery(
  strings: TemplateStringsArray,
  values: unknown[]
): { text: string; params: unknown[] } {
  let text = strings[0] ?? "";
  for (let i = 0; i < values.length; i++) {
    text += `$${i + 1}` + (strings[i + 1] ?? "");
  }
  return { text, params: values };
}

const sqlFn = async <T extends SqlRow = SqlRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> => {
  const { text, params } = buildQuery(strings, values);
  const result = await getPool().query(text, params);
  return result.rows as T[];
};

export const sql: Sql = Object.assign(sqlFn, {
  async query<T extends SqlRow = SqlRow>(text: string): Promise<T[]> {
    const result = await getPool().query(text);
    return result.rows as T[];
  },
});

let schemaReady: Promise<void> | null = null;

async function createSchema(): Promise<void> {
  await sql`
    create table if not exists members (
      id serial primary key,
      name text not null,
      username text not null unique,
      password_hash text not null,
      joined_at date not null default current_date
    );
  `;

  // ── Beitrittserklaerung (seit Oktober 2026) ─────────────────────────────
  // Nur Erweiterungen: jede Spalte nullable oder mit Vorgabe, damit
  // bestehende Zeilen gueltig bleiben. `username` verliert sein NOT NULL —
  // eingeloggt wird jetzt per E-Mail, der Benutzername bleibt nur fuer
  // Altkonten stehen.
  //
  // `status` ist der Aufnahmestand nach § 5 Abs. 2 der Statuten (der Vorstand
  // entscheidet). Altkonten von vor der Beitrittserklaerung gelten als
  // aufgenommen, sonst saehen sie ihren eigenen Bereich nicht mehr.
  await sql.query(`
    alter table members alter column username drop not null;
    alter table members add column if not exists email text;
    alter table members add column if not exists first_name text;
    alter table members add column if not exists last_name text;
    alter table members add column if not exists address text;
    alter table members add column if not exists birth_date date;
    alter table members add column if not exists phone text;
    alter table members add column if not exists guardian_first_name text;
    alter table members add column if not exists guardian_last_name text;
    alter table members add column if not exists guardian_phone text;
    alter table members add column if not exists guardian_email text;
    alter table members add column if not exists plan text;
    alter table members add column if not exists reduced_requested boolean not null default false;
    alter table members add column if not exists reduced_verified boolean not null default false;
    alter table members add column if not exists guardian_consent_received boolean not null default false;
    alter table members add column if not exists consent_photos boolean not null default false;
    alter table members add column if not exists consent_whatsapp boolean not null default false;
    alter table members add column if not exists terms_accepted_at timestamptz;
    alter table members add column if not exists status text not null default 'active';
    alter table members add column if not exists applied_at timestamptz;
    alter table members add column if not exists decided_at timestamptz;
    alter table members add column if not exists decided_by integer;
    create unique index if not exists members_email_key on members (email);
    alter table members add column if not exists mollie_customer_id text;
    alter table members add column if not exists mollie_subscription_id text;
    alter table members add column if not exists fee_exempt boolean not null default false;
    alter table members add column if not exists setup_token text;
    alter table members add column if not exists session_version integer not null default 0;
    alter table members add column if not exists setup_token_hash text;
    alter table members add column if not exists setup_token_expires_at timestamptz;
  `);

  // Einrichtungslinks (31.10.2026): gespeichert wird nur noch der SHA-256 des
  // Tokens (setup_token_hash), mit Ablauf nach 72 Stunden. Vorher stand der
  // Token im Klartext in `setup_token` und galt unbegrenzt — wer die Tabelle
  // lesen konnte (Backup, Dump, Dashboard), konnte jedes offene Konto
  // uebernehmen. SHA-256 ohne Salz genuegt hier, anders als bei Passwoertern:
  // der Token hat 192 Bit Zufall, da gibt es nichts durchzuprobieren.
  //
  // Bestehende Klartext-Tokens werden hier einmal umgeschrieben statt beim
  // Einloesen beide Formen anzunehmen. Sonst laege der Klartext weiter in der
  // Datenbank, bis jemand den Link benutzt — also womoeglich nie. Eine eigene
  // Spalte statt Umschreiben an Ort und Stelle, weil sich Klartext und Hash
  // sonst nicht sicher unterscheiden lassen (ein per SQL gesetzter Token kann
  // selbst wie ein 64-stelliger Hash aussehen). Wiederholbar: danach ist
  // `setup_token` leer, ein zweiter Lauf (oder ein zweiter Container
  // gleichzeitig) findet nichts mehr. Offene Altlinks bekommen ihre 72
  // Stunden ab diesem Deploy.
  await sql.query(`
    update members
    set setup_token_hash = encode(sha256(convert_to(setup_token, 'UTF8')), 'hex'),
        setup_token_expires_at = coalesce(setup_token_expires_at, now() + interval '72 hours'),
        setup_token = null
    where setup_token is not null;
  `);

  // Eine Zeile je bezahltem Posten. Heute setzt sie der Kassier per Haekchen
  // (source = 'manual'), spaeter schreibt die Online-Zahlung dieselbe Zeile
  // mit source = 'online' — der Statusblock unterscheidet das nicht.
  //
  // `period` ist der Monatserste fuer Monatsbeitraege und NULL fuer die
  // Einschreibgebuehr und den 10er-Block. Der Unique-Index arbeitet mit
  // coalesce, weil Postgres zwei NULLs nicht als gleich ansieht und sonst
  // dieselbe Einschreibgebuehr zweimal eingetragen werden koennte.
  await sql.query(`
    create table if not exists payments (
      id serial primary key,
      member_id integer not null references members(id) on delete cascade,
      kind text not null check (kind in ('month', 'enrollment', 'block')),
      period date,
      amount_cents integer not null,
      source text not null default 'manual' check (source in ('manual', 'online')),
      recorded_by integer references members(id) on delete set null,
      recorded_at timestamptz not null default now()
    );
    create unique index if not exists payments_once
      on payments (member_id, kind, coalesce(period, date '1900-01-01'));
    -- Mollie-Zahlungs-ID: der Webhook kann mehrfach kommen (Mollie wiederholt
    -- bis zu zehnmal), eingetragen wird trotzdem nur einmal.
    alter table payments add column if not exists provider_ref text;
    create unique index if not exists payments_provider_ref
      on payments (provider_ref) where provider_ref is not null;
  `);

  // Probetraining-Anfragen aus dem Fenster auf der Startseite. Kein Konto,
  // kein Login — nur, was jemand von sich aus hineinschreibt. Der Vorstand
  // sieht sie unter /vorstand; erledigte und alle ueber drei Monate alten
  // werden geloescht (siehe app/vorstand/page.tsx und Datenschutzerklaerung).
  await sql`
    create table if not exists trial_requests (
      id serial primary key,
      name text not null,
      contact text not null,
      preferred_day text,
      message text,
      created_at timestamptz not null default now()
    );
  `;

  await sql`
    create table if not exists attendance_votes (
      id serial primary key,
      member_id integer not null references members(id) on delete cascade,
      training_date date not null,
      present boolean not null,
      created_at timestamptz not null default now(),
      unique (member_id, training_date)
    );
  `;

  // Zaehler fuer lib/rate-limit.ts (30.10.2026): Beitritt, Probetraining und
  // Login, je Fenster eine Zeile. `key` ist ein HMAC der IP bzw. Adresse,
  // nie die Adresse selbst. Zeilen ueber zwei Tage raeumt rate-limit.ts weg.
  await sql`
    create table if not exists rate_limits (
      bucket text not null,
      key text not null,
      window_start timestamptz not null,
      hits integer not null default 0,
      primary key (bucket, key, window_start)
    );
  `;

  // Die zuletzt angelegte Mollie-Zahlung je Mitglied (30.10.2026). Ohne sie
  // erzeugten Doppelklick oder zwei Tabs zwei Zahlungen ueber dieselben
  // Posten; wurden beide bezahlt, verschluckte der Webhook die zweite. Jetzt
  // fuehrt der Knopf zurueck in den Checkout, solange die Zahlung offen ist
  // (app/mitglieder/pay-actions.ts). Eine Zeile pro Mitglied, wird ueber-
  // schrieben. `payment_id` ist waehrend des Anlegens 'creating:<zufall>' —
  // das ist die Sperre gegen den gleichzeitigen zweiten Klick.
  await sql`
    create table if not exists mollie_checkouts (
      member_id integer primary key references members(id) on delete cascade,
      payment_id text not null,
      items_key text not null,
      checkout_url text,
      created_at timestamptz not null default now()
    );
  `;

  // Online eingegangen, aber schon bezahlt (30.10.2026): Geld da, Posten war
  // schon eingetragen — von Hand abgehakt oder eine zweite Mollie-Zahlung.
  // Vorher verschwand das still im `on conflict do nothing` des Webhooks.
  // Der Vorstand sieht die Zeile unter /vorstand und erstattet in Mollie
  // zurueck. `provider_ref` eindeutig, damit Mollies Wiederholungen weder
  // eine zweite Zeile noch eine zweite Mail erzeugen.
  await sql`
    create table if not exists payment_issues (
      id serial primary key,
      member_id integer references members(id) on delete set null,
      member_name text not null,
      provider_ref text not null unique,
      kind text not null,
      period date,
      amount_cents integer not null,
      created_at timestamptz not null default now(),
      resolved_at timestamptz,
      resolved_by integer references members(id) on delete set null
    );
  `;
}

export function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    schemaReady = createSchema().catch((err) => {
      // Beim naechsten Aufruf noch einmal versuchen statt den Fehler fuer
      // immer zu cachen (z. B. wenn die DB beim allerersten Request kurz
      // noch nicht erreichbar war).
      schemaReady = null;
      throw err;
    });
  }
  return schemaReady;
}
