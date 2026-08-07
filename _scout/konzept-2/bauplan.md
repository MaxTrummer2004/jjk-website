# Bauplan Konzept 2 — „Das Skizzenbuch"

## Dateien

* `components/sketchbook-opening.tsx` (~260 Zeilen) — Client-Komponente;
  Studien als absolut positionierte `<img>` mit `mix-blend-mode: multiply`
  auf Papiergrund, Stempel-Keyframes mit `steps(1)`.
* `app/globals.css` (+~140 Zeilen) — Papiergrund (Textur aus dem echten
  Scan-Papier, wie `fuda.webp` entstand), Stempel/Sprung-Keyframes,
  Nacht-Übergabe (animierter `filter`/Overlay).
* `scripts/gen-sketchbook.py` (~120 Zeilen) — Studien freistellen
  (Papier-Weiß normalisieren), Papiertextur bauen.

## Assets

| Asset | Quelle | Größe |
|---|---|---|
| `public/img/sketch-paper.webp` (1600×900) | Papier aus den CC0-Scans | ~90 KB |
| `public/img/sketch-throw.webp` (1200 px) | Wurfpaar, freigestellt | ~90 KB |
| `public/img/sketch-2..4.webp` (je ~700 px) | drei weitere Studien | je ~50 KB |

Summe ≈ 330 KB. Ohne JS/Animationen: fertig komponierte Seite als Standbild.

## Technik

CSS-only-Animation; kein Canvas, kein WebGL. `prefers-reduced-motion`:
statische Komposition, bereits genachtet. Erster Frame: Papier (CSS-Farbe +
kleines Textur-Tile) — sofort sichtbar.

## Die drei größten Risiken

1. **Hell → dunkel-Übergabe.** Der einzige Moment, der scheitern kann: das
   Papier muss in die Site-Nacht *fallen* (Licht geht aus), nicht faden.
   Braucht Feintuning der Grade-Kurve im Browser.
2. **Freistellung.** Die Studien liegen im Buch mit Falz, Nachbarzeichnungen,
   Druckrand; saubere Crops ohne angeschnittene Nachbarn kosten Zeit über
   mehrere Seiten der CC0-Bände.
3. **Vier Beats in 1,3 s.** Stempelrhythmus darf nicht als „Slideshow" lesen;
   die Schläge müssen unregelmäßig und schnell sein (5/7/5-Rhythmus statt
   Metronom).
