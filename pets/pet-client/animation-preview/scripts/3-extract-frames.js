/**
 * 3-extract-frames.js
 * 从视频提取帧
 * 使用 fluent-ffmpeg 库
 */

const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// 状态列表
const states = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '..', 'frames');
const FPS = 8;  // 每秒 8 帧

// 提取帧
function extractFrames(state, index, total) {
  return new Promise((resolve, reject) => {
    const stateDir = path.join(OUTPUT_DIR, state);
    const videoPath = path.join(stateDir, 'video.mp4');
    const outputDir = path.join(stateDir, 'raw');

    console.log(`[${index}/${total}] Extracting frames for "${state}"...`);

    // 检查视频是否存在
    if (!fs.existsSync(videoPath)) {
      console.error(`  [ERROR] Video not found: ${videoPath}`);
      console.error(`  Please run 2-generate-video.js first!`);
      reject(new Error('Video not found'));
      return;
    }

    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`  Created output directory: ${outputDir}`);
    }

    // 使用 fluent-ffmpeg 提取帧
    const outputPattern = path.join(outputDir, 'frame_%03d.png');

    ffmpeg(videoPath)
      .outputOptions([
        `-vf fps=${FPS}`  // 每秒 FPS 帧
      ])
      .output(outputPattern)
      .on('start', (commandLine) => {
        console.log(`  FFmpeg command: ${commandLine}`);
      })
      .on('progress', (progress) => {
        if (progress.percent) {
          process.stdout.write(`  Progress: ${Math.round(progress.percent)}%\r`);
        }
      })
      .on('end', () => {
        // 统计提取的帧数
        const files = fs.readdirSync(outputDir).filter(f => f.startsWith('frame_') && f.endsWith('.png'));
        console.log(`\n  [SUCCESS] Extracted ${files.length} frames to ${outputDir}`);
        resolve({ state, count: files.length });
      })
      .on('error', (err) => {
        console.error(`\n  [ERROR] FFmpeg error: ${err.message}`);
        reject(err);
      })
      .run();
  });
}

// 主函数
async function main() {
  console.log('===========================================');
  console.log('  Frame Extraction Script');
  console.log(`  FPS: ${FPS} frames per second`);
  console.log('===========================================\n');

  const total = states.length;
  const results = [];

  for (let i = 0; i < states.length; i++) {
    try {
      const result = await extractFrames(states[i], i + 1, total);
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
      console.log(`  [OK] ${r.state}: ${r.count} frames`);
      totalFrames += r.count;
    }
  });

  console.log(`\n  Total frames extracted: ${totalFrames}`);
  console.log('\nDone!');
}

// 检查 fluent-ffmpeg 是否安装
try {
  require.resolve('fluent-ffmpeg');
  main().catch(err => {
    console.error('Script error:', err);
    process.exit(1);
  });
} catch (e) {
  console.error('===========================================');
  console.error('  ERROR: fluent-ffmpeg is not installed');
  console.error('===========================================');
  console.error('\nPlease install fluent-ffmpeg:');
  console.error('  npm install fluent-ffmpeg');
  console.error('\nOr use ffmpeg directly:');
  console.error('  ffmpeg -i video.mp4 -vf fps=8 frames/frame_%03d.png');
  console.error('\nDownload ffmpeg: https://ffmpeg.org/download.html');
  console.error('');
  process.exit(1);
}
