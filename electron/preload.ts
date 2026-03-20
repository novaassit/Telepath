import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  // --- Provider CRUD ---
  listProviders: () => ipcRenderer.invoke("provider:list"),
  getProvider: (id: string) => ipcRenderer.invoke("provider:get", id),
  saveProvider: (id: string, config: unknown) =>
    ipcRenderer.invoke("provider:save", id, config),
  deleteProvider: (id: string) => ipcRenderer.invoke("provider:delete", id),

  // --- Bot Config CRUD ---
  listBots: () => ipcRenderer.invoke("botConfig:list"),
  getBot: (id: string) => ipcRenderer.invoke("botConfig:get", id),
  saveBot: (id: string, config: unknown) =>
    ipcRenderer.invoke("botConfig:save", id, config),
  deleteBot: (id: string) => ipcRenderer.invoke("botConfig:delete", id),

  // --- Bot Runtime ---
  startBot: (botId: string) => ipcRenderer.invoke("bot:start", botId),
  stopBot: (botId: string) => ipcRenderer.invoke("bot:stop", botId),
  getBotStatus: (botId: string) => ipcRenderer.invoke("bot:status", botId),
  getAllStatuses: () => ipcRenderer.invoke("bot:allStatuses"),

  // --- Profiles ---
  readProfiles: () => ipcRenderer.invoke("profiles:read"),

  // --- Events ---
  onLog: (callback: (entry: unknown) => void) => {
    ipcRenderer.on("bot:log", (_event, entry) => callback(entry));
  },
  onStatusChange: (callback: (info: unknown) => void) => {
    ipcRenderer.on("bot:status-changed", (_event, info) => callback(info));
  },
});
