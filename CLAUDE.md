# JJK — Karte des Projekts

Website der **Jiu-Jitsu Kaisen Academy**, Graz. Dieses Dokument ist der
Einstiegspunkt: wer hier neu ist — Mensch oder Modell — liest es zuerst und
weiß danach, welche der Dateien überhaupt zählen.

    npm run dev        http://localhost:3001
    npx tsc --noEmit   muss sauber sein. Ist es. Wenn nicht: du warst es.

Next.js 16 (Turbopack) · React 19 · Tailwind v4 · TypeScript strict
(`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`) ·
motion/react · Lenis · GSAP + ScrollTrigger · three.js nur im Hero.

---

## 1 · Was die Seite ist

19. Jahrhundert, Japan: gemalte Handrolle, Tusche, Papier, Siegel, Kerzenlicht.
Dunkel, warm, **Zinnober ist die einzige Farbe**. Keine abgerundeten Karten,
keine Verläufe als Dekoration, keine Schlagschatten — die Seite hat keine
Tiefe, in die etwas schweben könnte. Jede Fläche ist Papier, das flach unter
einem Licht liegt.

Der Ablauf von oben nach unten:

| | Sektion | Grund |
|---|---|---|
| 1 | Eröffnung — ein Blatt Papier, in das die vier Zeichen geschnitten sind; beim Scrollen glühen sie, und das Licht wird an die Fackel übergeben | `paper-*.webp` |
| 2 | About — vier Ovale | Wand |
| 3 | Galerie — zwölf Kacheln fliegen ein | Wand |
| 4 | Programme · Gründe | Wand |
| 5 | Stundenplan | Wand |
| 6 | Coaches | Wand |
| 7 | Preise | Tafel `court` |
| 8 | FAQ | Wand |
| 9 | Schluss | Tafel `blaze` |
| 10 | Kolophon | Tafel `sutra` |

Die Feuerwand zwischen Stundenplan und Umgebung ist raus, auf Ansage: Wand und
Tafeln sind absichtlich aufeinander eingemessen, also gibt es dort keinen
Ortswechsel zu zeigen. Siehe Falle 5 und den langen Kommentar in `page.tsx`.

---

## 2 · Die drei Regeln, die alles zusammenhalten

**Es gibt genau eine Gradierungsfunktion.** Jede gemalte Fläche auf dieser
Seite geht durch dieselbe Rechnung, Konstante für Konstante:
`scripts/gen-wall.py` → `gen-scroll-plates.py` → `gen-section-plates.py` →
`gen-figures.py` → `gen-curtain.py`. Zwei separat gebaute Oberflächen lesen
sich als zwei Oberflächen, egal wie sorgfältig jemand sie aufeinander
zutunt — das hat dieses Projekt dreimal gelernt.

**Es gibt genau zwei Arten von Grund.** Die *Wand* ist eine nahtlose Kachel
(`components/lit-wall.tsx`, `room.tsx`) und läuft hinter der ganzen unteren
Hälfte durch. Die *Tafeln* sind vier Ausschnitte aus der Sanjō-Rolle
(`components/plate.tsx`), die darauf hängen. Eine Kachel kann Textur sein und
nie ein Bild; eine Tafel kann ein Bild sein, weil sie sich nicht wiederholen
muss.

**Jede Fläche ist dreischichtig.** Kalte Platte (das Papier, `brightness(0.4)`,
weil die Datei 2,5-fach zu hell gespeichert ist — `WALL_GAIN`), Schleier
(`rgba(3,3,4,0.86)`), und darüber das Licht des Bildes selbst im
`mix-blend-mode: screen`. Wer eine neue Fläche baut, baut sie so.

---

## 3 · Die lebenden Dateien

Alles andere liegt in `_attic/` (siehe §6). Diese hier sind im Baum:

### Der Rahmen
    app/layout.tsx            Wurzel, Schriften, Provider
    app/page.tsx              die Abfolge oben — hier steht, was wo hängt
    app/globals.css           Tokens + jede jjk-Klasse. Lang, und die langen
                              Kommentare darin sind der eigentliche Wert.
    lib/config.ts             ALLE Inhalte: Programme, Stundenplan, Coaches,
                              Preise, FAQ. Nichts davon gehört in eine Komponente.
    lib/opening.ts            das Signal "Intro vorbei"
    lib/motion.tsx            prefers-reduced-motion
    lib/lenis.ts              Griff auf den Smooth-Scroll (Intro sperrt ihn)
    lib/overlay-context.tsx · lib/metadata.ts · lib/utils.ts · lib/kanji-paths.ts

### Die Eröffnung
    components/paper-opening.tsx    das Blatt, die vier Schnitte, vier
                                    Bewegungen am Scroll, Übergabe an die Fackel
    components/kanji-title.tsx      柔術廻戦, als gezeichnete Pfade (jetzt nur
                                    noch von der alten Eröffnung gebraucht)

### Grund und Licht
    components/lit-wall.tsx    WallLight (Zeiger) + LitWall (eine Wandsektion)
    components/room.tsx        LitWall im Zustand "schon hell"
    components/plate.tsx       eine Tafel: klebender Raum + Überblendung
    components/curtain.tsx     die Feuerwand zwischen zwei Orten

### Die Sektionen
    about-3 · image-reveal · features-6 · features-3 · schedule ·
    coaches · pricing-2 · faq-1 · cta-9 · footer-4

### Kleinteile
    kanji-label · staggered-text · spotlight-grid · custom-cursor ·
    ember-smoke · smooth-scroll · atmosphere · skip-to-content · providers

### Ausgehängt, aber absichtlich aufgehoben
    scroll-opening.tsx
        die VORIGE Eröffnung: der brennende Sanjō-Palast mit Klick-Tor und
        gehaltenem Scroll. Ihr CSS steht weiter unter „THE OPENING — the palace
        on fire"; ein Import in page.tsx tauscht zurück.
    hero.tsx + fly-in.tsx + city-backdrop + zoom-streaks + cursed-energy
        die ALTE Eröffnung (Karten-Anflug auf Graz). page.tsx sagt, wie man
        zurücktauscht.
    water-ripple.tsx + gl-boundary.tsx
        der Wassereffekt über den About-Ovalen, auf Ansage entfernt. Die
        Stelle zum Zurückholen ist in about-3.tsx kommentiert.

---

## 4 · Woher die Bilder kommen

Kein Bild in `public/img/` ist von Hand gemacht. Jedes hat ein Skript, und
jedes Skript hat einen Kopfkommentar, der erklärt, warum es so rechnet.

    gen-paper.py           paper-{cold,glow,spill}-{wide,tall} ← heiji-*
    gen-wall.py            wall/wall-glow/wall-shade.webp   ← emaki/
    gen-scroll-plates.py   scroll-cold/glow.webp            ← _scout/assets/heiji-*
    gen-section-plates.py  plate-{carts,court,blaze,sutra}  ← _scout/assets/heiji-*
    gen-figures.py         mock-1..12, hand-sign-1..4       ← _scout/assets/met-*
    gen-curtain.py         curtain-fire.webp                ← _scout/assets/heiji-*
    gen-kanji-paths.py     lib/kanji-paths.ts
    gen-fonts.py           public/fonts/*.woff2  — alle vier Schriften

Quellen sind gemeinfrei, Belege in `_scout/assets/SOURCES.md`.
Neu erzeugen: `python3 scripts/<datei>.py` aus dem Projektverzeichnis.

**Die Schriften laufen genauso.** `gen-fonts.py` laedt die vier Familien aus
dem google/fonts-Repo, schneidet sie auf die Zeichen zu, die im Quelltext
tatsaechlich vorkommen, und legt sie unter `public/fonts/` ab; `app/layout.tsx`
bindet sie ueber `next/font/local` ein. Zwei Dinge folgen daraus:

* Die Seite ruft Google an keiner Stelle mehr auf, weder beim Besucher noch
  beim Bauen. Vorher gingen zwei japanische Schnitte per `<link>` ans
  Google-CDN, also die IP jedes Besuchers an Google.
* **Wer ein neues Kanji oder Sonderzeichen in sichtbaren Text schreibt, muss
  das Skript neu laufen lassen.** Sonst faellt genau dieses eine Zeichen auf
  eine Systemschrift zurueck. Das Skript bricht laut ab, wenn es so etwas
  findet, und unterscheidet dabei Kommentar von gerendertem Text.

Es gibt **eine** Anzeigeschrift, und es ist dieselbe wie fuer die Kanji:
Shippori Mincho B1. Sie geht auf die Tokyo Tsukiji Type Foundry No. 5 zurueck,
also auf das 19. Jahrhundert; ihr ExtraBold ist vom Hersteller fuer
Ueberschriften gezeichnet; die Variante B1 hat gemalte Ecken und Tinte, die ins
Papier laeuft. Oswald, die schmale amerikanische Grotesk aus dem Template, ist
raus. Damit ist auch der Versalsatz der Ueberschriften weg: Shippori laeuft in
Versalien das 1,44-fache von Oswald bei 9 % kleinerer Versalhoehe, im
Gemischtsatz nur das 1,10-fache. Versalien gehoeren jetzt ganz der Mono
(Augenbrauen, Etiketten, Legenden). Alle zehn Sektionsueberschriften teilen
eine Klasse: `.jjk-section-title`.

---

## 5 · Fallen, die hier schon Zeit gekostet haben

Alle fünf sind tatsächlich passiert. Lies sie, bevor du dich wunderst.

1. **CSS-Fill-Modes verrechnen sich in Listenreihenfolge.** Eine Animation
   steuert einen Wert nicht nur, während sie läuft, sondern auch während ihrer
   Verzögerung, wenn ihr Fill `backwards` enthält. `both` auf einer später
   gelisteten Animation überschreibt eine frühere ab Bild eins. Kostete die
   Zündung im Intro einen halben Tag. Siehe `.jjk-plate-room`, wo die zweite
   Animation deshalb auf `forwards` steht.

2. **Eine Tailwind-Klasse kann still verlieren.** `KanjiTitle` setzt intern
   `flex w-full` und hängt die übergebene Klasse in denselben class-String
   dahinter. Beide setzen `width`, beide sind eine Klasse — es entscheidet die
   Reihenfolge im erzeugten Stylesheet, nicht die im Attribut. Zwei Runden
   „mach den Titel kleiner" haben deshalb nichts bewirkt.

3. **An einem Element messen, das gerade animiert wird, misst die Animation.**
   Die Ankunft der Galeriekacheln wurde zweimal an `.column__item-imgwrap`
   abgelesen — dem Element, dessen `scaleY` der Tween gerade zieht. Miss an der
   untransformierten Kachel.

4. **Der Dev-Server verschläft Dateiänderungen**, die über ein gemountetes
   Laufwerk geschrieben werden. Eine neue, nur im Quelltext vorkommende
   Tailwind-Klasse existiert dann gar nicht. Nach Änderungen an Klassennamen:
   Server neu starten, bevor du dem Browser glaubst.

5. **Zwei Flächen, die gleich aussehen, kann man nicht ineinander
   überblenden.** Wand und Tafeln sind absichtlich aufeinander eingemessen
   (5,8–10,6 gegen 6,9–12,3 von 255). Vier Anläufe an der Überblendungskurve
   halfen nicht; erst die Feuerwand DAVOR war der Übergang. Wenn ein Übergang
   nicht wirkt, prüf zuerst, ob es einen Unterschied gibt.

---

## 6 · `_attic/`

Vierzig Komponenten aus dem Template, mit dem das Projekt angefangen hat, und
die kein Pfad von `app/page.tsx` aus je erreicht: Statistik-Blöcke,
Testimonials, drei weitere Preistabellen, vier weitere CTAs, ein Header, den
niemand rendert. Dazu alte `.bak`-Dateien und Bildmaterial vom Rand.

Sie sind **verschoben, nicht gelöscht**, und `tsconfig.json` schließt den
Ordner aus. Das ist nicht Ordnungsliebe: dieselben vierzig Dateien haben jeden
`npx tsc --noEmit` mit Fehlern gefüllt, die niemandem gehörten, und jede Suche
im Projekt mit Treffern, die nichts bedeuten. Wer eine davon braucht, holt sie
zurück; wer keine braucht, löscht den Ordner.

**Der Header fehlt der Seite wirklich.** `header.tsx` liegt im Attic, weil er
nirgends eingebunden ist — die Seite hat momentan keine Navigation. Das ist
eine offene Entscheidung, kein Versehen des Aufräumens.

---

## 7 · Umgangston

Der Auftraggeber schreibt Deutsch und will Deutsch zurück: direkt, sachlich,
keine Füllformulierungen. Er will wissen **warum**, nicht nur dass es erledigt
ist — Messwerte statt Behauptungen. Annahmen benennen, nicht still treffen.
Keine Datei löschen und keine bestehende überschreiben, ohne zu fragen.
