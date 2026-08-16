/* =============================================================
   store.js — one storage API, two backends.

   The rest of the app never knows which backend is live. In local
   mode everything sits in localStorage; in cloud mode the same
   calls go to Supabase, where row level security enforces the same
   visibility rules a second time on the server.
   ============================================================= */

import { SUPABASE_URL, SUPABASE_ANON_KEY, SEED_ADMIN } from './config.js';

const LS = {
  profiles: 'ast:profiles',
  trainees: 'ast:trainees',
  topics: 'ast:topics',
  sessions: 'ast:sessions',
  auth: 'ast:auth'
};

export const Store = {
  mode: 'local',
  sb: null,
  me: null
};

/* ---------------- shared helpers ---------------- */

function uid() {
  return 'x' + Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch (e) { return []; }
}

function write(key, rows) {
  localStorage.setItem(key, JSON.stringify(rows));
}

async function hash(password, salt) {
  const buf = new TextEncoder().encode(salt + '::' + password);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function makeJoinCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

/* ---------------- init ---------------- */

Store.init = async function () {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
    Store.sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    Store.mode = 'cloud';
  } else {
    Store.mode = 'local';
    await seedLocalAdmin();
  }
  await Store.refreshMe();
  return Store.mode;
};

async function seedLocalAdmin() {
  const profiles = read(LS.profiles);
  if (profiles.some(p => p.role === 'admin')) return;
  const salt = uid();
  profiles.push({
    id: uid(),
    email: SEED_ADMIN.email.toLowerCase(),
    name: SEED_ADMIN.name,
    role: 'admin',
    trainer_id: null,
    trainee_id: null,
    salt,
    pw: await hash(SEED_ADMIN.password, salt),
    created_at: new Date().toISOString()
  });
  write(LS.profiles, profiles);
}

/* ---------------- auth ---------------- */

Store.refreshMe = async function () {
  if (Store.mode === 'local') {
    const id = localStorage.getItem(LS.auth);
    Store.me = id ? read(LS.profiles).find(p => p.id === id) || null : null;
  } else {
    const { data } = await Store.sb.auth.getUser();
    if (!data || !data.user) { Store.me = null; return null; }
    const { data: rows } = await Store.sb.from('profiles').select('*').eq('id', data.user.id).limit(1);
    Store.me = (rows && rows[0]) || null;
  }
  return Store.me;
};

Store.signIn = async function (email, password) {
  email = String(email || '').trim().toLowerCase();
  if (Store.mode === 'local') {
    const p = read(LS.profiles).find(x => x.email === email);
    if (!p) throw new Error('No account with that email.');
    if (await hash(password, p.salt) !== p.pw) throw new Error('Wrong password.');
    localStorage.setItem(LS.auth, p.id);
    Store.me = p;
    return p;
  }
  const { error } = await Store.sb.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return await Store.refreshMe();
};

Store.signOut = async function () {
  if (Store.mode === 'local') localStorage.removeItem(LS.auth);
  else await Store.sb.auth.signOut();
  Store.me = null;
};

/* Self-service registration. A trainer or admin account needs an
   invite code issued from the Admin screen; a trainee needs the
   join code printed on their trainee card. */
Store.register = async function ({ email, password, name, code }) {
  email = String(email || '').trim().toLowerCase();
  code = String(code || '').trim().toUpperCase();
  if (!email || !password || !name) throw new Error('Name, email and password are all required.');
  if (password.length < 6) throw new Error('Password must be at least 6 characters.');

  const resolved = await resolveCode(code);
  if (!resolved) throw new Error('That code was not recognised.');

  if (Store.mode === 'local') {
    const profiles = read(LS.profiles);
    if (profiles.some(p => p.email === email)) throw new Error('That email is already registered.');
    const salt = uid();
    const p = {
      id: uid(), email, name, role: resolved.role,
      trainer_id: resolved.trainer_id || null,
      trainee_id: resolved.trainee_id || null,
      salt, pw: await hash(password, salt),
      created_at: new Date().toISOString()
    };
    profiles.push(p);
    write(LS.profiles, profiles);
    if (resolved.trainee_id) await linkTraineeProfile(resolved.trainee_id, p.id);
    localStorage.setItem(LS.auth, p.id);
    Store.me = p;
    return p;
  }

  const { data, error } = await Store.sb.auth.signUp({
    email, password,
    options: { data: { name, role: resolved.role, trainer_id: resolved.trainer_id, trainee_id: resolved.trainee_id } }
  });
  if (error) throw new Error(error.message);
  if (!data.session) {
    throw new Error('Account created, but email confirmation is switched on so the code could not be ' +
      'applied yet. Click the link in your inbox, sign in, then go to Settings and redeem the code there.');
  }
  /* claim_code runs server side: it consumes the invite and links the
     trainee row, so neither step can be faked from the browser. */
  const { error: claimError } = await Store.sb.rpc('claim_code', { p_code: code });
  if (claimError) throw new Error(claimError.message);
  return await Store.refreshMe();
};

/* Trainee join codes live on the trainee row; trainer and admin
   invite codes live in the invites table. In cloud mode neither
   table is readable by the browser — a security definer function
   answers the single question "what does this code entitle me to". */
async function resolveCode(code) {
  if (!code) return null;

  if (Store.mode === 'cloud') {
    const { data, error } = await Store.sb.rpc('resolve_code', { p_code: code });
    if (error || !data || !data.role) return null;
    return data;
  }

  const trainees = await rawTrainees();
  const t = trainees.find(x => (x.join_code || '').toUpperCase() === code);
  if (t) return { role: 'trainee', trainer_id: t.trainer_id, trainee_id: t.id };

  const invites = await rawInvites();
  const inv = invites.find(x => (x.code || '').toUpperCase() === code && !x.used_at);
  if (inv) {
    await consumeInvite(inv);
    return { role: inv.role, trainer_id: null, trainee_id: null };
  }
  return null;
}

/* Redeem a code against the account that is already signed in.
   Registration does this automatically; this is the way back for
   anyone whose signup completed before the code could be applied —
   most often because email confirmation was still switched on. */
Store.claimCode = async function (code) {
  code = String(code || '').trim().toUpperCase();
  if (!code) throw new Error('Type the code first.');
  if (!Store.me) throw new Error('Sign in first.');

  if (Store.mode === 'cloud') {
    const { error } = await Store.sb.rpc('claim_code', { p_code: code });
    if (error) throw new Error(error.message);
    return await Store.refreshMe();
  }

  const resolved = await resolveCode(code);
  if (!resolved) throw new Error('That code was not recognised, or it has already been used.');
  const patch = { role: resolved.role };
  if (resolved.trainer_id) patch.trainer_id = resolved.trainer_id;
  if (resolved.trainee_id) patch.trainee_id = resolved.trainee_id;
  await Store.updateProfile(Store.me.id, patch);
  if (resolved.trainee_id) await linkTraineeProfile(resolved.trainee_id, Store.me.id);
  return await Store.refreshMe();
};

/* ---------------- invites (trainer / admin accounts) ---------------- */

async function rawInvites() {
  if (Store.mode === 'local') return read('ast:invites');
  const { data } = await Store.sb.from('invites').select('*');
  return data || [];
}

async function consumeInvite(inv) {
  if (Store.mode === 'local') {
    const rows = read('ast:invites');
    const i = rows.findIndex(x => x.id === inv.id);
    if (i >= 0) { rows[i].used_at = new Date().toISOString(); write('ast:invites', rows); }
    return;
  }
  await Store.sb.from('invites').update({ used_at: new Date().toISOString() }).eq('id', inv.id);
}

Store.listInvites = async function () {
  const rows = await rawInvites();
  return rows.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
};

Store.createInvite = async function (role) {
  const row = { id: uid(), code: makeJoinCode(), role, used_at: null, created_at: new Date().toISOString() };
  if (Store.mode === 'local') {
    const rows = read('ast:invites'); rows.push(row); write('ast:invites', rows);
    return row;
  }
  const { data, error } = await Store.sb.from('invites').insert({ code: row.code, role }).select().single();
  if (error) throw new Error(error.message);
  return data;
};

Store.deleteInvite = async function (id) {
  if (Store.mode === 'local') { write('ast:invites', read('ast:invites').filter(x => x.id !== id)); return; }
  await Store.sb.from('invites').delete().eq('id', id);
};

/* ---------------- profiles ---------------- */

Store.listProfiles = async function () {
  if (Store.mode === 'local') {
    return read(LS.profiles).map(p => ({ ...p, pw: undefined, salt: undefined }));
  }
  const { data } = await Store.sb.from('profiles').select('*').order('created_at');
  return data || [];
};

Store.updateProfile = async function (id, patch) {
  if (Store.mode === 'local') {
    const rows = read(LS.profiles);
    const i = rows.findIndex(p => p.id === id);
    if (i < 0) throw new Error('Account not found.');
    Object.assign(rows[i], patch);
    write(LS.profiles, rows);
    if (Store.me && Store.me.id === id) Store.me = rows[i];
    return rows[i];
  }
  const { data, error } = await Store.sb.from('profiles').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

Store.changePassword = async function (newPassword) {
  if (newPassword.length < 6) throw new Error('Password must be at least 6 characters.');
  if (Store.mode === 'local') {
    const rows = read(LS.profiles);
    const i = rows.findIndex(p => p.id === Store.me.id);
    rows[i].salt = uid();
    rows[i].pw = await hash(newPassword, rows[i].salt);
    write(LS.profiles, rows);
    return;
  }
  const { error } = await Store.sb.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message);
};

Store.deleteProfile = async function (id) {
  if (Store.mode === 'local') { write(LS.profiles, read(LS.profiles).filter(p => p.id !== id)); return; }
  await Store.sb.from('profiles').delete().eq('id', id);
};

/* ---------------- trainees ---------------- */

async function rawTrainees() {
  if (Store.mode === 'local') return read(LS.trainees);
  const { data } = await Store.sb.from('trainees').select('*');
  return data || [];
}

async function linkTraineeProfile(traineeId, profileId) {
  if (Store.mode === 'local') {
    const rows = read(LS.trainees);
    const i = rows.findIndex(t => t.id === traineeId);
    if (i >= 0) { rows[i].profile_id = profileId; write(LS.trainees, rows); }
    return;
  }
  await Store.sb.from('trainees').update({ profile_id: profileId }).eq('id', traineeId);
}

/* Visibility rules, applied client side for a fast UI and again by
   the database in cloud mode. */
function scopeTrainees(rows) {
  const me = Store.me;
  if (!me) return [];
  if (me.role === 'admin') return rows;
  if (me.role === 'trainer') return rows.filter(t => t.trainer_id === me.id);
  return rows.filter(t => t.profile_id === me.id || t.id === me.trainee_id);
}

Store.listTrainees = async function () {
  const rows = await rawTrainees();
  return scopeTrainees(rows).sort((a, b) => a.name.localeCompare(b.name));
};

Store.getTrainee = async function (id) {
  return (await Store.listTrainees()).find(t => t.id === id) || null;
};

Store.createTrainee = async function ({ name, level, trainer_id, notes }) {
  if (!name || !name.trim()) throw new Error('The trainee needs a name.');
  const row = {
    id: uid(),
    name: name.trim(),
    level: level || 'A2',
    trainer_id: trainer_id || (Store.me.role === 'trainer' ? Store.me.id : null),
    notes: notes || '',
    join_code: makeJoinCode(),
    profile_id: null,
    created_at: new Date().toISOString()
  };
  if (Store.mode === 'local') {
    const rows = read(LS.trainees); rows.push(row); write(LS.trainees, rows);
    return row;
  }
  const { id, created_at, ...insert } = row;
  const { data, error } = await Store.sb.from('trainees').insert(insert).select().single();
  if (error) throw new Error(error.message);
  return data;
};

Store.updateTrainee = async function (id, patch) {
  if (Store.mode === 'local') {
    const rows = read(LS.trainees);
    const i = rows.findIndex(t => t.id === id);
    if (i < 0) throw new Error('Trainee not found.');
    Object.assign(rows[i], patch);
    write(LS.trainees, rows);
    return rows[i];
  }
  const { data, error } = await Store.sb.from('trainees').update(patch).eq('id', id).select().single();
  if (error) throw new Error(error.message);
  return data;
};

Store.deleteTrainee = async function (id) {
  if (Store.mode === 'local') {
    write(LS.trainees, read(LS.trainees).filter(t => t.id !== id));
    write(LS.sessions, read(LS.sessions).filter(s => s.trainee_id !== id));
    write(LS.topics, read(LS.topics).filter(t => t.trainee_id !== id));
    return;
  }
  await Store.sb.from('trainees').delete().eq('id', id);
};

/* ---------------- topic bank ---------------- */

Store.listTopics = async function (traineeId) {
  if (Store.mode === 'local') {
    return read(LS.topics).filter(t => t.trainee_id === traineeId);
  }
  const { data } = await Store.sb.from('topics').select('*').eq('trainee_id', traineeId).order('created_at');
  return data || [];
};

Store.addTopic = async function ({ trainee_id, text, tag }) {
  if (!text || !text.trim()) throw new Error('Type the topic first.');
  const row = { id: uid(), trainee_id, text: text.trim(), tag: tag || 'anchor', created_at: new Date().toISOString() };
  if (Store.mode === 'local') {
    const rows = read(LS.topics); rows.push(row); write(LS.topics, rows);
    return row;
  }
  const { id, created_at, ...insert } = row;
  const { data, error } = await Store.sb.from('topics').insert(insert).select().single();
  if (error) throw new Error(error.message);
  return data;
};

Store.deleteTopic = async function (id) {
  if (Store.mode === 'local') { write(LS.topics, read(LS.topics).filter(t => t.id !== id)); return; }
  await Store.sb.from('topics').delete().eq('id', id);
};

/* ---------------- sessions ---------------- */

Store.listSessions = async function (traineeId) {
  let rows;
  if (Store.mode === 'local') {
    rows = read(LS.sessions);
  } else {
    const q = Store.sb.from('sessions').select('*').order('started_at', { ascending: false });
    const { data } = traineeId ? await q.eq('trainee_id', traineeId) : await q;
    rows = data || [];
  }
  if (traineeId) rows = rows.filter(s => s.trainee_id === traineeId);
  else {
    const visible = new Set((await Store.listTrainees()).map(t => t.id));
    rows = rows.filter(s => visible.has(s.trainee_id));
  }
  return rows.sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''));
};

Store.createSession = async function ({ trainee_id, trainer_id, plan }) {
  const row = {
    id: uid(),
    trainee_id,
    trainer_id: trainer_id || (Store.me ? Store.me.id : null),
    started_at: new Date().toISOString(),
    ended_at: null,
    plan: plan || {},
    data: {},
    live: {},
    created_at: new Date().toISOString()
  };
  if (Store.mode === 'local') {
    const rows = read(LS.sessions); rows.push(row); write(LS.sessions, rows);
    return row;
  }
  /* `live` is left to the column default, so creating a session still
     works on a project where supabase-live-column.sql has not been run. */
  const { id, created_at, live, ...insert } = row;
  const { data, error } = await Store.sb.from('sessions').insert(insert).select().single();
  if (error) throw new Error(error.message);
  return data;
};

/* The trainee's live view asks this and nothing else: the newest
   unfinished session for one trainee, and only the columns that decide
   what is on their screen. `data` is deliberately absent — it is the
   large, slow-changing half, and pulling it every few seconds for every
   trainee in the building is what made a room of three feel like a room
   of thirty. */
Store.liveSession = async function (traineeId) {
  if (Store.mode === 'local') {
    const rows = read(LS.sessions)
      .filter(s => s.trainee_id === traineeId && !s.ended_at)
      .sort((a, b) => (b.started_at || '').localeCompare(a.started_at || ''));
    return rows[0] || null;
  }
  /* supabase-live-column.sql may not have been run yet. The first
     failure says so, and everything falls back to the old whole-record
     path rather than leaving the trainee staring at nothing. */
  if (!Store.noLiveColumn) {
    const { data, error } = await Store.sb
      .from('sessions')
      .select('id,trainee_id,started_at,ended_at,live')
      .eq('trainee_id', traineeId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1);
    if (!error) return (data && data[0]) || null;
    Store.noLiveColumn = true;
  }
  const { data, error } = await Store.sb
    .from('sessions')
    .select('*')
    .eq('trainee_id', traineeId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return (data && data[0]) || null;
};

/* The small half, written often. Kept separate from updateSession so a
   fast-moving stage never rewrites the whole record. */
Store.updateLive = async function (id, live) {
  if (Store.mode === 'local') {
    const rows = read(LS.sessions);
    const i = rows.findIndex(s => s.id === id);
    if (i < 0) return null;
    rows[i].live = live;
    write(LS.sessions, rows);
    return rows[i];
  }
  if (Store.noLiveColumn) return false;
  const { error } = await Store.sb.from('sessions').update({ live: live }).eq('id', id);
  if (error) { Store.noLiveColumn = true; return false; }
  return true;
};

Store.updateSession = async function (id, patch) {
  if (Store.mode === 'local') {
    const rows = read(LS.sessions);
    const i = rows.findIndex(s => s.id === id);
    if (i < 0) throw new Error('Session not found.');
    Object.assign(rows[i], patch);
    write(LS.sessions, rows);
    return rows[i];
  }
  /* No .select() on the way back: the row returned was the whole record
     again, doubling the cost of every save for a value nobody read. */
  const { error } = await Store.sb.from('sessions').update(patch).eq('id', id);
  if (error) throw new Error(error.message);
  return true;
};

Store.deleteSession = async function (id) {
  if (Store.mode === 'local') { write(LS.sessions, read(LS.sessions).filter(s => s.id !== id)); return; }
  await Store.sb.from('sessions').delete().eq('id', id);
};

/* ---------------- recordings ----------------
   The trainee's attempt is captured on their own device, so the trainer
   can only hear it if it goes somewhere both of them can reach. It lands
   in a private Supabase storage bucket under the trainee's own id, which
   is what the storage policy checks: the trainee, their trainer and an
   administrator can reach that folder and nobody else. Run
   supabase-recordings.sql once to create the bucket and its policies.

   In local mode there is no bucket and no second device — the audio
   travels straight down the BroadcastChannel instead. */

const RECORDINGS_BUCKET = 'recordings';

Store.uploadRecording = async function (traineeId, sessionId, word, blob) {
  if (Store.mode === 'local') return null;
  const safe = String(word || 'word').toLowerCase().replace(/[^a-z0-9]/g, '') || 'word';
  const ext = /ogg/.test(blob.type) ? 'ogg' : /mp4/.test(blob.type) ? 'mp4' : 'webm';
  const path = traineeId + '/' + sessionId + '/' + Date.now() + '-' + safe + '.' + ext;
  const { error } = await Store.sb.storage.from(RECORDINGS_BUCKET)
    .upload(path, blob, { contentType: blob.type || 'audio/webm', upsert: false });
  if (error) throw new Error(error.message);
  return path;
};

/* Signed rather than public: the bucket stays private, and the link
   expires long after the lesson it belongs to has ended. */
Store.recordingUrl = async function (path) {
  if (Store.mode === 'local') return null;
  const { data, error } = await Store.sb.storage.from(RECORDINGS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 8);
  if (error) throw new Error(error.message);
  return data.signedUrl;
};

/* ---------------- export / import (local safety net) ---------------- */

Store.exportAll = function () {
  return JSON.stringify({
    exported_at: new Date().toISOString(),
    profiles: read(LS.profiles),
    trainees: read(LS.trainees),
    topics: read(LS.topics),
    sessions: read(LS.sessions),
    invites: read('ast:invites')
  }, null, 2);
};

Store.importAll = function (json) {
  const obj = JSON.parse(json);
  ['profiles', 'trainees', 'topics', 'sessions'].forEach(k => {
    if (Array.isArray(obj[k])) write(LS[k], obj[k]);
  });
  if (Array.isArray(obj.invites)) write('ast:invites', obj.invites);
};
