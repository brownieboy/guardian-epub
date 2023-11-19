import axios from "axios";
import Epub from "epub-gen";
import { readFileSync, writeFileSync, existsSync } from "fs";
import inquirer from "inquirer";

function loadApiKey() {
  try {
    const jsonData = readFileSync("guardian-open-platform-key.json");
    return JSON.parse(jsonData).API_KEY;
  } catch (error) {
    console.error("Error reading API key from file:", error);
    process.exit(1);
  }
}

const API_KEY = loadApiKey();

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

  for (const section of sections) {
    try {
      const response = await axios.get(
        `https://content.guardianapis.com/${section}`,
        {
          params: {
            "api-key": API_KEY,
            "show-fields": "all",
          },
        },
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
  const now = new Date();
  const dateString = `${now.getFullYear()}-${String(
    now.getMonth() + 1,
  ).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const timeString = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes(),
  ).padStart(2, "0")}`;
  const filename = `guardian-${dateString}-${timeString.replace(":", "")}.epub`;

  const tocTitle = `The Guardian - ${dateString} ${timeString}`;
  const content = [];

  content.push({
    title: tocTitle,
    data: `<h1>${tocTitle}</h1>`,
    excludeFromToc: true,
  });

  articlesBySection.forEach(sectionGroup => {
    content.push({
      title: sectionGroup.section.toUpperCase(),
      data: `<h2 style="font-weight:bold;">${sectionGroup.section.toUpperCase()}</h2>`,
      excludeFromToc: true,
    });

    sectionGroup.articles.forEach(article => {
      content.push({
        title: article.webTitle,
        data: article.fields.body,
        author: article.fields.byline,
        excludeFromToc: false,
      });
    });
  });

  const options = {
    title: "The Guardian Content",
    author: "The Guardian",
    content: content,
  };

  try {
    await new Epub(options, filename).promise;
    console.log(`EPUB file created successfully: ${filename}`);
  } catch (error) {
    console.error("Error creating EPUB file:", error);
  }
}

function saveSectionsToFile(sections) {
  try {
    writeFileSync("sections.json", JSON.stringify(sections, null, 4));
    console.log("Selected sections saved to sections.json");
  } catch (error) {
    console.error("Error saving sections to file:", error);
  }
}

function loadSectionsFromFile() {
  if (existsSync("sections.json")) {
    try {
      const data = readFileSync("sections.json");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error loading sections from file:", error);
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

  const defaultSections = loadSectionsFromFile();
  const selectedSections = await selectSections(sections, defaultSections);
  if (selectedSections.length === 0) {
    console.log("No sections selected.");
    return;
  }

  saveSectionsToFile(selectedSections);

  const articlesBySection = await fetchArticles(selectedSections);
  if (articlesBySection.length > 0) {
    await createEpub(articlesBySection);
  } else {
    console.log("No articles found to create EPUB.");
  }
}

main();
