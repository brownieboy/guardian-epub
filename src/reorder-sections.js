#!/usr/bin/env node
import inquirer from "inquirer";
import {
  loadSectionsOrder,
  loadSections,
  saveSettings,
} from "./utils/files.js";

let sectionsOrder = loadSectionsOrder();
const sections = loadSections();

console.log("Assign a number to each of these sections: ", sections);

async function updateSectionsOrder() {
  const questions = sections.map(section => ({
    type: "number",
    name: section,
    message: `Order for '${section}':`,
    default: sectionsOrder[section] || 0,
  }));

  const answers = await inquirer.prompt(questions);

  // Update the sectionsOrder with new values
  sectionsOrder = {};
  for (const section in answers) {
    sectionsOrder[section] = answers[section];
  }

  saveSettings({ sectionsOrder });
}

updateSectionsOrder().catch(console.error);
