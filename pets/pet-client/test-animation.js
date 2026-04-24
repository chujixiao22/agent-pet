#!/usr/bin/env node

/**
 * 动画测试脚本
 */

const fs = require('fs').promises;
const path = require('path');

// 配置
const config = {
  spritesDir: './sprites',
  manifestFile: './sprites/animation_manifest.json'
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

// 创建简单的占位图片
async function createPlaceholderFrame(stateName, frameNumber) {
  let buffer;
  const hasCanvas = require('canvas');

  if (hasCanvas) {
    // 使用 Canvas 创建占位图
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(180, 180);
    const ctx = canvas.getContext('2d');

    // 清除画布
    ctx.clearRect(0, 0, 180, 180);

    // 根据状态绘制不同的占位图
    ctx.font = '16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    switch (stateName) {
      case 'idle':
        ctx.fillStyle = '#FF8C42';
        ctx.beginPath();
        ctx.arc(90, 90, 50, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText('IDLE', 90, 90);
        break;

      case 'idle_long':
        ctx.fillStyle = '#808080';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('Z', 90, 90);
        break;

      case 'working':
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(60, 70, 60, 30);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '14px Arial';
        ctx.fillText('WORK', 90, 85);
        break;

      case 'thinking':
        ctx.fillStyle = '#9370DB';
        ctx.font = 'bold 48px Arial';
        ctx.fillText('?', 90, 90);
        break;

      case 'success':
        drawStar(ctx, 90, 90, 5, 30, 15);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
        break;

      case 'error':
        ctx.strokeStyle = '#FF0000';
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(60, 60);
        ctx.lineTo(120, 120);
        ctx.moveTo(120, 60);
        ctx.lineTo(60, 120);
        ctx.stroke();
        break;
    }

    // 添加帧编号
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    ctx.fillText(`#${frameNumber}`, 15, 15);

    buffer = canvas.toBuffer('image/png');
  } else {
    // 创建简单的文本占位符
    const text = `${stateName.toUpperCase()}\nFrame ${frameNumber}`;
    buffer = Buffer.from(text);
  }

  // 保存文件
  const outputPath = path.join(config.spritesDir, stateName, `frame_${frameNumber.toString().padStart(3, '0')}.png`);
  await fs.writeFile(outputPath, buffer);

  console.log(`  ✅ 创建 ${stateName}/frame_${frameNumber.toString().padStart(3, '0')}.png`);
}

// 绘制星形
function drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
  let rot = Math.PI / 2 * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

// 创建所有占位帧
async function createAllPlaceholderFrames() {
  const states = [
    { name: 'idle', frames: 4 },
    { name: 'idle_long', frames: 4 },
    { name: 'working', frames: 4 },
    { name: 'thinking', frames: 4 },
    { name: 'success', frames: 4 },
    { name: 'error', frames: 4 }
  ];

  console.log('🎨 创建占位帧图片...\n');

  for (const state of states) {
    console.log(`📁 状态: ${state.name} (${state.frames} 帧)`);

    // 确保状态目录存在
    const stateDir = path.join(config.spritesDir, state.name);
    await ensureDir(stateDir);

    // 创建该状态的所有帧
    for (let i = 1; i <= state.frames; i++) {
      await createPlaceholderFrame(state.name, i);
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
          { path: "idle/frame_001.png", width: 180, height: 180 },
          { path: "idle/frame_002.png", width: 180, height: 180 },
          { path: "idle/frame_003.png", width: 180, height: 180 },
          { path: "idle/frame_004.png", width: 180, height: 180 }
        ]
      },
      idle_long: {
        frameCount: 4,
        duration: 250,
        frames: [
          { path: "idle_long/frame_001.png", width: 180, height: 180 },
          { path: "idle_long/frame_002.png", width: 180, height: 180 },
          { path: "idle_long/frame_003.png", width: 180, height: 180 },
          { path: "idle_long/frame_004.png", width: 180, height: 180 }
        ]
      },
      working: {
        frameCount: 4,
        duration: 200,
        frames: [
          { path: "working/frame_001.png", width: 180, height: 180 },
          { path: "working/frame_002.png", width: 180, height: 180 },
          { path: "working/frame_003.png", width: 180, height: 180 },
          { path: "working/frame_004.png", width: 180, height: 180 }
        ]
      },
      thinking: {
        frameCount: 4,
        duration: 300,
        frames: [
          { path: "thinking/frame_001.png", width: 180, height: 180 },
          { path: "thinking/frame_002.png", width: 180, height: 180 },
          { path: "thinking/frame_003.png", width: 180, height: 180 },
          { path: "thinking/frame_004.png", width: 180, height: 180 }
        ]
      },
      success: {
        frameCount: 4,
        duration: 150,
        frames: [
          { path: "success/frame_001.png", width: 180, height: 180 },
          { path: "success/frame_002.png", width: 180, height: 180 },
          { path: "success/frame_003.png", width: 180, height: 180 },
          { path: "success/frame_004.png", width: 180, height: 180 }
        ]
      },
      error: {
        frameCount: 4,
        duration: 300,
        frames: [
          { path: "error/frame_001.png", width: 180, height: 180 },
          { path: "error/frame_002.png", width: 180, height: 180 },
          { path: "error/frame_003.png", width: 180, height: 180 },
          { path: "error/frame_004.png", width: 180, height: 180 }
        ]
      }
    }
  };

  await fs.writeFile(config.manifestFile, JSON.stringify(manifest, null, 2));
  console.log(`✅ 动画清单已创建: ${config.manifestFile}`);
}

// 检查 Canvas 是否可用
function checkCanvasSupport() {
  try {
    require('canvas');
    return true;
  } catch (error) {
    console.log('⚠️  Canvas 模块未安装，将使用简单的文本占位符');
    return true; // 继续运行，但创建简单的文件
  }
}

// 主函数
async function main() {
  console.log('=== 电子宠物动画测试 ===\n');

  // 检查 Canvas 支持
  if (!checkCanvasSupport()) {
    return;
  }

  try {
    // 创建占位帧
    await createAllPlaceholderFrames();

    // 创建动画清单
    await createAnimationManifest();

    console.log('\n🎉 测试准备完成！');
    console.log('📁 输出目录:', config.spritesDir);
    console.log('📋 清单文件:', config.manifestFile);
    console.log('\n🚀 现在可以启动 electron 客户端测试动画效果');
    console.log('命令: npm start');

    console.log('\n💡 测试步骤:');
    console.log('1. 确保 sprites 目录存在并有图片');
    console.log('2. 启动 electron 客户端 (npm start)');
    console.log('3. 查看控制台日志确认加载了精灵图');
    console.log('4. 通过修改 status.json 切换不同状态');

  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
main();