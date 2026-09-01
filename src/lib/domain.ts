import { RATING_DOMAINS, THRESHOLD, type Absence, type Rating, type RatingDomainKey } from "../types";

export function todayLocalDate(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Ratings for a day are open until 04:00 the following morning (build spec section 6).
export function isDayOpen(date: string): boolean {
  const close = new Date(date + "T00:00:00");
  close.setDate(close.getDate() + 1);
  close.setHours(4, 0, 0, 0);
  return new Date() < close;
}

export function closesAtLabel(date: string): string {
  const close = new Date(date + "T00:00:00");
  close.setDate(close.getDate() + 1);
  return close.toLocaleDateString(undefined, { weekday: "short" }) + " 4:00am";
}

export function formatDateLong(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function formatDateShort(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function dayBack(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface TopicScore {
  perItem: Record<string, number>;
  overall: number;
  n: number;
}

// The topic score is the mean of the five item means, each taken across only
// the residents who actually rated — never divided by cohort size (build
// spec section 3.3).
export function scoreTopic(ratings: Rating[]): TopicScore | null {
  if (!ratings.length) return null;
  const perItem: Record<string, number> = {};
  for (const d of RATING_DOMAINS) {
    perItem[d.key] = ratings.reduce((sum, r) => sum + (r[d.key] as number), 0) / ratings.length;
  }
  const overall = RATING_DOMAINS.reduce((sum, d) => sum + perItem[d.key], 0) / RATING_DOMAINS.length;
  return { perItem, overall, n: ratings.length };
}

export function isBelowThreshold(overall: number): boolean {
  return overall < THRESHOLD;
}

// A flattened, date-stamped topic — the shape every Summary aggregation
// below operates on. Only ever contains complete (non-incomplete) topics;
// callers filter those out before building this list.
export interface TopicEntry {
  id: string;
  title: string;
  socCovered: boolean;
  date: string;
  sessionType: string;
  ratings: Rating[];
  absences: Absence[];
}

export interface SummaryStats {
  visualCount: number;
  coveredCount: number;
  avgScore: number | null;
  gaps: { entry: TopicEntry; score: TopicScore }[];
  exposurePct: number;
}

// Every visually relevant topic counted, coverage rate, and which covered
// topics scored below threshold (the priority educational needs).
export function summaryStats(entries: TopicEntry[]): SummaryStats {
  const covered = entries.filter((e) => e.socCovered);
  const scored = covered
    .map((e) => ({ entry: e, score: scoreTopic(e.ratings) }))
    .filter((x): x is { entry: TopicEntry; score: TopicScore } => !!x.score);
  const avgScore = scored.length ? scored.reduce((a, x) => a + x.score.overall, 0) / scored.length : null;
  const gaps = scored.filter((x) => isBelowThreshold(x.score.overall));
  return {
    visualCount: entries.length,
    coveredCount: covered.length,
    avgScore,
    gaps,
    exposurePct: entries.length ? Math.round((covered.length / entries.length) * 100) : 0,
  };
}

export interface ResponseRecord {
  rated: number;
  declared: number;
  noResponse: number;
  waiting: number;
  total: number;
  responseRatePct: number;
}

// Absences are always excluded from the average, never counted as a zero —
// this just tallies who's accounted for, not what they scored (build spec
// section 3.3).
export function responseRecord(entries: TopicEntry[], cohortSize: number): ResponseRecord {
  let rated = 0;
  let declared = 0;
  let noResponse = 0;
  let waiting = 0;
  for (const e of entries) {
    if (!e.socCovered) continue;
    const r = e.ratings.length;
    const d = e.absences.filter((a) => a.reason === "declared").length;
    const n = e.absences.filter((a) => a.reason === "no_response").length;
    waiting += Math.max(0, cohortSize - r - d - n);
    rated += r;
    declared += d;
    noResponse += n;
  }
  const total = rated + declared + noResponse + waiting;
  const responded = rated + declared + noResponse;
  return { rated, declared, noResponse, waiting, total, responseRatePct: responded ? Math.round((rated / responded) * 100) : 0 };
}

// Mean of each item's mean across every scored, covered topic in the list.
export function itemAverages(entries: TopicEntry[]): Record<string, number> | null {
  const scored = entries
    .filter((e) => e.socCovered)
    .map((e) => scoreTopic(e.ratings))
    .filter((s): s is TopicScore => !!s);
  if (!scored.length) return null;
  const per: Record<string, number> = {};
  for (const d of RATING_DOMAINS) {
    per[d.key] = scored.reduce((a, s) => a + s.perItem[d.key], 0) / scored.length;
  }
  return per;
}

export interface MonthlyBrief {
  coveredCount: number;
  weakest: RatingDomainKey;
  weakestVal: number;
  strongest: RatingDomainKey;
  strongestVal: number;
  gapTitles: string[];
  uncoveredTitles: string[];
}

// A plain-logic-generated summary — this is the "deliberate placeholder"
// the build spec calls for in place of an AI-written brief (section 9).
export function monthlyBrief(entries: TopicEntry[]): MonthlyBrief | null {
  const covered = entries.filter((e) => e.socCovered);
  const scored = covered
    .map((e) => ({ entry: e, score: scoreTopic(e.ratings) }))
    .filter((x): x is { entry: TopicEntry; score: TopicScore } => !!x.score);
  if (!scored.length) return null;
  const per: Record<string, number> = {};
  for (const d of RATING_DOMAINS) {
    per[d.key] = scored.reduce((a, o) => a + o.score.perItem[d.key], 0) / scored.length;
  }
  const sorted = [...RATING_DOMAINS].sort((a, b) => per[a.key] - per[b.key]);
  const weakest = sorted[0];
  const strongest = sorted[sorted.length - 1];
  return {
    coveredCount: covered.length,
    weakest,
    weakestVal: per[weakest.key],
    strongest,
    strongestVal: per[strongest.key],
    gapTitles: scored.filter((o) => isBelowThreshold(o.score.overall)).map((o) => o.entry.title),
    uncoveredTitles: entries.filter((e) => !e.socCovered).map((e) => e.title),
  };
}
