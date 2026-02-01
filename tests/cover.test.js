import { describe, expect, it } from "vitest";
import {
  parseImageCandidatesFromHtml,
  selectCoverImageFromNews,
} from "../src/utils/cover.js";

describe("parseImageCandidatesFromHtml", () => {
  it("extracts image URLs and figcaptions", () => {
    const html = `
      <figure>
        <img src="https://example.com/img.jpg" width="640" height="480" />
        <figcaption>Photo by Someone</figcaption>
      </figure>
    `;

    const result = parseImageCandidatesFromHtml(html);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      url: "https://example.com/img.jpg",
      caption: "Photo by Someone",
      area: 640 * 480,
      source: "main",
    });
  });
});

describe("selectCoverImageFromNews", () => {
  it("selects the first main image from the news section", () => {
    const articlesBySection = [
      {
        section: "news",
        articles: [
          {
            fields: {
              main: `
                <figure>
                  <img src="https://example.com/news.jpg" width="800" height="600" />
                  <figcaption>News caption</figcaption>
                </figure>
              `,
            },
          },
        ],
      },
    ];

    const result = selectCoverImageFromNews(articlesBySection);

    expect(result).toEqual({
      url: "https://example.com/news.jpg",
      caption: "News caption",
    });
  });

  it("falls back to thumbnail when no main image is present", () => {
    const articlesBySection = [
      {
        section: "news",
        articles: [
          {
            fields: {
              thumbnail: "https://example.com/thumb.jpg",
            },
          },
        ],
      },
    ];

    const result = selectCoverImageFromNews(articlesBySection);

    expect(result).toEqual({
      url: "https://example.com/thumb.jpg",
      caption: "",
    });
  });
});
