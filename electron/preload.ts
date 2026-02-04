import { contextBridge, ipcRenderer } from "electron";

type ProgressUpdate = {
  current: number;
  total: number;
  message?: string;
};

contextBridge.exposeInMainWorld("guardianApi", {
  loadSettings: () => ipcRenderer.invoke("settings:load"),
  saveSettings: (data: any) => ipcRenderer.invoke("settings:save", data),
  resetSettings: () => ipcRenderer.invoke("settings:reset"),
  fetchSections: (apiKey: string) => ipcRenderer.invoke("guardian:fetchSections", apiKey),
  run: (options: { apiKey: string; sections: string[] }) =>
    ipcRenderer.invoke("guardian:run", options),
  openPath: (targetPath: string) => ipcRenderer.invoke("guardian:openPath", targetPath),
  onPhase: (handler: (phase: string) => void) => {
    ipcRenderer.on("guardian:phase", (_event, phase) => handler(phase));
  },
  onProgress: (handler: (progress: ProgressUpdate) => void) => {
    ipcRenderer.on("guardian:progress", (_event, progress) => handler(progress));
  },
  onLog: (handler: (message: string) => void) => {
    ipcRenderer.on("guardian:log", (_event, message) => handler(message));
  },
  onError: (handler: (message: string) => void) => {
    ipcRenderer.on("guardian:error", (_event, message) => handler(message));
  },
  onOpenApiDialog: (handler: () => void) => {
    ipcRenderer.on("guardian:openApiDialog", () => handler());
  },
  onRefreshSections: (handler: () => void) => {
    ipcRenderer.on("guardian:refreshSections", () => handler());
  },
  onResetSettings: (handler: () => void) => {
    ipcRenderer.on("guardian:resetSettings", () => handler());
  },
});
