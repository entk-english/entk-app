# Setting up Antoch Session Trainer

**This copy is already configured.** `js/config.js` holds a live Supabase project and an
Unsplash key, the database schema has been applied, and an administrator account exists.
If you are just running the app, skip to [Running it](#running-it).

The rest of this file is the full procedure — useful if you ever move to a new Supabase
project, hand the app to someone else, or need to understand what is wired to what.

---

## The two modes

**Local mode** — `SUPABASE_URL` empty in `js/config.js`. Everything is stored in one
browser. Costs nothing, works offline, but trainees cannot log in from their own devices
and clearing site data deletes everything. Useful for trying things out.

**Cloud mode** — Supabase URL and anon key filled in. Real logins, real access rules, data
reachable from any device. This is what the app is running now.

The sign-in screen tells you which one you are in. It shows either *"Connected to
Supabase."* or *"Running in local mode."*

---

## Creating a Supabase project from scratch

1. <https://supabase.com> → **Start your project** → sign in with GitHub.
2. **New project**. Give it a name, generate a database password and save it somewhere,
   pick the nearest region. Wait for provisioning.
3. **SQL Editor → New query**. Paste the whole of `supabase-schema.sql` and press **Run**.
   Expect *Success. No rows returned*.
4. **SQL Editor → New query** again. Paste `supabase-recordings.sql` and **Run**. This
   creates the private bucket the trainee's pronunciation attempts are uploaded to, so the
   trainer can play them back from their own device. Skip it and the app still runs — the
   trainer simply sees "could not upload" where a recording should be.
5. **Project Settings → API**. Copy the **Project URL** and the **anon / public** key.
   Newer dashboards label these under **API Keys** with the anon key called
   **publishable** (`sb_publishable_...`). Either form works.
6. Paste both into `js/config.js`.

**Never put the `service_role` / secret key in this file.** It bypasses every access rule
in the schema, and this file ends up in a public repository.

### Email limits, and how to lift them

Supabase's built-in mail service is for development: roughly **3–4 messages an hour for the
whole project**, shared. Signing up a few trainees in one sitting hits it and the app reports
*email rate limit exceeded* — nothing is wrong with the account, the mail simply was not sent.

Two ways out.

**Now, free:** turn confirmation off (below). No mail is sent at signup, so no limit applies.

**Properly, if you want confirmation on:** give Supabase your own mail provider.
*Project Settings → Authentication → SMTP Settings → Enable custom SMTP.* Any of these has a
free tier far above the built-in limit — Resend (3,000 a month), Brevo (300 a day), Mailgun,
Postmark, or a Gmail account with an app password. Paste the host, port, username and
password from the provider, set the sender address to one on a domain you control, and save.
Then *Authentication → Rate Limits* lets you raise the per-hour email cap, which stays low
until custom SMTP is configured.

### Turn off email confirmation

**Authentication → Sign In / Providers → Email → Confirm email → off → Save.**

Do this before onboarding anyone. With confirmation on, signup returns no session, the
join code cannot be applied, and the new user is stranded as an unlinked trainee. They can
recover via *Settings → Redeem a code*, but it is a confusing first experience for someone
you just handed a six-character code to.

---

## The first administrator

A chicken-and-egg problem: only an administrator can issue invite codes, and there is no
administrator yet. So the very first code is inserted by hand.

1. **SQL Editor**, once:

   ```sql
   insert into invites (code, role) values ('ANTOCHADMIN', 'admin');
   ```

   Use a code with no ambiguous characters. `START1` looks fine until you realise the last
   character could be a digit one, a capital i or a lowercase L depending on the font.

2. In the app, **Create account**, using that code. Case does not matter.

3. If you see *"Account created, but email confirmation is switched on…"*, then confirm via
   the emailed link, sign in, and go to **Settings → Redeem a code**. If the email never
   arrives, Supabase's built-in mailer is rate-limited — confirm manually instead:

   ```sql
   update auth.users set email_confirmed_at = now() where email_confirmed_at is null;
   ```

4. **Delete any unused admin invite codes** from *People & access* as soon as you are in.
   An unused admin code plus the anon key — which is public — is a working administrator
   account for anyone who has both.

After this you never touch SQL again. Trainer and administrator codes are generated from
*People & access*; trainee codes appear on each trainee's card.

---

## How each role gets a login

- **Administrator** — invite code from *People & access*.
- **Trainer** — invite code from *People & access*, handed over once.
- **Trainee** — the six-character **join code** on their trainee card. They choose
  *Create account* and enter it. It links their new login to their existing record and
  stops working afterwards.

Codes are single use. The database enforces this, not the interface.

### What the database enforces

Verified against the live project, not just intended:

- signed-out visitors read nothing from `profiles`, `trainees`, `topics`, `sessions` or `invites`
- a signed-out visitor cannot insert their own invite code
- `claim_code` refuses when not signed in
- new accounts are always created as a plain trainee; the real role is granted server-side
  by `claim_code`, so signup metadata cannot be edited to award administrator rights

---

## Pictures

The Picture Description drill uses Unsplash. A key is already configured. To replace it:

1. Register an application at <https://unsplash.com/developers>, tick every box on the
   terms page. The application name cannot contain the word "Unsplash".
2. Copy the **Access Key** — not the Secret key.
3. Paste it into `UNSPLASH_ACCESS_KEY` in `js/config.js`.

Free tier is 50 requests per hour; a session uses about three.

The drill searches rather than pulling "random", and takes a random page between 1 and 6.
The top hits for any search term are polished stock photography, which is precisely what a
description drill does not want. The query list is deliberately concrete — `mannequin`,
`parade float`, `laundromat` — because abstract words like "surreal" return landscapes.

Without a key the drill still runs on a neutral random source. If Unsplash is rate-limited
or returns nothing, there is a box under the image for pasting any image address by hand.

---

## Running it

The app uses JavaScript modules, so it must be served over `http://` or `https://`.
Double-clicking `index.html` will not work.

Locally, from inside this folder:

```bash
npx serve -l 5173 .
```

Then open <http://localhost:5173>.

### GitHub Pages

1. Create an **empty public** repository — no README, no .gitignore, no licence.
2. From this folder:

   ```bash
   git remote add origin https://github.com/<account>/<repo>.git && git push -u origin main
   ```

3. Repo **Settings → Pages → Deploy from a branch**, branch `main`, folder `/ (root)`.
4. Set **Site URL** in Supabase under **Authentication → URL Configuration** to the
   published address, so confirmation and password-reset links point to the right place.

Pages requires a **public** repository on a free GitHub account. Publishing from a private
repository needs a paid plan.

The microphone in the pronunciation game needs a secure origin. `localhost` and GitHub
Pages both qualify; a plain `http://` address on your local network does not.

### Use Microsoft Edge for lessons

Speech recognition is not part of the page — the browser supplies it, and browsers differ.
On this machine **Edge works and Chrome does not**: identical hardware, identical page,
identical microphone, but Chrome's recogniser starts and ends without ever returning a
word or raising an error, while Edge returns a clean transcript in about 2.5 seconds.

If speech ever stops working, the fastest test is to open the same page in another browser
before touching anything else. `mic-check.html` in this folder separates the possibilities:
microphone permission, the input device, the recogniser itself, and the embedding frame.
Its event trace is the part that matters — `soundstart` and `speechstart` firing prove the
browser heard you, so their absence points at the browser rather than the microphone.

---

## Things worth knowing before a live lesson

- **Nothing auto-advances.** The timer counts up and changes colour past the suggested
  length; you move the session on with **Next stage**.
- **Everything saves as you type**, and at every stage change. Closing the tab loses
  nothing — the trainee's page shows the session with a **Resume** button, and it reopens
  at the stage you left.
- **Stage 3 uses whatever Stage 2 harvested.** If nothing was harvested it falls back to a
  word list matched to the trainee's level and says so on screen.
- **Right-click a filler counter** to subtract a mistaken tap.
- The feedback note is built only from what you actually recorded. Empty sections are
  omitted rather than padded.
- The sign-in screen shows a build number. If your browser is serving a cached older copy,
  a red banner says so instead of leaving you to guess.
