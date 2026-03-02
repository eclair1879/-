
// public/leaderboard-addon.js
// Override saveResult() & updateRankingDisplay() to use same-origin API (/api/leaderboard)
(() => {
  const API_BASE = '/api'; // Cloudflare Pages Functions default base

  // Helper: safe element
  function $(id){ return document.getElementById(id); }

  async function postScore(name, score){
    try {
      await fetch(`${API_BASE}/leaderboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: (name || '名無し').toString().slice(0, 20), score: Number(score)||0 })
      });
    } catch(e){ console.error('POST /leaderboard failed', e); }
  }

  async function fetchTop(){
    try{
      const r = await fetch(`${API_BASE}/leaderboard`, { cache: 'no-store' });
      if(!r.ok) throw new Error('status '+r.status);
      const { items } = await r.json();
      return Array.isArray(items) ? items.slice(0,3) : [];
    }catch(e){ console.error('GET /leaderboard failed', e); return null; }
  }

  // ---- override functions if exist ----
  const _backToLobby = (typeof window.backToLobby === 'function') ? window.backToLobby : null;

  window.saveResult = async function(){
    try{
      const nameInput = $('playerName');
      const name = (nameInput && nameInput.value) ? nameInput.value : '名無し';
      // expects global `score`, `ranking`, `updateRankingDisplay`
      if (typeof window.score === 'number') {
        await postScore(name, window.score);
      }
      // keep local top3 as fallback (same as original)
      try {
        window.ranking = Array.isArray(window.ranking) ? window.ranking : [];
        window.ranking.push({ name, score: window.score||0 });
        window.ranking.sort((a,b)=> b.score - a.score);
        window.ranking = window.ranking.slice(0,3);
        localStorage.setItem('moleRanking', JSON.stringify(window.ranking));
      } catch(_){}
      if (typeof window.updateRankingDisplay === 'function') window.updateRankingDisplay();
      if (_backToLobby) _backToLobby();
    } catch(e){ console.error('saveResult override error', e); }
  };

  window.updateRankingDisplay = async function(){
    const list = $('rankingList');
    if (!list) return;
    list.innerHTML = '';
    const top = await fetchTop();
    const render = (rows) => {
      if (!rows || !rows.length) {
        const li = document.createElement('li');
        li.textContent = 'まだ記録なし';
        li.className = 'rank-name';
        list.appendChild(li);
        return;
      }
      rows.forEach((r,i)=>{
        const li = document.createElement('li');
        const medal = document.createElement('span');
        medal.className = 'rank-medal';
        medal.textContent = i===0 ? '🥇' : i===1 ? '🥈' : '🥉';
        const nm = document.createElement('span'); nm.className='rank-name'; nm.textContent = ' ' + (r.name||'名無し');
        const sc = document.createElement('span'); sc.className='rank-score'; sc.textContent = ' ' + (r.score||0) + '点';
        li.appendChild(medal); li.appendChild(nm); li.appendChild(sc);
        list.appendChild(li);
      });
    };
    if (top) { render(top); }
    else {
      // fallback to local top3
      try{
        const local = JSON.parse(localStorage.getItem('moleRanking')||'[]');
        render(local);
      }catch(_){ render([]); }
    }
  };
})();
