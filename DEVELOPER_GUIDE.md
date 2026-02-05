# guardian-epub Developer Guide

This guide explains how the project is structured, how the CLI works, and how to build the standalone binaries.

## Project overview

`guardian-epub` is a Node.js CLI that:

1. Fetches available Guardian sections and prompts the user to select/reorder them.
2. Downloads the latest content for each chosen section from the Guardian Open Platform.
3. Generates a Kindle-friendly ePub with a custom cover and TOC.
4. Stores user settings (API key + section choices) under `~/.guardianEpub` for future runs.

The main entrypoint is `src/get-guardian.js`, which now delegates EPUB generation to a reusable core module.

## Repository layout

- `src/get-guardian.js`: main CLI flow (fetch sections, prompt, call core).
- `src/core/guardian-core.js`: reusable core logic for fetching content and generating the EPUB (for CLI + future GUI).
- `src/get-guardian-api-key.js`: CLI to enter/update the Guardian API key.
- `src/utils/files.js`: config directory + settings + API key storage.
- `src/utils/images.js`: creates a simple cover image with date/time text using Jimp.
- `src/utils/sort.js`: helper to order sections using a default preference.
- `src/guardian-toc-html.ejs`: HTML TOC template for epub-gen.
- `src/guardian-toc-ncx.ejs`: NCX TOC template for epub-gen.
- `scripts/archive.js`: builds a platform zip containing the standalone binary and assets.
- `scripts/archive-os.js`: OS-aware wrapper for building the correct binary and archive.
- `webpack.config.cjs`: builds `dist/bundle.cjs` for Node SEA embedding.
- `sea-config.json`: Node SEA configuration to produce `sea-prep.blob`.

## Runtime configuration

The app writes config files to `~/.guardianEpub`:

- `guardian-open-platform-key.json`: stores `{ "API_KEY": "..." }`.
- `settings.json`: stores `{ "sections": [...] }` (and optional `sectionsOrder`).

The first run will prompt for the API key if the key file does not exist.

## How the CLI works (main flow)

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

1. Fetch all articles for each section (`/SECTION_ID` with `show-fields=all`).
2. Build an ePub:
   - Generate a cover with the current date/time.
   - Update article links to point to local xhtml files when possible.
   - Build content items for epub-gen, plus a section header item per section.
   - Render a custom TOC using the EJS templates.

## CLI commands

### Run the main CLI

```bash
npm run guardianEpub
```

Or, if installed globally via npm:

```bash
guardianEpub
```

### Update the API key

```bash
npm run guardianEpubKey
```

### Reselect sections

```bash
guardianEpub --selections
```

This forces the selection prompts even if you already have saved sections.

## Build and packaging

### Bundled build (for SEA)

This compiles `src/get-guardian.js` to a CommonJS bundle at `dist/bundle.cjs`:

```bash
npm run build
```

### Standalone binaries (Node SEA)

The standalone flow uses Node's Single Executable Applications (SEA) support:

1. Build the bundle (`dist/bundle.cjs`).
2. Generate `sea-prep.blob` via `sea-config.json`.
3. Copy the local Node binary and inject the blob.
4. Zip the binary and required runtime assets (epub-gen templates + Jimp fonts).

Per-platform scripts:

```bash
npm run createWinExe
npm run createLinuxBin
npm run createMacBin
npm run createMacBinIntel
```

Convenience wrapper (auto-detects platform):

```bash
npm run archive
```

### What gets included in the zip

`/scripts/archive.js` adds:

- The platform binary (`bin/get-guardian-*`).
- `guardian-toc-html.ejs` and `guardian-toc-ncx.ejs` in `/bin`.
- `node_modules/epub-gen/templates` (used at runtime).
- `node_modules/jimp/fonts` (used at runtime for the cover).

## Dependencies and local overrides

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

## Development tips

- The CLI is ESM (`"type": "module"`), so use `import` syntax.
- For quick iteration, run `npm run guardianEpub` directly without bundling.
- The file names inside the ePub are generated from article titles and a running index, so changes to title sanitization affect internal links.
- The link rewriter only updates links that match `theguardian.com` and exist in the URL-to-file map.

## Troubleshooting

- If the app exits early with “API key file not found,” run `npm run guardianEpubKey`.
- If you accidentally saved empty sections, delete `~/.guardianEpub/settings.json` and re-run with `--selections` to reselect.
- If prompts misbehave on macOS Terminal, use iTerm (see README Known Issues).

## Testing

Run the test suite:

```bash
pnpm test
```

Watch mode:

```bash
pnpm test:watch
```

Live API test (disabled by default to avoid hitting the Guardian API in CI):

```bash
RUN_LIVE_API_TESTS=1 pnpm test
```
