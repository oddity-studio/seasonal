import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "picker", "thumbs");
fs.mkdirSync(OUT_DIR, { recursive: true });

// Extract layout label + category from HelloWorld.tsx so this stays in sync.
const src = fs.readFileSync(path.join(ROOT, "src", "HelloWorld.tsx"), "utf8");
const start = src.indexOf("const SCENE_LAYOUTS");
const end = src.indexOf("\n];", start);
const block = src.slice(start, end);
const layouts = [];
const re = /label:\s*"([^"]+)",\s*category:\s*"([^"]+)"/g;
let m;
while ((m = re.exec(block))) layouts.push({ label: m[1], category: m[2] });
console.log(`Found ${layouts.length} layouts`);

console.log("Bundling…");
const serveUrl = await bundle({
  entryPoint: path.join(ROOT, "src", "index.ts"),
  webpackOverride: (cfg) => cfg,
});

const baseProps = {
  seasonNumber: "01",
  colorScheme: { dark: "#953f0c", light: "#dfbf67", highlight: "#ffaa00" },
  font: "Dela Gothic One",
  scenes: [{ text: "", fontSize: 100, layout: 0 }],
};

for (let i = 0; i < layouts.length; i++) {
  const { label, category } = layouts[i];
  const inputProps = {
    ...baseProps,
    scenes: [{ text: category, fontSize: 100, layout: i }],
  };
  const composition = await selectComposition({
    serveUrl,
    id: "HelloWorld",
    inputProps,
  });
  await renderStill({
    composition,
    serveUrl,
    output: path.join(OUT_DIR, `${i}.png`),
    inputProps,
    frame: 60,
    imageFormat: "png",
  });
  console.log(`baked ${i}: ${label}`);
}

console.log(`\nDone. Wrote ${layouts.length} thumbs to ${OUT_DIR}`);
process.exit(0);
