/**
 * Finding Penguin — Cloudflare Worker
 * Handles POI click analytics and player session counts.
 *
 * ── SETUP ────────────────────────────────────────────────────────────────────
 * 1. Create a KV namespace in Cloudflare dashboard → "KV" → New namespace
 *    Name it:  ANALYTICS
 *
 * 2. Add to wrangler.toml:
 *    [[kv_namespaces]]
 *    binding = "ANALYTICS"
 *    id = "<your-namespace-id>"
 *
 * 3. Deploy:
 *    npx wrangler deploy
 *
 * ── ENDPOINTS ────────────────────────────────────────────────────────────────
 * POST /visit                    — increment global page visit counter, return new total
 * GET  /visits                   — return {count: N} total visits ever
 * POST /click?id=poi_xxx         — increment click count for a POI
 * GET  /stats                    — return {poi_id: count, ...} for all POIs
 * POST /session                  — register an active player (TTL 30s)
 * GET  /sessions                 — return {count: N} active players right now
 *
 * ── CORS ─────────────────────────────────────────────────────────────────────
 * All responses include CORS headers so the game (any origin) can call freely.
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS });
    }

    // ── POST /visit ─────────────────────────────────────────────
    // Increment global page visit counter; returns new total.
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

    // ── POST /click?id=poi_xxx ──────────────────────────────────
    if (request.method === 'POST' && path === '/click') {
      const id = url.searchParams.get('id');
      if (!id) return json({ error: 'missing id' }, 400);

      const key = 'click:' + id;
      const current = parseInt(await env.FPANALYTICS.get(key) || '0');
      await env.FPANALYTICS.put(key, String(current + 1));
      return json({ ok: true, id, count: current + 1 });
    }

    // ── GET /stats ──────────────────────────────────────────────
    if (request.method === 'GET' && path === '/stats') {
      const list = await env.FPANALYTICS.list({ prefix: 'click:' });
      const stats = {};
      for (const key of list.keys) {
        const poiId = key.name.replace('click:', '');
        stats[poiId] = parseInt(await env.FPANALYTICS.get(key.name) || '0');
      }
      return json(stats);
    }

    // ── POST /session ───────────────────────────────────────────
    // Each game client posts here every ~15s with a unique session ID.
    // KV TTL of 35s means a session expires if it stops pinging.
    if (request.method === 'POST' && path === '/session') {
      const body = await request.json().catch(() => ({}));
      const sid = body.sid || 'unknown';
      await env.FPANALYTICS.put('session:' + sid, '1', { expirationTtl: 35 });
      return json({ ok: true });
    }

    // ── GET /sessions ────────────────────────────────────────────
    if (request.method === 'GET' && path === '/sessions') {
      const list = await env.FPANALYTICS.list({ prefix: 'session:' });
      return json({ count: list.keys.length });
    }

    return json({ error: 'not found' }, 404);
  },
};
