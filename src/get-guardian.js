import axios from "axios";
import Epub from "epub-gen";
import { formatISO, parseISO, startOfDay } from "date-fns";
import { format, utcToZonedTime } from "date-fns-tz";
import { readFileSync, writeFileSync, existsSync } from "fs";
import inquirer from "inquirer";

// Get the current date and time
const now = new Date();
const timeZone = "Australia/Sydney"; // Replace with the desired time zone
const zonedTime = utcToZonedTime(now, timeZone);
const dateString = format(zonedTime, "yyyy-MM-dd");
const timeString = format(zonedTime, "HHmm");
const timeStringDisplay = format(zonedTime, "HH:mm");

const API_KEY = loadApiKey();

function loadApiKey() {
  try {
    const jsonData = readFileSync("guardian-open-platform-key.json");
    return JSON.parse(jsonData).API_KEY;
  } catch (error) {
    console.error("Error reading API key from file:", error);
    process.exit(1);
  }
}

const createSettingsLoader = () => {
  let settingsCache = null;

  const loadSettings = key => {
    if (settingsCache === null && existsSync("settings.json")) {
      try {
        settingsCache = JSON.parse(readFileSync("settings.json", "utf8"));
      } catch (error) {
        console.error("Error loading settings from settings.json:", error);
        settingsCache = {}; // Use an empty object if there's an error
      }
    }
    return settingsCache[key];
  };
  return loadSettings;
};

const loadSections = () => createSettingsLoader()("sections") || [];
const loadSectionsOrder = () => createSettingsLoader()("sectionsOrder") || {};
const loadLastRunDate = () => createSettingsLoader()("lastRun") || null;

function sortSections(sections, sectionsOrder) {
  return sections.sort((a, b) => {
    const orderA = sectionsOrder[a] || Number.MAX_VALUE;
    const orderB = sectionsOrder[b] || Number.MAX_VALUE;
    return orderA - orderB;
  });
}

async function fetchSections() {
  try {
    const response = await axios.get(
      "https://content.guardianapis.com/sections",
      {
        params: {
          "api-key": API_KEY,
        },
      },
    );
    return response.data.response.results.map(section => section.id);
  } catch (error) {
    console.error("Error fetching sections:", error);
    return [];
  }
}

async function selectSections(sections, defaultSections = []) {
  const answers = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedSections",
      message: "Select sections to fetch articles from:",
      choices: sections,
      default: defaultSections,
    },
  ]);

  return answers.selectedSections;
}

async function fetchArticles(sections) {
  let allArticlesBySection = [];
  const sectionsOrder = loadSectionsOrder();
  console.log("TCL ~ file: get-guardian.js:91 ~ fetchArticles ~ sectionsOrder:", sectionsOrder);
  const sortedSections = sortSections(sections, sectionsOrder);
  console.log(
    "TCL ~ file: get-guardian.js:97 ~ fetchArticles ~ sortedSections:",
    sortedSections,
  );

  const lastRunDate = parseISO(loadLastRunDate());
  // const fromDate = lastRunDate
    ? formatISO(startOfDay(lastRunDate), { representation: "date" })
    : null;

  for (const section of sortedSections) {
    try {
      const params = {
        "api-key": API_KEY,
        "show-fields": "all",
      };
      // if (fromDate) {
      //   params["from-date"] = fromDate;
      // }

      const response = await axios.get(
        `https://content.guardianapis.com/${section}`,
        { params },
      );
      allArticlesBySection.push({
        section,
        articles: response.data.response.results,
      });
    } catch (error) {
      console.error(`Error fetching articles from section ${section}:`, error);
    }
  }

  return allArticlesBySection;
}

async function createEpub(articlesBySection) {
  const filename = `guardian-${dateString}-${timeString}.epub`;

  // Creating custom title for the ToC
  const tocTitle = `The Guardian - ${dateString} ${timeStringDisplay}`;
  const content = [
    {
      title: tocTitle, // This is for the custom ToC title
      data: `<h1>${tocTitle}</h1>`,
      excludeFromToc: true,
    },
  ];

  // Process each section and its articles
  articlesBySection.forEach(sectionGroup => {
    // Add section header as non-link in ToC
    content.push({
      title: sectionGroup.section.toUpperCase(),
      data: `<h2 style="font-weight:bold;">${sectionGroup.section.toUpperCase()}</h2>`,
      excludeFromToc: true,
    });

    // Add articles within the section
    sectionGroup.articles.forEach(article => {
      content.push({
        title: article.webTitle,
        data: article.fields.body,
        author: article.fields.byline,
        publishedDate: format(
          parseISO(article.fields.firstPublicationDate),
          "dd MMM",
        ),
        excludeFromToc: false,
      });
    });
  });

  // EPUB options including the custom ToC template path
  const options = {
    title: `The Guardian ${dateString}:${timeStringDisplay}`,
    author: "The Guardian",
    content: content,
    customHtmlTocTemplatePath: "./src/guardian-toc-html.ejs", // Path to your custom EJS template
  };

  // Creating the EPUB
  try {
    await new Epub(options, filename).promise;
    console.log(`EPUB file created successfully: ${filename}`);
  } catch (error) {
    console.error("Error creating EPUB file:", error);
  }
}

function saveSettings({ sections }) {
  const nowIso = new Date().toISOString();

  // Read existing settings and update only specific properties
  let settings = {};
  if (existsSync("settings.json")) {
    try {
      settings = JSON.parse(readFileSync("settings.json", "utf8"));
    } catch (error) {
      console.error(
        "Error reading existing settings from settings.json:",
        error,
      );
    }
  }

  // Update only the 'sections' and 'lastRun' properties
  settings.sections = sections;
  settings.lastRun = nowIso;

  // Write the updated settings back to the file
  try {
    writeFileSync("settings.json", JSON.stringify(settings, null, 4));
    console.log("Settings saved to settings.json");
  } catch (error) {
    console.error("Error saving updated settings to settings.json:", error);
  }
}

async function main() {
  const sections = await fetchSections();
  if (sections.length === 0) {
    console.log("No sections available.");
    return;
  }

  const defaultSections = loadSections();
  const selectedSections = await selectSections(sections, defaultSections);
  if (selectedSections.length === 0) {
    console.log("No sections selected.");
    return;
  }

  saveSettings({ sections: selectedSections });

  const articlesBySection = await fetchArticles(selectedSections);
  if (articlesBySection.length > 0) {
    await createEpub(articlesBySection);
  } else {
    console.log("No articles found to create EPUB.");
  }
}

main();
