# guardian-epub Developer Guide

This guide explains how the project is structured, how the CLI works, and how to build the standalone binaries.

## Project overview

`guardian-epub` is now primarily an Electron GUI app that:

1. Fetches available Guardian sections and prompts the user to select/reorder them.
2. Downloads the latest content for each chosen section from the Guardian Open Platform.
3. Generates a Kindle-friendly ePub with a custom cover and TOC.
4. Stores user settings (API key + section choices) under `~/.guardianEpub` for future runs.

The main GUI entrypoint is `electron/main.ts`, which delegates EPUB generation to the reusable core module.

## Repository layout

Primary (Electron GUI):

- `electron/main.ts`: Electron main process + IPC.
- `electron/preload.ts`: IPC bridge for the renderer.
- `renderer/`: React/Vite renderer UI.
- `src/core/guardian-core.js`: reusable core logic for fetching content and generating the EPUB.
- `src/utils/images.js`: creates a simple cover image with date/time text using Jimp.
- `src/utils/sort.js`: helper to order sections using a default preference.
- `src/guardian-toc-html.ejs`: HTML TOC template for epub-gen.
- `src/guardian-toc-ncx.ejs`: NCX TOC template for epub-gen.

Legacy CLI + SEA (legacy):

- `src/get-guardian.js`: legacy CLI flow (fetch sections, prompt, call core).
- `src/get-guardian-api-key.js`: CLI to enter/update the Guardian API key.
- `src/utils/files.js`: legacy CLI config directory + settings + API key storage.
- `scripts/archive.js`: builds a platform zip containing the standalone binary and assets.
- `scripts/archive-os.js`: OS-aware wrapper for building the correct binary and archive.
- `webpack.config.cjs`: builds `dist/bundle.cjs` for Node SEA embedding.
- `sea-config.json`: Node SEA configuration to produce `sea-prep.blob` (legacy CLI).

## Runtime configuration

Electron GUI stores settings in the OS user data directory (via `app.getPath("userData")/settings.json`).

## How the Electron GUI works (main flow)

The Electron GUI builds on the same core logic that originally powered the CLI. The UI triggers the core via IPC, and the core handles the Guardian API calls and EPUB generation.

1. UI collects API key and sections, then triggers the core via IPC.
2. The core fetches articles and builds the EPUB.
3. UI shows progress and results.

## Electron GUI commands

Dev:

```bash
pnpm electron:dev
```

Build:

```bash
pnpm electron:build
```

Package:

```bash
pnpm electron:package
```

## Legacy CLI App

The project started as a Node.js CLI, and that code still exists. Most of the Guardian API and EPUB logic was originally written for the CLI and then extracted into the shared core. As a result, changes to CLI behavior can still affect the Electron GUI, because the GUI relies on the same core pipeline.

Developers may need to update CLI-facing code when modifying core behavior or refactoring the content pipeline, even if end users are expected to use the GUI.

### Legacy CLI configuration

Legacy CLI stores config files in `~/.guardianEpub`:

- `guardian-open-platform-key.json`: stores `{ "API_KEY": "..." }`.
- `settings.json`: stores `{ "sections": [...] }` (and optional `sectionsOrder`).

The first CLI run will prompt for the API key if the key file does not exist.

### Legacy CLI commands

Run the main CLI:

```bash
pnpm cli:run
```

Or, if installed globally via npm:

```bash
guardianEpub
```

Update the API key:

```bash
pnpm cli:key
```

Reselect sections:

```bash
guardianEpub --selections
```

This forces the selection prompts even if you already have saved sections.

### Legacy CLI flow (main)

High-level flow in `src/get-guardian.js`:

1. Determine local date/time and initialize `~/.guardianEpub`.
2. Load the API key via `getApiKey()` (prompts if missing).
3. Fetch available sections from the Guardian API (`/sections`).
4. If `--selections` is used (or no saved sections exist):
   - Prompt for section selection (multi-select).
   - Reorder selected sections (drag/sort UI).
   - Persist selection order to `settings.json`.
5. If `--selections` is not used and saved sections exist:
   - Load saved sections from `settings.json`.
6. Call the core to fetch articles and build the EPUB.

High-level flow in `src/core/guardian-core.js`:

Note: changes here affect both the legacy CLI and the Electron GUI, since the GUI calls into this shared core.

1. Fetch all articles for each section (`/SECTION_ID` with `show-fields=all`).
2. Build an ePub:
   - Generate a cover with the current date/time.
   - Update article links to point to local xhtml files when possible.
   - Build content items for epub-gen, plus a section header item per section.
   - Render a custom TOC using the EJS templates.

### Legacy CLI build and packaging (SEA)

SEA (Single Executable Applications) is a Node.js feature that bundles your JS into a single executable. We use it for the legacy CLI so users can run the tool without installing Node.js.

Bundled build (SEA):

```bash
pnpm cli:sea:build
```

Standalone binaries:

1. Build the bundle (`dist/bundle.cjs`).
2. Generate `sea-prep.blob` via `sea-config.json`.
3. Copy the local Node binary and inject the blob.
4. Zip the binary and required runtime assets (epub-gen templates + Jimp fonts).

Per-platform scripts:

```bash
pnpm cli:sea:win
pnpm cli:sea:linux
pnpm cli:sea:mac
pnpm cli:sea:mac:intel
```

Convenience wrapper:

```bash
pnpm cli:sea:archive
```

What gets included in the zip:

- The platform binary (`bin/get-guardian-*`).
- `guardian-toc-html.ejs` and `guardian-toc-ncx.ejs` in `/bin`.
- `node_modules/epub-gen/templates` (used at runtime).
- `node_modules/jimp/fonts` (used at runtime for the cover).

### Legacy CLI dependencies and tips

Notable runtime dependencies:

- `axios`: Guardian API requests.
- `enquirer`: CLI prompts (MultiSelect + Sort).
- `epub-gen`: EPUB creation and TOC handling.
- `jimp`: cover image creation.
- `jsdom`: link rewriting for local EPUB navigation.
- `yargs`: CLI flags.

This project currently depends on a GitHub fork of Enquirer:

```json
"enquirer": "github:brownieboy/enquirer#bugfix/270-multiselect-with-defaults"
```

Tips:

- The CLI is ESM (`"type": "module"`), so use `import` syntax.
- For quick iteration, run `pnpm cli:run` directly without bundling.
- The file names inside the ePub are generated from article titles and a running index, so changes to title sanitization affect internal links.
- The link rewriter only updates links that match `theguardian.com` and exist in the URL-to-file map.

Troubleshooting:

- If the app exits early with “API key file not found,” run `pnpm cli:key`.
- If you accidentally saved empty sections, delete `~/.guardianEpub/settings.json` and re-run with `--selections` to reselect.
- If prompts misbehave on macOS Terminal, use iTerm (see README Known Issues).
