import axios from "axios";
import Epub from "epub-gen";
import { formatISO, parseISO, isAfter, startOfDay } from "date-fns";
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

function loadLastRunDate() {
  if (existsSync("settings.json")) {
    try {
      const settings = JSON.parse(readFileSync("settings.json", "utf8"));
      return settings.lastRun ? new Date(settings.lastRun) : null;
    } catch (error) {
      console.error("Error loading last run date from settings.json:", error);
      return null;
    }
  }
  return null;
}

// function filterRecentArticles(articles) {
//   const lastRunDate = loadLastRunDate();

//   if (!lastRunDate) {
//     return articles; // If there's no last run date, return all articles
//   }

//   const startOfLastRunDate = startOfDay(lastRunDate);

//   return articles.filter(article => {
//     const publishedDate = new Date(article.fields.firstPublicationDate);
//     const startOfPublishedDate = startOfDay(publishedDate);
//     return isAfter(startOfPublishedDate, startOfLastRunDate);
//   });
// }

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
  const lastRunDate = loadLastRunDate();
  const fromDate = lastRunDate
    ? formatISO(startOfDay(lastRunDate), { representation: "date" })
    : null;

  for (const section of sections) {
    try {
      const params = {
        "api-key": API_KEY,
        "show-fields": "all",
      };
      if (fromDate) {
        params["from-date"] = fromDate;
      }

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
  const settings = {
    sections: sections,
    lastRun: nowIso,
  };

  try {
    writeFileSync("settings.json", JSON.stringify(settings, null, 4));
    console.log("Settings saved to settings.json");
  } catch (error) {
    console.error("Error saving settings to settings.json:", error);
  }
}

function loadSectionsFromSettingsFile() {
  if (existsSync("settings.json")) {
    try {
      const settings = JSON.parse(readFileSync("settings.json"));
      return settings.sections || [];
    } catch (error) {
      console.error("Error loading sections from settings.json:", error);
      return [];
    }
  }
  return [];
}

async function main() {
  const sections = await fetchSections();
  if (sections.length === 0) {
    console.log("No sections available.");
    return;
  }

  const defaultSections = loadSectionsFromSettingsFile();
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
