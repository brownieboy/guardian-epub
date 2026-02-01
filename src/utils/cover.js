import { JSDOM } from "jsdom";

export function parseImageCandidatesFromHtml(html) {
  if (!html) {
    return [];
  }

  const dom = new JSDOM(html);
  const document = dom.window.document;
  const images = Array.from(document.querySelectorAll("img"));

  return images
    .map(img => {
      const src = img.getAttribute("src");
      if (!src) {
        return null;
      }
      const width =
        Number(img.getAttribute("width")) ||
        Number(img.getAttribute("data-width")) ||
        0;
      const height =
        Number(img.getAttribute("height")) ||
        Number(img.getAttribute("data-height")) ||
        0;
      const figure = img.closest("figure");
      const figcaption =
        figure?.querySelector("figcaption")?.textContent?.trim() || "";
      return {
        url: src,
        area: width > 0 && height > 0 ? width * height : 0,
        source: "main",
        caption: figcaption,
      };
    })
    .filter(Boolean);
}

export function selectCoverImageFromNews(articlesBySection) {
  const newsSection = articlesBySection.find(
    sectionGroup => sectionGroup.section === "news",
  );
  if (!newsSection || newsSection.articles.length === 0) {
    return null;
  }

  for (const article of newsSection.articles) {
    const fields = article.fields || {};
    const mainCandidates = parseImageCandidatesFromHtml(fields.main);
    if (mainCandidates.length > 0) {
      const [first] = mainCandidates;
      return {
        url: first.url,
        caption: first.caption || "",
      };
    }

    if (fields.thumbnail) {
      return {
        url: fields.thumbnail,
        caption: "",
      };
    }
  }

  return null;
}
