import fs from "node:fs";
import path from "node:path";

export interface EnvSchema {
  key: string;
  comment: string;
  group: string;
  defaultValue: string;
}

export function getEnvPath(projectRoot: string): string {
  return path.join(projectRoot, ".env");
}

export function getExampleEnvPath(projectRoot: string): string {
  return path.join(projectRoot, ".env.example");
}

export function readEnvFile(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    result[key] = value;
  }
  return result;
}

export function writeEnvFile(
  envPath: string,
  values: Record<string, string>
): void {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    if (value !== "") {
      lines.push(`${key}=${value}`);
    }
  }
  fs.writeFileSync(envPath, lines.join("\n") + "\n", "utf-8");
}

export function getEnvSchema(examplePath: string): EnvSchema[] {
  if (!fs.existsSync(examplePath)) return [];
  const content = fs.readFileSync(examplePath, "utf-8");
  const schema: EnvSchema[] = [];
  let currentGroup = "General";
  let currentComment = "";

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentComment = "";
      continue;
    }
    if (trimmed.startsWith("# ----")) {
      const match = trimmed.match(/^# ----\s*(.+?)\s*----/);
      if (match) currentGroup = match[1].trim();
      currentComment = "";
      continue;
    }
    if (trimmed.startsWith("#")) {
      currentComment = trimmed.replace(/^#\s*/, "");
      continue;
    }
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const defaultValue = trimmed.slice(eqIdx + 1).trim();
    schema.push({ key, comment: currentComment, group: currentGroup, defaultValue });
    currentComment = "";
  }
  return schema;
}
