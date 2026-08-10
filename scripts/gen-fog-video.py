"""Der Nebel der Eroeffnung — eine Stroemungssimulation, kein Rauschen.

── Warum das ueberhaupt gerechnet wird ──────────────────────────────────────
Der erste Anlauf war ein WebGL-Shader mit fraktalem Rauschen. Sechs Runden lang
wurden Konstanten geschoben, und das Ergebnis war jedes Mal ein Schleier statt
Wetter. Der Grund ist nicht die Parametrisierung, sondern das Verfahren:

  * Rauschen hat KEINE GESCHICHTE. Jedes Bild wird unabhaengig ausgerechnet;
    was aussieht wie Bewegung, ist eine verschobene Abtastung derselben
    Funktion. Echter Nebel wird gedehnt, gefaltet und ausgefranst, und was man
    in einem Bild sieht, ist das Ergebnis von allem, was vorher passiert ist.
  * Rauschen hat keine FILAMENTE. Die duennen, gezogenen Schlieren, an denen
    man Rauch sofort erkennt, entstehen dadurch, dass eine Stroemung Material
    schert. Aus einer Summe von Sinuskurven kommen sie nicht.
  * Rauschen hat keine WIRBEL. Ein Wirbel ist eine Struktur, die sich um sich
    selbst dreht und dabei Material einrollt; fbm kann das nicht darstellen.

Also wird der Nebel offline simuliert und als Videoschleife ausgeliefert. Was
im Browser laeuft, ist dann ein MP4 im `screen`-Blend — siehe
public/video/README.md und die Klasse `.jjk-gate-fog` in app/globals.css.

── Das Verfahren ───────────────────────────────────────────────────────────
"Stable Fluids" (Jos Stam, 1999), die Standardmethode fuer inkompressible
Stroemung in der Computergrafik. Pro Zeitschritt:

  1  Kraefte    Wind nach links, plus Wirbelverstaerkung
  2  Advektion  das Geschwindigkeitsfeld transportiert sich selbst
  3  Projektion das Feld wird divergenzfrei gemacht — DAS ist der Schritt, der
                aus Bewegung eine Stroemung macht. Ohne ihn entstehen Quellen
                und Senken aus dem Nichts, und es sieht aus wie Watte.
  4  Advektion  die Dichte wird mit der Stroemung transportiert

Die Projektion laeuft ueber die FFT, was zwei Dinge zugleich erledigt: sie ist
exakt (kein iterativer Loeser, keine Restdivergenz), und sie setzt PERIODISCHE
Raender voraus. Periodische Raender heissen: was links hinauslaeuft, kommt
rechts wieder herein. Der Nebel stroemt also endlos nach, ohne dass irgendwo
eine Quelle sitzen muss, die man spaeter sieht.

── Wie die Schleife geschlossen wird ───────────────────────────────────────
Eine Simulation hat keinen natuerlichen Rueckweg zum Anfang. Also wird sie
laenger gerechnet als gebraucht und ueber sich selbst geblendet: Bild i der
Ausgabe ist eine Mischung aus Bild i und Bild i+N der Simulation. Am Anfang
liegt das Gewicht ganz auf i+N, nach FADE Bildern ganz auf i.

Das ist nahtlos, und zwar nicht ungefaehr: das letzte Ausgabebild ist Bild N-1
der Simulation, das erste ist Bild N — zwei aufeinanderfolgende Bilder
derselben Rechnung. Der Uebergang ist die Simulation selbst.

    python3 scripts/gen-fog-video.py
    python3 scripts/gen-fog-video.py --preview      nur ein paar Standbilder
"""
import os
import subprocess
import sys

import numpy as np
from scipy.ndimage import map_coordinates, gaussian_filter

_HERE = os.path.dirname(os.path.abspath(__file__))
_ROOT = os.path.normpath(os.path.join(_HERE, ".."))
OUT = os.path.join(_ROOT, "public", "video", "fog.mp4")
# Zweites Format, und zwar nicht aus Vorsicht: H.264 ist ein lizenzpflichtiger
# Codec, und Chromium-Builds ohne die proprietaeren Erweiterungen spielen ihn
# gar nicht ab — sichtbar als DEMUXER_ERROR_NO_SUPPORTED_STREAMS und einem
# Hero ohne Nebel. VP9 in WebM ist frei und laeuft ueberall; das MP4 bleibt
# fuer Safari, das VP9 lange nicht konnte.
OUT_WEBM = os.path.join(_ROOT, "public", "video", "fog.webm")

# ── Format ──────────────────────────────────────────────────────────────────
# 1280x720 ist reichlich: die Ebene liegt weichgezeichnet ueber einem Bild und
# wird nie scharf gelesen. Die Simulation laeuft in derselben Aufloesung, weil
# die Filamente GENAU auf dieser Skala entstehen — eine grob gerechnete und
# hochskalierte Stroemung hat sie nicht.
# Gerechnet wird in HALBER Aufloesung und beim Ausgeben verdoppelt. Das ist
# keine Sparmassnahme mit Qualitaetsverlust, sondern eine Verschiebung: die
# Filamente entstehen auf der Gitterskala, und ein 640er Gitter erzeugt sie
# GROESSER und damit sichtbarer, waehrend die feine Struktur ohnehin vom Korn
# kommt. Der erste Anlauf in voller Aufloesung lief zehn Minuten und war nicht
# fertig — 921 000 Gitterpunkte mal drei kubische Interpolationen mal 378
# Schritte.
SIM_W, SIM_H = 640, 360
W, H = 1280, 720
FPS = 24
N_OUT = 240          # 10 Sekunden Schleife
FADE = 48            # Bilder, ueber die die Schleife geschlossen wird
WARMUP = 60          # Einschwingen, bevor das erste Bild zaehlt

# ── Stroemung ───────────────────────────────────────────────────────────────
DT = 1.0
WIND = -1.35         # nach links, in Pixeln pro Schritt
WIND_SHEAR = 0.55    # oben schneller als unten — Wind hat ein Profil
VORTICITY = 0.14     # Wirbelverstaerkung: haelt die Turbulenz am Leben
FORCE_NOISE = 0.075  # Boeen, damit die Stroemung nicht in einen Zustand faellt
FORCE_SCALE = 0.011  # Groesse der Boeen, in 1/Pixel
VISC = 0.34          # Weichzeichnung des Geschwindigkeitsfeldes pro Schritt
GUST = 24            # alle wie viel Schritte eine neue Boee gezogen wird

# ── Dichte ──────────────────────────────────────────────────────────────────
DENS_SCALE = 0.0042  # Groesse der Ballen im Startfeld
DENS_OCTAVES = 6
REGEN = 0.012        # wie stark die Dichte zum Ausgangsfeld zurueckgezogen wird
DENS_DIFF = 0.22     # Diffusion pro Schritt, sonst zerfasert es zu Faeden

# ── Aussehen ────────────────────────────────────────────────────────────────
# Der Nebel muss HELL sein: die Ebene liegt im `screen`-Blend, und dort ist
# Schwarz das neutrale Element. Was dunkler ist als der Hintergrund, ist
# unsichtbar; nebeln tut nur, was heller ist.
# Die Kurve ist das Wichtigste am Aussehen, und der erste Versuch lag bei
# einem Bildmittel von 0.44 — das ist als `screen`-Ebene eine Milchscheibe
# ueber dem ganzen Hero. Was ein Overlay braucht, ist das Gegenteil: viel
# klare Luft und wenige dichte Stellen, die dafuer richtig decken.
GAMMA = 3.10         # Kurve auf der Dichte — hoeher heisst mehr klare Luft
GAIN = 1.55
LIFT = 0.030         # ein Hauch Grundschleier, sonst wirken die Raender hart
GRAIN = 0.020        # Korn. Ohne das sieht jede Simulation nach Rechnung aus
TINT = (1.00, 0.985, 0.965)   # ein Hauch warm, damit es zur Seite gehoert
CRF = 25             # H.264-Qualitaet; Nebel komprimiert gut


def gblur(x, sigma):
    """Gauss ueber die FFT. Bei einem Sigma von neunzig Pixeln hat der
    raeumliche Kernel siebenhundert Stuetzstellen pro Achse; im Frequenzraum
    ist es eine Multiplikation. Und periodisch ist er ohnehin, was hier genau
    richtig ist."""
    if sigma < 0.6:
        return x
    h, w = x.shape
    fy = np.fft.fftfreq(h)[:, None].astype(np.float32)
    fx = np.fft.rfftfreq(w)[None, :].astype(np.float32)
    k = np.exp(-2.0 * (np.pi ** 2) * (sigma ** 2) * (fy * fy + fx * fx))
    return np.fft.irfft2(np.fft.rfft2(x) * k, s=(h, w)).astype(np.float32)


def fbm(shape, scale, octaves, rng):
    """Fraktales Rauschen ueber gefiltertes Weissrauschen — periodisch, weil
    der Gauss im Frequenzraum periodisch wirkt und die Raender damit passen."""
    out = np.zeros(shape, np.float32)
    amp, s = 1.0, scale
    total = 0.0
    for _ in range(octaves):
        n = rng.standard_normal(shape).astype(np.float32)
        out += amp * gblur(n, 1.0 / s)
        total += amp
        amp *= 0.55
        s *= 2.0
    out /= total
    out -= out.min()
    return out / max(out.max(), 1e-6)


def advect(field, u, v, dt):
    """Semi-Lagrange: frag, wo das Material JETZT hier war, und hol es von
    dort. Unbedingt stabil, und `mode=wrap` macht die Raender periodisch —
    was links hinauslaeuft, kommt rechts herein."""
    h, w = field.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    src = np.stack([yy - v * dt, xx - u * dt])
    return map_coordinates(field, src, order=3, mode="grid-wrap").astype(np.float32)


def project(u, v):
    """Divergenzfrei machen — der Schritt, der aus Bewegung Stroemung macht.

    Im Fourierraum ist das eine Zeile: die Komponente des Feldes, die in
    Richtung des Wellenvektors zeigt, ist genau der divergente Anteil, und der
    wird abgezogen. Ohne diesen Schritt entstehen Quellen und Senken aus dem
    Nichts, und das Ergebnis sieht aus wie Watte, die aufgeht.
    """
    h, w = u.shape
    ky = np.fft.fftfreq(h)[:, None].astype(np.float32) * 2 * np.pi
    kx = np.fft.fftfreq(w)[None, :].astype(np.float32) * 2 * np.pi
    k2 = kx * kx + ky * ky
    k2[0, 0] = 1.0
    U, V = np.fft.fft2(u), np.fft.fft2(v)
    dot = (kx * U + ky * V) / k2
    return (np.real(np.fft.ifft2(U - kx * dot)).astype(np.float32),
            np.real(np.fft.ifft2(V - ky * dot)).astype(np.float32))


def vorticity_force(u, v, eps):
    """Wirbelverstaerkung. Jede numerische Advektion frisst Drehimpuls; ohne
    Gegenmassnahme wird eine Stroemung nach hundert Schritten glatt und
    langweilig. Hier wird gemessen, wo sich etwas dreht, und genau dort wird
    nachgeschoben."""
    dvdx = np.gradient(v, axis=1)
    dudy = np.gradient(u, axis=0)
    wz = dvdx - dudy
    aw = np.abs(wz)
    gy, gx = np.gradient(aw)
    norm = np.sqrt(gx * gx + gy * gy) + 1e-5
    nx, ny = gx / norm, gy / norm
    return eps * ny * wz, -eps * nx * wz


def simulate(n_frames, rng):
    H, W = SIM_H, SIM_W
    yy = np.linspace(0.0, 1.0, H, dtype=np.float32)[:, None]

    # Startfeld der Dichte, und zugleich das Feld, zu dem sie zurueckgezogen
    # wird. Ohne diese Rueckkopplung duennt reine Advektion die Dichte
    # langsam aus, bis nur noch Faeden uebrig sind.
    ref = fbm((H, W), DENS_SCALE, DENS_OCTAVES, rng)
    ref = np.clip((ref - 0.32) * 1.9, 0, 1)
    dens = ref.copy()

    # Wind mit Profil: oben schneller. Ein ueberall gleicher Wind schiebt das
    # Bild nur, er verformt es nicht — Scherung ist es, die Filamente zieht.
    base_u = WIND * (1.0 - WIND_SHEAR * yy)
    u = np.repeat(base_u, W, axis=1).astype(np.float32)
    v = np.zeros((H, W), np.float32)
    u += (fbm((H, W), FORCE_SCALE, 3, rng) - 0.5) * 0.9
    v += (fbm((H, W), FORCE_SCALE, 3, rng) - 0.5) * 0.6
    u, v = project(u, v)

    gust_a = np.zeros((2, H, W), np.float32)
    gust_b = np.stack([
        (fbm((H, W), FORCE_SCALE, 2, rng) - 0.5),
        (fbm((H, W), FORCE_SCALE, 2, rng) - 0.5),
    ])

    frames = []
    for i in range(n_frames):
        fu, fv = vorticity_force(u, v, VORTICITY)
        u += fu
        v += fv
        # Boeen. NICHT jeden Schritt neu gewuerfelt — das war der zweite Grund
        # fuer die zehn Minuten, und es waere ausserdem falsch: eine Boee, die
        # sich jedes Bild vollstaendig aendert, ist weisses Rauschen und
        # verschwindet in der Viskositaet. Zwei Felder werden ueberblendet und
        # alle GUST Schritte wird das hintere neu gezogen, sodass die Kraft
        # eine Dauer hat.
        if i % GUST == 0:
            gust_a[:] = gust_b
            gust_b[:] = np.stack([
                (fbm((H, W), FORCE_SCALE, 2, rng) - 0.5),
                (fbm((H, W), FORCE_SCALE, 2, rng) - 0.5),
            ])
        t = (i % GUST) / GUST
        t = t * t * (3 - 2 * t)
        gust = gust_a * (1 - t) + gust_b * t
        u += gust[0] * FORCE_NOISE
        v += gust[1] * FORCE_NOISE

        u = advect(u, u, v, DT)
        v = advect(v, u, v, DT)
        u = gblur(u, VISC)
        v = gblur(v, VISC)
        # Das Windprofil wird nachgefuehrt, sonst bremst die Viskositaet die
        # ganze Stroemung nach zweihundert Schritten aus.
        u = u * 0.985 + np.repeat(base_u, W, axis=1) * 0.015
        u, v = project(u, v)

        dens = advect(dens, u, v, DT)
        dens = gblur(dens, DENS_DIFF)
        dens += (ref - dens) * REGEN
        frames.append(dens.copy())

        if i % 30 == 0:
            print("  Schritt %d/%d  |v| %.2f  Dichte %.3f"
                  % (i, n_frames, float(np.hypot(u, v).mean()), float(dens.mean())))
    return frames


def shade(d, rng):
    """Dichte zu Bild. Hell auf Schwarz, weil `screen` es so braucht.

    Hier wird auch verdoppelt: die Stroemung kommt aus dem halben Gitter, das
    Korn kommt in voller Aufloesung dazu. Deshalb ist das Ergebnis nicht die
    weichgezeichnete Version einer kleinen Rechnung, sondern hat auf der
    feinsten Skala wieder Struktur — und ohne die sieht jede Simulation nach
    Rechnung aus.
    """
    d = np.repeat(np.repeat(d, 2, axis=0), 2, axis=1)
    d = gblur(d, 1.1)
    x = np.clip(np.power(np.clip(d, 0, 1), GAMMA) * GAIN + LIFT, 0, 1)
    x = x + (rng.random(x.shape).astype(np.float32) - 0.5) * GRAIN
    x = np.clip(x, 0, 1)
    return np.stack([x * TINT[0], x * TINT[1], x * TINT[2]], axis=-1)


def main():
    preview = "--preview" in sys.argv
    rng = np.random.default_rng(11)

    total = WARMUP + N_OUT + FADE
    print("Simulation: %d Schritte bei %dx%d" % (total, W, H))
    frames = simulate(total, rng)[WARMUP:]

    print("Schleife schliessen ueber %d Bilder" % FADE)
    out = []
    for i in range(N_OUT):
        if i < FADE:
            # Gewicht faellt von 1 auf 0: Bild 0 der Ausgabe IST Bild N der
            # Simulation, und das folgt luekenlos auf Bild N-1, das die
            # Ausgabe zuletzt zeigt.
            t = i / FADE
            a = 1.0 - (t * t * (3 - 2 * t))
            out.append(frames[i] * (1 - a) + frames[i + N_OUT] * a)
        else:
            out.append(frames[i])

    if preview:
        from PIL import Image
        for k in (0, 60, 120, 239):
            img = (np.clip(shade(out[k], rng), 0, 1) * 255).astype(np.uint8)
            Image.fromarray(img).save("/tmp/fog-%03d.png" % k)
        print("Vorschau: /tmp/fog-000.png 060 120 239")
        return

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    frames_bytes = [(np.clip(shade(d, rng), 0, 1) * 255).astype(np.uint8).tobytes()
                    for d in out]

    for path, codec, extra in (
        (OUT, "libx264", ["-preset", "slow", "-crf", str(CRF),
                          "-pix_fmt", "yuv420p", "-movflags", "+faststart"]),
        (OUT_WEBM, "libvpx-vp9", ["-b:v", "0", "-crf", str(CRF + 6),
                                  "-deadline", "good", "-cpu-used", "3",
                                  "-pix_fmt", "yuv420p"]),
    ):
        p = subprocess.Popen([
            "ffmpeg", "-y", "-loglevel", "error",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "%dx%d" % (W, H),
            "-r", str(FPS), "-i", "-",
            "-an", "-c:v", codec,
            # Keyframe alle 48 Bilder: die Schleife springt zurueck, und ein
            # Ruecksprung auf ein P-Bild kostet den Decoder einen sichtbaren
            # Ruckler.
            "-g", "48", "-sc_threshold", "0", *extra, path,
        ], stdin=subprocess.PIPE)
        for b in frames_bytes:
            p.stdin.write(b)
        p.stdin.close()
        p.wait()
        print("  %-10s %dx%d  %d Bilder @ %d fps  %.1f MB"
              % (os.path.basename(path), W, H, N_OUT, FPS,
                 os.path.getsize(path) / 1024 / 1024))


if __name__ == "__main__":
    main()
