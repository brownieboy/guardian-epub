#!/usr/bin/env node
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Sort } = require("enquirer");

import { loadSections, saveSettings } from "./utils/files.js";

const sections = loadSections();

export async function reorderSections() {
  const prompt = new Sort({
    name: "order",
    message: "Reorder the sections (use arrow keys and space to select):",
    choices: sections,
  });

  const result = await prompt.run();
  return result;
}

reorderSections()
  .then(orderedSections => {
    console.log("Ordered Sections:", orderedSections);
    saveSettings({ sections: orderedSections });
  })
  .catch(console.error);

