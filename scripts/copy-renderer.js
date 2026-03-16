import { cpSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distElectron = resolve(root, "dist-electron");

// Copy renderer files
const src = resolve(root, "electron", "renderer");
const dest = resolve(distElectron, "renderer");
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("Renderer files copied.");

// Rename .js -> .cjs and fix require paths
const jsFiles = readdirSync(distElectron).filter((f) => f.endsWith(".js"));
for (const file of jsFiles) {
  const filePath = join(distElectron, file);
  let content = readFileSync(filePath, "utf-8");
  // Fix require("./xxx") to require("./xxx.cjs") for local imports
  content = content.replace(/require\("\.\/([^"]+)"\)/g, (match, p1) => {
    if (p1.endsWith(".cjs") || p1.endsWith(".js") || p1.includes("/")) return match;
    return `require("./${p1}.cjs")`;
  });
  const cjsPath = join(distElectron, file.replace(/\.js$/, ".cjs"));
  writeFileSync(cjsPath, content, "utf-8");
  // Remove original .js
  const { unlinkSync } = await import("node:fs");
  unlinkSync(filePath);
}
console.log(`Renamed ${jsFiles.length} files: .js -> .cjs`);

// Create package.json for electron-builder (dist-electron is the app directory)
const electronPkg = {
  name: "telepath",
  version: "1.0.0",
  main: "main.cjs",
  description: "Telegram chatbot powered by LLM",
};
writeFileSync(join(distElectron, "package.json"), JSON.stringify(electronPkg, null, 2) + "\n");
console.log("Created dist-electron/package.json");
