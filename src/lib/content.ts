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

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Why does this only focus on images — what about skin of color topics that aren't about how something looks?",
    answer:
      "The specific gap this framework targets is diagnostic: skin of color images make up only about 4.5% of medical textbooks, and that gap is directly linked to missed or delayed diagnoses. \"Was an image shown, was it explicitly discussed\" gives a clean, comparable measure of that one problem. It doesn't mean other differences — pathophysiology, epidemiology, how a condition responds to treatment — don't matter. They do. They're just outside what this tool measures right now.",
  },
  {
    question: "What about content that's skin-of-color relevant but not visual?",
    answer:
      "A real gap, and not one we've decided doesn't matter — it's just not tracked yet. Right now, if a topic isn't visually relevant it's skipped entirely, even when there's genuinely important non-visual skin of color content in it. It's something actively being thought through, not something dismissed.",
  },
  {
    question: "What's planned for future versions?",
    answer:
      "A few ideas being explored: quizzes on topics you've logged, linking or sharing articles directly to a condition (the shared-reading feature already does a version of this during remediation), resources automatically suggested for whatever your cohort is scoring low on, a \"did you know\" or myth-busting section, and even recording a quick voice note that gets transcribed and organized automatically. None of this is built yet — what actually gets built next partly depends on what residents say would help.",
  },
  {
    question: "What if there's genuinely no gap between SoC and non-SoC teaching for a condition?",
    answer:
      "That's a completely valid outcome, and useful data on its own. The point of rating isn't to manufacture a gap where none exists — it's to check systematically instead of assuming. A condition that consistently scores well with no coverage gap is evidence the teaching is working, not a problem with the tool.",
  },
  {
    question: "Is my identity really anonymous? Does the app store my password?",
    answer:
      "Yes, and no — in the direction that protects you. Every rating is tied to a resident code like \"Resident A,\" never your name. Your real name only ever appears in the Team screen's cohort directory, never next to a rating or a note. And the app never stores your password in any form — sign-in is handled entirely by Supabase's own authentication system, separate from this app's data.",
  },
  {
    question: "Can a program director or faculty member see my individual ratings?",
    answer:
      "No. A program lead can edit the program's shared profile card, but they're deliberately locked out of individual ratings — that's enforced in the database itself, not just hidden in the app.",
  },
  {
    question: "What happens if I forget to rate something?",
    answer:
      "Ratings stay open until 4am the following morning. If you haven't rated and haven't marked yourself absent by then, you're recorded as \"no response\" — a record that you weren't reached, never treated as a bad score.",
  },
  {
    question: "Can I change a rating after I submit it?",
    answer:
      "Yes, right up until the day closes at 4am. After that it locks permanently, so a topic's data reflects what people actually thought in the moment, not a later second-guess.",
  },
];
