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

1. **Warm-up** (2–3 min) — rotates through rapid personal questions, this-or-that, and
   one-word story chain. Nothing is scored or corrected.
2. **Free Talk / Error Harvest** (3–5 min) — the trainee talks for 60 unbroken seconds on a
   topic typed in live or pulled from their topic bank (*anchor* for everyday subjects,
   *stretch* for the unusual and hypothetical, which forces language to be built rather
   than recalled). Fillers are tapped out on a counter while they speak. Afterwards the
   trainer logs the words they struggled with and the errors heard.
3. **Pronunciation Boxing** (10 min) — the pronunciation game, fed the exact word list
   harvested one stage earlier. **The trainer marks each attempt by ear** — good lands a
   hit, poor does not. See *Why marking is manual* below.
4. **Quick Round** (2–3 min) — Word Form Drill by default; Sentence Expansion or Picture
   Description can be swapped in instead, or added mid-session with the **+ Drill** button.
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

Every trainee has a level from A1 to C2. Warm-ups, topics, word forms,
expansion sentences, picture prompts and the pronunciation fallback list each have six
separate tiers — an A1 stretch topic ("your shoes can talk") and a C2 one ("argue that
forgetting is a moral duty") are not the same prompt at different speeds.

## Storage

Two backends behind one API. With no configuration it stores everything in the browser;
with a Supabase URL and anon key in `js/config.js` it moves to hosted Postgres with real
logins, and the access rules above are then enforced by the database rather than only by
the interface.

This copy is configured for cloud mode. Signed-out visitors can read nothing from any
table, new accounts are always created as a plain trainee, and roles are granted
server-side by a `security definer` function — so signup metadata cannot be edited to
award administrator rights. See [SETUP.md](SETUP.md).

## Deploying

Static files, so GitHub Pages serves it as-is:

```bash
git remote add origin https://github.com/<account>/<repo>.git && git push -u origin main
```

Then **Settings → Pages → Deploy from a branch → main → / (root)**, and set the published
address as **Site URL** in Supabase under *Authentication → URL Configuration*.

The repository must be **public** for Pages on a free GitHub account. That is safe here:
the anon key is designed to be published, and the data is protected by the database rules,
not by hiding the key. Never commit the `service_role` key.

The microphone in the pronunciation game needs a secure origin — `localhost` and GitHub
Pages qualify, a plain `http://` LAN address does not.

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
games/pronunciation.html  pronunciation game, dynamic word list + manual marking
supabase-schema.sql     database schema and row level security
```

The pronunciation game remains playable on its own. Embedded in a session it reports the
round back to the parent page so the feedback note can quote it.

## Why marking is manual

The browser's speech recogniser is a transcriber, not a judge. It has a language model
that snaps whatever it hears onto the nearest real word, so a badly pronounced *water*
still comes back as `"water"` and would score full marks. Spelling the letters aloud
often passes too. The information a learner needs — how far each phoneme sat from target —
never leaves the recogniser.

Real phoneme scoring needs a dedicated API, and as of August 2026 none is free:

- **Azure Pronunciation Assessment** — an enhanced add-on, not part of the F0 free tier;
  around $1.32/hour, and signup wants a card for identity verification.
- **SpeechAce**, **SpeechSuper** — genuine phoneme-level scoring, commercial, trial keys only.

There is a second obstacle. These keys are bearer credentials, unlike the Supabase anon key
which is designed to be public and is backed by row level security. On static hosting a key
in `config.js` is a key anyone can spend, so any paid option also needs a token-minting
backend in front of it.

So the trainer marks by ear: **Good** lands the hit, **Needs work** does not, and the real
verdict is what gets recorded and carried into the feedback note. The recogniser still runs
underneath and still shows what it heard, as a hint — it just no longer decides.

## Not in this build

Deliberately left for a later phase: the trainee-facing dashboard with achievements and a
strengths profile, and the monthly rollup report.
