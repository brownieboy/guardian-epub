import { app, BrowserWindow, ipcMain, shell, Menu } from "electron";
import path from "path";
import { fetchSections, runGuardianEpub } from "../src/core/guardian-core.js";
import { loadSettings, resetSettings, saveSettings } from "./settings.js";

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const devServerUrl = process.env.ELECTRON_START_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(__dirname, "../renderer/dist/index.html");
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  const menu = Menu.buildFromTemplate([
    { role: "appMenu" },
    { role: "fileMenu" },
    { role: "editMenu" },
    { role: "viewMenu" },
    {
      label: "Tools",
      submenu: [
        {
          label: "API Key",
          click: () => {
            mainWindow?.webContents.send("guardian:openApiDialog");
          },
        },
        {
          label: "Refresh Sections",
          click: () => {
            mainWindow?.webContents.send("guardian:refreshSections");
          },
        },
        {
          label: "Reset Settings",
          click: () => {
            mainWindow?.webContents.send("guardian:resetSettings");
          },
        },
      ],
    },
    { role: "windowMenu" },
    { role: "help" },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("guardian:fetchSections", async (_event, apiKey: string) => {
  return fetchSections(apiKey, {
    onError: error => console.error(error),
    throwOnError: true,
  });
});

ipcMain.handle("settings:load", async () => loadSettings());

ipcMain.handle("settings:save", async (_event, data) => {
  saveSettings(data);
  return true;
});

ipcMain.handle("settings:reset", async () => {
  resetSettings();
  return true;
});


ipcMain.handle(
  "guardian:run",
  async (_event, options: { apiKey: string; sections: string[] }) => {
    const templatesDir = path.join(app.getAppPath(), "src");
    const outputDir = app.getPath("downloads");
    const tempDir = path.join(app.getPath("userData"), "epub-temp");
    try {
      return await runGuardianEpub(
        { ...options, templatesDir, outputDir, tempDir },
        {
          onPhase: phase => mainWindow?.webContents.send("guardian:phase", phase),
          onProgress: progress =>
            mainWindow?.webContents.send("guardian:progress", progress),
          onLog: message => mainWindow?.webContents.send("guardian:log", message),
          onError: error =>
            mainWindow?.webContents.send("guardian:error", String(error)),
        },
      );
    } catch (error) {
      mainWindow?.webContents.send("guardian:error", String(error));
      throw error;
    }
  },
);

ipcMain.handle("guardian:openPath", async (_event, targetPath: string) => {
  if (targetPath) {
    await shell.openPath(targetPath);
  }
});
