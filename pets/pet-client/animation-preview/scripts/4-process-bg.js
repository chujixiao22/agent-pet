/**
 * 4-process-bg.js
 * 背景抠图 - 将绿色背景替换为透明
 * 使用 sharp 库进行图像处理
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// 状态列表
const states = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '..', 'frames');

// 绿色背景配置
const BG_COLOR = { r: 0, g: 255, b: 0 };  // #00FF00
const TOLERANCE = 30;  // 颜色容差范围

// 检测是否为绿色背景像素
function isGreenBackground(r, g, b) {
  const diff = Math.abs(r - BG_COLOR.r) + Math.abs(g - BG_COLOR.g) + Math.abs(b - BG_COLOR.b);
  return diff <= TOLERANCE * 3;  // 允许一定的容差
}

// 处理背景抠图
async function processBackground(state, index, total) {
  const stateDir = path.join(OUTPUT_DIR, state);
  const rawDir = path.join(stateDir, 'raw');
  const outputDir = stateDir;

  console.log(`[${index}/${total}] Processing background for "${state}"...`);

  // 检查 raw 目录是否存在
  if (!fs.existsSync(rawDir)) {
    console.error(`  [ERROR] Raw frames directory not found: ${rawDir}`);
    console.error(`  Please run 3-extract-frames.js first!`);
    return { state, count: 0, error: 'Raw frames not found' };
  }

  // 获取所有帧文件
  const frameFiles = fs.readdirSync(rawDir)
    .filter(f => f.startsWith('frame_') && f.endsWith('.png'))
    .sort();

  if (frameFiles.length === 0) {
    console.error(`  [ERROR] No frames found in ${rawDir}`);
    return { state, count: 0, error: 'No frames found' };
  }

  console.log(`  Found ${frameFiles.length} frames to process`);

  let processedCount = 0;

  for (const frameFile of frameFiles) {
    try {
      const inputPath = path.join(rawDir, frameFile);
      const outputFileName = frameFile.replace('frame_', '');  // frame_001.png -> 001.png
      const outputPath = path.join(outputDir, outputFileName);

      // 使用 sharp 读取图片
      const image = sharp(inputPath);
      const metadata = await image.metadata();

      // 获取原始像素数据
      const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

      // 创建 RGBA 输出缓冲区
      const rgbaData = Buffer.alloc(info.width * info.height * 4);

      for (let i = 0; i < data.length; i += info.channels) {
        const pixelIndex = i / info.channels;
        const outputIndex = pixelIndex * 4;

        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 如果是绿色背景，设为透明；否则保留原色
        if (isGreenBackground(r, g, b)) {
          rgbaData[outputIndex] = 0;      // R
          rgbaData[outputIndex + 1] = 0;  // G
          rgbaData[outputIndex + 2] = 0;  // B
          rgbaData[outputIndex + 3] = 0;  // A (透明)
        } else {
          rgbaData[outputIndex] = r;      // R
          rgbaData[outputIndex + 1] = g;  // G
          rgbaData[outputIndex + 2] = b;  // B
          rgbaData[outputIndex + 3] = 255; // A (不透明)
        }
      }

      // 输出处理后的图片
      await sharp(rgbaData, {
        raw: {
          width: info.width,
          height: info.height,
          channels: 4
        }
      })
        .png()  // 输出为 PNG 以支持透明通道
        .toFile(outputPath);

      processedCount++;
      process.stdout.write(`  Processed: ${frameFile} -> ${outputFileName}\r`);
    } catch (err) {
      console.error(`\n  [ERROR] Failed to process ${frameFile}: ${err.message}`);
    }
  }

  console.log(`\n  [SUCCESS] Processed ${processedCount} frames`);
  return { state, count: processedCount };
}

// 主函数
async function main() {
  console.log('===========================================');
  console.log('  Background Removal Script');
  console.log('  Target color: #00FF00 (Green)');
  console.log(`  Tolerance: ${TOLERANCE}`);
  console.log('===========================================\n');

  const total = states.length;
  const results = [];

  for (let i = 0; i < states.length; i++) {
    try {
      const result = await processBackground(states[i], i + 1, total);
      results.push(result);
    } catch (err) {
      console.error(`  [FAILED] ${states[i]}: ${err.message}\n`);
      results.push({ state: states[i], count: 0, error: err.message });
    }
  }

  // 输出总结
  console.log('\n===========================================');
  console.log('  Summary');
  console.log('===========================================');

  let totalFrames = 0;
  results.forEach(r => {
    if (r.error) {
      console.log(`  [FAIL] ${r.state}: ${r.error}`);
    } else {
      console.log(`  [OK] ${r.state}: ${r.count} frames processed`);
      totalFrames += r.count;
    }
  });

  console.log(`\n  Total frames processed: ${totalFrames}`);
  console.log('\nDone!');
}

// 检查 sharp 是否安装
try {
  require.resolve('sharp');
  main().catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
} catch (e) {
  console.error('===========================================');
  console.error('  ERROR: sharp is not installed');
  console.error('===========================================');
  console.error('\nPlease install sharp:');
  console.error('  npm install sharp');
  console.error('\nOr use canvas alternative:');
  console.error('  npm install canvas');
  console.error('');
  process.exit(1);
}
