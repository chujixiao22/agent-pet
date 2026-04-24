#!/usr/bin/env node

/**
 * 简单的动画测试脚本（不依赖 canvas）
 */

const fs = require('fs').promises;
const path = require('path');

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

// 创建简单的文本文件作为占位符
async function createPlaceholderFile(stateName, frameNumber) {
  const content = `Frame ${frameNumber} of ${stateName}
This is a placeholder for the ${stateName} animation state.
In a real implementation, this would be a PNG image.

State: ${stateName}
Frame: ${frameNumber}
Time: ${new Date().toISOString()}`;

  const outputPath = path.join('./sprites', stateName, `frame_${frameNumber.toString().padStart(3, '0')}.txt`);
  await fs.writeFile(outputPath, content);

  console.log(`  ✅ 创建 ${stateName}/frame_${frameNumber.toString().padStart(3, '0')}.txt`);
  return outputPath;
}

// 创建所有占位文件
async function createAllPlaceholderFiles() {
  const states = [
    { name: 'idle', frames: 4 },
    { name: 'idle_long', frames: 4 },
    { name: 'working', frames: 4 },
    { name: 'thinking', frames: 4 },
    { name: 'success', frames: 4 },
    { name: 'error', frames: 4 }
  ];

  console.log('🎨 创建占位文件...\n');

  for (const state of states) {
    console.log(`📁 状态: ${state.name} (${state.frames} 帧)`);

    // 确保状态目录存在
    const stateDir = path.join('./sprites', state.name);
    await ensureDir(stateDir);

    // 创建该状态的所有文件
    for (let i = 1; i <= state.frames; i++) {
      await createPlaceholderFile(state.name, i);
    }
  }
}

// 创建动画清单
async function createAnimationManifest() {
  console.log('\n📋 创建动画清单...');

  const manifest = {
    version: '1.0.0',
    totalFrames: 24,
    states: {
      idle: {
        frameCount: 4,
        duration: 250,
        frames: [
          { path: "idle/frame_001.txt", width: 180, height: 180 },
          { path: "idle/frame_002.txt", width: 180, height: 180 },
          { path: "idle/frame_003.txt", width: 180, height: 180 },
          { path: "idle/frame_004.txt", width: 180, height: 180 }
        ]
      },
      idle_long: {
        frameCount: 4,
        duration: 250,
        frames: [
          { path: "idle_long/frame_001.txt", width: 180, height: 180 },
          { path: "idle_long/frame_002.txt", width: 180, height: 180 },
          { path: "idle_long/frame_003.txt", width: 180, height: 180 },
          { path: "idle_long/frame_004.txt", width: 180, height: 180 }
        ]
      },
      working: {
        frameCount: 4,
        duration: 200,
        frames: [
          { path: "working/frame_001.txt", width: 180, height: 180 },
          { path: "working/frame_002.txt", width: 180, height: 180 },
          { path: "working/frame_003.txt", width: 180, height: 180 },
          { path: "working/frame_004.txt", width: 180, height: 180 }
        ]
      },
      thinking: {
        frameCount: 4,
        duration: 300,
        frames: [
          { path: "thinking/frame_001.txt", width: 180, height: 180 },
          { path: "thinking/frame_002.txt", width: 180, height: 180 },
          { path: "thinking/frame_003.txt", width: 180, height: 180 },
          { path: "thinking/frame_004.txt", width: 180, height: 180 }
        ]
      },
      success: {
        frameCount: 4,
        duration: 150,
        frames: [
          { path: "success/frame_001.txt", width: 180, height: 180 },
          { path: "success/frame_002.txt", width: 180, height: 180 },
          { path: "success/frame_003.txt", width: 180, height: 180 },
          { path: "success/frame_004.txt", width: 180, height: 180 }
        ]
      },
      error: {
        frameCount: 4,
        duration: 300,
        frames: [
          { path: "error/frame_001.txt", width: 180, height: 180 },
          { path: "error/frame_002.txt", width: 180, height: 180 },
          { path: "error/frame_003.txt", width: 180, height: 180 },
          { path: "error/frame_004.txt", width: 180, height: 180 }
        ]
      }
    }
  };

  await fs.writeFile('./sprites/animation_manifest.json', JSON.stringify(manifest, null, 2));
  console.log(`✅ 动画清单已创建: ./sprites/animation_manifest.json`);
}

// 主函数
async function main() {
  console.log('=== 简单动画测试 ===\n');

  try {
    // 创建占位文件
    await createAllPlaceholderFiles();

    // 创建动画清单
    await createAnimationManifest();

    console.log('\n🎉 测试准备完成！');
    console.log('📁 输出目录: ./sprites');
    console.log('📋 清单文件: ./sprites/animation_manifest.json');
    console.log('\n🚀 现在可以启动 electron 客户端测试');
    console.log('命令: npm start');

    console.log('\n💡 注意: 使用的是文本占位符，不是真实图片');
    console.log('真实图片需要运行: npm run generate-images');
    console.log('或者使用 Minimax API 生成: node generate-minimax-images.js');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();