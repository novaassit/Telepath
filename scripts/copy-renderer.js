import { cpSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const src = resolve(root, "electron", "renderer");
const dest = resolve(root, "dist-electron", "renderer");

mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log("Renderer files copied to dist-electron/renderer/");
