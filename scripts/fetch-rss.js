#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const FEEDS = {
  "weekly-top-battles": "https://www.audeobox.com/api/feeds/weekly-top-battles.xml",
};

const OUT_DIR = path.join(__dirname, "..", "public", "rss-cache");

async function extractFirst(xml) {
  const m = xml.match(/<item>[\s\S]*?<title>(.*?)<\/title>/);
  if (!m) return null;
  const tm = m[1].match(/#\d+\s*[—–\-]\s*(.+?)\s*\((\d+)/);
  if (!tm) return null;
  return { username: tm[1].trim(), number: tm[2] };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const [key, url] of Object.entries(FEEDS)) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const xml = await res.text();
      const entry = await extractFirst(xml);
      if (entry) {
        const out = path.join(OUT_DIR, `${key}.json`);
        fs.writeFileSync(out, JSON.stringify(entry, null, 2) + "\n");
        console.log(`✓ ${key}: ${entry.username} (${entry.number})`);
      } else {
        console.warn(`⚠ ${key}: could not parse first item`);
      }
    } catch (err) {
      console.error(`✗ ${key}: ${err.message}`);
    }
  }
}

main();
