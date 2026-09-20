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
    { label: "Programme", href: "#programs" },
    { label: "Stundenplan", href: "#schedule" },
    { label: "Trainer", href: "#coaches" },
    { label: "Preise", href: "#pricing" },
    { label: "Fragen", href: "#faq" },
  ],
  cta: { label: "Probetraining buchen", href: "#pricing" },
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
    claim: "Functional conditioning — get in the best shape of your life",
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
    title: "Anfängerkurs",
    kanji: "基本",
    level: "Ohne Vorkenntnisse",
    blurb:
      "Dienstag, im Gi. Hier fängst du an — Vorkenntnisse braucht es keine.",
    tag: "Einsteiger",
  },
  {
    title: "Intermediate",
    kanji: "中級",
    level: "Ab Intermediate",
    blurb:
      "Donnerstag, im Gi. Baut direkt auf den Anfängerkurs auf.",
    tag: "Aufbau",
  },
  {
    title: "Advanced Training",
    kanji: "上級",
    level: "Ab Advanced",
    blurb:
      "Mittwoch No-Gi, Freitag Gi. Systeme, harte Runden, ein schärferes A-Game.",
    tag: "Fortgeschritten",
  },
  {
    title: "Ringen für BJJ",
    kanji: "立技",
    level: "Ab Intermediate",
    blurb:
      "Montag. Takedowns, Griffkampf, der Weg zu Boden.",
    tag: "Standkampf",
  },
  {
    title: "Sparring",
    kanji: "乱取",
    level: "Ab Intermediate",
    blurb:
      "Montag nur Rollen, Dienstag freies Positionssparring. Kein Unterricht, nur Mattenzeit.",
    tag: "Rollen",
  },
  {
    title: "Wettkampftraining",
    kanji: "試合",
    level: "Ab Advanced",
    blurb:
      "Mittwoch. Für Turnierkämpfer und das Team.",
    tag: "Athleten",
  },
  {
    title: "Fitness",
    kanji: "体力",
    level: "Alle Stufen",
    blurb:
      "Donnerstag. Kraft und Kondition, ganz ohne Kampfsport.",
    tag: "Kraft",
  },
  {
    title: "Boxen",
    kanji: "拳闘",
    level: "Alle Stufen",
    blurb:
      "Freitag. Boxtechnik, Pratzen und Partnerübungen.",
    tag: "Boxen",
  },
  {
    title: "Open Mat",
    kanji: "自由",
    level: "Alle Stufen",
    blurb:
      "Samstag, Gi und No-Gi. Freies Rollen für alle, kein Unterricht.",
    tag: "Samstag",
  },
] as const;

export type ScheduleClass = {
  time: string;
  name: string;
  /** Einzeiler unter dem Namen — Format, Inhalt, Zielgruppe. */
  note?: string;
  kind: "anfaenger" | "intermediate" | "advanced" | "fitness" | "boxen";
  /**
   * `title` des zugehoerigen Eintrags in `programs`.
   *
   * Die beiden Listen standen frueher als zwei getrennte Sektionen auf der
   * Seite und sagten dasselbe zweimal — einmal nach Programm sortiert, einmal
   * nach Tag. Jetzt ist der Wochenplan die einzige Darstellung, und dieser
   * Schluessel holt den laengeren Text dazu ins Detailfenster. Keine Kopie der
   * Texte, nur ein Verweis: `programs` bleibt die einzige Quelle.
   */
  program?: string;
};

/**
 * Der Wochenplan, wie ihn der Trainer aufgestellt hat.
 *
 * Zwei Kursschienen pro Werktag (17:45–19:00 und 19:05–20:20) plus Open Mat
 * am Samstag. `kind` ist KEIN Format mehr (Gi/No-Gi), sondern die EINSTIEGS-
 * STUFE: die Farbe sagt, ab welchem Level man in der Einheit richtig ist.
 * Ob Gi oder No-Gi steht in `note`, weil es die zweite Frage ist, nicht die
 * erste.
 *
 * Matte frei ab 16:30 (Di/Do 16:45) und Dehnen 17:15 (Mo/Mi/Fr) stehen
 * bewusst NICHT als Zeilen hier: es sind keine Kurse, sondern offene Zeit vor
 * dem Training. Sie laufen als Fußnote unter dem Plan — siehe
 * components/schedule.tsx.
 */
export const schedule: { day: string; classes: ScheduleClass[] }[] = [
  {
    day: "Mo",
    classes: [
      { time: "17:45–19:00", name: "Ringen für BJJ", note: "Takedowns & Standkampf", program: "Ringen für BJJ", kind: "intermediate" },
      { time: "19:05–20:20", name: "Sparring only", note: "Nur Rollen, kein Unterricht", program: "Sparring", kind: "intermediate" },
    ],
  },
  {
    day: "Di",
    classes: [
      { time: "17:45–19:00", name: "Anfängerkurs", note: "Gi · für alle ohne Vorkenntnisse", program: "Anfängerkurs", kind: "anfaenger" },
      { time: "19:05–20:20", name: "Special Tuesday", note: "Freies Positionssparring", program: "Sparring", kind: "intermediate" },
    ],
  },
  {
    day: "Mi",
    classes: [
      { time: "17:45–19:00", name: "Advanced Training", note: "No-Gi", program: "Advanced Training", kind: "advanced" },
      { time: "19:05–20:20", name: "Wettkampftraining", note: "Turnierkämpfer & Team", program: "Wettkampftraining", kind: "advanced" },
    ],
  },
  {
    day: "Do",
    classes: [
      { time: "17:45–19:00", name: "Fitness", note: "Kraft & Kondition, ohne Kampfsport", program: "Fitness", kind: "fitness" },
      { time: "19:05–20:20", name: "Intermediate", note: "Gi · Aufbau auf den Anfängerkurs", program: "Intermediate", kind: "intermediate" },
    ],
  },
  {
    day: "Fr",
    classes: [
      { time: "17:45–19:00", name: "Advanced Training", note: "Gi", program: "Advanced Training", kind: "advanced" },
      { time: "19:05–20:20", name: "Boxen", note: "Boxtechnik, Pratzen & Partnerübungen", program: "Boxen", kind: "boxen" },
    ],
  },
  {
    day: "Sa",
    classes: [
      { time: "11:00–12:30", name: "Open Mat", note: "Gi & No-Gi · freies Rollen für alle", program: "Open Mat", kind: "anfaenger" },
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
      "Im Gegenteil, das ist der Normalfall. Der Anfängerkurs am Dienstag ist für komplette Anfänger gebaut. Du bekommst geduldige Trainingspartner und wirst am ersten Tag in kein hartes Sparring geworfen.",
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
      "Am Dienstag um 17:45 im Anfängerkurs. Ab dann bist du auch beim Intermediate am Donnerstag richtig, das baut direkt darauf auf. Die Matte ist übrigens schon ab 16:30 offen, wenn du vorher selbst drillen willst.",
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
