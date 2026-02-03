#!/usr/bin/env node

import ora from "ora";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import os from "os";
import { mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import Enquirer from "enquirer";
// import { createRequire } from "module";

import { getApiKey, loadSections, saveSettings } from "./utils/files.js";
import { sortArrayByDefaultArray } from "./utils/sort.js";
import { fetchSections, runGuardianEpub } from "./core/guardian-core.js";

const { MultiSelect, Sort } = Enquirer;  // Can't import these directly in one step for some reason

// const dynamicRequire = createRequire(import.meta.url);
// const { MultiSelect, Sort } = dynamicRequire("enquirer");

const userHomeDir = os.homedir();
const configDir = path.join(userHomeDir, ".guardianEpub");
if (!existsSync(configDir)) {
  mkdirSync(configDir);
}

const argv = yargs(hideBin(process.argv)).argv;
const API_KEY = await getApiKey();

if (!API_KEY) {
  console.log(
    "API key file not found.  Please run command 'guardianEpubKey' to initialise.  You will need your Guardian API key ready to paste in.",
  );
  process.exit(1);
}

async function reorderSections(sections) {
  const prompt = new Sort({
    name: "order",
    message: "Reorder the sections (use arrow keys and space to select):",
    choices: sections,
  });

  const result = await prompt.run();
  return result;
}

async function selectSections(sections, defaultSections = []) {
  const choices = sections.map(section => ({
    name: section,
    value: section,
    // Mark as selected if it's a default section
    enabled: defaultSections.includes(section),
  }));
  const prompt = new MultiSelect({
    name: "selectedSections",
    limit: 15,
    message: "Select sections to fetch articles from:",
    choices,
    result(names) {
      return this.map(names);
    },
  });

  try {
    const answer = await prompt.run();
    return answer;
  } catch (error) {
    console.error("Error: ", error);
    return []; // Return an empty array in case of error or if the prompt was cancelled
  }
}

async function main() {
  let spinner = ora("Fetching sections from Guardian API...").start();
  const sections = await fetchSections(API_KEY, {
    onError: error => console.error("Error fetching sections:", error),
  });
  if (sections.length === 0) {
    spinner.fail("No sections fetched.");
    process.exit(1);
  }

  spinner.succeed("Sections fetched successfully.");

  const defaultSections = loadSections();

  // Check for --selections switch
  const useSelections = argv.selections;

  let userSortedSections;
  const hasSavedSections = defaultSections.length > 0;

  if (useSelections || !hasSavedSections) {
    // Prompt user to select and reorder sections
    const selectedSections = await selectSections(sections, defaultSections);
    if (selectedSections.length === 0) {
      console.log("No sections selected.");
      return;
    }

    const sectionsArray = Object.keys(selectedSections);
    const sectionsArraySortedByDefault = sortArrayByDefaultArray(
      sectionsArray,
      defaultSections,
    );

    userSortedSections = await reorderSections(sectionsArraySortedByDefault);
    saveSettings({ sections: userSortedSections });
  } else {
    // Use default sections without prompting
    userSortedSections = defaultSections;
  }
  spinner = ora(
    `${
      useSelections || !hasSavedSections
        ? ""
        : "Using saved sections (set --selections to reselect).  "
    } Fetching articles from Guardian API...`,
  ).start();

  const result = await runGuardianEpub(
    { apiKey: API_KEY, sections: userSortedSections },
    {
      onPhase: phase => {
        if (phase === "buildEpub") {
          spinner.text = "Creating ePub file...";
        }
      },
      onError: error => console.error(error),
    },
  );

  if (result.epubPath) {
    spinner.succeed("EPUB file created successfully.");
    console.log(`EPUB file created successfully: ${result.epubPath}`);
  } else {
    spinner.fail("No articles fetched.");
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
