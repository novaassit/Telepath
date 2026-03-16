import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { BotRunner } from "./bot-runner";
import {
  readEnvFile,
  writeEnvFile,
  getEnvSchema,
  getEnvPath,
  getExampleEnvPath,
} from "./env-manager";

const projectRoot = path.resolve(__dirname, "..");
const botRunner = new BotRunner();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 500,
    title: "Telepath - Telegram Bot Manager",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "renderer", "index.html"));



  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// IPC handlers
ipcMain.handle("bot:start", () => {
  const envVars = readEnvFile(getEnvPath(projectRoot));
  botRunner.start(projectRoot, envVars);
});

ipcMain.handle("bot:stop", () => {
  botRunner.stop();
});

ipcMain.handle("bot:status", () => {
  return botRunner.status;
});

ipcMain.handle("env:read", () => {
  return readEnvFile(getEnvPath(projectRoot));
});

ipcMain.handle("env:write", (_event, values: Record<string, string>) => {
  writeEnvFile(getEnvPath(projectRoot), values);
});

ipcMain.handle("env:get-schema", () => {
  return getEnvSchema(getExampleEnvPath(projectRoot));
});

// Forward bot events to renderer
botRunner.on("log", (entry) => {
  mainWindow?.webContents.send("bot:log", entry);
});

botRunner.on("status-change", (status) => {
  mainWindow?.webContents.send("bot:status-changed", status);
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  botRunner.stop();
  app.quit();
});

app.on("before-quit", () => {
  botRunner.stop();
});
