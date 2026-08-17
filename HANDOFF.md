# Antoch Session Trainer — handoff

Paste this whole file into a new session to pick up exactly where the last one stopped.

---

## Where everything is

| | |
|---|---|
| **Working folder** | `D:\cluade code\antoch-session-trainer` |
| **Live site** | https://entk-english.github.io/entk-app/ |
| **Repo** | https://github.com/entk-english/entk-app (public — Pages needs public on the free plan) |
| **Branch** | `main` |
| **Current build** | `b36` (shown at the bottom of the sign-in card) |
| **Diagnostic page** | https://entk-english.github.io/entk-app/mic-check.html |

### Files

```
index.html                 app shell, theme applied before first paint
css/app.css                all styling; light is :root, dark is [data-theme="dark"]
js/config.js               keys and BUILD number — the only file normally edited
js/store.js                storage adapter: localStorage or Supabase, plus recordings
js/content.js              all CEFR-tiered content, six levels
js/session.js              the live session runner (trainer side)
js/app.js                  auth, routing, trainee live view, admin
js/live.js                 the device-to-device channel (realtime + BroadcastChannel)
js/ui.js                   DOM helpers — note $ is one element, $$ is a list
games/pronunciation.html   the game; #r=<base64> word list, #mark=1 marking, #monitor=1 mirror
games/sprites/*.png        8 generated character sprites, transparent
supabase-schema.sql        schema and row level security
supabase-recordings.sql    optional: a private bucket so recordings outlive the lesson
mic-check.html             microphone / speech diagnostic
mirror-test.html           player and mirror side by side, no second device needed
load-check.html            counts storage calls and payload sizes for a simulated lesson
```

### Load, and where it used to go (b36)

Three people in a lesson was enough to feel it. Three causes, all fixed:

1. **The trainer rewrote the whole record constantly.** Every mark and every keystroke wrote
   the entire `data` blob, which grows all lesson. Now the fast-changing part — which stage,
   what the trainee should see — lives in its own `live` column of a few hundred bytes, and
   the full record is coalesced to at most one write every 1.5s, flushed on stage change, on
   leaving, on finishing, and when the tab is hidden.
2. **Every trainee polled for everything.** `listSessions()` fetched all their sessions with
   the full blob and filtered in the browser. `Store.liveSession()` now asks for one row and
   four columns, filtered in the database, with a partial index behind it.
3. **The poll ran regardless.** The wire already carries every change instantly, so the poll
   is now the safety net: one query a minute while the channel is alive, back to every three
   seconds when it goes quiet, and nothing at all while the tab is hidden.

**Nothing has to be run in the dashboard for any of this.** The live payload lives inside
`plan`, which already exists and is small, rather than in a column of its own — a column
would be tidier, but an app that only performs after someone remembers to run a migration is
an app that does not perform. Likewise the recordings: if the `recordings` bucket exists the
audio is uploaded and the path travels, and if it does not, `Store.noBucket` trips once and
the audio goes down the wire in base64 chunks instead. The only thing the bucket buys is
recordings that outlive the lesson, which is why `supabase-recordings.sql` is still in the
repo and still optional.

### The live channel

The session row is written by the trainer only — row level security stops a trainee updating
it, and both sides writing one jsonb blob would clobber each other. So anything travelling
*upwards* goes over `js/live.js`: a Supabase realtime broadcast channel named after the
session id, with a BroadcastChannel alongside it so both roles work in one browser. Nothing
is stored on it. Message types in use:

| from | type | carries |
|---|---|---|
| trainer | `mark` | a verdict, with a sequence number |
| trainer | `restart` | restart the round on both screens |
| trainer | `wfcheck` / `wfnext` | word-form marking, and clearing for the next word |
| trainee | `gamestate` | the fight snapshot the trainer's mirror draws |
| trainee | `wfanswers` | what they have typed in the four boxes |
| trainee | `recording` | the path of an uploaded attempt (or the blob, in local mode) |

---

## Accounts and keys

- **Supabase project ref**: `duemwskakpalvgmdfsfu` — URL and anon key already in `js/config.js`
- **Unsplash access key**: already in `js/config.js` (picture drill)
- **Hugging Face token** (sprite generation only, never used at runtime): kept out of this
  repo on purpose — it is a bearer credential and this repository is public. Create a fresh
  read token at https://huggingface.co/settings/tokens and paste it into the session that
  needs it. Free monthly credits ran out after 8 of 11 sprites and reset monthly.
- **Admin login**: the account created with the `ANTOCHADMIN` code. Invite codes are issued
  from *People & access*; trainees join with the six-character code on their trainee card.

**Run lessons in Microsoft Edge.** Chrome's speech recogniser is broken on this machine —
it starts, hangs, and returns nothing with no error, while Edge returns a clean transcript.

---

## Deploying

```bash
cd "D:/cluade code/antoch-session-trainer" && git add -A && git commit -m "message" && git push origin main
```

Pages rebuilds in about a minute. Bump `BUILD` in `js/config.js` each time so a stale cache
is visible rather than mysterious. Hard-reload with Ctrl+Shift+R after deploying.

---

## What works today

- Three roles enforced by the database, not just the interface: admin, trainer, trainee
- Join codes and invite codes, single use, verified server side
- Session flow: warm-up, free talk, pronunciation, quick round, feedback — trainer advances
  each stage by hand, everything saves as you type, Resume returns to the same stage
- **Trainee mirror**: their screen shows the real activity for every stage, not a status card
- **Pronunciation game**: one monster per harvested word, ten monsters escalating in health
  and size, four arenas, three clean hits to kill, defeat → march → arrival sequence, four
  attack tiers, synthesised sound, generated sprites
- **Trainer marks Correct / Wrong**; the trainee plays. Marks travel through the session record
- American pronunciation fetched per word from a free keyless dictionary
- Warm-up banks of 30 / 23 / 16 per level, plus prompts the trainer writes themselves
- Free talk length selectable, 30 seconds to 10 minutes
- Feedback note in the trainer's own report format, filled during the session or written at the end
- Light and dark themes, light by default

---

## Done in b27–b29

**3a — the trainer's mirror follows the trainee.** The monitor iframe runs under `#monitor=1`
with its engine read-only: the trainee's copy publishes a snapshot every 500ms and the mirror
draws it. A dead monster is dead on both screens. The mirror never asks for a microphone.

**3b — the trainer can hear the attempt.** Each recording is uploaded from the trainee's
device to the private `recordings` bucket under `<trainee_id>/<session_id>/`, and only the
path travels over the channel. The trainer gets a "Their recordings" list with a Play button
per take; paths are kept in the session record, so they replay later too.
**Run `supabase-recordings.sql` once** — without it the upload fails and the trainer sees
"could not upload" instead of a take.

**4 — the Word Form Drill is the right way round.** The trainee types the four forms on their
own device; the answers land on the trainer's desk as they type. Check turns the wrong ones
red over there, Reveal writes the answers into their boxes.

**6 — the look.** Ruled backdrop, lit top rail and hatched corner on every card, a mark under
each heading, a patterned prompt box, the stage bar redrawn as a route with a pulse on the
current stage, and lift on buttons, chips and rows. All of it off under
`prefers-reduced-motion`.

## The drills (b32, standing from b34)

Three more, all two-way — the trainee works on their own device and the trainer marks from
theirs. From b34 they are **standing stages**: every session's bar carries Warm-up, Free
Talk, Pronunciation Boxing, the quick round, Connector Chaining, PREP Answer, The Forbidden
Word, Picture Description and the Feedback Note. Nine stages is deliberate — a trainer passes
one with *Next stage*, or takes it off today's bar with **− Remove**, which sticks when the
session is reopened.

- **Connector Chaining** — a situation on their screen and a set of connectors they must join
  their ideas with. Their sentence arrives on the trainer's desk as they type, and any
  connector they actually used lights up by itself. The answer to stump sentences.
- **PREP Answer** — a question, and four boxes: point, reason, example, point again. The
  trainer can send any one step back with *Again*, which turns that box red on their screen.
- **The Forbidden Word** — the word appears on the trainee's screen with two near-miss words
  also banned; they describe it until the trainer guesses. The trainer's side keeps the clock
  and the tally of guesses and slips.

**The trap these exposed.** The trainee's page rebuilds whenever the published payload
changes, and every payload carries a timestamp — so publishing on each redraw rebuilt their
page 1.5 seconds after every keystroke and wiped what they were typing. Publishing now
happens only when the *content* changes, and the rebuild key ignores the timestamp. Any new
two-way stage must keep both halves of that.

## The recogniser does not play the game (b30)

A spoken attempt records and nothing else. No percentage, no stars, no damage, no failure
sound, and the trainee never sees the transcript. The recording exists so they can hear
themselves back; the guess is passed up to the trainer's screen as a hint under "Recogniser
guessed". Only ✓ Correct / ✗ Wrong — now sitting in a bar directly under the game monitor,
where the trainer is already looking — moves anything. Fixing the recogniser is a separate
job and the game no longer waits on it.

## What is left

**3c — recognition scores 0%.** No longer blocks a lesson, since nothing depends on it. Playback proves the audio recorded, so capture works and the
recogniser returns nothing. `mic-check.html` now has section **5b**, which runs recognition
with a MediaRecorder beside it — exactly what the game does. If section 4 hears you and 5b
does not, the second capture is starving the recogniser, which is the classic Windows
symptom and matches "it recorded perfectly and scored 0%". The game already reacts: two
silent runs with recording on switches recording off by itself. Run both sections in Edge
and in Chrome and compare the event traces.

**Not yet proven on two real devices.** The mirror, the word-form split and the recordings
were all built and tested on one machine (`mirror-test.html` for the game, and a probe that
confirmed Supabase realtime broadcast connects and round-trips with the anon key). The
cross-device run — trainer on one device, trainee on another, in Edge — has not happened yet.

**Smaller, still open**
- Bosses 8, 9 and 10 reuse earlier sprites until Hugging Face credits reset
- Monsters do not degrade visually as their health drops; only the bar shows damage
- Email confirmation is still off in Supabase; the app already handles it being on
- Trainer-written warm-up prompts live in `localStorage`, so they do not sync between devices

---

## Traps worth knowing

**`$` versus `$$`.** `js/ui.js` exports `$` for one element and `$$` for a list. Writing
`$(...).forEach` throws and kills every handler bound after it — which silently disables a
whole screen while the render still looks perfect. This has happened three times. After any
edit to a screen, check the console, not the screenshot.

**Animation frames are suspended in the agent browser.** `requestAnimationFrame` never fires,
so canvas work cannot be verified by waiting — call `render()` by hand and step the state.
Anything driven purely by rAF also needs a wall-clock fallback, or a hidden tab freezes it.

**Verifying canvas visually.** Screenshots fail in the agent browser. The way round it:
`render()`, then post `canvas.toDataURL()` to a small local Node receiver that writes a PNG,
then read that file. Without this, visual work is guesswork.

**Two channels, two jobs.** `publish({...})` writes what the trainee should *see* into the
session record and is polled every 1.5 seconds; `link.send(...)` is the instant, unstored
wire. Marks go down both — the wire for speed, the record so a trainee who reloads is not
left behind. Anything the trainee sends can only use the wire.

**Publishing to the trainee.** Every stage calls `publish({...})` in `js/session.js` with what
the trainee should see. The trainee's page in `js/app.js` polls every 1.5 seconds and renders
from that payload. A new stage needs both halves or the trainee sees nothing.

**Pronunciation scoring is manual by decision.** No free phoneme-scoring API exists: Azure's
is a paid add-on outside the free tier, SpeechAce and SpeechSuper are commercial, and all of
them issue bearer credentials that cannot sit in a public static page. The trainer's ear
decides. Revisit only with a budget.
