/**
 * Finding Penguin — Cloudflare Worker
 *
 * ── ENDPOINTS ────────────────────────────────────────────────────────────────
 * POST /visit                    — increment global page visit counter (KV), return total
 * GET  /visits                   — return {count: N} total visits ever (KV)
 * POST /click?id=poi_xxx         — increment click count for a POI (KV)
 * GET  /stats                    — return {poi_id: count, ...} for all POIs (KV)
 * POST /session                  — register active player (in-memory, zero KV)
 * GET  /sessions                 — return {count: N} active players (in-memory)
 *
 * Sessions are tracked purely in-memory (no KV) using a Map with timestamps.
 * Workers may spin up multiple isolates so the count is approximate — fine for
 * a "players online" badge.  KV is only used for persistent data (visits, clicks).
 */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

// ── In-memory session store (zero KV cost) ───────────────────────────────────
// sid → last-seen timestamp (ms). Entries older than SESSION_TTL are stale.
const sessions = new Map();
const SESSION_TTL = 90_000; // 90s — matches the slower client ping interval

function pruneSessions() {
  const cutoff = Date.now() - SESSION_TTL;
  for (const [sid, ts] of sessions) {
    if (ts < cutoff) sessions.delete(sid);
  }
}

export default {
  async fetch(request, env) {
    const url  = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── POST /visit ──────────────────────────────────────────────
    if (request.method === 'POST' && path === '/visit') {
      const current = parseInt(await env.FPANALYTICS.get('global:visits') || '0');
      const next = current + 1;
      await env.FPANALYTICS.put('global:visits', String(next));
      return json({ ok: true, count: next });
    }

    // ── GET /visits ──────────────────────────────────────────────
    if (request.method === 'GET' && path === '/visits') {
      const count = parseInt(await env.FPANALYTICS.get('global:visits') || '0');
      return json({ count });
    }

    // ── POST /click?id=poi_xxx ───────────────────────────────────
    if (request.method === 'POST' && path === '/click') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'missing id' }, 400);
      const key     = 'click:' + id;
      const current = parseInt(await env.FPANALYTICS.get(key) || '0');
      await env.FPANALYTICS.put(key, String(current + 1));
      return json({ ok: true, id, count: current + 1 });
    }

    // ── GET /stats ───────────────────────────────────────────────
    if (request.method === 'GET' && path === '/stats') {
      const list  = await env.FPANALYTICS.list({ prefix: 'click:' });
      const stats = {};
      for (const key of list.keys) {
        const poiId = key.name.replace('click:', '');
        stats[poiId] = parseInt(await env.FPANALYTICS.get(key.name) || '0');
      }
      return json(stats);
    }

    // ── POST /session  (in-memory, NO KV) ───────────────────────
    if (request.method === 'POST' && path === '/session') {
      const body = await request.json().catch(() => ({}));
      const sid  = body.sid || 'unknown';
      sessions.set(sid, Date.now());
      pruneSessions();
      return json({ ok: true });
    }

    // ── GET /sessions  (in-memory, NO KV) ───────────────────────
    if (request.method === 'GET' && path === '/sessions') {
      pruneSessions();
      return json({ count: sessions.size });
    }

    return json({ error: 'not found' }, 404);
  },
};
