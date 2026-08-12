/* =============================================================
   config.js — the only file you normally need to edit.

   LOCAL MODE (default)
     Leave SUPABASE_URL empty. Everything is stored in this
     browser's localStorage. Perfect for trying the app out, but
     the data lives on one machine only and trainees cannot log in
     from their own devices.

   CLOUD MODE
     Create a free Supabase project, run supabase-schema.sql in its
     SQL editor, then paste the Project URL and the anon public key
     below. See SETUP.md for the click-by-click version.
   ============================================================= */

export const SUPABASE_URL = 'https://duemwskakpalvgmdfsfu.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1ZW13c2tha3BhbHZnbWRmc2Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1NDU2ODEsImV4cCI6MjEwMjEyMTY4MX0.nfAyeOthcyihJPilAF7hL7Hlx3XFZhxB1d1r4mG-1ow';

/* Optional. Without a key the picture drill still works, it just
   falls back to a neutral random photo source instead of the
   quirky-biased Unsplash search. Get one free at
   https://unsplash.com/developers */
export const UNSPLASH_ACCESS_KEY = 'pl8JjOs3LBCCR-WthLoKQuUGMqiOefaZOyKQM8-vbUE';

/* Seed administrator used the first time the app runs in local
   mode. Change the password immediately from Settings. */
export const SEED_ADMIN = {
  email: 'admin@antoch.local',
  password: 'antoch',
  name: 'Administrator'
};

export const APP_NAME = 'Antoch Session Trainer';

/* Bumped whenever the app files change. Shown on the sign-in screen
   so a stale browser cache is obvious rather than mysterious. */
export const BUILD = 'b14';
