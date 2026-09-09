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
  tagline: "The gentle art, forged hard.",
  description:
    "Brazilian Jiu-Jitsu in the heart of Graz. World-class coaching, a family of training partners, and a mat that turns beginners into black belts.",
  url: "https://jjk-academy.com",
  email: "hello@jjk-academy.com",
  phone: "+49 30 1234 5678",
  address: {
    street: "Kasernenstraße",
    city: "Graz, Austria",
    maps: "https://maps.google.com/?q=Kasernenstraße+Graz",
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
    { label: "Programs", href: "#programs" },
    { label: "Schedule", href: "#schedule" },
    { label: "Coaches", href: "#coaches" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ],
  cta: { label: "Book a trial class", href: "#pricing" },
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
    level: "White → Blue",
    blurb:
      "Start here. No experience needed.",
    tag: "Beginner",
  },
  {
    title: "Advanced Gi",
    kanji: "上級",
    level: "Blue & up",
    blurb:
      "Systems, live rounds, a sharper A-game.",
    tag: "All belts",
  },
  {
    title: "No-Gi / Grappling",
    kanji: "寝技",
    level: "All levels",
    blurb:
      "Fast and modern. Wrestling, scrambles, leg locks.",
    tag: "All levels",
  },
  {
    title: "Competition Team",
    kanji: "試合",
    level: "By invite",
    blurb:
      "Camps, hard rounds, podiums.",
    tag: "Athletes",
  },
  {
    title: "Kids & Teens",
    kanji: "少年",
    level: "Ages 4–15",
    blurb:
      "Confidence, discipline, no bullying.",
    tag: "Youth",
  },
  {
    title: "Women's Class",
    kanji: "女子",
    level: "All levels",
    blurb:
      "Women only. Self-defense at its core.",
    tag: "Women only",
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
    day: "Mon",
    classes: [
      { time: "07:00", name: "Morning Gi", kind: "gi" },
      { time: "17:30", name: "Kids", kind: "kids" },
      { time: "19:00", name: "Fundamentals", kind: "gi" },
      { time: "20:15", name: "Advanced Gi", kind: "gi" },
    ],
  },
  {
    day: "Tue",
    classes: [
      { time: "12:00", name: "No-Gi Lunch", kind: "nogi" },
      { time: "18:00", name: "Women's Class", kind: "gi" },
      { time: "19:30", name: "No-Gi", kind: "nogi" },
    ],
  },
  {
    day: "Wed",
    classes: [
      { time: "07:00", name: "Morning Gi", kind: "gi" },
      { time: "17:30", name: "Kids", kind: "kids" },
      { time: "19:00", name: "Fundamentals", kind: "gi" },
      { time: "20:15", name: "Competition", kind: "nogi" },
    ],
  },
  {
    day: "Thu",
    classes: [
      { time: "12:00", name: "No-Gi Lunch", kind: "nogi" },
      { time: "19:00", name: "Advanced Gi", kind: "gi" },
      { time: "20:15", name: "Open Mat", kind: "open" },
    ],
  },
  {
    day: "Fri",
    classes: [
      { time: "17:30", name: "Kids", kind: "kids" },
      { time: "19:00", name: "Fundamentals", kind: "gi" },
      { time: "20:15", name: "No-Gi", kind: "nogi" },
    ],
  },
  {
    day: "Sat",
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
    name: "Trial class",
    price: "20",
    period: "one class",
    tagline: "Come and see",
    features: [
      "One full class, any programme on the timetable",
      "A gi lent for the session",
      "Turn up fifteen minutes early",
      "Nothing follows from it",
    ],
    cta: "Book a trial class",
    featured: false,
  },
  {
    name: "Membership",
    price: "60",
    period: "per month",
    tagline: "Everything on the mat",
    features: [
      "Every class on the timetable, as often as you like",
      "Gi and No-Gi",
      "Open mat and seminars",
      "A loaner gi for as long as you need one",
      "Month to month — pause or cancel any time",
    ],
    cta: "Join the academy",
    featured: true,
  },
] as const;

export const faqs = [
  {
    question: "I've never trained before — is that okay?",
    answer:
      "Absolutely, it's the norm. Our Fundamentals classes are built for total beginners. You'll be paired with patient training partners and never thrown into hard sparring on day one.",
  },
  {
    question: "What do I need for my first class?",
    answer:
      "Just shorts and a t-shirt, plus water. We'll lend you a gi if you want to try a kimono class. Come 15 minutes early and we'll show you around.",
  },
  {
    question: "Do I need to be fit or flexible to start?",
    answer:
      "No. Jiu-Jitsu gets you in shape — not the other way around. You set the pace, and every round is a workout that meets you where you are.",
  },
  {
    question: "How old do kids have to be?",
    answer:
      "Our Kids & Teens program runs from ages 4 to 15, split into age-appropriate groups led by dedicated youth coaches.",
  },
  {
    question: "Is there a long contract?",
    answer:
      "No lock-in. The membership is month to month and you can pause or cancel any time. Come for a single trial class first — €20, and nothing follows from it.",
  },
  {
    question: "How often should I train?",
    answer:
      "Two classes a week is plenty to make steady progress. Many members train more because they love it — with Unlimited, that's entirely up to you.",
  },
] as const;
