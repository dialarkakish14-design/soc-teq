// Static explainer copy for the pre-signup screens — mission map and how-to
// steps, ported verbatim from the prototype (build spec section 1: match the
// wording, don't rewrite it).

// A small color accent per session type, so a stack of session cards scans
// at a glance instead of reading as identical white blocks. Kept to a dot
// next to the label rather than tinting the whole card, so topic content
// stays on a neutral background.
export const SESSION_TYPE_COLOR: Record<string, string> = {
  "Lecture / structured didactic": "#0E7C72",
  "Grand rounds": "#8F5205",
  "Journal club": "#2B5F8A",
  "Case conference / unknowns": "#5E3F73",
  "Tumor board / multidisciplinary conference": "#6B5B95",
  "Dermatopathology teaching / sign-out": "#7A3B69",
  "Workshop / skills lab": "#B5652E",
  "Outpatient clinic": "#3D6B49",
  "Inpatient / consult service": "#93393E",
  "Other teaching session": "#5C7A4A",
};

export const PAPER_URL = "https://doi.org/10.1080/0142159X.2026.2637609";

export const COVERAGE_DEFINITIONS: { title: string; body: string }[] = [
  {
    title: "Visually relevant topic",
    body: "A topic counts as visually relevant when its appearance, morphology, or visual pattern is important to recognizing or interpreting it. This includes visual modalities such as dermoscopy, AI-assisted image analysis, and dermatopathology.",
  },
  {
    title: "Image of Fitzpatrick IV–VI shown",
    body: "A clinical image depicting skin consistent with Fitzpatrick IV–VI counts. One clearly visible image is enough. Composite or mixed-tone images also count if at least one clinically relevant example represents IV–VI.",
  },
  {
    title: "Skin of color explicitly discussed",
    body: "A discussion counts when it meaningfully connects the topic to skin of color. This may include differences in clinical presentation or management, diagnostic considerations, epidemiology, culturally relevant terminology, socioeconomic factors, or population-specific practices such as hair care or skin bleaching. It does not need to cover every aspect; it just needs to include a substantive skin-of-color-specific point.",
  },
];

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
    body: "A resident-led framework to track and strengthen skin of color education through data-informed feedback loops.",
    tone: "teal",
  },
  {
    eyebrow: "What we follow",
    title: "Learning across the year",
    subtitle: "",
    body: "SoC-TEQ follows education as it happens across training. Residents log their learning experiences over time, creating a longitudinal view of what they encounter and how that exposure develops.",
    tone: "rose",
  },
  {
    eyebrow: "Your role",
    title: "Resident-led learning",
    subtitle: "",
    body: "SoC-TEQ is shaped by the residents who use it. What you log, reflect on, and share helps build a clearer picture of your learning environment and informs what can be strengthened next.\n\nYou're not only using the framework, you're helping shape it.",
    tone: "plum",
  },
  {
    eyebrow: "The six-month loop",
    title: "From observation to reassessment",
    subtitle: "",
    body: "Months 1–3 build the picture. At the end of month 3, topics averaging below 3.5 are identified for focused follow-up and baseline assessment.\n\nMonths 4–6 support resident-led learning around those topics, followed by reassessment to see what was retained.\n\nThe interval is deliberate: immediate confidence does not always reflect what remains over time.",
    tone: "amber",
  },
  {
    eyebrow: "What we assess",
    title: "Clinically relevant learning",
    subtitle: "",
    body: "Assessment focuses on morphology, distribution, pattern recognition, diagnostic considerations, and skin of color management.\n\nFollow-up assessment helps show what learning is retained over time.",
    tone: "sage",
  },
  {
    eyebrow: "Privacy and trust",
    title: "Designed without patient identifiers",
    subtitle: "",
    body: "No patient-identifying information is collected or stored. In ratings and exports, residents appear only as Resident A, B, C, never by name.\n\nAuthentication is handled through Supabase, and passwords are not visible to SoC-TEQ.",
    tone: "teal",
  },
  {
    eyebrow: "Training alignment",
    title: "Connected to residency competencies",
    subtitle: "",
    body: "SoC-TEQ activities align with areas of ACGME competency, including patient care and practice-based learning and improvement.\n\nLogging, reflection, and follow-up are designed to complement the work residents are already doing throughout training.",
    tone: "plum",
  },
];

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

export const EQUITY_NOTE = {
  eyebrow: "One piece of a larger picture",
  title: "Equity in dermatology goes further than this",
  body: "Skin of color representation is one part of a much broader equity conversation in dermatology and medicine. Language and communication barriers, care for Deaf and hard of hearing patients, access in under-resourced communities, disability inclusion, and global dermatology all deserve dedicated attention.",
};

export const WHY_AGENCY_CARD = {
  eyebrow: "You're part of the curriculum too",
  title: "You don't have to wait to be faculty",
  body: "Residents are uniquely positioned to notice patterns in education because they experience the curriculum every day.\n\nThe literature encourages residents to identify areas where representation could be strengthened, bring diverse cases into conferences, contribute to teaching materials, and work with faculty toward lasting curricular improvement.\n\nWith SoC-TEQ, that can start small:\n\nNotice. Log. Share. Improve.",
};

export const HOWTO_STEPS: { title: string; body: string }[] = [
  {
    title: "Someone claims the logger, once a day",
    body: "One resident claims the logger for the day. Having a single logger keeps each session represented consistently and avoids duplicate or conflicting entries.",
  },
  {
    title: "Capture topics in the room",
    body: "The logger enters the topic name during the session.\n\nIf it's easier, jot down the topics as you go and add them to the app afterwards.",
  },
  {
    title: "Answer the two criteria after the session",
    body: "Was a Fitzpatrick IV–VI image shown, and was skin of color explicitly discussed?\n\nBoth criteria must be met for the topic to count as covered.\n\nResidents who attended can discuss the session together, with the logger recording the agreed response.",
  },
  {
    title: "Everyone rates what was covered",
    body: "Covered topics appear for residents who attended to rate across five areas:\n\n• Depth of teaching\n• Image representation\n• Diagnostic considerations\n• Management\n• Your current confidence with the topic\n\nThe fifth item reflects how confident you feel at that point in your training and serves as a snapshot of your current baseline.\n\nRatings remain open until 4 AM the following day.",
  },
  {
    title: "Say so if you weren't there",
    body: "If you didn't attend the session, mark yourself absent.\n\nAbsences are excluded from the average. They are never treated as a score of zero and do not lower the topic's rating.",
  },
  {
    title: "Skip non-visual topics",
    body: "Topics without a meaningful visual component, such as biostatistics, health policy, or research methods, fall outside the framework and do not need to be logged.",
  },
];

export const FAQ_ITEMS: { question: string; answer: string }[] = [
  {
    question: "Why does SoC-TEQ focus on visually relevant topics?",
    answer:
      "SoC-TEQ was designed to measure a defined part of dermatology education: whether visually relevant teaching includes representation of Fitzpatrick IV–VI skin alongside explicit discussion of skin of color.\n\nNon-visual topics related to skin of color are important too, but they currently fall outside what the framework measures.",
  },
  {
    question: "Why does SoC-TEQ ask about my program?",
    answer:
      "Program information provides context for interpreting the patterns that emerge over time.\n\nFor example, access to a dedicated skin of color curriculum, clinic, or image resources may shape the kinds of learning experiences residents encounter.\n\nThe program profile adds context, it is not a score or evaluation of the program.",
  },
  {
    question: "What if teaching is already strong across skin tones?",
    answer:
      "That is useful information too.\n\nSoC-TEQ is designed to identify patterns, not to assume that a gap exists. Consistently strong ratings can show where teaching is working well and where residents are receiving meaningful exposure.",
  },
  {
    question: "How are my ratings kept private?",
    answer:
      "Ratings are associated with a resident code, such as Resident A, rather than your name. Your name may appear in the Team directory, but it is not displayed alongside your individual ratings.\n\nProgram leads can manage the program's shared profile, but they cannot view individual resident ratings.\n\nSign-in is handled through Supabase authentication, and SoC-TEQ does not store or display your password.",
  },
  {
    question: "What happens if I forget to rate something?",
    answer:
      "Ratings remain open until 4 AM the following day.\n\nIf you have not submitted a rating or marked yourself absent by then, it is recorded as forgot to rate, not as a score of zero or a low rating. If you did mark yourself absent, that's excluded too, and neither one affects your response rate.",
  },
  {
    question: "Can I change a rating after I submit it?",
    answer:
      "Yes. You can update your rating until the daily window closes at 4 AM.\n\nAfter that, the rating is locked so the dataset preserves the response recorded during that learning period.",
  },
];
