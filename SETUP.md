# Setting up Antoch Session Trainer

There are two ways to run this. Start with local mode today, move to cloud mode when
you want trainees logging in from their own devices.

---

## 1. Local mode — nothing to configure

Open the app from any web server (see *Running it* below) and sign in with:

- **Email:** `admin@antoch.local`
- **Password:** `antoch`

Change that password immediately under **Settings**.

Everything lives in that one browser's storage. That means:

- it works offline and costs nothing
- clearing site data deletes every trainee and session, so use **Settings → Backup → Export JSON** regularly
- trainees cannot log in from their own laptops — only the trainer's browser has the data

---

## 2. Cloud mode — Supabase

Supabase gives you a hosted database, real logins and a free tier that comfortably covers
a solo teacher. There is no server to maintain.

### Step by step

1. Go to <https://supabase.com>, sign up, and click **New project**.
   Pick any name and a strong database password. Wait for it to finish provisioning.
2. In the left sidebar open **SQL Editor → New query**.
3. Open `supabase-schema.sql` from this folder, copy the whole file, paste it in, press **Run**.
   You should see *Success. No rows returned*.
4. In the sidebar open **Project Settings → API**. Copy two values:
   - **Project URL**
   - **anon public** key (the long one labelled `anon`, *not* `service_role`)
5. Open `js/config.js` in this folder and paste them in:

   ```js
   export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```

6. Still in Supabase, open **Authentication → Providers → Email** and turn
   **Confirm email** off while you are setting up. Leaving it on is fine too — accounts
   just have to click a link before their first sign-in.

### Creating your own administrator account

1. Open the app, choose **Create account**, and register with any email and password.
   Leave the code field blank — it will refuse you, which is expected.
2. To get past that, first create one invite code by hand. In the Supabase **SQL Editor**:

   ```sql
   insert into invites (code, role) values ('START1', 'admin');
   ```

3. Register again using the code `START1`. You are now the administrator.

From then on you never touch SQL again: generate trainer and administrator codes from the
**People & access** screen inside the app.

### How the three roles get their logins

- **Administrator** — invite code generated in *People & access*.
- **Trainer** — invite code generated in *People & access*, given to them once.
- **Trainee** — the six-character **join code** on their trainee card. They open the app,
  choose *Create account*, and type that code. It links their new login to their existing
  record and stops working afterwards.

The database enforces the same boundaries the interface shows: a trainer's queries cannot
return another trainer's trainees, and a trainee's queries cannot return anyone else's
sessions. That check happens on Supabase's side, so it holds even if someone opens the
browser console.

---

## 3. Optional — quirky pictures

The Picture Description drill works out of the box using a neutral random photo source.
For the odd, unexpected images the drill is actually designed around, add a free
Unsplash key:

1. Register an application at <https://unsplash.com/developers>.
2. Copy the **Access Key**.
3. Paste it into `js/config.js`:

   ```js
   export const UNSPLASH_ACCESS_KEY = 'your-access-key';
   ```

The key is visible to anyone who views the page source. That is normal for Unsplash's
client-side use, and the free tier is rate-limited rather than billed — but do not reuse a
key you use elsewhere for anything sensitive.

---

## Running it

The app uses JavaScript modules, so it must be served over `http://` or `https://` —
opening `index.html` directly from the file system will not work.

**On your own machine**, from inside the `antoch-session-trainer` folder:

```bash
python -m http.server 5173
```

Then open <http://localhost:5173>.

**On GitHub Pages**, which is where this is meant to live:

1. Create a repository and push the contents of this folder to it.
2. Repository **Settings → Pages → Build and deployment → Deploy from a branch**,
   branch `main`, folder `/ (root)`.
3. Your app appears at `https://<your-account>.github.io/<repo>/` within a minute or two.

Microphone access in the pronunciation game requires a secure origin. `localhost` and
GitHub Pages both qualify; a plain `http://` address on your local network does not.

---

## Things worth knowing before a live lesson

- **Nothing auto-advances.** The timer counts up and changes colour past the suggested
  length; you move the session on with **Next stage**.
- **Everything is saved as you type**, at every stage change. Closing the tab mid-session
  loses nothing — reopen the session from the trainee's page.
- **Stage 3 uses whatever Stage 2 harvested.** If you harvested nothing, it falls back to a
  word list matched to the trainee's CEFR level and tells you it has done so.
- **Right-click a filler counter** to subtract a mistaken tap.
- The feedback note is built only from what you actually recorded. Empty sections are left
  out rather than padded.
