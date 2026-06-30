# ai-image-generator

Self-contained tool for updating an image via the OpenRouter API. All the logic, prompts, and assets live in [`ai-image-update/`](ai-image-update/README.md).

## Install standalone

```bash
git clone https://github.com/paullewis-borman/ai-image-generator.git
cd ai-image-generator/ai-image-update
npm install
cp .env.example .env   # then add your OPENROUTER_API_KEY
```

See [`ai-image-update/README.md`](ai-image-update/README.md) for full setup, usage, and how it works.

## Install into another project

Copy the `ai-image-update/` folder into your repo or backend as-is — no `git clone` of this whole repo needed. It resolves its own paths and carries its own `.env`, `.gitignore`, prompts, and assets, so it works out of the box with no changes to the host project.
