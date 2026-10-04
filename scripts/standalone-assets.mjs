// Nachbau-Schritt fuer den Standalone-Build.
//
// Next kopiert beim `output: "standalone"`-Build ZWEI Dinge NICHT in den
// Standalone-Ordner: den statischen Client-Build (.next/static) und public/.
// Der Standalone-Server erwartet sie aber genau dort — unter
// .next/standalone/.next/static und .next/standalone/public. Fehlen sie,
// kommt der Server zwar hoch, liefert aber HTML ohne JS/CSS und ohne jedes
// Bild aus public/. Das ist der Fehler, den mit dem Standalone-Build sonst
// jeder einmal (oder zweimal) macht — darum dieser Schritt und dieser Kommentar.
//
// Als Node-Skript (nicht `cp -r`), damit es auf Scalingos Linux-Dyno UND
// lokal unter Windows gleich laeuft.
import { cp } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const standalone = join(root, ".next", "standalone");

await cp(join(root, "public"), join(standalone, "public"), {
  recursive: true,
});
await cp(join(root, ".next", "static"), join(standalone, ".next", "static"), {
  recursive: true,
});

console.log("standalone-assets: public/ und .next/static kopiert");
