import { app } from "electron";
import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "fs";
import path from "path";

export type GuiSettings = {
  apiKey?: string;
  selectedSections?: string[];
  hasFetchedSections?: boolean;
  lastFetchedSections?: string[];
  sectionsOrder?: string[];
};

const getSettingsPath = () => {
  const dir = app.getPath("userData");
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return path.join(dir, "settings.json");
};

export const loadSettings = () => {
  const file = getSettingsPath();
  if (!existsSync(file)) {
    return {} as GuiSettings;
  }
  try {
    return JSON.parse(readFileSync(file, "utf8")) as GuiSettings;
  } catch (error) {
    console.error("Error reading GUI settings:", error);
    return {} as GuiSettings;
  }
};

export const saveSettings = (data: GuiSettings) => {
  const file = getSettingsPath();
  try {
    writeFileSync(file, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error saving GUI settings:", error);
  }
};

export const resetSettings = () => {
  const file = getSettingsPath();
  if (existsSync(file)) {
    try {
      unlinkSync(file);
    } catch (error) {
      console.error("Error clearing GUI settings:", error);
    }
  }
};
