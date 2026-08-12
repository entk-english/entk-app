/* =============================================================
   app.js — authentication, shell, routing and every screen that
   is not the live session runner.
   ============================================================= */

import { APP_NAME, BUILD } from './config.js';
import { Store, makeJoinCode } from './store.js';
import { LEVELS, LEVEL_LABEL, TOPICS, forLevel } from './content.js';
import { esc, el, $, $$, toast, modal, confirmBox, copyText, downloadText, fmtDate, fmtDateTime } from './ui.js';
import { runSession } from './session.js';

const root = document.getElementById('root');

/* ---------------- boot ---------------- */

(async function boot() {
  try {
    await Store.init();
  } catch (e) {
    root.innerHTML = '<div class="auth-wrap"><div class="card auth-card"><h1>' + esc(APP_NAME) + '</h1>' +
      '<div class="notice err">Could not reach the database: ' + esc(e.message) + '</div>' +
      '<p class="sub">Check the values in <span class="mono">js/config.js</span>, or clear them to fall back to local mode.</p></div></div>';
    return;
  }
  window.addEventListener('hashchange', render);
  render();
})();

/* ---------------- router ---------------- */

export async function render() {
  if (!Store.me) { renderAuth(); return; }
  const hash = location.hash.replace(/^#\/?/, '');
  const [route, arg] = hash.split('/');

  if (route === 'session' && arg) { await runSession(root, arg, render); return; }

  const page = el('<div class="app"></div>');
  page.appendChild(topbar(route));
  const body = el('<div class="page"></div>');
  page.appendChild(body);
  root.innerHTML = '';
  root.appendChild(page);

  try {
    if (route === 'trainee' && arg) await viewTrainee(body, arg);
    else if (route === 'admin') await viewAdmin(body);
    else if (route === 'settings') await viewSettings(body);
    else if (route === 'history') await viewMyHistory(body);
    else if (Store.me.role === 'trainee') await viewMyHistory(body);
    else await viewTrainees(body);
  } catch (e) {
    body.appendChild(el('<div class="notice err">' + esc(e.message) + '</div>'));
  }
}

function go(hash) { location.hash = hash; }

/* ---------------- theme ---------------- */

/* Light unless dark was explicitly chosen — the stylesheet's :root is
   the light palette, so an absent attribute means light. */
function currentTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function toggleTheme() {
  const next = currentTheme() === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('ast:theme', next); } catch (e) {}
  render();
}

function themeButton() {
  const light = currentTheme() === 'light';
  const b = el('<button class="themeBtn" title="Switch to ' + (light ? 'dark' : 'light') + ' theme">' +
    (light ? '☾' : '☀') + '</button>');
  b.onclick = toggleTheme;
  return b;
}

function topbar(route) {
  const me = Store.me;
  const links = me.role === 'trainee'
    ? [['history', 'My sessions']]
    : [['', 'Trainees']].concat(me.role === 'admin' ? [['admin', 'People & access']] : []);
  links.push(['settings', 'Settings']);

  const bar = el(
    '<header class="topbar">' +
      '<div class="logo">' + esc(APP_NAME) + '</div>' +
      '<nav>' + links.map(([h, label]) =>
        '<button class="navlink' + ((route || '') === h ? ' active' : '') + '" data-go="' + h + '">' + esc(label) + '</button>'
      ).join('') + '</nav>' +
      '<div class="whoami"><b>' + esc(me.name || me.email) + '</b>' +
        '<span class="badge ' + esc(me.role) + '">' + esc(me.role) + '</span>' +
        (Store.mode === 'local' ? ' <span class="badge">local</span>' : '') +
      '</div>' +
      '<button class="btn ghost sm" data-out>Sign out</button>' +
    '</header>'
  );
  bar.insertBefore(themeButton(), $('[data-out]', bar));
  $$('[data-go]', bar).forEach(b => b.onclick = () => go('#/' + b.dataset.go));
  $('[data-out]', bar).onclick = async () => { await Store.signOut(); location.hash = ''; render(); };
  return bar;
}

/* =============================================================
   AUTH
   ============================================================= */

function renderAuth() {
  let tab = 'in';
  root.innerHTML = '';
  const wrap = el('<div class="auth-wrap"></div>');
  root.appendChild(wrap);

  function draw(message, kind) {
    wrap.innerHTML = '';
    const card = el(
      '<div class="card auth-card">' +
        '<h1>' + esc(APP_NAME) + '</h1>' +
        '<p class="sub">One-on-one English conversation coaching</p>' +
        '<div class="tabs">' +
          '<button class="' + (tab === 'in' ? 'active' : '') + '" data-tab="in">Sign in</button>' +
          '<button class="' + (tab === 'up' ? 'active' : '') + '" data-tab="up">Create account</button>' +
        '</div>' +
        (message ? '<div class="notice ' + kind + '">' + esc(message) + '</div>' : '') +
        (tab === 'up'
          ? '<div class="field"><label>Your name</label><input id="a-name" autocomplete="name"></div>'
          : '') +
        '<div class="field"><label>Email</label><input id="a-email" type="email" autocomplete="username"></div>' +
        '<div class="field"><label>Password</label><input id="a-pass" type="password" autocomplete="' +
          (tab === 'up' ? 'new-password' : 'current-password') + '"></div>' +
        (tab === 'up'
          ? '<div class="field"><label>Join or invite code</label><input id="a-code" class="mono" placeholder="e.g. K7QP2M" style="text-transform:uppercase"></div>' +
            '<p class="sub" style="margin-bottom:16px">Trainees use the join code on their trainee card. Trainers use an invite code from the administrator.</p>'
          : '') +
        '<button class="btn block" data-submit>' + (tab === 'up' ? 'Create account' : 'Sign in') + '</button>' +
        (Store.mode === 'local'
          ? '<div class="notice info" style="margin-top:16px">Running in <b>local mode</b> — data stays in this browser and cloud invite codes will not work here.' +
            (tab === 'in' ? ' First run: <b>admin@antoch.local</b> / <b>antoch</b>. Change that password straight away.' : '') + '</div>'
          : '<div class="notice ok" style="margin-top:16px">Connected to Supabase.</div>') +
        /* A capability probe rather than a version string: a browser
           serving a cached older store.js will be missing functions
           the current app expects, which is the thing worth knowing. */
        (typeof Store.claimCode === 'function'
          ? '<p class="sub mono" style="text-align:center;margin:12px 0 0;font-size:11px;opacity:.7">build ' + esc(BUILD) + '</p>'
          : '<div class="notice err" style="margin-top:12px">Your browser is running a cached older copy of this app. Press Ctrl+Shift+R.</div>') +
      '</div>'
    );
    wrap.appendChild(card);

    const themeRow = el('<div class="row" style="justify-content:center;margin-top:14px"></div>');
    themeRow.appendChild(themeButton());
    card.appendChild(themeRow);

    $$('[data-tab]', card).forEach(b => b.onclick = () => { tab = b.dataset.tab; draw(); });

    const submit = async () => {
      const email = $('#a-email', card).value;
      const pass = $('#a-pass', card).value;
      try {
        if (tab === 'up') {
          await Store.register({
            email, password: pass,
            name: $('#a-name', card).value,
            code: $('#a-code', card).value
          });
        } else {
          await Store.signIn(email, pass);
        }
        location.hash = '';
        render();
      } catch (e) {
        draw(e.message, 'err');
      }
    };
    $('[data-submit]', card).onclick = submit;
    $$('input', card).forEach(i => i.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); }));
  }

  draw();
}

/* =============================================================
   TRAINEES — admin and trainer landing screen
   ============================================================= */

async function viewTrainees(body) {
  const trainees = await Store.listTrainees();
  const profiles = Store.me.role === 'admin' ? await Store.listProfiles() : [];
  const trainerName = id => {
    const p = profiles.find(x => x.id === id);
    return p ? (p.name || p.email) : 'unassigned';
  };
  const sessions = await Store.listSessions();
  const countFor = id => sessions.filter(s => s.trainee_id === id).length;
  const lastFor = id => {
    const s = sessions.filter(x => x.trainee_id === id)[0];
    return s ? fmtDate(s.started_at) : 'no sessions yet';
  };

  body.appendChild(el(
    '<div class="row between" style="margin-bottom:18px">' +
      '<div><h1>Trainees</h1><p class="sub" style="margin:0">' +
        (Store.me.role === 'admin' ? 'Every trainee on the platform.' : 'The trainees assigned to you.') +
      '</p></div>' +
      '<button class="btn" data-new>New trainee</button>' +
    '</div>'
  ));

  if (!trainees.length) {
    body.appendChild(el('<div class="empty">No trainees yet. Create the first one to start running sessions.</div>'));
  } else {
    const list = el('<div class="list"></div>');
    trainees.forEach(t => {
      const item = el(
        '<div class="item">' +
          '<div class="grow">' +
            '<div class="title">' + esc(t.name) + ' <span class="badge level">' + esc(t.level) + '</span>' +
              (t.profile_id ? '' : ' <span class="badge">no login yet</span>') + '</div>' +
            '<div class="meta">' + countFor(t.id) + ' session' + (countFor(t.id) === 1 ? '' : 's') +
              ' · last ' + lastFor(t.id) +
              (Store.me.role === 'admin' ? ' · trainer: ' + esc(trainerName(t.trainer_id)) : '') +
            '</div>' +
          '</div>' +
          '<button class="btn sm" data-open>Open</button>' +
        '</div>'
      );
      $('[data-open]', item).onclick = () => go('#/trainee/' + t.id);
      item.addEventListener('dblclick', () => go('#/trainee/' + t.id));
      list.appendChild(item);
    });
    body.appendChild(list);
  }

  $('[data-new]', body).onclick = () => newTraineeDialog(profiles);
}

async function newTraineeDialog(profiles) {
  const trainers = (profiles.length ? profiles : await Store.listProfiles().catch(() => []))
    .filter(p => p.role === 'trainer' || p.role === 'admin');

  const html =
    '<h2>New trainee</h2>' +
    '<div class="field"><label>Name</label><input id="t-name"></div>' +
    '<div class="field"><label>CEFR level</label><select id="t-level">' +
      LEVELS.map(l => '<option value="' + l + '"' + (l === 'A2' ? ' selected' : '') + '>' + LEVEL_LABEL[l] + '</option>').join('') +
    '</select></div>' +
    (Store.me.role === 'admin'
      ? '<div class="field"><label>Trainer</label><select id="t-trainer">' +
        trainers.map(p => '<option value="' + p.id + '"' + (p.id === Store.me.id ? ' selected' : '') + '>' + esc(p.name || p.email) + '</option>').join('') +
        '</select></div>'
      : '') +
    '<div class="field"><label>Notes (optional)</label><textarea id="t-notes" placeholder="Goals, job, recurring problems…"></textarea></div>' +
    '<div class="row"><button class="btn ghost" data-cancel>Cancel</button><button class="btn" data-save>Create</button></div>';

  const created = await modal(html, (card, close) => {
    $('[data-cancel]', card).onclick = () => close(null);
    $('[data-save]', card).onclick = async () => {
      try {
        const t = await Store.createTrainee({
          name: $('#t-name', card).value,
          level: $('#t-level', card).value,
          trainer_id: $('#t-trainer', card) ? $('#t-trainer', card).value : Store.me.id,
          notes: $('#t-notes', card).value
        });
        close(t);
      } catch (e) { toast(e.message, 'err'); }
    };
  });

  if (created) { toast('Trainee created.'); go('#/trainee/' + created.id); render(); }
}

/* =============================================================
   TRAINEE DETAIL — history, topic bank, session planner
   ============================================================= */

async function viewTrainee(body, id) {
  const t = await Store.getTrainee(id);
  if (!t) { body.appendChild(el('<div class="notice err">That trainee is not available to your account.</div>')); return; }
  const sessions = await Store.listSessions(t.id);
  const topics = await Store.listTopics(t.id);
  const canEdit = Store.me.role !== 'trainee';

  body.appendChild(el(
    '<div class="row between" style="margin-bottom:6px">' +
      '<div><h1>' + esc(t.name) + ' <span class="badge level">' + esc(LEVEL_LABEL[t.level] || t.level) + '</span></h1>' +
      '<p class="sub" style="margin:0">' + sessions.length + ' session' + (sessions.length === 1 ? '' : 's') + ' recorded</p></div>' +
      (canEdit ? '<div class="row"><button class="btn ghost sm" data-edit>Edit</button><button class="btn" data-start>Start session</button></div>' : '') +
    '</div>'
  ));
  body.appendChild(el('<div style="height:14px"></div>'));

  /* --- trend summary --- */
  body.appendChild(trendCard(sessions));

  /* --- planner + topic bank --- */
  if (canEdit) {
    const grid = el('<div class="grid two"></div>');
    grid.appendChild(topicCard(t, topics));
    grid.appendChild(traineeCard(t));
    body.appendChild(grid);
  }

  /* --- history --- */
  const hist = el('<div class="card"><h2>Session history</h2><div class="list" id="hist"></div></div>');
  const list = $('#hist', hist);
  if (!sessions.length) list.appendChild(el('<div class="empty">Nothing yet.</div>'));
  sessions.forEach(s => {
    const d = s.data || {};
    const fillers = totalFillers(d);
    const item = el(
      '<div class="item">' +
        '<div class="grow">' +
          '<div class="title">' + fmtDateTime(s.started_at) + (s.ended_at ? '' : ' <span class="badge">unfinished</span>') + '</div>' +
          '<div class="meta">' +
            esc((d.harvest && d.harvest.topic) || 'no topic recorded') +
            ' · ' + ((d.harvest && d.harvest.words || []).length) + ' words harvested' +
            ' · ' + fillers + ' fillers' +
          '</div>' +
        '</div>' +
        (canEdit && !s.ended_at ? '<button class="btn sm" data-resume>Resume</button>' : '') +
        '<button class="btn ghost sm" data-view>View</button>' +
        (canEdit ? '<button class="btn ghost sm" data-del>Delete</button>' : '') +
      '</div>'
    );
    const resume = $('[data-resume]', item);
    if (resume) resume.onclick = () => go('#/session/' + s.id);
    $('[data-view]', item).onclick = () => sessionDialog(s, t);
    const del = $('[data-del]', item);
    if (del) del.onclick = async () => {
      if (await confirmBox('Delete session?', 'The record from ' + fmtDate(s.started_at) + ' will be removed permanently.', true)) {
        await Store.deleteSession(s.id); toast('Session deleted.'); render();
      }
    };
    list.appendChild(item);
  });
  body.appendChild(hist);

  if (canEdit) {
    $('[data-start]', body).onclick = () => planDialog(t, sessions);
    $('[data-edit]', body).onclick = () => editTraineeDialog(t);
  }
}

function totalFillers(d) {
  const f = (d.harvest && d.harvest.fillers) || {};
  return Object.keys(f).reduce((sum, k) => sum + (f[k] || 0), 0);
}

function trendCard(sessions) {
  const done = sessions.filter(s => s.ended_at);
  if (!done.length) return el('<div class="card tight"><p class="sub" style="margin:0">Trends appear once the first session is finished.</p></div>');

  const harvestOf = s => ((s.data || {}).harvest) || {};
  const fillerSeries = done.map(s => totalFillers(s.data || {}));
  const avg = fillerSeries.reduce((a, b) => a + b, 0) / fillerSeries.length;
  const latest = fillerSeries[0];
  const delta = latest - avg;

  const errorCounts = {};
  done.forEach(s => (harvestOf(s).errors || []).forEach(e => {
    errorCounts[e.type] = (errorCounts[e.type] || 0) + 1;
  }));
  const topErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);

  const words = new Set();
  done.slice(0, 4).forEach(s => (harvestOf(s).words || []).forEach(w => words.add(w.toLowerCase())));

  return el(
    '<div class="card"><h2>Trends</h2><div class="stat-row">' +
      '<div class="stat"><div class="n">' + latest + '</div><div class="l">Fillers last session</div>' +
        '<div class="d ' + (delta > 0 ? 'up' : 'down') + '">' + (delta > 0 ? '+' : '') + delta.toFixed(1) + ' vs average</div></div>' +
      '<div class="stat"><div class="n">' + avg.toFixed(1) + '</div><div class="l">Rolling filler average</div><div class="d">' + done.length + ' sessions</div></div>' +
      '<div class="stat"><div class="n">' + words.size + '</div><div class="l">Words in recent rotation</div><div class="d">last 4 sessions</div></div>' +
      '<div class="stat"><div class="n" style="font-size:16px;line-height:1.4">' +
        (topErrors.length ? topErrors.map(e => esc(e[0]) + ' ×' + e[1]).join('<br>') : '—') +
        '</div><div class="l">Most frequent errors</div></div>' +
    '</div></div>'
  );
}

function topicCard(t, topics) {
  const card = el(
    '<div class="card"><h2>Topic bank</h2>' +
    '<p class="sub">Anchor topics are everyday and retrievable. Stretch topics are unusual or hypothetical, so the trainee has to build language on the spot instead of replaying a memorised answer.</p>' +
    '<div class="list" id="tp"></div>' +
    '<div class="row" style="margin-top:14px">' +
      '<input id="tp-text" placeholder="Add your own topic…" style="flex:1;min-width:180px">' +
      '<select id="tp-tag" style="width:120px"><option value="anchor">Anchor</option><option value="stretch">Stretch</option></select>' +
      '<button class="btn sm" data-add>Add</button>' +
    '</div>' +
    '<div class="eyebrow" style="margin-top:18px">Suggestions for ' + esc(t.level) + '</div>' +
    '<div class="chips" id="tp-sug"></div>' +
    '</div>'
  );

  const list = $('#tp', card);
  if (!topics.length) list.appendChild(el('<div class="empty">Empty — add a few, or tap a suggestion below.</div>'));
  topics.forEach(tp => {
    const row = el('<div class="item"><div class="grow"><div class="title" style="font-size:14px">' + esc(tp.text) + '</div></div>' +
      '<span class="badge ' + esc(tp.tag) + '">' + esc(tp.tag) + '</span>' +
      '<button class="btn ghost sm" data-x>Remove</button></div>');
    $('[data-x]', row).onclick = async () => { await Store.deleteTopic(tp.id); render(); };
    list.appendChild(row);
  });

  const bank = forLevel(TOPICS, t.level);
  const sug = $('#tp-sug', card);
  ['anchor', 'stretch'].forEach(tag => {
    (bank[tag] || []).forEach(text => {
      if (topics.some(x => x.text === text)) return;
      const chip = el('<span class="chip' + (tag === 'stretch' ? ' gold' : '') + '">' + esc(text) + '</span>');
      chip.onclick = async () => { await Store.addTopic({ trainee_id: t.id, text, tag }); render(); };
      sug.appendChild(chip);
    });
  });

  $('[data-add]', card).onclick = async () => {
    try {
      await Store.addTopic({ trainee_id: t.id, text: $('#tp-text', card).value, tag: $('#tp-tag', card).value });
      render();
    } catch (e) { toast(e.message, 'err'); }
  };
  return card;
}

function traineeCard(t) {
  const card = el(
    '<div class="card"><h2>Trainee card</h2>' +
    '<div class="field"><label>Join code — the trainee uses this once to create their own login</label>' +
      '<div class="row"><input class="mono" value="' + esc(t.join_code || '') + '" readonly style="flex:1;font-size:20px;letter-spacing:3px">' +
      '<button class="btn ghost sm" data-copy>Copy</button>' +
      '<button class="btn ghost sm" data-regen>New code</button></div></div>' +
    (t.profile_id
      ? '<div class="notice ok">This trainee has a login and can see their own history.</div>'
      : '<div class="notice info">No login yet. Give them the code above and the address of this app.</div>') +
    '<div class="field"><label>Notes</label><textarea id="t-notes">' + esc(t.notes || '') + '</textarea></div>' +
    '<button class="btn sm" data-savenotes>Save notes</button>' +
    '</div>'
  );
  $('[data-copy]', card).onclick = async () => { await copyText(t.join_code || ''); toast('Join code copied.'); };
  $('[data-regen]', card).onclick = async () => {
    if (await confirmBox('Issue a new join code?', 'The old code stops working immediately.', false)) {
      await Store.updateTrainee(t.id, { join_code: makeJoinCode() });
      toast('New code issued.'); render();
    }
  };
  $('[data-savenotes]', card).onclick = async () => {
    await Store.updateTrainee(t.id, { notes: $('#t-notes', card).value });
    toast('Notes saved.');
  };
  return card;
}

async function editTraineeDialog(t) {
  const profiles = Store.me.role === 'admin' ? await Store.listProfiles() : [];
  const trainers = profiles.filter(p => p.role === 'trainer' || p.role === 'admin');
  const html =
    '<h2>Edit trainee</h2>' +
    '<div class="field"><label>Name</label><input id="e-name" value="' + esc(t.name) + '"></div>' +
    '<div class="field"><label>CEFR level</label><select id="e-level">' +
      LEVELS.map(l => '<option value="' + l + '"' + (l === t.level ? ' selected' : '') + '>' + LEVEL_LABEL[l] + '</option>').join('') +
    '</select></div>' +
    (trainers.length
      ? '<div class="field"><label>Trainer</label><select id="e-trainer">' +
        trainers.map(p => '<option value="' + p.id + '"' + (p.id === t.trainer_id ? ' selected' : '') + '>' + esc(p.name || p.email) + '</option>').join('') +
        '</select></div>'
      : '') +
    '<div class="row"><button class="btn ghost" data-cancel>Cancel</button>' +
    '<button class="btn" data-save>Save</button><span class="spacer"></span>' +
    '<button class="btn danger sm" data-del>Delete trainee</button></div>';

  const out = await modal(html, (card, close) => {
    $('[data-cancel]', card).onclick = () => close(null);
    $('[data-save]', card).onclick = async () => {
      const patch = { name: $('#e-name', card).value.trim(), level: $('#e-level', card).value };
      if ($('#e-trainer', card)) patch.trainer_id = $('#e-trainer', card).value;
      try { await Store.updateTrainee(t.id, patch); close('saved'); }
      catch (e) { toast(e.message, 'err'); }
    };
    $('[data-del]', card).onclick = async () => {
      if (await confirmBox('Delete ' + t.name + '?', 'Their sessions and topic bank are deleted too. This cannot be undone.', true)) close('deleted');
    };
  });

  if (out === 'saved') { toast('Saved.'); render(); }
  if (out === 'deleted') { await Store.deleteTrainee(t.id); toast('Trainee deleted.'); go('#/'); render(); }
}

/* =============================================================
   SESSION PLANNER — what this trainee will see today
   ============================================================= */

const OPTIONAL_DRILLS = [
  { id: 'wordform', name: 'Word Form Drill', note: 'Base word into noun, infinitive, past and adjective forms.' },
  { id: 'expansion', name: 'Sentence Expansion Drill', note: 'Simple sentence, then add What, When, Where, Why.' },
  { id: 'picture', name: 'Picture Description', note: 'Random quirky image, 60–90 seconds of description.' }
];

async function planDialog(t, sessions) {
  const topics = await Store.listTopics(t.id);
  const html =
    '<h2>Plan today\'s session</h2>' +
    '<p class="sub">' + esc(t.name) + ' · ' + esc(LEVEL_LABEL[t.level] || t.level) + '. Everything below can still be changed live.</p>' +
    '<div class="field"><label>Stage 4 — quick round</label><select id="p-stage4">' +
      '<option value="sentence">Sentence Builder Game (default)</option>' +
      OPTIONAL_DRILLS.map(d => '<option value="' + d.id + '">' + esc(d.name) + ' (instead of Sentence Builder)</option>').join('') +
    '</select></div>' +
    '<div class="field"><label>Extra rounds — tap to add, they are off unless you pick them</label><div class="chips" id="p-extra">' +
      OPTIONAL_DRILLS.map(d => '<span class="chip gold" data-x="' + d.id + '">' + esc(d.name) + '</span>').join('') +
    '</div></div>' +
    '<div class="field"><label>Free talk topic (optional — you can also type one live)</label>' +
      '<input id="p-topic" placeholder="Leave empty to choose during the session">' +
      '<div class="chips" style="margin-top:8px" id="p-topics">' +
        topics.map(tp => '<span class="chip' + (tp.tag === 'stretch' ? ' gold' : '') + '" data-t="' + esc(tp.text) + '">' + esc(tp.text) + '</span>').join('') +
      '</div>' +
    '</div>' +
    '<div class="row"><button class="btn ghost" data-cancel>Cancel</button><button class="btn" data-go>Start session</button></div>';

  const extras = new Set();
  const out = await modal(html, (card, close) => {
    $$('[data-x]', card).forEach(chip => chip.onclick = () => {
      const id = chip.dataset.x;
      if (extras.has(id)) { extras.delete(id); chip.classList.remove('on'); }
      else { extras.add(id); chip.classList.add('on'); }
    });
    $$('[data-t]', card).forEach(chip => chip.onclick = () => { $('#p-topic', card).value = chip.dataset.t; });
    $('[data-cancel]', card).onclick = () => close(null);
    $('[data-go]', card).onclick = () => close({
      stage4: $('#p-stage4', card).value,
      extras: Array.from(extras),
      topic: $('#p-topic', card).value.trim(),
      warmupIndex: sessions.length
    });
  });

  if (!out) return;
  const s = await Store.createSession({ trainee_id: t.id, trainer_id: Store.me.id, plan: out });
  go('#/session/' + s.id);
}

/* =============================================================
   READ-ONLY SESSION VIEW
   ============================================================= */

async function sessionDialog(s, t) {
  const d = s.data || {};
  const h = d.harvest || {};
  const fb = d.feedback || {};
  const lines = [];
  lines.push('<h2>' + fmtDateTime(s.started_at) + '</h2>');
  lines.push('<p class="sub">' + esc(t.name) + ' · ' + esc(t.level) + '</p>');
  if (d.warmup) lines.push('<div class="eyebrow">Warm-up</div><p>' + esc(d.warmup.format || '') + '</p>');
  if (h.topic) lines.push('<div class="eyebrow">Free talk topic</div><p>' + esc(h.topic) + '</p>');
  if ((h.words || []).length) lines.push('<div class="eyebrow">Words harvested</div><div class="chips" style="margin-bottom:14px">' +
    h.words.map(w => '<span class="chip static">' + esc(w) + '</span>').join('') + '</div>');
  if ((h.errors || []).length) lines.push('<div class="eyebrow">Errors</div><ul>' +
    h.errors.map(e => '<li>' + esc(e.text) + ' <span class="badge">' + esc(e.type) + '</span></li>').join('') + '</ul>');
  if (d.pron) lines.push('<div class="eyebrow">Pronunciation game</div><p>' + esc(d.pron.summary || 'played') + '</p>');
  if (d.stage4) lines.push('<div class="eyebrow">Quick round</div><p>' + esc(d.stage4.summary || d.stage4.kind || '') + '</p>');
  if (fb.text) lines.push('<div class="eyebrow">Feedback note</div><div class="feedback-out">' + esc(fb.text) + '</div>');
  lines.push('<div class="row" style="margin-top:16px"><button class="btn ghost" data-close>Close</button>' +
    (fb.text ? '<button class="btn sm" data-copy>Copy note</button><button class="btn sm ghost" data-dl>Download .txt</button>' : '') + '</div>');

  await modal(lines.join(''), (card, close) => {
    $('[data-close]', card).onclick = () => close(null);
    const c = $('[data-copy]', card);
    if (c) c.onclick = async () => { await copyText(fb.text); toast('Copied.'); };
    const dl = $('[data-dl]', card);
    if (dl) dl.onclick = () => downloadText(
      t.name.replace(/\s+/g, '-').toLowerCase() + '-' + (s.started_at || '').slice(0, 10) + '.txt', fb.text);
  });
}

/* =============================================================
   TRAINEE'S OWN VIEW — their history only
   ============================================================= */

async function viewMyHistory(body) {
  const trainees = await Store.listTrainees();
  const me = trainees[0];
  if (!me) {
    body.appendChild(el('<div class="notice info">Your account is not linked to a trainee record yet. Ask your trainer to send you their join code.</div>'));
    return;
  }
  const sessions = await Store.listSessions(me.id);
  body.appendChild(el('<div><h1>' + esc(me.name) + '</h1><p class="sub">' + esc(LEVEL_LABEL[me.level] || me.level) +
    ' · ' + sessions.length + ' session' + (sessions.length === 1 ? '' : 's') + '</p></div>'));

  if (!sessions.length) { body.appendChild(el('<div class="empty">Your first session has not happened yet.</div>')); return; }

  const list = el('<div class="list"></div>');
  sessions.forEach(s => {
    const fb = (s.data || {}).feedback || {};
    const item = el(
      '<div class="item"><div class="grow">' +
        '<div class="title">' + fmtDate(s.started_at) + '</div>' +
        '<div class="meta">' + esc(fb.win ? 'Win: ' + fb.win : 'No note recorded') + '</div>' +
      '</div><button class="btn ghost sm" data-v>Read note</button></div>'
    );
    $('[data-v]', item).onclick = () => sessionDialog(s, me);
    list.appendChild(item);
  });
  body.appendChild(list);
}

/* =============================================================
   ADMIN — every account, invite codes, full reach
   ============================================================= */

async function viewAdmin(body) {
  if (Store.me.role !== 'admin') { body.appendChild(el('<div class="notice err">Administrators only.</div>')); return; }
  const profiles = await Store.listProfiles();
  const invites = await Store.listInvites();
  const trainees = await Store.listTrainees();

  body.appendChild(el('<div><h1>People &amp; access</h1><p class="sub">Full control: every account, every trainee, every session.</p></div>'));

  const accounts = el('<div class="card"><h2>Accounts</h2><table><thead><tr>' +
    '<th>Name</th><th>Email</th><th>Role</th><th>Trainees</th><th></th></tr></thead><tbody></tbody></table></div>');
  const tbody = $('tbody', accounts);
  profiles.forEach(p => {
    const owned = trainees.filter(t => t.trainer_id === p.id).length;
    const tr = el('<tr>' +
      '<td>' + esc(p.name || '—') + '</td>' +
      '<td class="mono" style="font-size:12.5px">' + esc(p.email) + '</td>' +
      '<td><select data-role style="padding:5px 8px;font-size:13px">' +
        ['admin', 'trainer', 'trainee'].map(r => '<option value="' + r + '"' + (r === p.role ? ' selected' : '') + '>' + r + '</option>').join('') +
      '</select></td>' +
      '<td>' + (p.role === 'trainee' ? '—' : owned) + '</td>' +
      '<td style="text-align:right"><button class="btn ghost sm" data-del>Remove</button></td>' +
    '</tr>');
    $('[data-role]', tr).onchange = async e => {
      if (p.id === Store.me.id && e.target.value !== 'admin') {
        toast('You cannot remove your own administrator role.', 'err');
        e.target.value = 'admin'; return;
      }
      await Store.updateProfile(p.id, { role: e.target.value });
      toast('Role updated.'); render();
    };
    $('[data-del]', tr).onclick = async () => {
      if (p.id === Store.me.id) { toast('You cannot remove your own account.', 'err'); return; }
      if (await confirmBox('Remove ' + (p.name || p.email) + '?', 'Their login stops working. Trainees and sessions are kept.', true)) {
        await Store.deleteProfile(p.id); toast('Account removed.'); render();
      }
    };
    tbody.appendChild(tr);
  });
  body.appendChild(accounts);

  const inv = el('<div class="card"><h2>Invite codes</h2>' +
    '<p class="sub">One code creates one account. Trainee logins use the join code on the trainee card instead.</p>' +
    '<div class="row" style="margin-bottom:14px">' +
      '<button class="btn sm" data-inv-trainer>New trainer code</button>' +
      '<button class="btn sm ghost" data-inv-admin>New administrator code</button>' +
    '</div><div class="list" id="invlist"></div></div>');
  const ilist = $('#invlist', inv);
  if (!invites.length) ilist.appendChild(el('<div class="empty">No codes issued.</div>'));
  invites.forEach(i => {
    const row = el('<div class="item"><div class="grow">' +
      '<div class="title mono" style="letter-spacing:3px">' + esc(i.code) + '</div>' +
      '<div class="meta">' + esc(i.role) + (i.used_at ? ' · used ' + fmtDate(i.used_at) : ' · unused') + '</div>' +
      '</div><button class="btn ghost sm" data-c>Copy</button><button class="btn ghost sm" data-d>Delete</button></div>');
    $('[data-c]', row).onclick = async () => { await copyText(i.code); toast('Code copied.'); };
    $('[data-d]', row).onclick = async () => { await Store.deleteInvite(i.id); render(); };
    ilist.appendChild(row);
  });
  $('[data-inv-trainer]', inv).onclick = async () => { await Store.createInvite('trainer'); toast('Trainer code created.'); render(); };
  $('[data-inv-admin]', inv).onclick = async () => { await Store.createInvite('admin'); toast('Administrator code created.'); render(); };
  body.appendChild(inv);
}

/* =============================================================
   SETTINGS
   ============================================================= */

async function viewSettings(body) {
  body.appendChild(el('<div><h1>Settings</h1><p class="sub">Signed in as ' + esc(Store.me.email) + ' · storage: ' +
    (Store.mode === 'cloud' ? 'Supabase' : 'this browser only') + '</p></div>'));

  const pw = el('<div class="card"><h2>Change password</h2>' +
    '<div class="field"><label>New password</label><input id="s-pw" type="password" autocomplete="new-password"></div>' +
    '<button class="btn sm" data-save>Update password</button></div>');
  $('[data-save]', pw).onclick = async () => {
    try { await Store.changePassword($('#s-pw', pw).value); $('#s-pw', pw).value = ''; toast('Password updated.'); }
    catch (e) { toast(e.message, 'err'); }
  };
  body.appendChild(pw);

  const redeem = el('<div class="card"><h2>Redeem a code</h2>' +
    '<p class="sub">Only needed if your account was created before its invite or join code could be applied. ' +
    'Your current role is <b>' + esc(Store.me.role) + '</b>.</p>' +
    '<div class="field"><input id="s-code" class="mono" placeholder="e.g. START1" style="text-transform:uppercase"></div>' +
    '<button class="btn sm" data-save>Apply code</button></div>');
  $('[data-save]', redeem).onclick = async () => {
    try {
      await Store.claimCode($('#s-code', redeem).value);
      toast('Code applied — you are now ' + Store.me.role + '.');
      render();
    } catch (e) { toast(e.message, 'err'); }
  };
  body.appendChild(redeem);

  const name = el('<div class="card"><h2>Display name</h2>' +
    '<div class="field"><input id="s-name" value="' + esc(Store.me.name || '') + '"></div>' +
    '<button class="btn sm" data-save>Save</button></div>');
  $('[data-save]', name).onclick = async () => {
    await Store.updateProfile(Store.me.id, { name: $('#s-name', name).value.trim() });
    toast('Saved.'); render();
  };
  body.appendChild(name);

  if (Store.mode === 'local') {
    const backup = el('<div class="card"><h2>Backup</h2>' +
      '<p class="sub">Local mode keeps everything in this browser. Clearing site data wipes it, so export regularly.</p>' +
      '<div class="row"><button class="btn sm" data-exp>Export JSON</button>' +
      '<button class="btn sm ghost" data-imp>Import JSON</button>' +
      '<input type="file" accept="application/json" id="s-file" class="hidden"></div></div>');
    $('[data-exp]', backup).onclick = () =>
      downloadText('antoch-backup-' + new Date().toISOString().slice(0, 10) + '.json', Store.exportAll());
    $('[data-imp]', backup).onclick = () => $('#s-file', backup).click();
    $('#s-file', backup).onchange = async e => {
      const file = e.target.files[0];
      if (!file) return;
      if (!await confirmBox('Replace all local data?', 'Everything currently in this browser is overwritten by the file.', true)) return;
      try { Store.importAll(await file.text()); toast('Imported. Sign in again.'); await Store.signOut(); render(); }
      catch (err) { toast('That file could not be read.', 'err'); }
    };
    body.appendChild(backup);
  }
}
