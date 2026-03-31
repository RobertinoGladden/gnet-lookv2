/* ═══════════════════════════════════════════════
   PARSER.JS — G-NetTrack Pro TXT & KML parser
   GNet Analyzer v3.0
═══════════════════════════════════════════════ */

'use strict';

window.GNetParser = (() => {

  // ── COLUMN MAP (G-NetTrack Pro export) ──
  const C = {
    ts:0, lon:1, lat:2, speed:3,
    operator:4, mcc:5, cgi:6, cellname:7,
    node:8, cellid:9, lac:10, tech:11, mode:12,
    level:13, qual:14, snr:15, cqi:16, lte_rssi:17,
    arfcn:18, dl:19, ul:20,
    altitude:22, height:23, accuracy:24,
    state:27,
    ping_avg:28, ping_min:29, ping_max:30,
    dl_test:32, ul_test:33,
    device:53, band:54, bw:55
  };

  // ── PARSE TXT ──
  function parseTxt(text) {
    const lines = text.trim().split('\n');
    const rows = [];
    const headers = lines[0] ? lines[0].split('\t') : [];

    for (let i = 1; i < lines.length; i++) {
      const p = lines[i].split('\t');
      if (p.length < 20) continue;

      const lat  = parseFloat(p[C.lat]);
      const lon  = parseFloat(p[C.lon]);
      const rsrp = parseFloat(p[C.level]);
      const rsrq = parseFloat(p[C.qual]);
      const snr  = parseFloat(p[C.snr]);
      if (isNaN(rsrp) || isNaN(rsrq) || isNaN(snr)) continue;

      // Parse timestamp: "2026.03.31_14.43.00"
      const tsRaw = p[C.ts] || '';
      const tsDisp = tsRaw.replace('_',' ').replace(/\./g,':');
      const timePart = tsRaw.includes('_') ? tsRaw.split('_')[1].replace(/\./g,':') : tsRaw;

      rows.push({
        ts: tsRaw, tsDisp, timePart,
        lat: isNaN(lat) ? null : lat,
        lon: isNaN(lon) ? null : lon,
        rsrp, rsrq, snr,
        speed:    parseFloat(p[C.speed]) || 0,
        operator: (p[C.operator] || '').trim(),
        cgi:      (p[C.cgi] || '').trim(),
        cellname: (p[C.cellname] || '').trim(),
        node:     (p[C.node] || '').trim(),
        cellid:   (p[C.cellid] || '').trim(),
        lac:      (p[C.lac] || '').trim(),
        tech:     (p[C.tech] || '').trim(),
        arfcn:    (p[C.arfcn] || '').trim(),
        dl:       parseFloat(p[C.dl]) || 0,
        ul:       parseFloat(p[C.ul]) || 0,
        band:     (p[C.band] || '').trim(),
        bw:       (p[C.bw] || '').trim(),
        device:   (p[C.device] || '').trim(),
        state:    (p[C.state] || '').trim(),
        cqi:      p[C.cqi] || '',
        ping_avg: parseFloat(p[C.ping_avg]) || null,
      });
    }
    return rows;
  }

  // ── PARSE KML ──
  function parseKml(xmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlText, 'text/xml');
    if (doc.querySelector('parsererror')) return [];

    const placemarks = doc.querySelectorAll('Placemark');
    const events = [];

    placemarks.forEach(pm => {
      const coordEl = pm.querySelector('coordinates');
      if (!coordEl) return;

      const [lonStr, latStr] = coordEl.textContent.trim().split(',');
      const lat = parseFloat(latStr), lon = parseFloat(lonStr);
      if (isNaN(lat) || isNaN(lon)) return;

      const getData = name => {
        for (const el of pm.querySelectorAll('Data')) {
          if (el.getAttribute('name') === name) {
            const v = el.querySelector('value');
            return v ? v.textContent.trim() : '';
          }
        }
        return '';
      };

      const info = getData('INFO') || pm.querySelector('n')?.textContent?.trim() || '';
      const isHO  = info.includes('HANDOVER');
      const isRS  = info.includes('RESELECTION');
      if (!isHO && !isRS) return;

      const details = getData('DETAILS');
      const fromTo  = details.split(':');

      events.push({
        type:     isHO ? 'HANDOVER' : 'RESELECTION',
        lat, lon,
        time:     getData('TIME'),
        timeDisp: getData('TIME').replace('_',' ').replace(/\./g,':'),
        details,
        fromCell: fromTo[0] || '—',
        toCell:   fromTo[1] || '—',
        rsrp:     getData('RSRP'),
        rsrq:     getData('RSRQ'),
        snr:      getData('SNR'),
        enb:      getData('eNB'),
        cellid:   getData('CELLID'),
        cellname: getData('CELLNAME'),
        dl:       getData('DL_BITRATE'),
        ul:       getData('UL_BITRATE'),
        speed:    getData('SPEED'),
        cqi:      getData('CQI'),
      });
    });

    return events;
  }

  // ── COMPUTE STATS ──
  function stats(arr, key) {
    const vals = arr.map(d => d[key]).filter(v => v !== null && !isNaN(v));
    if (!vals.length) return { avg: 0, min: 0, max: 0, count: 0 };
    const sum = vals.reduce((a,b) => a+b, 0);
    return {
      avg:   parseFloat((sum / vals.length).toFixed(1)),
      min:   parseFloat(Math.min(...vals).toFixed(1)),
      max:   parseFloat(Math.max(...vals).toFixed(1)),
      count: vals.length
    };
  }

  // ── DURATION ──
  function calcDuration(t0, t1) {
    try {
      const parse = t => {
        const clean = t.replace('_','T').replace(/\./g,':');
        // "2026:03:31T14:43:00" → need dashes for date part
        const [date, time] = clean.split('T');
        const [y, m, d] = date.split(':');
        return new Date(`${y}-${m}-${d}T${time}`);
      };
      const diff = (parse(t1) - parse(t0)) / 1000;
      if (isNaN(diff) || diff < 0) return '—';
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = Math.round(diff % 60);
      return h > 0 ? `${h}j ${m}m ${s}s` : `${m}m ${s}s`;
    } catch { return '—'; }
  }

  // ── THIN (subsample for performance) ──
  function thin(arr, maxPts = 800) {
    if (arr.length <= maxPts) return arr;
    const step = Math.ceil(arr.length / maxPts);
    return arr.filter((_, i) => i % step === 0);
  }

  return { parseTxt, parseKml, stats, calcDuration, thin };
})();
