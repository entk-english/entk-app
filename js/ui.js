/* =============================================================
   ui.js — the handful of DOM helpers the rest of the app leans on.
   ============================================================= */

export function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function el(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export function $(sel, root) { return (root || document).querySelector(sel); }
export function $$(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

/* Wires every element carrying data-act="name" to handlers[name].
   Keeps the render functions readable — they emit plain HTML and
   the behaviour is attached in one pass afterwards. */
export function bind(root, handlers) {
  $$('[data-act]', root).forEach(node => {
    const fn = handlers[node.dataset.act];
    if (!fn) return;
    const evt = node.tagName === 'SELECT' || node.type === 'checkbox' ? 'change' : 'click';
    node.addEventListener(evt, e => fn(e, node));
  });
  return root;
}

let toastTimer = null;
export function toast(message, kind) {
  let box = $('#toast');
  if (!box) {
    box = el('<div id="toast"></div>');
    box.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:200;' +
      'padding:12px 20px;border-radius:11px;font-size:14px;font-weight:600;max-width:min(560px,92vw);' +
      'box-shadow:0 12px 40px rgba(0,0,0,.5);transition:opacity .2s;';
    document.body.appendChild(box);
  }
  const palette = {
    err: ['rgba(255,93,115,.16)', 'rgba(255,93,115,.5)', '#ffb3bd'],
    ok: ['rgba(124,245,196,.16)', 'rgba(124,245,196,.5)', '#7cf5c4'],
    info: ['rgba(255,209,102,.14)', 'rgba(255,209,102,.45)', '#ffe3a8']
  }[kind || 'ok'];
  box.style.background = palette[0];
  box.style.border = '1px solid ' + palette[1];
  box.style.color = palette[2];
  box.textContent = message;
  box.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.style.opacity = '0'; }, 3200);
}

/* Promise-based modal. Resolves with the value passed to close(). */
export function modal(innerHTML, wire) {
  return new Promise(resolve => {
    const back = el('<div class="modal-back"><div class="card modal">' + innerHTML + '</div></div>');
    const close = value => { back.remove(); document.removeEventListener('keydown', onKey); resolve(value); };
    const onKey = e => { if (e.key === 'Escape') close(null); };
    back.addEventListener('mousedown', e => { if (e.target === back) close(null); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);
    if (wire) wire(back.firstElementChild, close);
    const first = $('input,select,textarea', back);
    if (first) first.focus();
  });
}

export function confirmBox(title, body, danger) {
  return modal(
    '<h2>' + esc(title) + '</h2><p class="sub">' + esc(body) + '</p>' +
    '<div class="row"><button class="btn ghost" data-no>Cancel</button>' +
    '<button class="btn ' + (danger ? 'danger' : '') + '" data-yes>Confirm</button></div>',
    (card, close) => {
      $('[data-no]', card).onclick = () => close(false);
      $('[data-yes]', card).onclick = () => close(true);
    }
  );
}

export function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
  }
  return Promise.resolve(fallbackCopy(text));
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:0;';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
  ta.remove();
  return ok;
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

export function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function mmss(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
