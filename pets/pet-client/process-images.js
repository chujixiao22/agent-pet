#!/usr/bin/env node

/**
 * 图片压缩与序列帧处理工具
 */

const fs = require('fs').promises;
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

// 配置
const config = {
  inputDir: './sprites',
  outputDir: './sprites_optimized',
  maxWidth: 180,
  maxHeight: 180,
  quality: 0.85, // JPEG 质量
  formats: {
    images: ['png', 'jpg', 'jpeg'],
    animations: ['gif']
  }
};

// 创建目录
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

// 压缩图片
async function compressImage(inputPath, outputPath, maxWidth, maxHeight, quality) {
  try {
    const img = await loadImage(inputPath);
    const canvas = createCanvas(maxWidth, maxHeight);
    const ctx = canvas.getContext('2d');

    // 计算缩放比例
    const scale = Math.min(maxWidth / img.width, maxHeight / img.height);
    const width = img.width * scale;
    const height = img.height * scale;

    // 清除画布
    ctx.clearRect(0, 0, maxWidth, maxHeight);

    // 绘制图片（居中）
    const x = (maxWidth - width) / 2;
    const y = (maxHeight - height) / 2;

    if (img.format === 'png') {
      // 保持 PNG 透明度
      ctx.drawImage(img, x, y, width, height);
    } else {
      // JPEG 不支持透明度
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, maxWidth, maxHeight);
      ctx.drawImage(img, x, y, width, height);
    }

    // 保存图片
    const buffer = canvas.toBuffer('image/png', { quality: quality });
    await fs.writeFile(outputPath, buffer);

    console.log(`✅ 压缩完成: ${path.basename(inputPath)} -> ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ 压缩失败: ${error.message}`);
    return false;
  }
}

// 检查文件类型
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase().substring(1);
}

// 检查是否为图片文件
function isImageFile(filename) {
  const ext = getFileExtension(filename);
  return config.formats.images.includes(ext) || config.formats.animations.includes(ext);
}

// 创建动画清单
async function createAnimationManifest(spritesDir) {
  const manifest = {
    version: '1.0.0',
    totalFrames: 0,
    states: {}
  };

  // 遍历每个状态的图片
  const entries = await fs.readdir(spritesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const stateName = entry.name;
      const stateDir = path.join(spritesDir, stateName);
      const frameFiles = [];

      // 读取该状态的所有图片
      const frameEntries = await fs.readdir(stateDir, { withFileTypes: true });

      for (const frameEntry of frameEntries) {
        if (frameEntry.isFile() && isImageFile(frameEntry.name)) {
          frameFiles.push(frameEntry.name);
        }
      }

      // 排序帧文件
      frameFiles.sort((a, b) => {
        const aMatch = a.match(/frame_(\d+)\./);
        const bMatch = b.match(/frame_(\d+)\./);
        const aNum = aMatch ? parseInt(aMatch[1]) : 0;
        const bNum = bMatch ? parseInt(bMatch[1]) : 0;
        return aNum - bNum;
      });

      if (frameFiles.length > 0) {
        stateInfo = {
          frameCount: frameFiles.length,
          frames: [],
          duration: 200 // 默认每帧 200ms
        };

        // 添加帧信息
        for (const frameFile of frameFiles) {
          const frameInfo = {
            path: `${stateName}/${frameFile}`,
            width: 180,
            height: 180
          };
          stateInfo.frames.push(frameInfo);
        }

        manifest.states[stateName] = stateInfo;
        manifest.totalFrames += frameFiles.length;
      }
    }
  }

  // 保存清单
  const manifestPath = path.join(spritesDir, 'animation_manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`✅ 动画清单已创建: ${manifestPath}`);
  return manifest;
}

// 处理所有图片
async function processImages() {
  console.log('=== 图片处理工具 ===\n');

  try {
    // 确保输入目录存在
    await ensureDir(config.inputDir);

    // 创建输出目录
    await ensureDir(config.outputDir);

    console.log('📁 输入目录:', config.inputDir);
    console.log('📁 输出目录:', config.outputDir);
    console.log('📐 目标尺寸:', `${config.maxWidth}x${config.maxHeight}`);
    console.log(`🎨 质量: ${config.quality * 100}%\n`);

    // 处理每个状态
    const states = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];
    let totalProcessed = 0;
    let totalFailed = 0;

    for (const state of states) {
      const stateDir = path.join(config.inputDir, state);
      const outputStateDir = path.join(config.outputDir, state);

      try {
        await fs.access(stateDir);
        await ensureDir(outputStateDir);

        console.log(`\n🎯 处理状态: ${state}`);

        // 读取该状态的所有图片
        const files = await fs.readdir(stateDir);
        const imageFiles = files.filter(file => isImageFile(file));

        if (imageFiles.length === 0) {
          console.log(`  ⚠️  没有找到图片文件`);
          continue;
        }

        // 处理每个图片
        for (const file of imageFiles) {
          const inputPath = path.join(stateDir, file);
          const outputPath = path.join(outputStateDir, file);

          if (await compressImage(inputPath, outputPath, config.maxWidth, config.maxHeight, config.quality)) {
            totalProcessed++;
            console.log(`  ✓ ${file}`);
          } else {
            totalFailed++;
            console.log(`  ✗ ${file}`);
          }
        }

        console.log(`✓ ${state} 处理完成 (${imageFiles.length} 张图片)`);

      } catch (error) {
        if (error.code === 'ENOENT') {
          console.log(`⚠️  状态目录不存在: ${state}`);
        } else {
          console.error(`❌ 处理 ${state} 失败: ${error.message}`);
        }
      }
    }

    // 创建动画清单
    console.log('\n📋 创建动画清单...');
    const manifest = await createAnimationManifest(config.outputDir);

    // 输出总结
    console.log('\n📊 处理完成！');
    console.log(`✅ 成功处理: ${totalProcessed} 张图片`);
    console.log(`❌ 处理失败: ${totalFailed} 张图片`);
    console.log(`🎬 总帧数: ${manifest.totalFrames} 帧`);
    console.log(`📁 输出目录: ${config.outputDir}`);

  } catch (error) {
    console.error('\n❌ 处理失败:', error);
    process.exit(1);
  }
}

// 运行处理
processImages();