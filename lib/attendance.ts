/**
 * Trainingstage & Zuverlaessigkeits-Rechnung fuer den Mitgliederbereich.
 *
 * Wochentage mit Training: Mo–Sa (0=So … 6=Sa), passend zum Trainingsplan
 * in lib/config.ts (dort steht `schedule` fuer genau diese sechs Tage,
 * kein Sonntag). Falls sich das mal aendert: hier anpassen.
 */
export const TRAINING_WEEKDAYS = [1, 2, 3, 4, 5, 6];

function atMidnight(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export function isTrainingDay(date: Date): boolean {
  return TRAINING_WEEKDAYS.includes(date.getDay());
}

export function toDateOnly(d: Date): string {
  const copy = atMidnight(d);
  const y = copy.getFullYear();
  const m = String(copy.getMonth() + 1).padStart(2, "0");
  const day = String(copy.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Der juengste Trainingstag am oder vor `today` — heute selbst, wenn heute
 *  ein Trainingstag ist, sonst der letzte davor. Das ist der Tag, fuer den
 *  ein Mitglied gerade abstimmen kann (heute nach dem Training, oder
 *  nachtraeglich fuer den letzten verpassten Tag). */
export function mostRecentTrainingDay(today: Date): Date {
  const d = atMidnight(today);
  while (!isTrainingDay(d)) d.setDate(d.getDate() - 1);
  return d;
}

export function trainingDaysBetween(from: Date, to: Date): Date[] {
  const days: Date[] = [];
  const cur = atMidnight(from);
  const end = atMidnight(to);
  while (cur <= end) {
    if (isTrainingDay(cur)) days.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

export interface AttendanceVote {
  training_date: string;
  present: boolean;
}

export interface MemberStats {
  /** Trainingstage seit dem Beitritt, die schon vorbei sind (heute zaehlt
   *  noch nicht mit — die Abstimmung dafuer laeuft ja gerade erst). */
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

export function computeStats(joinedAt: Date, votes: AttendanceVote[]): MemberStats {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const eligible = trainingDaysBetween(joinedAt, yesterday);
  const eligibleDays = eligible.length;
  const votedDays = votes.length;
  const presentDays = votes.filter((v) => v.present).length;

  if (eligibleDays === 0) {
    return { eligibleDays: 0, votedDays, presentDays, reliabilityPct: 100, attendancePct: 100 };
  }

  const missedVotes = Math.max(0, eligibleDays - votedDays);
  const forgiven = Math.floor(eligibleDays / 5);
  const countedMisses = Math.max(0, missedVotes - forgiven);
  const reliabilityPct = Math.round(
    Math.min(1, (eligibleDays - countedMisses) / eligibleDays) * 100
  );
  const attendancePct = Math.round((presentDays / eligibleDays) * 100);

  return { eligibleDays, votedDays, presentDays, reliabilityPct, attendancePct };
}
