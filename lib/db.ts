import { neon } from "@neondatabase/serverless";

/**
 * Mitglieder-Datenbank (Postgres, ueber die Vercel-Postgres/Neon-Integration
 * des Projekts). `@vercel/postgres` ist mittlerweile deprecated — Vercel
 * verweist selbst auf Neons eigenes SDK, das genau dieselbe
 * Tagged-Template-API bietet, deshalb direkt das hier.
 *
 * WICHTIG (anders als bei @vercel/postgres!): `sql\`...\`` liefert direkt
 * ein Array von Zeilen zurueck, kein `{ rows, rowCount }`-Objekt.
 *
 * Verbindung kommt aus DATABASE_URL (Neons Standardname) oder POSTGRES_URL
 * (falls Vercel die Variable so benennt) — lokal muss dafuer `vercel env
 * pull` gelaufen sein bzw. die Variable in .env.local stehen.
 *
 * `ensureSchema()` legt die Tabellen an, falls sie noch fehlen — einmal pro
 * Server-Prozess ausgefuehrt (nicht bei jedem Request neu), damit das erste
 * Deployment ohne manuelle Migration funktioniert.
 */
type SqlRow = Record<string, unknown>;
type SqlFn = ReturnType<typeof neon>;

let sqlInstance: SqlFn | null = null;

function getConnectionString(): string {
  const url =
    process.env.DATABASE_URL ??
    process.env.POSTGRES_URL ??
    process.env.DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      "Keine Datenbank-Verbindung gefunden (DATABASE_URL bzw. POSTGRES_URL " +
        "fehlt). In Vercel unter Storage eine Postgres-Datenbank anlegen: " +
        "die Env-Var wird dann automatisch gesetzt."
    );
  }
  return url;
}

export function sql<T extends SqlRow = SqlRow>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<T[]> {
  if (!sqlInstance) sqlInstance = neon(getConnectionString());
  return sqlInstance(strings, ...values) as Promise<T[]>;
}

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
