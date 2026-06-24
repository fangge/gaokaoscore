#!/usr/bin/env node
// scripts/generate-pwa-icons.mjs
// 从 public/icon.svg 生成 PWA 所需的 PNG 图标
// 使用方式: node scripts/generate-pwa-icons.mjs

import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const svgPath = resolve(root, 'public/icon.svg');
const outDir = resolve(root, 'public');

const svgBuffer = readFileSync(svgPath);

const sizes = [
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'maskable-icon-512x512.png', size: 512, padding: 0.2 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32x32.png', size: 32 },
  { name: 'favicon-16x16.png', size: 16 },
];

for (const { name, size, padding } of sizes) {
  const target = resolve(outDir, name);
  if (padding) {
    // maskable 图标需要添加 padding 以确保安全区
    const inner = Math.round(size * (1 - padding * 2));
    const tmpPng = await sharp(svgBuffer)
      .resize(inner, inner)
      .png()
      .toBuffer();
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 2, g: 6, b: 23, alpha: 1 }, // #020617
      },
    })
      .composite([{ input: tmpPng, gravity: 'center' }])
      .png()
      .toFile(target);
  } else {
    await sharp(svgBuffer).resize(size, size).png().toFile(target);
  }
  console.log(`✓ generated ${name}`);
}

console.log('\nAll PWA icons generated to public/');
