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
      // Scalingos Postgres erzwingt TLS, praesentiert aber ein Zertifikat aus
      // einer internen CA, die nicht im Trust-Store von Node liegt. Mit der
      // Standard-Pruefung wuerde `pg` hier mit SELF_SIGNED_CERT_IN_CHAIN
      // abbrechen. Darum: TLS verschluesselt die Verbindung weiterhin, nur die
      // Kette wird nicht gegen die System-CAs verifiziert. Das ist die von
      // Scalingo dokumentierte Einstellung fuer ihren Postgres.
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
