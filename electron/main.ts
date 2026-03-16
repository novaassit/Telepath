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

// 개발 모드: dist-electron/../ = 프로젝트 루트
// 패키징 모드: userData (~Library/Application Support/Telepath) 에 .env 저장
//              extraResources (Contents/Resources) 에 .env.example
const projectRoot = app.isPackaged
  ? path.dirname(app.getPath("exe"))
  : path.resolve(__dirname, "..");

// .env 저장 경로: 패키징 시 userData, 개발 시 프로젝트 루트
const envDir = app.isPackaged ? app.getPath("userData") : projectRoot;

// .env.example 경로: 패키징 시 Resources 폴더, 개발 시 프로젝트 루트
const resourcesDir = app.isPackaged
  ? (process.resourcesPath ?? path.join(path.dirname(app.getPath("exe")), "..", "Resources"))
  : projectRoot;
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
  const envVars = readEnvFile(getEnvPath(envDir));
  botRunner.start(projectRoot, envVars);
});

ipcMain.handle("bot:stop", () => {
  botRunner.stop();
});

ipcMain.handle("bot:status", () => {
  return botRunner.status;
});

ipcMain.handle("env:read", () => {
  return readEnvFile(getEnvPath(envDir));
});

ipcMain.handle("env:write", (_event, values: Record<string, string>) => {
  writeEnvFile(getEnvPath(envDir), values);
});

ipcMain.handle("env:get-schema", () => {
  return getEnvSchema(getExampleEnvPath(resourcesDir));
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
