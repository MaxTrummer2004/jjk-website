# Fazit — die neue Eröffnung

## 1 · Was eingebaut wurde

**Konzept 3, „Die Rolle brennt".** Der Hero ist jetzt der *Night Attack on the
Sanjō Palace* (Heiji monogatari emaki, 13. Jh., MFA Boston; gemeinfreier Scan
via Wikimedia Commons, 34 396 × 2 172 px). Die Rolle steht einen Atemzug im
Bild, wird dann wie eine zu schnell abgerollte Querrolle nach links durchgezogen
— die Reiterkolonne fliegt vorbei — und kommt auf der Feuerwand zum Stehen.
Titelspalte 柔術廻戦 schlägt ein, ein Siegel stempelt, das warme Licht sinkt in
die Nacht der Seite. Kein Klick, kein Schnitt; nach ~5 s ist der Hero inert.

**Warum es gewonnen hat:**

* **Anteil gefundenes Material ~90 %** — der höchste der drei Konzepte. Ein
  einziges Museums-Asset trägt die gesamte Wirkung; der Code ist eine
  translate-Animation und ein Titel.
* Die Querrolle **ist** die Metapher der Seite (Kyōsais Nachtparade darunter
  wird genauso gelesen), und das Feuer **ist** ihre Palette — accent, ember,
  ember-hot stecken wörtlich in diesen Flammen. Brennende Stadt bei Nacht =
  die Bildformel des JJK-„Shibuya Incident".
* Niedrigstes Risiko (1,5/5), geringster Aufwand (~1 PT), 5/5 Wirkung im Mock.

**Geänderte Dateien:**

| Datei | Änderung |
|---|---|
| `components/scroll-opening.tsx` | **neu** — die Eröffnung (ein `<img>`, CSS-Animationen, Decode-Gate) |
| `app/globals.css` | Abschnitt „THE OPENING — the scroll run" angehängt |
| `app/page.tsx` | Import `Hero` → `ScrollOpening` getauscht (2 Zeilen) |
| `scripts/gen-scroll-run.py` | **neu** — erzeugt das Asset aus dem Rohscan |
| `public/img/scroll-run.webp` | **neu** — 5582 × 1000, 446 KB (q60) |

**Rückgängig machen:** in `app/page.tsx` die zwei markierten Zeilen zurücktauschen
(`ScrollOpening` → `Hero` aus `@/components/hero`) — der alte Hero-Code ist
vollständig erhalten. Oder komplett: `git checkout 9348ea8 -- app/page.tsx` bzw.
Branch `hero-neu` verwerfen; der Stand vor jedem Eingriff ist Commit `5d6ea17`,
der Stand nach Recherche/Mocks `9348ea8`.

**Technik / Grenzen eingehalten:**

* Ein Asset, 446 KB WebP (< 500 KB). Bewegungsunschärfe des Anlaufs ist ins
  Asset eingebacken (`scripts/gen-scroll-run.py`) — die Landezone bleibt
  scharf, der Rest komprimiert billig.
* Kein WebGL, kein Canvas, kein three.js: ein `<img>` und CSS-Keyframes auf
  `translate`/`scale` (GPU-komponiert, kein Per-Frame-JS). Ohne
  CSS-Animation/JS steht das Standbild.
* `prefers-reduced-motion`: alle Animationen aus, stehendes Feuerbild mit
  Titel (eigener Media-Block, weil die globale Regel Delays nicht aufhebt).
* Decode-Gate: alle Animationen starten pausiert und werden erst nach
  `img.decode()` gemeinsam freigegeben — sonst läuft der Scrub gegen ein noch
  nicht gemaltes Bild.
* Landeposition `max(50vw − 441.5svh, 100vw − 558.2svh)`: Feuer mittig, auf
  Ultrawide wird stattdessen die rechte Rollenkante an den Rand geheftet.
* `npx tsc --noEmit`: keine Fehler in den geänderten Dateien (Bestand hat
  vorbestehende Fehler in unberührten Dateien). `npx eslint` auf beiden
  Dateien: sauber.
* Opening-Vertrag der Seite (`lib/opening.ts`) bedient: `setOpeningDone(false)`
  beim Start, `true` bei der Landung — Ring-Cursor und Ember-Plume übergeben
  wie bisher.

## 2 · Screenshots

* `fazit/screenshot-landung.png` — die Landung auf dem Feuer mit Titel.
* `fazit/screenshot-settle.png` — nach dem Settle, das Licht gesunken.
* `fazit/browser-verify.gif` — Frames aus der Live-Verifikation im Browser.
* Geprüft bei ~2133×1027 (breit), 1280×720-Geometrie und 480×920 (hochkant)
  — die schmalen Formate zusätzlich als exakte Geometrie-Simulation aus
  denselben CSS-Formeln (`_scout/assets/sim-*.png`), weil das
  Browser-Fenster im Test-Setup nicht frei skalierbar war. Reduced-Motion
  visuell geprüft (statisches Feuerbild).

## 3 · Die beiden nicht eingebauten Konzepte

**Konzept 1 — „Der Griff"** (`konzept-1/pitch.md`, `mock.gif`).
Katsukawa Shun'eis *Onogawa vs. Tanikaze* (Met 55144): die berühmteste
Sumo-Rivalität der 1790er im Moment des Clinchs. Drei harte Schnitte — Köpfe,
Griffhand, ganzer Druck — dann Titel. Stärkster Punkt: BJJ ist Griffkampf, und
das Bild zeigt exakt einen Griff. Schwäche: die pastellige Druckpalette kämpft
gegen die dunkle Seite (Risiko 3/5, Wirkung 3,5/5).

**Konzept 2 — „Das Skizzenbuch"** (`konzept-2/pitch.md`, `mock.gif`).
Hokusais *Manga* Band 6 (1817), die Kampfkunst-Seiten mit Jūjutsu-Wurf. Studien
stempeln als Tuschschläge aufs Papier, das Wurfpaar springt groß, das Papier
dunkelt in die Nacht. Stärkste **Bedeutung** aller drei (BJJ stammt vom Jūjutsu
ab; „Manga" schließt den Kreis zur Anime-Ästhetik) — aber die helle Eröffnung
auf dunkler Seite ist der riskanteste Übergang (3,5/5). Hochauflösende
CC0-Bände liegen bei Smithsonian/Internet Archive bereit
(`denshinkaishuhov*kats`), falls es später gebaut werden soll.

## 4 · Quellen und Lizenzen

Vollständige Liste mit Beleg je Datei: **`_scout/assets/SOURCES.md`**. Kurz:

| Werk | Institution | Lizenz-Beleg |
|---|---|---|
| *Night Attack on the Sanjō Palace* (eingebaut) | MFA Boston / Wikimedia Commons | Commons-Lizenzfeld „Public domain" (Werk 13. Jh.) |
| Shun'ei, *Onogawa und Tanikaze* | Metropolitan Museum, Obj. 55144 | Met API `isPublicDomain: true` |
| Kuniyoshi, Sumo-Triptychon | Met, Obj. 931213 | Met API `isPublicDomain: true` |
| Hokusai, Sumo-Ringer (2×) | Met, Obj. 37189/37190 | Met API `isPublicDomain: true` |
| Shunshō, *The Wrestlers* | Met, Obj. 39719 | Met API `isPublicDomain: true` |
| *Hokusai Manga* Bd. 6, Kampfseite | Wikimedia Commons | Public Domain Mark 1.0 |
| Ōkyo, *Dragon and Tiger*; *Dragon in the Clouds* (geprüft, unbenutzt) | Met, Obj. 897122 / 51529 | Met API `isPublicDomain: true` |
