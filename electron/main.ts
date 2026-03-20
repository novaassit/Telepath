import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { ProfileManager, type LLMProviderConfig, type BotConfig } from "./profile-manager";
import { BotManager } from "./bot-manager";

// 개발 모드: dist-electron/../ = 프로젝트 루트
// 패키징 모드: userData (~Library/Application Support/Telepath) 에 .env 저장
const projectRoot = app.isPackaged
  ? path.dirname(app.getPath("exe"))
  : path.resolve(__dirname, "..");

// 데이터 저장 경로: 패키징 시 userData, 개발 시 프로젝트 루트
const dataDir = app.isPackaged ? app.getPath("userData") : projectRoot;

// .env 경로 (마이그레이션 소스)
const envDir = dataDir;

const profileManager = new ProfileManager(dataDir, envDir);
const botManager = new BotManager(profileManager, projectRoot);

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

// --- Provider IPC ---
ipcMain.handle("provider:list", () => {
  return profileManager.getProviders();
});

ipcMain.handle("provider:get", (_event, id: string) => {
  return profileManager.getProvider(id);
});

ipcMain.handle("provider:save", (_event, id: string, config: LLMProviderConfig) => {
  profileManager.saveProvider(id, config);
});

ipcMain.handle("provider:delete", (_event, id: string) => {
  return profileManager.deleteProvider(id);
});

// --- Bot Config IPC ---
ipcMain.handle("botConfig:list", () => {
  return profileManager.getBots();
});

ipcMain.handle("botConfig:get", (_event, id: string) => {
  return profileManager.getBot(id);
});

ipcMain.handle("botConfig:save", (_event, id: string, config: BotConfig) => {
  profileManager.saveBot(id, config);
});

ipcMain.handle("botConfig:delete", (_event, id: string) => {
  profileManager.deleteBot(id);
});

// --- Bot Runtime IPC ---
ipcMain.handle("bot:start", (_event, botId: string) => {
  return botManager.startBot(botId);
});

ipcMain.handle("bot:stop", (_event, botId: string) => {
  botManager.stopBot(botId);
});

ipcMain.handle("bot:status", (_event, botId: string) => {
  return botManager.getBotStatus(botId);
});

ipcMain.handle("bot:allStatuses", () => {
  return botManager.getAllStatuses();
});

// --- Profiles raw access ---
ipcMain.handle("profiles:read", () => {
  return profileManager.read();
});

// Forward bot events to renderer
botManager.on("log", (entry) => {
  mainWindow?.webContents.send("bot:log", entry);
});

botManager.on("status-change", (info) => {
  mainWindow?.webContents.send("bot:status-changed", info);
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  botManager.stopAll();
  app.quit();
});

app.on("before-quit", () => {
  botManager.stopAll();
});
