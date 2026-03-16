import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  startBot: () => ipcRenderer.invoke("bot:start"),
  stopBot: () => ipcRenderer.invoke("bot:stop"),
  getStatus: () => ipcRenderer.invoke("bot:status"),
  readEnv: () => ipcRenderer.invoke("env:read"),
  writeEnv: (values: Record<string, string>) =>
    ipcRenderer.invoke("env:write", values),
  getEnvSchema: () => ipcRenderer.invoke("env:get-schema"),
  onLog: (callback: (entry: unknown) => void) => {
    ipcRenderer.on("bot:log", (_event, entry) => callback(entry));
  },
  onStatusChange: (callback: (status: string) => void) => {
    ipcRenderer.on("bot:status-changed", (_event, status) => callback(status));
  },
});
