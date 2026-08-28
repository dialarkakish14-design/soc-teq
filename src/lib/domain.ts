import { RATING_DOMAINS, THRESHOLD, type Rating } from "../types";

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
