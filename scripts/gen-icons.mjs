// gen-icons.mjs — Home-Bildschirm- und App-Symbole aus dem Vereinsemblem.
//
//   node scripts/gen-icons.mjs        (aus dem Projektverzeichnis)
//
// Erzeugt (30.10.2026):
//   app/apple-icon.png             180×180  iOS "Zum Home-Bildschirm"
//   public/icon-192.png            192×192  Manifest, Android
//   public/icon-512.png            512×512  Manifest, Splash/Installation
//   public/icon-maskable-512.png   512×512  Manifest, purpose "maskable"
//
// WARUM AUS logo-emblem.png UND NICHT AUS app/icon.svg / app/apple-icon.svg
// Beide SVGs sind Template-Reste: blaues Quadrat (#0066FF), drei weisse
// Striche. Daraus ein Home-Symbol zu rastern hiesse, das Template auf den
// Handybildschirm der Mitglieder zu legen. Das Emblem (schwarze Scheibe,
// Hand, Guertel mit rotem Streifen) ist das Zeichen, das die Seite selbst
// zeigt; es entsteht in gen-logo-emblem.py.
//
// WARUM VOLLE, UNDURCHSICHTIGE FLAECHE
// iOS fuellt Transparenz im apple-touch-icon schwarz oder weiss auf, je nach
// Version, und rundet die Ecken selbst. Android schneidet maskable-Symbole in
// Kreis, Tropfen oder Quadrat. Beides geht nur sauber mit einer randlosen
// Flaeche: #07070a, dieselbe wie --background und viewport.themeColor, damit
// Splash und Symbol eins sind. Ohne Alpha-Kanal gespeichert.
//
// WARUM ZWEI MASSSTAEBE
// Normal fuellt das Emblem 86 % der Kante — der weisse Ring bleibt unter den
// iOS-Ecken frei. Fuer "maskable" verlangt die W3C-Vorgabe, dass alles
// Wichtige im Kreis mit 80 % Durchmesser liegt; das Emblem ist hoeher als
// breit und hat unten den Guertel, also 70 %.

import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(root, "public", "img", "logo-emblem.png");
const BACKGROUND = "#07070a";

const TARGETS = [
  { out: "app/apple-icon.png", size: 180, scale: 0.86 },
  { out: "public/icon-192.png", size: 192, scale: 0.86 },
  { out: "public/icon-512.png", size: 512, scale: 0.86 },
  { out: "public/icon-maskable-512.png", size: 512, scale: 0.7 },
];

for (const { out, size, scale } of TARGETS) {
  const box = Math.round(size * scale);
  const emblem = await sharp(SOURCE)
    .resize(box, box, { fit: "inside", kernel: "lanczos3" })
    .toBuffer({ resolveWithObject: true });
  const { width, height } = emblem.info;
  await sharp({
    create: { width: size, height: size, channels: 3, background: BACKGROUND },
  })
    .composite([
      {
        input: emblem.data,
        left: Math.round((size - width) / 2),
        top: Math.round((size - height) / 2),
      },
    ])
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toFile(join(root, out));
  console.log(`gen-icons: ${out} ${size}×${size} (Emblem ${width}×${height})`);
}
