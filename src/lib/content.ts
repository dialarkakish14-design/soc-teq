// Static explainer copy for the pre-signup screens — mission map and how-to
// steps, ported verbatim from the prototype (build spec section 1: match the
// wording, don't rewrite it).

// A small color accent per session type, so a stack of session cards scans
// at a glance instead of reading as identical white blocks. Kept to a dot
// next to the label rather than tinting the whole card, so topic content
// stays on a neutral background.
export const SESSION_TYPE_COLOR: Record<string, string> = {
  Lecture: "#0E7C72",
  Didactic: "#5E3F73",
  "Grand round": "#8F5205",
  "Clinic outpatient": "#3D6B49",
  "Clinic inpatient": "#93393E",
  "Journal club": "#2B5F8A",
  "Tumor board": "#6B5B95",
};

export const PAPER_URL = "https://doi.org/10.1080/0142159X.2026.2637609";

export type MissionTone = "teal" | "rose" | "plum" | "amber" | "sage";

export interface MissionCard {
  eyebrow: string;
  title: string;
  subtitle: string;
  body: string;
  tone: MissionTone;
}

export const MISSION_CARDS: MissionCard[] = [
  {
    eyebrow: "The definition",
    title: "Our core framework",
    subtitle: "",
    body: "A resident-led framework to quantify and improve the quality of skin of color education through data-driven feedback loops.",
    tone: "teal",
  },
  {
    eyebrow: "Why SoC-TEQ?",
    title: "Addressing the gap",
    subtitle: "",
    body: "Skin of color images make up only 4.5% of medical texts. Physicians are twice as likely to miss malignant lesions in skin of color. Closing that representation gap is what makes diagnosis accurate for every patient.",
    tone: "rose",
  },
  {
    eyebrow: "Your impact",
    title: "Resident-led change",
    subtitle: "",
    body: "Curricular change moves fastest when resident perspectives sit at the centre. Change needs capability, opportunity and motivation. You aren't only a learner here — you're an active peer-educator.",
    tone: "plum",
  },
  {
    eyebrow: "The six-month loop",
    title: "Our data process",
    subtitle: "",
    body: "Months 1–3 you log. At the end of month 3, topics averaging below 3.5 are flagged and a baseline assessment is taken. Months 4–6 those gaps trigger resident-led remediation. The three-month gap before retesting avoids recall bias, so what's measured is retention rather than transient confidence.",
    tone: "amber",
  },
  {
    eyebrow: "Clinical excellence",
    title: "High-quality training",
    subtitle: "",
    body: "We evaluate morphologic nuance, pitfalls and skin of color management, then re-test after three months to check the learning held.",
    tone: "sage",
  },
  {
    eyebrow: "Your safe space",
    title: "Privacy and trust",
    subtitle: "",
    body: "No patient-identifying information is ever registered or stored.",
    tone: "teal",
  },
  {
    eyebrow: "Master milestones",
    title: "Your career wins",
    subtitle: "",
    body: "SoC-TEQ activity maps directly onto ACGME core competencies, and counts toward patient care and practice-based learning requirements.",
    tone: "plum",
  },
];

export const HOWTO_STEPS: { title: string; body: string }[] = [
  {
    title: "Someone claims the logger, once a day",
    body: "Whoever gets there first — it takes one tap. Having a single logger means the cohort never ends up with a conflicting yes and no on the same session.",
  },
  {
    title: "Capture topics in the room",
    body: "The logger types just the topic name during the session — five seconds, one field. A notebook works just as well: jot the keywords as you go and finish in the app afterwards, while it's fresh.",
  },
  {
    title: "Answer the two criteria after the session",
    body: "Was an image of Fitzpatrick IV–VI shown, and was skin of color explicitly discussed? Both must be true for the topic to count as covered. Talk it through with the residents who were there — the coverage call belongs to the room, and the logger records what you settle on together.",
  },
  {
    title: "Everyone rates what was covered",
    body: "Covered topics appear for your cohort to score on the five items: the depth, the images, the diagnostic nuance, the management, and how ready you feel with the condition afterwards. Ratings stay open until 4am the next day.",
  },
  {
    title: "Say so if you weren't there",
    body: "One tap. An absence is excluded from the average — never counted as a zero, and it never pulls a score down.",
  },
  {
    title: "Skip non-visual topics",
    body: "Biostatistics, health policy, research methods and the like sit outside the framework. No need to register them at all.",
  },
];
