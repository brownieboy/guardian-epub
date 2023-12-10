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
    const jsonData = readFileSync(getApiFilePath());
    return JSON.parse(jsonData).API_KEY;
  } catch (error) {
    console.error("Error reading API key from file:", error);
    return null;
  }
};
