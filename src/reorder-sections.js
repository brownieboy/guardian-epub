#!/usr/bin/env node
import inquirer from "inquirer";
// import { Sort } from "enquirer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const Enquirer = require("enquirer");

import {
  loadSectionsOrder,
  loadSections,
  saveSettings,
} from "./utils/files.js";

let sectionsOrder = loadSectionsOrder();
const sections = loadSections();

// console.log("Assign a number to each of these sections: ", sections);

// async function updateSectionsOrder() {
//   const questions = sections.map(section => ({
//     type: "number",
//     name: section,
//     message: `Order for '${section}':`,
//     default: sectionsOrder[section] || 0,
//   }));

//   const answers = await inquirer.prompt(questions);

//   // Update the sectionsOrder with new values
//   sectionsOrder = {};
//   for (const section in answers) {
//     sectionsOrder[section] = answers[section];
//   }

//   saveSettings({ sectionsOrder });
// }

async function reorderSections() {
  const prompt = new Enquirer.Sort({
    name: "order",
    message: "Reorder the sections (use arrow keys and space to select):",
    choices: sections,
  });

  const result = await prompt.run();
  return result;
}

reorderSections().then(orderedSections => {
  console.log("Ordered Sections:", orderedSections);
  saveSettings({ sectionsOrder: orderedSections });
});

// updateSectionsOrder().catch(console.error);
// reorderSections().catch(console.error);
