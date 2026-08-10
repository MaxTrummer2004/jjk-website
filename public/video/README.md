# public/video

## fog.mp4 · fog.webm — der Nebel der Eröffnung

Erzeugt aus einer echten Rauchaufnahme:

    python3 scripts/gen-fog-clip.py _scout/assets/fog-source.mp4

Die Quelle ist ein 4K-Clip (4096 × 2304, 23 s, dünner Rauch auf schwarzem
Grund). Das Skript tut absichtlich wenig — die Qualität kommt aus der Aufnahme:
spiegeln, entsättigen, Schwarzpunkt setzen, Schleife schließen, verkleinern.

### Was vorher hier stand

`scripts/gen-fog-video.py` — eine Strömungssimulation (Stable Fluids), die den
Nebel selbst gerechnet hat, weil kein Material da war. Sie bleibt liegen, ist
lehrreich und funktioniert, aber sie ist geschlagen: eine echte Aufnahme hat
Mikrostruktur, Streulicht und Tiefenschärfe, und keine Rechnung holt das ein.
Davor stand ein WebGL-Shader mit fraktalem Rauschen; sechs Runden
Konstantenschieben haben daraus nie mehr als einen Schleier gemacht.

### Die Schleife

Die Aufnahme hat keinen Rückweg zum Anfang, also wird sie über sich selbst
geblendet: Rumpf ist Sekunde 2 bis Ende, Kopf ist Sekunde 0 bis 2, und die
letzten zwei Sekunden der Ausgabe sind eine Überblendung der beiden. Das Ende
der Ausgabe ist damit exakt der Zustand bei Sekunde 2 der Quelle — und der
Anfang ist derselbe Zustand.

### Tempo

Steht **nicht** in der Datei, sondern als `playbackRate = 0.5` in
`components/gate-opening.tsx`. Langsamer machen heißt beim Kodieren: Bilder
duplizieren, Datei aufblähen, Tempo festbrennen. Im Browser ist es eine Zahl.

Die Datei hat deshalb nur **12 Bilder pro Sekunde** — bei halbem Tempo sind das
sechs auf dem Schirm, und Rauch, der sich um wenige Pixel pro Sekunde bewegt,
ruckelt dabei nicht. Der Unterschied ist die halbe Dateigröße: mit 24 lag sie
bei 7,4 MB, jetzt bei 3,6 (MP4) und 2,6 (WebM). Die Schleife läuft 42 Sekunden.

### Zwei Formate, und warum

H.264 ist lizenzpflichtig. Chromium-Builds ohne die proprietären Erweiterungen
spielen ihn **gar nicht** ab — gemessen als
`DEMUXER_ERROR_NO_SUPPORTED_STREAMS` und einem Hero ohne Nebel. VP9 in WebM ist
frei und läuft überall; das MP4 bleibt für Safari. Im `<video>` steht WebM
zuerst.

### Warum weiß auf Schwarz und kein Alphakanal

Die Ebene liegt im `mix-blend-mode: screen`. Schwarz ist dort das neutrale
Element: es verschwindet vollständig, übrig bleibt nur, was heller ist — also
der Rauch. Alles, was oberhalb von null liegt, hellt dagegen das ganze Bild
auf; deshalb setzt das Skript den Schwarzpunkt nach dem Skalieren noch einmal.

### Die Regler

- Deckkraft und Verlauf über den Scroll: `--fog` in `gate-opening.tsx`
- Farbe und Kontrast der Ebene: `.jjk-gate-fog` in `app/globals.css`
- Tempo: `playbackRate` in `gate-opening.tsx`
- Größe, Bildrate, Schleifenlänge: die Konstanten in `gen-fog-clip.py`
