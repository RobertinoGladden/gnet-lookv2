/* ═══════════════════════════════════════════════
   MAP.JS — Leaflet map: signal layers + events
   GNet Analyzer v4.0 — Compact overlays
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

  // Compact legends — short labels for small overlay
  const LEGENDS = {
    rsrp: [
      ['#60a5fa', '> −80'],
      ['#4ade80', '−80~−90'],
      ['#facc15', '−90~−100'],
      ['#fb923c', '−100~−110'],
      ['#f87171', '< −110'],
    ],
    rsrq: [
      ['#60a5fa', '> −9'],
      ['#4ade80', '−9~−10'],
      ['#facc15', '−10~−15'],
      ['#fb923c', '−15~−19'],
      ['#f87171', '< −19'],
    ],
    snr: [
      ['#60a5fa', '> 20'],
      ['#4ade80', '10~20'],
      ['#facc15', '0~10'],
      ['#fb923c', '−10~0'],
      ['#f87171', '< −10'],
    ],
    rawan: [
      ['#f87171', '⚠ RSRP<−100 | RSRQ<−19 | SNR<−10'],
    ],
  };

  // Units for legend header
  const LEGEND_UNITS = {
    rsrp: 'RSRP (dBm)',
    rsrq: 'RSRQ (dB)',
    snr:  'SNR (dB)',
    rawan: 'Titik Rawan',
  };

  // ── BUILD MAP ──
  function build(DATA) {
    const gps = DATA.filter(d => d.lat !== null && d.lon !== null && d.lat !== 0 && d.lon !== 0);
    if (!gps.length) return;

    if (map) { map.remove(); map = null; }

    const avgLat = gps.reduce((s,d)=>s+d.lat,0) / gps.length;
    const avgLon = gps.reduce((s,d)=>s+d.lon,0) / gps.length;

    map = L.map('map', {
      preferCanvas: true,
      zoomControl: false,
      tap: true,               // better mobile touch
      tapTolerance: 15,
    }).setView([avgLat, avgLon], 14);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://carto.com/">CARTO</a> © <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      subdomains: 'abcd', maxZoom: 19
    }).addTo(map);

    layers = {
      rsrp:     L.layerGroup(),
      rsrq:     L.layerGroup(),
      snr:      L.layerGroup(),
      rawan:    L.layerGroup(),
      handover: L.layerGroup(),
      reselect: L.layerGroup(),
    };

    const step = Math.max(1, Math.floor(gps.length / 1500));
    const thinned = gps.filter((_, i) => i % step === 0);

    thinned.forEach(d => {
      const popupHtml = `
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.6;min-width:175px">
          <div style="color:#22d3ee;font-weight:600;margin-bottom:4px">${d.timePart || ''}</div>
          <div>RSRP: <b style="color:${COLOR.rsrp(d.rsrp)}">${d.rsrp} dBm</b></div>
          <div>RSRQ: <b style="color:${COLOR.rsrq(d.rsrq)}">${d.rsrq} dB</b></div>
          <div>SNR:  <b style="color:${COLOR.snr(d.snr)}">${d.snr} dB</b></div>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:5px 0">
          <div style="color:#50505a">Cell: ${d.cellname || '—'}</div>
          <div style="color:#50505a">eNB:  ${d.node || '—'}</div>
          <div style="color:#50505a">Speed: ${(d.speed*3.6).toFixed(0)} km/h</div>
        </div>`;

      const opts = (color) => ({
        radius: 3.5, fillColor: color,
        color: 'rgba(0,0,0,0.2)', weight: 0.5, fillOpacity: 0.88
      });

      L.circleMarker([d.lat, d.lon], opts(COLOR.rsrp(d.rsrp))).bindPopup(popupHtml, {maxWidth:230}).addTo(layers.rsrp);
      L.circleMarker([d.lat, d.lon], opts(COLOR.rsrq(d.rsrq))).bindPopup(popupHtml, {maxWidth:230}).addTo(layers.rsrq);
      L.circleMarker([d.lat, d.lon], opts(COLOR.snr(d.snr))).bindPopup(popupHtml, {maxWidth:230}).addTo(layers.snr);

      if (d.rsrp < -100 || d.rsrq < -19 || d.snr < -10) {
        const issues = [];
        if (d.rsrp < -100) issues.push(`RSRP: <b style="color:#ef4444">${d.rsrp}</b>`);
        if (d.rsrq < -19)  issues.push(`RSRQ: <b style="color:#ef4444">${d.rsrq}</b>`);
        if (d.snr  < -10)  issues.push(`SNR:  <b style="color:#ef4444">${d.snr}</b>`);
        L.circleMarker([d.lat, d.lon], {
          radius: 5.5, fillColor: '#ef4444',
          color: 'rgba(255,255,255,0.6)', weight: 1.2, fillOpacity: 0.92
        }).bindPopup(`
          <div style="font-family:'IBM Plex Mono',monospace;font-size:11px">
            <div style="color:#ef4444;font-weight:700;margin-bottom:5px">⚠ TITIK RAWAN</div>
            <div style="color:#22d3ee">${d.timePart || ''}</div>
            <div style="margin-top:5px">${issues.join('<br>')}</div>
            <hr style="border:none;border-top:1px solid rgba(239,68,68,0.2);margin:5px 0">
            <div style="color:#50505a">Cell: ${d.cellname||'—'} / eNB: ${d.node||'—'}</div>
          </div>`, {maxWidth:220}).addTo(layers.rawan);
      }
    });

    layers.rsrp.addTo(map);
    currentLayer = 'rsrp';
    updateLegend('rsrp');
    updateStats(DATA);

    if (thinned.length > 1) {
      const bounds = L.latLngBounds(thinned.map(d => [d.lat, d.lon]));
      map.fitBounds(bounds, { padding: [18, 18] });
    }
  }

  // ── ADD EVENTS (KML) ──
  function addEvents(events) {
    if (!map) return;
    layers.handover.clearLayers();
    layers.reselect.clearLayers();

    events.forEach(ev => {
      const isHO = ev.type === 'HANDOVER';
      const color = isHO ? '#eab308' : '#a855f7';
      const sym = isHO ? '⇄' : '↺';
      const layerKey = isHO ? 'handover' : 'reselect';

      const icon = L.divIcon({
        className: '',
        html: `<div style="width:20px;height:20px;border-radius:50%;background:${color}20;border:1.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:8px;color:${color};font-weight:700;box-shadow:0 0 7px ${color}44" title="${ev.type}">${sym}</div>`,
        iconSize: [20,20], iconAnchor: [10,10]
      });

      const rsrpVal = parseInt(ev.rsrp);
      const rsrpColor = isNaN(rsrpVal) ? '#8e8e97' : COLOR.rsrp(rsrpVal);

      L.marker([ev.lat, ev.lon], { icon }).bindPopup(`
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;line-height:1.65;min-width:200px">
          <div style="color:${color};font-weight:700;font-size:12px;margin-bottom:3px">${sym} ${ev.type}</div>
          <div style="color:#50505a;margin-bottom:5px">${ev.timeDisp || ev.time}</div>
          <div><span style="color:#50505a">From:</span> ${ev.fromCell}</div>
          <div><span style="color:#50505a">To:  </span> ${ev.toCell}</div>
          <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:5px 0">
          <div>RSRP: <b style="color:${rsrpColor}">${ev.rsrp}</b> &nbsp; RSRQ: <b>${ev.rsrq}</b> &nbsp; SNR: <b>${ev.snr}</b></div>
          <div style="color:#50505a;margin-top:3px">eNB: ${ev.enb} &nbsp; Cell: ${ev.cellid}</div>
          <div style="color:#50505a">DL: ${ev.dl} &nbsp; UL: ${ev.ul} &nbsp; ${ev.speed}</div>
        </div>`, { maxWidth: 270 }).addTo(layers[layerKey]);
    });
  }

  // ── SWITCH LAYER ──
  function switchLayer(type) {
    if (!map) return;
    ['rsrp','rsrq','snr','rawan'].forEach(k => {
      if (map.hasLayer(layers[k])) map.removeLayer(layers[k]);
    });
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

  // ── UPDATE LEGEND (compact) ──
  function updateLegend(type) {
    const el = document.getElementById('mapLegend');
    if (!el) return;
    const cfg = LEGENDS[type] || [];
    const unit = LEGEND_UNITS[type] || '';
    el.innerHTML =
      `<div style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;color:#50505a;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px">${unit}</div>` +
      cfg.map(([c,l]) =>
        `<span style="display:flex;align-items:center;gap:5px">
          <span style="width:7px;height:7px;border-radius:50%;background:${c};display:inline-block;flex-shrink:0"></span>
          <span style="color:#8e8e97;font-size:9.5px">${l}</span>
        </span>`
      ).join('');
  }

  // ── UPDATE STATS OVERLAY (compact) ──
  function updateStats(DATA) {
    const el = document.getElementById('mapStats');
    if (!el) return;
    const gps = DATA.filter(d => d.lat && d.lon);
    const avg = k => (DATA.reduce((s,d)=>s+d[k],0)/DATA.length).toFixed(1);
    el.innerHTML = `
      <div style="font-family:'IBM Plex Mono',monospace;font-size:8px;font-weight:600;color:#50505a;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:4px">Statistik</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:9.5px;color:#8e8e97">
        <div>GPS: <b style="color:#ececee">${gps.length.toLocaleString()}</b></div>
        <div>RSRP avg: <b>${avg('rsrp')} dBm</b></div>
        <div>RSRQ avg: <b>${avg('rsrq')} dB</b></div>
        <div>SNR avg: <b>${avg('snr')} dB</b></div>
      </div>`;
  }

  function getInstance() { return map; }

  return { build, addEvents, switchLayer, toggleEventLayer, getInstance };
})();

// ── GLOBAL WRAPPERS ──
function toggleEventLayer(type) { GNetMap.toggleEventLayer(type); }