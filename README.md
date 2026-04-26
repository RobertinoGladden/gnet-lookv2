# CAKRA v1.1.0

**Drive Test Intelligence** untuk RF Engineer — Analisis LTE & 5G NR dari G-NetTrack Pro, TEMS, NEMO, SIGMON. Web app statis + PWA yang berjalan langsung di browser.

![GNet Analyzer](https://img.shields.io/badge/version-1.1.0-38bdf8?style=flat-square) ![Static](https://img.shields.io/badge/type-static%20HTML-4ade80?style=flat-square) ![AI](https://img.shields.io/badge/AI-Groq%20LLM-a78bfa?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-c084fc?style=flat-square)

---

## ✨ Fitur

| Fitur | Deskripsi |
|---|---|
| 📡 **Import TXT** | Parse otomatis file `.txt` export G-NetTrack Pro (multi-file) |
| 📍 **Import KML** | Parse file `.kml` events (Handover, Cell Reselection) |
| 📈 **Grafik Interaktif** | RSRP, RSRQ, SNR, Throughput DL/UL dengan Chart.js |
| 🗺 **Peta Sinyal** | Leaflet map — layer RSRP/RSRQ/SNR/Rawan + Events overlay |
| ⇄ **Events** | Tabel dan marker Handover & Cell Reselection |
| 📊 **Distribusi** | Bar distribusi persentase per kategori |
| ⚠ **Titik Rawan** | Auto-deteksi titik di luar threshold |
| ⬇ **Export PNG** | Download setiap grafik sebagai gambar |
| **✦ AI Analyst** | **Analisis otomatis & chat interaktif berbasis Claude AI** |
| 📱 **Responsive** | Sidebar collapsible, mobile-friendly |

---

## ✦ AI Analyst

Fitur unggulan: **AI Telco Analyst** berbasis Groq LLM.

### Cara Pakai AI Analyst
1. Buka section **AI Analyst** di dashboard (setelah upload data)
2. AI siap digunakan langsung — tidak perlu API key (dikelola di server)
3. Pilih **Analisis Cepat** atau ketik pertanyaan sendiri

### Mode Analisis Cepat
| Mode | Deskripsi |
|---|---|
| 📋 Laporan Lengkap | Analisis komprehensif semua parameter |
| 📈 Evaluasi KPI | RSRP, RSRQ, SNR vs standar 3GPP |
| 🗺 Analisis Coverage | Distribusi sinyal & area bermasalah |
| ⇄ Analisis Handover | Stabilitas & frekuensi handover |
| 🚀 Throughput | Performa DL/UL & korelasi dengan RF |
| 🛠 Rekomendasi | Saran optimasi jaringan |

### Keamanan
- API key **hanya disimpan di `sessionStorage`** — hilang saat tab ditutup
- Data drive test **tidak pernah dikirim ke mana pun** selain ke Anthropic API
- Semua processing dilakukan **100% di browser**

---

## 🚀 Cara Pakai

### Lokal
```bash
git clone https://github.com/USERNAME/gnet-analyzer.git
cd gnet-analyzer
# Buka index.html di browser (Firefox/Chrome/Edge)
```

### GitHub Pages
1. Push repo ke GitHub
2. **Settings → Pages → Source: Deploy from branch → main / root**
3. Akses via `https://USERNAME.github.io/gnet-analyzer/`

> **Penting:** Untuk AI Analyst dari `file://`, browser mungkin memblok request ke API Anthropic karena CORS. Gunakan **GitHub Pages** atau local server (`python3 -m http.server 8080`) untuk pengalaman terbaik.

---

## 📁 Struktur File

```
gnet-analyzer/
├── index.html          ← Halaman upload
├── dashboard.html      ← Dashboard analisis
├── css/
│   ├── base.css        ← Design tokens & shared styles
│   ├── upload.css      ← Halaman upload
│   └── dashboard.css   ← Dashboard layout & komponen + AI styles
├── js/
│   ├── parser.js       ← Parser TXT & KML G-NetTrack Pro
│   ├── upload.js       ← Logic upload & validasi
│   ├── charts.js       ← Chart.js rendering
│   ├── map.js          ← Leaflet map + layers
│   ├── ai.js           ← AI Analyst (Claude API + streaming)
│   └── dashboard.js    ← Dashboard controller
└── README.md
```

---

## 📏 Standar Parameter

| Parameter | Kategori | Range |
|---|---|---|
| **RSRP** | Sangat Baik | > −80 dBm |
| | Bagus | −80 ~ −90 dBm |
| | Normal | −90 ~ −100 dBm |
| | Buruk | −100 ~ −110 dBm |
| | Sangat Buruk | < −110 dBm |
| **RSRQ** | Excellent | > −9 dB |
| | Best | −10 ~ −9 dB |
| | Good | −15 ~ −10 dB |
| | Poor | −19 ~ −15 dB |
| | Bad | < −19 dB |
| **SNR** | Sangat Baik | > 20 dB |
| | Baik | 10 ~ 20 dB |
| | Cukup | 0 ~ 10 dB |
| | Buruk | −10 ~ 0 dB |
| | Sangat Buruk | < −10 dB |

---

## 🔧 Dependencies (CDN)

| Library | Versi | Kegunaan |
|---|---|---|
| Chart.js | 4.4.1 | Grafik interaktif |
| Leaflet | 1.9.4 | Peta interaktif |
| CARTO Tile | — | Basemap gelap |
| Groq API | LLM | AI Analyst |
| Google Fonts | — | JetBrains Mono, Barlow |

---

## 📝 Notes

- Data diproses **100% di browser** — tidak ada data yang dikirim ke server (kecuali ke Anthropic API jika menggunakan AI Analyst)
- `sessionStorage` digunakan untuk transfer data antar halaman
- Untuk file sangat besar (>50k rows), data otomatis di-*thin* untuk performa rendering. Thinning sekarang **distance-based** (Haversine) — sample tersebar proporsional ke jarak tempuh, bukan jumlah sample. Ini menghilangkan bias di mana zona urban (slow, banyak sample per meter) sebelumnya over-represented vs highway.
- AI Analyst membutuhkan koneksi internet dan Anthropic API key

## 🎯 Lingkup & Posisi Tool

Cakra adalah **engineer's exploration tool** — dipakai RF engineer untuk eksplorasi cepat, eksperimentasi parameter, dan diskusi internal tim. Bukan instrument formal untuk reporting compliance ke regulator.

**Threshold KPI** yang dipakai (RSRP, RSRQ, SNR, SS-SINR) adalah konvensi umum operator industri — selaras dengan rentang valid 3GPP TS 36.133/38.215, tapi label kualitatif "Sangat Baik / Buruk" tidak distandarisasi 3GPP secara formal. Sesuaikan kalau use case Anda berbeda dari urban Indonesia (rural, indoor, IoT).

**Algoritma deteksi** (Coverage Gap, Cell Churn, PCI Mod-3, Throughput Correlation) adalah heuristik engineering yang berguna untuk identifikasi area-suspect — tapi *bukan* algoritma yang distandarisasi vendor atau body internasional. Untuk verifikasi formal pakai tool planning resmi (Atoll, Asset, MapInfo Pro) yang punya neighbor list aktual dan database planning operator.

### Kompatibilitas Regulasi Indonesia (Kominfo)

Cakra **tidak** dirancang sebagai compliance instrument terhadap framework KPI QoS Kementerian Komunikasi dan Informatika RI. Kominfo (lewat Direktorat Jenderal PPI) memiliki kerangka pengukuran Quality of Service tersendiri untuk operator seluler dengan persyaratan metodologi (sampling minimum, distribusi waktu, durasi test, format laporan) yang spesifik. Cakra:

- Tidak meng-enforce metodologi sampling tertentu (analisis whatever you upload)
- Tidak generate report dalam format yang regulator expect
- Threshold-nya operator-grade, bukan regulator-grade

Untuk **reporting formal ke Kominfo**, gunakan tool yang dirancang khusus untuk itu (TEMS Investigation laporan resmi, Nemo Analyzer, atau internal compliance suite operator). Cakra cocok untuk: (1) eksplorasi data drive test setelah pengukuran, (2) diskusi internal tim RNO/RNP, (3) edukasi & training analisis RF, (4) prototyping ide optimization sebelum dikonfirmasi dengan tool formal.

---

## 📄 License

MIT License — bebas digunakan dan dimodifikasi.


**Drive Test Intelligence** untuk RF Engineer — Analisis LTE & 5G NR dari G-NetTrack Pro, TEMS, NEMO, SIGMON. Web app statis + PWA yang berjalan langsung di browser.

![GNet Analyzer](https://img.shields.io/badge/version-1.1.0-38bdf8?style=flat-square) ![Static](https://img.shields.io/badge/type-static%20HTML-4ade80?style=flat-square) ![License](https://img.shields.io/badge/license-MIT-c084fc?style=flat-square)

---

## ✨ Fitur

| Fitur | Deskripsi |
|---|---|
| 📡 **Import TXT** | Parse otomatis file `.txt` export G-NetTrack Pro (multi-file) |
| 📍 **Import KML** | Parse file `.kml` events (Handover, Cell Reselection) |
| 📈 **Grafik Interaktif** | RSRP, RSRQ, SNR, Throughput DL/UL dengan Chart.js |
| 🗺 **Peta Sinyal** | Leaflet map — layer RSRP/RSRQ/SNR/Rawan + Events overlay |
| ⇄ **Events** | Tabel dan marker Handover & Cell Reselection |
| 📊 **Distribusi** | Bar distribusi persentase per kategori |
| ⚠ **Titik Rawan** | Auto-deteksi titik di luar threshold |
| ⬇ **Export PNG** | Download setiap grafik sebagai gambar |
| 📱 **Responsive** | Sidebar collapsible, mobile-friendly |

---

## 🚀 Cara Pakai

### Lokal
```bash
git clone https://github.com/USERNAME/gnet-analyzer.git
cd gnet-analyzer
# Buka index.html di browser (Firefox/Chrome/Edge)
```

> **Catatan:** Karena menggunakan `sessionStorage`, buka langsung via `file://` di browser — tidak perlu server. Untuk pengalaman terbaik gunakan Chrome atau Firefox.

### GitHub Pages
1. Push repo ke GitHub
2. Buka **Settings → Pages → Source: Deploy from branch → main / root**
3. Akses via `https://USERNAME.github.io/gnet-analyzer/`

---

## 📁 Struktur File

```
gnet-analyzer/
├── index.html          ← Halaman upload
├── dashboard.html      ← Dashboard analisis
├── css/
│   ├── base.css        ← Design tokens & shared styles
│   ├── upload.css      ← Halaman upload
│   └── dashboard.css   ← Dashboard layout & komponen
├── js/
│   ├── parser.js       ← Parser TXT & KML G-NetTrack Pro
│   ├── upload.js       ← Logic upload & validasi
│   ├── charts.js       ← Chart.js rendering
│   ├── map.js          ← Leaflet map + layers
│   └── dashboard.js    ← Dashboard controller
└── README.md
```

---

## 📋 Format File yang Didukung

### TXT (G-NetTrack Pro Export)
- Export dari menu **Session** di G-NetTrack Pro
- Format tab-separated dengan header row
- Kolom yang dipakai: `Timestamp, Longitude, Latitude, Level (RSRP), Qual (RSRQ), SNR, DL_bitrate, UL_bitrate, Cellname, Node, CellID, LAC, Band, dst.`

### KML (Events Export)
- Export events dari G-NetTrack Pro
- Mendukung: `HANDOVER_DATA_4G4G`, `CELL_RESELECTION_4G4G`
- Data yang ditampilkan: From/To cell, RSRP, RSRQ, SNR, eNB, DL/UL bitrate, Speed

---

## 📏 Standar Parameter

| Parameter | Kategori | Range |
|---|---|---|
| **RSRP** | Sangat Baik | > −80 dBm |
| | Bagus | −80 ~ −90 dBm |
| | Normal | −90 ~ −100 dBm |
| | Buruk | −100 ~ −110 dBm |
| | Sangat Buruk | < −110 dBm |
| **RSRQ** | Excellent | > −9 dB |
| | Best | −10 ~ −9 dB |
| | Good | −15 ~ −10 dB |
| | Poor | −19 ~ −15 dB |
| | Bad | < −19 dB |
| **SNR** | Sangat Baik | > 20 dB |
| | Baik | 10 ~ 20 dB |
| | Cukup | 0 ~ 10 dB |
| | Buruk | −10 ~ 0 dB |
| | Sangat Buruk | < −10 dB |

---

## 🔧 Dependencies (CDN — tidak perlu install)

| Library | Versi | Kegunaan |
|---|---|---|
| Chart.js | 4.4.1 | Grafik |
| Leaflet | 1.9.4 | Peta interaktif |
| CARTO Tile | — | Basemap gelap (bebas referer) |
| Google Fonts | — | JetBrains Mono, Barlow |

---

## 📝 Notes

- Data diproses **100% di browser** — tidak ada data yang dikirim ke server
- `sessionStorage` digunakan untuk transfer data antar halaman (dibersihkan saat tab ditutup)
- Untuk file sangat besar (>50k rows), data otomatis di-*thin* untuk performa rendering
- Peta menggunakan **CARTO Dark** tiles — berfungsi dari `file://` maupun hosted

---

## 📄 License

MIT License — bebas digunakan dan dimodifikasi.
