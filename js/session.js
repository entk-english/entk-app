/* =============================================================
   session.js — the live session runner.

   The trainer advances every stage by hand. The timer is there to
   be glanced at, never to interrupt: it counts up, turns amber at
   the suggested length and red well past it, but nothing on screen
   moves on its own.
   ============================================================= */

import { Store } from './store.js';
import { openLink } from './live.js';
import { UNSPLASH_ACCESS_KEY } from './config.js';
import {
  WARMUP_FORMATS, WARMUPS, TOPICS, PRON_FALLBACK,
  WORD_FORMS, EXPANSIONS, EXPANSION_STEPS, PICTURE_QUERIES, PICTURE_PROMPTS,
  CONNECTORS, CONNECTOR_PROMPTS, PREP_STEPS, PREP_QUESTIONS, FORBIDDEN_WORDS,
  FILLERS, ERROR_TYPES, LEVEL_LABEL, forLevel, pickOne
} from './content.js';
import { esc, el, $, $$, toast, modal, confirmBox, copyText, downloadText, fmtDate, mmss } from './ui.js';

const DRILL_NAMES = {
  wordform: 'Word Form Drill',
  expansion: 'Sentence Expansion',
  picture: 'Picture Description',
  connectors: 'Connector Chaining',
  prep: 'PREP Answer',
  forbidden: 'The Forbidden Word'
};

let S = null;          // live session state
let tick = null;       // timer interval
let link = null;       // direct line to the trainee's device

export async function runSession(root, sessionId, backToApp) {
  const sessions = await Store.listSessions();
  const record = sessions.find(x => x.id === sessionId);
  if (!record) { root.innerHTML = '<div class="page"><div class="notice err">Session not found.</div></div>'; return; }
  const trainee = await Store.getTrainee(record.trainee_id);
  const history = sessions.filter(s => s.trainee_id === record.trainee_id && s.id !== sessionId && s.ended_at);

  const plan = record.plan || {};
  /* Picture Description is a stage in its own right, not something
     buried in a dropdown: it belongs on the bar next to Warm-up and
     Pronunciation Boxing, where the trainer can see it coming. */
  const planned = ['warmup', 'harvest', 'pron', 'stage4']
    .concat((plan.extras || []).filter(x => x !== plan.stage4))
    .concat(plan.stage4 === 'picture' || (plan.extras || []).includes('picture') ? [] : ['picture'])
    .concat(['feedback']);
  /* A drill added mid-session is remembered, so reopening the
     session does not silently drop it. */
  const saved = (record.data || {}).stage_list;
  const stages = Array.isArray(saved) && saved.length ? withPicture(saved) : planned;

  /* Sessions planned before it became a standing stage still get it,
     rather than the trainer wondering where it went. */
  function withPicture(list) {
    if (list.includes('picture') || list.includes('stage4') && plan.stage4 === 'picture') return list;
    const at = list.indexOf('feedback');
    const out = list.slice();
    out.splice(at < 0 ? out.length : at, 0, 'picture');
    return out;
  }

  S = {
    root, record, trainee, history, plan, stages, backToApp,
    idx: 0,
    startedAt: Date.now(),
    stageStart: Date.now(),
    data: Object.assign({
      warmup: null,
      harvest: { topic: plan.topic || '', words: [], errors: [], fillers: {}, seconds: 0 },
      pron: null,
      stage4: null,
      extras: {},
      feedback: { win: '', focus: '', text: '' }
    }, record.data || {})
  };

  /* Reopening an unfinished session returns the trainer to the
     stage they left, not back to the warm-up. */
  S.idx = Math.min(Math.max(0, S.data.stage_index || 0), stages.length - 1);
  S.data.stage_list = stages;
  S.data.targets = S.data.targets || {};   // the trainer's own minutes per stage

  /* Re-entering a session must not stack a second listener or leave
     the previous stage clock running. */
  cleanup();
  window.addEventListener('message', onGameMessage);
  link = openLink(record.id);
  link.on(msg => {
    if (!S) return;
    if (msg.type === 'gamestate' && S.monitor && S.monitor.contentWindow) {
      S.monitor.contentWindow.postMessage({ source: 'antoch-host', type: 'sync', s: msg.s }, '*');
    }
    if (msg.type === 'gamefx' && S.monitor && S.monitor.contentWindow) {
      S.monitor.contentWindow.postMessage({ source: 'antoch-host', type: 'fx', fx: msg.fx }, '*');
    }
    /* Whatever stage is on screen may want the rest; it registers a
       handler in S.onLink and drops it when it leaves. */
    if (S.onLink) { try { S.onLink(msg); } catch (e) { /* never let a stage break the wire */ } }
  });
  draw();
}

const STAGE_META = {
  warmup: { title: 'Warm-up', target: 150, blurb: 'Casual. Nothing is scored and nothing is corrected.' },
  harvest: { title: 'Free Talk / Error Harvest', target: 270, blurb: 'Sixty seconds of unbroken speech, then you log what you heard.' },
  pron: { title: 'Pronunciation Boxing', target: 600, blurb: 'The words harvested a minute ago are now the boss fight.' },
  stage4: { title: 'Quick Round', target: 150, blurb: 'Short and sharp. Do not let this become a long drill.' },
  wordform: { title: 'Word Form Drill', target: 180, blurb: 'Noun, infinitive, past, adjective.' },
  expansion: { title: 'Sentence Expansion', target: 180, blurb: 'What, when, where, why — one at a time.' },
  picture: { title: 'Picture Description', target: 120, blurb: '60 to 90 seconds of description, then follow-ups.' },
  connectors: { title: 'Connector Chaining', target: 180, blurb: 'Two ideas, one sentence. The connector states the relationship.' },
  prep: { title: 'PREP Answer', target: 180, blurb: 'Point, reason, example, point again. A shape to put the words in.' },
  forbidden: { title: 'The Forbidden Word', target: 150, blurb: 'They describe it, you guess it. They never say it.' },
  feedback: { title: 'Feedback Note', target: 90, blurb: 'Read it out, then send it to the trainee.' }
};

/* Sessions planned before the sentence game was removed still carry
   stage4:'sentence', so it maps onto the word form drill instead. */
function quickRoundKind() {
  const kind = S.plan.stage4;
  return (!kind || kind === 'sentence') ? 'wordform' : kind;
}

function meta(stage) {
  let out;
  if (stage === 'stage4') {
    const kind = quickRoundKind();
    out = Object.assign({}, STAGE_META[kind], { title: DRILL_NAMES[kind] });
  } else {
    out = Object.assign({}, STAGE_META[stage] || { title: stage, target: 120, blurb: '' });
  }
  /* The suggested length is a default, not a rule. A trainer who wants
     to give this one more room sets their own, and it is remembered
     with the session. */
  const own = S && S.data && S.data.targets && S.data.targets[stage];
  if (own) out.target = own;
  return out;
}

function fmtTarget(seconds) {
  const m = seconds / 60;
  return (m < 1 ? Math.round(seconds) + ' sec' : (Math.round(m * 10) / 10) + ' min');
}

/* ---------------- shell ---------------- */

function draw() {
  S.onLeave = null;
  S.onLink = null;
  S.monitor = null;
  const stage = S.stages[S.idx];
  const m = meta(stage);
  const shell = el('<div class="session-shell"></div>');

  const bar = el(
    '<div class="stagebar">' +
      '<div class="steps">' + S.stages.map((s, i) =>
        '<span class="step ' + (i < S.idx ? 'done' : i === S.idx ? 'now' : '') + '">' +
        (i + 1) + '. ' + esc(meta(s).title) + '</span>').join('') + '</div>' +
      '<div><div class="timer" id="clock">00:00</div>' +
        '<button class="timer-target" data-settarget title="Set your own length for this stage">' +
        'suggested ' + fmtTarget(m.target) + ' · edit</button></div>' +
      '<button class="btn ghost sm" data-adddrill title="Insert a drill after this stage">+ Drill</button>' +
      '<button class="themeBtn" data-theme-toggle title="Switch theme">☀</button>' +
      '<button class="btn ghost sm" data-back>Back</button>' +
      '<button class="btn" data-next>' + (S.idx === S.stages.length - 1 ? 'Finish' : 'Next stage') + '</button>' +
      '<button class="btn ghost sm" data-exit>Exit</button>' +
    '</div>'
  );
  shell.appendChild(bar);

  const page = el('<div class="page wide"></div>');
  page.appendChild(el(
    '<div class="stage-head"><div>' +
      '<div class="eyebrow">' + esc(S.trainee.name) + ' · ' + esc(LEVEL_LABEL[S.trainee.level] || S.trainee.level) + '</div>' +
      '<h1>' + esc(m.title) + '</h1>' +
      '<p class="sub" style="margin:0">' + esc(m.blurb) + '</p>' +
    '</div></div>'
  ));
  shell.appendChild(page);

  S.root.innerHTML = '';
  S.root.appendChild(shell);

  const themeBtn = $('[data-theme-toggle]', bar);
  const paintThemeBtn = () => {
    themeBtn.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '☾';
  };
  paintThemeBtn();
  themeBtn.onclick = () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('ast:theme', next); } catch (e) {}
    paintThemeBtn();
  };

  /* Drills are chosen when the session is planned, but a trainer
     often only sees the need for one once the lesson is running. */
  $('[data-adddrill]', bar).onclick = async () => {
    const options = [
      ['picture', 'Picture Description'],
      ['wordform', 'Word Form Drill'],
      ['expansion', 'Sentence Expansion'],
      ['connectors', 'Connector Chaining'],
      ['prep', 'PREP Answer'],
      ['forbidden', 'The Forbidden Word']
    ];
    const chosen = await modal(
      '<h2>Add a drill</h2><p class="sub">It slots in straight after the stage you are on.</p>' +
      '<div class="chips">' + options.map(([id, label]) =>
        '<span class="chip gold" data-pick="' + id + '">' + esc(label) + '</span>').join('') + '</div>' +
      '<div class="row" style="margin-top:18px"><button class="btn ghost" data-cancel>Cancel</button></div>',
      (card, close) => {
        $$('[data-pick]', card).forEach(c => c.onclick = () => close(c.dataset.pick));
        $('[data-cancel]', card).onclick = () => close(null);
      }
    );
    if (!chosen) return;
    S.stages.splice(S.idx + 1, 0, chosen);
    S.data.stage_list = S.stages;
    await persist();
    draw();
    toast('Added — it is the next stage.');
  };

  /* Any stage can be given a different length, this session only. */
  $('[data-settarget]', bar).onclick = async () => {
    const mins = await modal(
      '<h2>How long for ' + esc(m.title) + '?</h2>' +
      '<p class="sub">Only the suggestion changes colour — the clock never interrupts you.</p>' +
      '<div class="chips" style="margin-bottom:16px">' +
        [1, 2, 3, 5, 8, 10, 15].map(n => '<span class="chip gold" data-min="' + n + '">' + n + ' min</span>').join('') +
      '</div>' +
      '<div class="field"><label>Or type it, in minutes</label>' +
      '<input id="t-min" type="number" min="1" max="90" step="1" value="' + Math.round(m.target / 60) + '"></div>' +
      '<div class="row"><button class="btn ghost" data-cancel>Cancel</button>' +
      '<button class="btn" data-ok>Set</button>' +
      '<button class="btn ghost" data-reset>Back to default</button></div>',
      (card, close) => {
        $$('[data-min]', card).forEach(c => c.onclick = () => close(Number(c.dataset.min)));
        $('[data-ok]', card).onclick = () => close(Number($('#t-min', card).value));
        $('[data-reset]', card).onclick = () => close('default');
        $('[data-cancel]', card).onclick = () => close(null);
      }
    );
    if (mins === null) return;
    if (mins === 'default') delete S.data.targets[stage];
    else if (mins > 0) S.data.targets[stage] = Math.round(mins * 60);
    else return;
    await persist();
    draw();
    toast(mins === 'default' ? 'Back to the suggested length.' : 'This stage now runs to ' + mins + ' min.');
  };

  $('[data-next]', bar).onclick = () => advance(1);
  $('[data-back]', bar).onclick = () => advance(-1);
  $('[data-exit]', bar).onclick = async () => {
    if (await confirmBox('Leave this session?', 'Everything entered so far is already saved. You can reopen it from the trainee page.', false)) {
      await persist();
      cleanup();
      location.hash = '#/trainee/' + S.trainee.id;
      S.backToApp();
    }
  };

  const stageBody = el('<div></div>');
  page.appendChild(stageBody);
  ({
    warmup: stageWarmup,
    harvest: stageHarvest,
    pron: stagePron,
    stage4: stageQuickRound,
    wordform: stageWordForm,
    expansion: stageExpansion,
    picture: stagePicture,
    connectors: stageConnectors,
    prep: stagePrep,
    forbidden: stageForbidden,
    feedback: stageFeedback
  }[stage] || (b => b.appendChild(el('<div class="empty">Unknown stage.</div>'))))(stageBody);

  startClock(m.target);
}

function startClock(target) {
  clearInterval(tick);
  S.stageStart = Date.now();
  const node = $('#clock');
  const paint = () => {
    if (!document.body.contains(node)) { clearInterval(tick); return; }
    const s = Math.floor((Date.now() - S.stageStart) / 1000);
    node.textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    node.className = 'timer' + (s > target * 1.5 ? ' warn' : s > target ? ' over' : '');
  };
  paint();
  tick = setInterval(paint, 500);
}

async function advance(direction) {
  const next = S.idx + direction;
  if (next < 0) return;
  if (S.onLeave) { try { S.onLeave(); } catch (e) { /* a stage hook must never block the session */ } S.onLeave = null; }
  if (next >= S.stages.length) { await finish(); return; }
  S.idx = next;
  await persist();
  draw();
}

/* What the trainee should be looking at right now. The trainer's own
   screen holds inputs and controls; this is the part that is theirs. */
let publishTimer = null;
function publish(display) {
  S.data.display = Object.assign({ at: Date.now() }, display);
  clearTimeout(publishTimer);
  publishTimer = setTimeout(() => { persist(); }, 350);
}

async function persist() {
  S.data.stage_index = S.idx;
  try { await Store.updateSession(S.record.id, { data: S.data }); }
  catch (e) { toast('Could not save: ' + e.message, 'err'); }
}

async function finish() {
  S.data.feedback.text = buildNote();
  await Store.updateSession(S.record.id, { data: S.data, ended_at: new Date().toISOString() });
  cleanup();
  toast('Session saved.');
  location.hash = '#/trainee/' + S.trainee.id;
  S.backToApp();
}

function cleanup() {
  clearInterval(tick);
  window.removeEventListener('message', onGameMessage);
  if (link) { link.close(); link = null; }
}

/* =============================================================
   STAGE 1 — WARM-UP
   ============================================================= */

/* Prompts the trainer writes themselves, kept per trainee so one
   learner's running jokes do not surface in somebody else's warm-up.
   Held on this device: they survive reloads but do not sync across
   machines, which is a fair trade for needing no schema change. */
function ownKey(format) { return 'ast:prompts:' + S.trainee.id + ':' + format; }

function ownPrompts(format) {
  try { return JSON.parse(localStorage.getItem(ownKey(format))) || []; }
  catch (e) { return []; }
}

function saveOwnPrompts(format, list) {
  try { localStorage.setItem(ownKey(format), JSON.stringify(list)); } catch (e) {}
}

function stageWarmup(body) {
  const rotation = WARMUP_FORMATS[(S.plan.warmupIndex || 0) % WARMUP_FORMATS.length];
  let format = (S.data.warmup && S.data.warmup.id) || rotation.id;
  const level = S.trainee.level;

  const card = el('<div class="card"></div>');
  body.appendChild(card);

  function drawFormat() {
    const def = WARMUP_FORMATS.find(f => f.id === format);
    const mine = ownPrompts(format);
    const bank = forLevel(WARMUPS[format], level).concat(mine);
    S.data.warmup = { id: format, format: def.name };

    const shown = pickOne(bank) || '';
    let promptHTML;
    if (format === 'chain') {
      promptHTML = 'Start the chain with: <b style="color:var(--accent)">' + esc(shown) + '</b>';
    } else {
      promptHTML = esc(shown);
    }

    card.innerHTML =
      '<div class="chips" style="margin-bottom:18px">' +
        WARMUP_FORMATS.map(f => '<span class="chip' + (f.id === format ? ' on' : '') + '" data-f="' + f.id + '">' + esc(f.name) + '</span>').join('') +
      '</div>' +
      '<div class="prompt-box" id="wprompt">' + promptHTML + '</div>' +
      '<p class="sub" style="margin:14px 0 0">' + esc(def.hint) + '</p>' +
      '<div class="row" style="margin-top:14px"><button class="btn sm" data-again>Next prompt</button>' +
      '<span class="badge">' + bank.length + ' in the pool</span>' +
      '<span class="badge">rotation suggests: ' + esc(rotation.name) + '</span></div>' +
      '<div class="field" style="margin-top:16px"><label>Add your own — it joins this trainee&#39;s rotation</label>' +
        '<div class="row"><input id="own-in" placeholder="Type a prompt and press Enter" style="flex:1;min-width:220px">' +
        '<button class="btn sm" data-addown>Add</button></div></div>' +
      (mine.length
        ? '<div class="chips">' + mine.map((p, i) =>
            '<span class="chip gold">' + esc(p) +
            ' <button data-delown="' + i + '" title="remove" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 5px">×</button></span>'
          ).join('') + '</div>'
        : '');

    publish({ kind: 'warmup', format: def.name, hint: def.hint, prompt: shown });

    $$('[data-f]', card).forEach(c => c.onclick = () => { format = c.dataset.f; drawFormat(); });
    $('[data-again]', card).onclick = drawFormat;

    const addOwn = () => {
      const box = $('#own-in', card);
      const text = box.value.trim();
      if (!text) return;
      saveOwnPrompts(format, ownPrompts(format).concat([text]));
      box.value = '';
      drawFormat();
      toast('Added — it is in the rotation now.');
    };
    $('[data-addown]', card).onclick = addOwn;
    $('#own-in', card).addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addOwn(); }
    });
    $$('[data-delown]', card).forEach(b => b.onclick = () => {
      const list = ownPrompts(format);
      list.splice(+b.dataset.delown, 1);
      saveOwnPrompts(format, list);
      drawFormat();
    });
  }

  drawFormat();
}

/* =============================================================
   STAGE 2 — FREE TALK / ERROR HARVEST
   ============================================================= */

function stageHarvest(body) {
  const h = S.data.harvest;
  const level = S.trainee.level;
  const bank = forLevel(TOPICS, level);

  const card = el(
    '<div class="card">' +
      '<div class="field"><label>Topic for the 60 seconds</label>' +
        '<input id="h-topic" placeholder="Type any topic, or tap one below" value="' + esc(h.topic) + '"></div>' +
      '<div class="eyebrow">Anchor — everyday</div><div class="chips" id="h-anchor" style="margin-bottom:12px"></div>' +
      '<div class="eyebrow">Stretch — unusual, forces new language</div><div class="chips" id="h-stretch"></div>' +
      '<div class="row" style="margin-top:20px;align-items:center">' +
        '<select id="h-len" style="width:112px">' +
          [30,60,90,120,180,300,600].map(sec =>
            '<option value="' + sec + '"' + (sec === (h.length || 60) ? ' selected' : '') + '>' +
            (sec < 60 ? sec + ' sec' : (sec/60) + ' min') + '</option>').join('') +
        '</select>' +
        '<button class="btn gold" id="h-start">Start</button>' +
        '<div class="timer" id="h-clock" style="font-size:34px">--:--</div>' +
        '<span class="sub" style="margin:0">Trainee talks without stopping. Do not interrupt.</span>' +
      '</div>' +
    '</div>'
  );
  body.appendChild(card);

  (bank.anchor || []).forEach(t => {
    const chip = el('<span class="chip">' + esc(t) + '</span>');
    chip.onclick = () => { $('#h-topic', card).value = t; h.topic = t; };
    $('#h-anchor', card).appendChild(chip);
  });
  (bank.stretch || []).forEach(t => {
    const chip = el('<span class="chip gold">' + esc(t) + '</span>');
    chip.onclick = () => { $('#h-topic', card).value = t; h.topic = t; };
    $('#h-stretch', card).appendChild(chip);
  });
  $('#h-topic', card).addEventListener('input', e => {
    h.topic = e.target.value;
    publish({ kind: 'harvest', topic: h.topic, running: false });
  });
  publish({ kind: 'harvest', topic: h.topic, running: false });

  /* 60 second speaking countdown, entirely separate from the stage clock */
  let talkTimer = null;
  $('#h-len', card).addEventListener('change', e => { h.length = +e.target.value; });
  $('#h-start', card).onclick = () => {
    h.length = +$('#h-len', card).value || 60;
    publish({ kind: 'harvest', topic: h.topic, running: true, startedAt: Date.now(), length: h.length });
    clearInterval(talkTimer);
    const clock = $('#h-clock', card);
    let left = h.length;
    const paint = () => {
      const mm = Math.floor(Math.max(0, left) / 60), ss = Math.max(0, left) % 60;
      clock.textContent = String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
      clock.className = 'timer' + (left <= 10 ? ' warn' : '');
      if (left <= 0) { clearInterval(talkTimer); h.seconds = h.length; toast('Time up — now harvest what you heard.', 'info'); }
      left--;
    };
    paint();
    talkTimer = setInterval(paint, 1000);
  };

  /* --- filler tally --- */
  const fillerCard = el('<div class="card"><h2>Filler tally</h2>' +
    '<p class="sub">Tap while they speak. The total is compared against their rolling average in the feedback note.</p>' +
    '<div class="counter-grid" id="fg"></div>' +
    '<div class="row" style="margin-top:12px"><button class="btn ghost sm" data-reset>Reset tally</button>' +
    '<span class="badge" id="ftotal"></span></div></div>');
  body.appendChild(fillerCard);

  const total = () => Object.values(h.fillers).reduce((a, b) => a + (b || 0), 0);
  function paintFillers() {
    const grid = $('#fg', fillerCard);
    grid.innerHTML = '';
    FILLERS.forEach(f => {
      const box = el('<div class="counter"><div class="n">' + (h.fillers[f] || 0) + '</div><div class="w">' + esc(f) + '</div></div>');
      box.onclick = () => { h.fillers[f] = (h.fillers[f] || 0) + 1; paintFillers(); };
      box.oncontextmenu = e => { e.preventDefault(); h.fillers[f] = Math.max(0, (h.fillers[f] || 0) - 1); paintFillers(); };
      grid.appendChild(box);
    });
    $('#ftotal', fillerCard).textContent = total() + ' total · right-click to subtract';
  }
  paintFillers();
  $('[data-reset]', fillerCard).onclick = () => { h.fillers = {}; paintFillers(); };

  /* --- harvested words --- */
  const wordCard = el('<div class="card"><h2>Words they struggled with</h2>' +
    '<p class="sub">Anything mispronounced, hesitated over, or avoided. These become the boss fight in the next stage.</p>' +
    '<div class="row"><input id="w-in" placeholder="Type a word and press Enter — or paste several separated by commas" style="flex:1">' +
    '<button class="btn sm" data-addw>Add</button></div>' +
    '<div class="wordtags" id="wtags"></div></div>');
  body.appendChild(wordCard);

  function paintWords() {
    const box = $('#wtags', wordCard);
    box.innerHTML = '';
    if (!h.words.length) box.appendChild(el('<span class="sub" style="margin:0">Nothing harvested yet.</span>'));
    h.words.forEach((w, i) => {
      const tag = el('<span class="wordtag">' + esc(w) + '<button title="remove">×</button></span>');
      $('button', tag).onclick = () => { h.words.splice(i, 1); paintWords(); };
      box.appendChild(tag);
    });
  }
  function addWords(raw) {
    String(raw).split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).forEach(w => {
      if (!h.words.some(x => x.toLowerCase() === w.toLowerCase())) h.words.push(w);
    });
    $('#w-in', wordCard).value = '';
    paintWords();
  }
  $('[data-addw]', wordCard).onclick = () => addWords($('#w-in', wordCard).value);
  $('#w-in', wordCard).addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addWords(e.target.value); }
  });
  paintWords();

  /* --- errors heard --- */
  const errCard = el('<div class="card"><h2>Errors heard</h2>' +
    '<p class="sub">Write what they actually said. Tagging the type is what makes a recurring problem visible next month.</p>' +
    '<div class="row"><input id="e-in" placeholder="e.g. &quot;I go to cinema yesterday&quot;" style="flex:1;min-width:220px">' +
    '<select id="e-type" style="width:180px">' + ERROR_TYPES.map(t => '<option>' + esc(t) + '</option>').join('') + '</select>' +
    '<button class="btn sm" data-adde>Add</button></div>' +
    '<div class="list" id="elist" style="margin-top:12px"></div></div>');
  body.appendChild(errCard);

  function paintErrors() {
    const list = $('#elist', errCard);
    list.innerHTML = '';
    if (!h.errors.length) list.appendChild(el('<div class="empty">No errors logged.</div>'));
    h.errors.forEach((er, i) => {
      const row = el('<div class="item"><div class="grow"><div class="title" style="font-size:14px">' + esc(er.text) + '</div></div>' +
        '<span class="badge">' + esc(er.type) + '</span><button class="btn ghost sm" data-x>Remove</button></div>');
      $('[data-x]', row).onclick = () => { h.errors.splice(i, 1); paintErrors(); };
      list.appendChild(row);
    });
  }
  const addErr = () => {
    const text = $('#e-in', errCard).value.trim();
    if (!text) return;
    h.errors.push({ text, type: $('#e-type', errCard).value });
    $('#e-in', errCard).value = '';
    paintErrors();
  };
  $('[data-adde]', errCard).onclick = addErr;
  $('#e-in', errCard).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addErr(); } });
  paintErrors();
}

/* =============================================================
   STAGE 3 — PRONUNCIATION BOXING (embedded game, dynamic list)
   ============================================================= */

function b64(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

function stagePron(body) {
  const harvested = (S.data.harvest.words || []).slice(0, 20);
  const words = harvested.length ? harvested : forLevel(PRON_FALLBACK, S.trainee.level).slice(0, 8);
  const usingFallback = !harvested.length;

  body.appendChild(el(
    '<div class="card tight"><div class="row between">' +
      '<div><div class="eyebrow">Word list feeding the game</div>' +
      '<div style="font-size:15px">' + words.map(w => '<span class="chip static" style="margin-right:6px">' + esc(w) + '</span>').join('') + '</div></div>' +
      '<div class="row"><button class="btn ghost sm" data-edit>Edit list</button><button class="btn ghost sm" data-reload>Restart game</button></div>' +
    '</div>' +
    (usingFallback ? '<div class="notice info" style="margin:14px 0 0">Nothing was harvested in stage 2, so this is a level ' + esc(S.trainee.level) + ' fallback list.</div>' : '') +
    '</div>'
  ));

  /* The trainee plays this on their own device. The trainer gets a
     conductor's desk instead of a second copy of the game: which word
     is live, and the verdict buttons that land the hit over there. */
  S.data.pron = Object.assign({}, S.data.pron, { words });
  S.data.control = S.data.control || { seq: 0, verdict: null, wordIndex: 0 };
  publish({ kind: 'pron', words: words });

  const panel = el(
    '<div class="card">' +
      '<div class="row between" style="margin-bottom:14px">' +
        '<div><div class="eyebrow">Now saying</div>' +
        '<div id="cw" style="font-size:34px;font-weight:800;letter-spacing:-0.5px"></div></div>' +
        '<div><div class="eyebrow">Recogniser guessed</div>' +
        '<div id="heard" style="font-size:17px;color:var(--muted)">—</div></div>' +
      '</div>' +
      '<div class="chips" id="wordline"></div>' +
    '</div>'
  );
  body.appendChild(panel);

  const paintPanel = () => {
    const i = S.data.control.wordIndex || 0;
    $('#cw', panel).textContent = words[i] || '—';
    $('#wordline', panel).innerHTML = words.map((w, n) =>
      '<span class="chip' + (n === i ? ' on' : n < i ? ' gold' : '') + '">' + esc(w) + '</span>').join('');
  };
  paintPanel();

  const sendMark = async (good) => {
    const c = S.data.control;
    c.seq = (c.seq || 0) + 1;
    c.verdict = good ? 'good' : 'bad';
    c.at = Date.now();
    /* three clean hits clear a word, matching the game's own pacing */
    c.hits = good ? (c.hits || 0) + 1 : 0;
    if (c.hits >= 3) { c.hits = 0; c.wordIndex = Math.min(words.length - 1, (c.wordIndex || 0) + 1); }
    paintPanel();
    /* Straight down the wire first — the session record is the fallback
       for a trainee whose channel has not connected, not the fast path. */
    if (link) link.send('mark', { seq: c.seq, verdict: c.verdict });
    await persist();
    toast(good ? 'Correct — hit sent.' : 'Wrong — sent.', good ? 'ok' : 'err');
  };

  /* ---- what the trainee actually said ----
     The attempt is captured on their device and uploaded to a private
     bucket; only the path travels down the wire. Playing it here is how
     a vowel gets judged instead of guessed. */
  const takes = el(
    '<div class="card"><div class="row between" style="margin-bottom:10px">' +
      '<div><div class="eyebrow">Their recordings</div>' +
      '<h3 style="margin:0">Newest first — tap to listen</h3></div></div>' +
      '<div class="list" id="takes"></div>' +
    '</div>'
  );
  /* appended below the game and the verdict bar, further down */

  const takeList = $('#takes', takes);
  S.data.pron.recordings = S.data.pron.recordings || [];
  /* Local mode hands over the audio itself rather than a path. A Blob
     does not survive JSON, so those takes stay in memory only. */
  const memTakes = [];

  const paintTakes = () => {
    const rows = S.data.pron.recordings.concat(memTakes)
      .sort((a, b) => (a.at || 0) - (b.at || 0)).slice(-12).reverse();
    if (!rows.length) {
      takeList.innerHTML = '<div class="empty">Nothing yet. Each attempt your trainee records ' +
        'appears here a second or two after they finish saying it.</div>';
      return;
    }
    takeList.innerHTML = rows.map((r, n) =>
      '<div class="item"><span class="badge level">' + esc(r.word || '—') + '</span>' +
      '<div class="grow"><div class="meta">' +
        new Date(r.at || Date.now()).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      '</div></div>' +
      '<button class="btn ghost sm" data-play="' + n + '">▶ Play</button></div>').join('');

    $$('[data-play]', takeList).forEach(btn => {
      btn.onclick = async () => {
        const take = rows[Number(btn.dataset.play)];
        btn.disabled = true;
        try {
          const src = take.blob ? URL.createObjectURL(take.blob) : await Store.recordingUrl(take.path);
          const audio = new Audio(src);
          audio.onended = () => { btn.disabled = false; };
          audio.onerror = () => { btn.disabled = false; toast('That recording would not play.', 'err'); };
          await audio.play();
        } catch (e) {
          btn.disabled = false;
          toast('Could not fetch it: ' + e.message, 'err');
        }
      };
    });
  };
  paintTakes();

  S.onLink = (msg) => {
    if (msg.type === 'recording') {
      const take = { word: msg.word, at: msg.at || Date.now() };
      if (msg.path) {
        /* a path outlives the session: it can be replayed from the
           history months later */
        S.data.pron.recordings.push(Object.assign({ path: msg.path }, take));
        persist();
      } else if (msg.blob) {
        memTakes.push(Object.assign({ blob: msg.blob }, take));
      }
      paintTakes();
    }
    if (msg.type === 'recording-failed') {
      toast('Their device could not upload "' + msg.word + '": ' + msg.reason, 'err');
    }
    /* The recogniser is a hint on this screen and nothing more — it
       lands no hits and the trainee never sees it. */
    if (msg.type === 'gamestate' && msg.s) {
      const h = $('#heard', panel);
      if (h) h.textContent = msg.s.heard ? '“' + msg.s.heard + '”' : '—';
    }
  };

  const keyMark = (e) => {
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === '1') { e.preventDefault(); sendMark(true); }
    if (e.key === '2') { e.preventDefault(); sendMark(false); }
  };
  document.addEventListener('keydown', keyMark);

  /* A mirror, not a second game. It has no microphone and no engine of
     its own: it redraws the snapshot the trainee's copy sends every half
     second, so a monster they have killed is dead here too. */
  const frame = el('<iframe class="gameframe" style="height:min(52vh,460px)" src="games/pronunciation.html#monitor=1&r=' +
    encodeURIComponent(b64({ w: words, v: [] })) + '"></iframe>');
  body.appendChild(el('<p class="sub" style="margin:18px 0 6px">What your trainee sees — mirrored from their device</p>'));
  body.appendChild(frame);
  S.monitor = frame;

  /* The verdict sits directly under the game, where the trainer is
     already looking. Nothing on the trainee's screen moves until one of
     these is pressed: their microphone records and plays back, and that
     is all it does. */
  const verdictBar = el(
    '<div class="card tight" style="margin-top:12px">' +
      '<div class="row between">' +
        '<div class="sub" style="margin:0">Nothing happens in the game until you decide. ' +
        'Keys <b>1</b> correct · <b>2</b> wrong.</div>' +
        '<div class="row">' +
          '<button class="btn" data-good style="font-size:18px;padding:15px 34px">✓ Correct</button>' +
          '<button class="btn danger" data-bad style="font-size:18px;padding:15px 34px">✗ Wrong</button>' +
        '</div>' +
      '</div>' +
    '</div>'
  );
  body.appendChild(verdictBar);
  $('[data-good]', verdictBar).onclick = () => sendMark(true);
  $('[data-bad]', verdictBar).onclick = () => sendMark(false);
  body.appendChild(takes);

  S.onLeave = () => { document.removeEventListener('keydown', keyMark); S.monitor = null; };

  S.data.pron = S.data.pron || { words };

  /* Restart means restart the round the trainee is playing; the mirror
     follows because it reloads with it. */
  $('[data-reload]', body).onclick = () => {
    /* seq keeps climbing — the trainee's guard against replaying an old
       mark counts on it never going backwards. */
    const seq = (S.data.control && S.data.control.seq) || 0;
    S.data.control = { seq, verdict: null, wordIndex: 0, hits: 0, restart: Date.now() };
    if (link) link.send('restart', {});
    frame.src = frame.src;
    paintPanel();
    persist();
    toast('Restarted on both screens.');
  };
  $('[data-edit]', body).onclick = () => {
    const current = $('#pron-edit');
    if (current) return;
    const editor = el('<div class="card" id="pron-edit"><h3>Word list</h3>' +
      '<textarea id="pe">' + esc(words.join(', ')) + '</textarea>' +
      '<div class="row" style="margin-top:10px"><button class="btn sm" data-apply>Apply and restart</button></div></div>');
    body.insertBefore(editor, frame);
    $('[data-apply]', editor).onclick = () => {
      const next = $('#pe', editor).value.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean).slice(0, 20);
      if (!next.length) { toast('Add at least one word.', 'err'); return; }
      S.data.harvest.words = next;
      S.data.pron = { words: next };
      editor.remove();
      draw();
    };
  };
}

/* Results posted back by the two embedded games. */
function onGameMessage(event) {
  const msg = event.data;
  if (!msg || msg.source !== 'antoch-game' || !S) return;
  if (msg.game === 'pronunciation') {
    S.data.pron = Object.assign({}, S.data.pron, {
      score: msg.score,
      results: msg.results,
      summary: msg.results
        ? msg.results.filter(r => r.pct >= 85).length + ' of ' + msg.results.length + ' words clean · score ' + msg.score
        : 'played'
    });
    const weak = (msg.results || []).filter(r => r.pct < 85).map(r => r.word);
    if (weak.length) toast('Still shaky: ' + weak.join(', '), 'info');
  }
  persist();
}

/* =============================================================
   STAGE 4 — QUICK ROUND
   ============================================================= */

function stageQuickRound(body) {
  const kind = quickRoundKind();
  if (kind === 'expansion') return stageExpansion(body);
  if (kind === 'picture') return stagePicture(body);
  if (kind === 'connectors') return stageConnectors(body);
  if (kind === 'prep') return stagePrep(body);
  if (kind === 'forbidden') return stageForbidden(body);
  return stageWordForm(body);
}

/* =============================================================
   DRILL — CONNECTOR CHAINING

   The trainee writes on their own device and it arrives here as they
   type. The connectors they have actually used light up by themselves,
   so the trainer is reading the sentence rather than hunting for the
   word "although" in it.
   ============================================================= */

function stageConnectors(body) {
  const prompts = forLevel(CONNECTOR_PROMPTS, S.trainee.level);
  const bank = forLevel(CONNECTORS, S.trainee.level);
  const store = S.data.extras.connectors = S.data.extras.connectors || { prompt: '', required: [], done: 0 };
  if (!store.prompt) store.prompt = pickOne(prompts) || '';
  if (!store.required.length) store.required = bank.slice(0, 3);

  let text = '';

  const card = el('<div class="card"></div>');
  body.appendChild(card);

  /* A connector counts as used when it appears as a whole word — "so"
     must not be found inside "also". Multi-word ones are matched whole. */
  const usedSet = () => {
    const hay = ' ' + text.toLowerCase().replace(/[^a-z' ]+/g, ' ').replace(/\s+/g, ' ') + ' ';
    return bank.filter(c => hay.indexOf(' ' + c.toLowerCase() + ' ') >= 0);
  };

  /* Publishing is what the trainee's page rebuilds on, so it happens
     when the situation or the required connectors change — never on
     every keystroke arriving from their device, which would rebuild the
     box they are typing into. */
  const pushToTrainee = () =>
    publish({ kind: 'connectors', prompt: store.prompt, required: store.required, bank: bank });

  function draw2() {
    const used = usedSet();
    card.innerHTML =
      '<div class="prompt-box">' + esc(store.prompt) + '</div>' +
      '<div class="row" style="margin-top:14px">' +
        '<button class="btn ghost sm" data-newprompt>Another situation</button>' +
        '<button class="btn ghost sm" data-editprompt>Write my own</button>' +
        '<span class="spacer"></span>' +
        '<span class="badge">' + store.done + ' done</span>' +
      '</div>' +
      '<div class="eyebrow" style="margin-top:18px">Connectors — tap to require, lit ones they have used</div>' +
      '<div class="chips">' + bank.map(c =>
        '<span class="chip' + (store.required.includes(c) ? ' gold' : '') + (used.includes(c) ? ' on' : '') +
        '" data-c="' + esc(c) + '">' + esc(c) + '</span>').join('') + '</div>' +
      '<div class="eyebrow" style="margin-top:18px">What they are writing</div>' +
      '<div class="prompt-box small" id="c-text" style="text-align:left;min-height:84px">' +
        (text ? esc(text) : '<span style="color:var(--muted)">Waiting for their device…</span>') + '</div>' +
      '<div class="row" style="margin-top:14px">' +
        '<button class="btn" data-accept>✓ Good — next situation</button>' +
        '<button class="btn ghost" data-again>Say it again, longer</button>' +
      '</div>';

    $$('[data-c]', card).forEach(chip => chip.onclick = () => {
      const c = chip.dataset.c;
      store.required = store.required.includes(c)
        ? store.required.filter(x => x !== c)
        : store.required.concat([c]);
      pushToTrainee();
      draw2();
      persist();
    });
    $('[data-newprompt]', card).onclick = () => { store.prompt = pickOne(prompts) || store.prompt; text = ''; nextRound(); };
    $('[data-editprompt]', card).onclick = async () => {
      const own = await modal(
        '<h2>Your own situation</h2><textarea id="c-own" placeholder="Something that happened to them, in one line"></textarea>' +
        '<div class="row" style="margin-top:12px"><button class="btn ghost" data-cancel>Cancel</button>' +
        '<button class="btn" data-ok>Use it</button></div>',
        (c2, close) => {
          $('[data-ok]', c2).onclick = () => close($('#c-own', c2).value.trim());
          $('[data-cancel]', c2).onclick = () => close(null);
        });
      if (own) { store.prompt = own; text = ''; nextRound(); }
    };
    $('[data-accept]', card).onclick = () => {
      store.done++;
      store.prompt = pickOne(prompts) || store.prompt;
      text = '';
      nextRound();
      toast('Nice — new situation sent.');
    };
    $('[data-again]', card).onclick = () => {
      if (link) link.send('fieldnote', { note: 'Longer, please — join those ideas with one of the lit connectors.' });
      toast('Asked for a longer answer.');
    };
  }

  function nextRound() {
    if (link) link.send('fieldnext', {});
    pushToTrainee();
    draw2();
    persist();
  }

  S.onLink = (msg) => {
    if (msg.type !== 'fields') return;
    text = (msg.answers && msg.answers.text) || '';
    draw2();
  };

  pushToTrainee();
  draw2();
}

/* =============================================================
   DRILL — PREP ANSWER
   ============================================================= */

function stagePrep(body) {
  const questions = forLevel(PREP_QUESTIONS, S.trainee.level);
  const store = S.data.extras.prep = S.data.extras.prep || { question: '', done: 0 };
  if (!store.question) store.question = pickOne(questions) || '';

  let answers = {};

  const card = el('<div class="card"></div>');
  body.appendChild(card);

  const pushToTrainee = () => publish({ kind: 'prep', question: store.question });

  function draw2() {
    card.innerHTML =
      '<div class="prompt-box">' + esc(store.question) + '</div>' +
      '<div class="row" style="margin-top:14px">' +
        '<button class="btn ghost sm" data-newq>Another question</button>' +
        '<button class="btn ghost sm" data-ownq>Ask my own</button>' +
        '<span class="spacer"></span><span class="badge">' + store.done + ' answered</span>' +
      '</div>' +
      '<div class="list" style="margin-top:18px">' +
        PREP_STEPS.map(([k, label, hint]) => {
          const given = (answers[k] || '').trim();
          return '<div class="item"><span class="badge ' + (given ? 'level' : '') + '">' + esc(label) + '</span>' +
            '<div class="grow"><div class="title" style="font-weight:600">' +
              (given ? esc(given) : '<span style="color:var(--muted);font-weight:400">' + esc(hint) + '</span>') +
            '</div></div>' +
            '<button class="btn ghost sm" data-again="' + k + '">Again</button></div>';
        }).join('') +
      '</div>' +
      '<div class="row" style="margin-top:16px">' +
        '<button class="btn" data-accept>✓ Good answer — next question</button>' +
      '</div>';

    $('[data-newq]', card).onclick = () => { store.question = pickOne(questions) || store.question; answers = {}; nextRound(); };
    $('[data-ownq]', card).onclick = async () => {
      const own = await modal(
        '<h2>Your own question</h2><input id="p-own" placeholder="Why do you think you need a better salary?">' +
        '<div class="row" style="margin-top:12px"><button class="btn ghost" data-cancel>Cancel</button>' +
        '<button class="btn" data-ok>Ask it</button></div>',
        (c2, close) => {
          $('[data-ok]', c2).onclick = () => close($('#p-own', c2).value.trim());
          $('[data-cancel]', c2).onclick = () => close(null);
        });
      if (own) { store.question = own; answers = {}; nextRound(); }
    };
    $$('[data-again]', card).forEach(b => b.onclick = () => {
      const k = b.dataset.again;
      const label = (PREP_STEPS.find(s => s[0] === k) || [])[1] || 'that part';
      if (link) link.send('fieldflag', { key: k, note: label + ' again — sharpen it.' });
      toast('Asked them to redo the ' + label.toLowerCase() + '.');
    });
    $('[data-accept]', card).onclick = () => {
      store.done++;
      store.question = pickOne(questions) || store.question;
      answers = {};
      nextRound();
      toast('Next question sent.');
    };
  }

  function nextRound() {
    if (link) link.send('fieldnext', {});
    pushToTrainee();
    draw2();
    persist();
  }

  S.onLink = (msg) => {
    if (msg.type !== 'fields') return;
    answers = msg.answers || {};
    draw2();
  };

  pushToTrainee();
  draw2();
}

/* =============================================================
   DRILL — THE FORBIDDEN WORD

   The word goes to the trainee's screen, not this one: they are the
   one describing it. This side is the guesser, so it holds the word
   too — a trainer who cannot get there needs to see what they are
   failing to guess — plus the clock and the tally.
   ============================================================= */

function stageForbidden(body) {
  const bank = forLevel(FORBIDDEN_WORDS, S.trainee.level);
  const store = S.data.extras.forbidden = S.data.extras.forbidden || { done: [], got: 0, slipped: 0 };
  let item = pickOne(bank.filter(w => !store.done.includes(w.word))) || pickOne(bank);

  const card = el('<div class="card"></div>');
  body.appendChild(card);
  let ft = null;

  function draw2() {
    publish({ kind: 'forbidden', word: item.word, banned: item.banned || [] });
    card.innerHTML =
      '<div class="eyebrow">On their screen — they describe it, they must not say it</div>' +
      '<div class="prompt-box">' + esc(item.word) + '</div>' +
      '<p class="sub" style="margin:12px 0 0">Also banned: ' +
        ((item.banned || []).map(b => '<b>' + esc(b) + '</b>').join(', ') || '—') + '</p>' +
      '<div class="row" style="margin-top:16px">' +
        '<button class="btn gold" data-clock>Start the clock</button>' +
        '<div class="timer" id="f-clock" style="font-size:32px">' + mmss(forbiddenSeconds()) + '</div>' +
        '<span class="spacer"></span>' +
        '<span class="badge level">' + store.got + ' guessed</span>' +
        '<span class="badge admin">' + store.slipped + ' slips</span>' +
      '</div>' +
      '<div class="row" style="margin-top:16px">' +
        '<button class="btn" data-got>✓ I guessed it</button>' +
        '<button class="btn danger" data-slip>✗ They said the word</button>' +
        '<button class="btn ghost" data-skip>Skip this one</button>' +
      '</div>';

    $('[data-clock]', card).onclick = () => {
      clearInterval(ft);
      let left = forbiddenSeconds();
      const clock = $('#f-clock', card);
      const paint = () => {
        clock.textContent = mmss(Math.max(0, left));
        clock.className = 'timer' + (left <= 15 ? ' warn' : '');
        if (left <= 0) clearInterval(ft);
        left--;
      };
      paint();
      ft = setInterval(paint, 1000);
    };
    $('[data-got]', card).onclick = () => { store.got++; next(); toast('Got it.'); };
    $('[data-slip]', card).onclick = () => { store.slipped++; next(); toast('Said the word — next one.', 'err'); };
    $('[data-skip]', card).onclick = () => next();
  }

  function next() {
    if (!store.done.includes(item.word)) store.done.push(item.word);
    const left = bank.filter(w => !store.done.includes(w.word));
    item = pickOne(left.length ? left : bank);
    clearInterval(ft);
    draw2();
    persist();
  }

  S.onLeave = () => clearInterval(ft);
  draw2();
}

function forbiddenSeconds() {
  return meta(S.stages[S.idx]).target || 60;
}

/* =============================================================
   DRILL — WORD FORMS
   ============================================================= */

/* The trainee types the four forms on their own device; this side is a
   marking desk. Their answers arrive as they type, and Check and Reveal
   land on their screen, not this one. */
function stageWordForm(body) {
  const bank = forLevel(WORD_FORMS, S.trainee.level);
  const store = S.data.extras.wordform = S.data.extras.wordform || { done: [], correct: 0, asked: 0 };
  let item = pickOne(bank.filter(w => !store.done.includes(w.base))) || pickOne(bank);

  const card = el('<div class="card"></div>');
  body.appendChild(card);

  const FIELDS = [
    ['noun', 'Noun'],
    ['verb', 'Infinitive'],
    ['past', 'Past'],
    ['adjective', 'Adjective / -ing']
  ];

  /* what the trainee currently has typed, by field */
  let given = {};
  let heard = false;   // has their device said anything at all yet

  const verdicts = () => {
    const out = {};
    FIELDS.forEach(([k]) => {
      const answers = (item[k] || []).map(a => a.toLowerCase());
      const typed = (given[k] || '').trim().toLowerCase();
      out[k] = typed ? answers.includes(typed) : false;
    });
    return out;
  };

  const answerKey = () => {
    const out = {};
    FIELDS.forEach(([k]) => { out[k] = (item[k] || []).join(' / '); });
    return out;
  };

  function paint(marked, revealed) {
    const v = marked ? verdicts() : null;
    const key = revealed ? answerKey() : null;
    $('#wf-cells', card).innerHTML = FIELDS.map(([k, label]) => {
      const typed = (given[k] || '').trim();
      const cls = v ? (v[k] ? ' right' : typed || revealed ? ' wrong' : '') : '';
      return '<div class="formcell' + cls + '" data-k="' + k + '">' +
        '<label style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:1px;font-weight:700">' +
        label + '</label>' +
        '<div style="font-size:19px;font-weight:700;min-height:26px;margin-top:4px">' +
          (typed ? esc(typed) : '<span style="color:var(--muted);font-weight:500">…</span>') + '</div>' +
        '<div class="ans">' + (key ? esc(key[k]) : v ? (v[k] ? '✓' : '✗') : '') + '</div>' +
      '</div>';
    }).join('');
    $('#wf-status', card).textContent = heard
      ? 'Typing on their device.'
      : 'Waiting for their device — nothing typed yet.';
  }

  function drawItem() {
    given = {}; heard = false;
    publish({ kind: 'wordform', base: item.base });
    if (link) link.send('wfnext', { base: item.base });
    card.innerHTML =
      '<div class="prompt-box">' + esc(item.base.charAt(0).toUpperCase() + item.base.slice(1)) + '</div>' +
      '<p class="sub" style="margin:10px 0 0">Your trainee types the four forms. You mark them from here.</p>' +
      '<div class="formgrid" id="wf-cells" style="margin-top:18px"></div>' +
      '<div class="row" style="margin-top:16px">' +
        '<button class="btn" data-check>Check</button>' +
        '<button class="btn ghost" data-reveal>Reveal</button>' +
        '<button class="btn ghost" data-nextword>Next word</button>' +
        '<span class="spacer"></span>' +
        '<span class="sub" id="wf-status" style="margin:0"></span>' +
        '<span class="badge">' + store.correct + ' / ' + store.asked + ' correct so far</span>' +
      '</div>';
    paint(false, false);

    $('[data-check]', card).onclick = () => {
      paint(true, false);
      if (link) link.send('wfcheck', { verdicts: verdicts(), reveal: null });
      else toast('No live link to their device yet.', 'err');
    };
    $('[data-reveal]', card).onclick = () => {
      paint(true, true);
      if (link) link.send('wfcheck', { verdicts: verdicts(), reveal: answerKey() });
    };
    $('[data-nextword]', card).onclick = () => {
      bankScore();
      const remaining = bank.filter(w => !store.done.includes(w.base));
      item = pickOne(remaining.length ? remaining : bank);
      drawItem();
      persist();
    };
  }

  /* Marking happens once per word, when the trainer moves on, so
     that pressing Check twice does not distort the tally. */
  function bankScore() {
    if (store.done.includes(item.base)) return;
    const v = verdicts();
    FIELDS.forEach(([k]) => {
      if (!(given[k] || '').trim()) return;
      store.asked++;
      if (v[k]) store.correct++;
    });
    store.done.push(item.base);
  }

  S.onLink = (msg) => {
    if (msg.type !== 'wfanswers') return;
    given = msg.answers || {};
    heard = true;
    paint(false, false);
  };

  drawItem();
  S.onLeave = bankScore;   // mark the word in progress when the trainer moves on
}

/* =============================================================
   DRILL — SENTENCE EXPANSION
   ============================================================= */

function stageExpansion(body) {
  const bank = forLevel(EXPANSIONS, S.trainee.level);
  const store = S.data.extras.expansion = S.data.extras.expansion || { base: '', steps: {} };
  let item = bank.find(b => b.base === store.base) || pickOne(bank);
  store.base = item.base;

  const card = el('<div class="card"></div>');
  body.appendChild(card);

  function drawItem() {
    card.innerHTML =
      '<div class="row" style="margin-bottom:14px">' +
        '<input id="ex-base" value="' + esc(item.base) + '" style="flex:1;font-size:18px">' +
        '<button class="btn ghost sm" data-shuffle>Different sentence</button>' +
      '</div>' +
      EXPANSION_STEPS.map(step =>
        '<div class="expansion-step"><div class="k">+ ' + step + '</div>' +
        '<input data-s="' + step + '" value="' + esc(store.steps[step] || '') + '" placeholder="Type what they said after adding ' + step.toLowerCase() + '"></div>'
      ).join('') +
      '<div class="row" style="margin-top:14px"><button class="btn ghost sm" data-example>Show a model answer</button></div>' +
      '<div id="ex-model"></div>';

    publish({ kind: 'expansion', base: store.base, steps: store.steps });
    $$('[data-s]', card).forEach(i => i.addEventListener('input', e => {
      store.steps[e.target.dataset.s] = e.target.value;
      publish({ kind: 'expansion', base: store.base, steps: store.steps });
    }));
    $('#ex-base', card).addEventListener('input', e => { store.base = e.target.value; });
    $('[data-shuffle]', card).onclick = () => {
      item = pickOne(bank.filter(b => b.base !== item.base)) || item;
      store.base = item.base; store.steps = {};
      drawItem(); persist();
    };
    $('[data-example]', card).onclick = () => {
      $('#ex-model', card).innerHTML = '<div class="notice info" style="margin-top:12px">' + esc(item.example) + '</div>';
    };
  }

  drawItem();
}

/* =============================================================
   DRILL — PICTURE DESCRIPTION
   ============================================================= */

/* The drill runs to whatever this stage has been set to, so changing
   the length in the bar changes the clock the trainee is talking against. */
function pictureSeconds() {
  return meta(S.stages[S.idx]).target || 90;
}

function stagePicture(body) {
  const store = S.data.extras.picture = S.data.extras.picture || { url: '', credit: '', notes: '' };
  const prompts = forLevel(PICTURE_PROMPTS, S.trainee.level);

  const card = el('<div class="card">' +
    '<div class="row" style="margin-bottom:14px">' +
      '<button class="btn" data-new>New picture</button>' +
      '<button class="btn gold" data-talk>Start the clock</button>' +
      '<div class="timer" id="p-clock" style="font-size:32px">' + mmss(pictureSeconds()) + '</div>' +
      '<span class="spacer"></span><span class="sub" id="p-credit" style="margin:0"></span>' +
    '</div>' +
    '<div id="p-holder"><div class="empty">Tap “New picture” to pull one.</div></div>' +
    '<div class="row" style="margin-top:12px">' +
      '<input id="p-url" placeholder="…or paste any image URL and press Use" style="flex:1;min-width:220px">' +
      '<button class="btn ghost sm" data-useurl>Use</button>' +
    '</div>' +
    '<div class="eyebrow" style="margin-top:18px">Follow-up prompts for ' + esc(S.trainee.level) + '</div>' +
    '<div class="chips" id="p-prompts"></div>' +
    '<div class="field" style="margin-top:16px"><label>Notes</label>' +
      '<textarea id="p-notes" placeholder="Vocabulary gaps, anything worth carrying into the feedback note">' + esc(store.notes) + '</textarea></div>' +
    '</div>');
  body.appendChild(card);

  prompts.forEach(p => {
    const chip = el('<span class="chip gold">' + esc(p) + '</span>');
    chip.onclick = () => chip.classList.toggle('on');
    $('#p-prompts', card).appendChild(chip);
  });
  $('#p-notes', card).addEventListener('input', e => { store.notes = e.target.value; });

  function show(url, credit) {
    store.url = url; store.credit = credit || '';
    publish({ kind: 'picture', url: url, prompts: prompts });
    $('#p-holder', card).innerHTML = '<img class="picture-frame" src="' + esc(url) + '" alt="">';
    $('#p-credit', card).textContent = credit || '';
    persist();
  }
  if (store.url) show(store.url, store.credit);

  $('[data-new]', card).onclick = async () => {
    $('#p-holder', card).innerHTML = '<div class="empty">Loading…</div>';
    try {
      const pic = await fetchPicture();
      show(pic.url, pic.credit);
    } catch (e) {
      $('#p-holder', card).innerHTML = '<div class="notice err">Could not load an image: ' + esc(e.message) + '</div>';
    }
  };

  const useTyped = () => {
    const typed = $('#p-url', card).value.trim();
    if (!/^https?:\/\//i.test(typed)) { toast('Paste a full image address starting with http.', 'err'); return; }
    show(typed, 'Pasted by trainer');
    $('#p-url', card).value = '';
  };
  $('[data-useurl]', card).onclick = useTyped;
  $('#p-url', card).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); useTyped(); } });

  let pt = null;
  $('[data-talk]', card).onclick = () => {
    clearInterval(pt);
    /* However long this stage has been set to run — edit it from the
       "suggested … edit" line in the bar above. */
    let left = pictureSeconds();
    const clock = $('#p-clock', card);
    const paint = () => {
      clock.textContent = String(Math.floor(Math.max(0, left) / 60)).padStart(2, '0') + ':' + String(Math.max(0, left) % 60).padStart(2, '0');
      clock.className = 'timer' + (left <= 15 ? ' warn' : '');
      if (left <= 0) clearInterval(pt);
      left--;
    };
    paint();
    pt = setInterval(paint, 1000);
  };
}

/* Unsplash when a key is configured — biased towards the odd and
   the unexpected rather than clean stock photography. Without a key
   the drill still runs on a neutral random source. */
async function fetchPicture() {
  const query = pickOne(PICTURE_QUERIES);

  if (UNSPLASH_ACCESS_KEY) {
    /* Search rather than /photos/random, on a shallow-but-not-first
       page: the very top hits for any term are the polished stock
       shots, which are the ones this drill is trying to avoid. */
    const page = 1 + Math.floor(Math.random() * 6);
    const url = 'https://api.unsplash.com/search/photos?orientation=landscape&content_filter=high' +
      '&per_page=30&page=' + page +
      '&query=' + encodeURIComponent(query) +
      '&client_id=' + encodeURIComponent(UNSPLASH_ACCESS_KEY);
    const res = await fetch(url);
    if (res.status === 403) throw new Error('Unsplash hourly limit reached — try again shortly, or use the URL box below.');
    if (!res.ok) throw new Error('Unsplash replied ' + res.status);
    const j = await res.json();
    const hits = (j.results || []).filter(p => p.urls && p.urls.regular);
    if (hits.length) {
      const pick = hits[Math.floor(Math.random() * hits.length)];
      return {
        url: pick.urls.regular,
        credit: 'Photo: ' + ((pick.user && pick.user.name) || 'Unsplash') + ' on Unsplash · searched “' + query + '”'
      };
    }
    /* fall through to the keyless source rather than dead-ending */
  }

  return {
    url: 'https://picsum.photos/seed/' + Math.random().toString(36).slice(2) + '/1200/800',
    credit: 'Random photo' + (UNSPLASH_ACCESS_KEY ? ' (Unsplash returned nothing for that search)' : ' · add an Unsplash key in config.js for quirkier images')
  };
}

/* =============================================================
   STAGE 5 — FEEDBACK NOTE
   ============================================================= */

/* The trainer's own report format. Points can be dropped into any
   section while the lesson runs, or the whole thing written at the
   end — both paths produce the same note. */
const REPORT_SECTIONS = [
  ['strengths',    'Strengths'],
  ['improve',      'Areas for Improvement'],
  ['weakness',     'Main Weakness'],
  ['needs',        'Needs to Be Improved'],
  ['plan',         'Action Plan for Next Session'],
  ['didwell',      'What You Did Well'],
  ['focus',        'One Focus Area'],
  ['trynext',      'What to Try Next Time']
];

function reportStore() {
  S.data.report = S.data.report || {};
  REPORT_SECTIONS.forEach(([k]) => { S.data.report[k] = S.data.report[k] || []; });
  if (typeof S.data.report.comment !== 'string') S.data.report.comment = '';
  if (typeof S.data.report.pasted !== 'string') S.data.report.pasted = '';
  return S.data.report;
}

/* Available from every stage, so a point can be caught the moment it
   happens rather than remembered at the end. */
async function addReportPoint(key, text) {
  const r = reportStore();
  if (!text || !text.trim()) return;
  r[key].push(text.trim());
  await persist();
}

function stageFeedback(body) {
  const fb = S.data.feedback;
  const r = reportStore();
  let mode = r.pasted ? 'paste' : 'build';

  const wrap = el('<div></div>');
  body.appendChild(wrap);

  function draw() {
    wrap.innerHTML = '';

    wrap.appendChild(el(
      '<div class="tabs" style="max-width:420px">' +
        '<button class="' + (mode === 'build' ? 'active' : '') + '" data-mode="build">Build from points</button>' +
        '<button class="' + (mode === 'paste' ? 'active' : '') + '" data-mode="paste">Write it myself</button>' +
      '</div>'
    ));

    if (mode === 'build') {
      const grid = el('<div class="grid two"></div>');
      REPORT_SECTIONS.forEach(([key, label]) => {
        const card = el(
          '<div class="card tight">' +
            '<div class="eyebrow">' + esc(label) + '</div>' +
            '<div class="list" data-list="' + key + '"></div>' +
            '<div class="row" style="margin-top:9px">' +
              '<input data-in="' + key + '" placeholder="Add a point" style="flex:1;min-width:140px">' +
              '<button class="btn sm" data-add="' + key + '">Add</button>' +
            '</div>' +
          '</div>'
        );
        const list = $('[data-list="' + key + '"]', card);
        if (!r[key].length) list.appendChild(el('<div class="sub" style="margin:0;font-size:13px">Nothing yet.</div>'));
        r[key].forEach((point, i) => {
          const row = el('<div class="item" style="padding:8px 11px"><div class="grow" style="font-size:13.5px">' +
            esc(point) + '</div><button class="btn ghost sm" data-del>×</button></div>');
          $('[data-del]', row).onclick = () => { r[key].splice(i, 1); persist(); draw(); };
          list.appendChild(row);
        });
        const commit = () => {
          const box = $('[data-in="' + key + '"]', card);
          if (!box.value.trim()) return;
          r[key].push(box.value.trim());
          box.value = '';
          persist();
          draw();
        };
        $('[data-add="' + key + '"]', card).onclick = commit;
        $('[data-in="' + key + '"]', card).addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); commit(); }
        });
        grid.appendChild(card);
      });
      wrap.appendChild(grid);

      const comment = el('<div class="card"><div class="eyebrow">Trainer&#39;s Overall Comment</div>' +
        '<textarea id="r-comment" style="min-height:120px" placeholder="A short paragraph tying it together">' +
        esc(r.comment) + '</textarea></div>');
      $('#r-comment', comment).addEventListener('input', e => { r.comment = e.target.value; paint(); });
      wrap.appendChild(comment);
    } else {
      const pasteCard = el('<div class="card"><div class="eyebrow">Your own note</div>' +
        '<p class="sub">Write it here, or paste one you have already written. It is sent exactly as typed.</p>' +
        '<textarea id="r-paste" style="min-height:300px">' + esc(r.pasted) + '</textarea></div>');
      $('#r-paste', pasteCard).addEventListener('input', e => { r.pasted = e.target.value; paint(); });
      wrap.appendChild(pasteCard);
    }

    $$('[data-mode]', wrap).forEach(b => b.onclick = () => { mode = b.dataset.mode; draw(); });

    const out = el('<div class="card"><div class="row between" style="margin-bottom:12px">' +
      '<h2 style="margin:0">The note</h2>' +
      '<div class="row"><button class="btn sm" data-copy>Copy</button>' +
      '<button class="btn sm ghost" data-dl>Download .txt</button></div></div>' +
      '<div class="feedback-out" id="fout"></div></div>');
    wrap.appendChild(out);

    $('[data-copy]', out).onclick = async () => { await copyText(fb.text); toast('Copied.'); };
    $('[data-dl]', out).onclick = () => downloadText(
      S.trainee.name.replace(/\s+/g, '-').toLowerCase() + '-' + new Date().toISOString().slice(0, 10) + '.txt',
      fb.text);

    paint();
  }

  function paint() {
    fb.text = buildNote();
    const node = $('#fout', wrap);
    if (node) node.textContent = fb.text;
    publish({ kind: 'feedback', text: fb.text });
    persist();
  }

  draw();
}

/* The note itself, in the trainer's format. A pasted note wins outright;
   otherwise the sections are assembled, and empty ones are left out
   rather than printed as blank headings. */
function buildReport() {
  const t = S.trainee;
  const r = reportStore();
  if (r.pasted && r.pasted.trim()) return r.pasted.trim();

  const n = (S.history ? S.history.length : 0) + 1;
  const lines = [];
  lines.push('Date: ' + fmtDate(new Date().toISOString()));
  lines.push('Trainee Name: ' + t.name);
  lines.push('Trainer: ' + ((Store.me && (Store.me.name || Store.me.email)) || ''));
  lines.push('Session Number: ' + n);
  lines.push('Level: ' + t.level);
  lines.push('');

  REPORT_SECTIONS.forEach(([key, label]) => {
    if (!r[key] || !r[key].length) return;
    lines.push(label);
    r[key].forEach(p => lines.push('- ' + p));
    lines.push('');
  });

  if (r.comment && r.comment.trim()) {
    lines.push("Trainer's Overall Comment");
    lines.push(r.comment.trim());
    lines.push('');
  }

  return lines.join('\n').trim();
}

function fillerTotal(data) {
  const f = (data.harvest && data.harvest.fillers) || {};
  return Object.keys(f).reduce((sum, k) => sum + (f[k] || 0), 0);
}

/* The note is assembled from what was actually recorded — nothing
   is invented, and a section is simply omitted when it is empty. */
function buildNote() {
  const t = S.trainee;
  const h = S.data.harvest;
  const fb = S.data.feedback;
  const r = reportStore();

  /* A note written by hand is sent exactly as written. */
  if (r.pasted && r.pasted.trim()) return r.pasted.trim();

  const lines = [];
  lines.push(buildReport());
  lines.push('');
  lines.push('— session record —');
  lines.push('');

  if (h.topic) { lines.push('TOPIC'); lines.push(h.topic); lines.push(''); }

  /* fillers versus the rolling average of finished sessions */
  const today = fillerTotal(S.data);
  const past = S.history.map(s => fillerTotal(s.data || {}));
  const avg = past.length ? past.reduce((a, b) => a + b, 0) / past.length : null;
  lines.push('FILLER WORDS');
  if (avg === null) {
    lines.push(today + ' today. This is your first recorded count, so it becomes the baseline.');
  } else {
    const diff = today - avg;
    const verdict = Math.abs(diff) < 1 ? 'about the same as usual'
      : diff < 0 ? Math.abs(diff).toFixed(1) + ' fewer than usual'
        : diff.toFixed(1) + ' more than usual';
    lines.push(today + ' today · rolling average ' + avg.toFixed(1) + ' over ' + past.length +
      ' session' + (past.length === 1 ? '' : 's') + ' — ' + verdict + '.');
  }
  const breakdown = Object.entries(h.fillers || {}).filter(e => e[1]).sort((a, b) => b[1] - a[1]);
  if (breakdown.length) lines.push('Breakdown: ' + breakdown.map(e => e[0] + ' ×' + e[1]).join(', '));
  lines.push('');

  if ((h.words || []).length) {
    lines.push('WORDS WE DRILLED');
    lines.push(h.words.join(', '));
    const pron = S.data.pron;
    if (pron && pron.results) {
      const weak = pron.results.filter(r => r.pct < 85).map(r => r.word);
      lines.push(weak.length ? 'Still shaky: ' + weak.join(', ') : 'All of them landed cleanly by the end.');
    }
    lines.push('');
  }

  if ((h.errors || []).length) {
    lines.push('ERRORS LOGGED TODAY');
    h.errors.forEach(e => lines.push('· ' + e.text + '   [' + e.type + ']'));
    lines.push('');
  }

  /* one recurring error, only when it genuinely repeats */
  const recurring = findRecurring(h.errors || []);
  if (recurring) {
    lines.push('RECURRING');
    lines.push(recurring);
    lines.push('');
  }

  const quick = S.data.stage4;
  if (quick && quick.summary) {
    lines.push('QUICK ROUND');
    lines.push((DRILL_NAMES[quick.kind] || 'Quick round') + ' — ' + quick.summary);
    lines.push('');
  }

  const wf = S.data.extras.wordform;
  if (wf && wf.asked) {
    lines.push('WORD FORMS');
    lines.push(wf.correct + ' of ' + wf.asked + ' forms correct.');
    lines.push('');
  }

  const pic = S.data.extras.picture;
  if (pic && pic.notes) { lines.push('PICTURE DESCRIPTION'); lines.push(pic.notes); lines.push(''); }



  return lines.join('\n').trim();
}

function findRecurring(todaysErrors) {
  if (!todaysErrors.length || !S.history.length) return null;

  const counts = {};
  S.history.forEach(s => {
    const seen = new Set(((s.data && s.data.harvest && s.data.harvest.errors) || []).map(e => e.type));
    seen.forEach(type => { counts[type] = (counts[type] || 0) + 1; });
  });

  const todayTypes = Array.from(new Set(todaysErrors.map(e => e.type)));
  let best = null;
  todayTypes.forEach(type => {
    const n = counts[type] || 0;
    if (n > 0 && (!best || n > best.n)) best = { type, n };
  });
  if (!best) return null;

  const total = S.history.length + 1;
  return best.type + ' has now come up in ' + (best.n + 1) + ' of your last ' + total +
    ' sessions. That is the pattern to attack, not a one-off slip.';
}
