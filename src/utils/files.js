import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const getConfigDir = () => {
  const userHomeDir = homedir();
  const configDir = join(userHomeDir, ".guardianEpub");
  if (!existsSync(configDir)) {
    mkdirSync(configDir);
  }
  return configDir;
};

export const getApiFile = () => {
  return join(getConfigDir(), "guardian-open-platform-key.json");
};

export const setApiKey = apiKey => {
  writeFileSync(getApiFile(), JSON.stringify({ API_KEY: apiKey }));
};

export const getApiKey = () => {
  try {
    const jsonData = readFileSync(getApiFile());
    return JSON.parse(jsonData).API_KEY;
  } catch (error) {
    console.error("Error reading API key from file:", error);
    return null;
  }
};

export const getSettingsFile = () => {
  return join(getConfigDir(), "settings.json");
};

const createSettingsLoader = () => {
  const settingsFile = getSettingsFile();
  let settingsCache = { sections: [] };

  const loadSettings = key => {
    if (
      (settingsCache === null || settingsCache?.sections?.length === 0) &&
      existsSync(settingsFile)
    ) {
      try {
        settingsCache = JSON.parse(readFileSync(settingsFile, "utf8"));
      } catch (error) {
        console.log("Settings file does not yet exist");
        settingsCache = {}; // Use an empty object if there's an error
      }
    }
    return settingsCache[key];
  };
  return loadSettings;
};

export const loadSections = () => createSettingsLoader()("sections") || [];
// export const loadSectionsOrder = () =>
//   createSettingsLoader()("sectionsOrder") || {};

export const saveSettings = ({ sections, sectionsOrder }) => {
  // const nowIso = new Date().toISOString();
  const settingsFile = getSettingsFile();

  // Read existing settings and update only specific properties
  let settings = {};
  if (existsSync(settingsFile)) {
    try {
      settings = JSON.parse(readFileSync(settingsFile, "utf8"));
    } catch (error) {
      console.error(
        "Error reading existing settings from settings.json:",
        error,
      );
    }
  }

  // Update only the 'sections' and 'sectionsOrder' properties
  if (sections) {
    settings.sections = sections;
  }

  if (sectionsOrder) {
    settings.sectionsOrder = sectionsOrder;
  }

  // Write the updated settings back to the file
  try {
    writeFileSync(settingsFile, JSON.stringify(settings, null, 4));
    console.log(`Settings saved to ${settingsFile}`);
  } catch (error) {
    console.error("Error saving updated settings to settings.json:", error);
  }
};
