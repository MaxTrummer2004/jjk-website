/**
 * ============================================================================
 * JJK — JIU-JITSU KAISEN ACADEMY · SITE CONFIGURATION
 * ============================================================================
 * All copy, links and data for the site live here so the whole gym page can
 * be re-skinned by editing a single file.
 */

export const siteConfig = {
  name: "JJK",
  fullName: "Jiu-Jitsu Kaisen Academy",
  description:
    "Brazilian Jiu-Jitsu mitten in Graz. Trainer, die unterrichten wollen, Partner, die dich besser machen, und eine Matte, auf der aus Anfängern Schwarzgurte werden.",
  url: "https://jjk.academy",
  email: "info@jjk.academy",
  phone: "+43 699 17261640",
  /**
   * Vereinskonto fuer die Beitraege. Leer, solange die Daten nicht vorliegen —
   * dann sagt der Statusblock im Mitgliederbereich "bekommst du im Training"
   * statt eine erfundene Nummer zu zeigen. Eine falsche IBAN auf einer
   * Zahlungsaufforderung ist schlimmer als keine.
   */
  bank: {
    holder: "Jiu Jitsu Kaisen Akademie",
    iban: "AT56 2081 5000 4769 9848",
    bic: "STSPAT2GXXX",
  },
  address: {
    street: "Triester Straße 391",
    city: "8055 Graz",
    maps: "https://maps.google.com/?q=Triester+Stra%C3%9Fe+391+8055+Graz",
  },
  social: {
    // Ohne den Tracking-Parameter (?obrf=…) aus dem geteilten Link.
    instagram: "https://www.instagram.com/jiu.jitsu.kaisen_",
    youtube: "https://youtube.com",
    tiktok: "https://tiktok.com",
    facebook: "https://facebook.com",
  },
} as const;

export const nav = {
  links: [
    { label: "Training", href: "#schedule" },
    { label: "Trainer", href: "#coaches" },
    { label: "Preise", href: "#pricing" },
    { label: "Fragen", href: "#faq" },
  ],
  cta: { label: "Mitglied werden", href: "/beitreten" },
  /**
   * Die Haupthandlung der Seite, als Knopf in der Kopfleiste.
   *
   * Fuehrt seit Oktober 2026 auf die Beitrittserklaerung (/beitreten).
   * Vorher zeigte er auf die Preise, weil es das Formular noch nicht gab.
   * Die Kopfleiste liest ausschliesslich diese Zeile.
   */
  signup: { label: "Mitglied werden", href: "/beitreten" },
} as const;

/**
 * Why anybody does this — four claims, and the picture that answers each one.
 *
 * `label` is what the frame is captioned with, `claim` is what the reader
 * hovers, and `image` is what they get for hovering it. Kept together in one
 * place because they are one thing: components/features-3.tsx is built so that
 * a claim without a picture, or a picture without a claim, cannot happen.
 *
 * The images are placeholders until there are photographs of the room. Swapping
 * them is these four lines and nothing else.
 */
export const reasons = [
  {
    label: "Self-defense",
    claim: "Real self-defense that works against bigger opponents",
    image: "/img/mock-1.jpg",
  },
  {
    label: "Coaching",
    claim: "World-class black-belt coaching, every single class",
    image: "/img/mock-2.jpg",
  },
  {
    label: "Conditioning",
    claim: "Functional conditioning: get in the best shape of your life",
    image: "/img/mock-3.jpg",
  },
  {
    label: "The team",
    claim: "A tight-knit team that has your back on and off the mat",
    image: "/img/mock-4.jpg",
  },
] as const;

/**
 * Die Programme — der laengere Text hinter einem Klick auf eine Einheit im
 * Wochenplan (Detailfenster in components/schedule.tsx). `title` muss genau
 * dem `program` der Eintraege in `schedule` entsprechen; die Termine im
 * Fenster werden daraus gerechnet, deshalb stehen hier nur die Tage.
 *
 * `kanji` ist das Wasserzeichen im Fenster — 寝技 newaza, 道着 dōgi,
 * 拳闘 kentō, 自由 jiyū. Es sagt dasselbe wie der Titel und wird deshalb
 * vor Screenreadern versteckt.
 *
 * Seit 29.10.2026 nur noch vier (neuer Trainingsplan des Vereins). BJJ
 * Basic, Advanced Training, Ringen, Sparring und Wettkampftraining gibt es
 * nicht mehr, und mit ihnen die Kanji 基本 上級 立技 乱取 試合. Bewusst nur
 * Zeichen, die schon vorher im Quelltext standen: jedes neue Kanji hiesse
 * scripts/gen-fonts.py neu laufen lassen. "Matte frei" (Mo–Fr vor dem
 * Training) hat absichtlich KEINEN Eintrag — wie vorher "Freies Training"
 * ist das keine Einheit mit Inhalt, sondern offene Matte; ohne `program`
 * ist der Slot im Plan auch nicht anklickbar.
 */
export const programs = [
  {
    title: "Jiu-Jitsu No-Gi",
    kanji: "寝技",
    level: "Jedes Level",
    blurb:
      "Montag, Mittwoch und Donnerstag. Technik und Sparring ohne Gi.",
    tag: "No-Gi",
  },
  {
    title: "Jiu-Jitsu Gi",
    kanji: "道着",
    level: "Jedes Level",
    blurb:
      "Dienstag und Freitag. Technik und Sparring im Gi.",
    tag: "Gi",
  },
  {
    title: "Boxen",
    kanji: "拳闘",
    level: "Jedes Level",
    blurb:
      "Dienstag und Donnerstag. Boxtechnik, Pratzen und Partnerübungen.",
    tag: "Boxen",
  },
  {
    title: "Open Mat",
    kanji: "自由",
    level: "Jedes Level",
    blurb:
      "Samstag, Gi und No-Gi. Freies Rollen für alle. Die Zeit ist variabel und wird in der Gruppe abgesprochen.",
    tag: "Samstag",
  },
] as const;

/**
 * Die Trainer.
 *
 * `bio` ist noch leer. Das ist kein Versehen: im Repo lagen nur vier
 * Bilddateien, und einem Trainer einen Lebenslauf anzudichten waere auf einer
 * Vereinsseite ein peinlicher Fehler. Die Oberflaeche kommt damit klar — ein
 * leerer Text laesst das Infofenster den Rest zeigen.
 *
 * `beltHex` ist die Farbe des Balkens neben der Graduierung. Schwarz auf
 * dunklem Grund waere unsichtbar, deshalb ein sehr dunkles Grau mit heller
 * Kante statt reinem Schwarz — es soll als Guertel lesbar sein, nicht als
 * Loch.
 *
 * `teaches` verweist auf `name` aus `programs` — damit steht im Infofenster,
 * welche Einheiten der Trainer haelt, und die Zeiten kommen aus `schedule`,
 * statt hier ein zweites Mal gepflegt zu werden.
 *
 * Die Reihenfolge ist die Reihenfolge im Karussell.
 *
 * Liri, Ervin, Ricardo und Gabriel sind seit 29.10.2026 nicht mehr auf der Seite
 * (Auftraggeber). Ihre Bilder liegen weiter unter public/img/coaches/.
 */
export const coaches = [
  {
    name: "Wolfi",
    belt: "BJJ",
    beltHex: "#16161c",
    image: "/img/coaches/wolfi.jpg",
    bio: "",
    teaches: [] as string[],
  },
  {
    name: "Matthias",
    belt: "BJJ",
    beltHex: "#16161c",
    image: "/img/coaches/matthias.jpg",
    bio: "",
    teaches: [] as string[],
  },
  {
    name: "Sophie",
    belt: "Boxen",
    beltHex: "#1d4ed8",
    image: "/img/coaches/sophie.jpg",
    bio: "",
    teaches: [] as string[],
  },
] as const;

export type ScheduleClass = {
  time: string;
  name: string;
  /** Einzeiler unter dem Namen — Format, Inhalt, Zielgruppe. */
  note?: string;
  /**
   * Die KURSART. Wie sie in Farbe uebersetzt wird, steht in
   * components/schedule.tsx (`toneOf`).
   *
   * Seit 29.10.2026 belegt: nogi, gi, boxen, openmat, frei. basic, advanced,
   * ringen, sparring und wettkampf sind ungenutzt, stehen aber noch im Typ,
   * bis die Darstellung in schedule.tsx nachgezogen ist.
   */
  kind:
    | "basic"
    | "gi"
    | "nogi"
    | "advanced"
    | "ringen"
    | "sparring"
    | "wettkampf"
    | "boxen"
    | "openmat"
    | "frei";
  /**
   * Emoji hinter dem Namen: 🥋 Gi, 🤼 No-Gi, beides fuer Gi und No-Gi,
   * 🥊 Boxen. Matte frei traegt keins.
   */
  attire?: "gi" | "nogi" | "both" | "box";
  /**
   * Zweite Moeglichkeit im selben Slot ("entweder – oder"). War fuer den
   * Mittwoch gebaut (Wettkampftraining ODER Special Wednesday); seit
   * 29.10.2026 von keinem Eintrag mehr benutzt.
   */
  alt?: { name: string; attire?: "gi" | "nogi" | "both" | "box" };
  /**
   * Das empfohlene Level — der Text im Chip. Seit 29.10.2026 ist alles
   * "jedes" (der Verein unterscheidet keine Stufen mehr); anfaenger,
   * intermediate und advanced sind ungenutzt.
   */
  level: "anfaenger" | "jedes" | "intermediate" | "advanced";
  /**
   * `title` des zugehoerigen Eintrags in `programs`.
   *
   * Der Wochenplan ist die einzige Darstellung der Programme; dieser
   * Schluessel holt den laengeren Text ins Detailfenster. Keine Kopie der
   * Texte, nur ein Verweis.
   */
  program?: string;
};

/**
 * Der Wochenplan nach dem Aushang des Vereins vom 29.10.2026.
 *
 * Seit 29.10.2026 (Auftraggeber: "Trainingsplan umaendern nach dem Bild"):
 * sieben Kurse pro Woche — Jiu-Jitsu No-Gi 3x (Mo und Mi 18:00–19:15,
 * Do 19:00–20:00), Jiu-Jitsu Gi 2x (Di 19:00–20:00, Fr 18:00–19:15), Boxen
 * 2x (Di und Do 17:45–18:45). Dazu Mo–Fr 17:00–17:45 "Matte frei" zum
 * Drillen eigener Techniken und am Samstag die Open Mat. Alles "Jedes
 * Level", Einstieg jederzeit. Es gibt damit keine gemeinsamen Schienen mehr:
 * Mo/Mi/Fr eine Einheit zu 75 Minuten ab 18:00, Di/Do zwei zu 60 Minuten ab
 * 17:45 und 19:00.
 *
 * Die Open Mat hat KEINE feste Zeit, sie wird in der Gruppe ausgemacht.
 * Deshalb steht "Nach Absprache" woertlich in `time`, statt eine Uhrzeit zu
 * erfinden. `time` ist reiner Anzeigetext (schedule.tsx und coaches.tsx
 * geben ihn nur aus und bauen React-Keys daraus, geparst wird er nirgends).
 * Vorher Sa 12:15–13:45.
 *
 * Weg sind BJJ Basic, Advanced Training, Ringen, Sparring,
 * Wettkampftraining und Special Wednesday, und mit ihnen die Stufen
 * Anfaenger, Intermediate und Advanced.
 *
 * Davor (Sept. bis Okt. 2026): Mo–Fr 17:00 freies Training, danach je eine
 * Einheit um 17:45 und 19:00, angesetzt auf 60 Minuten mit einer
 * Viertelstunde Puffer. Die Fussnote "Matte frei ab 16:30 / Dehnen 17:15"
 * ist seit 10.10.2026 auf Wunsch des Vorstands weg.
 */
export const schedule: { day: string; classes: ScheduleClass[] }[] = [
  {
    day: "Mo",
    classes: [
      { time: "17:00–17:45", name: "Matte frei", note: "Zum Drillen eigener Techniken", kind: "frei", level: "jedes" },
      { time: "18:00–19:15", name: "Jiu-Jitsu No-Gi", note: "Technik & Sparring ohne Gi", program: "Jiu-Jitsu No-Gi", kind: "nogi", level: "jedes", attire: "nogi" },
    ],
  },
  {
    day: "Di",
    classes: [
      { time: "17:00–17:45", name: "Matte frei", note: "Zum Drillen eigener Techniken", kind: "frei", level: "jedes" },
      { time: "17:45–18:45", name: "Boxen", note: "Boxtechnik, Pratzen & Partnerübungen", program: "Boxen", kind: "boxen", level: "jedes", attire: "box" },
      { time: "19:00–20:00", name: "Jiu-Jitsu Gi", note: "Technik & Sparring im Gi", program: "Jiu-Jitsu Gi", kind: "gi", level: "jedes", attire: "gi" },
    ],
  },
  {
    day: "Mi",
    classes: [
      { time: "17:00–17:45", name: "Matte frei", note: "Zum Drillen eigener Techniken", kind: "frei", level: "jedes" },
      { time: "18:00–19:15", name: "Jiu-Jitsu No-Gi", note: "Technik & Sparring ohne Gi", program: "Jiu-Jitsu No-Gi", kind: "nogi", level: "jedes", attire: "nogi" },
    ],
  },
  {
    day: "Do",
    classes: [
      { time: "17:00–17:45", name: "Matte frei", note: "Zum Drillen eigener Techniken", kind: "frei", level: "jedes" },
      { time: "17:45–18:45", name: "Boxen", note: "Boxtechnik, Pratzen & Partnerübungen", program: "Boxen", kind: "boxen", level: "jedes", attire: "box" },
      { time: "19:00–20:00", name: "Jiu-Jitsu No-Gi", note: "Technik & Sparring ohne Gi", program: "Jiu-Jitsu No-Gi", kind: "nogi", level: "jedes", attire: "nogi" },
    ],
  },
  {
    day: "Fr",
    classes: [
      { time: "17:00–17:45", name: "Matte frei", note: "Zum Drillen eigener Techniken", kind: "frei", level: "jedes" },
      { time: "18:00–19:15", name: "Jiu-Jitsu Gi", note: "Technik & Sparring im Gi", program: "Jiu-Jitsu Gi", kind: "gi", level: "jedes", attire: "gi" },
    ],
  },
  {
    day: "Sa",
    classes: [
      { time: "Nach Absprache", name: "Open Mat", note: "Gi & No-Gi · freies Rollen für alle · Zeit variabel, wird in der Gruppe abgesprochen", program: "Open Mat", kind: "openmat", level: "jedes", attire: "both" },
    ],
  },
];

/**
 * Was es kostet.
 *
 * Fuenf Angebote, aber NICHT fuenf gleichrangige Stufen: zwei Gruppen, die
 * verschiedene Fragen beantworten.
 *
 * `single` ist "ich will es einmal sehen" — nichts laeuft weiter, nichts muss
 * gekuendigt werden. `membership` ist "ich trainiere hier", und dort ist die
 * einzige Frage, wie lange man sich festlegt. Die beiden Gruppen gegeneinander
 * zu stellen waere eine Vergleichsaufforderung, die niemand braucht: wer noch
 * nie auf einer Matte stand, waehlt nicht zwischen Jahresvertrag und Zehnerblock.
 *
 * Das Jahr ist das Angebot, das der Verein verkaufen will, und der Grund steht
 * als Zahl in `note`: 240 Euro weniger als Flex ueber dasselbe Jahr. Kein
 * "Beliebt", kein "Spar-Angebot" — ein Etikett behauptet einen Vorteil, eine
 * Differenz zeigt ihn.
 *
 * Die Zahlen stammen aus der Preistabelle des Vereins vom 6. Oktober 2026 und
 * hiessen dort "ALL IN" (seit 10.10.2026 auf der Website "Alle Kurse"). Vorher standen hier 90/75/60 und ein
 * Zehnerblock zu 120 — das war ein frueherer Stand.
 *
 * Der Schueler- und Studentenpreis steht in derselben Zeile wie der regulaere,
 * nicht in einer zweiten Spalte: eine Spalte mehr heisst am Handy entweder
 * Querlauf oder eine zweite Tabelle, und der Ermaessigte ist kein eigenes
 * Angebot, sondern derselbe Vertrag mit Ausweis. Die Bedingung dazu steht
 * einmal unter dem Block, nicht fuenfmal in den Zeilen.
 */
export const pricing = {
  /**
   * Nur noch die Jahresbindung (Vorstand, 12.10.2026). Flex (90 €) und
   * 3 Monate (80 €) stehen nicht mehr auf der Seite: Probe-Besucher haben nur
   * die 90 gesehen und sich ueber den Preis aufgeregt. Die Tarife gibt es
   * weiter (Beitrittserklaerung, Bedingungen), die FAQ sagt nur, dass ein
   * monatlicher Vertrag etwas mehr kostet.
   *
   * `reduced` ist der Schueler-/Studentenpreis — gleich gross daneben.
   */
  membership: [
    {
      name: "Alle Kurse – Jahresbindung",
      price: "70",
      reduced: "55",
      per: "pro Monat",
      note: "",
      // Ohne Hervorhebung (Rueckmeldung 22.10.2026): die Glutkante und der
      // rote Preis waren fuer den Vergleich mehrerer Tarife da. Mit nur noch
      // einem Mitgliedschaftstarif gibt es nichts mehr herauszuheben.
      featured: false,
    },
  ],
  single: [
    {
      name: "Probetraining",
      price: "gratis",
      per: "",
      note: "Kurze Hose und T-Shirt reichen",
      featured: false,
    },
    {
      name: "10er-Block",
      price: "140",
      reduced: "125",
      per: "",
      note: "Zehn Einheiten, kein Ablaufdatum",
      featured: false,
    },
  ],
  /** Kleingedruckt unter den Vorteilen: es gibt auch Vertraege ohne Jahr. */
  flexNote: "Lieber flexibel bleiben? Die Mitgliedschaft geht auch ohne Jahresbindung, gegen einen kleinen monatlichen Aufpreis.",
  /**
   * Was in der Mitgliedschaft drin ist (Vorstand, 12.10.2026). Seit
   * 29.10.2026 nach dem neuen Plan: 7 Kurse statt 11, kein Ringen mehr, und
   * das freie Training heisst jetzt "Matte frei" und endet um 17:45, wenn
   * der erste Kurs beginnt. Die Zahl ist abgetippt, nicht aus `schedule`
   * gerechnet — bei der naechsten Planaenderung hier mitziehen.
   */
  benefits: [
    "7 Kurse pro Woche: Jiu-Jitsu im Gi und No-Gi, Boxen",
    "Matte frei Mo bis Fr 17:00 bis 17:45, Open Mat am Samstag",
  ],
  /**
   * Das Kleingedruckte: die Einschreibgebuehr und der Ausweis. Beides gehoert
   * sichtbar unter die Preise und nicht in jede Zeile.
   */
  fineprint:
    "Einmalige Einschreibgebühr: 20 €. Der Schüler- und Studentenpreis gilt gegen Vorlage eines gültigen Ausweises.",
  /**
   * Online abschliessen gibt es noch nicht. Ein Satz, kein Kasten: ein
   * Hinweisbalken wuerde genau die Aufmerksamkeit ziehen, die das
   * Jahresmodell haben soll.
   */
  hint:
    "Mitglied wirst du online über „Mitglied werden“ oder direkt im Training.",
} as const;

/**
 * Die Fragen unter "Fragen". Seit 29.10.2026 auf den neuen Plan gezogen:
 * BJJ Basic, die Stufen und das freie Training ab 17:00 kamen in drei
 * Antworten vor. Tage und Uhrzeiten sind hier abgetippt — bei einer
 * Planaenderung mit `schedule` zusammen pruefen.
 */
export const faqs = [
  {
    question: "Ich habe noch nie trainiert. Ist das ein Problem?",
    answer:
      "Im Gegenteil, das ist der Normalfall. Alle Kurse sind für jedes Level offen, auch für komplette Anfänger. Du bekommst geduldige Trainingspartner und wirst am ersten Tag in kein hartes Sparring geworfen.",
  },
  {
    question: "Was brauche ich für die erste Einheit?",
    answer:
      "Kurze Hose, T-Shirt, Wasser, mehr brauchst du nicht. Für die Stunden im Gi brauchst du einen eigenen; zum Anfangen reichen die No-Gi-Einheiten völlig, davon gibt es drei pro Woche. Komm 15 Minuten früher, dann zeigen wir dir alles.",
  },
  {
    question: "Muss ich fit oder beweglich sein, um anzufangen?",
    answer:
      "Nein. Jiu-Jitsu bringt dich in Form, nicht umgekehrt. Du bestimmst das Tempo, und jede Runde holt dich dort ab, wo du gerade stehst.",
  },
  {
    question: "Wann kann ich als Anfänger einsteigen?",
    answer:
      "Jederzeit. Jeder Kurs ist für jedes Level offen. Für den Anfang bietet sich No-Gi an, dafür brauchst du keinen Gi: Montag und Mittwoch um 18:00, Donnerstag um 19:00. Boxen ist Dienstag und Donnerstag um 17:45. Montag bis Freitag ist von 17:00 bis 17:45 die Matte frei, und am Samstag gibt es die Open Mat nach Absprache.",
  },
  {
    question: "Muss ich mich binden?",
    answer:
      "Nein. Du kannst auch einen monatlichen Vertrag machen, dann kostet die Mitgliedschaft etwas mehr.",
  },
  {
    question: "Wie oft sollte ich trainieren?",
    answer:
      "Zweimal die Woche reicht für stetigen Fortschritt. Viele kommen öfter, weil es ihnen Spaß macht. Die Mitgliedschaft deckt alles ab, das ist ganz dir überlassen.",
  },
] as const;
