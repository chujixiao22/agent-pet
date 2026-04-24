#!/usr/bin/env node

/**
 * Minimax Image-01 图片生成脚本
 */

const fs = require('fs').promises;
const path = require('path');

// API 配置
const API_KEY = 'sk-cp-Q0OT0DXTp2na1JIBuEzml3b4t9vYXIy8e1llu-yp0J9WKZD1qVnaVSUBXlnLsLo5yKmqph7bhGHm_QysA2kywuZygQSwHfPP9qegB53UOi7kgJA4WtE-8Fs';
const API_URL = 'https://api.minimax.chat/v1/image_generation';

// 状态配置
const states = [
  {
    name: 'idle',
    description: '待机状态',
    frames: 4,
    prompt: 'A cute fox-cat sitting idle, fluffy orange fur with white belly, large sparkling eyes, fluffy tail wagging gently, Q-style cartoon, pastel colors, transparent background, looking cute and relaxed',
    duration: 250
  },
  {
    name: 'idle_long',
    description: '久等状态',
    frames: 4,
    prompt: 'A sleepy fox-cat with Z bubbles above head, sitting position head drooping, drowsy expression, Q-style cartoon, soft orange and white colors, transparent background',
    duration: 250
  },
  {
    name: 'working',
    description: '工作状态',
    frames: 5,
    prompt: 'A focused fox-cat typing with paws on invisible keyboard, intense concentration, small glowing effects around paws, Q-style cartoon, determined expression, transparent background',
    duration: 200
  },
  {
    name: 'thinking',
    description: '思考状态',
    frames: 5,
    prompt: 'A curious fox-cat thinking with paw on chin, question bubble above head, head tilted, big curious eyes, Q-style cartoon, soft lighting, transparent background',
    duration: 300
  },
  {
    name: 'success',
    description: '成功状态',
    frames: 6,
    prompt: 'A happy fox-cat jumping with joy, surrounded by sparkling stars, big smile, celebrating pose, bright expressions, Q-style cartoon, warm glow effects, transparent background',
    duration: 150
  },
  {
    name: 'error',
    description: '错误状态',
    frames: 4,
    prompt: 'A sad fox-cat with tears, looking down drooping ears, tear drops, disappointed expression, Q-style cartoon, dim lighting, transparent background',
    duration: 300
  }
];

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

// 生成图片
async function generateImage(prompt, width = 200, height = 200) {
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'image-01',
        prompt: prompt,
        width: width,
        height: height,
        quality: 'standard'
      })
    });

    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.base64_image) {
      throw new Error('API响应中没有base64_image字段');
    }

    return Buffer.from(result.base64_image, 'base64');
  } catch (error) {
    console.error(`生成图片失败: ${error.message}`);
    throw error;
  }
}

// 保存图片
async function saveImage(buffer, outputPath) {
  await fs.writeFile(outputPath, buffer);
  console.log(`✅ 图片已保存: ${outputPath}`);
}

// 主函数
async function main() {
  console.log('=== Minimax 图片生成器 ===\n');

  try {
    // 创建 sprites 目录
    const spritesDir = path.join(__dirname, 'sprites');
    await ensureDir(spritesDir);

    // 生成每个状态的图片
    for (const state of states) {
      console.log(`\n🎯 生成 ${state.name} 状态 (${state.frames} 帧)`);

      const stateDir = path.join(spritesDir, state.name);
      await ensureDir(stateDir);

      // 生成该状态的所有帧
      for (let i = 1; i <= state.frames; i++) {
        console.log(`  生成帧 ${i}/${state.frames}...`);

        try {
          // 添加帧号到 prompt
          const framePrompt = `${state.prompt}, frame ${i} of ${state.frames}`;
          const imageBuffer = await generateImage(framePrompt);
          const outputPath = path.join(stateDir, `frame_${i.toString().padStart(3, '0')}.png`);
          await saveImage(imageBuffer, outputPath);

          // 避免API限制
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`  ✗ 帧 ${i} 生成失败: ${error.message}`);
          continue;
        }
      }
    }

    // 创建动画清单
    console.log('\n📋 创建动画清单...');
    const manifest = {
      version: '1.0.0',
      totalFrames: states.reduce((sum, state) => sum + state.frames, 0),
      states: {}
    };

    for (const state of states) {
      const frames = [];
      for (let i = 1; i <= state.frames; i++) {
        frames.push({
          path: `${state.name}/frame_${i.toString().padStart(3, '0')}.png`,
          width: 180,
          height: 180
        });
      }

      manifest.states[state.name] = {
        frameCount: state.frames,
        duration: state.duration,
        frames: frames
      };
    }

    const manifestPath = path.join(spritesDir, 'animation_manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ 动画清单已保存: ${manifestPath}`);

    console.log('\n🎉 所有图片生成完成！');
    console.log(`总共生成 ${manifest.totalFrames} 帧动画`);
    console.log(`输出目录: ${spritesDir}`);

  } catch (error) {
    console.error('\n❌ 生成失败:', error);
    process.exit(1);
  }
}

// 运行主函数
main();