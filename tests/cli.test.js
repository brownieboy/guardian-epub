import { describe, expect, it } from "vitest";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir, homedir } from "os";
import path from "path";
import { spawnSync } from "child_process";

const projectRoot = path.resolve(__dirname, "..");
const entryPath = path.join(projectRoot, "src", "get-guardian.js");
const realKeyPath = path.join(
  homedir(),
  ".guardianEpub",
  "guardian-open-platform-key.json",
);

function createTempHome({ withKey } = { withKey: false }) {
  const tempHome = mkdtempSync(path.join(tmpdir(), "guardian-epub-cli-"));
  const configDir = path.join(tempHome, ".guardianEpub");
  mkdirSync(configDir, { recursive: true });

  if (withKey && existsSync(realKeyPath)) {
    copyFileSync(realKeyPath, path.join(configDir, "guardian-open-platform-key.json"));
  }

  writeFileSync(
    path.join(configDir, "settings.json"),
    JSON.stringify({ sections: ["news"] }, null, 2),
  );

  return tempHome;
}

describe("guardianEpub CLI", () => {
  it("fails gracefully without an API key when prompts are disabled", () => {
    const tempHome = createTempHome({ withKey: false });
    const tempCwd = mkdtempSync(path.join(tmpdir(), "guardian-epub-run-"));

    try {
      const result = spawnSync(process.execPath, [entryPath], {
        cwd: tempCwd,
        env: {
          ...process.env,
          HOME: tempHome,
          GUARDIAN_EPUB_NO_PROMPT: "1",
        },
        encoding: "utf8",
      });

      const output = `${result.stdout || ""}${result.stderr || ""}`;
      expect(result.status).toBe(1);
      expect(output).toContain("API key file not found");
      expect(output).toContain("guardianEpubKey");
    } finally {
      rmSync(tempHome, { recursive: true, force: true });
      rmSync(tempCwd, { recursive: true, force: true });
    }
  });

  const hasRealKey = existsSync(realKeyPath);
  const allowLiveTests = process.env.RUN_LIVE_API_TESTS === "1";
  const maybeIt = hasRealKey && allowLiveTests ? it : it.skip;

  maybeIt(
    "runs end-to-end when an API key is available",
    { timeout: 120000 },
    () => {
      const tempHome = createTempHome({ withKey: true });
      const tempCwd = mkdtempSync(path.join(tmpdir(), "guardian-epub-run-"));

      try {
        const result = spawnSync(process.execPath, [entryPath], {
          cwd: tempCwd,
          env: {
            ...process.env,
            HOME: tempHome,
            GUARDIAN_EPUB_NO_PROMPT: "1",
          },
          encoding: "utf8",
        });

        expect(result.status).toBe(0);
        const files = readdirSync(tempCwd);
        const epubFile = files.find(name => name.startsWith("guardian-") && name.endsWith(".epub"));
        expect(epubFile).toBeTruthy();
      } finally {
        rmSync(tempHome, { recursive: true, force: true });
        rmSync(tempCwd, { recursive: true, force: true });
      }
    },
  );
});
