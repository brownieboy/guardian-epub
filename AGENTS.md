# AGENTS.md

Guidance for AI coding agents (Claude Code, Copilot, etc.) working in this repo.
For human-facing docs, see [README.md](./README.md) (usage) and
[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) (build/packaging detail). This file
is a map of the codebase and the invariants that aren't obvious from a single
file — read it before making structural changes.

## What this project is

Guardian ePub builds a Kindle-friendly `.epub` from the current edition of
*The Guardian*, using the Guardian Open Platform content API. It ships two
front ends over one shared core:

- **Electron GUI** (primary, actively developed) — pick sections, reorder
  them, generate the epub, get a "send to Kindle" workflow via email/manual
  transfer.
- **Legacy Node CLI** (secondary, still maintained because the GUI depends on
  the same core) — prompt-driven terminal flow, packaged as a Node SEA
  standalone binary for cron/NAS automation.

Both front ends call into `src/core/guardian-core.js`, which does all
Guardian API fetching and epub assembly. **Any change to that file affects
both the GUI and the CLI** — check both call sites before altering its
exported function signatures.

## Layout

```
electron/               Electron main process (TS, compiled via esbuild to dist-electron/*.cjs)
  main.ts                window creation, menu, IPC handlers
  preload.ts              contextBridge API exposed to the renderer
  settings.ts             reads/writes settings.json in app.getPath("userData")
renderer/                React + Vite UI (the actual GUI), built to renderer/dist
  src/App.tsx             the whole UI: API key dialog, section picker/reorder, run + progress, results
src/
  core/guardian-core.js   shared logic: fetchSections, fetchArticles, createEpub, runGuardianEpub
  get-guardian.js         legacy CLI entrypoint (yargs + enquirer prompts), also the `guardianEpub` bin
  get-guardian-api-key.js CLI for storing the API key in ~/.guardianEpub
  utils/
    files.js               legacy CLI config dir + settings + API key persistence (~/.guardianEpub)
    images.js               Jimp-based cover image generation (date/time overlay)
    cover.js                 picks a Guardian news thumbnail to use as cover background
    sort.js                  default section ordering helper
  guardian-toc-html.ejs / guardian-toc-ncx.ejs   epub-gen TOC templates (used by both front ends)
scripts/
  archive.js / archive-os.js   package the SEA binary + required runtime assets into a zip
  send-latest-epub.js           standalone emailer (nodemailer/Gmail) — `pnpm cli:send`
tests/                    Vitest specs — cli.test.js, cover.test.js, files.test.js, sort.test.js
webpack.config.cjs        bundles src/get-guardian.js -> dist/bundle.cjs for Node SEA embedding
sea-config.json           Node SEA config that produces sea-prep.blob from dist/bundle.cjs
```

## Core data flow (`src/core/guardian-core.js`)

1. `fetchSections(apiKey)` → `GET content.guardianapis.com/sections`, returns section IDs.
2. `fetchArticles(apiKey, sections, hooks)` → per section, `GET content.guardianapis.com/{section}?show-fields=all`, with `onProgress`/`onError` hooks for UI feedback.
3. `createEpub(articlesBySection, opts, hooks)`:
   - builds a URL→filename map so in-article links to other fetched Guardian articles are rewritten to point at local xhtml files (`updateArticleLinks`, only rewrites links containing `theguardian.com` that exist in the map);
   - generates a cover image via `createCoverImage` (Jimp) using a thumbnail chosen by `selectCoverImageFromNews`;
   - renders one section-header content item plus one item per article, and hands it all to `epub-gen` along with the custom EJS TOC templates;
   - deletes the temporary cover file in a `finally` block.
4. `runGuardianEpub(options, hooks)` is the single entrypoint both the CLI and the Electron IPC handler call — it validates `apiKey`/`sections`, calls the two functions above, and reports phase changes via `hooks.onPhase` (`fetchArticles` → `buildEpub`).

Filenames inside the epub are `{runningIndex}_{slugified-title}.xhtml` — changing the slug/index logic changes internal links, so keep `createUrlToFileMap` and the per-article `filename` in `createEpub` in sync.

## Config storage (two separate locations — don't conflate them)

- **Electron GUI**: `app.getPath("userData")/settings.json`, read/written via `electron/settings.ts` (`loadSettings`/`saveSettings`/`resetSettings`), exposed to the renderer through `electron/preload.ts`'s `contextBridge` API.
- **Legacy CLI**: `~/.guardianEpub/guardian-open-platform-key.json` (`{ API_KEY }`) and `~/.guardianEpub/settings.json` (`{ sections, sectionsOrder }`), managed by `src/utils/files.js`.

These do not share state — an API key entered in the GUI is not visible to the CLI and vice versa.

## Build pipelines (three independent ones)

1. **Electron GUI**: `renderer` (Vite → `renderer/dist`) + `electron/main.ts` and `electron/preload.ts` (esbuild → `dist-electron/*.cjs`) → packaged by `electron-builder` (`pnpm electron:package`) into `release/`.
2. **Legacy CLI as plain Node**: run directly with `node ./src/get-guardian.js` (`pnpm cli:run`), no build step.
3. **Legacy CLI as a standalone binary (SEA)**: `webpack.config.cjs` bundles `src/get-guardian.js` → `dist/bundle.cjs`, then `sea-config.json` + Node's `--experimental-sea-config` produces `sea-prep.blob`, which gets injected into a copied Node binary (`pnpm cli:sea:*`). `scripts/archive.js`/`archive-os.js` then zip the binary with `epub-gen`'s templates and `jimp`'s fonts, since the SEA binary needs those at runtime but doesn't bundle them.

Don't assume `pnpm build` covers all of these — there's no single "build everything" script; each pipeline has its own `pnpm` script (see `DEVELOPER_GUIDE.md` for the full list).

## Conventions and gotchas

- `"type": "module"` at the package root — `src/**/*.js` is ESM (`import`/`export`), not CommonJS.
- `electron/` is TypeScript but is compiled with esbuild (not `tsc`) directly to `.cjs`, since Electron's main process needs CommonJS.
- The project pins a GitHub fork of `enquirer` (`brownieboy/enquirer#bugfix/270-multiselect-with-defaults`) for the CLI's multiselect prompt — don't "fix" this to the npm version without checking why the fork exists.
- `tempDir/` and `dist/`, `dist-electron/`, `release/` are build/runtime artifacts, not source — don't hand-edit them.
- `.guardian-epub.env` (repo-root, gitignored) configures `scripts/send-latest-epub.js` (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `KINDLE_EMAIL`, `EPUB_DIR`) — never commit real credentials here, and don't read this file's contents into chat/output.
- Tests run via Vitest (`pnpm test`); they cover CLI argument handling, cover-image selection, settings file I/O, and section sorting — there's no test coverage for the Electron IPC layer or the React UI.

## Where to look for a given change

| You want to... | Start here |
|---|---|
| Change what content/sections get fetched | `src/core/guardian-core.js` (`fetchSections`, `fetchArticles`) |
| Change epub structure, TOC, or cover | `src/core/guardian-core.js` (`createEpub`), `src/guardian-toc-*.ejs`, `src/utils/images.js`, `src/utils/cover.js` |
| Change the GUI's screens/flow | `renderer/src/App.tsx` |
| Change Electron menu items, IPC surface, or window behavior | `electron/main.ts`, `electron/preload.ts` |
| Change where/how GUI settings persist | `electron/settings.ts` |
| Change legacy CLI prompts/flags | `src/get-guardian.js` |
| Change legacy CLI config storage | `src/utils/files.js` |
| Change the emailer | `scripts/send-latest-epub.js` |
| Change the SEA packaging | `webpack.config.cjs`, `sea-config.json`, `scripts/archive*.js` |
