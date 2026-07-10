# Runway — A Job-Seeking Assistance System Integrating Interview Training With Job Recommendation

Runway is a full-stack web application that helps a job seeker in two connected ways:

1. **Job Recommendation** — extracts skills from a pasted resume/profile and ranks a sample set of job openings against those skills using a transparent, rule-based weighted-overlap score.
2. **Interview Training** — offers a bank of behavioral, general, and technical interview questions, collects a typed answer, and returns structured, rule-based feedback (structure, keyword relevance, filler words, quantification) modeled on the STAR method.

The two features share one profile: skills you build in the "Profile & Skills" tab immediately feed the job matcher, so the system functions as a single connected pipeline (resume → skills → matched jobs) alongside a separate but complementary interview coach.

The whole system runs locally with no external API calls and no database server — it is intentionally self-contained so it is easy to set up, demo, and read end-to-end for a course project or portfolio piece.

## Architecture

```
job-assist/
├── server.js              Express app: wires routes, serves the frontend
├── data/
│   ├── skills.json         Master skill taxonomy (canonical key -> synonyms)
│   ├── jobs.json            Sample job listings (required + nice-to-have skills)
│   └── questions.json       Interview question bank (category, ideal keywords, tip)
├── lib/
│   ├── skillExtractor.js   Resume text -> canonical skill keys (keyword matching)
│   ├── jobMatcher.js        Weighted overlap scoring between skills and job requirements
│   └── answerFeedback.js    Rule-based scoring of a typed interview answer
└── public/
    ├── index.html            Single-page frontend (three tabs)
    ├── style.css              Visual design ("control deck" theme)
    └── app.js                  Frontend logic, calls the API with fetch()
```

**Why rule-based instead of calling an LLM?** This keeps the project runnable completely offline, deterministic (useful for grading/demoing), and fast. The `lib/` modules are small and isolated on purpose — if you want to swap in a real AI model for feedback or matching (e.g. the Anthropic API), you only need to change the inside of `evaluateAnswer()` in `lib/answerFeedback.js` or `recommendJobs()` in `lib/jobMatcher.js`; the routes and frontend do not need to change.

## How the scoring works

**Job matching** (`lib/jobMatcher.js`): each job lists `required_skills` and `nice_to_have_skills`. A matched required skill is worth 2 points, a matched nice-to-have is worth 1 point. The match percentage is `earned points / max possible points`. This is simple enough to explain in a viva/defense, and every score comes with the exact matched/missing skill lists so it's auditable.

**Interview feedback** (`lib/answerFeedback.js`): each answer is scored out of 100 across four checks —
- **Length** (0–20): too short answers lack detail; too long ones ramble.
- **Structure** (0–25): looks for an explicit action ("I built...", "I led...") and a result signal ("increased", "resulted in", a %), rewarding STAR-shaped answers.
- **Keyword relevance** (0–25): overlap with the question's ideal-answer keyword list in `questions.json`.
- **Quantification** (0–15): bonus for including a concrete number.
- **Filler/hedging penalty** (0 to −15): flags filler words ("um", "basically", "just") and hedges ("I think", "maybe").

## Setup

Requires Node.js 18+.

```bash
cd job-assist
npm install
npm start
```

Then open **http://localhost:3000** in a browser. There is no build step and no environment variables required.

## Using it

1. **Profile & Skills** — paste a resume or a short summary of your experience, click "Extract skills". Detected skills appear as chips; remove any that don't apply or type in ones Runway missed.
2. **Job Matches** — click "Find matches" to rank the sample job board against your current skill chips. Each result shows a match-percentage gauge plus which required skills you have and which you're missing.
3. **Interview Practice** — filter by category, pick a question, type the answer you'd actually say, and click "Get feedback" for a scored, itemized critique.

## Extending the project

- Add more jobs/questions by editing `data/jobs.json` / `data/questions.json` — no code changes needed.
- Add more recognized skills/synonyms in `data/skills.json`.
- Persist user profiles across sessions by adding a small database (e.g. SQLite) behind `server.js`.
- Swap the rule-based feedback for a real LLM call by editing `lib/answerFeedback.js` (see the Anthropic API docs if you want Runway to actually critique answers with Claude).
