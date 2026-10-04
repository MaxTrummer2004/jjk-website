/**
 * Kopiert die Mitgliederdatenbank von einem Neon-Projekt in ein anderes.
 *
 * Gebaut fuer genau einen Zweck: die Datenbank lag in us-east-1 (Virginia)
 * und gehoert nach eu-central-1 (Frankfurt). Ein Neon-Projekt kann seine
 * Region nicht wechseln, also ist der Weg immer: neues Projekt in der
 * richtigen Region anlegen, Daten hinueberkopieren, Verbindungszeichenfolge
 * austauschen, altes Projekt loeschen.
 *
 *     OLD_DATABASE_URL="postgres://…us-east-1…" \
 *     NEW_DATABASE_URL="postgres://…eu-central-1…" \
 *     node scripts/migrate-db.mjs
 *
 * Ohne pg_dump, weil hier zwei Tabellen mit ein paar Zeilen stehen und der
 * Neon-Treiber ueber HTTPS laeuft — damit braucht es keinen Postgres-Client
 * auf dem Rechner und keinen offenen Port 5432.
 *
 * ── Was das Skript NICHT tut ────────────────────────────────────────────────
 * Es loescht nichts, weder drueben noch hier. Das alte Projekt bleibt stehen,
 * bis jemand im Neon-Dashboard nachgesehen hat, dass die neue Datenbank
 * wirklich traegt. Und es legt die Tabellen im Ziel nicht an: das macht
 * ensureSchema() aus lib/db.ts beim ersten Aufruf der Anwendung von selbst,
 * und zwei Stellen, die dasselbe Schema beschreiben, laufen auseinander.
 * Also: einmal die Mitgliederseite der neuen Datenbank aufrufen, dann das
 * Skript.
 *
 * ── Die Reihenfolge ist nicht beliebig ──────────────────────────────────────
 * Erst members, dann attendance_votes: der Fremdschluessel member_id zeigt auf
 * members(id). Und die IDs werden MITKOPIERT statt neu vergeben, sonst zeigen
 * die Anwesenheiten auf fremde Leute. Danach muessen die Sequenzen nachgezogen
 * werden — eine serial-Spalte, in die man IDs von Hand einfuegt, zaehlt sonst
 * weiter bei 1 und kollidiert beim naechsten echten Eintrag.
 */

import { neon } from "@neondatabase/serverless";

const oldUrl = process.env.OLD_DATABASE_URL;
const newUrl = process.env.NEW_DATABASE_URL;

if (!oldUrl || !newUrl) {
  console.error("OLD_DATABASE_URL und NEW_DATABASE_URL muessen gesetzt sein.");
  process.exit(1);
}
if (oldUrl === newUrl) {
  console.error("Quelle und Ziel sind dieselbe Datenbank. Abbruch.");
  process.exit(1);
}

const from = neon(oldUrl);
const to = neon(newUrl);

const members = await from`
  select id, name, username, password_hash, joined_at from members order by id
`;
const votes = await from`
  select id, member_id, training_date, present, created_at
  from attendance_votes order by id
`;
console.log(`Quelle: ${members.length} Mitglieder, ${votes.length} Anwesenheiten`);

const zielLeer = await to`select count(*)::int as n from members`;
if (zielLeer[0].n > 0) {
  console.error(
    `Im Ziel stehen bereits ${zielLeer[0].n} Mitglieder. Abbruch: dieses ` +
      "Skript ist fuer einen leeren Zielzustand gebaut und wuerde sonst " +
      "doppelte Eintraege anlegen."
  );
  process.exit(1);
}

for (const m of members) {
  await to`
    insert into members (id, name, username, password_hash, joined_at)
    values (${m.id}, ${m.name}, ${m.username}, ${m.password_hash}, ${m.joined_at})
  `;
}
for (const v of votes) {
  await to`
    insert into attendance_votes (id, member_id, training_date, present, created_at)
    values (${v.id}, ${v.member_id}, ${v.training_date}, ${v.present}, ${v.created_at})
  `;
}

// Sequenzen nachziehen, siehe Kopfkommentar.
await to`select setval(pg_get_serial_sequence('members', 'id'), coalesce((select max(id) from members), 1))`;
await to`select setval(pg_get_serial_sequence('attendance_votes', 'id'), coalesce((select max(id) from attendance_votes), 1))`;

const n1 = await to`select count(*)::int as n from members`;
const n2 = await to`select count(*)::int as n from attendance_votes`;
console.log(`Ziel: ${n1[0].n} Mitglieder, ${n2[0].n} Anwesenheiten`);
if (n1[0].n !== members.length || n2[0].n !== votes.length) {
  console.error("Zahlen stimmen nicht ueberein. Bitte nachsehen, bevor die alte Datenbank weg kommt.");
  process.exit(1);
}
console.log("Fertig. Das alte Projekt erst loeschen, wenn die Seite auf der neuen Datenbank laeuft.");
