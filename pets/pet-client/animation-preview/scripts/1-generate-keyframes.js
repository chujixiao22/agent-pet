/**
 * 1-generate-keyframes.js
 * 为 6 个状态各生成 1 张关键帧图
 * 调用 Minimax IMAGE_API，model: image-01
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// API 配置
const API_KEY = 'sk-cp-Q0OT0DXTp2na1JIBuEzml3b4t9vYXIy8e1llu-yp0J9WKZD1qVnaVSUBXlnLsLo5yKmqph7bhGHm_QysA2kywuZygQSwHfPP9qegB53UOi7kgJA4WtE-8Fs';
const IMAGE_API = 'https://api.minimax.chat/v1/image_generation';

// 状态配置
const states = [
  {
    name: 'idle',
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting relaxed with gentle smile, tail wagging slightly, solid bright green background #00FF00'
  },
  {
    name: 'idle_long',
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkky eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting drowsy with eyes half-closed, head drooping slightly, solid bright green background #00FF00'
  },
  {
    name: 'working',
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting and typing on keyboard, focused expression, ears perked up, solid bright green background #00FF00'
  },
  {
    name: 'thinking',
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting with paw on chin, head tilted, curious expression, solid bright green background #00FF00'
  },
  {
    name: 'success',
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, jumping with joy, big smile, arms raised up, solid bright green background #00FF00'
  },
  {
    name: 'error',
    prompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting sad with looking down, ears drooping, disappointed expression, solid bright green background #00FF00'
  }
];

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '..', 'frames');

// 调用 IMAGE_API 生成图片
function generateImage(state, index, total) {
  return new Promise((resolve, reject) => {
    const stateDir = path.join(OUTPUT_DIR, state.name);
    const outputPath = path.join(stateDir, 'keyframe.png');

    console.log(`[${index}/${total}] Generating keyframe for "${state.name}"...`);
    console.log(`  Prompt: ${state.prompt.substring(0, 60)}...`);

    const postData = JSON.stringify({
      model: 'image-01',
      prompt: state.prompt,
      response_format: 'base64',
      size: '1024x1024'  // 可选 1024x1024 或 512x512
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

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);

          if (response.error) {
            console.error(`  [ERROR] ${response.error.message || response.error}`);
            reject(new Error(response.error.message || 'API error'));
            return;
          }

          // 解码 base64 并保存图片 - 支持多种响应格式
          let base64Data;
          if (response.data && response.data.image) {
            base64Data = response.data.image;
          } else if (response.data && response.data.image_base64 && response.data.image_base64[0]) {
            base64Data = response.data.image_base64[0];
          } else {
            throw new Error('No image data in response: ' + JSON.stringify(response).substring(0, 200));
          }
          const imageBuffer = Buffer.from(base64Data, 'base64');

          fs.writeFileSync(outputPath, imageBuffer);
          console.log(`  [SUCCESS] Saved to: ${outputPath}`);
          resolve(outputPath);
        } catch (err) {
          console.error(`  [ERROR] Failed to parse response: ${err.message}`);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`  [ERROR] Request failed: ${err.message}`);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// 主函数
async function main() {
  console.log('===========================================');
  console.log('  Minimax Keyframe Generation Script');
  console.log('  Model: image-01 | Size: 1024x1024');
  console.log('===========================================\n');

  const total = states.length;
  const results = [];

  for (let i = 0; i < states.length; i++) {
    try {
      const result = await generateImage(states[i], i + 1, total);
      results.push({ state: states[i].name, success: true, path: result });

      // 添加延迟避免 API 限流
      if (i < states.length - 1) {
        console.log('  Waiting 2 seconds before next request...\n');
        await sleep(2000);
      }
    } catch (err) {
      console.error(`  [FAILED] ${states[i].name}: ${err.message}\n`);
      results.push({ state: states[i].name, success: false, error: err.message });
    }
  }

  // 输出总结
  console.log('\n===========================================');
  console.log('  Summary');
  console.log('===========================================');
  const successCount = results.filter(r => r.success).length;
  console.log(`  Total: ${total} | Success: ${successCount} | Failed: ${total - successCount}`);

  results.forEach(r => {
    if (r.success) {
      console.log(`  [OK] ${r.state}`);
    } else {
      console.log(`  [FAIL] ${r.state}: ${r.error}`);
    }
  });

  console.log('\nDone!');
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
