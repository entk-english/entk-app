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
| **Current build** | `b26` (shown at the bottom of the sign-in card) |
| **Diagnostic page** | https://entk-english.github.io/entk-app/mic-check.html |

### Files

```
index.html                 app shell, theme applied before first paint
css/app.css                all styling; light is :root, dark is [data-theme="dark"]
js/config.js               keys and BUILD number — the only file normally edited
js/store.js                storage adapter: localStorage or Supabase
js/content.js              all CEFR-tiered content, six levels
js/session.js              the live session runner (trainer side)
js/app.js                  auth, routing, trainee live view, admin
js/ui.js                   DOM helpers — note $ is one element, $$ is a list
games/pronunciation.html   the game; accepts #r=<base64> word list, #mark=1 for trainer
games/sprites/*.png        8 generated character sprites, transparent
supabase-schema.sql        schema and row level security
mic-check.html             microphone / speech diagnostic
```

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

## What is left — the outstanding notes

**3a — trainer's monitor does not follow the trainee.** The iframe on the trainer's side is an
independent copy of the game, so when the trainee kills a monster the trainer still sees it
alive. It needs to mirror state from the session record rather than run its own.

**3b — trainer cannot hear the trainee's recording.** The audio only exists on the trainee's
device. Needs uploading to Supabase storage and fetching back on the trainer's side. The
biggest of the remaining jobs.

**3c — recognition scores 0%.** Playback proves the audio recorded, so capture works and the
recogniser returns nothing. Diagnose with `mic-check.html`; its event trace is the decisive
part, since `soundstart` and `speechstart` firing prove the browser actually heard speech.

**4 — Word Form Drill split.** The trainee should get the four fillable boxes — noun,
infinitive, past, adjective — and type answers on their own device. The trainer presses Check
and wrong ones turn red on the trainee's screen; Reveal shows the correct answers there.
Currently backwards: the trainer has the inputs and the trainee sees a static grid.

**6 — the look.** Described as dull and boring. Needs shape, pattern and life — not a colour
tweak.

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

**Publishing to the trainee.** Every stage calls `publish({...})` in `js/session.js` with what
the trainee should see. The trainee's page in `js/app.js` polls every 1.5 seconds and renders
from that payload. A new stage needs both halves or the trainee sees nothing.

**Pronunciation scoring is manual by decision.** No free phoneme-scoring API exists: Azure's
is a paid add-on outside the free tier, SpeechAce and SpeechSuper are commercial, and all of
them issue bearer credentials that cannot sit in a public static page. The trainer's ear
decides. Revisit only with a budget.
