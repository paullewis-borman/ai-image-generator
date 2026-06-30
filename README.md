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

This only ever adds the `ai-image-update/` subfolder — it never touches your project's own `README.md`, `CLAUDE.md`, or `.gitignore`.

```bash
git clone https://github.com/paullewis-borman/ai-image-generator.git /tmp/ai-image-generator
cp -r /tmp/ai-image-generator/ai-image-update /path/to/your-project/
rm -rf /tmp/ai-image-generator
cd /path/to/your-project/ai-image-update && npm install && cp .env.example .env
```

Don't clone or unzip this repo directly *into* an existing project folder — that brings this repo's own root `README.md`, `CLAUDE.md`, and `.gitignore` along with it, which would collide with whatever your project already has. Cloning to a scratch location first and copying out just the `ai-image-update/` subfolder avoids that entirely, since that folder carries its own `.env`, `.gitignore`, prompts, and assets and needs nothing from the host project.
