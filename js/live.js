/* =============================================================
   live.js — the direct line between the two devices in a session.

   The session row is written by the trainer only: row level security
   stops a trainee updating it, and both sides writing one jsonb blob
   would clobber each other anyway. So live state that flows *upwards*
   — the trainee's game telling the trainer what is actually happening
   on their screen — travels over a Supabase realtime broadcast channel
   instead. Nothing is stored; it is a pipe, not a record.

   A BroadcastChannel runs alongside it so the same link works when both
   roles are open in one browser (local mode, or testing on one machine).

   Messages are plain objects: { type, ...payload }. Every one carries a
   sender id so a device never hears its own echo.
   ============================================================= */

import { Store } from './store.js';

export function openLink(sessionId) {
  /* per link, not per page: one page may legitimately hold both ends
     while testing, and each must still hear the other */
  const SENDER = Math.random().toString(36).slice(2, 10);
  const handlers = [];
  const name = 'antoch:session:' + sessionId;
  let bc = null;
  let sb = null;
  let closed = false;

  const deliver = (msg) => {
    if (!msg || msg.from === SENDER) return;
    handlers.forEach(fn => { try { fn(msg); } catch (e) { /* one bad listener must not stop the rest */ } });
  };

  try {
    bc = new BroadcastChannel(name);
    bc.onmessage = e => deliver(e.data);
  } catch (e) { bc = null; }

  if (Store.mode === 'cloud' && Store.sb) {
    try {
      sb = Store.sb.channel(name, { config: { broadcast: { self: false } } });
      sb.on('broadcast', { event: 'msg' }, e => deliver(e.payload));
      sb.subscribe();
    } catch (e) { sb = null; }
  }

  return {
    send(type, payload) {
      if (closed) return;
      const msg = Object.assign({ type, from: SENDER, at: Date.now() }, payload || {});
      if (bc) { try { bc.postMessage(msg); } catch (e) {} }
      if (sb) { try { sb.send({ type: 'broadcast', event: 'msg', payload: msg }); } catch (e) {} }
    },
    on(fn) { handlers.push(fn); },
    close() {
      closed = true;
      handlers.length = 0;
      if (bc) { try { bc.close(); } catch (e) {} bc = null; }
      if (sb) { try { Store.sb.removeChannel(sb); } catch (e) {} sb = null; }
    }
  };
}
