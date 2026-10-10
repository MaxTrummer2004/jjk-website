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
    holder: "Jiu Jitsu Kaisen Academy",
    iban: "",
    bic: "",
  },
  address: {
    street: "Triester Straße 391",
    city: "8055 Graz",
    maps: "https://maps.google.com/?q=Triester+Stra%C3%9Fe+391+8055+Graz",
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
      "Montag, No-Gi. Hier fängst du an: Vorkenntnisse braucht es keine.",
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
      "Dienstag. Technik und Sparring ohne Gi: schnell, viel Scrambles.",
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
      "Donnerstag. Freies Rollen: nur Mattenzeit.",
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
      "Samstag, Gi und No-Gi. Freies Rollen für alle.",
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
    | "openmat"
    | "frei";
  /**
   * Gi oder No-Gi — steht als Emoji hinter dem Namen (🥋 Gi, 🤼 No-Gi).
   * Nur bei den BJJ-Einheiten; Boxen, Ringen und Sparring tragen keins.
   */
  attire?: "gi" | "nogi" | "both";
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
 * Montag standen No-Gi und Ringen bis zum 6. Oktober 2026 vertauscht: Ringen
 * um 17:45, No-Gi um 19:05. Richtig ist umgekehrt.
 *
 * Die Zeiten sind seit 7. Oktober 2026 anders gedacht. Vorher standen hier
 * 17:45–19:00 und 19:05–20:20, also zweimal 75 Minuten mit fuenf Minuten
 * dazwischen — das war die Obergrenze als Zusage. Angesetzt ist eine Einheit
 * aber auf 60 Minuten, und bis zur naechsten liegt eine Viertelstunde. Jeder
 * Trainer KANN damit auf 75 gehen, muss aber nicht, und niemand steht im
 * Unrecht, wenn er puenktlich aufhoert. Deshalb stehen jetzt die 60 Minuten
 * im Plan und die Viertelstunde in der Fussnote.
 *
 * Seit 10. Oktober 2026: BJJ Basic Montag 17:45 (vorher Dienstag 19:00),
 * No-Gi Training Dienstag 19:00 (vorher Montag 17:45). Mo–Fr steht
 * "Freies Training" 16:45–17:45 als eigene Zeile im Plan; die Fussnote mit
 * "Matte frei ab 16:30 / Dehnen 17:15 / 60 Minuten" ist auf Wunsch des
 * Vorstands ersatzlos weg. "Kein Unterricht" bei Sparring und Open Mat
 * ebenfalls.
 *
 * Drei Schienen pro Werktag (16:45, 17:45, 19:00) plus Open Mat am Samstag.
 */
export const schedule: { day: string; classes: ScheduleClass[] }[] = [
  {
    day: "Mo",
    classes: [
      { time: "16:45–17:45", name: "Freies Training", kind: "frei", level: "jedes" },
      { time: "17:45–18:45", name: "BJJ Basic", note: "No-Gi · für alle ohne Vorkenntnisse", program: "BJJ Basic", kind: "basic", level: "anfaenger", attire: "nogi" },
      { time: "19:00–20:00", name: "Ringen", note: "Eine Woche Fokus Kondition, eine Woche Fokus Technik", program: "Ringen", kind: "ringen", level: "intermediate" },
    ],
  },
  {
    day: "Di",
    classes: [
      { time: "16:45–17:45", name: "Freies Training", kind: "frei", level: "jedes" },
      { time: "17:45–18:45", name: "Boxen", note: "Boxtechnik, Pratzen & Partnerübungen", program: "Boxen", kind: "boxen", level: "jedes" },
      { time: "19:00–20:00", name: "No-Gi Training", note: "Technik & Sparring ohne Gi", program: "No-Gi Training", kind: "nogi", level: "intermediate", attire: "nogi" },
    ],
  },
  {
    day: "Mi",
    classes: [
      { time: "16:45–17:45", name: "Freies Training", kind: "frei", level: "jedes" },
      { time: "17:45–18:45", name: "Advanced Training", note: "Gi", program: "Advanced Training", kind: "advanced", level: "advanced", attire: "gi" },
      { time: "19:00–20:00", name: "Wettkampftraining", note: "oder Special Wednesday · Positionssparring aus selbst bestimmten Positionen", program: "Wettkampftraining", kind: "wettkampf", level: "intermediate" },
    ],
  },
  {
    day: "Do",
    classes: [
      { time: "16:45–17:45", name: "Freies Training", kind: "frei", level: "jedes" },
      { time: "17:45–18:45", name: "Boxen", note: "Boxtechnik, Pratzen & Partnerübungen", program: "Boxen", kind: "boxen", level: "jedes" },
      { time: "19:00–20:00", name: "Sparring", note: "Freies Rollen", program: "Sparring", kind: "sparring", level: "jedes" },
    ],
  },
  {
    day: "Fr",
    classes: [
      { time: "16:45–17:45", name: "Freies Training", kind: "frei", level: "jedes" },
      { time: "17:45–18:45", name: "Advanced Training", note: "No-Gi", program: "Advanced Training", kind: "advanced", level: "advanced", attire: "nogi" },
      { time: "19:00–20:00", name: "Gi Training", note: "Technik & Sparring im Gi", program: "Gi Training", kind: "gi", level: "jedes", attire: "gi" },
    ],
  },
  {
    day: "Sa",
    classes: [
      { time: "11:00–12:30", name: "Open Mat", note: "Gi & No-Gi · freies Rollen für alle", program: "Open Mat", kind: "openmat", level: "jedes", attire: "both" },
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
  membership: [
    {
      name: "Alle Kurse Flex",
      price: "90",
      per: "pro Monat",
      note: "Schüler & Studenten 75 € · monatlich kündbar",
      featured: false,
    },
    {
      name: "Alle Kurse 3 Monate",
      price: "80",
      per: "pro Monat",
      note: "Schüler & Studenten 65 € · 240 € gesamt",
      featured: false,
    },
    {
      name: "Alle Kurse Jahr",
      price: "70",
      per: "pro Monat",
      note: "Schüler & Studenten 55 € · 240 € weniger als Flex",
      featured: true,
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
      per: "zehn Einheiten",
      note: "Schüler & Studenten 125 € · kein Ablaufdatum",
      featured: false,
    },
  ],
  /**
   * Das Kleingedruckte: die Einschreibgebuehr und der Ausweis. Beides gehoert
   * sichtbar unter die Preise und nicht in jede Zeile.
   */
  fineprint:
    "Einmalige Einschreibgebühr: 20 €. Die Schüler- und Studentenpreise gelten gegen Vorlage eines gültigen Ausweises.",
  /**
   * Online abschliessen gibt es noch nicht. Ein Satz, kein Kasten: ein
   * Hinweisbalken wuerde genau die Aufmerksamkeit ziehen, die das
   * Jahresmodell haben soll.
   */
  hint:
    "Mitglied wirst du im Training: sag vorher kurz Bescheid, dann ist alles in fünf Minuten erledigt. Online abschließen und zahlen kommt bald.",
} as const;

export const faqs = [
  {
    question: "Ich habe noch nie trainiert. Ist das ein Problem?",
    answer:
      "Im Gegenteil, das ist der Normalfall. BJJ Basic am Montag ist für komplette Anfänger gebaut. Du bekommst geduldige Trainingspartner und wirst am ersten Tag in kein hartes Sparring geworfen.",
  },
  {
    question: "Was brauche ich für die erste Einheit?",
    answer:
      "Kurze Hose, T-Shirt, Wasser — mehr brauchst du nicht. Für die Stunden im Gi brauchst du einen eigenen; zum Anfangen reichen die No-Gi-Einheiten völlig, davon gibt es jede Woche mehrere. Komm 15 Minuten früher, dann zeigen wir dir alles.",
  },
  {
    question: "Muss ich fit oder beweglich sein, um anzufangen?",
    answer:
      "Nein. Jiu-Jitsu bringt dich in Form, nicht umgekehrt. Du bestimmst das Tempo, und jede Runde holt dich dort ab, wo du gerade stehst.",
  },
  {
    question: "Wann kann ich als Anfänger einsteigen?",
    answer:
      "Am Montag um 17:45 bei BJJ Basic: No-Gi, für alle ohne Vorkenntnisse. Danach stehen dir Gi Training am Freitag, Sparring am Donnerstag und die Open Mat am Samstag offen, die sind für jedes Level. Montag bis Freitag ist außerdem von 16:45 bis 17:45 freies Training.",
  },
  {
    question: "Gibt es einen langen Vertrag?",
    answer:
      "Musst du nicht. Die Mitgliedschaft läuft monatlich und ist jederzeit kündbar. Wer sich auf drei Monate oder ein Jahr festlegt, zahlt weniger: 75 statt 90 im Monat, im Jahr 60. Und das erste Training ist gratis, daraus folgt nichts.",
  },
  {
    question: "Wie oft sollte ich trainieren?",
    answer:
      "Zweimal die Woche reicht für stetigen Fortschritt. Viele kommen öfter, weil es ihnen taugt. Die Mitgliedschaft deckt alles ab, das ist ganz dir überlassen.",
  },
] as const;
