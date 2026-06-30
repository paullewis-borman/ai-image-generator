# AI Image Update

This Cowork project wraps the `ai-image-update/` tool. See `ai-image-update/CLAUDE.md` and `ai-image-update/README.md` for the full architecture, workflow, and usage — that folder is self-contained and portable, so those docs apply regardless of which repo it ends up living in.

## Cowork-specific behavior

- After running the script (init/iterate/reset) inside a Cowork session, always show the resulting image inline via `mcp__cowork__present_files` — don't just report the filename/path in text. The user should be able to see and review the result directly in chat without opening the file manually.
- The OpenRouter API returns the USD cost of each generation in `usage.cost`. The script records this on the corresponding entry in `ai-image-update/images/manifest.json` (`cost` field) and prints it to stdout as `Cost: $X`. Whenever Cowork runs the script, report this cost to the user in chat alongside the image (e.g. "Cost: $0.04"). If `cost` is null/missing for a given model, say so rather than omitting it silently.
