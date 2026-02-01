import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";

let tempHomeDir = "";

vi.mock("os", async () => {
  const actual = await vi.importActual("os");
  return {
    ...actual,
    homedir: () => tempHomeDir,
  };
});

describe("files utils", () => {
  beforeEach(() => {
    tempHomeDir = mkdtempSync(path.join(tmpdir(), "guardian-epub-test-"));
    vi.resetModules();
  });

  afterEach(() => {
    rmSync(tempHomeDir, { recursive: true, force: true });
  });

  it("writes the API key to the config directory", async () => {
    const files = await import("../src/utils/files.js");
    const apiFilePath = files.getApiFilePath();

    files.setApiKey("test-key");

    const raw = readFileSync(apiFilePath, "utf8");
    expect(JSON.parse(raw)).toEqual({ API_KEY: "test-key" });
  });

  it("persists and loads saved sections", async () => {
    const files = await import("../src/utils/files.js");

    files.saveSettings({ sections: ["news", "world"] });

    const loaded = files.loadSections();
    expect(loaded).toEqual(["news", "world"]);
  });
});
