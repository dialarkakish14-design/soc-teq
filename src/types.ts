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
  reminder_enabled: boolean;
  reminder_hours_before: 1 | 3 | null;
}

export interface ProgramPublic {
  id: string;
  name: string;
}

export interface MyProgram {
  id: string;
  name: string;
  profile_complete: boolean;
  setting: string | null;
  patient_mix: string | null;
  existing_curriculum: string | null;
  resident_count: string | null;
  location: string | null;
  timezone: string;
  profile_updated_at: string | null;
}

export interface Day {
  id: string;
  program_id: string;
  pgy: Pgy;
  date: string;
  logger_id: string | null;
  emergency_claims: number;
}

export const SESSION_TYPES = [
  "Lecture / structured didactic",
  "Grand rounds",
  "Journal club",
  "Case conference / unknowns",
  "Tumor board / multidisciplinary conference",
  "Dermatopathology teaching / sign-out",
  "Workshop / skills lab",
  "Outpatient clinic",
  "Inpatient / consult service",
  "Other teaching session",
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
] as const;
export type SkinType = (typeof SKIN_TYPES)[number];

// The three tones tracked for coverage purposes — "Mixed across IV–VI" counts
// toward all three. A topic marked as covered always names a real tone —
// there's no "not sure" option, since covered already means the logger
// confirmed a IV–VI image was shown.
export const FITZPATRICK_TONES: SkinType[] = ["Fitzpatrick IV", "Fitzpatrick V", "Fitzpatrick VI"];

export interface Topic {
  id: string;
  session_id: string;
  title: string;
  incomplete: boolean;
  image_soc: boolean | null;
  discussed_soc: boolean | null;
  soc_covered: boolean;
  skin_type: SkinType | null;
  nuance_applicable: boolean;
  nuance_scope_reason: string | null;
  mgmt_applicable: boolean;
  mgmt_scope_reason: string | null;
}

export interface RatingDomainKey {
  key: "depth" | "clarity" | "nuance" | "mgmt" | "conf";
  name: string;
  statement: string;
  hint?: string;
}

export const RATING_DOMAINS: RatingDomainKey[] = [
  {
    key: "depth",
    name: "Depth",
    statement: "The SoC content received comparable emphasis to the rest of the topic.",
    hint: "Meaning: how much attention skin of color received relative to the rest of the topic, not how advanced the content was. A session can score well on nuance or management while still scoring low here if skin of color received only a brief mention compared with the depth given to the rest of the topic.",
  },
  {
    key: "clarity",
    name: "Visual clarity",
    statement: "Clear, diagnostically useful images of skin of color were used.",
    hint: "Meaning: whether the images clearly demonstrated the relevant findings in skin of color and were useful for learning and recognition.",
  },
  {
    key: "nuance",
    name: "Nuance",
    statement: "Diagnostic nuances and pitfalls relevant to skin of color were explicitly addressed.",
    hint: "Meaning: whether the session addressed presentations, examination findings, or complications that may appear differently, be less apparent, or be more easily missed in skin of color.",
  },
  {
    key: "mgmt",
    name: "Management",
    statement: "Management considerations relevant to skin of color were clearly discussed.",
    hint: "Meaning: whether treatment, monitoring, counseling, or other care considerations that may differ or require particular attention in skin of color were addressed, beyond how the condition looks or is diagnosed.",
  },
  {
    key: "conf",
    name: "Confidence",
    statement: "I feel more capable of applying what I learned in this session to patients with skin of color.",
    hint: "Meaning: whether this specific session made you feel more confident applying what it actually covered, whether that was diagnosis, management, or both, to patients with skin of color.",
  },
];

export interface Rating {
  id: string;
  topic_id: string;
  resident_id: string;
  depth: number;
  clarity: number;
  nuance: number | null;
  mgmt: number | null;
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

export interface Cycle {
  id: string;
  program_id: string;
  pgy: Pgy;
  start_date: string;
}

export const CLAIM_FORMATS = ["Peer-teaching module", "SoC journal club", "Digital repository case set"] as const;
export type ClaimFormat = (typeof CLAIM_FORMATS)[number];

export interface Claim {
  id: string;
  cycle_id: string;
  resident_id: string;
  topic_title: string;
  format: ClaimFormat;
  status: "planned" | "delivered";
  scholarly: boolean;
}

export interface Assessment {
  id: string;
  cycle_id: string;
  resident_id: string;
  phase: "baseline" | "followup";
  score: number;
}

export interface Resource {
  id: string;
  program_id: string;
  pgy: Pgy;
  topic_title: string;
  resident_id: string;
  source: string;
  url: string | null;
  takeaway: string;
  created_at: string;
}
