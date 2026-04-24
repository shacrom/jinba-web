#!/usr/bin/env tsx
/**
 * privacy-blur.ts
 *
 * Re-downloads pristine hero images from Wikimedia Commons, resizes to
 * 1600px max width, applies gaussian blur to privacy-sensitive rectangles
 * (license plates, faces), and writes hero.jpg + thumb.jpg.
 *
 * Downloading fresh every run guarantees we never stack blur on top of an
 * already-blurred hero (which produces ghost artefacts).
 *
 * Legal: matrículas and identifiable faces are personal data under RGPD/
 * AEPD doctrine. Hosting unblurred copies on our own domain makes us the
 * data controller of the republished image — safer to blur.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

interface BlurRegion {
  /** Fractional coords (0-1) of final image dimensions. */
  x: number;
  y: number;
  w: number;
  h: number;
  reason?: string;
}

interface HeroEntry {
  source_url: string;
  regions: BlurRegion[];
}

interface BlurConfig {
  _meta?: {
    description?: string;
    blur_sigma?: number;
    hero_max_width?: number;
    thumb_max_width?: number;
  };
  entries: Record<string, HeroEntry>;
}

const CONFIG_PATH = resolve("data/hero-blur-regions.json");
const HEROES_ROOT = resolve("public/images/models");
const USER_AGENT = "Jinba-Web/0.1 (jinba.app; contact marmibas.dev@gmail.com)";

function heroDir(key: string): string {
  const [make, model, gen] = key.split(":");
  return join(HEROES_ROOT, make, model, gen);
}

async function fetchBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`fetch ${url} → HTTP ${res.status}`);
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}

async function processHero(
  key: string,
  entry: HeroEntry,
  sigma: number,
  heroMaxWidth: number,
  thumbMaxWidth: number
): Promise<{ key: string; width: number; height: number; regions: number }> {
  if (!entry.source_url) {
    return { key, width: 0, height: 0, regions: 0 };
  }

  const dir = heroDir(key);
  if (!existsSync(dir)) {
    throw new Error(`hero directory missing: ${dir}`);
  }

  // 1. Download pristine image
  const pristine = await fetchBuffer(entry.source_url);

  // 2. Resize to max width (preserve aspect)
  const resized = await sharp(pristine)
    .resize({ width: heroMaxWidth, withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();

  // 3. Read resized dimensions to clamp regions
  const meta = await sharp(resized).metadata();
  const width = meta.width ?? heroMaxWidth;
  const height = meta.height ?? 0;

  // 4. Build one composite per region (fractional coords → pixels)
  const composites: sharp.OverlayOptions[] = [];
  for (const r of entry.regions) {
    const x = Math.max(0, Math.min(Math.round(r.x * width), width - 1));
    const y = Math.max(0, Math.min(Math.round(r.y * height), height - 1));
    const w = Math.min(Math.round(r.w * width), width - x);
    const h = Math.min(Math.round(r.h * height), height - y);
    if (w <= 0 || h <= 0) continue;

    const patch = await sharp(resized)
      .extract({ left: x, top: y, width: w, height: h })
      .blur(sigma)
      .toBuffer();
    composites.push({ input: patch, left: x, top: y });
  }

  // 5. Write hero.jpg (composited or unmodified if no regions)
  const heroOut = join(dir, "hero.jpg");
  await sharp(resized).composite(composites).jpeg({ quality: 80, mozjpeg: true }).toFile(heroOut);

  // 6. Write thumb.jpg from the already-blurred hero
  const thumbOut = join(dir, "thumb.jpg");
  await sharp(heroOut)
    .resize({ width: thumbMaxWidth, withoutEnlargement: true })
    .jpeg({ quality: 75, mozjpeg: true })
    .toFile(thumbOut);

  return { key, width, height, regions: composites.length };
}

async function main() {
  const raw = readFileSync(CONFIG_PATH, "utf8");
  const cfg = JSON.parse(raw) as BlurConfig;
  const sigma = cfg._meta?.blur_sigma ?? 28;
  const heroW = cfg._meta?.hero_max_width ?? 1600;
  const thumbW = cfg._meta?.thumb_max_width ?? 640;

  const entries = Object.entries(cfg.entries).filter(([, e]) => !!e.source_url);
  console.log(`privacy-blur: ${entries.length} heroes (sigma=${sigma}, heroW=${heroW})`);

  for (const [key, entry] of entries) {
    try {
      const r = await processHero(key, entry, sigma, heroW, thumbW);
      console.log(`  OK   ${key.padEnd(28)} ${r.width}x${r.height} regions=${r.regions}`);
    } catch (err) {
      console.error(`  FAIL ${key.padEnd(28)} ${(err as Error).message}`);
    }
    // Be polite to Wikimedia — 1s between requests
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("privacy-blur: done.");
}

main().catch((err) => {
  console.error("privacy-blur crashed:", err);
  process.exit(1);
});

// (silence unused-import warning)
void writeFileSync;
