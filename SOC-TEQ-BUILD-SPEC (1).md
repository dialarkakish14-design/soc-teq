# SoC-TEQ App — Build Specification

**For:** Claude Code
**Purpose:** Rebuild the working prototype (`soc-teq-prototype-v15.html`) as a real application on Supabase.
**Status:** All product decisions below are settled. Do not redesign them. If something in the prototype conflicts with this document, this document wins.

This document and the prototype are the only two inputs you need. Everything required from the published framework has already been transcribed here — do not go looking for the paper or its supplementary material, and do not reason from them if you encounter them. Where the app deliberately departs from the publication, this document reflects the decision that was made.

---

## 0. What this project is

SoC-TEQ is a published medical education framework (Medical Teacher, DOI 10.1080/0142159X.2026.2637609) for measuring how well dermatology residency programs teach skin of color. This app is its operational translation, being piloted with dermatology residents at Wayne State University.

Residents log the topics taught in their daily teaching sessions, record whether each covered skin of color, and rate the quality of that coverage. Scores below a threshold become priority educational needs that drive a six-month remediation cycle.

**The data this app collects becomes a peer-reviewed publication.** Data integrity matters more than features. When in doubt, choose the option that produces cleaner, more defensible data.

---

## 1. Source of truth

`soc-teq-prototype-v15.html` is a complete, working, single-file prototype. It is the specification for behaviour, layout, wording, and interaction.

**Read it before writing code.** It already encodes the scoring maths, the coverage rule, the cohort isolation, the closing logic, the anonymisation, and the copy.

**Do not port the JavaScript.** Rebuild properly. Match the behaviour and the visual design, not the implementation.

---

## 2. Stack

- **Frontend:** React + Vite, TypeScript, Tailwind
- **Backend:** Supabase (Postgres, Auth, Row Level Security)
- **Hosting:** Vercel
- **Target:** mobile-first web app, installable to home screen (PWA). Residents use it on phones, standing up, between sessions.

---

## 3. Domain rules

These come from the published framework. They are not negotiable.

### 3.1 Definitions

- **Skin of color** = Fitzpatrick skin types IV–VI.
- **Teaching topic** = one distinct diagnostic or management subject addressed in a formal teaching session. Individual slides are not counted. The topic is the unit of analysis.
- **Visually relevant** = a topic where visual diagnosis applies. Non-visual subjects (research methods, biostatistics, health policy) are outside the framework and must not be registered at all.
- **SoC-covered** = BOTH of:
  1. at least one image representing Fitzpatrick IV–VI was shown, AND
  2. explicit skin-of-color-specific discussion took place (visual differences, diagnostic pitfalls, pigmentary sequelae, erythema masking, dermoscopy, or management considerations).

  One criterion without the other is **not covered**. This is computed, never entered directly.

- **Teaching exposure** = percentage of visually relevant topics that are fully SoC-covered.

### 3.2 The five rating items (Representational Depth)

5-point Likert, 1 = strongly disagree, 5 = strongly agree.

| Key | Name | Statement |
|---|---|---|
| `depth` | Depth | The SoC content was taught with the same emphasis as non-SoC content. |
| `clarity` | Visual clarity | High-quality, diagnostic images of skin of color were used. |
| `nuance` | Nuance | Diagnostic pitfalls specific to skin of color were explicitly addressed — for example erythema masking. |
| `mgmt` | Management | Management considerations specific to skin of color were clearly discussed. |
| `conf` | Confidence | I feel more capable of managing this condition in skin of color after this session. |

### 3.3 Scoring

For a given topic:

1. For each of the five items, take the mean across **all residents who actually submitted a rating**.
2. The topic score is the mean of those five item means.

**Divide by the number who rated, never by cohort size.** If 9 of 12 residents rate, divide by 9. Non-responders and absentees are excluded from the denominator entirely — they are never counted as zero.

A topic scoring **below 3.5** is flagged as a priority educational need.

There is **no minimum rater count**. Instead, display coverage: show "9 of 12 residents rated", and label a score **provisional** when fewer than half the cohort rated it.

### 3.4 The six-month cycle

| Phase | When | What happens |
|---|---|---|
| 1 | Months 1–3 | Baseline logging. Residents log teaching topics and rate coverage quality. |
| 2 | End of month 3 | Topics averaging below 3.5 are flagged as priority educational needs. Baseline knowledge assessment taken. Residents claim topics to remediate. |
| 3 | Months 4–6 | Resident-led remediation — peer-teaching modules, journal clubs, case repositories. Shared reading unlocks. |
| 4 | End of month 6 | Follow-up assessment, same format as baseline. Compare against baseline. |

No re-rating of past sessions at any point. The six-month outcome is the assessment, not a second rating of a lecture nobody can see any more.

---

## 4. Data model

Suggested tables. Adjust naming as needed but preserve the relationships and constraints.

### `programs`
| Column | Notes |
|---|---|
| `id` | pk |
| `name` | e.g. "Wayne State University — Dermatology" |
| `access_code` | required to join |
| `profile_complete` | boolean, default false — **access code does not work until true** |
| `setting`, `patient_mix`, `existing_curriculum`, `image_resources` | Program Contextual Profile (framework Part 8) |
| `profile_updated_at` | date-stamp the profile; baseline characterisation must be attributable to a point in time |

### `residents`
| Column | Notes |
|---|---|
| `id` | pk, maps to Supabase auth user |
| `program_id` | fk |
| `pgy` | 'PGY-2' \| 'PGY-3' \| 'PGY-4' |
| `full_name`, `email`, `username` | |
| `resident_code` | e.g. "Resident A" — assigned per cohort, **not alphabetical** |
| `precourse_confirmed` | boolean |
| `role` | 'resident' \| 'program_lead' |

Passwords are handled by Supabase Auth. **Never store a password in this table in any form.**

### `days`
| Column | Notes |
|---|---|
| `id`, `program_id`, `pgy`, `date` | unique on (program_id, pgy, date) |
| `logger_id` | fk residents, nullable until claimed |

A "day" belongs to one PGY cohort. PGY-2 and PGY-3 have separate day records for the same calendar date.

### `sessions`
| Column | Notes |
|---|---|
| `id`, `day_id`, `type` | Lecture, Didactic, Grand round, Clinic outpatient, Clinic inpatient, Journal club, Tumor board |

### `topics`
| Column | Notes |
|---|---|
| `id`, `session_id`, `title` | |
| `incomplete` | true when quick-captured, before coverage questions answered |
| `image_soc`, `discussed_soc` | booleans |
| `soc_covered` | **computed** = image_soc AND discussed_soc |
| `skin_type` | 'Fitzpatrick IV' \| 'V' \| 'VI' \| 'Mixed across IV–VI' \| 'Not specified' — only when covered |

### `ratings`
| Column | Notes |
|---|---|
| `id`, `topic_id`, `resident_id` | unique on (topic_id, resident_id) |
| `depth`, `clarity`, `nuance`, `mgmt`, `conf` | 1–5 |
| `note` | optional free text |

### `absences`
| Column | Notes |
|---|---|
| `topic_id`, `resident_id`, `reason` | 'declared' \| 'no_response' |

`no_response` rows are created automatically when a day closes. Keep the two reasons distinct — declared absence is the system working; no response is a feasibility problem worth reporting.

### `claims` (remediation cycle)
| Column | Notes |
|---|---|
| `id`, `cycle_id`, `resident_id`, `topic_title` | |
| `format` | Peer-teaching module \| SoC journal club \| Digital repository case set |
| `status` | 'planned' \| 'delivered' |
| `scholarly` | boolean |

### `resources` (shared reading)
| Column | Notes |
|---|---|
| `id`, `program_id`, `pgy` | cohort-scoped like everything else |
| `topic_title` | the condition this attaches to |
| `resident_id` | displayed as resident code, never name |
| `source`, `url`, `takeaway` | where it's from, the link, the one thing worth knowing |
| `created_at` | |

Resources attach to a **condition**, not to a session or a feed, so they surface on
every topic detail page for that condition and beside a claimed remediation topic.

**Text and links only.** No file or image uploads: reproducing figures from papers is
a copyright problem, and clinical images raise consent issues the project has
deliberately avoided.

**Locked until the remediation phase (phase 3+).** During baseline logging the card
shows a "opens in months 4–6" note instead of the add form. This keeps resource
sharing out of the control period so it doesn't act as an uncontrolled intervention.

### `assessments`
| Column | Notes |
|---|---|
| `cycle_id`, `resident_id`, `phase` | 'baseline' \| 'followup' |
| `score` | 0–100 |

### `cycles`
| Column | Notes |
|---|---|
| `id`, `program_id`, `pgy`, `start_date` | |

---

## 5. Access rules (Row Level Security)

**These must be enforced in Postgres, not in the frontend.** The educational-safety promise to residents depends on it holding even against someone using the API directly.

1. A resident can read and write only rows belonging to **their own program AND their own PGY cohort**. PGY-2 residents cannot see PGY-3 residents, their days, topics, ratings, or directory.
2. Only the day's `logger_id` may create, edit, or delete topics for that day.
3. A resident may write only their own rating row.
4. No resident may read another resident's `full_name` alongside a rating. Names appear in the cohort directory only.
5. Signup requires a valid `access_code` for a program where `profile_complete = true`.
6. `program_lead` may edit the program profile. **Do not give program leads access to individual resident ratings** — it undermines the safety promise the framework makes.

---

## 6. Timing rules

- Ratings for a day are open until **04:00 the following morning**, then permanently locked. Locked topics cannot be rated, re-rated, edited, or deleted.
- At close, every cohort member with no rating and no declared absence gets an `absences` row with reason `no_response`.
- A logger can only be claimed, and topics only registered or edited, while the day is open.
- Implement close as a scheduled job, not a frontend check.

---

## 7. Screens

Match the prototype. In brief:

1. **Landing** — framework definition, exposure metric, links to "What is SoC-TEQ?", "How to use it", and the publication DOI.
2. **Mission map** — 7 framework cards.
3. **How to use** — Part 1 / Part 2 explanation, then 6 numbered steps.
4. **Sign up** — name, username, password (with show/hide toggle, no confirm field), email, PGY, program, access code, pre-course confirmation checkbox. Password reset by email must work.
5. **Log in** — username + password, forgot-password link. **Never display existing usernames.**
6. **Today** — date strip, "Waiting on you" card (tappable rows), logger claim/claimed state, pre-loaded timetable, quick capture, the day's sessions and topics.
7. **Register/edit topic** — session, topic name, visual relevance gate, two coverage questions with tap-for-definition, computed coverage, skin type. Logger only.
8. **Rate** — five sliders starting **unset** (no thumb, grey track, nothing pre-selected), each with the published statement and tap-for-definition, optional note, running score, "I wasn't at this session".
9. **Summary** — Days / Week / Month / Cycle tabs. Stats, item averages, response record, priority topics, monthly brief.
10. **Topic detail** — team score, item averages, skin types shown across all sessions on that condition, individual ratings by code, who's counted, shared reading for that condition.
11. **Cases** — conditions with Fitzpatrick IV/V/VI coverage chips, showing which tones haven't been taught, plus a count of shared reading per condition.
12. **Track my info** — personal stats, your mean vs cohort, topics you rated, exports, log out.
13. **Team** — program profile (read-only), cohort directory with real names.

### Quick capture

The logger types **only the topic name** during a session — one field, five seconds — creating an `incomplete` topic. Coverage questions are answered afterwards. Field keeps focus and Enter submits so several topics can be captured in a row.

---

## 8. Exports

Two CSV exports, both scoped to the requesting resident's cohort:

1. **Topic-level** — one row per topic: date, session, topic, coverage flags, skin type, five item means, RM mean, n rated, n absent declared, n no response, cohort size, flagged. **No rater identity of any kind.** This is the analysis file.
2. **Rating-level** — one row per resident per covered topic: `resident_code` and status (`rated` / `absent_declared` / `no_response` / `pending`), the five item scores, note. Needed for inter-rater reliability.

**Names, emails, and usernames must never appear in any export.**

Also: a weekly automated snapshot of all tables to storage. The Supabase free tier has no point-in-time recovery.

---

## 9. Out of scope for v1

Note these as future work; do not build them now:

- Push notifications (the in-app "Waiting on you" card is the v1 substitute)
- The knowledge assessment itself — v1 only records a score, not the questions
- AI-generated monthly briefs — the current brief is generated from data by plain logic and is a deliberate placeholder
- Multi-program support beyond the data model already allowing it
- The walkthrough video

---

## 10. Build order

Get this working end to end before anything else:

**Signup → log in → claim logger → capture a topic → complete coverage questions → another resident rates it → the score appears → refresh the page and it's all still there.**

That loop is the product. Everything else is layered on top.

Then, in order: cohort isolation and RLS (test by logging in as two residents in different PGYs), the 4am close job, Summary, Track my info and exports, Cases, the remediation cycle.

## 11. Testing

Test with fictional resident accounts only. **No real resident data until RLS is verified and IRB approval is in hand.**

Test the repetitive cases specifically — capture five topics in a row, rate several in a row, log out and back in twice. Bugs in this kind of app tend to appear on the second attempt, not the first.
