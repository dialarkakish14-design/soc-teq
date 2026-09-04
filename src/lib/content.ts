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
  "Surgical dermatology": "#3E5C76",
  Dermatopathology: "#7A3B69",
  "Pediatric dermatology": "#B5652E",
  "Specialty clinics": "#5C7A4A",
  Conferences: "#8A7F3D",
};

export const PAPER_URL = "https://doi.org/10.1080/0142159X.2026.2637609";

export const RM_DEFINITION =
  "RM — Representational Mean. A topic's overall score: the mean of the five rating items (depth, visual clarity, nuance, management, confidence), each averaged across everyone who rated it. Below 3.5 flags it as a priority educational need.";

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
    body: "63% of dermatology residents get some skin of color teaching. Only 11% get a dedicated rotation. By 2050, over half the US population will have skin of color. Closing that gap is what makes diagnosis accurate for every patient.",
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

export const WHY_CARDS: MissionCard[] = [
  {
    eyebrow: "The gap, in numbers",
    title: "What residents actually get taught",
    subtitle: "",
    body: "63% of dermatology residents get some skin of color teaching. Only 11% get a dedicated rotation. And by 2050, over half the US population will have skin of color. What's in front of you in clinic and what you were trained on don't match.",
    tone: "rose",
  },
  {
    eyebrow: "Why this keeps happening",
    title: "It's not a lack of interest",
    subtitle: "",
    body: "Program directors point to the same two barriers, over and over: no one on faculty with the expertise, and no protected lecture time. It's not that nobody cares — it's that nobody owns it day to day. That's the gap SoC-TEQ was built to fill.",
    tone: "amber",
  },
  {
    eyebrow: "What patients are dealing with",
    title: "These aren't rare conditions",
    subtitle: "",
    body: "Hidradenitis suppurativa is 2.5x more common, keloids 20x more common, melasma 1.3x more common in patients with skin of color — and they're still under-researched and easy to miss when you haven't seen enough of them.",
    tone: "plum",
  },
  {
    eyebrow: "What's been tried",
    title: "Dedicated clinics help — but don't scale",
    subtitle: "",
    body: "Skin of color clinics work, and residents who rotate through them say so. But most run on one faculty member's own time, with no funding and no administrative support behind them. A rotation you can't scale isn't a fix. Daily tracking is.",
    tone: "sage",
  },
  {
    eyebrow: "Where you come in",
    title: "You don't have to wait to be faculty",
    subtitle: "",
    body: "Logging a topic, flagging a gap, rating what you actually saw — that's the intervention. It's small, it happens every day, and it's yours to run.",
    tone: "teal",
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

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Why does this framework only focus on images?",
    answer:
      "This framework targets a specific diagnostic gap: skin of color images make up only about 4.5% of medical textbooks, which is linked to missed or delayed diagnoses. Measuring whether an image was shown and discussed gives a clear, consistent way to track that gap. Other differences — pathophysiology, epidemiology, treatment response — matter too, but sit outside what this tool measures unless they meet the visual-relevance criteria.",
  },
  {
    question: "What about content that's skin-of-color relevant but not visual?",
    answer:
      "Yes — and it's a genuine gap in what's tracked today. If a topic isn't visually relevant, it's skipped entirely, even when it holds valuable non-visual skin of color content. Expanding this is something we're actively working on.",
  },
  {
    question: "What's planned for future versions?",
    answer:
      "Ideas being explored: quizzes, linking articles to a condition, resources suggested for weak topics, a \"did you know\" section, and voice notes that get transcribed automatically. None of this is built yet — what comes next depends partly on resident feedback.",
  },
  {
    question: "Why is adding the program profile important?",
    answer:
      "It gives context to the scores. A program with no dedicated SoC curriculum or limited image resources should be read differently than one with both, and the profile makes that visible instead of leaving low scores to look like a mystery.",
  },
  {
    question: "What if there's genuinely no gap between SoC and non-SoC teaching for a condition?",
    answer:
      "That's a valid outcome, and useful data on its own. Rating isn't about manufacturing a gap — it's about checking systematically instead of assuming. A condition that consistently scores well shows the teaching is working.",
  },
  {
    question: "Is my identity really anonymous? Does the app store my password?",
    answer:
      "Yes, and no — in the direction that protects you. Every rating is tied to a resident code like \"Resident A,\" never your name; your real name only appears in the Team directory, never next to a rating. And the app never stores your password — sign-in is handled entirely by Supabase's own authentication system.",
  },
  {
    question: "Can a program director or faculty member see my individual ratings?",
    answer:
      "No. A program lead can edit the program's shared profile card, but they're locked out of individual ratings — enforced in the database itself, not just hidden in the app.",
  },
  {
    question: "What happens if I forget to rate something?",
    answer:
      "Ratings stay open until 4am the next morning. If you haven't rated or marked yourself absent by then, you're recorded as \"no response\" — never treated as a bad score.",
  },
  {
    question: "Can I change a rating after I submit it?",
    answer:
      "Yes, right up until the day closes at 4am. After that it locks permanently, so the data reflects what people thought in the moment, not a later second-guess.",
  },
];
