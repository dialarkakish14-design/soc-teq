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
    body: "Skin of color representation has been limited throughout medical education, and residency programs often lack tools to identify or address these gaps. Many residents report limited formal teaching on skin of color, and studies show that differences in clinical presentation across skin tones can affect diagnostic accuracy. Strengthening representation in training helps support equitable, high-quality care for all patients.",
    tone: "rose",
  },
  {
    eyebrow: "Your impact",
    title: "Resident-led change",
    subtitle: "",
    body: "Curricular change moves fastest when resident perspectives sit at the centre. Change needs capability, opportunity and motivation. This app doesn't teach you passively, it's shaped directly by you, for you. You aren't only a learner here, you're helping shape what gets taught next.",
    tone: "plum",
  },
  {
    eyebrow: "The six-month loop",
    title: "Our data process",
    subtitle: "",
    body: "Months 1–3 you log. At the end of month 3, topics averaging below 3.5 are flagged and a baseline assessment is taken. Months 4–6 those gaps trigger resident-led remediation. Waiting three months before retesting is deliberate: feeling confident right after a session doesn't always mean it stuck, so what gets measured is what's actually retained.",
    tone: "amber",
  },
  {
    eyebrow: "Clinical excellence",
    title: "High-quality training",
    subtitle: "",
    body: "We evaluate morphology, distribution and pattern recognition, alongside diagnostic pitfalls and skin of color management, then re-test after three months to check the learning held.",
    tone: "sage",
  },
  {
    eyebrow: "Your safe space",
    title: "Privacy and trust",
    subtitle: "",
    body: "No patient-identifying information is ever registered or stored. In every export and every rating, residents appear as Resident A, B, C, never by name. Your password is never visible to us either; sign-in is handled entirely by Supabase's own encrypted authentication.",
    tone: "teal",
  },
  {
    eyebrow: "Master milestones",
    title: "Your career wins",
    subtitle: "",
    body: "SoC-TEQ activity lines up with ACGME's core competencies. Patient care and practice-based learning happen every time you log and rate a topic.",
    tone: "plum",
  },
];

export const WHY_INTRO =
  "Dermatology is learned through repeated exposure to patterns, images, cases, and clinical experiences. Research suggests that representation across skin tones remains variable across training, creating an opportunity to better understand what residents encounter over time.\n\nSoC-TEQ was designed to help make those learning experiences easier to see, reflect on, and strengthen.";

export const WHY_CARDS: MissionCard[] = [
  {
    eyebrow: "Dermatology trains the eye",
    title: "What you see shapes what you recognize",
    subtitle: "",
    body: "Dermatology relies heavily on visual pattern recognition. No residency can expose trainees to every possible presentation in clinic, so the images, cases, lectures, and conferences residents learn from also play an important role.\n\nResearch continues to show limited representation of diverse skin tones in commonly used educational materials.\n\nBroader exposure can help strengthen recognition across a wider range of clinical presentations.",
    tone: "rose",
  },
  {
    eyebrow: "Exposure across training",
    title: "A lecture is only one part of the learning experience",
    subtitle: "",
    body: "In one survey, 63.2% of dermatology residents had access to skin of color didactics, while 11.2% had a dedicated skin of color rotation.\n\nSkin of color education may also be presented as a distinct topic rather than integrated across diseases and throughout residency.\n\nLooking beyond whether a topic was taught can help us understand where, how often, and in what settings residents encounter it.",
    tone: "amber",
  },
  {
    eyebrow: "Why exposure matters",
    title: "Familiarity supports recognition",
    subtitle: "",
    body: "Differences in clinical presentation can contribute to misdiagnosis and delayed diagnosis in patients with skin of color.\n\nPatients also value clinicians who feel knowledgeable and comfortable caring for their skin and hair. Studies describe greater satisfaction when patients feel their clinicians understand these concerns.\n\nRepresentation in training can support recognition, confidence, and the experience of care.",
    tone: "plum",
  },
  {
    eyebrow: "This is part of everyday dermatology",
    title: "Diverse presentations are part of routine care",
    subtitle: "",
    body: "Hidradenitis suppurativa is reported as 2.5× more common in African American patients, keloids 20× more common, and melasma 1.3× more common in Hispanic patients.\n\nSeveral conditions affecting patients with skin of color also remain underrepresented in dermatologic research.\n\nBy 2050, people with skin of color are projected to make up more than half of the U.S. population.\n\nTraining across skin tones helps prepare residents for the diversity of patients they will care for.",
    tone: "sage",
  },
  {
    eyebrow: "Dedicated clinics add valuable exposure",
    title: "One part of a broader learning environment",
    subtitle: "",
    body: "Dedicated skin of color clinics provide focused expertise and structured opportunities for trainee learning.\n\nThey are not available in every setting. In one survey, 26.4% of respondents worked in a dedicated skin of color clinic, most within academic centers. These clinics also reported practical challenges related to scheduling, reimbursement, provider time, and institutional support.\n\nDedicated rotations can strengthen training, while year-round learning also takes place across many other settings.",
    tone: "teal",
  },
  {
    eyebrow: "Supporting consistent learning",
    title: "Structure can make improvement easier",
    subtitle: "",
    body: "The literature suggests that interest in strengthening skin of color education is already present.\n\nAt the same time, practical factors such as time, structure, available expertise, and a clear plan can influence how consistently content is incorporated across training.\n\nA clearer view of residents' learning experiences can help programs recognize what is working well and where there may be opportunities to build further.",
    tone: "rose",
  },
  {
    eyebrow: "Where SoC-TEQ comes in",
    title: "Turn everyday learning into insight",
    subtitle: "",
    body: "Residents learn across clinic, lectures, conferences, slide decks, cases, and conversations.\n\nSoC-TEQ gives those day-to-day learning experiences a place to become visible over time.\n\nLog what you encountered.\nReflect on the quality of the exposure.\nNote opportunities to build on it.\nShare what was useful.\nSee patterns emerge.\n\nSoC-TEQ does not replace faculty expertise, dedicated clinics, or existing curricula.\n\nIt helps residents and programs better understand how skin of color education is experienced across day-to-day training.",
    tone: "amber",
  },
];

export const WHY_AGENCY_CARD = {
  eyebrow: "You're part of the curriculum too",
  title: "You don't have to wait to be faculty",
  body: "Residents are uniquely positioned to notice patterns in education because they experience the curriculum every day.\n\nThe literature encourages residents to identify areas where representation could be strengthened, bring diverse cases into conferences, contribute to teaching materials, and work with faculty toward lasting curricular improvement.\n\nWith SoC-TEQ, that can start small:\n\nNotice. Log. Share. Improve.",
};

export const HOWTO_STEPS: { title: string; body: string }[] = [
  {
    title: "Someone claims the logger, once a day",
    body: "Whoever opens the app and claims it, that's it. One tap, and having a single logger means the team never ends up with a conflicting yes and no on the same session.",
  },
  {
    title: "Capture topics in the room",
    body: "The logger types just the topic name during the session, one field, five seconds. A notebook works just as well: jot the keywords as you go and finish in the app afterwards.",
  },
  {
    title: "Answer the two criteria after the session",
    body: "Was an image of Fitzpatrick IV–VI shown, and was skin of color explicitly discussed? Both must be true for the topic to count as covered. Talk it through with the residents who were there: the coverage call belongs to the room, and the logger records what you settle on together.",
  },
  {
    title: "Everyone rates what was covered",
    body: "Covered topics appear for your team to score on the five items: the depth, the images, the diagnostic nuance, the management, and how ready you feel with the condition afterwards. Ratings stay open until 4am the next day.",
  },
  {
    title: "Say so if you weren't there",
    body: "One tap. An absence is excluded from the average, never counted as a zero, and it never pulls a score down.",
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
      "This framework targets a specific diagnostic gap: dermatology training materials are still thin on skin of color, and that gap is linked to missed or delayed diagnoses. Measuring whether an image was shown and discussed gives a clear, consistent way to track it. Other differences, like pathophysiology, epidemiology, or treatment response, matter too, but sit outside what this tool measures unless they meet the visual-relevance criteria.",
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
