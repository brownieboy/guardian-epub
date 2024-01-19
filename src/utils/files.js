import { mkdirSync, readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import Enquirer from "enquirer";
// import { createRequire } from "module";

// const dynamicRequire = createRequire(import.meta.url);
// const enquirer = dynamicRequire("enquirer");

const { prompt } = Enquirer;

export const getConfigDir = () => {
  const userHomeDir = homedir();
  const configDir = join(userHomeDir, ".guardianEpub");
  if (!existsSync(configDir)) {
    mkdirSync(configDir);
  }
  return configDir;
};

export const getApiFilePath = () => {
  return join(getConfigDir(), "guardian-open-platform-key.json");
};

export const setApiKey = apiKey => {
  writeFileSync(getApiFilePath(), JSON.stringify({ API_KEY: apiKey }));
};

async function saveGuardianApiKey(apiFilePath) {
  // Prompt the user for the API key
  const answers = await prompt([
    {
      type: "input",
      name: "apiKey",
      message: "Please enter or paste your Guardian API here:",
    },
  ]);

  // Save the API key to the configuration file
  setApiKey(answers.apiKey);
  console.log(`API key saved successfully to file ${apiFilePath}`);
}

export const getApiKey = async () => {
  const apiFilePath = getApiFilePath();
  if (!existsSync(apiFilePath)) {
    console.warn("The API key file does not exist:", apiFilePath);
    console.log(
      "To use this app you will need a free Guardian API key from  https://open-platform.theguardian.com/access/",
    );
    await saveGuardianApiKey(apiFilePath);
  }

  try {
    const jsonData = readFileSync(getApiFilePath());
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
