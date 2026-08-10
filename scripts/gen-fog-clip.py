"""Aus einer Rauchaufnahme die Nebelschleife der Eroeffnung machen.

Die Vorgaengerin dieser Datei ist scripts/gen-fog-video.py — eine
Stroemungssimulation, die den Nebel selbst gerechnet hat, weil kein Material da
war. Sie bleibt liegen und ist immer noch lehrreich, aber sie ist geschlagen:
eine echte Aufnahme hat Mikrostruktur, Streulicht und Tiefenschaerfe, und keine
Rechnung der Welt holt das ein.

Was hier passiert, ist wenig, und das ist Absicht — die Qualitaet kommt aus der
Quelle:

  1  SPIEGELN. Die Aufnahme zieht nach rechts, die Seite braucht nach links.
     Ein hflip kostet nichts und ist ehrlicher als eine CSS-Transformation:
     `transform: scaleX(-1)` auf dem Videoelement erzeugt einen eigenen
     Stacking-Kontext, und in einer Sektion, die mit `mix-blend-mode` und
     z-index arbeitet, ist das eine Falle fuer spaeter.
  2  ENTSAETTIGEN. Der Rauch ist blaeulich; die Seite fuehrt genau zwei Farben,
     und Blau ist keine davon. Er wird neutral, den Warmton legt CSS darueber
     (`.jjk-gate-fog`), damit beides getrennt einstellbar bleibt.
  3  SCHWARZ SAUBER HALTEN. Die Ebene liegt im `screen`-Blend, und dort ist
     Schwarz das neutrale Element: alles, was oberhalb von null liegt, hellt
     das ganze Bild auf. Die Quelle ist schon sauber (1. Perzentil exakt 0),
     die Skalierung koennte sie verwaschen — also wird der Schwarzpunkt danach
     noch einmal gesetzt.
  4  SCHLEIFE SCHLIESSEN. Siehe unten.

── Die Schleife ────────────────────────────────────────────────────────────
Die Aufnahme hat keinen Rueckweg zum Anfang. Also wird sie in zwei Teile
geschnitten und ueber sich selbst geblendet:

    Rumpf  = Sekunde HEAD bis Ende
    Kopf   = Sekunde 0 bis HEAD
    Ausgabe = xfade(Rumpf, Kopf), Uebergang in den letzten HEAD Sekunden

Das Ende der Ausgabe ist damit exakt der Zustand bei Sekunde HEAD der Quelle —
und der Anfang der Ausgabe ist derselbe Zustand. Der Sprung ist keiner.

── Warum das Tempo nicht hier eingestellt wird ─────────────────────────────
Langsamer machen heisst im Video: Bilder duplizieren, Datei aufblaehen, Tempo
festbrennen. Im Browser ist es eine Zahl (`playbackRate` in
components/gate-opening.tsx), kostet nichts und laesst sich in einer Sekunde
aendern. Bei einem Motiv, dessen Bewegung ohnehin fast steht, sieht man auch
bei einem Viertel der Geschwindigkeit kein Ruckeln — die Verschiebung pro Bild
ist zu klein dafuer.

    python3 scripts/gen-fog-clip.py <quelle.mp4>
"""
import os
import subprocess
import sys

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
OUT_MP4 = os.path.join(_ROOT, "public", "video", "fog.mp4")
OUT_WEBM = os.path.join(_ROOT, "public", "video", "fog.webm")

# 1600 statt 4096: die Ebene liegt halbtransparent ueber einem Bild und wird nie
# scharf gelesen. Rauch ist trotzdem detailreich, deshalb nicht 1280.
WIDTH = 1440
HEAD = 2.0        # Sekunden, ueber die die Schleife geschlossen wird
CRF_H264 = 28
CRF_VP9 = 36      # VP9 zaehlt anders als x264; 36 entspricht etwa 28

# ── Die Bildrate, und warum sie so niedrig ist ──────────────────────────────
# Die Datei wird im Browser mit einem halben Tempo abgespielt (playbackRate),
# also sind 24 Bilder pro Sekunde in der Datei zwoelf auf dem Schirm — und
# davon die Haelfte ist immer noch mehr, als dieses Motiv braucht. Rauch, der
# sich um wenige Pixel pro Sekunde bewegt, ruckelt bei zwoelf Bildern nicht;
# er wuerde es erst bei drei oder vier tun.
#
# Der Unterschied ist die halbe Dateigroesse: mit 24 lag sie bei 7,4 MB, und
# das ist fuer eine Ebene, die man nicht ansieht sondern durch die man sieht,
# nicht zu rechtfertigen.
OUT_FPS = 12

# Graustufe nach Rec. 709. Der Warmton kommt aus CSS, nicht von hier.
GRAY = ("colorchannelmixer="
        "0.2126:0.7152:0.0722:0:"
        "0.2126:0.7152:0.0722:0:"
        "0.2126:0.7152:0.0722:0")
# Schwarzpunkt setzen und einen Hauch Kontrast: was unter 3 % liegt, wird null.
LEVELS = "colorlevels=rimin=0.030:gimin=0.030:bimin=0.030,eq=contrast=1.06"


def duration(path):
    out = subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", path,
    ])
    return float(out.strip())


def main():
    if len(sys.argv) < 2:
        raise SystemExit("Aufruf: python3 scripts/gen-fog-clip.py <quelle.mp4>")
    src = sys.argv[1]
    dur = duration(src)
    body_len = dur - HEAD
    offset = body_len - HEAD
    print("Quelle %.2f s  →  Schleife %.2f s, Uebergang bei %.2f s"
          % (dur, body_len, offset))

    chain = (
        "[0:v]hflip,scale=%d:-2:flags=lanczos,%s,%s,format=gbrp,split[a][b];"
        "[a]trim=start=%.3f,setpts=PTS-STARTPTS[body];"
        "[b]trim=start=0:end=%.3f,setpts=PTS-STARTPTS[head];"
        "[body][head]xfade=transition=fade:duration=%.3f:offset=%.3f,"
        "fps=%d[v]"
        % (WIDTH, GRAY, LEVELS, HEAD, HEAD, HEAD, offset, OUT_FPS)
    )

    os.makedirs(os.path.dirname(OUT_MP4), exist_ok=True)
    for path, args in (
        (OUT_MP4, ["-c:v", "libx264", "-preset", "slow", "-crf", str(CRF_H264),
                   "-pix_fmt", "yuv420p", "-movflags", "+faststart"]),
        # H.264 ist lizenzpflichtig; Chromium-Builds ohne die proprietaeren
        # Erweiterungen spielen es gar nicht ab (DEMUXER_ERROR_NO_SUPPORTED_
        # STREAMS). VP9 laeuft ueberall, das MP4 bleibt fuer Safari.
        (OUT_WEBM, ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", str(CRF_VP9),
                    "-deadline", "good", "-cpu-used", "3", "-pix_fmt", "yuv420p"]),
    ):
        subprocess.check_call([
            "ffmpeg", "-y", "-loglevel", "error", "-i", src,
            "-filter_complex", chain, "-map", "[v]", "-an",
            # Keyframes dicht: die Schleife springt zurueck, und ein Ruecksprung
            # auf ein P-Bild kostet den Decoder einen sichtbaren Ruckler.
            "-g", "48", "-sc_threshold", "0", *args, path,
        ])
        print("  %-10s %.1f MB" % (os.path.basename(path),
                                   os.path.getsize(path) / 1024 / 1024))


if __name__ == "__main__":
    main()
