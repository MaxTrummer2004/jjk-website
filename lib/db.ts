import { sql } from "@vercel/postgres";

/**
 * Mitglieder-Datenbank (Postgres, ueber die Vercel-Postgres/Neon-Integration
 * des Projekts). `sql` liest die Verbindung automatisch aus den von Vercel
 * gesetzten Env-Vars (POSTGRES_URL etc.) — lokal muss dafuer `vercel env
 * pull` gelaufen sein bzw. die Variablen in .env.local stehen.
 *
 * `ensureSchema()` legt die Tabellen an, falls sie noch fehlen — einmal pro
 * Server-Prozess ausgefuehrt (nicht bei jedem Request neu), damit das erste
 * Deployment ohne manuelle Migration funktioniert.
 */
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

export { sql };
