import { viennaDate } from "@/lib/membership";

/**
 * Trainingstage & Zuverlaessigkeits-Rechnung fuer den Mitgliederbereich.
 *
 * Wochentage mit Training: Mo–Sa (0=So … 6=Sa), passend zum Trainingsplan
 * in lib/config.ts (dort steht `schedule` fuer genau diese sechs Tage,
 * kein Sonntag). Falls sich das mal aendert: hier anpassen.
 *
 * Alles hier rechnet mit Kalendertagen als YYYY-MM-DD in Wiener Zeit
 * (31.10.2026). Vorher mit `Date` in der Zeitzone des Servers: auf Scalingo
 * UTC, also landete eine Stimme um 0:30 Wiener Zeit noch auf dem Vortag, und
 * das Verhalten hing davon ab, wo der Dyno laeuft. Ein Kalendertag als Text
 * hat keine Zeitzone mehr; Wochentag und Weiterzaehlen laufen ueber
 * Date.UTC, damit auch ein Sommerzeitwechsel keinen Tag verschluckt.
 *
 * "Heute" ist der Kalendertag in Wien, auch kurz nach Mitternacht. Die
 * Abstimmung zeigt das Datum ausdruecklich an ("Warst da: 31.10.2026"); wer
 * um 0:30 abstimmt, sieht also den neuen Tag und stimmt fuer ihn ab — genau
 * wie um 8 Uhr frueh. Eine Umschaltzeit (etwa 4 Uhr) waere eine zweite
 * Regel, die niemand auf der Seite sieht.
 */
export const TRAINING_WEEKDAYS = [1, 2, 3, 4, 5, 6];

function weekday(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Heute in Wien, YYYY-MM-DD. */
export function today(now: Date = new Date()): string {
  return viennaDate(now);
}

export function isTrainingDay(day: string): boolean {
  return TRAINING_WEEKDAYS.includes(weekday(day));
}

/** Der juengste Trainingstag am oder vor `day` — der Tag selbst, wenn er ein
 *  Trainingstag ist, sonst der letzte davor. Das ist der Tag, fuer den ein
 *  Mitglied gerade abstimmen kann (heute nach dem Training, oder
 *  nachtraeglich fuer den letzten verpassten Tag). */
export function mostRecentTrainingDay(day: string): string {
  let d = day;
  for (let i = 0; i < 7 && !isTrainingDay(d); i++) d = addDays(d, -1);
  return d;
}

/** Der Tag, fuer den Abstimmung und Anzeige gerade gelten. */
export function currentVoteDay(now: Date = new Date()): string {
  return mostRecentTrainingDay(today(now));
}

export function trainingDaysBetween(from: string, to: string): string[] {
  const days: string[] = [];
  // YYYY-MM-DD vergleicht sich als Text richtig.
  for (let d = from; d <= to; d = addDays(d, 1)) {
    if (isTrainingDay(d)) days.push(d);
  }
  return days;
}

export interface AttendanceVote {
  training_date: string;
  present: boolean;
}

export interface MemberStats {
  /** Trainingstage seit dem Beitritt, die zaehlen: alle bis gestern, und
   *  heute, sobald dafuer abgestimmt ist. */
  eligibleDays: number;
  votedDays: number;
  presentDays: number;
  /** Wie zuverlaessig ueberhaupt abgestimmt wurde. Jede 5. verpasste
   *  Abstimmung wird verziehen (wie ein Joker) und zaehlt nicht gegen die
   *  Quote — ein einzelner vergessener Tag reisst sie also nicht gleich
   *  runter. */
  reliabilityPct: number;
  /** Wie oft tatsaechlich anwesend, gemessen an allen Trainingstagen seit
   *  dem Beitritt (nicht nur an den abgestimmten). */
  attendancePct: number;
}

/**
 * Ueber 100 % (31.10.2026, End-to-End-Test): gezaehlt wurden die Trainings-
 * tage bis GESTERN, die Stimmen aber samt der von HEUTE. Wer gestern
 * beigetreten war und gestern und heute "War da" drueckte, stand bei 2 von 1
 * = 200 %, und in der Rangliste womoeglich vor allen anderen.
 *
 * Jetzt zaehlt heute mit, sobald dafuer abgestimmt ist: so liest es sich fuer
 * Mitglieder richtig ("ich war heute da" erhoeht die Zahl sofort), und ein
 * noch offener heutiger Tag drueckt die Quote nicht, solange das Training
 * vielleicht noch bevorsteht. Gezaehlt werden nur Stimmen fuer Tage aus genau
 * dieser Menge — eine Stimme vor dem Beitrittsdatum (Aufnahme an einem
 * Sonntag, Stimme fuer Samstag) oder fuer einen Tag, der kein Trainingstag
 * mehr ist, kann Zaehler und Nenner nicht mehr auseinanderziehen. Die
 * Obergrenze 100 % ist danach nur noch Absicherung.
 *
 * `joinedAt` ist das Beitrittsdatum als YYYY-MM-DD (`joined_at::text`), nicht
 * als Date: `pg` macht aus einer date-Spalte Mitternacht in der Zeitzone des
 * Servers, und daraus wird je nach Dyno ein anderer Tag.
 */
export function computeStats(
  joinedAt: string,
  votes: AttendanceVote[],
  now: Date = new Date()
): MemberStats {
  const todayDay = today(now);
  const votedOn = new Map(votes.map((v) => [v.training_date, v.present]));

  const eligible = trainingDaysBetween(joinedAt, addDays(todayDay, -1));
  if (joinedAt <= todayDay && isTrainingDay(todayDay) && votedOn.has(todayDay)) {
    eligible.push(todayDay);
  }
  const eligibleDays = eligible.length;
  const votedDays = eligible.filter((d) => votedOn.has(d)).length;
  const presentDays = eligible.filter((d) => votedOn.get(d) === true).length;

  if (eligibleDays === 0) {
    return { eligibleDays: 0, votedDays, presentDays, reliabilityPct: 100, attendancePct: 100 };
  }

  const missedVotes = Math.max(0, eligibleDays - votedDays);
  const forgiven = Math.floor(eligibleDays / 5);
  const countedMisses = Math.max(0, missedVotes - forgiven);
  const reliabilityPct = Math.round(
    Math.min(1, (eligibleDays - countedMisses) / eligibleDays) * 100
  );
  const attendancePct = Math.round(Math.min(1, presentDays / eligibleDays) * 100);

  return { eligibleDays, votedDays, presentDays, reliabilityPct, attendancePct };
}
