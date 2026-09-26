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
  address: {
    street: "Kasernstraße 4",
    city: "8010 Graz",
    maps: "https://maps.google.com/?q=Kasernstraße+4+8010+Graz",
  },
  social: {
    instagram: "https://instagram.com",
    youtube: "https://youtube.com",
    tiktok: "https://tiktok.com",
    facebook: "https://facebook.com",
  },
} as const;

export const nav = {
  links: [
    { label: "Training", href: "#schedule" },
    { label: "Wo wir sind", href: "#location" },
    { label: "Trainer", href: "#coaches" },
    { label: "Preise", href: "#pricing" },
    { label: "Fragen", href: "#faq" },
  ],
  cta: { label: "Probetraining buchen", href: "#pricing" },
  /**
   * Die Haupthandlung der Seite, als Knopf in der Kopfleiste.
   *
   * `href` zeigt vorlaeufig auf die Preise, weil es das Anmeldeformular noch
   * nicht gibt: ein Knopf, der ins Leere springt, ist schlimmer als keiner.
   * Sobald das Formular als Sektion steht, ist hier "#anmeldung" einzutragen
   * und sonst nichts — die Kopfleiste liest ausschliesslich diese Zeile.
   */
  signup: { label: "Jetzt anmelden", href: "#pricing" },
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
 * The six programmes.
 *
 * `kanji` is the character standing behind each board in components/features-6
 * — 基本 kihon, 上級 jōkyū, 寝技 newaza, 試合 shiai, 少年 shōnen, 女子 joshi. It is
 * copy, not decoration: it says the same thing as the title, which is why the
 * markup hides it from screen readers rather than reading the heading twice.
 */
export const programs = [
  {
    title: "BJJ Basic",
    kanji: "基本",
    level: "Ohne Vorkenntnisse",
    blurb:
      "Dienstag, No-Gi. Hier fängst du an: Vorkenntnisse braucht es keine.",
    tag: "Einsteiger",
  },
  {
    title: "Gi Training",
    kanji: "道着",
    level: "Jedes Level",
    blurb:
      "Freitag. Technik und Sparring im Gi, offen für alle Stufen.",
    tag: "Gi",
  },
  {
    title: "No-Gi Training",
    kanji: "寝技",
    level: "Ab Intermediate",
    blurb:
      "Montag. Technik und Sparring ohne Gi: schnell, viel Scrambles.",
    tag: "No-Gi",
  },
  {
    title: "Advanced Training",
    kanji: "上級",
    level: "Ab Advanced",
    blurb:
      "Mittwoch im Gi, Freitag No-Gi. Systeme, harte Runden, ein schärferes A-Game.",
    tag: "Fortgeschritten",
  },
  {
    title: "Ringen",
    kanji: "立技",
    level: "Ab Intermediate",
    blurb:
      "Montag. Eine Woche Fokus Kondition, eine Woche Fokus Technik.",
    tag: "Standkampf",
  },
  {
    title: "Sparring",
    kanji: "乱取",
    level: "Jedes Level",
    blurb:
      "Donnerstag. Freies Rollen, kein Unterricht: nur Mattenzeit.",
    tag: "Rollen",
  },
  {
    title: "Wettkampftraining",
    kanji: "試合",
    level: "Ab Intermediate",
    blurb:
      "Mittwoch, im Wechsel mit Special Wednesday: Positionssparring aus selbst bestimmten Positionen.",
    tag: "Athleten",
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
      "Samstag, Gi und No-Gi. Freies Rollen für alle, kein Unterricht.",
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
 */
export const coaches = [
  {
    name: "Liri",
    belt: "Lilagurt",
    beltHex: "#7e22ce",
    image: "/img/coaches/liri.jpeg",
    bio: "",
    teaches: [] as string[],
  },
  {
    name: "Ervin",
    belt: "Lilagurt",
    beltHex: "#7e22ce",
    image: "/img/coaches/ervin.jpeg",
    bio: "",
    teaches: [] as string[],
  },
  {
    name: "Wolfi",
    belt: "Schwarzgurt",
    beltHex: "#16161c",
    image: "/img/coaches/wolfi.jpeg",
    bio: "",
    teaches: [] as string[],
  },
  {
    name: "Matthias",
    belt: "Schwarzgurt",
    beltHex: "#16161c",
    image: "/img/coaches/matthias.jpeg",
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
   * Die KURSART. Sie bestimmt die Farbe.
   *
   * Der Aushang faerbt nach Richtung, nicht nach Level: fuenf Gruppen
   * (Anfaenger & alle Level, Fortgeschrittene, Ringen, Sparring & Wettkampf,
   * Boxen), innerhalb einer Gruppe abgestuft. Welche Kursart in welcher Gruppe
   * liegt und mit welchem Wert, steht in components/schedule.tsx.
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
    | "openmat";
  /** Das empfohlene Level — der Text im Chip. */
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
 * Der Wochenplan nach dem Aushang vom September 2026.
 *
 * Zwei Kursschienen pro Werktag (17:45–19:00 und 19:05–20:20) plus Open Mat am
 * Samstag. Matte frei ab 16:30 (Di/Do 16:45) und Dehnen 17:15 (Mo/Mi/Fr)
 * stehen bewusst NICHT als Zeilen hier: es sind keine Kurse, sondern offene
 * Zeit davor. Sie laufen als Fussnote unter dem Plan.
 */
export const schedule: { day: string; classes: ScheduleClass[] }[] = [
  {
    day: "Mo",
    classes: [
      { time: "17:45–19:00", name: "Ringen", note: "Eine Woche Fokus Kondition, eine Woche Fokus Technik", program: "Ringen", kind: "ringen", level: "intermediate" },
      { time: "19:05–20:20", name: "No-Gi Training", note: "Technik & Sparring ohne Gi", program: "No-Gi Training", kind: "nogi", level: "intermediate" },
    ],
  },
  {
    day: "Di",
    classes: [
      { time: "17:45–19:00", name: "Boxen", note: "Boxtechnik, Pratzen & Partnerübungen", program: "Boxen", kind: "boxen", level: "jedes" },
      { time: "19:05–20:20", name: "BJJ Basic", note: "No-Gi · für alle ohne Vorkenntnisse", program: "BJJ Basic", kind: "basic", level: "anfaenger" },
    ],
  },
  {
    day: "Mi",
    classes: [
      { time: "17:45–19:00", name: "Advanced Training", note: "Gi", program: "Advanced Training", kind: "advanced", level: "advanced" },
      { time: "19:05–20:20", name: "Wettkampftraining", note: "oder Special Wednesday · Positionssparring aus selbst bestimmten Positionen", program: "Wettkampftraining", kind: "wettkampf", level: "intermediate" },
    ],
  },
  {
    day: "Do",
    classes: [
      { time: "17:45–19:00", name: "Boxen", note: "Boxtechnik, Pratzen & Partnerübungen", program: "Boxen", kind: "boxen", level: "jedes" },
      { time: "19:05–20:20", name: "Sparring", note: "Freies Rollen, kein Unterricht", program: "Sparring", kind: "sparring", level: "jedes" },
    ],
  },
  {
    day: "Fr",
    classes: [
      { time: "17:45–19:00", name: "Advanced Training", note: "No-Gi", program: "Advanced Training", kind: "advanced", level: "advanced" },
      { time: "19:05–20:20", name: "Gi Training", note: "Technik & Sparring im Gi", program: "Gi Training", kind: "gi", level: "jedes" },
    ],
  },
  {
    day: "Sa",
    classes: [
      { time: "11:00–12:30", name: "Open Mat", note: "Gi & No-Gi · freies Rollen für alle, kein Unterricht", program: "Open Mat", kind: "openmat", level: "jedes" },
    ],
  },
];

/**
 * Was es kostet, und es gibt genau zwei Dinge.
 *
 * Hier standen drei erfundene Stufen — 89, 129 und 169 im Monat, gestaffelt
 * nach Trainingshaeufigkeit — und ueberall auf der Seite die Behauptung, die
 * erste Stunde sei gratis. Beides stimmte nicht. Es gibt eine Mitgliedschaft,
 * die alles enthaelt, und ein einzelnes Probetraining, das etwas kostet.
 *
 * Zwei Zeilen sind ehrlicher als drei Spalten, und sie sind auch besser: eine
 * gestaffelte Preistabelle zwingt jeden Besucher zu einer Entscheidung, bevor
 * er ueberhaupt weiss, ob ihm die Sache gefaellt.
 */
export const pricing = [
  {
    name: "Probetraining",
    price: "20",
    period: "eine Einheit",
    tagline: "Schau es dir an",
    features: [
      "Eine volle Einheit, jedes Programm aus dem Plan",
      "Einen Gi leihen wir dir für die Einheit",
      "Komm fünfzehn Minuten früher",
      "Es folgt nichts daraus",
    ],
    cta: "Probetraining buchen",
    featured: false,
  },
  {
    name: "Mitgliedschaft",
    price: "60",
    period: "pro Monat",
    tagline: "Alles dabei",
    features: [
      "Jede Einheit im Plan, so oft du willst",
      "Gi und No-Gi",
      "Open Mat und Seminare",
      "Ein Leih-Gi, so lange du einen brauchst",
      "Monatlich, jederzeit pausieren oder kündigen",
    ],
    cta: "Mitglied werden",
    featured: true,
  },
] as const;

export const faqs = [
  {
    question: "Ich habe noch nie trainiert. Ist das ein Problem?",
    answer:
      "Im Gegenteil, das ist der Normalfall. BJJ Basic am Dienstag ist für komplette Anfänger gebaut. Du bekommst geduldige Trainingspartner und wirst am ersten Tag in kein hartes Sparring geworfen.",
  },
  {
    question: "Was brauche ich für die erste Einheit?",
    answer:
      "Kurze Hose, T-Shirt, Wasser. Einen Gi leihen wir dir, wenn du eine Gi-Stunde probieren willst. Komm 15 Minuten früher, dann zeigen wir dir alles.",
  },
  {
    question: "Muss ich fit oder beweglich sein, um anzufangen?",
    answer:
      "Nein. Jiu-Jitsu bringt dich in Form, nicht umgekehrt. Du bestimmst das Tempo, und jede Runde holt dich dort ab, wo du gerade stehst.",
  },
  {
    question: "Wann kann ich als Anfänger einsteigen?",
    answer:
      "Am Dienstag um 19:05 bei BJJ Basic: No-Gi, für alle ohne Vorkenntnisse. Danach stehen dir Gi Training am Freitag, Sparring am Donnerstag und die Open Mat am Samstag offen, die sind für jedes Level. Die Matte ist übrigens schon ab 16:30 zum Drillen offen.",
  },
  {
    question: "Gibt es einen langen Vertrag?",
    answer:
      "Keine Bindung. Die Mitgliedschaft läuft monatlich, du kannst jederzeit pausieren oder kündigen. Komm gerne zuerst zu einem Probetraining. Es kostet 20 €, und es folgt nichts daraus.",
  },
  {
    question: "Wie oft sollte ich trainieren?",
    answer:
      "Zweimal die Woche reicht für stetigen Fortschritt. Viele kommen öfter, weil es ihnen taugt. Die Mitgliedschaft deckt alles ab, das ist ganz dir überlassen.",
  },
] as const;
