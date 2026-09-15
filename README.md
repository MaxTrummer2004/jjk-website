# JJK — Jiu-Jitsu Kaisen Academy

Website des Jiu-Jitsu Kaisen Academy, eines Brazilian-Jiu-Jitsu-Vereins in Graz.
Öffentliche Landingpage plus geschlossener Mitgliederbereich mit Login und
Anwesenheitserfassung.

Live: https://jjk.academy

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4
- Motion (Animationen) · GSAP · Lenis (Smooth Scroll, nur Desktop)
- three.js / @react-three/fiber für die Shader-Hintergründe
- Neon Postgres (serverless) · jose (JWT-Sessions) · bcryptjs
- Deployment auf Vercel

Die animierten UI-Komponenten stammen aus React Bits Pro und liegen als
Quellcode im Repo (`components/`), nicht als Abhängigkeit. Details zur
Installation weiterer Komponenten in `SKILL.md`.

## Setup

```bash
npm install
cp .env.local.example .env.local   # Werte eintragen, siehe unten
npm run dev                        # http://localhost:3000
```

Produktion:

```bash
npm run build && npm run start
```

### Umgebungsvariablen

`.env.local` wird nicht eingecheckt. Die Werte stehen in Vercel unter
Settings → Environment Variables und lassen sich mit der Vercel CLI holen:

```bash
vercel link
vercel env pull .env.local
```

Gebraucht werden die Neon-Datenbankverbindung und das Secret für die
Session-Signierung. Ohne sie startet der Dev-Server, aber `/mitglieder`
wirft Fehler.

## Aufbau

```
app/
  page.tsx          Startseite, setzt die Sections zusammen
  layout.tsx        Fonts, Metadaten, Provider
  globals.css       Design-Tokens und alle jjk-* Utilities
  impressum/        Rechtsseite (statisch vorgerendert)
  datenschutz/      Rechtsseite (statisch vorgerendert)
  mitglieder/       Login, Profil, Anwesenheitsabstimmung, Server Actions
lib/
  config.ts         Sämtliche Seiteninhalte — hier wird Text geändert
  metadata.ts       SEO und Open Graph
  db.ts             Datenbankzugriff (members, attendance_votes)
  auth.ts           Passwort-Hashing und JWT-Session-Cookie
components/         Eine Datei pro Section plus die React-Bits-Komponenten
public/             Bilder, Videos, selbst gehostete Schriften
scripts/gen-fonts.py  Subsetting der japanischen Schriften
```

### Inhalte ändern

Fast alle Texte, Programme, Stundenplan, Preise und FAQ-Einträge stehen in
`lib/config.ts`. Für Textänderungen reicht diese Datei.

## Sections der Startseite

Hero mit Intro-Loader · Video-Showcase · Programme · Stundenplan · Trainer ·
Preise · FAQ · Call to Action · Footer

Die Seite ist bewusst **dark only** — `dark` ist in `app/layout.tsx` fest auf
`<html>` gesetzt, es gibt keinen Theme-Wechsler. Akzentfarbe ist das JJK-Rot
(`#d3202a`), der Gesamteindruck orientiert sich an der Ästhetik der
Jujutsu-Kaisen-Eröffnung.

## Medien

- `public/video/showcase-2.mp4` — Clip in der Video-Section. `showcase-1.mp4`
  liegt daneben und ist derzeit nicht eingebunden.
- `public/video/showcase-poster.jpg` — Posterframe.
- `public/img/coaches/` — Trainerfotos.
- `public/img/logo-emblem.png`, `logo-seal.png` — Vereinslogo in zwei Fassungen.

Videos sind Hochformat (576×1024). Am Handy wird das volle Format gezeigt,
ab dem sm-Breakpoint ein Querformat-Ausschnitt (`object-fit: cover`,
Bildausschnitt über `DESKTOP_CROP_POSITION` in `components/video-showcase.tsx`).

Zum Austauschen genügt es, die Datei unter demselben Namen zu ersetzen.

## Schriften

Geist, Geist Mono und Oswald laufen über `next/font/google` und werden beim
Build heruntergeladen, also vom eigenen Server ausgeliefert.

Die japanischen Schriften Shippori Mincho B1 und Yuji Syuku liegen selbst
gehostet unter `public/fonts/` und werden über `next/font/local` eingebunden —
bewusst **kein** Google-CDN, weil dabei Besucher-IPs ohne Einwilligung an
Google gingen.

`scripts/gen-fonts.py` liest die tatsächlich im Quelltext verwendeten
CJK-Zeichen aus und subsettet die Schriften darauf. Das drückt rund 2 MB pro
Schnitt auf unter 110 kB. Das Skript bricht ab, wenn ein verwendetes Zeichen
in der Schriftdatei fehlt. Nach dem Hinzufügen neuer Kanji im Code erneut
ausführen.

## Bekannte Baustellen

- `next.config.ts` setzt `typescript.ignoreBuildErrors: true`. Dahinter stecken
  7 Fehler, alle in `components/depth-card.tsx` und `components/scroll-mask.tsx`
  — beide werden nirgends importiert. Repariert oder ausgelagert kann die
  Flagge weg. `npx tsc --noEmit -p tsconfig.check.json` prüft nur die
  tatsächlich verwendeten Dateien und ist sauber.
- Impressum und Datenschutzerklärung enthalten noch Platzhalter, die mit den
  echten Vereinsdaten gefüllt werden müssen.
- Es gibt keine Löschroutine für Mitgliederkonten.
- Das E-Mail-Feld im Footer hat keine Funktion.

## Skripte

```bash
npm run dev          # Entwicklungsserver
npm run build        # Produktions-Build, der eigentliche Gate
npm run lint         # ESLint
npm run typecheck    # tsc über das volle tsconfig
```
