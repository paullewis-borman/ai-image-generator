# AI Image Update

Node.js script that updates an image via the OpenRouter Images API. Each run sends a base image plus a prompt to a model and saves the result as a new image, tracked in `images/manifest.json`.

Three modes:

- **init** — generate from the golden image using the default prompt.
- **iterate** — apply a new prompt on top of the most recently generated image.
- **reset** — regenerate the default image from the golden image via the API (not a file copy), becoming the new current image.

A fixed set of "generic instructions" (size, aspect ratio, style, what may/may not change) is prepended to every prompt on every call and always takes precedence over the per-request prompt.

This folder is self-contained: every path is resolved relative to its own location (not the working directory), and it ships its own `.gitignore`. To use it in another project, copy this whole folder in as-is — no changes needed.

## Setup

Requires Node.js >= 20.6.

```bash
npm install   # no dependencies yet, but keeps lockfile/engine checks happy
cp .env.example .env
```

Edit `.env` and set your key:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

Optional overrides in `.env` (defaults shown):

```
OPENROUTER_MODEL=google/gemini-3.1-flash-image
OPENROUTER_ASPECT_RATIO=16:9
OPENROUTER_RESOLUTION=1K
```

Add a golden image at `assets/golden-image.png` (or `.jpg`/`.jpeg`/`.webp`) — see `assets/README.md`. This file is the permanent fallback and is never overwritten by the script.

## Usage

```bash
node generate-image.js init
node generate-image.js iterate "make the sky overcast"
node generate-image.js reset
```

Equivalent npm scripts: `npm run init`, `npm run iterate -- "<prompt>"`, `npm run reset`.

Each run prints the mode, source image, model used, the saved output path under `images/`, and the cost (`Cost: $X`) reported by the OpenRouter API. If the API doesn't return a cost, the script says so rather than omitting it.

## How it works

1. `generic-instructions.md` (`prompts/`) is read and prepended to the request prompt on every call, with explicit precedence over it.
2. The source image is selected by mode: `init`/`reset` use `assets/golden-image.*`; `iterate` uses the image currently flagged `"current": true` in `images/manifest.json`.
3. The combined prompt + source image are sent to OpenRouter (`POST /api/v1/images`).
4. The returned image is saved to `images/` as `img_<YYYYMMDD-HHMMSS>-<4-char-suffix>.png`, and a new entry is appended to `images/manifest.json` (marked `current`; the previous current entry is unmarked).

## Folder layout

```
assets/golden-image.<ext>     canonical starting image (checked in, never modified by the script)
prompts/generic-instructions.md   always-on rules, highest precedence on every call
prompts/default-prompt.md         prompt used by init/reset
images/                            generated outputs + manifest.json (history/state)
generate-image.js                  the script
.env                                OPENROUTER_API_KEY etc. (not committed)
```

See `CLAUDE.md` for the full design rationale, and `assets/README.md` / `images/README.md` for details on those folders.

## Notes for agents

- This folder is self-contained and portable — `.gitignore`, `.env`, and all path resolution live inside it, so it can be copied wholesale into another repo without edits.
- Always run `iterate` against the image marked `"current": true` in `images/manifest.json`, not the golden image — only `init`/`reset` use the golden image.
- Never edit or delete `assets/golden-image.*`.
- Never skip `generic-instructions.md` or let a user prompt override it; the script enforces this by prepending it, but don't construct calls that bypass `generate-image.js`.
- Generated PNGs/JPGs/WEBPs under `images/` are gitignored (only `manifest.json` and the golden image are tracked); don't expect `git status` to show new generations as untracked-but-missing.
- If this script is being run inside a Cowork session, show the resulting image inline (`mcp__cowork__present_files`) and report the `cost` from stdout/manifest — don't just report a filename.
