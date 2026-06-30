#!/usr/bin/env node
// Generates/iterates an image via the OpenRouter Images API.
//
// Usage:
//   node generate-image.js init                  golden image + generic instructions + default prompt
//   node generate-image.js iterate "<prompt>"     generic instructions + new prompt + most recent image
//   node generate-image.js reset                  re-runs init via the API (golden image + generic + default)
//
// See CLAUDE.md for the full architecture/workflow this implements.

import { readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = import.meta.dirname;
const ASSETS_DIR = path.join(ROOT, "assets");
const PROMPTS_DIR = path.join(ROOT, "prompts");
const IMAGES_DIR = path.join(ROOT, "images");
const MANIFEST_PATH = path.join(IMAGES_DIR, "manifest.json");
const ENV_PATH = path.join(ROOT, ".env");

const API_URL = "https://openrouter.ai/api/v1/images";
const DEFAULT_MODEL = "google/gemini-3.1-flash-image"; // override with OPENROUTER_MODEL in .env

const MIME_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function fail(message) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function loadEnv() {
  if (!existsSync(ENV_PATH)) {
    fail(`.env not found at ${ENV_PATH}. Add OPENROUTER_API_KEY=... there first.`);
  }
  process.loadEnvFile(ENV_PATH);
  if (!process.env.OPENROUTER_API_KEY) {
    fail("OPENROUTER_API_KEY is not set in .env");
  }
}

async function findGoldenImage() {
  const files = await readdir(ASSETS_DIR);
  const match = files.find((f) => /^golden-image\.(png|jpe?g|webp)$/i.test(f));
  if (!match) {
    fail(`No golden-image.<ext> found in ${ASSETS_DIR}. Add one (png/jpg/webp) first.`);
  }
  return path.join(ASSETS_DIR, match);
}

async function readPromptFile(filename) {
  const filePath = path.join(PROMPTS_DIR, filename);
  if (!existsSync(filePath)) {
    fail(`Missing prompt file: ${filePath}`);
  }
  const raw = await readFile(filePath, "utf8");
  // Strip HTML comments (e.g. leftover template scaffolding) so they never
  // get sent to the API or stored in the manifest.
  return raw.replace(/<!--[\s\S]*?-->/g, "").trim();
}

async function readManifest() {
  if (!existsSync(MANIFEST_PATH)) return { images: [] };
  const raw = await readFile(MANIFEST_PATH, "utf8");
  return JSON.parse(raw);
}

async function writeManifest(manifest) {
  await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + "\n");
}

function getCurrentImage(manifest) {
  return manifest.images.find((img) => img.current);
}

function timestamp() {
  const iso = new Date().toISOString(); // 2026-06-29T21:30:00.000Z
  const date = iso.slice(0, 10).replace(/-/g, "");
  const time = iso.slice(11, 19).replace(/:/g, "");
  return `${date}-${time}`;
}

function uniqueName(ext) {
  const suffix = Math.random().toString(36).slice(2, 6);
  return `img_${timestamp()}-${suffix}${ext}`;
}

function toDataUrl(buffer, ext) {
  const mime = MIME_TYPES[ext.toLowerCase()] || "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

function buildPrompt(genericInstructions, requestPrompt) {
  return [
    "# Generic instructions (highest priority — always follow these, they override anything below)",
    genericInstructions,
    "",
    "# Requested change",
    requestPrompt,
  ].join("\n");
}

async function callOpenRouter(prompt, imageBuffer, imageExt) {
  const model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
  const body = {
    model,
    prompt,
    output_format: "png",
    aspect_ratio: process.env.OPENROUTER_ASPECT_RATIO || "16:9",
    resolution: process.env.OPENROUTER_RESOLUTION || "1K",
    input_references: [
      { type: "image_url", image_url: { url: toDataUrl(imageBuffer, imageExt) } },
    ],
  };

  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    fail(`OpenRouter API error (${res.status}) using model "${model}": ${text}`);
  }

  const json = await res.json();
  const image = json.data?.[0];
  if (!image?.b64_json) {
    fail(`No image returned from API. Raw response: ${JSON.stringify(json)}`);
  }

  return { buffer: Buffer.from(image.b64_json, "base64"), cost: json.usage?.cost };
}

async function resolveInputs(mode, iterationPrompt) {
  const genericInstructions = await readPromptFile("generic-instructions.md");

  if (mode === "init" || mode === "reset") {
    const goldenPath = await findGoldenImage();
    const defaultPrompt = await readPromptFile("default-prompt.md");
    return {
      sourceImagePath: goldenPath,
      parentImage: "golden",
      requestPrompt: defaultPrompt,
      type: mode === "init" ? "initial" : "reset",
      genericInstructions,
    };
  }

  // iterate
  const manifest = await readManifest();
  const current = getCurrentImage(manifest);
  if (!current) {
    fail('No current image in images/manifest.json. Run "init" first.');
  }
  if (!iterationPrompt) {
    fail('Usage: node generate-image.js iterate "<prompt text>"');
  }
  return {
    sourceImagePath: path.join(IMAGES_DIR, current.filename),
    parentImage: current.filename,
    requestPrompt: iterationPrompt,
    type: "iteration",
    genericInstructions,
  };
}

async function main() {
  const [, , mode, ...rest] = process.argv;
  if (!["init", "iterate", "reset"].includes(mode)) {
    fail(
      'Usage:\n  node generate-image.js init\n  node generate-image.js iterate "<prompt text>"\n  node generate-image.js reset'
    );
  }

  loadEnv();

  const { sourceImagePath, parentImage, requestPrompt, type, genericInstructions } =
    await resolveInputs(mode, rest.join(" ").trim());

  const imageBuffer = await readFile(sourceImagePath);
  const sourceExt = path.extname(sourceImagePath) || ".png";
  const combinedPrompt = buildPrompt(genericInstructions, requestPrompt);

  console.log(`Mode: ${mode}`);
  console.log(`Source image: ${path.relative(ROOT, sourceImagePath)}`);
  console.log(`Calling OpenRouter (${process.env.OPENROUTER_MODEL || DEFAULT_MODEL})...`);

  const { buffer, cost } = await callOpenRouter(combinedPrompt, imageBuffer, sourceExt);

  const outName = uniqueName(".png");
  await writeFile(path.join(IMAGES_DIR, outName), buffer);

  const manifest = await readManifest();
  for (const img of manifest.images) img.current = false;
  manifest.images.push({
    id: outName.replace(/\.[^.]+$/, ""),
    filename: outName,
    createdAt: new Date().toISOString(),
    type,
    parentImage,
    prompt: requestPrompt,
    cost: cost ?? null,
    current: true,
  });
  await writeManifest(manifest);

  console.log(`Saved: images/${outName}`);
  if (cost !== undefined) console.log(`Cost: $${cost}`);
}

main().catch((err) => fail(err.stack || err.message));
