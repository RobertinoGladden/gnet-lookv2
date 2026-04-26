#!/bin/bash
# ═══════════════════════════════════════════════════
# CAKRA — Download semua library ke local
# Jalankan SEKALI dari folder project:
#   chmod +x download-libs.sh && ./download-libs.sh
# ═══════════════════════════════════════════════════

set -e
mkdir -p js css

echo "Downloading Chart.js..."
curl -fSL -o js/chart.umd.js \
  "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"

echo "Downloading Leaflet JS..."
curl -fSL -o js/leaflet.min.js \
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"

echo "Downloading Leaflet CSS..."
curl -fSL -o css/leaflet.min.css \
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"

echo "Downloading jsPDF..."
curl -fSL -o js/jspdf.umd.min.js \
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"

echo "Downloading html2canvas..."
curl -fSL -o js/html2canvas.min.js \
  "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"

echo "Downloading SheetJS (xlsx)..."
curl -fSL -o js/xlsx.min.js \
  "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.min.js"

# Fix leaflet image paths — CSS referensi ke images/ folder
mkdir -p css/images
echo "Downloading Leaflet marker images..."
curl -fSL -o css/images/marker-icon.png \
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png"
curl -fSL -o css/images/marker-icon-2x.png \
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png"
curl -fSL -o css/images/marker-shadow.png \
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
curl -fSL -o css/images/layers.png \
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/layers.png"
curl -fSL -o css/images/layers-2x.png \
  "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/layers-2x.png"

echo ""
echo "Semua library berhasil didownload ke folder js/ dan css/"
echo "Commit semua file ini ke repo kamu, lalu push ke GitHub."
