/**
 * 2-generate-video.js
 * 使用关键帧生成视频
 * 调用 Minimax VIDEO_API，model: MiniMax-Hailuo-2.3-Fast
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// API 配置
const API_KEY = 'sk-cp-Q0OT0DXTp2na1JIBuEzml3b4t9vYXIy8e1llu-yp0J9WKZD1qVnaVSUBXlnLsLo5yKmqph7bhGHm_QysA2kywuZygQSwHfPP9qegB53UOi7kgJA4WtE-8Fs';
const VIDEO_API = 'https://api.minimax.chat/v1/video_generation';
const QUERY_API = 'https://api.minimax.chat/v1/query/video_generation';

// 状态配置
const states = [
  {
    name: 'idle',
    action_description: 'gentle breathing, tail wagging, occasional blink'
  },
  {
    name: 'idle_long',
    action_description: 'slow nodding, eyes fluttering, sleepy movements'
  },
  {
    name: 'working',
    action_description: 'typing motion, ears twitching, focused'
  },
  {
    name: 'thinking',
    action_description: 'head tilting, paw tapping, curious'
  },
  {
    name: 'success',
    action_description: 'jumping, arms waving, celebrating'
  },
  {
    name: 'error',
    action_description: 'head drooping, shoulders shrugging sadly'
  }
];

// 输出目录
const OUTPUT_DIR = path.join(__dirname, '..', 'frames');

// 调用 VIDEO_API 生成视频
function generateVideo(state, index, total) {
  return new Promise((resolve, reject) => {
    const stateDir = path.join(OUTPUT_DIR, state.name);
    const keyframePath = path.join(stateDir, 'keyframe.png');
    const videoPath = path.join(stateDir, 'video.mp4');

    console.log(`[${index}/${total}] Generating video for "${state.name}"...`);

    // 检查关键帧是否存在
    if (!fs.existsSync(keyframePath)) {
      console.error(`  [ERROR] Keyframe not found: ${keyframePath}`);
      console.error(`  Please run 1-generate-keyframes.js first!`);
      reject(new Error('Keyframe not found'));
      return;
    }

    // 读取关键帧并转为 base64 (使用 Data URL 格式)
    const keyframeBuffer = fs.readFileSync(keyframePath);
    const keyframeBase64 = `data:image/png;base64,${keyframeBuffer.toString('base64')}`;
    console.log(`  Loaded keyframe: ${keyframePath} (${keyframeBuffer.length} bytes)`);

    const prompt = `The fox-cat character in the image is animating naturally, ${state.action_description}`;

    const postData = JSON.stringify({
      model: 'MiniMax-Hailuo-2.3-Fast',
      first_frame_image: keyframeBase64,
      prompt: prompt,
      duration: 6,
      resolution: '768P'
    });

    const options = {
      hostname: 'api.minimax.chat',
      port: 443,
      path: '/v1/video_generation',
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

      res.on('end', async () => {
        try {
          const response = JSON.parse(data);
          console.log(`  [DEBUG] API Response: ${JSON.stringify(response).substring(0, 500)}`);

          if (response.error) {
            console.error(`  [ERROR] ${response.error.message || response.error}`);
            reject(new Error(response.error.message || 'API error'));
            return;
          }

          // 获取任务 ID 用于轮询 (新API使用task_id字段)
          const taskId = response.data?.id || response.task_id;
          if (!taskId) {
            console.error(`  [ERROR] No task ID in response: ${JSON.stringify(response)}`);
            reject(new Error('No task ID in response'));
            return;
          }
          console.log(`  [TASK ID] ${taskId}`);
          console.log(`  Waiting for video generation...`);

          // 轮询查询任务状态
          const videoFile = await pollTaskStatus(taskId, state.name);
          resolve(videoFile);
        } catch (err) {
          console.error(`  [ERROR] ${err.message}`);
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

// 轮询查询任务状态
async function pollTaskStatus(taskId, stateName) {
  const maxRetries = 60;  // 最多等待 60 次（约 5 分钟）
  const pollInterval = 5000;  // 每 5 秒轮询一次

  for (let i = 0; i < maxRetries; i++) {
    console.log(`  [Polling ${i + 1}/${maxRetries}] Checking status...`);

    try {
      const status = await queryTaskStatus(taskId);

      if (status.status === 'success') {
        console.log(`  [SUCCESS] Video generation completed!`);

        // 下载视频
        const videoUrl = status.video_url || status.data?.video_url;
        if (!videoUrl) {
          console.log(`  [DEBUG] Full response: ${JSON.stringify(status).substring(0, 1000)}`);
          throw new Error('No video URL in response');
        }
        console.log(`  Downloading video from: ${videoUrl}`);

        const videoPath = await downloadVideo(videoUrl, stateName);
        return videoPath;
      } else if (status.status === 'fail') {
        console.error(`  [FAILED] Video generation failed: ${status.message || 'Unknown error'}`);
        throw new Error(status.message || 'Video generation failed');
      } else {
        // pending 或 processing
        console.log(`  [Processing] Status: ${status.status}, waiting...`);
        await sleep(pollInterval);
      }
    } catch (err) {
      if (err.message.includes('processing')) {
        // 还在处理中，继续等待
        console.log(`  [Processing] ${err.message}`);
        await sleep(pollInterval);
      } else {
        throw err;
      }
    }
  }

  throw new Error('Video generation timeout (max retries exceeded)');
}

// 查询任务状态
function queryTaskStatus(taskId) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.minimax.chat',
      port: 443,
      path: `/v1/query/video_generation?task_id=${taskId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          console.log(`  [DEBUG] Query Response raw: ${data.substring(0, 500)}`);
          const response = JSON.parse(data);

          if (response.error) {
            reject(new Error(response.error.message || response.error));
            return;
          }

          resolve(response);
        } catch (err) {
          reject(new Error(`Failed to parse response: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => {
      reject(new Error(`Request failed: ${err.message}`));
    });

    req.end();
  });
}

// 下载视频
function downloadVideo(url, stateName) {
  return new Promise((resolve, reject) => {
    const videoPath = path.join(OUTPUT_DIR, stateName, 'video.mp4');
    const file = fs.createWriteStream(videoPath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed with status: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`  [SAVED] Video: ${videoPath}`);
        resolve(videoPath);
      });

      file.on('error', (err) => {
        fs.unlink(videoPath, () => {});
        reject(new Error(`File write error: ${err.message}`));
      });
    }).on('error', (err) => {
      reject(new Error(`Download error: ${err.message}`));
    });
  });
}

// 主函数
async function main() {
  console.log('===========================================');
  console.log('  Minimax Video Generation Script');
  console.log('  Model: MiniMax-Hailuo-2.3-Fast');
  console.log('  Duration: 6s | Resolution: 768P');
  console.log('===========================================\n');

  const total = states.length;
  const results = [];

  for (let i = 0; i < states.length; i++) {
    try {
      const result = await generateVideo(states[i], i + 1, total);
      results.push({ state: states[i].name, success: true, path: result });

      // 添加延迟避免 API 限流
      if (i < states.length - 1) {
        console.log('  Waiting 3 seconds before next request...\n');
        await sleep(3000);
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
