# Agenten-Hinweise

Die Karte des Projekts steht in **[CLAUDE.md](./CLAUDE.md)** — dort anfangen.

Diese Datei existiert aus einem einzigen Grund: `next dev` schreibt seit
Next 16.3 selbsttaetig einen Block mit eigenen Regeln in eine Agenten-Datei
(`node_modules/next/dist/server/lib/generate-agent-files.js`). Gibt es eine
`AGENTS.md`, landet der Block hier; gibt es keine, haengt Next ihn stattdessen
an `CLAUDE.md` an. Die Datei faengt den Block also ab, damit die Projektdoku
nicht bei jedem Dev-Start fremdbeschrieben wird.

Alles unterhalb der Marker ist erzeugt, nicht geschrieben. Nicht von Hand
bearbeiten — Next ueberschreibt es beim naechsten Start ohnehin.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
