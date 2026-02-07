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
  showItemInFolder: (targetPath: string) => ipcRenderer.invoke("guardian:showItemInFolder", targetPath),
  onPhase: (handler: (phase: string) => void) => {
    const listener = (_event: unknown, phase: string) => handler(phase);
    ipcRenderer.on("guardian:phase", listener);
    return () => ipcRenderer.removeListener("guardian:phase", listener);
  },
  onProgress: (handler: (progress: ProgressUpdate) => void) => {
    const listener = (_event: unknown, progress: ProgressUpdate) => handler(progress);
    ipcRenderer.on("guardian:progress", listener);
    return () => ipcRenderer.removeListener("guardian:progress", listener);
  },
  onLog: (handler: (message: string) => void) => {
    const listener = (_event: unknown, message: string) => handler(message);
    ipcRenderer.on("guardian:log", listener);
    return () => ipcRenderer.removeListener("guardian:log", listener);
  },
  onError: (handler: (message: string) => void) => {
    const listener = (_event: unknown, message: string) => handler(message);
    ipcRenderer.on("guardian:error", listener);
    return () => ipcRenderer.removeListener("guardian:error", listener);
  },
  onOpenApiDialog: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on("guardian:openApiDialog", listener);
    return () => ipcRenderer.removeListener("guardian:openApiDialog", listener);
  },
  onRefreshSections: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on("guardian:refreshSections", listener);
    return () => ipcRenderer.removeListener("guardian:refreshSections", listener);
  },
  onResetSettings: (handler: () => void) => {
    const listener = () => handler();
    ipcRenderer.on("guardian:resetSettings", listener);
    return () => ipcRenderer.removeListener("guardian:resetSettings", listener);
  },
});
