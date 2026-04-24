/**
 * generate-sequence-frames.js
 * 使用 image-to-image 生成序列帧
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// API 配置
const API_KEY = 'sk-cp-Q0OT0DXTp2na1JIBuEzml3b4t9vYXIy8e1llu-yp0J9WKZD1qVnaVSUBXlnLsLo5yKmqph7bhGHm_QysA2kywuZygQSwHfPP9qegB53UOi7kgJA4WtE-8Fs';
const IMAGE_API = 'https://api.minimax.chat/v1/image_generation';

// 状态配置 - 每个状态生成多帧
const states = [
  {
    name: 'idle',
    frameCount: 8,
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting relaxed with gentle smile, tail wagging slightly',
    promptVariations: [
      'breathing gently, eyes open',
      'slight tail movement to the left',
      'normal pose, relaxed',
      'slight tail movement to the right',
      'eyes slightly squinted, content',
      'normal pose',
      'slight body shift left',
      'back to starting position'
    ]
  },
  {
    name: 'idle_long',
    frameCount: 6,
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting drowsy with eyes half-closed, head drooping slightly',
    promptVariations: [
      'eyes half-closed, sleepy',
      'head tilting down more',
      'almost asleep',
      'slight head bob',
      'eyes fluttering',
      'dozing off'
    ]
  },
  {
    name: 'working',
    frameCount: 8,
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting typing on keyboard, focused expression, ears perked up',
    promptVariations: [
      'paws over keyboard, typing',
      'left paw pressing down',
      'right paw pressing down',
      'both paws typing quickly',
      'brief pause, looking up',
      'resuming typing',
      'intense focus',
      'completing keystroke'
    ]
  },
  {
    name: 'thinking',
    frameCount: 8,
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting with paw on chin, head tilted, curious expression',
    promptVariations: [
      'paw touching chin, thinking',
      'head tilted left',
      'head tilted right',
      'eyes looking up',
      'head back to center',
      'slight nod',
      'curious expression',
      'deep in thought'
    ]
  },
  {
    name: 'success',
    frameCount: 8,
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, jumping with joy, big smile, arms raised up',
    promptVariations: [
      'crouching before jump',
      'lifting off ground',
      'mid-air jump',
      'highest point',
      'coming back down',
      'landing',
      'bouncing slightly',
      'celebrating pose'
    ]
  },
  {
    name: 'error',
    frameCount: 8,
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting sad with looking down, ears drooping, disappointed expression',
    promptVariations: [
      'looking down sadly',
      'ears drooping more',
      'shoulders slumped',
      'slight shiver',
      'looking at ground',
      'ears very droopy',
      'deeply disappointed',
      'recovering'
    ]
  }
];

const OUTPUT_DIR = path.join(__dirname, '..', 'frames');

// 读取本地图片转为 base64
function readImageAsBase64(filePath) {
  const data = fs.readFileSync(filePath);
  return data.toString('base64');
}

// 生成图片
function generateImage(state, frameIndex, prompt, referenceBase64) {
  return new Promise((resolve, reject) => {
    const outputPath = path.join(OUTPUT_DIR, state.name, `frame_${String(frameIndex + 1).padStart(3, '0')}.png`);

    console.log(`[${state.name}] Generating frame ${frameIndex + 1}/${state.frameCount}...`);

    const postData = JSON.stringify({
      model: 'image-01',
      prompt: prompt,
      response_format: 'base64',
      size: '512x512',
      subject_reference: [
        {
          type: 'character',
          image_file: `data:image/png;base64,${referenceBase64}`
        }
      ]
    });

    const options = {
      hostname: 'api.minimax.chat',
      port: 443,
      path: '/v1/image_generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.error || response.base_resp?.status_code !== 0) {
            const errMsg = response.error?.message || response.base_resp?.status_msg || 'Unknown error';
            console.error(`  [ERROR] ${errMsg}`);
            reject(new Error(errMsg));
            return;
          }

          let base64Data = response.data?.image || response.data?.image_base64?.[0];
          if (!base64Data) {
            reject(new Error('No image data in response'));
            return;
          }

          const imageBuffer = Buffer.from(base64Data, 'base64');
          fs.writeFileSync(outputPath, imageBuffer);
          console.log(`  [OK] Saved: ${path.basename(outputPath)}`);
          resolve(outputPath);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// 主函数
async function main() {
  console.log('===========================================');
  console.log('  Sequence Frame Generation');
  console.log('===========================================\n');

  for (const state of states) {
    console.log(`\n[Processing: ${state.name}]`);

    // 读取参考图
    const refPath = path.join(OUTPUT_DIR, state.name, 'keyframe.png');
    if (!fs.existsSync(refPath)) {
      console.error(`  [SKIP] Reference image not found: ${refPath}`);
      continue;
    }
    const refBase64 = readImageAsBase64(refPath);
    console.log(`  Reference loaded: ${refPath}`);

    // 生成帧
    for (let i = 0; i < state.frameCount; i++) {
      const prompt = `${state.prompt}, ${state.promptVariations[i]}`;

      try {
        await generateImage(state, i, prompt, refBase64);
        // 延迟避免限流
        await new Promise(r => setTimeout(r, 1500));
      } catch (err) {
        console.error(`  [FAIL] Frame ${i + 1}: ${err.message}`);
        // 如果失败，继续下一个
      }
    }
  }

  console.log('\n===========================================');
  console.log('  Done!');
  console.log('===========================================');
}

main().catch(console.error);