# AI Image Update

Node.js script that calls the OpenRouter API using a stored token and a stored prompt (in a markdown file) to instruct the AI to update an existing image.

To use this repo inside another project, clone or `git submodule add` it into a directory you choose (e.g. `your-project/ai-image-update`) — see README.md. The destination directory you pick is what keeps it isolated from your project's own files; no internal restructuring of this repo is needed for that.

## Key assets

1. **Golden image** (`assets/golden-image.<ext>`) — the canonical starting image. Used as the base for the very first generation each session and as the source image whenever the user asks to reset.
2. **Generic image instructions** (`prompts/generic-instructions.md`) — fixed rules covering size, aspect ratio, style, and what may/may not be changed on the golden image. These instructions **always take precedence** over any user-supplied prompt and must be included on every single API call, with no exceptions.
3. **Default user prompt** (`prompts/default-prompt.md`) — the starting prompt used whenever there is no specific user request yet (first generation of a session, or a reset).

## Folder layout

```
assets/             golden image lives here
prompts/
  generic-instructions.md   always-included, highest-precedence rules
  default-prompt.md         default starting prompt
images/
  manifest.json      history/state of every generated image
  <generated files>  unique-named output images
.env                 OPENROUTER_API_KEY (not committed)
```

## Workflow

- **Generate new image**: the caller (a Cowork session, a CI job, your own backend code) runs the script with the golden image + generic instructions + default prompt. Output is saved to `images/` under a unique name and recorded in `images/manifest.json` as the new "current" image.
- **Iterate**: Each further user request is sent with the generic instructions + the new user prompt + the **most recently generated image** (the current image, not the golden image), so edits chain on top of one another. Output again gets a unique name and becomes the new current image.
- **Reset to default**: On "reset to the default image," the script is re-run with the original inputs — golden image + generic instructions + default prompt — to **regenerate a fresh default image via the API** (not a plain file copy). This becomes the new current image and the iteration chain continues from it. The literal golden image file itself remains untouched on disk as the permanent fallback if a regenerated/iterated image is ever unusable.

## State tracking

`images/manifest.json` records, per generated image: filename, timestamp, type (`initial` | `iteration` | `reset`), the prompt used, the parent image it was derived from, and a `current` flag marking the active image. The caller reads this file to know which image to pass in for the next request.

## Naming convention

Generated images are named `img_<YYYYMMDD-HHMMSS>-<4-char-suffix>.<ext>` to guarantee uniqueness and chronological sortability.

## Cowork-specific behavior

- After running the script (init/iterate/reset) inside a Cowork session, always show the resulting image inline via `mcp__cowork__present_files` — don't just report the filename/path in text. The user should be able to see and review the result directly in chat without opening the file manually.
- The OpenRouter API returns the USD cost of each generation in `usage.cost`. The script records this on the corresponding entry in `images/manifest.json` (`cost` field) and prints it to stdout as `Cost: $X`. Whenever Cowork runs the script, report this cost to the user in chat alongside the image (e.g. "Cost: $0.04"). If `cost` is null/missing for a given model, say so rather than omitting it silently.
