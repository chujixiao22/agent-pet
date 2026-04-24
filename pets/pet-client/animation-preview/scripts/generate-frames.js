const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = 'sk-cp-Q0OT0DXTp2na1JIBuEzml3b4t9vYXIy8e1llu-yp0J9WKZD1qVnaVSUBXlnLsLo5yKmqph7bhGHm_QysA2kywuZygQSwHfPP9qegB53UOi7kgJA4WtE-8Fs';
const IMAGE_API = 'https://api.minimax.chat/v1/image_generation';

const OUTPUT_DIR = path.join(__dirname, '..', 'frames');

const states = [
  {
    name: 'idle',
    keyframePrompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting relaxed with gentle smile, tail wagging slightly, SOLID BRIGHT GREEN BACKGROUND #00FF00, no shadows, clean flat color',
    frameCount: 8,
    variations: ['gentle breathing, chest moving up and down', 'tail swishing slowly to the left', 'normal relaxed pose', 'tail swishing slowly to the right', 'eyes blinking once', 'slight body sway left', 'slight body sway right', 'tail at rest position']
  },
  {
    name: 'idle_long',
    keyframePrompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting drowsy with eyes half-closed, head drooping slightly, SOLID BRIGHT GREEN BACKGROUND #00FF00, no shadows, clean flat color',
    frameCount: 8,
    variations: ['eyes half-closed, drowsy look', 'head tilting down a bit more', 'almost falling asleep', 'brief moment of alertness', 'eyes fluttering', 'head nodding slightly', 'very sleepy, eyes nearly closed', 'dozing, relaxed']
  },
  {
    name: 'working',
    keyframePrompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting typing on keyboard, focused expression, ears perked up, SOLID BRIGHT GREEN BACKGROUND #00FF00, no shadows, clean flat color',
    frameCount: 8,
    variations: ['paws poised over keyboard', 'left paw pressing down on key', 'right paw pressing down on key', 'both paws typing together', 'brief pause, looking at screen', 'resuming typing motion', 'intense focus, ears forward', 'completing a keystroke']
  },
  {
    name: 'thinking',
    keyframePrompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting with paw on chin, head tilted, curious expression, SOLID BRIGHT GREEN BACKGROUND #00FF00, no shadows, clean flat color',
    frameCount: 8,
    variations: ['paw resting on chin, deep in thought', 'head tilted to the left side', 'head tilted to the right side', 'eyes looking upward', 'head returning to center', 'slight nod of understanding', 'curious look, ears perked', 'paw tapping chin lightly']
  },
  {
    name: 'success',
    keyframePrompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, jumping with joy, big smile, arms raised up, SOLID BRIGHT GREEN BACKGROUND #00FF00, no shadows, clean flat color',
    frameCount: 8,
    variations: ['crouching down to jump', 'feet leaving ground, going up', 'mid-air, highest point', 'starting to come back down', 'feet touching ground, bouncing', 'both feet on ground, excited', 'jumping again slightly', 'celebrating, arms up high']
  },
  {
    name: 'error',
    keyframePrompt: 'A cute fox-cat with orange fluffy fur, white belly, large sparkly eyes, cat ears, fluffy fox tail, Q-style cartoon, sitting sad with looking down, ears drooping, disappointed expression, SOLID BRIGHT GREEN BACKGROUND #00FF00, no shadows, clean flat color',
    frameCount: 8,
    variations: ['looking directly downward', 'ears drooping lower', 'shoulders slumped forward', 'slight shiver of disappointment', 'eyes glancing at ground', 'ears very droopy', 'deeply sad expression', 'slightly recovering, looking up']
  }
];

function generateImage(prompt, referenceBase64 = null) {
  return new Promise((resolve, reject) => {
    const postData = {
      model: 'image-01',
      prompt: prompt,
      response_format: 'base64',
      size: '512x512'
    };
    
    if (referenceBase64) {
      postData.subject_reference = [{
        type: 'character',
        image_file: `data:image/png;base64,${referenceBase64}`
      }];
    }
    
    const body = JSON.stringify(postData);
    const options = {
      hostname: 'api.minimax.chat',
      port: 443,
      path: '/v1/image_generation',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          if (r.error || r.base_resp?.status_code !== 0) {
            reject(new Error(r.error?.message || r.base_resp?.status_msg));
            return;
          }
          resolve(r.data?.image || r.data?.image_base64?.[0]);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function saveImage(base64, filepath) {
  fs.writeFileSync(filepath, Buffer.from(base64, 'base64'));
}

async function main() {
  console.log('===========================================');
  console.log('  Regenerating Frames with Green Background');
  console.log('===========================================\n');
  
  for (const state of states) {
    console.log(`\n[${state.name}]`);

    const stateDir = path.join(OUTPUT_DIR, state.name);
    let keyframeBase64 = null;

    // Step 1: Generate keyframe (first frame) without reference
    console.log('  Generating keyframe (frame 1)...');
    try {
      keyframeBase64 = await generateImage(state.keyframePrompt);
      const keyframePath = path.join(stateDir, 'frame_001.png');
      saveImage(keyframeBase64, keyframePath);
      console.log('  [OK] Keyframe saved');
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.error(`  [FAIL] Keyframe: ${e.message}`);
      continue;
    }
    
    // Step 2: Generate remaining frames with reference to first frame
    for (let i = 1; i < state.frameCount; i++) {
      console.log(`  Generating frame ${i + 1}...`);
      try {
        const base64 = await generateImage(state.variations[i], keyframeBase64);
        const framePath = path.join(stateDir, `frame_${String(i + 1).padStart(3, '0')}.png`);
        saveImage(base64, framePath);
        console.log(`  [OK] Frame ${i + 1} saved`);
        await new Promise(r => setTimeout(r, 2000));
      } catch (e) {
        console.error(`  [FAIL] Frame ${i + 1}: ${e.message}`);
      }
    }
  }
  
  console.log('\n===========================================');
  console.log('  Done!');
  console.log('===========================================');
}

main().catch(console.error);
