# Antoch Session Trainer

A one-on-one English conversation coaching platform: a live session runner for the
trainer, a set of CEFR-tiered drills, and a history that makes recurring problems visible
across months rather than minutes.

Static files only — no build step, no server to run. It deploys to GitHub Pages as-is.

## Roles

| Role | Sees |
|---|---|
| **Administrator** | Everything. All trainers, all trainees, all sessions, all settings. Issues invite codes. |
| **Trainer** | Their own trainees only. Creates trainee records, builds their topic bank, plans and runs sessions. |
| **Trainee** | Their own history and feedback notes. Never another trainee's data. |

## The session

Five stages in a fixed order. The trainer advances each one by hand; the timer is
information, not a rule.

1. **Warm-up** (2–3 min) — rotates through rapid personal questions, this-or-that,
   one-word story chain, and emoji-to-sentence. Nothing is scored or corrected.
2. **Free Talk / Error Harvest** (3–5 min) — the trainee talks for 60 unbroken seconds on a
   topic typed in live or pulled from their topic bank (*anchor* for everyday subjects,
   *stretch* for the unusual and hypothetical, which forces language to be built rather
   than recalled). Fillers are tapped out on a counter while they speak. Afterwards the
   trainer logs the words they struggled with and the errors heard.
3. **Pronunciation Boxing** (10 min) — the existing pronunciation game, fed the exact word
   list harvested one stage earlier. Every clean word lands a hit on the boss.
4. **Quick Round** (2–3 min) — the existing sentence-structure game by default: the trainer
   types a question and the answer sentence, the trainee drags the words into order. Any
   of the additional drills can be swapped in here instead.
5. **Feedback Note** (1–2 min) — assembled automatically from the session: today's filler
   count against the rolling average, the errors logged, one recurring error flagged when
   it genuinely repeats, plus the trainer's own *win* and *focus for next time*. Displayed
   large enough to read aloud, and copyable or downloadable to send afterwards.

## Additional drills

Selectable per session — either in place of stage 4, or as extra rounds after it.

- **Word Form Drill** — a base word into its noun, infinitive, past and adjective forms.
- **Sentence Expansion Drill** — a simple sentence expanded one element at a time:
  what, when, where, why.
- **Picture Description** — a random image biased toward the quirky and unexpected,
  described for 60–90 seconds, with level-matched follow-up prompts.

## CEFR levels

Every trainee has a level from A1 to C2. Warm-ups, topics, sentence sets, word forms,
expansion sentences, picture prompts and the pronunciation fallback list each have six
separate tiers — an A1 stretch topic ("your shoes can talk") and a C2 one ("argue that
forgetting is a moral duty") are not the same prompt at different speeds.

## Storage

Works with no configuration at all, storing everything in the browser. Point it at a free
Supabase project when you want trainees signing in from their own devices; the same access
rules are then enforced by the database rather than only by the interface. See
[SETUP.md](SETUP.md).

## Layout

```
index.html              app shell
css/app.css             styling
js/config.js            the only file you normally edit
js/store.js             storage adapter — localStorage or Supabase
js/content.js           all CEFR-tiered content
js/session.js           the live session runner
js/app.js               auth, routing, every other screen
js/ui.js                DOM helpers
games/pronunciation.html  pronunciation game, accepts a dynamic word list
games/sentence.html       sentence-structure game, accepts a dynamic sentence list
supabase-schema.sql     database schema and row level security
```

Both games remain playable on their own, exactly as before. Embedded in a session they
additionally report the round back to the parent page so the feedback note can quote it.

## Not in this build

Deliberately left for a later phase: the trainee-facing dashboard with achievements and a
strengths profile, the monthly rollup report, and automatic pronunciation or fluency
scoring — that last one needs a speech-scoring API decision first.
