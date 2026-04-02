/* ═══════════════════════════════════════════════
   DASHBOARD.JS — Dashboard controller
   GNet Analyzer v3.0
═══════════════════════════════════════════════ */

'use strict';

let DATA   = [];
let EVENTS = [];

// Expose globally for AI module
Object.defineProperty(window, 'DATA',   { get: () => DATA });
Object.defineProperty(window, 'EVENTS', { get: () => EVENTS });

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupSidebar();
  setupChartTabs();
  setupMapLayerBtns();
  setupScrollSpy();
  setupScrollTop();
});

function loadData() {
  try {
    const raw = sessionStorage.getItem('gnet_data');
    if (!raw) { showNoData(); return; }
    DATA = JSON.parse(raw);
    if (!DATA.length) { showNoData(); return; }

    const evRaw = sessionStorage.getItem('gnet_events');
    if (evRaw) EVENTS = JSON.parse(evRaw);

    const storedFilename = sessionStorage.getItem('gnet_filename');
    const fallbackFiles   = JSON.parse(sessionStorage.getItem('gnet_files') || '[]');
    const filename = storedFilename || (Array.isArray(fallbackFiles) && fallbackFiles.length ? fallbackFiles.join(', ') : 'unknown');
    document.getElementById('fileInfoBadge').textContent = filename;
    document.getElementById('topbarTitle').textContent = `${filename} — ${DATA.length.toLocaleString()} pts`;

    document.getElementById('loadingState').style.display = 'none';
    document.getElementById('dashContent').style.display  = 'block';

    buildAll();
  } catch(e) {
    console.error(e);
    showNoData();
  }
}

function showNoData() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('noDataState').style.display  = 'flex';
}

function buildAll() {
  buildInfo();
  buildCell();
  buildKPI();
  GNetCharts.buildAll(DATA);
  GNetMap.build(DATA);
  if (EVENTS.length) {
    GNetMap.addEvents(EVENTS);
    buildEvents();
  }
  buildDistribution();
  buildRawan();
}

// ═══════════════════════════════════════════════
// 01 INFO
// ═══════════════════════════════════════════════
function buildInfo() {
  const first = DATA[0], last = DATA[DATA.length-1];
  const dur  = GNetParser.calcDuration(first.ts, last.ts);
  const gps  = DATA.filter(d => d.lat && d.lon);
  const avgSpd = (DATA.reduce((s,d)=>s+d.speed,0)/DATA.length*3.6).toFixed(1);
  const op   = first.operator || '—';
  const tech = first.tech || '4G';
  const dev  = (first.device||'').split(':').slice(0,2).join(' ') || '—';
  const dt   = first.ts.substring(0,10).replace(/\./g,'-');

  document.getElementById('infoGrid').innerHTML = cards([
    { label:'Tanggal', value: dt, sub: first.tsDisp?.substring(11) + ' — ' + last.tsDisp?.substring(11) },
    { label:'Durasi',  value: dur, sub: 'Total waktu pengukuran' },
    { label:'Operator', value: op, sub: 'Jaringan: ' + tech },
    { label:'Total Data Point', value: DATA.length.toLocaleString(), sub: `GPS valid: ${gps.length.toLocaleString()}` },
    { label:'Kec. Rata-rata',   value: avgSpd + ' km/h', sub: 'Drive test mode' },
    { label:'Device', value: dev, sub: 'Samsung', mono: true },
  ]);
}

// ═══════════════════════════════════════════════
// 02 CELL
// ═══════════════════════════════════════════════
function buildCell() {
  const cells = {};
  DATA.forEach(d => { if (d.cellname) cells[d.cellname] = (cells[d.cellname]||0)+1; });
  const dom = Object.entries(cells).sort((a,b)=>b[1]-a[1]);
  const first = DATA[0];
  const uniqueCells = dom.length;

  document.getElementById('cellGrid').innerHTML = cards([
    { label:'eNodeB (Node)', value: first.node||'—', sub:'Serving eNB ID', mono:true },
    { label:'Cell ID',       value: first.cellid||'—', sub:'Cell Identity', mono:true },
    { label:'LAC / TAC',     value: first.lac||'—', sub:'Location Area Code', mono:true },
    { label:'ARFCN',         value: first.arfcn||'—', sub:'Absolute RF Channel', mono:true },
    { label:'Band LTE',      value: first.band ? 'Band ' + first.band : '—', sub:'LTE Band' },
    { label:'Bandwidth',     value: first.bw ? first.bw + ' MHz' : '—', sub:'Channel Bandwidth' },
    { label:'Dominant Cell', value: dom[0]?.[0]||'—', sub: dom[0] ? dom[0][1].toLocaleString() + ' data points' : '' },
    { label:'Total Unique Cells', value: uniqueCells, sub: uniqueCells > 3 ? '⇄ Banyak handover' : 'Stabil' },
  ]);
}

function cards(items) {
  return items.map(it => `
    <div class="info-card">
      <div class="ic-label">${it.label}</div>
      <div class="ic-value${it.mono?' mono':''}">${it.value}</div>
      ${it.sub ? `<div class="ic-sub">${it.sub}</div>` : ''}
    </div>`).join('');
}

// ═══════════════════════════════════════════════
// 03 KPI
// ═══════════════════════════════════════════════
function buildKPI() {
  const avg = k => (DATA.reduce((s,d)=>s+d[k],0)/DATA.length).toFixed(1);
  const min = k => Math.min(...DATA.map(d=>d[k])).toFixed(1);
  const max = k => Math.max(...DATA.map(d=>d[k])).toFixed(1);

  const setKpi = (id, val, badgeId, good, warn, labels) => {
    const el = document.getElementById(id);
    const cls = val > good ? 'v-good' : val > warn ? 'v-warn' : 'v-bad';
    el.className = 'kpi-val ' + cls;
    el.textContent = val;
    const bdg = document.getElementById(badgeId);
    const bCls = val > good ? 'badge badge-good' : val > warn ? 'badge badge-warn' : 'badge badge-bad';
    const txt  = val > good ? labels[0] : val > warn ? labels[1] : labels[2];
    bdg.innerHTML = `<span class="${bCls}">${txt}</span>`;
  };

  const aRsrp = parseFloat(avg('rsrp'));
  const aRsrq = parseFloat(avg('rsrq'));
  const aSnr  = parseFloat(avg('snr'));

  setKpi('kpiRsrp', aRsrp, 'kpiRsrpBadge', -80, -100, ['SANGAT BAIK','NORMAL','BURUK']);
  setKpi('kpiRsrq', aRsrq, 'kpiRsrqBadge', -10, -15,  ['EXCELLENT','GOOD','POOR']);
  setKpi('kpiSnr',  aSnr,  'kpiSnrBadge',   5,   0,   ['BAIK','CUKUP','BURUK']);

  const dlArr = DATA.map(d=>d.dl).filter(x=>x>0);
  const ulArr = DATA.map(d=>d.ul).filter(x=>x>0);
  const avgDl = dlArr.length ? (dlArr.reduce((s,v)=>s+v,0)/dlArr.length/1000).toFixed(2) : '—';
  const maxDl = dlArr.length ? (Math.max(...dlArr)/1000).toFixed(2) : '—';
  const avgUl = ulArr.length ? (ulArr.reduce((s,v)=>s+v,0)/ulArr.length/1000).toFixed(2) : '—';
  const maxUl = ulArr.length ? (Math.max(...ulArr)/1000).toFixed(2) : '—';

  document.getElementById('rawanBadge').textContent = DATA.filter(d=>d.rsrp<-100||d.rsrq<-19||d.snr<-10).length;

  document.getElementById('kpiExtra').innerHTML = `
    ${extraCard('RSRP Min', min('rsrp')+' dBm')}
    ${extraCard('RSRP Max', max('rsrp')+' dBm')}
    ${extraCard('RSRQ Min', min('rsrq')+' dB')}
    ${extraCard('RSRQ Max', max('rsrq')+' dB')}
    ${extraCard('SNR Min',  min('snr')+' dB')}
    ${extraCard('SNR Max',  max('snr')+' dB')}
    ${extraCard('Avg DL', avgDl+' Mbps', 'Max: '+maxDl)}
    ${extraCard('Avg UL', avgUl+' Mbps', 'Max: '+maxUl)}
  `;
}

function extraCard(label, val, sub='') {
  return `<div class="info-card"><div class="ic-label">${label}</div><div class="ic-value mono">${val}</div>${sub?`<div class="ic-sub">${sub}</div>`:''}</div>`;
}

// ═══════════════════════════════════════════════
// 06 EVENTS
// ═══════════════════════════════════════════════
function buildEvents() {
  if (!EVENTS.length) return;

  const hoCount = EVENTS.filter(e=>e.type==='HANDOVER').length;
  const rsCount = EVENTS.filter(e=>e.type==='RESELECTION').length;

  // Update nav badge
  const nb = document.getElementById('eventsBadge');
  if (nb) { nb.textContent = EVENTS.length; nb.style.display = 'inline-block'; }

  const rows = EVENTS.slice(0, 150).map((ev, i) => {
    const isHO   = ev.type === 'HANDOVER';
    const color  = isHO ? '#fbbf24' : '#c084fc';
    const label  = isHO ? '⇄ HO' : '↺ RS';
    const rsrpN  = parseInt(ev.rsrp);
    const cls    = isNaN(rsrpN) ? '' : rsrpN < -100 ? 'td-bad' : rsrpN < -90 ? 'td-warn' : 'td-ok';
    const t      = ev.timeDisp ? ev.timeDisp.substring(11) : '';
    return `<tr>
      <td style="font-family:var(--mono);font-size:10px;color:var(--muted)">${i+1}</td>
      <td><span style="font-family:var(--mono);font-size:9px;padding:2px 7px;border-radius:3px;background:${color}18;color:${color};border:1px solid ${color}44">${label}</span></td>
      <td style="font-family:var(--mono);font-size:10px">${t}</td>
      <td style="font-size:10px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${ev.fromCell}">${ev.fromCell}</td>
      <td style="font-size:10px;max-width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${ev.toCell}">${ev.toCell}</td>
      <td class="${cls}">${ev.rsrp}</td>
      <td style="font-family:var(--mono);font-size:11px">${ev.rsrq}</td>
      <td style="font-family:var(--mono);font-size:11px">${ev.snr}</td>
      <td style="font-size:11px">${ev.enb||'—'}</td>
      <td style="font-size:10px;color:var(--muted)">${ev.speed}</td>
    </tr>`;
  }).join('');

  document.getElementById('eventsContent').innerHTML = `
    <div class="events-summary">
      ${extraCard('Handover 4G→4G', hoCount, 'Inter-cell HO')}
      ${extraCard('Cell Reselection', rsCount, 'Idle mode RS')}
      ${extraCard('Total Events', EVENTS.length, 'Ditampilkan: '+Math.min(150,EVENTS.length))}
      ${extraCard('eNB Unik', [...new Set(EVENTS.map(e=>e.enb))].length, 'Unique eNodeBs')}
    </div>
    <div class="events-tbl-wrap">
      <div class="events-tbl-hdr">
        📍 DAFTAR EVENTS (${Math.min(150,EVENTS.length)} / ${EVENTS.length})
        <div class="events-tbl-hdr-actions">
          <span onclick="toggleEventLayer('handover')">⇄ Toggle Handover Peta</span>
          <span onclick="toggleEventLayer('reselect')">↺ Toggle Reselect Peta</span>
        </div>
      </div>
      <div class="events-table-scroll">
        <table class="events-table">
          <thead><tr>
            <th>#</th><th>Tipe</th><th>Waktu</th><th>From Cell</th><th>To Cell</th>
            <th>RSRP</th><th>RSRQ</th><th>SNR</th><th>eNB</th><th>Speed</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
}

// Handle inline KML upload on dashboard
function handleInlineKML(input) {
  if (!input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const evts = GNetParser.parseKml(e.target.result);
    if (!evts.length) { showToast('Tidak ada event ditemukan dalam KML.'); return; }
    EVENTS = evts;
    sessionStorage.setItem('gnet_events', JSON.stringify(EVENTS));
    GNetMap.addEvents(EVENTS);
    buildEvents();
    showToast(`✓ ${evts.length} event dimuat`);
  };
  reader.readAsText(input.files[0]);
}

// ═══════════════════════════════════════════════
// 07 DISTRIBUSI
// ═══════════════════════════════════════════════
function buildDistribution() {
  const distRsrp = [
    { label:'> −80',     color:'#60a5fa', count: DATA.filter(d=>d.rsrp>-80).length },
    { label:'−80~−90',   color:'#4ade80', count: DATA.filter(d=>d.rsrp<=-80&&d.rsrp>-90).length },
    { label:'−90~−100',  color:'#facc15', count: DATA.filter(d=>d.rsrp<=-90&&d.rsrp>-100).length },
    { label:'−100~−110', color:'#fb923c', count: DATA.filter(d=>d.rsrp<=-100&&d.rsrp>-110).length },
    { label:'< −110',    color:'#f87171', count: DATA.filter(d=>d.rsrp<=-110).length },
  ];
  const distRsrq = [
    { label:'> −9',      color:'#60a5fa', count: DATA.filter(d=>d.rsrq>-9).length },
    { label:'−9~−10',    color:'#4ade80', count: DATA.filter(d=>d.rsrq<=-9&&d.rsrq>-10).length },
    { label:'−10~−15',   color:'#4ade80', count: DATA.filter(d=>d.rsrq<=-10&&d.rsrq>-15).length },
    { label:'−15~−19',   color:'#fb923c', count: DATA.filter(d=>d.rsrq<=-15&&d.rsrq>-19).length },
    { label:'< −19',     color:'#f87171', count: DATA.filter(d=>d.rsrq<=-19).length },
  ];
  const distSnr = [
    { label:'> 20',      color:'#60a5fa', count: DATA.filter(d=>d.snr>20).length },
    { label:'10~20',     color:'#4ade80', count: DATA.filter(d=>d.snr<=20&&d.snr>10).length },
    { label:'0~10',      color:'#facc15', count: DATA.filter(d=>d.snr<=10&&d.snr>0).length },
    { label:'−10~0',     color:'#fb923c', count: DATA.filter(d=>d.snr<=0&&d.snr>-10).length },
    { label:'< −10',     color:'#f87171', count: DATA.filter(d=>d.snr<=-10).length },
  ];

  renderDist('distRsrp', distRsrp);
  renderDist('distRsrq', distRsrq);
  renderDist('distSnr',  distSnr);
}

function renderDist(id, items) {
  const total = items.reduce((s,i)=>s+i.count,0) || 1;
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = items.map(item => {
    const pct = ((item.count / total) * 100).toFixed(1);
    return `<div class="dist-row">
      <div class="dist-lbl">${item.label}</div>
      <div class="dist-track">
        <div class="dist-fill" style="width:0%;background:${item.color}28;border-left:2px solid ${item.color}" data-w="${pct}">
          <span class="dist-pct">${pct}%</span>
        </div>
      </div>
      <div class="dist-cnt">${item.count.toLocaleString()}</div>
    </div>`;
  }).join('');

  // Animate bars after render
  requestAnimationFrame(() => {
    setTimeout(() => {
      el.querySelectorAll('.dist-fill').forEach(bar => {
        bar.style.width = bar.dataset.w + '%';
      });
    }, 100);
  });
}

// ═══════════════════════════════════════════════
// 08 TITIK RAWAN
// ═══════════════════════════════════════════════
function buildRawan() {
  const rawan = DATA.filter(d => d.rsrp < -100 || d.rsrq < -19 || d.snr < -10);
  const el = document.getElementById('rawanContent');
  if (!el) return;

  if (!rawan.length) {
    el.innerHTML = `<div class="info-card" style="text-align:center;padding:32px">
      <div style="font-size:32px;margin-bottom:10px">✅</div>
      <div style="color:var(--green);font-family:var(--cond);font-size:18px;font-weight:700">TIDAK ADA TITIK RAWAN</div>
      <div style="color:var(--muted);font-size:12px;margin-top:6px">Semua parameter dalam batas normal</div>
    </div>`;
    return;
  }

  const badRsrp  = DATA.filter(d=>d.rsrp<-100).length;
  const badRsrq  = DATA.filter(d=>d.rsrq<-19).length;
  const badSnr   = DATA.filter(d=>d.snr<-10).length;
  const pct      = v => ((v/DATA.length)*100).toFixed(1);
  const sample   = rawan.slice(0, 100);

  el.innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;margin-bottom:14px">
      ${extraCard('RSRP Rawan', `<span style="color:var(--red)">${badRsrp}</span>`, pct(badRsrp)+'% dari total')}
      ${extraCard('RSRQ Rawan', `<span style="color:var(--red)">${badRsrq}</span>`, pct(badRsrq)+'% dari total')}
      ${extraCard('SNR Rawan',  `<span style="color:var(--red)">${badSnr}</span>`,  pct(badSnr)+'% dari total')}
      ${extraCard('Total Rawan',`<span style="color:var(--amber)">${rawan.length}</span>`, pct(rawan.length)+'% dari total')}
    </div>
    <div class="danger-wrap">
      <div class="danger-hdr">⚠ DAFTAR TITIK RAWAN — ${Math.min(100,rawan.length)} dari ${rawan.length} titik</div>
      <div class="danger-scroll">
        <table>
          <thead><tr>
            <th>#</th><th>Waktu</th><th>RSRP</th><th>RSRQ</th><th>SNR</th>
            <th>Cell</th><th>Lat</th><th>Lon</th><th>Issue</th>
          </tr></thead>
          <tbody>${sample.map((d,i) => {
            const issues = [];
            if (d.rsrp<-100) issues.push('RSRP');
            if (d.rsrq<-19)  issues.push('RSRQ');
            if (d.snr<-10)   issues.push('SNR');
            return `<tr>
              <td style="font-family:var(--mono);font-size:10px;color:var(--muted)">${i+1}</td>
              <td style="font-family:var(--mono);font-size:10px">${d.timePart||''}</td>
              <td class="${d.rsrp<-100?'td-bad':'td-warn'}">${d.rsrp}</td>
              <td class="${d.rsrq<-19?'td-bad':'td-warn'}">${d.rsrq}</td>
              <td class="${d.snr<-10?'td-bad':d.snr<0?'td-warn':''}">${d.snr}</td>
              <td style="font-size:11px">${d.cellname||'—'}</td>
              <td style="font-family:var(--mono);font-size:9px;color:var(--muted)">${d.lat?d.lat.toFixed(5):'—'}</td>
              <td style="font-family:var(--mono);font-size:9px;color:var(--muted)">${d.lon?d.lon.toFixed(5):'—'}</td>
              <td>${issues.map(is=>`<span class="badge badge-bad" style="margin-right:2px">${is}</span>`).join('')}</td>
            </tr>`;
          }).join('')}</tbody>
        </table>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════
// UI INTERACTIONS
// ═══════════════════════════════════════════════

// ── SIDEBAR ──
function setupSidebar() {
  const toggle  = document.getElementById('menuToggle');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const close   = document.getElementById('sidebarClose');

  const open  = () => { sidebar.classList.add('open');    overlay.classList.add('visible'); };
  const closeFn = () => { sidebar.classList.remove('open'); overlay.classList.remove('visible'); };

  if (toggle)  toggle.addEventListener('click', () => sidebar.classList.contains('open') ? closeFn() : open());
  if (overlay) overlay.addEventListener('click', closeFn);
  if (close)   close.addEventListener('click', closeFn);

  // Close sidebar on nav click (mobile)
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeFn();
    });
  });
}

// ── CHART TABS ──
function setupChartTabs() {
  document.querySelectorAll('.chart-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.chart-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.chart-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const panelId = 'panel-' + tab.dataset.chart;
      const panel = document.getElementById(panelId);
      if (panel) panel.classList.add('active');
    });
  });
}

// ── MAP LAYER BUTTONS ──
function setupMapLayerBtns() {
  document.querySelectorAll('#mapLayerBtns .map-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      GNetMap.switchLayer(btn.dataset.layer);
    });
  });
}

// ── SCROLL SPY ──
function setupScrollSpy() {
  const sections  = document.querySelectorAll('.dash-section[id]');
  const navItems  = document.querySelectorAll('.nav-item[data-section]');
  const observer  = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        navItems.forEach(n => n.classList.remove('active'));
        const active = document.querySelector(`.nav-item[data-section="${e.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.25, rootMargin: '-60px 0px -40% 0px' });
  sections.forEach(s => observer.observe(s));
}

// ── SCROLL TO TOP ──
function setupScrollTop() {
  const btn = document.getElementById('scrollTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });
}

// ── TOAST ──
function showToast(msg, dur = 3000) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), dur);
}
