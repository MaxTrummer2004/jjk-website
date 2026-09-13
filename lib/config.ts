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

/** Rolling marquee under the hero */
export const marquee = [
  "Gi",
  "No-Gi",
  "Fundamentals",
  "Competition Team",
  "Kids & Teens",
  "Women's Class",
  "Open Mat",
  "Self-Defense",
  "Strength & Conditioning",
] as const;

export const stats = [
  { value: 500, suffix: "+", label: "Active members" },
  { value: 12, suffix: "", label: "Champions produced" },
  { value: 15, suffix: "", label: "Years on the mats" },
  { value: 40, suffix: "+", label: "Classes every week" },
] as const;

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
    title: "Fundamentals",
    kanji: "基本",
    level: "Weiß → Blau",
    blurb:
      "Hier fängst du an. Vorkenntnisse braucht es keine.",
    tag: "Einsteiger",
  },
  {
    title: "Advanced Gi",
    kanji: "上級",
    level: "Ab Blau",
    blurb:
      "Systeme, harte Runden, ein schärferes A-Game.",
    tag: "Alle Gürtel",
  },
  {
    title: "No-Gi / Grappling",
    kanji: "寝技",
    level: "Alle Stufen",
    blurb:
      "Schnell und modern. Wrestling, Scrambles, Leg Locks.",
    tag: "Alle Stufen",
  },
  {
    title: "Wettkampfteam",
    kanji: "試合",
    level: "Auf Einladung",
    blurb:
      "Camps, harte Runden, Podeste.",
    tag: "Athleten",
  },
  {
    title: "Kinder & Jugend",
    kanji: "少年",
    level: "4 bis 15 Jahre",
    blurb:
      "Selbstvertrauen, Disziplin, kein Mobbing.",
    tag: "Jugend",
  },
  {
    title: "Frauenklasse",
    kanji: "女子",
    level: "Alle Stufen",
    blurb:
      "Nur Frauen. Selbstverteidigung im Kern.",
    tag: "Nur Frauen",
  },
] as const;

export const features = [
  {
    title: "Real self-defense",
    blurb:
      "Leverage beats strength. Learn to control and neutralise a bigger opponent — the reason Jiu-Jitsu is trusted worldwide.",
  },
  {
    title: "World-class coaching",
    blurb:
      "A full-time black-belt team that has cornered athletes on the biggest stages in the sport.",
  },
  {
    title: "Get in the best shape",
    blurb:
      "Every round is functional conditioning. Burn fat, build grip strength and move better — without a single boring treadmill.",
  },
  {
    title: "A team, not a gym",
    blurb:
      "The mat is a family. Train hard, laugh often, and leave every session with 20 people in your corner.",
  },
] as const;

export type ScheduleClass = {
  time: string;
  name: string;
  kind: "gi" | "nogi" | "kids" | "open";
};
export const schedule: { day: string; classes: ScheduleClass[] }[] = [
  {
    day: "Mo",
    classes: [
      { time: "07:00", name: "Morning Gi", kind: "gi" },
      { time: "17:30", name: "Kids", kind: "kids" },
      { time: "19:00", name: "Fundamentals", kind: "gi" },
      { time: "20:15", name: "Advanced Gi", kind: "gi" },
    ],
  },
  {
    day: "Di",
    classes: [
      { time: "12:00", name: "No-Gi Lunch", kind: "nogi" },
      { time: "18:00", name: "Women's Class", kind: "gi" },
      { time: "19:30", name: "No-Gi", kind: "nogi" },
    ],
  },
  {
    day: "Mi",
    classes: [
      { time: "07:00", name: "Morning Gi", kind: "gi" },
      { time: "17:30", name: "Kids", kind: "kids" },
      { time: "19:00", name: "Fundamentals", kind: "gi" },
      { time: "20:15", name: "Competition", kind: "nogi" },
    ],
  },
  {
    day: "Do",
    classes: [
      { time: "12:00", name: "No-Gi Lunch", kind: "nogi" },
      { time: "19:00", name: "Advanced Gi", kind: "gi" },
      { time: "20:15", name: "Open Mat", kind: "open" },
    ],
  },
  {
    day: "Fr",
    classes: [
      { time: "17:30", name: "Kids", kind: "kids" },
      { time: "19:00", name: "Fundamentals", kind: "gi" },
      { time: "20:15", name: "No-Gi", kind: "nogi" },
    ],
  },
  {
    day: "Sa",
    classes: [
      { time: "10:00", name: "Competition", kind: "nogi" },
      { time: "11:30", name: "Open Mat", kind: "open" },
    ],
  },
];

export const testimonials = [
  {
    quote:
      "I walked in unable to touch my toes and terrified of sparring. A year later I'm a blue belt with the best group of friends I've ever had.",
    name: "Jonas R.",
    detail: "Blue Belt · 1.5 years",
  },
  {
    quote:
      "The coaching detail here is unreal. Every round I learn something. My kids trained here first — now the whole family is on the mats.",
    name: "Priya M.",
    detail: "Purple Belt · 3 years",
  },
  {
    quote:
      "I came for self-defense and stayed for the team. Lost 14 kg, gained a spine. JJK genuinely changed my life.",
    name: "Deniz A.",
    detail: "White Belt · 8 months",
  },
  {
    quote:
      "As a woman starting martial arts at 34, I was nervous. The women's class made it feel like home from day one.",
    name: "Sofia L.",
    detail: "Blue Belt · 2 years",
  },
] as const;

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
      "Im Gegenteil, das ist der Normalfall. Die Fundamentals-Stunden sind für komplette Anfänger gebaut. Du bekommst geduldige Trainingspartner und wirst am ersten Tag in kein hartes Sparring geworfen.",
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
    question: "Ab welchem Alter dürfen Kinder mittrainieren?",
    answer:
      "Kinder & Jugend läuft von 4 bis 15, in altersgerechten Gruppen mit eigenen Jugendtrainern.",
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
