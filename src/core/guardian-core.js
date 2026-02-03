import axios from "axios";
import { JSDOM } from "jsdom";
import Epub from "epub-gen";
import { formatISO, parseISO } from "date-fns";
import { format, utcToZonedTime } from "date-fns-tz";
import { existsSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { createCoverImage } from "../utils/images.js";
import { selectCoverImageFromNews } from "../utils/cover.js";

function getZonedDateParts(dateOverride) {
  const now = dateOverride ? new Date(dateOverride) : new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zonedTime = utcToZonedTime(now, timeZone);

  return {
    zonedTime,
    dateString: format(zonedTime, "yyyy-MM-dd"),
    timeString: format(zonedTime, "HHmm"),
    dayOfWeek: format(zonedTime, "EEEE"),
    timeStringDisplay: format(zonedTime, "HH:mm"),
  };
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

export async function fetchSections(apiKey, hooks = {}) {
  try {
    const response = await axios.get(
      "https://content.guardianapis.com/sections",
      {
        params: {
          "api-key": apiKey,
        },
      },
    );
    return response.data.response.results.map(section => section.id);
  } catch (error) {
    hooks.onError?.(error);
    return [];
  }
}

export async function fetchArticles(apiKey, sections, hooks = {}) {
  let allArticlesBySection = [];

  for (const [index, section] of sections.entries()) {
    try {
      hooks.onProgress?.({
        current: index + 1,
        total: sections.length,
        message: section,
      });

      const params = {
        "api-key": apiKey,
        "show-fields": "all",
      };

      const response = await axios.get(
        `https://content.guardianapis.com/${section}`,
        { params },
      );
      allArticlesBySection.push({
        section,
        articles: response.data.response.results,
      });
    } catch (error) {
      hooks.onError?.(error);
    }
  }

  return allArticlesBySection;
}

export async function createEpub(
  articlesBySection,
  { outputDir, dateOverride } = {},
  hooks = {},
) {
  const { dateString, timeString, dayOfWeek, timeStringDisplay } =
    getZonedDateParts(dateOverride);
  const filename = `guardian-${dateString}-${timeString}.epub`;
  const urlToFileMap = createUrlToFileMap(articlesBySection);

  const tocTitle = `The Guardian - ${dateString} ${timeStringDisplay}`;
  const content = [];

  articlesBySection.forEach(sectionGroup => {
    let sectionHeader = {
      title: sectionGroup.section.toUpperCase(),
      data: `<h2 style="font-weight:bold;">${sectionGroup.section.toUpperCase()}</h2>`,
      excludeFromToc: true,
      articles: [],
    };

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

      sectionHeader.articles.push(articleItem);
      content.push(articleItem);
    });

    content.push(sectionHeader);
  });

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const tocTemplatePath = join(__dirname, "..", "guardian-toc-html.ejs");
  const tocNcxTemplatePath = join(__dirname, "..", "guardian-toc-ncx.ejs");

  const targetDir = outputDir || process.cwd();
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  const coverPath = join(targetDir, "guardian-cover.jpg");
  const epubPath = join(targetDir, filename);

  const title = `The Guardian ${dateString}:${timeStringDisplay}`;
  const coverImage = selectCoverImageFromNews(articlesBySection);
  await createCoverImage(
    coverPath,
    "The Guardian",
    `${dayOfWeek} ${dateString}:${timeStringDisplay}`,
    coverImage?.url || null,
    coverImage?.caption || "",
  );

  const options = {
    title,
    author: "The Guardian",
    content: content,
    bookId: tocTitle,
    cover: coverPath,
    customHtmlTocTemplatePath: tocTemplatePath,
    customNcxTocTemplatePath: tocNcxTemplatePath,
  };

  try {
    hooks.onLog?.(`Creating EPUB at ${epubPath}`);
    await new Epub(options, epubPath).promise;
    return { epubPath, dateString, timeString, timeStringDisplay };
  } catch (error) {
    hooks.onError?.(error);
    return { epubPath: null };
  }
}

export async function runGuardianEpub(options, hooks = {}) {
  const { apiKey, sections, outputDir, dateOverride } = options || {};
  if (!apiKey || !sections || sections.length === 0) {
    throw new Error("runGuardianEpub requires apiKey and sections.");
  }

  hooks.onPhase?.("fetchArticles");
  const articlesBySection = await fetchArticles(apiKey, sections, hooks);
  const totalArticles = articlesBySection.reduce(
    (total, sectionGroup) => total + sectionGroup.articles.length,
    0,
  );

  if (articlesBySection.length === 0 || totalArticles === 0) {
    return {
      epubPath: null,
      totalArticles,
      usedSections: sections,
    };
  }

  hooks.onPhase?.("buildEpub");
  const epubResult = await createEpub(
    articlesBySection,
    { outputDir, dateOverride },
    hooks,
  );

  return {
    ...epubResult,
    totalArticles,
    usedSections: sections,
  };
}
