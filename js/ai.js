/* ═══════════════════════════════════════════════
   AI.JS — AI Analyst · Gemini 2.0 Flash (FREE)
   GNet Analyzer v3.2
═══════════════════════════════════════════════ */
'use strict';

window.AIAnalyst = (() => {

  let apiKey      = '';
  let chatHistory = [];
  let isStreaming = false;
  let dataContext = null;

  const MODEL    = 'gemini-2.0-flash';
  const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

  // ── PROMPT TEMPLATES ──
  const QUICK_PROMPTS = {
    full: `Buat laporan analisis drive test LTE lengkap dan terstruktur. Sertakan:\n### 1. Ringkasan Eksekutif\n### 2. Evaluasi RSRP\n### 3. Evaluasi RSRQ\n### 4. Evaluasi SNR\n### 5. Analisis Throughput\n### 6. Temuan Kritis\n### 7. Kesimpulan & Rekomendasi\nGunakan Bahasa Indonesia profesional dan teknis. Sebutkan angka spesifik dari data.`,
    kpi: `Evaluasi mendalam KPI drive test LTE ini:\n- Bandingkan RSRP, RSRQ, SNR rata-rata vs standar 3GPP\n- Persentase sampel tiap kategori kualitas\n- Korelasi antar parameter\n- Anomali atau inkonsistensi data\n- Berikan **quality score (1-10)** dengan justifikasi lengkap`,
    coverage: `Analisis coverage jaringan:\n- Distribusi RSRP sepanjang rute — area kuat vs lemah\n- Identifikasi coverage holes\n- Pola pada titik-titik rawan\n- Fluktuasi mendadak dan penyebabnya\n- Estimasi penyebab teknis (jarak BTS, obstacle, interferensi)\n- Rekomendasi konkret perbaikan coverage`,
    handover: `Analisis handover dan cell reselection:\n- Frekuensi handover — normal atau excessive?\n- Handover dari/ke cell mana paling sering?\n- Kondisi sinyal saat handover (RSRP, RSRQ threshold)\n- Potensi ping-pong handover\n- Evaluasi parameter A3 offset dan TTT\n- Rekomendasi optimasi parameter handover`,
    throughput: `Analisis performa throughput:\n- Rata-rata dan peak DL/UL throughput\n- Korelasi throughput dengan RSRP dan SNR\n- Bottleneck throughput di area tertentu\n- Konsistensi throughput sepanjang rute\n- Faktor pembatas throughput\n- Proyeksi user experience (streaming, video call, browsing)`,
    recommend: `Rekomendasi teknis optimasi jaringan:\n### Quick Wins (dapat segera dilakukan)\n### Optimasi RF Parameter\n### Optimasi Parameter Jaringan (HO, coverage threshold)\n### Site Engineering\n### Long-term Planning\nPrioritaskan berdasarkan **dampak vs effort** dan estimasi improvement yang diharapkan.`
  };

  // ── BUILD DATA CONTEXT ──
  function buildContext() {
    const D = window.DATA   || [];
    const E = window.EVENTS || [];
    if (!D.length) return null;

    const avg = k => (D.reduce((s,d) => s+d[k], 0)/D.length).toFixed(2);
    const mn  = k => Math.min(...D.map(d=>d[k])).toFixed(1);
    const mx  = k => Math.max(...D.map(d=>d[k])).toFixed(1);
    const pct = n => ((n/D.length)*100).toFixed(1);
    const f = D[0], l = D[D.length-1];

    const r = (lo, hi) => D.filter(d => (lo===null||d.rsrp>lo) && (hi===null||d.rsrp<=hi)).length;
    const q = (lo, hi) => D.filter(d => (lo===null||d.rsrq>lo) && (hi===null||d.rsrq<=hi)).length;
    const s = (lo, hi) => D.filter(d => (lo===null||d.snr>lo)  && (hi===null||d.snr<=hi)).length;

    const dlArr = D.map(d=>d.dl).filter(x=>x>0);
    const ulArr = D.map(d=>d.ul).filter(x=>x>0);
    const avgDl = dlArr.length ? (dlArr.reduce((a,b)=>a+b,0)/dlArr.length/1000).toFixed(2) : 'N/A';
    const maxDl = dlArr.length ? (Math.max(...dlArr)/1000).toFixed(2) : 'N/A';
    const avgUl = ulArr.length ? (ulArr.reduce((a,b)=>a+b,0)/ulArr.length/1000).toFixed(2) : 'N/A';
    const maxUl = ulArr.length ? (Math.max(...ulArr)/1000).toFixed(2) : 'N/A';

    const cells = {};
    D.forEach(d => { if(d.cellname) cells[d.cellname]=(cells[d.cellname]||0)+1; });
    const topC = Object.entries(cells).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c,n])=>`${c}(${n})`).join(', ');
    const rawan = D.filter(d=>d.rsrp<-100||d.rsrq<-19||d.snr<-10).length;
    const hoC = E.filter(e=>e.type==='HANDOVER').length;
    const rsC = E.filter(e=>e.type==='RESELECTION').length;

    return `DATA DRIVE TEST LTE
Operator: ${f.operator||'N/A'} | Device: ${(f.device||'').split(':').slice(0,2).join(' ')||'N/A'}
Tanggal: ${f.ts?.substring(0,10).replace(/\./g,'-')} | Waktu: ${f.timePart}—${l.timePart}
Teknologi: ${f.tech||'4G'} | Band: ${f.band?'Band '+f.band:'N/A'} | BW: ${f.bw?f.bw+' MHz':'N/A'}
Data: ${D.length.toLocaleString()} titik | GPS: ${D.filter(d=>d.lat&&d.lon).length.toLocaleString()} valid

SERVING CELL
eNodeB: ${f.node||'N/A'} | CellID: ${f.cellid||'N/A'} | LAC: ${f.lac||'N/A'} | ARFCN: ${f.arfcn||'N/A'}
Top Cells: ${topC||'N/A'} | Unique Cells: ${Object.keys(cells).length}

KPI RSRP — avg: ${avg('rsrp')} dBm | min: ${mn('rsrp')} | max: ${mx('rsrp')} dBm
  >-80 (Sangat Baik): ${r(-80,null)} pts (${pct(r(-80,null))}%)
  -80~-90 (Bagus):    ${r(-90,-80)} pts (${pct(r(-90,-80))}%)
  -90~-100 (Normal):  ${r(-100,-90)} pts (${pct(r(-100,-90))}%)
  -100~-110 (Buruk):  ${r(-110,-100)} pts (${pct(r(-110,-100))}%)
  <-110 (Sgt Buruk):  ${r(null,-110)} pts (${pct(r(null,-110))}%)

KPI RSRQ — avg: ${avg('rsrq')} dB | min: ${mn('rsrq')} | max: ${mx('rsrq')} dB
  >-9 (Excellent): ${q(-9,null)} pts (${pct(q(-9,null))}%)
  -10~-9 (Best):   ${q(-10,-9)} pts (${pct(q(-10,-9))}%)
  -15~-10 (Good):  ${q(-15,-10)} pts (${pct(q(-15,-10))}%)
  -19~-15 (Poor):  ${q(-19,-15)} pts (${pct(q(-19,-15))}%)
  <-19 (Bad):      ${q(null,-19)} pts (${pct(q(null,-19))}%)

KPI SNR — avg: ${avg('snr')} dB | min: ${mn('snr')} | max: ${mx('snr')} dB
  >20 (Sgt Baik): ${s(20,null)} pts (${pct(s(20,null))}%)
  10~20 (Baik):   ${s(10,20)} pts (${pct(s(10,20))}%)
  0~10 (Cukup):   ${s(0,10)} pts (${pct(s(0,10))}%)
  -10~0 (Buruk):  ${s(-10,0)} pts (${pct(s(-10,0))}%)
  <-10 (Sgt Bk):  ${s(null,-10)} pts (${pct(s(null,-10))}%)

THROUGHPUT
DL avg: ${avgDl} Mbps | DL max: ${maxDl} Mbps
UL avg: ${avgUl} Mbps | UL max: ${maxUl} Mbps

TITIK RAWAN: ${rawan} titik (${pct(rawan)}%)
  RSRP<-100: ${D.filter(d=>d.rsrp<-100).length} | RSRQ<-19: ${D.filter(d=>d.rsrq<-19).length} | SNR<-10: ${D.filter(d=>d.snr<-10).length}

EVENTS: HO ${hoC} | Reselection ${rsC} | Total ${E.length}`;
  }

  const SYSTEM = `Anda adalah AI Analyst Telekomunikasi expert dalam Drive Test LTE/5G, optimasi RF, dan standar 3GPP. Selalu jawab dalam Bahasa Indonesia yang profesional dan teknis. Gunakan formatting markdown (###, **bold**, bullet list). Sebutkan angka spesifik dari data. Berikan insight actionable.

Standar 3GPP:
RSRP: >-80 Sangat Baik | -80~-90 Bagus | -90~-100 Normal | -100~-110 Buruk | <-110 Sangat Buruk
RSRQ: >-9 Excellent | -10~-9 Best | -15~-10 Good | -19~-15 Poor | <-19 Bad
SNR: >20 Sangat Baik | 10~20 Baik | 0~10 Cukup | -10~0 Buruk | <-10 Sangat Buruk`;

  // ── INIT ──
  function init() {
    const saved = sessionStorage.getItem('gnet_gemini_key');
    if (saved) { apiKey = saved; showPanel(); }

    const inp = document.getElementById('aiChatInput');
    if (inp) {
      inp.addEventListener('input', () => {
        inp.style.height = 'auto';
        inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
      });
    }

    document.querySelectorAll('.ai-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!isStreaming && QUICK_PROMPTS[btn.dataset.prompt])
          runQuickPrompt(btn.dataset.prompt, btn);
      });
    });
  }

  // ── KEY MANAGEMENT ──
  function saveKey() {
    const input = document.getElementById('aiApiKeyInput');
    const key   = (input?.value || '').trim();
    if (key.length < 20) {
      if (input) { input.style.animation='none'; input.offsetHeight; input.style.animation='shake 0.4s ease'; setTimeout(()=>input.style.animation='',400); }
      showKeyError('API key tidak valid. Pastikan key berasal dari Google AI Studio.');
      return;
    }
    apiKey = key;
    sessionStorage.setItem('gnet_gemini_key', key);
    showPanel();
  }

  function changeKey() {
    apiKey = '';
    sessionStorage.removeItem('gnet_gemini_key');
    document.getElementById('aiPanel').style.display   = 'none';
    document.getElementById('aiApiGate').style.display = 'block';
    const inp = document.getElementById('aiApiKeyInput');
    if (inp) { inp.value = ''; inp.focus(); }
  }

  function showKeyError(msg) {
    const gate = document.getElementById('aiApiGate');
    let err = gate?.querySelector('.ai-key-err');
    if (!err && gate) {
      err = document.createElement('div');
      err.className = 'ai-key-err';
      err.style.cssText = 'color:var(--red);font-family:var(--mono);font-size:11px;margin-top:8px;padding:6px 10px;background:rgba(248,113,113,0.08);border-radius:4px;border:1px solid rgba(248,113,113,0.2)';
      gate.querySelector('.ai-key-row')?.after(err);
    }
    if (err) err.textContent = '✕ ' + msg;
  }

  function showPanel() {
    document.getElementById('aiApiGate').style.display = 'none';
    document.getElementById('aiPanel').style.display   = 'block';
  }

  // ── QUICK PROMPT ──
  async function runQuickPrompt(key, btn) {
    btn.classList.add('loading');
    await sendMessage(QUICK_PROMPTS[key]);
    btn.classList.remove('loading');
  }

  // ── SEND CHAT ──
  async function sendChat() {
    const inp = document.getElementById('aiChatInput');
    const msg = inp?.value.trim();
    if (!msg || isStreaming) return;
    inp.value = ''; inp.style.height = 'auto';
    await sendMessage(msg);
  }

  // ── CORE SEND → Gemini Streaming ──
  async function sendMessage(userMsg) {
    if (!apiKey || isStreaming) return;
    isStreaming = true;

    if (!dataContext) dataContext = buildContext();
    if (!dataContext) {
      appendMessage('ai', '⚠ Tidak ada data drive test. Upload file TXT dulu.');
      isStreaming = false; return;
    }

    document.getElementById('aiMessages')?.querySelector('.ai-welcome')?.remove();
    appendMessage('user', userMsg);

    // Build history for Gemini (user/model alternating)
    chatHistory.push({ role:'user', parts:[{ text: userMsg }] });

    // Inject data context into first user turn
    const contents = chatHistory.map((turn, i) => {
      if (i === 0 && turn.role === 'user') {
        return { role:'user', parts:[{ text:`Data drive test:\n\n${dataContext}\n\n---\n${turn.parts[0].text}` }] };
      }
      return turn;
    });

    setTyping(true); setSendEnabled(false);

    try {
      const res = await fetch(
        `${API_BASE}/${MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`,
        { method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            system_instruction: { parts:[{ text: SYSTEM }] },
            contents,
            generationConfig: { temperature:0.7, maxOutputTokens:2048, topP:0.9 }
          })
        }
      );

      if (!res.ok) {
        const e = await res.json().catch(()=>({}));
        throw new Error(e?.error?.message || `HTTP ${res.status}`);
      }

      setTyping(false);
      const bubble  = createStreamBubble();
      let fullText  = '';
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value, {stream:true}).split('\n').filter(l=>l.startsWith('data: '));
        for (const line of lines) {
          const raw = line.slice(6).trim();
          if (!raw || raw==='[DONE]') continue;
          try {
            const delta = JSON.parse(raw)?.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (delta) { fullText += delta; renderStreamBubble(bubble, fullText); scrollToBottom(); }
          } catch(_) {}
        }
      }

      finalizeBubble(bubble, fullText);
      chatHistory.push({ role:'model', parts:[{ text: fullText }] });
      if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);

    } catch(err) {
      setTyping(false);
      let msg = `**Error:** ${err.message}`;
      if (err.message.includes('API_KEY_INVALID') || err.message.includes('400'))
        msg = '**API Key tidak valid.** Cek kembali key dari Google AI Studio dan klik "Ganti Key".';
      else if (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'))
        msg = '**Rate limit.** Free tier: 15 request/menit. Tunggu sebentar lalu coba lagi.';
      appendMessage('ai', msg);
    }

    isStreaming = false; setSendEnabled(true);
  }

  // ── UI ──
  function appendMessage(role, text) {
    const msgs = document.getElementById('aiMessages');
    if (!msgs) return;
    const isAi = role==='ai';
    const div  = document.createElement('div');
    div.className = `ai-message${isAi?'':' ai-message-user'}`;
    div.innerHTML = `
      <div class="ai-msg-avatar ${isAi?'ai-msg-avatar-ai':'ai-msg-avatar-user'}">${isAi?'✦':'👤'}</div>
      <div class="ai-msg-bubble ${isAi?'ai-msg-bubble-ai':'ai-msg-bubble-user'}">${isAi?md(text):esc(text)}</div>`;
    msgs.appendChild(div); scrollToBottom();
  }

  function createStreamBubble() {
    const msgs = document.getElementById('aiMessages');
    const div  = document.createElement('div');
    div.className = 'ai-message';
    div.innerHTML = `<div class="ai-msg-avatar ai-msg-avatar-ai">✦</div><div class="ai-msg-bubble ai-msg-bubble-ai"><span class="ai-cursor"></span></div>`;
    msgs?.appendChild(div); scrollToBottom();
    return div.querySelector('.ai-msg-bubble-ai');
  }
  function renderStreamBubble(b, t) { b.innerHTML = md(t) + '<span class="ai-cursor"></span>'; }
  function finalizeBubble(b, t)     { b.innerHTML = md(t); }
  function setTyping(s)  { const e=document.getElementById('aiTyping'); if(e) e.style.display=s?'flex':'none'; }
  function setSendEnabled(s) { ['aiSendBtn','aiChatInput'].forEach(id=>{const e=document.getElementById(id);if(e)e.disabled=!s;}); }
  function scrollToBottom() { const m=document.getElementById('aiMessages'); if(m) m.scrollTop=m.scrollHeight; }

  // ── MARKDOWN ──
  function md(raw) {
    let t = esc(raw);
    // code block
    t = t.replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre>$1</pre>');
    // headers
    t = t.replace(/^#{3} (.+)$/gm,'<h3>$1</h3>').replace(/^#{2} (.+)$/gm,'<h3>$1</h3>').replace(/^# (.+)$/gm,'<h3>$1</h3>');
    // bold/italic
    t = t.replace(/\*\*\*(.+?)\*\*\*/g,'<strong><em>$1</em></strong>').replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+?)\*/g,'<em>$1</em>');
    // inline code
    t = t.replace(/`([^`]+)`/g,'<code>$1</code>');
    // hr
    t = t.replace(/^---+$/gm,'<hr>');
    // ul/ol
    t = t.replace(/((?:^[-*•] .+$\n?)+)/gm, b => '<ul>'+b.trim().split('\n').map(l=>`<li>${l.replace(/^[-*•] /,'')}</li>`).join('')+'</ul>');
    t = t.replace(/((?:^\d+\. .+$\n?)+)/gm, b => '<ol>'+b.trim().split('\n').map(l=>`<li>${l.replace(/^\d+\. /,'')}</li>`).join('')+'</ol>');
    // paragraphs
    t = t.split(/\n\n+/).map(b=>{ b=b.trim(); if(!b) return ''; if(/^<(h3|ul|ol|pre|hr)/.test(b)) return b; return '<p>'+b.replace(/\n/g,'<br>')+'</p>'; }).join('');
    // colorize dBm
    t = t.replace(/(-1[01]\d|-\d{2,3}(?:\.\d)?)\s*dBm/g,(m,v)=>{const n=parseFloat(v);return `<span class="${n>-80?'ai-badge-good':n>-100?'ai-badge-warn':'ai-badge-bad'}">${m}</span>`;});
    return t;
  }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  return { init, saveKey, changeKey, sendChat, runQuickPrompt };
})();

// shake keyframe
const ss=document.createElement('style');
ss.textContent='@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}';
document.head.appendChild(ss);

document.addEventListener('DOMContentLoaded', () => setTimeout(()=>AIAnalyst.init(), 600));
