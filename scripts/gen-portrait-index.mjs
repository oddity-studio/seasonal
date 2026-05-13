import { readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "../public/picker/Portraits");

function generate() {
  const files = readdirSync(dir).filter((f) => /\.(webp|png|jpg|jpeg)$/i.test(f)).sort();
  writeFileSync(join(dir, "index.json"), JSON.stringify(files) + "\n");
  console.log(`[portraits] index.json updated: ${files.length} files`);
}

generate();

if (process.argv.includes("--watch")) {
  const { watch } = await import("fs");
  watch(dir, (event, filename) => {
    if (filename === "index.json") return;
    generate();
  });
}
