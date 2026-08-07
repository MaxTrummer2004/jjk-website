# Bauplan Konzept 1 — „Der Griff"

## Dateien

* `components/grip-opening.tsx` (~220 Zeilen) — Client-Komponente, drei
  Schnitt-Phasen über CSS-Klassen + eine kleine Timeline (setTimeout-Kette
  oder ein einziges `animation`-Set mit `animation-delay`).
* `app/globals.css` (+~120 Zeilen) — Schnitt-Keyframes, Fehlregistrierung
  (zwei überlagerte Kopien mit `mix-blend-mode: screen`, rot/blau gefärbt,
  ±6 px versetzt, auf 0 animiert), Titelspalte, Siegel (`--seal-edge`
  existiert).
* `scripts/gen-grip.py` (~80 Zeilen) — Crops + Kerzen-Grade aus dem Met-Scan.

## Assets

| Asset | Quelle | Größe |
|---|---|---|
| `public/img/grip-heads.webp` (1600×900) | Crop aus Met 55144, Grade | ~110 KB |
| `public/img/grip-hand.webp` (1600×900) | Crop aus Met 55144, Grade | ~110 KB |
| `public/img/grip-full.webp` (900×1880) | ganzer Druck, Grade | ~160 KB |

Summe ≈ 380 KB. Kein WebGL nötig; ohne JS steht der volle Druck als
statisches Bild (SSR-Fallback = letzte Phase).

## Technik

Reines CSS (Keyframes, `steps()` für die harten Schnitte), kein Canvas.
`prefers-reduced-motion`: nur die Endphase, statisch. Erster sichtbarer
Frame: das dunkle Papier + Geister-柔 — reine CSS-Fläche, sofort da.

## Die drei größten Risiken

1. **Pastell gegen Nacht.** Der Druck ist hell und flächig; auf der dunklen
   Seite kann er blass statt leuchtend wirken. Gegenmittel: Kerzen-Grade wie
   im Mock, notfalls kräftiger.
2. **Vertikaler Druck im Breitformat.** Das Gesamtbild füllt nur ~40 % der
   Breite; die Flanken müssen von Typo getragen werden.
3. **Schnitt-Timing.** Drei Schnitte in 1,5 s sind schnell; ein Frame zu lang
   und es liest sich als Diashow. Muss im Browser handjustiert werden.
