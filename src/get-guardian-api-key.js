#!/usr/bin/env node
import inquirer from "inquirer";
import { getApiFile, setApiKey } from "./utils/files.js";

async function saveGuardianApiKey() {
  const apiFile = getApiFile();

  // Prompt the user for the API key
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "apiKey",
      message: "Please enter or paste your Guardian API key:",
    },
  ]);

  // Save the API key to the configuration file
  setApiKey(answers.apiKey);
  console.log(`API key saved successfully to file ${apiFile}`);
}

saveGuardianApiKey().catch(console.error);
