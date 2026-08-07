# Bauplan Konzept 3 — „Die Rolle brennt"

## Dateien

* `components/scroll-opening.tsx` (~200 Zeilen) — Client-Komponente. Ein
  breites `<img>` der Rollen-Strecke in einem `overflow:hidden`-Rahmen;
  eine CSS-Keyframe-Animation auf `transform: translateX(...) scale(...)`
  (GPU, kein Per-Frame-JS). Titel, Siegel, Unterzeile absolut darüber.
* `app/globals.css` (+~110 Zeilen) — Scrub-Keyframes (ease-out), Titel-Slam,
  Siegel (nutzt vorhandenes `--seal-edge`), Nacht-Übergabe unten.
* `scripts/gen-scroll-run.py` (~90 Zeilen) — Strecke croppen, Nacht-Grade,
  Richtungsunschärfe in den Anlauf einbacken (nur die Landezone bleibt
  scharf — spart zugleich WebP-Bytes), Export.

## Assets

| Asset | Inhalt | Größe |
|---|---|---|
| `public/img/scroll-run.webp` | Rollen-Strecke x≈10 %–52 %, Höhe ~1100 px (~7100 px breit), Anlauf weichgezeichnet, Feuer scharf | ~380–450 KB (q-Feintuning) |

Ein Asset. Fallback ohne CSS-Animation/JS: das Bild steht auf der
Feuer-Position (`transform` im Ruhezustand = Endposition der Keyframes bzw.
statisch gesetzt). Kein WebGL beteiligt — Degradation trivial.

## Technik

* Scrub als **eine** `animation` mit `cubic-bezier(0.16, 1, 0.3, 1)` über
  ~2,2 s auf `translateX`; Push-in als zweite, verzögerte Animation auf dem
  Rahmen (`scale`).
* `prefers-reduced-motion`: keine Animationen; stehendes Feuerbild + Titel.
* Erster sichtbarer Frame: `<img>` mit `priority`, Startposition per CSS —
  kein Canvas-Bootstrap, deutlich unter 1,5 s.
* Nach 5 s ist der Hero inert; die Seite scrollt normal weiter. Unterkante
  läuft in `--background` aus (Gradient), die erste Sektion darunter beginnt
  in derselben Farbe → Übergabe ohne Schnitt.

## Die drei größten Risiken

1. **Byte-Budget.** 7100 px Breite in <500 KB: erreichbar, weil ⅔ der
   Strecke vorweichgezeichnet ist; wenn nicht, Strecke auf x≈18 %–50 %
   kürzen oder Höhe auf 900 px.
2. **Der Halt.** Kommt die Rolle zu weich zum Stehen, fehlt der Schlag; zu
   hart, wirkt es wie ein Bug. Muss im Browser über die Bezier-Kurve
   justiert werden (im Mock funktionierte starkes ease-out).
3. **Mobil/hochkant.** Die Strecke ist extrem breit; hochkant zeigt der
   Frame nur einen schmalen Ausschnitt — Landeposition muss so gewählt sein,
   dass das Feuer auch bei schmalem Viewport zentriert steht
   (`object-position` bzw. translateX in vw statt px).
