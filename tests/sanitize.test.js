import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { sanitizeArticleHtml } from "../src/core/guardian-core.js";

function bodyOf(html) {
  return new JSDOM(html).window.document.body;
}

describe("sanitizeArticleHtml", () => {
  it("removes gu-atom elements and everything inside them", () => {
    const html = `
      <p>Before</p>
      <gu-atom>
        <div><iframe src="https://www.youtube.com/embed/abc"></iframe></div>
      </gu-atom>
      <p>After</p>
    `;

    const body = bodyOf(sanitizeArticleHtml(html));

    expect(body.querySelector("gu-atom")).toBeNull();
    expect(body.querySelector("iframe")).toBeNull();
    expect(body.querySelectorAll("p")).toHaveLength(2);
    expect(body.querySelectorAll("p")[0].textContent).toBe("Before");
    expect(body.querySelectorAll("p")[1].textContent).toBe("After");
  });

  it("removes standalone iframe elements outside gu-atom", () => {
    const html = `
      <p>Middle</p>
      <iframe src="https://example.com/other"></iframe>
    `;

    const body = bodyOf(sanitizeArticleHtml(html));

    expect(body.querySelector("iframe")).toBeNull();
    expect(body.querySelector("p").textContent).toBe("Middle");
  });

  it("removes video and source elements", () => {
    const html = `
      <p>Before</p>
      <video>
        <source src="https://example.com/video.mp4" type="video/mp4" />
        <source src="https://example.com/video.webm" type="video/webm" />
      </video>
      <p>After</p>
    `;

    const body = bodyOf(sanitizeArticleHtml(html));

    expect(body.querySelector("video")).toBeNull();
    expect(body.querySelector("source")).toBeNull();
    expect(body.querySelectorAll("p")).toHaveLength(2);
  });

  it("leaves surrounding ordinary content intact", () => {
    const html = `
      <h2>Headline</h2>
      <p>Some text with a <a href="https://theguardian.com/foo">link</a>.</p>
      <img src="https://example.com/img.jpg" alt="a photo" />
      <gu-atom><iframe src="https://example.com/embed"></iframe></gu-atom>
    `;

    const body = bodyOf(sanitizeArticleHtml(html));

    expect(body.querySelector("h2").textContent).toBe("Headline");
    expect(body.querySelector("a").getAttribute("href")).toBe(
      "https://theguardian.com/foo",
    );
    expect(body.querySelector("img").getAttribute("src")).toBe(
      "https://example.com/img.jpg",
    );
  });

  it("removes multiple embedded/media elements from a single article", () => {
    const html = `
      <p>Before</p>
      <gu-atom><iframe src="https://example.com/video"></iframe></gu-atom>
      <p>Middle</p>
      <iframe src="https://example.com/other"></iframe>
      <p>After</p>
    `;

    const body = bodyOf(sanitizeArticleHtml(html));

    expect(body.querySelectorAll("gu-atom, iframe, video, source")).toHaveLength(0);
    const paragraphs = body.querySelectorAll("p");
    expect(paragraphs).toHaveLength(3);
    expect(paragraphs[0].textContent).toBe("Before");
    expect(paragraphs[1].textContent).toBe("Middle");
    expect(paragraphs[2].textContent).toBe("After");
  });

  it("leaves ordinary Guardian article content unchanged", () => {
    const html = `<p>Just a plain paragraph.</p><h2>A heading</h2>`;

    const body = bodyOf(sanitizeArticleHtml(html));

    expect(body.querySelector("p").textContent).toBe("Just a plain paragraph.");
    expect(body.querySelector("h2").textContent).toBe("A heading");
  });
});
