// Prepares app-build/ directory for electron-builder
// Creates a clean app dir WITHOUT "type": "module" so electron-builder includes package.json
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const appBuild = path.join(root, "app-build");

// Clean
if (fs.existsSync(appBuild)) {
  fs.rmSync(appBuild, { recursive: true });
}
fs.mkdirSync(appBuild, { recursive: true });

// Write package.json WITHOUT "type": "module", main as .js (not .cjs)
const pkg = {
  name: "telepath",
  version: "1.0.0",
  main: "dist-electron/main.js",
  description: "Telegram chatbot powered by LLM",
};
fs.writeFileSync(path.join(appBuild, "package.json"), JSON.stringify(pkg, null, 2));

// Copy dist-electron/ and rename .cjs -> .js
fs.cpSync(path.join(root, "dist-electron"), path.join(appBuild, "dist-electron"), { recursive: true });

// Rename .cjs to .js in app-build/dist-electron and fix internal requires
const distDir = path.join(appBuild, "dist-electron");
const cjsFiles = fs.readdirSync(distDir).filter(f => f.endsWith(".cjs"));
for (const file of cjsFiles) {
  const oldPath = path.join(distDir, file);
  const newPath = path.join(distDir, file.replace(/\.cjs$/, ".js"));
  let content = fs.readFileSync(oldPath, "utf-8");
  content = content.replace(/\.cjs"/g, '.js"');
  fs.writeFileSync(newPath, content);
  fs.unlinkSync(oldPath);
}

// Create empty node_modules to prevent electron-builder from running npm install
fs.mkdirSync(path.join(appBuild, "node_modules"), { recursive: true });

console.log("prepare-app: app-build/ ready");
