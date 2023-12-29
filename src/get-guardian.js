#!/usr/bin/env node

import axios from "axios";
import ora from "ora";
import { JSDOM } from "jsdom";
import Epub from "epub-gen";
import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { formatISO, parseISO } from "date-fns";
import os from "os";
import { format, utcToZonedTime } from "date-fns-tz";
import { mkdirSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import path, { dirname, join } from "path";
import { createRequire } from "module";
import { getApiKey, loadSections, saveSettings } from "./utils/files.js";
import { sortArrayByDefaultArray } from "./utils/sort.js";
import { createTextImage } from "./utils/images.js";

const require = createRequire(import.meta.url);
const { MultiSelect, Sort } = require("enquirer");

// Get the current date and time
const now = new Date();
const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const zonedTime = utcToZonedTime(now, timeZone);
const dateString = format(zonedTime, "yyyy-MM-dd");
const timeString = format(zonedTime, "HHmm");
const dayOfWeek = format(zonedTime, "EEEE");
const timeStringDisplay = format(zonedTime, "HH:mm");
const userHomeDir = os.homedir();
const configDir = path.join(userHomeDir, ".guardianEpub");
if (!existsSync(configDir)) {
  mkdirSync(configDir);
}

const argv = yargs(hideBin(process.argv)).argv;
const API_KEY = getApiKey();

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

function createUrlToFileMap(articlesBySection) {
  const urlToFileMap = {};

  let fileIndex = 1;
  articlesBySection.forEach(sectionGroup => {
    sectionGroup.articles.forEach(article => {
      const titlePart = article.webTitle
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]+/g, "")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const filename = `${fileIndex}_${titlePart}.xhtml`;

      urlToFileMap[article.webUrl] = filename;

      fileIndex++;
    });
  });

  return urlToFileMap;
}

function updateArticleLinks(articleContent, urlToFileMap) {
  // If we've pulled a page down locally, then change URLs to point to there and
  // not to the online version
  const dom = new JSDOM(articleContent);
  const document = dom.window.document;

  const links = document.querySelectorAll("a");
  links.forEach(link => {
    const href = link.href;
    if (href && href.includes("theguardian.com") && urlToFileMap[href]) {
      link.href = urlToFileMap[href];
    }
  });

  return dom.serialize();
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

async function fetchArticles(sections) {
  let allArticlesBySection = [];

  // const lastRunDate = parseISO(loadLastRunDate());
  // const fromDate = lastRunDate
  //   ? formatISO(startOfDay(lastRunDate), { representation: "date" })
  //   : null;

  for (const section of sections) {
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
  const urlToFileMap = createUrlToFileMap(articlesBySection);

  // Creating custom title for the ToC
  const tocTitle = `The Guardian - ${dateString} ${timeStringDisplay}`;
  // const content = [
  //   {
  //     title: tocTitle,
  //     data: `<h1>${tocTitle}</h1>`,
  //     excludeFromToc: true,
  //   },
  // ];
  const content = [];

  // Process each section and its articles
  articlesBySection.forEach(sectionGroup => {
    // Create a section header with an articles array
    let sectionHeader = {
      title: sectionGroup.section.toUpperCase(),
      data: `<h2 style="font-weight:bold;">${sectionGroup.section.toUpperCase()}</h2>`,
      excludeFromToc: true,
      articles: [],
    };

    // Add articles to the section
    sectionGroup.articles.forEach(article => {
      const updatedContent = updateArticleLinks(
        article.fields.body,
        urlToFileMap,
      );
      const articleFilename = urlToFileMap[article.webUrl];

      let publishDate;
      try {
        publishDate = format(
          parseISO(article?.fields?.firstPublicationDate),
          "dd MMM",
        );
      } catch (e) {
        publishDate = formatISO(new Date());
      }

      const articleItem = {
        title: article.webTitle,
        data: updatedContent,
        author: article.fields.byline,
        publishedDate: publishDate,
        excludeFromToc: false,
        filename: articleFilename,
      };

      // Add article to section's articles array
      sectionHeader.articles.push(articleItem);

      // Also add article to the main content array for epub-gen processing
      content.push(articleItem);
    });

    // Add the section header to the main content array
    content.push(sectionHeader);
  });

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const tocTemplatePath = join(__dirname, "guardian-toc-html.ejs");
  const tocNcxTemplatePath = join(__dirname, "guardian-toc-ncx.ejs");
  const coverPath = join(__dirname, "guardian-cover.jpg");

  const title = `The Guardian ${dateString}:${timeStringDisplay}`;
  await createTextImage(
    coverPath,
    "The Guardian",
    `${dayOfWeek} ${dateString}:${timeStringDisplay}`,
  );
  // console.log("TCL ~ file: get-guardian.js:215 ~ createEpub ~ content:", JSON.stringify(content, 0, 4).substring(0, 100000));

  // EPUB options including the custom ToC template path
  const options = {
    title,
    author: "The Guardian",
    content: content,
    bookId: tocTitle,
    cover: coverPath,
    customHtmlTocTemplatePath: tocTemplatePath,
    customNcxTocTemplatePath: tocNcxTemplatePath,
  };

  // Creating the EPUB
  try {
    await new Epub(options, filename).promise;
    console.log(`EPUB file created successfully: ${filename}`);
  } catch (error) {
    console.error("Error creating EPUB file:", error);
  }
}

async function main() {
  let spinner = ora("Fetching sections from Guardian API...").start();
  const sections = await fetchSections();
  if (sections.length === 0) {
    spinner.fail("No sections fetched.");
    process.exit(1);
  }

  spinner.succeed("Sections fetched successfully.");

  const defaultSections = loadSections();

  // Check for --noselect switch
  const noSelect = argv.noSelect || argv.noselect;

  let userSortedSections;

  if (!noSelect) {
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
      noSelect
        ? "--noselect switch detected, so skipping sections select.  "
        : ""
    } Fetching articles from Guardian API...`,
  ).start();

  const articlesBySection = await fetchArticles(userSortedSections);
  if (articlesBySection.length > 0) {
    spinner.succeed("Articles fetched successfully.");
    await createEpub(articlesBySection);
  } else {
    spinner.fail("No articles fetched.");
  }
}

main();
