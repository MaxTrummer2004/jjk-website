"use client";

/**
 * GateOpening — das Tor im Nebel.
 *
 * ── Was der Leser sieht ─────────────────────────────────────────────────────
 * Ein Pavillon über dem Wasser, im Nebel, formatfüllend. Der Nebel ist Teil
 * der AUFNAHME und kein Effekt darüber — das ist die Auflösung eines langen
 * Umwegs. Erst lag hier ein WebGL-Shader mit fraktalem Rauschen (sechs Runden,
 * jedes Mal ein Schleier statt Wetter), dann eine Strömungssimulation, dann
 * eine echte Rauchaufnahme im `screen`-Blend. Alle drei liegen noch im Repo,
 * alle drei sind ausgehängt: components/fog-canvas.tsx,
 * scripts/gen-fog-video.py, scripts/gen-fog-clip.py und public/video/.
 *
 * Was ein Motiv mitbringt, muss man nicht darüberlegen.
 *
 * Dann scrollt er, und das ist die ganze Bedienung:
 *
 *   1  Das Feuer hinter dem Tor fängt an. Die kalte Platte bleibt, was sie
 *      ist; was hochgefahren wird, ist die zweite Ebene aus derselben
 *      Aufnahme.
 *   2  Die Luft klart, während es heller wird — Feuer trocknet Nebel.
 *   3  Der Titel verblasst, die Fackel öffnet sich aus dem Zeiger.
 *   4  Der Nebel kommt zurück, dichter als vorher, und FRISST das Bild in
 *      Zungen auf. Was übrig bleibt, ist die Nacht, in der die Wand darunter
 *      ohnehin liegt.
 *
 * ── Warum das der Übergang ist, der fünfmal gescheitert ist ─────────────────
 * Wand und Tafeln sind absichtlich aufeinander eingemessen (5,8–10,6 gegen
 * 6,9–12,3 von 255), und deshalb gibt es zwischen ihnen nichts zu zeigen. Vier
 * Kurven, ein klebender Raum und eine Feuerwand später stand die Diagnose fest:
 * ein Übergang braucht einen UNTERSCHIED, keine bessere Kurve. Der Nebel ist
 * kein Überblenden zwischen zwei Bildern — er ist ein drittes Ding, das für
 * einen Moment beide verdeckt, und danach ist man woanders.
 *
 * ── Die Platten ────────────────────────────────────────────────────────────
 *   gate-cold.webp   Architektur, Stein, Struktur. Ändert sich nie.
 *   gate-glow.webp   das Licht: Feuer, Glut, leuchtende Kanten.
 *
 * Beide werden 3,2-fach zu hell gespeichert und in CSS mit `brightness(0.312)`
 * heruntergezogen — dieselbe Regel wie bei Wand und Tafeln, und die Lehre aus
 * dem Papier-Hero davor, dessen Mittelwert von 26 von 255 nur ein Zehntel des
 * Wertebereichs nutzte und deshalb in Bändern zerfiel.
 * Erzeugt von scripts/gen-gate.py.
 *
 * !! Die aktuelle Quelle ist ein Platzhalter ohne geklärte Rechte — siehe den
 *    Kopf von scripts/gen-gate.py. Vor dem Livegang ersetzen.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

import Link from "next/link";
import GlassCursor from "@/components/glass-cursor";
import FrameBorder from "@/components/frame-border";
import {
  VeilCanvas,
  type VeilCanvasHandle,
} from "@/components/veil-canvas";
import { KanjiTitle } from "@/components/kanji-title";
import { setOpeningDone } from "@/lib/opening";
import { useReducedMotion } from "@/lib/motion";
import { useIsTouch } from "@/lib/pointer";
import { useInkTransition } from "@/lib/ink-transition-context";
import { siteConfig } from "@/lib/config";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Erst mounten, wenn der Hauptthread Luft hat.
 *
 * Im ersten Bild dieser Seite starteten VIER WebGL-Kontexte gleichzeitig:
 * der Glass-Cursor mit dem Hero-Motiv, der Rahmen des Siegels, der Nebel des
 * Uebergangs und das Tusche-Overlay des Seitenwechsels — dazu 300 ms spaeter
 * die Glutfahne mit three.js und Bloom. Gebraucht wird in diesem Moment genau
 * einer davon, naemlich der mit dem Bild. Die anderen drei richten ihren
 * Kontext ein, uebersetzen ihre Shader und laden ihre Texturen, und all das
 * passiert auf demselben Thread, der gerade das erste Bild zeichnen soll.
 * Genau das war das kurze Schwarz mit dem Haenger danach.
 *
 * `requestIdleCallback` verschiebt sie in die erste Luecke NACH dem ersten
 * Bild. Das Zeitlimit ist die Notbremse fuer Browser, die nie Leerlauf
 * melden — und fuer Safari, das die Funktion bis heute nicht hat.
 */
function useIdleMount(timeoutMs = 900): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (h: number) => void;
    };

    if (typeof w.requestIdleCallback === "function") {
      const handle = w.requestIdleCallback(() => setReady(true), {
        timeout: timeoutMs,
      });
      return () => w.cancelIdleCallback?.(handle);
    }

    const t = window.setTimeout(() => setReady(true), timeoutMs);
    return () => window.clearTimeout(t);
  }, [timeoutMs]);

  return ready;
}

/**
 * Wo die Fackel den Zeiger übernimmt.
 *
 * Die Zahlen in `apply` unten sind auf einen Ablauf verteilt, dessen langer
 * Teil VORNE liegt: bis etwa 0.55 passiert nur, was das Bild betrifft — die
 * Glut steigt, die Kamera faehrt hinein, der Titel verblasst. Erst danach
 * setzt der Uebergang ein. Das ist Absicht und war vorher andersherum: der
 * Nebel begann bei 0.20, also praktisch sofort, und das Bild war weg, bevor
 * man es angesehen hatte.
 */
const HANDOVER = 0.62;

function seg(p: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function GateOpening(): ReactNode {
  const reduced = useReducedMotion();
  const isTouch = useIsTouch();
  const { startTransition } = useInkTransition();
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const handed = useRef<boolean>(false);
  /* Der Nebel wird nicht ueber den React-Zustand gefuettert: das waere ein
     Rendering pro gescrolltem Pixel. Siehe components/veil-canvas.tsx. */
  const veil = useRef<VeilCanvasHandle>(null);
  /* Siegelrahmen und Nebel warten auf die erste freie Luecke — siehe oben. */
  const late = useIdleMount();



  useEffect(() => {
    const root = rootRef.current;
    const stage = stageRef.current;
    if (!root || !stage) return;

    if (reduced) {
      stage.style.setProperty("--plate", "1");
      stage.style.setProperty("--veil-rise", "0");
      stage.style.setProperty("--heat", "0");
      stage.style.setProperty("--zoom", "1");
      stage.style.setProperty("--soft", "0px");
      stage.style.setProperty("--lockup", "1");
      stage.style.setProperty("--night", "0");
      stage.style.setProperty("--cue", "1");
      stage.style.setProperty("--blackout", "0");
      stage.style.setProperty("--member-pe", "auto");
      stage.style.setProperty("--exit", "1");
      stage.style.setProperty("--fray", "0px");
      veil.current?.set(0);
      setOpeningDone(true);
      return;
    }

    setOpeningDone(false);
    handed.current = false;
    const wall = root.closest<HTMLElement>(".jjk-wall-light");


    const apply = (p: number): void => {
      const s = stage.style;

      // ── Der Uebergang, und er ist der Grund fuer den ganzen Umbau ────────
      // Das BILD geht weg, der NEBEL bleibt. Nicht beides zusammen, nicht
      // nacheinander — der Grund sinkt unter dem Wetter weg, und wer scrollt,
      // steht danach in derselben Luft an einem anderen Ort. Genau das macht
      // IZANAMI, und es ist der Grund, warum es dort funktioniert und bei uns
      // fuenf Anlaeufe lang nicht: wir haben immer BEIDES bewegt.
      // Das Bild bleibt laenger stehen als vorher: was es verschluckt, ist
      // jetzt die Nebelwand, nicht seine eigene Deckkraft. Es sinkt nur noch
      // hinterher, damit am Ende wirklich nichts mehr durchscheint.
      // Alles Spaete endet bei 0.88 und nicht bei 1.0: ab dem Moment, in dem
      // der Nebel deckt, gibt es nichts mehr zu sehen, und jeder weitere
      // Scrollpixel ist eine schwarze Flaeche. Die letzten zwoelf Prozent sind
      // nur noch das Hinausschieben der klebenden Buehne.
      s.setProperty("--plate", (1 - 0.94 * seg(p, 0.62, 0.93)).toFixed(3));

      // ── Die Nebelwand ───────────────────────────────────────────────────
      // Vorbild white-desert.com: eine Wand aus Dunst schiebt sich beim
      // Scrollen ueber die Aufnahme und verschluckt sie. Kein Video, keine
      // Simulation, keine laufende Animation — ein Bild mit Alphakanal, das
      // der Scroll bewegt. Bei uns schwarz, weil die Sektion darunter ohnehin
      // schwarz ist: was den Hero verschluckt, IST der Raum, in dem es
      // weitergeht.
      //
      // Zwei Werte, und beide muessen laufen. Nur Deckkraft liest sich als
      // Ausblenden; nur Bewegung schiebt eine sichtbare Kante ins Bild. Die
      // Wand kommt von UNTEN, weil dort der Boden ist und Nebel steigt.
      s.setProperty("--veil-rise", seg(p, 0.54, 0.92).toFixed(3));

      // ── Die Glut im Grund ───────────────────────────────────────────────
      // Der GRUND wird roeter, nicht der Nebel. Der Nebel ist die Nacht, und
      // Nacht hat keine Farbe; was Farbe bekommt, ist die Aufnahme darunter.
      //
      // Inhaltlich ist das die Ueberleitung: was unter dem Nebel wartet, ist
      // eine Wand, die man mit einer Fackel liest. Das Rot kuendigt das Feuer
      // an, das gleich der Zeiger sein wird.
      s.setProperty("--heat", seg(p, 0.05, 0.66).toFixed(3));

      // ── Die Kamera geht hinein ──────────────────────────────────────────
      // Ab dem ERSTEN gescrollten Pixel, und das ist der ganze Zweck: vorher
      // passierte die erste Drittelstrecke lang nichts, weil alles, was sich
      // bewegt, erst spaeter einsetzte. Ein Bild, das sich beim Scrollen nicht
      // ruehrt, liest sich als eingefroren, und der Leser hoert auf zu
      // scrollen.
      //
      // 1.0 → 1.16 ist wenig genug, dass es niemand als Zoom benennt, und
      // genug, dass die Bewegung ankommt. Die Unschaerfe laeuft mit: die
      // Kamera faehrt in etwas hinein, das nicht mehr ihre Schaerfeebene ist.
      s.setProperty("--zoom", (1 + 0.19 * seg(p, 0, 0.92)).toFixed(4));
      s.setProperty("--soft", (10 * seg(p, 0.10, 0.92)).toFixed(2) + "px");

      // Das Feuer brennt schon, wenn die Seite aufgeht — es wird nur staerker.


      // Die Bühne klebt, ihr Abstand zur Wandoberkante wächst also mit jedem
      // gescrollten Pixel. Ohne diese Zeile wandert die Fackel aus dem Bild.
      s.setProperty(
        "--sec-y",
        (stage.getBoundingClientRect().top -
          (wall ? wall.getBoundingClientRect().top : 0)).toFixed(1) + "px",
      );
      s.setProperty("--lockup", (1 - seg(p, 0.36, 0.64)).toFixed(3));
      s.setProperty("--member-pe", p >= 0.58 ? "none" : "auto");
      s.setProperty("--night", seg(p, 0.62, 0.93).toFixed(3));

      // ── Die Uebergabe ───────────────────────────────────────────────────
      // Zum Schluss ist die Buehne nicht "fast schwarz", sondern GENAU die
      // Farbe der Seite. Der Unterschied ist der ganze Punkt: der Trigger
      // endet, wenn die Buehne unten ankommt, und danach faehrt sie eine volle
      // Bildschirmhoehe hinaus. Ihre Unterkante wandert dabei durchs Bild. Was
      // in ihr steht, entscheidet, ob man diese Kante sieht — und ein Schwarz,
      // das um sechs Stufen daneben liegt, sieht man.
      //
      // Fertig bei 0.95, also gut vor dem Ende: die Deckung muss stehen, BEVOR
      // die Buehne sich in Bewegung setzt, nicht waehrenddessen.
      //
      // Zwei Ebenen, und die Reihenfolge ist der Punkt. Zuerst frisst der
      // Luma-Nebel das Bild in Schwaden auf — das ist der Uebergang, den man
      // sieht. Die flache Deckung kommt erst danach und garantiert nur noch,
      // dass am Ende wirklich nichts mehr steht: sie ist die Versicherung,
      // nicht der Effekt. Faellt WebGL aus, bleibt sie allein uebrig, und der
      // Uebergang ist schlichter, aber nicht kaputt.
      veil.current?.set(seg(p, 0.58, 0.94));
      s.setProperty("--blackout", seg(p, 0.86, 0.985).toFixed(3));
      // Die Fackel ist offen, BEVOR die Sektion endet — sonst uebergibt der
      // Hero an eine Wand, auf der noch kein Licht liegt, und der Leser sieht
      // eine schwarze Flaeche, bis er den Zeiger bewegt.
      s.setProperty("--pool-open", seg(p, HANDOVER, 0.90).toFixed(3));
      s.setProperty("--torch-on", p >= HANDOVER ? "1" : "0");
      s.setProperty("--cue", (1 - seg(p, 0.01, 0.07)).toFixed(3));

      const open = p >= HANDOVER;
      if (open !== handed.current) {
        handed.current = open;
        setOpeningDone(open);
      }
    };

    apply(0);

    // ══ Der Riegel auf dem Handy ═════════════════════════════════════════
    //
    // Gemeldet: "beim scroll im hero soll die website wissen wie lange mein
    // handy ist und nicht weiter lassen bis uebergang war, dann darf es erst
    // weitergehen oder ueberhaupt irgendwas sich veraendern."
    //
    // Am Rechner haengt der Fortschritt an der Scrollposition: die Buehne
    // klebt, die Seite laeuft unter ihr durch, und der Weg dieser Strecke IST
    // die Uhr des Uebergangs. Auf dem Handy geht diese Rechnung nicht auf, und
    // zwar aus zwei Gruenden gleichzeitig:
    //
    //   · Ein einziger Wisch traegt leicht ueber eine ganze Bildschirmhoehe.
    //     Der komplette Uebergang rauscht damit in einer Bewegung durch, und
    //     was man sieht, ist nicht der Ablauf, sondern sein Endbild.
    //   · Die sichtbare Hoehe eines Handys ist keine Zahl, sondern ein
    //     Bereich: die Adressleiste faehrt beim Scrollen ein und aus. `svh`
    //     ist die KLEINE dieser Hoehen und damit fest — die Buehne ist also
    //     zeitweise niedriger als der Schirm, und unter ihr schaut das
    //     naechste Stueck Seite hervor. Genau das ist das "alles zieht mit".
    //
    // Beides verschwindet, wenn der Fortschritt nicht mehr an der Position
    // haengt. Hier zaehlt der zurueckgelegte WISCHWEG, und die Seite bewegt
    // sich dabei ueberhaupt nicht: sie steht bei null, bis der Uebergang durch
    // ist. Erst dann gibt der Riegel auf, die Buehne blendet ab, und dahinter
    // steht die naechste Sektion an ihrem Anfang.
    //
    // Der Weg ist bewusst an `innerHeight` gebunden und nicht an eine feste
    // Pixelzahl — das ist das "wissen, wie lang mein Handy ist". Auf einem
    // langen Geraet wischt man weiter, der Uebergang dauert entsprechend
    // laenger, und das Verhaeltnis von Geste zu Wirkung bleibt ueberall
    // dasselbe.
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;

    if (touch) {
      const html = document.documentElement;
      let p = 0;
      let lastY = 0;
      let armed = false;

      // Etwas mehr als eine Bildschirmhoehe: lang genug, dass ein einzelner
      // Fling nicht durchreicht, kurz genug, dass niemand dreimal nachfasst.
      const distance = (): number => Math.max(620, window.innerHeight * 1.15);

      const setLock = (on: boolean): void => {
        armed = on;
        // Der eigentliche Riegel. `touch-action: none` nimmt der Geste die
        // Scrollbedeutung, bevor der Browser sie vergibt — das ist wirksamer
        // als preventDefault allein, weil es auch den Nachlauf eines Flings
        // und das Ueberdehnen am Rand erfasst. preventDefault unten bleibt
        // trotzdem stehen: die Klasse greift erst beim naechsten Zug.
        html.classList.toggle("jjk-gate-locked", on);
        stage.style.setProperty("--exit", on ? "1" : "0");
        stage.style.setProperty("--gate-pe", on ? "auto" : "none");
      };

      const onStart = (e: TouchEvent): void => {
        lastY = e.touches[0]?.clientY ?? 0;
      };

      const onMove = (e: TouchEvent): void => {
        const y = e.touches[0]?.clientY ?? lastY;
        // Positiv = Finger nach oben = "weiter", wie beim Scrollen.
        const dy = lastY - y;
        lastY = y;

        if (!armed) {
          // Der Rueckweg. Wer von unten bis ganz nach oben kommt und dort
          // weiterzieht, soll den Uebergang rueckwaerts bekommen und nicht
          // gegen eine Wand laufen. Ohne das waere der Hero einmal gesehen
          // und danach unerreichbar.
          if (window.scrollY <= 0 && dy < 0) setLock(true);
          else return;
        }

        e.preventDefault();
        const next = p + dy / distance();
        p = next < 0 ? 0 : next > 1 ? 1 : next;
        apply(p);
        if (p >= 1) setLock(false);
      };

      // Nach einem Neuladen mitten auf der Seite waere ein scharfer Riegel
      // eine Sperre ohne Anlass — der Uebergang liegt dann laengst hinter dem
      // Leser.
      if (window.scrollY <= 1) {
        setLock(true);
        apply(0);
      } else {
        p = 1;
        apply(1);
        setLock(false);
      }

      window.addEventListener("touchstart", onStart, { passive: true });
      window.addEventListener("touchmove", onMove, { passive: false });

      return () => {
        window.removeEventListener("touchstart", onStart);
        window.removeEventListener("touchmove", onMove);
        html.classList.remove("jjk-gate-locked");
        setOpeningDone(true);
      };
    }

    const trigger = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      // "bottom bottom" und nicht "bottom top" — das ist die Rechnung, an der
      // dieser Uebergang mehrfach gescheitert ist.
      //
      // Eine klebende Buehne bewegt sich gar nicht, solange die Sektion unter
      // ihr durchlaeuft; sie bewegt sich erst, wenn die Sektion zu Ende ist.
      // Der Weg, auf dem die Buehne STEHT, ist Sektionshoehe minus
      // Buehnenhoehe — bei 175svh und 100svh also 75svh, und das ist genau
      // "bottom bottom".
      //
      // Mit "bottom top" lief der Fortschritt stattdessen ueber die vollen
      // 175svh. Alle Kurven waren dadurch auf mehr als das Doppelte gestreckt:
      // bei p = 0.43, wo die Buehne sich in Bewegung setzt, stand der Nebel
      // erst bei einem Drittel. Die Buehnenkante wanderte also mitten durch
      // einen noch halb durchsichtigen Hero — und das war die Linie im Bild.
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => apply(self.progress),
      // Nach einem Fensterwechsel stimmen sonst die gerechneten Grenzen nicht
      // mehr mit svh ueberein.
      invalidateOnRefresh: true,
    });

    // ── Das Hinausfahren ──────────────────────────────────────────────────
    // Ein zweiter Trigger, und er faengt genau dort an, wo der erste aufhoert.
    // Er hat seine eigene Uhr, weil er eine andere Sache misst: nicht den
    // Ablauf im Hero, sondern die 100svh, in denen die Buehne den Schirm
    // verlaesst. Beides an EINEN Trigger zu haengen war der Fehler davor —
    // dann streckt sich der Ablauf auf den doppelten Weg.
    //
    // Was er tut: die Buehne durchsichtig werden lassen. Weil #about durch den
    // negativen Rand direkt dahinter liegt, kommt die Wand dabei durch die
    // schwarze Flaeche hindurch zum Vorschein, statt an deren Unterkante
    // hervorzurutschen. Eine Flaeche, die sich aufloest, hat keinen Rand, an
    // dem man sie von der naechsten unterscheiden koennte — und damit ist die
    // waagrechte Linie strukturell weg und nicht nur uebertuencht.
    const exit = ScrollTrigger.create({
      trigger: root,
      start: "bottom bottom",
      end: "bottom top",
      scrub: true,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        // Frueh, nicht ueber die volle Strecke: je laenger die Buehne halb
        // sichtbar bleibt, desto laenger steht ihre Unterkante mitten im Bild.
        // Bei 0.28 ist sie verschwunden, waehrend diese Kante noch im unteren
        // Fuenftel liegt.
        stage.style.setProperty("--exit", (1 - seg(self.progress, 0, 0.28)).toFixed(3));
        // Gleichzeitig franst diese Kante aus — siehe die Maske an
        // .jjk-gate-stage. Beides zusammen, nicht eins davon: das Ausblenden
        // nimmt der Kante den Kontrast, die Maske nimmt ihr die Geradheit.
        stage.style.setProperty(
          "--fray",
          (26 * seg(self.progress, 0, 0.18)).toFixed(1) + "svh",
        );
      },
    });

    return () => {
      trigger.kill();
      exit.kill();
      setOpeningDone(true);
    };
  }, [reduced]);

  return (
    <section
      ref={rootRef}
      className="jjk-gate"
      aria-label={siteConfig.fullName}
    >
      <div ref={stageRef} className="jjk-gate-stage">
        {/* Das Bild, und Glas darueber, das dem Zeiger folgt —
            components/glass-cursor.tsx (React Bits Pro, lizenziert).

            Es ist EINE Textur: `gate-hero.webp` enthaelt Struktur und Licht
            bereits gemischt, weil diese Komponente nur ein Bild kennt. Die
            Positionierung macht der Wrapper und nicht die Komponente selbst —
            sie setzt intern `relative`, und zwei Klassen, die beide `position`
            setzen, entscheiden ihren Streit ueber die Reihenfolge im
            erzeugten Stylesheet. Das hat in diesem Projekt schon einmal zwei
            Runden gekostet. */}
        <div className="jjk-gate-canvas">
          {/* Kein Zeiger auf Touch → kein Glass-Effekt → kein WebGL-Kontext.
              Der CSS-Hintergrund von .jjk-gate-canvas uebernimmt. */}
          {!isTouch && <GlassCursor src="/img/gate-hero.webp" width="100%" height="100%" />}
        </div>

        {/* Die Glut im Grund. Liegt auf den Platten und UNTER dem Nebel: was
            roeter wird, ist die Aufnahme, nicht das Wetter davor. Der Nebel
            bleibt schwarz — er ist die Nacht, und Nacht hat keine Farbe. */}
        <div className="jjk-gate-tint" aria-hidden="true" />

        {/* Die Nebelwand. Steht VOR den Platten und HINTER Schleier, Fackel
            und Schrift: sie verschluckt das Bild, nicht die Seite. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="jjk-gate-smoke"
          src="/img/veil-smoke.webp"
          alt=""
          aria-hidden="true"
          decoding="async"
          draggable={false}
        />


        {/* Die Gegenwand. Der Nebel kommt von unten und deckt zuverlaessig nur
            seine untere Haelfte — darueber blieb flaches Schwarz vom Schleier
            stehen, und die Grenze zwischen strukturiertem und flachem Schwarz
            war der Fetzen, den man gesehen hat. Zwei Schwarz derselben Farbe
            sind eben trotzdem zwei Flaechen, wenn eines Struktur hat.

            Also schliesst es sich von BEIDEN Seiten: der Nebel steigt, diese
            Wand faellt, und sie treffen sich in der Mitte — beide mit einem
            Verlauf, also ohne Kante irgendwo. */}
        <div className="jjk-gate-close" aria-hidden="true" />

        {/* Die Nacht und die Fackel darin — dieselben zwei Elemente wie an der
            Wand darunter, mit demselben Zeiger aus derselben WallLight. */}
        <div className="jjk-veil jjk-gate-veil" aria-hidden="true" />
        <div className="jjk-candle jjk-gate-candle" aria-hidden="true" />

        <h1 className="sr-only">
          {siteConfig.fullName} — Brazilian Jiu-Jitsu in Graz
        </h1>

        {/* Oben, nicht in der Mitte: die Bildmitte gehört dem Durchgang, und
            der ist das Hellste im Bild. Schrift darüber wäre ein Kampf, den
            die Schrift verliert. */}
        <div className="jjk-gate-lockup" aria-hidden="true">
          <span className="jjk-gate-kana" lang="ja">
            じゅうじゅつかいせん
          </span>
          <KanjiTitle className="jjk-gate-kanji" delay={0.2} stagger={0.3} />
          <span className="jjk-gate-latin">
            {siteConfig.fullName.toUpperCase()}
          </span>
        </div>

        <div className="jjk-gate-mark" aria-hidden="true">
          GRAZ
        </div>

        <div className="jjk-gate-cue" aria-hidden="true">
          <span className="jjk-gate-cue-jp" lang="ja">
            さきへ
          </span>
          <span className="jjk-gate-cue-en">SCROLL</span>
          <span className="jjk-gate-cue-arrow" />
        </div>

        {/* ── Der Nebeneingang, als Siegel ───────────────────────────────
            Ein Hanko oben rechts: Zinnoberumriss, zwei Zeichen darin, die
            Beschriftung daneben.

            Der Umriss ist FrameBorder aus React Bits Pro — in der Bibliothek
            woertlich "animated noise-textured border", also eine Linie, deren
            Staerke von Rauschen lebt statt konstant zu sein. Genau das braucht
            ein Siegel: eine Kante, die nicht ueberall gleich stark aufliegt.
            Der Katalog hat keinen Knopf und keinen Knopf-Effekt; das hier ist
            der einzige Baustein darin, der eine Kontur zeichnet, und er
            zeichnet sie besser als eine CSS-Linie es koennte.

            Was React Bits nicht kann, ist die FORM: der Shader zeichnet ein
            Rechteck. Die Siegelkontur entsteht dadurch, dass die fertige
            Zeichnung durch einen Turbulenzfilter verzogen wird — dieselbe
            Technik wie beim gebissenen Rand des Zeigersiegels
            (`--seal-edge`, siehe .jjk-cursor-seal). Ein Stempel liegt auf
            saugendem Papier nie ganz sauber auf, und ein `border-radius` sieht
            man dieser Tatsache an.

            Der Filter steht als eigenes SVG in der Buehne, weil ein
            SVG-Filter ein Dokumentknoten sein muss und nicht in CSS
            geschrieben werden kann.

            `backgroundColor` ist SCHWARZ und nicht die Seitenfarbe, und das
            ist keine Kosmetik: der Shader fuellt immer seine ganze Flaeche
            (`gl_FragColor = vec4(result, uAlpha)`), es gaebe hier also ein
            deckendes Quadrat mitten auf dem Hero. Die Ebene liegt deshalb im
            `screen`-Blend, und in dem ist Schwarz das neutrale Element: die
            Fuellung verschwindet restlos, uebrig bleibt nur die Linie. Dieselbe
            Rechnung wie bei `.jjk-plate-glow` und beim Nebel davor. */}
        <svg width="0" height="0" className="jjk-member-seal-defs" aria-hidden="true">
          <filter id="jjk-seal-bite">
            {/* baseFrequency klein = grobe Ausbrueche, gross = feines
                Ausfransen. 0.05 trifft die Koernung von Papier bei dieser
                Groesse; darueber franst es zu Staub aus. */}
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.05"
              numOctaves="4"
              seed="11"
              result="bite"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="bite"
              scale="6"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>

          {/* Dieselbe Kante, schwaecher — fuer das kleinere Siegel auf dem
              Handy. Die Staerke muss ein ATTRIBUT sein und kann deshalb nicht
              aus einer CSS-Variablen kommen; ein zweiter Filter ist der
              einzige Weg. Bei 3.4rem Kantenlaenge verschiebt scale 6 die
              Kontur um ein Sechstel ihrer eigenen Laenge, und was auf 4rem
              als angedrueckt liest, kippt dort sichtbar schief. */}
          <filter id="jjk-seal-bite-s">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.07"
              numOctaves="4"
              seed="11"
              result="bite"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="bite"
              scale="3"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </svg>

        <div className="jjk-gate-member">
          <Link
            href="/mitglieder"
            className="jjk-gate-member-link"
            onClick={(e) => {
              e.preventDefault();
              startTransition("/mitglieder");
            }}
          >
            <span className="jjk-member-seal">
              <span
                className="jjk-member-seal-edge"
                data-ready={late ? "1" : "0"}
                aria-hidden="true"
              >
                {late ? (
                /* Der Rahmen folgt seinem Kasten und hat KEIN eigenes Mass.
                   Feste 4.15rem waren der Fehler: auf dem Handy ist
                   .jjk-member-seal 3.4rem gross, das Canvas blieb aber
                   4.15rem und stand damit zwoelf Pixel ueber seinen Kasten
                   hinaus — nach rechts unten, weil .jjk-member-seal-edge oben
                   links verankert ist. Der Rahmen sass also nicht um die
                   Zeichen, sondern daneben. Das ist alles, was "Symbol schief"
                   und "Schrift nicht mittig" waren: eine Ursache, drei
                   Symptome. Am Rechner ist 100% exakt 4.15rem, dort aendert
                   sich rechnerisch nichts. */
                <FrameBorder
                  width="100%"
                  height="100%"
                  color="#d8341c"
                  backgroundColor="#000000"
                  speed={0.04}
                  borderWidth={0.085}
                  falloff={4}
                  noiseScale={3.6}
                  noiseStrength={0.72}
                  noiseOctaves={3}
                  intensity={0.52}
                  gamma={2.2}
                  opacity={0.95}
                />
                ) : null}
              </span>
              <span className="jjk-member-seal-face" aria-hidden="true">
                <span>会</span>
                <span>員</span>
              </span>
            </span>
            <span className="jjk-gate-member-label">Für Mitglieder</span>
          </Link>
        </div>

        {/* Der Nebel, der das Bild auffrisst — die Form der Deckung kommt aus
            einer Luma-Karte, siehe components/veil-canvas.tsx. */}
        {late ? <VeilCanvas ref={veil} className="jjk-gate-luma" /> : null}

        {/* Die Uebergabe an die Sektion darunter. Muss das letzte Element in
            der Buehne sein und liegt auf z-index 60 — siehe .jjk-gate-blackout. */}
        <div className="jjk-gate-blackout" aria-hidden="true" />
      </div>

    </section>
  );
}

export default GateOpening;
