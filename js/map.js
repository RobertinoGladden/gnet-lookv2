/* ═══════════════════════════════════════════════
   MAP.JS — Leaflet map: signal layers + events
   GNet Analyzer v3.0
═══════════════════════════════════════════════ */

'use strict';

window.GNetMap = (() => {
  let map = null;
  let layers = {};
  let currentLayer = 'rsrp';

  // ── COLOR FUNCTIONS ──
  const COLOR = {
    rsrp: v => v > -80  ? '#60a5fa' : v > -90  ? '#4ade80' : v > -100 ? '#facc15' : v > -110 ? '#fb923c' : '#f87171',
    rsrq: v => v > -9   ? '#60a5fa' : v > -10  ? '#4ade80' : v > -15  ? '#facc15' : v > -19  ? '#fb923c' : '#f87171',
    snr:  v => v > 20   ? '#60a5fa' : v > 10   ? '#4ade80' : v > 0    ? '#facc15' : v > -10  ? '#fb923c' : '#f87171',
  };

  const LEGENDS = {
    rsrp: [['#60a5fa','> −80 dBm (Sangat Baik)'],['#4ade80','−80 ~ −90 (Bagus)'],['#facc15','−90 ~ −100 (Normal)'],['#fb923c','−100 ~ −110 (Buruk)'],['#f87171','< −110 (Sangat Buruk)']],
    rsrq: [['#60a5fa','> −9 dB (Excellent)'],['#4ade80','−9 ~ −10 (Best)'],['#facc15','−10 ~ −15 (Good)'],['#fb923c','−15 ~ −19 (Poor)'],['#f87171','< −19 (Bad)']],
    snr:  [['#60a5fa','> 20 dB'],['#4ade80','10 ~ 20 dB'],['#facc15','0 ~ 10 dB'],['#fb923c','−10 ~ 0 dB'],['#f87171','< −10 dB']],
    rawan:[['#f87171','RSRP < −100  |  RSRQ < −19  |  SNR < −10']],
  };

  // ── BUILD MAP ──
  function build(DATA) {
    const gps = DATA.filter(d => d.lat !== null && d.lon !== null && d.lat !== 0 && d.lon !== 0);
    if (!gps.length) return;

    if (map) { map.remove(); map = null; }

    const avgLat = gps.reduce((s,d)=>s+d.lat,0) / gps.length;
    const avgLon = gps.reduce((s,d)=>s+d.lon,0) / gps.length;

    map = L.map('map', { preferCanvas: true, zoomControl: false }).setView([avgLat, avgLon], 14);

    // Zoom control bottom-right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // CARTO dark tile (no referer required)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    // Init layer groups
    layers = {
      rsrp:     L.layerGroup(),
      rsrq:     L.layerGroup(),
      snr:      L.layerGroup(),
      rawan:    L.layerGroup(),
      handover: L.layerGroup(),
      reselect: L.layerGroup(),
    };

    // Thin GPS for perf
    const step = Math.max(1, Math.floor(gps.length / 1500));
    const thinned = gps.filter((_, i) => i % step === 0);

    thinned.forEach(d => {
      const popupHtml = `
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.6;min-width:180px">
          <div style="color:#38bdf8;font-weight:600;margin-bottom:4px">${d.timePart || ''}</div>
          <div>RSRP: <b style="color:${COLOR.rsrp(d.rsrp)}">${d.rsrp} dBm</b></div>
          <div>RSRQ: <b style="color:${COLOR.rsrq(d.rsrq)}">${d.rsrq} dB</b></div>
          <div>SNR:  <b style="color:${COLOR.snr(d.snr)}">${d.snr} dB</b></div>
          <hr style="border-color:rgba(56,189,248,0.2);margin:5px 0">
          <div style="color:#4a6682">Cell: ${d.cellname || '—'}</div>
          <div style="color:#4a6682">eNB:  ${d.node || '—'}</div>
          <div style="color:#4a6682">Speed: ${(d.speed*3.6).toFixed(0)} km/h</div>
        </div>`;

      const opts = (color) => ({ radius:4, fillColor:color, color:'rgba(0,0,0,0.25)', weight:0.5, fillOpacity:0.85 });

      L.circleMarker([d.lat, d.lon], opts(COLOR.rsrp(d.rsrp))).bindPopup(popupHtml, {maxWidth:240}).addTo(layers.rsrp);
      L.circleMarker([d.lat, d.lon], opts(COLOR.rsrq(d.rsrq))).bindPopup(popupHtml, {maxWidth:240}).addTo(layers.rsrq);
      L.circleMarker([d.lat, d.lon], opts(COLOR.snr(d.snr))).bindPopup(popupHtml, {maxWidth:240}).addTo(layers.snr);

      if (d.rsrp < -100 || d.rsrq < -19 || d.snr < -10) {
        const issues = [];
        if (d.rsrp < -100) issues.push(`RSRP: <b style="color:#f87171">${d.rsrp}</b>`);
        if (d.rsrq < -19)  issues.push(`RSRQ: <b style="color:#f87171">${d.rsrq}</b>`);
        if (d.snr  < -10)  issues.push(`SNR: <b style="color:#f87171">${d.snr}</b>`);
        L.circleMarker([d.lat, d.lon], {
          radius:6, fillColor:'#f87171', color:'#fff', weight:1.5, fillOpacity:0.9
        }).bindPopup(`
          <div style="font-family:'JetBrains Mono',monospace;font-size:11px">
            <div style="color:#f87171;font-weight:700;margin-bottom:6px">⚠ TITIK RAWAN</div>
            <div style="color:#38bdf8">${d.timePart || ''}</div>
            <div style="margin-top:4px">${issues.join('<br>')}</div>
            <hr style="border-color:rgba(248,113,113,0.2);margin:5px 0">
            <div style="color:#4a6682">Cell: ${d.cellname||'—'} / eNB: ${d.node||'—'}</div>
          </div>`, {maxWidth:220}).addTo(layers.rawan);
      }
    });

    // Activate RSRP layer
    layers.rsrp.addTo(map);
    currentLayer = 'rsrp';
    updateLegend('rsrp');
    updateStats(DATA);

    // Fit bounds
    if (thinned.length > 1) {
      const bounds = L.latLngBounds(thinned.map(d => [d.lat, d.lon]));
      map.fitBounds(bounds, { padding: [20, 20] });
    }
  }

  // ── ADD EVENTS (KML) ──
  function addEvents(events) {
    if (!map) return;
    layers.handover.clearLayers();
    layers.reselect.clearLayers();

    events.forEach(ev => {
      const isHO = ev.type === 'HANDOVER';
      const color = isHO ? '#fbbf24' : '#c084fc';
      const sym = isHO ? '⇄' : '↺';
      const layerKey = isHO ? 'handover' : 'reselect';

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:22px;height:22px;border-radius:50%;background:${color}20;border:2px solid ${color};display:flex;align-items:center;justify-content:center;font-size:9px;color:${color};font-weight:700;box-shadow:0 0 8px ${color}55;transition:transform 0.2s" title="${ev.type}">${sym}</div>`,
        iconSize: [22,22], iconAnchor: [11,11]
      });

      const rsrpVal = parseInt(ev.rsrp);
      const rsrpColor = isNaN(rsrpVal) ? '#94aabf' : COLOR.rsrp(rsrpVal);

      L.marker([ev.lat, ev.lon], { icon }).bindPopup(`
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;line-height:1.7;min-width:210px">
          <div style="color:${color};font-weight:700;font-size:12px;margin-bottom:4px">${sym} ${ev.type}</div>
          <div style="color:#4a6682;margin-bottom:6px">${ev.timeDisp || ev.time}</div>
          <div><span style="color:#4a6682">From:</span> ${ev.fromCell}</div>
          <div><span style="color:#4a6682">To:</span>   ${ev.toCell}</div>
          <hr style="border-color:rgba(56,189,248,0.15);margin:6px 0">
          <div>RSRP: <b style="color:${rsrpColor}">${ev.rsrp}</b> &nbsp; RSRQ: <b>${ev.rsrq}</b> &nbsp; SNR: <b>${ev.snr}</b></div>
          <div style="color:#4a6682;margin-top:3px">eNB: ${ev.enb} &nbsp; Cell: ${ev.cellid}</div>
          <div style="color:#4a6682">DL: ${ev.dl} &nbsp; UL: ${ev.ul} &nbsp; ${ev.speed}</div>
        </div>`, { maxWidth: 280 }).addTo(layers[layerKey]);
    });
  }

  // ── SWITCH LAYER ──
  function switchLayer(type) {
    if (!map) return;
    ['rsrp','rsrq','snr','rawan'].forEach(k => { if (map.hasLayer(layers[k])) map.removeLayer(layers[k]); });
    if (layers[type]) layers[type].addTo(map);
    currentLayer = type;
    updateLegend(type);

    document.querySelectorAll('.map-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.layer === type);
    });
  }

  // ── TOGGLE EVENT LAYER ──
  function toggleEventLayer(type) {
    if (!map) return;
    const layerKey = type === 'handover' ? 'handover' : 'reselect';
    const btnId    = type === 'handover' ? 'btnHandover' : 'btnReselect';
    const btn = document.getElementById(btnId);
    const layer = layers[layerKey];
    if (!layer) return;

    const isOn = map.hasLayer(layer);
    if (isOn) {
      map.removeLayer(layer);
      if (btn) btn.dataset.active = 'false';
    } else {
      layer.addTo(map);
      if (btn) btn.dataset.active = 'true';
    }
  }

  // ── UPDATE LEGEND ──
  function updateLegend(type) {
    const el = document.getElementById('mapLegend');
    if (!el) return;
    const cfg = LEGENDS[type] || [];
    el.innerHTML = cfg.map(([c,l]) =>
      `<span style="display:flex;align-items:center;gap:4px">
        <span style="width:9px;height:9px;border-radius:50%;background:${c};display:inline-block;flex-shrink:0"></span>
        ${l}
      </span>`
    ).join('');
  }

  // ── UPDATE STATS OVERLAY ──
  function updateStats(DATA) {
    const el = document.getElementById('mapStats');
    if (!el) return;
    const gps = DATA.filter(d => d.lat && d.lon);
    const avg = k => (DATA.reduce((s,d)=>s+d[k],0)/DATA.length).toFixed(1);
    el.innerHTML = `
      <div style="color:#4a6682;font-size:9px;margin-bottom:6px;letter-spacing:0.1em">STATISTIK</div>
      <div>GPS pts: <b style="color:#38bdf8">${gps.length.toLocaleString()}</b></div>
      <div>RSRP avg: <b>${avg('rsrp')} dBm</b></div>
      <div>RSRQ avg: <b>${avg('rsrq')} dB</b></div>
      <div>SNR avg: <b>${avg('snr')} dB</b></div>`;
  }

  function getInstance() { return map; }

  return { build, addEvents, switchLayer, toggleEventLayer, getInstance };
})();

// ── GLOBAL WRAPPERS ──
function toggleEventLayer(type) { GNetMap.toggleEventLayer(type); }
