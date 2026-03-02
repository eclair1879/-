
// functions/api/leaderboard.js
// Cloudflare Pages Functions - Global Leaderboard (GET top 100 / POST new score)
// Uses D1 binding named `DB`. If you don't attach D1, it will fallback to in-memory (ephemeral) store.

let MEM = [];

export async function onRequestGet({ env }) {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
  if (env && env.DB && env.DB.prepare) {
    try {
      const { results } = await env.DB
        .prepare('SELECT name, score, ts FROM leaderboard ORDER BY score DESC, ts ASC LIMIT 100')
        .all();
      return new Response(JSON.stringify({ items: results || [] }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ items: [], warn: 'db_error' }), { headers });
    }
  } else {
    // fallback (for preview without DB): return top 100 from memory
    const items = MEM.slice().sort((a,b)=> (b.score - a.score) || (a.ts - b.ts)).slice(0, 100);
    return new Response(JSON.stringify({ items, warn: 'mem_store' }), { headers });
  }
}

export async function onRequestPost({ request, env }) {
  const headers = { 'Content-Type': 'application/json' };
  let payload = {};
  try { payload = await request.json(); } catch (_) {}
  const nameRaw = (payload && typeof payload.name === 'string') ? payload.name : '';
  const scoreRaw = (payload && Number.isFinite(payload.score)) ? payload.score : NaN;

  const name = nameRaw.trim().slice(0, 20) || '名無し';
  const score = Math.max(0, Math.floor(scoreRaw));
  const ts = Date.now();

  // very simple sanity checks
  if (!Number.isFinite(scoreRaw)) {
    return new Response(JSON.stringify({ error: 'bad_request' }), { status: 400, headers });
  }
  if (score > 1000000) { // hard limit
    return new Response(JSON.stringify({ error: 'too_large' }), { status: 400, headers });
  }

  if (env && env.DB && env.DB.prepare) {
    try {
      await env.DB
        .prepare('INSERT INTO leaderboard (name, score, ts) VALUES (?, ?, ?)')
        .bind(name, score, ts)
        .run();
      return new Response(JSON.stringify({ ok: true }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: 'db_error' }), { status: 500, headers });
    }
  } else {
    // fallback: push into memory
    MEM.push({ name, score, ts });
    return new Response(JSON.stringify({ ok: true, warn: 'mem_store' }), { headers });
  }
}
