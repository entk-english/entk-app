/* =============================================================
   app.js — authentication, shell, routing and every screen that
   is not the live session runner.
   ============================================================= */

import { APP_NAME, BUILD } from './config.js';
import { Store, makeJoinCode } from './store.js';
import { LEVELS, LEVEL_LABEL, TOPICS, forLevel } from './content.js';
import { esc, el, $, $$, toast, modal, confirmBox, copyText, downloadText, fmtDate, fmtDateTime } from './ui.js';
import { runSession } from './session.js';
import { openLink } from './live.js';

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
    else if (route === 'live') await viewLive(body);
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
    ? (liveSessionOpen ? [['live', '● Follow along'], ['history', 'My sessions']] : [['history', 'My sessions']])
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
  { id: 'picture', name: 'Picture Description', note: 'Random quirky image, 60–90 seconds of description.' },
  { id: 'connectors', name: 'Connector Chaining', note: 'Two ideas joined with so, but, although, in spite of — the cure for stump sentences.' },
  { id: 'prep', name: 'PREP Answer', note: 'Point, reason, example, point again. A shape for a real answer.' },
  { id: 'forbidden', name: 'The Forbidden Word', note: 'They describe it, you guess it, they never say it.' }
];

async function planDialog(t, sessions) {
  const topics = await Store.listTopics(t.id);
  const html =
    '<h2>Plan today\'s session</h2>' +
    '<p class="sub">' + esc(t.name) + ' · ' + esc(LEVEL_LABEL[t.level] || t.level) + '. Everything below can still be changed live.</p>' +
    '<div class="field"><label>Stage 4 — quick round</label><select id="p-stage4">' +
      OPTIONAL_DRILLS.map((d, i) => '<option value="' + d.id + '"' + (i === 0 ? ' selected' : '') + '>' +
        esc(d.name) + (i === 0 ? ' (default)' : '') + '</option>').join('') +
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

  /* A session with no end time is one the trainer is running right now.
     The trainee's screen follows it, so they are in the lesson rather
     than looking at last month's notes while it happens. */
  const liveHost = el('<div></div>');
  body.appendChild(liveHost);
  followLiveSession(liveHost, me);

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


/* ---------------- trainee's live session view ---------------- */

/* Set whenever a live session is seen, so the top bar can offer the
   Follow along tab only when there is something to follow. */
let liveSessionOpen = false;
let liveFrame = null;
let lastMarkSeq = 0;
let liveClock = null;
let liveLink = null;        // direct line to the trainer's device
let liveLinkId = null;      // which session that line belongs to
let liveTraineeId = null;   // whose folder recordings belong in

/* The trainee's game is the one being played, so it is the source of
   truth for the fight. Every snapshot it emits goes straight up the
   wire; the trainer's screen mirrors it rather than simulating a second
   copy of the same monster. */
function relayGameState(e) {
  const m = e.data;
  if (!m || m.source !== 'antoch-game') return;
  if (m.type === 'state') {
    if (liveLink) liveLink.send('gamestate', { s: m.s });
    return;
  }
  /* the swing itself, sent the instant it happens rather than waiting
     for the next snapshot — otherwise the trainer sees the health drop
     with no blow to explain it */
  if (m.type === 'fx') {
    if (liveLink) liveLink.send('gamefx', { fx: m.fx });
    return;
  }
  if (m.type === 'recording') sendRecording(m);
}
window.addEventListener('message', relayGameState);

/* The attempt itself, so the trainer can listen rather than guess.
   Cloud: into the private bucket, and only the path travels. Local mode
   is one browser, so the audio itself goes down the channel. */
async function sendRecording(m) {
  if (!liveLink || !m.blob) return;
  if (Store.mode === 'local') {
    liveLink.send('recording', { blob: m.blob, word: m.word, at: m.at });
    return;
  }
  if (liveTraineeId && liveLinkId) {
    try {
      const path = await Store.uploadRecording(liveTraineeId, liveLinkId, m.word, m.blob);
      if (path) { liveLink.send('recording', { path, word: m.word, at: m.at }); return; }
    } catch (e) { /* no bucket, or no permission — the wire will do */ }
  }
  await sendRecordingOverWire(m);
}

/* No storage bucket on this project, and creating one needs somebody in
   the Supabase dashboard. The audio goes down the same wire everything
   else uses instead: base64, in chunks, reassembled on the trainer's
   side. It does not outlive the lesson, which is the price of needing
   nothing set up. A few seconds of speech is 20-60 KB. */
const WIRE_CHUNK = 80000;      // comfortably inside a broadcast payload
const WIRE_MAX = 900000;       // ~40 seconds of webm; past that, refuse

async function sendRecordingOverWire(m) {
  try {
    const b64 = await blobToBase64(m.blob);
    if (b64.length > WIRE_MAX) {
      liveLink.send('recording-failed', { word: m.word, reason: 'that take is too long to send' });
      return;
    }
    const id = Math.random().toString(36).slice(2, 9);
    const total = Math.ceil(b64.length / WIRE_CHUNK);
    for (let i = 0; i < total; i++) {
      liveLink.send('recording-chunk', {
        id, i, total, word: m.word, at: m.at,
        type: m.blob.type || 'audio/webm',
        part: b64.slice(i * WIRE_CHUNK, (i + 1) * WIRE_CHUNK)
      });
      /* a breath between chunks: the channel is shared with marks and
         game state, and those matter more than a byte of audio */
      if (total > 1) await new Promise(r => setTimeout(r, 60));
    }
  } catch (e) {
    liveLink.send('recording-failed', { word: m.word, reason: e.message });
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result).split(',')[1] || '');
    fr.onerror = () => reject(new Error('could not read the recording'));
    fr.readAsDataURL(blob);
  });
}

/* The word form drill is typed here and marked there. The boxes live on
   this device, every keystroke goes up the wire, and Check and Reveal
   come back down as colours and answers on these same boxes. */
const WF_FIELDS = [
  ['noun', 'Noun'],
  ['verb', 'Infinitive'],
  ['past', 'Past'],
  ['adjective', 'Adjective / -ing']
];
let wfGrid = null;
let wfSendTimer = null;

/* The PREP steps, in the order they are answered. Kept here rather than
   imported so the trainee's page needs nothing from the trainer's
   content bank beyond what the trainer publishes. */
const PREP_FIELDS = [
  ['point', 'Point', 'one sentence'],
  ['reason', 'Reason', 'why'],
  ['example', 'Example', 'something that happened'],
  ['restate', 'Point again', 'different words']
];

function wireWordForm(grid) {
  wfGrid = grid;
  const send = () => {
    if (!liveLink) return;
    const answers = {};
    $$('input[data-f]', grid).forEach(i => { answers[i.dataset.f] = i.value; });
    liveLink.send('wfanswers', { answers });
  };
  $$('input[data-f]', grid).forEach(input => {
    input.addEventListener('input', () => {
      /* their marker should see the answer land, not every keystroke */
      clearTimeout(wfSendTimer);
      wfSendTimer = setTimeout(send, 250);
    });
  });
  send();
}

function paintWordFormCheck(msg) {
  if (!wfGrid || !document.body.contains(wfGrid)) return;
  const verdicts = msg.verdicts || {};
  const reveal = msg.reveal || null;
  WF_FIELDS.forEach(([k]) => {
    const cell = $('[data-k="' + k + '"]', wfGrid);
    if (!cell) return;
    const typed = $('input', cell).value.trim();
    const ok = !!verdicts[k];
    cell.className = 'formcell ' + (ok ? 'right' : (typed || reveal) ? 'wrong' : '');
    $('.ans', cell).textContent = reveal ? (reveal[k] || '') : (ok ? '✓' : typed ? '✗' : '');
  });
}

/* ---- the generic version, used by the newer drills ----
   Any stage whose trainee side is "some boxes they type into" wires its
   inputs through here: every keystroke goes up as `fields`, the trainer
   sends `fieldnext` to clear and `fieldflag` to mark one box for redoing. */
let fieldRoot = null;
let fieldTimer = null;

function wireFields(root) {
  fieldRoot = root;
  const send = () => {
    if (!liveLink) return;
    const answers = {};
    $$('[data-f]', root).forEach(i => { answers[i.dataset.f] = i.value; });
    liveLink.send('fields', { answers });
  };
  $$('[data-f]', root).forEach(input => {
    input.addEventListener('input', () => {
      clearTimeout(fieldTimer);
      fieldTimer = setTimeout(send, 250);
    });
  });
  send();
}

function flagField(msg) {
  if (!fieldRoot || !document.body.contains(fieldRoot)) return;
  const cell = $('[data-k="' + msg.key + '"]', fieldRoot);
  if (!cell) return;
  cell.className = 'formcell wrong';
  const note = $('.ans', cell);
  if (note) note.textContent = msg.note || 'again';
  const input = $('[data-f]', cell);
  if (input) input.focus();
}

function noteFields(msg) {
  if (!fieldRoot || !document.body.contains(fieldRoot)) return;
  const line = $('#field-note', fieldRoot);
  if (line) line.textContent = msg.note || '';
}

function clearFields() {
  if (!fieldRoot || !document.body.contains(fieldRoot)) return;
  $$('[data-f]', fieldRoot).forEach(i => { i.value = ''; });
  $$('.formcell', fieldRoot).forEach(c => { c.className = 'formcell'; });
  $$('.ans', fieldRoot).forEach(a => { a.textContent = ''; });
  const line = $('#field-note', fieldRoot);
  if (line) line.textContent = '';
}

function clearWordForm() {
  if (!wfGrid || !document.body.contains(wfGrid)) return;
  $$('input[data-f]', wfGrid).forEach(i => { i.value = ''; });
  $$('.formcell', wfGrid).forEach(c => { c.className = 'formcell'; });
  $$('.ans', wfGrid).forEach(a => { a.textContent = ''; });
}

/* Marks arrive here in well under a second; the 1.5s poll of the
   session record stays as the fallback for a channel that never came up. */
function openLiveLink(sessionId) {
  if (liveLinkId === sessionId && liveLink) return;
  if (liveLink) liveLink.close();
  liveLinkId = sessionId;
  liveLink = openLink(sessionId);
  liveLink.on(msg => {
    lastWireAt = Date.now();   // anything at all proves the channel is up
    if (msg.type === 'mark') {
      if (!msg.seq || msg.seq <= lastMarkSeq) return;
      lastMarkSeq = msg.seq;
      if (liveFrame && liveFrame.contentWindow) {
        liveFrame.contentWindow.postMessage(
          { source: 'antoch-host', type: 'mark', seq: msg.seq, verdict: msg.verdict }, '*');
      }
    }
    if (msg.type === 'restart' && liveFrame) liveFrame.src = liveFrame.src;
    if (msg.type === 'wfcheck') paintWordFormCheck(msg);
    if (msg.type === 'wfnext') clearWordForm();
    if (msg.type === 'fieldnext') clearFields();
    if (msg.type === 'fieldflag') flagField(msg);
    if (msg.type === 'fieldnote') noteFields(msg);
    /* The trainer's screen just changed. Repaint from what they sent
       rather than waiting for the next poll — the poll is now the slow
       safety net, not the thing that makes this feel live. */
    if (msg.type === 'display' && liveRow) {
      const was = liveRow.live || {};
      liveRow.live = {
        display: msg.display,
        stage_index: typeof msg.idx === 'number' ? msg.idx : was.stage_index,
        stage_list: Array.isArray(msg.stages) ? msg.stages : was.stage_list
      };
      lastWireAt = Date.now();
      if (livePaint) livePaint(liveRow);
    }
  });
}

/* The dedicated page: the trainee lands on whatever stage the trainer
   is on, and plays the game on their own device. */
async function viewLive(body) {
  const trainees = await Store.listTrainees();
  const me = trainees[0];
  if (!me) {
    body.appendChild(el('<div class="notice info">Your account is not linked to a trainee record yet.</div>'));
    return;
  }
  body.appendChild(el('<div><h1>Follow along</h1><p class="sub">You are on the same stage as your trainer. This page keeps itself up to date.</p></div>'));
  const host = el('<div></div>');
  body.appendChild(host);
  await followLiveSession(host, me);
}


let liveTimer = null;
let liveRow = null;      // the session row as last seen, patched by the wire
let livePaint = null;    // repaint from a row without touching the database
let lastWireAt = 0;      // when the wire last delivered anything
let lastPollAt = 0;      // when the database was last asked

const LIVE_STAGE_LABEL = {
  warmup: 'Warm-up',
  harvest: 'Free talk',
  pron: 'Pronunciation battle',
  stage4: 'Quick round',
  wordform: 'Word forms',
  expansion: 'Sentence expansion',
  picture: 'Picture description',
  connectors: 'Connector chaining',
  prep: 'PREP answer',
  forbidden: 'The forbidden word',
  feedback: 'Feedback'
};

function b64(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

async function followLiveSession(host, trainee) {
  clearInterval(liveTimer);

  let lastKey = '';

  const tick = async (row) => {
    if (!document.body.contains(host)) { clearInterval(liveTimer); return; }
    let live = row || null;
    if (!live) {
      try {
        /* one row, four columns, filtered in the database — not every
           session this trainee has ever had, blob and all */
        live = await Store.liveSession(trainee.id);
      } catch (e) { return; }
      liveRow = live;
    }

    if (!live) {
      const was = liveSessionOpen;
      liveSessionOpen = false;
      if (liveLink) { liveLink.close(); liveLink = null; liveLinkId = null; }
      if (lastKey !== 'none') {
        lastKey = 'none';
        host.innerHTML = '';
        host.appendChild(el('<div class="notice info">No session running right now. When your trainer starts one, it appears here automatically.</div>'));
      }
      if (was && location.hash.indexOf('live') >= 0) render();
      return;
    }
    const firstSighting = !liveSessionOpen;
    liveSessionOpen = true;
    liveTraineeId = trainee.id;
    openLiveLink(live.id);
    if (firstSighting && location.hash.indexOf('live') < 0) render();

    /* Everything this page needs is in the live column: which stage, and
       what the trainer published for it. The full record is never read
       here. Sessions from before the live column fall back to it. */
    const d = (live.live && live.live.display) ? live.live : (live.data || {});
    const stages = Array.isArray(d.stage_list) && d.stage_list.length
      ? d.stage_list
      : ['warmup', 'harvest', 'pron', 'stage4', 'feedback'];
    const idx = Math.min(Math.max(0, d.stage_index || 0), stages.length - 1);
    const stage = stages[idx];
    /* The word list the trainer published is the authority. Reading only
       the harvest meant that a session where nothing was harvested — so
       the trainer's screen fell back to a level list — left the trainee
       with an empty list and therefore no game at all. */
    const published = d.display && d.display.kind === 'pron' && Array.isArray(d.display.words)
      ? d.display.words : null;
    const words = (published && published.length ? published : (d.harvest && d.harvest.words)) || [];

    /* Relay the trainer's verdict into the running game before any
       redraw decision, so a hit is never lost to a rebuild. */
    const control = d.control;
    if (control && control.seq && control.seq > lastMarkSeq && liveFrame && liveFrame.contentWindow) {
      lastMarkSeq = control.seq;
      liveFrame.contentWindow.postMessage(
        { source: 'antoch-host', type: 'mark', seq: control.seq, verdict: control.verdict }, '*');
    }

    /* only rebuild when something actually changed, so an embedded
       game is not torn down and restarted every few seconds */
    /* The timestamp on the published payload changes on every save, and
       rebuilding this page throws away whatever the trainee is halfway
       through typing. Only the content counts towards the rebuild. */
    const dspKey = JSON.stringify(Object.assign({}, d.display || {}, { at: 0 }));
    const key = stage + '|' + idx + '|' + words.join(',') + '|' + dspKey;
    if (key !== lastKey) { liveFrame = null; }
    if (key === lastKey) return;
    lastKey = key;

    host.innerHTML = '';
    const dsp = d.display || {};

    host.appendChild(el(
      '<div class="card tight"><div class="row between">' +
        '<div><div class="eyebrow" style="color:var(--accent)">● Live · stage ' + (idx + 1) + ' of ' + stages.length + '</div>' +
        '<h2 style="margin:3px 0 0">' + esc(LIVE_STAGE_LABEL[stage] || stage) + '</h2></div>' +
      '</div></div>'
    ));

    /* --- warm-up: the prompt, big enough to answer from --- */
    if (stage === 'warmup') {
      host.appendChild(el('<div class="prompt-box">' + esc(dsp.prompt || 'Your trainer is choosing a question…') + '</div>'));
      if (dsp.format) host.appendChild(el('<p class="sub" style="text-align:center;margin-top:12px">' + esc(dsp.format) + '</p>'));
    }

    /* --- free talk: the topic, and their own sixty seconds --- */
    else if (stage === 'harvest') {
      host.appendChild(el('<div class="prompt-box">' + esc(dsp.topic || d.harvest && d.harvest.topic || 'Waiting for your topic…') + '</div>'));
      host.appendChild(el('<p class="sub" style="text-align:center;margin-top:14px">Talk for one minute without stopping. Do not worry about mistakes.</p>'));
      if (dsp.running && dsp.startedAt) {
        const total = dsp.length || 60;
        const clock = el('<div class="timer" style="text-align:center;font-size:56px;margin-top:10px">--:--</div>');
        host.appendChild(clock);
        clearInterval(liveClock);
        const paintClock = () => {
          const left = Math.max(0, total - Math.round((Date.now() - dsp.startedAt) / 1000));
          clock.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
          clock.className = 'timer' + (left <= 10 ? ' warn' : '');
          if (left <= 0) clearInterval(liveClock);
        };
        paintClock();
        liveClock = setInterval(paintClock, 500);
      }
    }

    /* --- pronunciation: this is their game, not a status card ---
       They fight the boss, their microphone records the attempt and
       plays it back to them. The trainer only watches a mirror of it
       and calls the verdict. */
    else if (stage === 'pron') {
      if (!words.length) {
        host.appendChild(el('<div class="empty">Your trainer is picking the words…</div>'));
      } else {
        host.appendChild(el('<p class="sub">Tap the microphone and say the word. ' +
          'Press <b>▶ My recording</b> to hear yourself back. Your trainer calls the hit.</p>'));
        const frame = el('<iframe class="gameframe" allow="microphone" src="games/pronunciation.html#r=' +
          encodeURIComponent(b64({ w: words.slice(0, 20), v: [] })) + '"></iframe>');
        host.appendChild(frame);
        liveFrame = frame;
      }
    }

    /* --- word forms: their four boxes, typed on their own device --- */
    else if (stage === 'wordform' || (stage === 'stage4' && dsp.kind === 'wordform')) {
      host.appendChild(el('<div class="prompt-box">' + esc((dsp.base || '…').toUpperCase()) + '</div>'));
      const grid = el('<div class="formgrid" style="margin-top:18px">' +
        WF_FIELDS.map(([k, label]) =>
          '<div class="formcell" data-k="' + k + '">' +
          '<label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-weight:700">' +
          label + '</label><input data-f="' + k + '" autocomplete="off" autocapitalize="off" spellcheck="false">' +
          '<div class="ans"></div></div>').join('') + '</div>');
      host.appendChild(grid);
      host.appendChild(el('<p class="sub" style="text-align:center;margin-top:12px">' +
        'Type all four forms. Your trainer marks them from their screen.</p>'));
      wireWordForm(grid);
    }

    /* --- connectors: one box, and the words they must join with --- */
    else if (stage === 'connectors' || (stage === 'stage4' && dsp.kind === 'connectors')) {
      host.appendChild(el('<div class="prompt-box">' + esc(dsp.prompt || 'Waiting for your situation…') + '</div>'));
      const need = dsp.required || [];
      if (need.length) {
        host.appendChild(el('<p class="sub" style="text-align:center;margin:14px 0 6px">Join your ideas using at least one of these</p>'));
        host.appendChild(el('<div class="chips" style="justify-content:center">' +
          need.map(c => '<span class="chip gold static">' + esc(c) + '</span>').join('') + '</div>'));
      }
      const box = el('<div style="margin-top:16px">' +
        '<div class="formcell" data-k="text">' +
        '<textarea data-f="text" rows="4" placeholder="Two ideas or more, in one linked sentence…"></textarea>' +
        '<div class="ans"></div></div>' +
        '<p class="sub" id="field-note" style="text-align:center;margin-top:10px"></p></div>');
      host.appendChild(box);
      wireFields(box);
    }

    /* --- PREP: the four steps of the answer, in order --- */
    else if (stage === 'prep' || (stage === 'stage4' && dsp.kind === 'prep')) {
      host.appendChild(el('<div class="prompt-box">' + esc(dsp.question || 'Waiting for your question…') + '</div>'));
      const grid = el('<div style="margin-top:18px">' +
        PREP_FIELDS.map(([k, label, hint]) =>
          '<div class="formcell" data-k="' + k + '" style="margin-bottom:10px">' +
          '<label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-weight:700">' +
          label + ' — ' + hint + '</label>' +
          '<input data-f="' + k + '" autocomplete="off">' +
          '<div class="ans"></div></div>').join('') +
        '<p class="sub" id="field-note" style="text-align:center"></p></div>');
      host.appendChild(grid);
      wireFields(grid);
    }

    /* --- forbidden word: their word, and what they may not say --- */
    else if (stage === 'forbidden' || (stage === 'stage4' && dsp.kind === 'forbidden')) {
      host.appendChild(el('<p class="sub" style="text-align:center">Describe this until your trainer guesses it. ' +
        'Never say the word itself.</p>'));
      host.appendChild(el('<div class="prompt-box">' + esc(dsp.word || '…') + '</div>'));
      const banned = dsp.banned || [];
      if (banned.length) {
        host.appendChild(el('<p class="sub" style="text-align:center;margin:14px 0 6px">These are banned too</p>'));
        host.appendChild(el('<div class="chips" style="justify-content:center">' +
          banned.map(b => '<span class="chip static" style="background:var(--danger-wash);border-color:var(--danger-edge);color:var(--danger)">' +
            esc(b) + '</span>').join('') + '</div>'));
      }
    }

    /* --- expansion: the sentence growing as they add to it --- */
    else if (stage === 'expansion' || (stage === 'stage4' && dsp.kind === 'expansion')) {
      host.appendChild(el('<div class="prompt-box">' + esc(dsp.base || '…') + '</div>'));
      const steps = dsp.steps || {};
      host.appendChild(el('<div class="list" style="margin-top:16px">' +
        ['What', 'When', 'Where', 'Why'].map(k =>
          '<div class="item"><span class="badge ' + (steps[k] ? 'level' : '') + '">' + k + '</span>' +
          '<div class="grow">' + esc(steps[k] || 'add this next') + '</div></div>').join('') + '</div>'));
    }

    /* --- picture: the image, large --- */
    else if (stage === 'picture' || (stage === 'stage4' && dsp.kind === 'picture')) {
      if (dsp.url) host.appendChild(el('<img class="picture-frame" src="' + esc(dsp.url) + '" alt="">'));
      else host.appendChild(el('<div class="empty">Your trainer is choosing a picture…</div>'));
      host.appendChild(el('<p class="sub" style="text-align:center;margin-top:12px">Describe what you can see for about a minute.</p>'));
    }

    /* --- feedback: today's note --- */
    else if (stage === 'feedback') {
      const text = (dsp.text) || (d.feedback && d.feedback.text) || '';
      host.appendChild(text
        ? el('<div class="card"><h2>Today&#39;s note</h2><div class="feedback-out">' + esc(text) + '</div></div>')
        : el('<div class="empty">Your trainer is writing your note…</div>'));
    }

    else {
      host.appendChild(el('<div class="empty">Listen to your trainer for this part.</div>'));
    }
  };

  /* The wire carries every change the moment it happens, so this poll
     exists for the trainee who reloads, joins late, or whose channel
     never came up. Three seconds of that is plenty, and it is a third
     of the database traffic a full room used to generate. */
  livePaint = (row) => tick(row);
  await tick();
  lastPollAt = Date.now();
  liveTimer = setInterval(() => {
    if (document.hidden) return;               // a backgrounded phone polls nothing
    const wireAlive = liveRow && Date.now() - lastWireAt < 20000;
    /* While the wire is delivering, this is only a safety net: one
       query a minute. When it goes quiet — a dropped channel, a trainee
       who just reloaded — it comes back to every three seconds. Fifty
       trainees on a live channel cost the database one query a second
       between them, instead of seventeen. */
    if (wireAlive && Date.now() - lastPollAt < 60000) return;
    lastPollAt = Date.now();
    tick();
  }, 3000);
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
