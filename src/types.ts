export type Pgy = "PGY-2" | "PGY-3" | "PGY-4";

export interface Resident {
  id: string;
  program_id: string;
  pgy: Pgy;
  full_name: string;
  email: string;
  username: string;
  resident_code: string;
  role: "resident" | "program_lead";
  precourse_confirmed: boolean;
}

export interface ProgramPublic {
  id: string;
  name: string;
}

export interface Day {
  id: string;
  program_id: string;
  pgy: Pgy;
  date: string;
  logger_id: string | null;
}

export const SESSION_TYPES = [
  "Lecture",
  "Didactic",
  "Grand round",
  "Clinic outpatient",
  "Clinic inpatient",
  "Journal club",
  "Tumor board",
] as const;
export type SessionType = (typeof SESSION_TYPES)[number];

export interface Session {
  id: string;
  day_id: string;
  type: SessionType;
}

export const SKIN_TYPES = [
  "Fitzpatrick IV",
  "Fitzpatrick V",
  "Fitzpatrick VI",
  "Mixed across IV–VI",
  "Not specified",
] as const;
export type SkinType = (typeof SKIN_TYPES)[number];

export interface Topic {
  id: string;
  session_id: string;
  title: string;
  incomplete: boolean;
  image_soc: boolean | null;
  discussed_soc: boolean | null;
  soc_covered: boolean;
  skin_type: SkinType | null;
}

export interface RatingDomainKey {
  key: "depth" | "clarity" | "nuance" | "mgmt" | "conf";
  name: string;
  statement: string;
}

export const RATING_DOMAINS: RatingDomainKey[] = [
  {
    key: "depth",
    name: "Depth",
    statement: "The SoC content was taught with the same emphasis as non-SoC content.",
  },
  {
    key: "clarity",
    name: "Visual clarity",
    statement: "High-quality, diagnostic images of skin of color were used.",
  },
  {
    key: "nuance",
    name: "Nuance",
    statement:
      "Diagnostic pitfalls specific to skin of color were explicitly addressed — for example erythema masking.",
  },
  {
    key: "mgmt",
    name: "Management",
    statement: "Management considerations specific to skin of color were clearly discussed.",
  },
  {
    key: "conf",
    name: "Confidence",
    statement: "I feel more capable of managing this condition in skin of color after this session.",
  },
];

export interface Rating {
  id: string;
  topic_id: string;
  resident_id: string;
  depth: number;
  clarity: number;
  nuance: number;
  mgmt: number;
  conf: number;
  note: string | null;
}

export interface Absence {
  id: string;
  topic_id: string;
  resident_id: string;
  reason: "declared" | "no_response";
}

export const THRESHOLD = 3.5;
