/**
 * 5-process-bg.js
 * Background Processing - Replace green background with transparency
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const states = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];
const INPUT_DIR = path.join(__dirname, '..', 'frames');
const OUTPUT_DIR = path.join(__dirname, '..', 'frames');

// Green background thresholds
const GREEN_R_MIN = 0;
const GREEN_R_MAX = 100;
const GREEN_G_MIN = 150;
const GREEN_B_MIN = 0;
const GREEN_B_MAX = 100;

async function isGreenPixel(r, g, b) {
  // Check if pixel is green-ish (RGB: ~0, ~255, ~0 with some tolerance)
  return g > GREEN_G_MIN && g > r * 1.5 && g > b * 1.5 && r < GREEN_R_MAX && b < GREEN_B_MAX;
}

async function processFrame(inputPath, outputPath) {
  try {
    const inputBuffer = await sharp(inputPath)
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = inputBuffer;
    const { width, height, channels } = info;

    // Create a new buffer for RGBA output
    const pixels = Buffer.alloc(width * height * 4);

    for (let i = 0; i < width * height; i++) {
      const srcIdx = i * channels;
      const dstIdx = i * 4;

      const r = data[srcIdx];
      const g = data[srcIdx + 1];
      const b = data[srcIdx + 2];

      // Copy RGB
      pixels[dstIdx] = r;
      pixels[dstIdx + 1] = g;
      pixels[dstIdx + 2] = b;

      // Check if green background, set alpha to 0
      if (await isGreenPixel(r, g, b)) {
        pixels[dstIdx + 3] = 0;
      } else {
        pixels[dstIdx + 3] = 255;
      }
    }

    // Save as PNG with transparency
    await sharp(pixels, {
      raw: {
        width,
        height,
        channels: 4
      }
    })
      .png()
      .toFile(outputPath.replace('.png', '_transparent.png'));

    console.log(`  Processed: ${path.basename(outputPath)}`);
  } catch (err) {
    console.error(`  Error processing ${path.basename(inputPath)}: ${err.message}`);
  }
}

async function main() {
  console.log('===========================================');
  console.log('  Background Processing (Green -> Alpha)');
  console.log('===========================================\n');

  for (const state of states) {
    console.log(`[${state}]`);

    const stateDir = path.join(INPUT_DIR, state);

    // Check if directory exists
    if (!fs.existsSync(stateDir)) {
      console.log(`  Directory not found: ${stateDir}`);
      continue;
    }

    // Find frame files
    const files = fs.readdirSync(stateDir)
      .filter(f => f.startsWith('frame_') && f.endsWith('.png') && !f.includes('_transparent'));

    if (files.length === 0) {
      console.log('  No frames found');
      continue;
    }

    for (const file of files) {
      const inputPath = path.join(stateDir, file);
      const outputPath = path.join(stateDir, file);
      await processFrame(inputPath, outputPath);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
