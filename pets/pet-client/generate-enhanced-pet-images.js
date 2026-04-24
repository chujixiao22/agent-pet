// 增强版宠物图片生成器 - 更多帧数，更流畅动画
const fs = require('fs').promises;
const path = require('path');

function generatePetSVG(state, frameIndex) {
  const colors = {
    body: '#FF8C42',
    bodyDark: '#E67E22',
    belly: '#FFE4B5',
    ear: '#FF8C42',
    earInner: '#FFB6C1',
    eye: '#2C3E50',
    eyeHighlight: '#FFFFFF',
    nose: '#FF6B6B',
    blush: '#FFB347',
    whisker: '#8B7355'
  };

  // 基础 SVG 模板
  const svgTemplate = `
    <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <!-- 背景：透明 -->
      <rect width="200" height="200" fill="none"/>

      <!-- 身体 - 根据状态调整 -->
      ${getBodyShape(state, frameIndex, colors)}

      <!-- 肚子 -->
      ${getBellyShape(state, frameIndex, colors)}

      <!-- 耳朵 -->
      ${getEarShapes(state, frameIndex, colors)}

      <!-- 眼睛 -->
      ${getEyeShapes(state, frameIndex, colors)}

      <!-- 鼻子 -->
      ${getNoseShape(state, frameIndex, colors)}

      <!-- 腮红 -->
      ${getBlushShapes(state, frameIndex, colors)}

      <!-- 嘴巴 -->
      ${getMouthShape(state, frameIndex, colors)}

      <!-- 胡须 -->
      ${getWhiskers(state, frameIndex, colors)}

      <!-- 特效 -->
      ${getEffects(state, frameIndex, colors)}
    </svg>
  `;

  return svgTemplate.trim();
}

function getBodyShape(state, frameIndex, colors) {
  // 身体形状变化
  const breathe = Math.sin((frameIndex / 12) * Math.PI * 2);
  const scale = 1 + breathe * 0.05;

  return `
    <ellipse cx="100" cy="110" rx="60" ry="55" fill="${colors.body}" transform="scale(${scale})"/>
    <ellipse cx="100" cy="115" rx="50" ry="40" fill="${colors.bodyDark}" transform="scale(${scale})"/>
  `;
}

function getBellyShape(state, frameIndex, colors) {
  const breathe = Math.sin((frameIndex / 12) * Math.PI * 2);
  const scale = 1 + breathe * 0.03;

  return `
    <ellipse cx="100" cy="125" rx="40" ry="30" fill="${colors.belly}" transform="scale(${scale})"/>
  `;
}

function getEarShapes(state, frameIndex, colors) {
  // 耳朵摆动
  const earSwing = Math.sin((frameIndex / 6) * Math.PI * 2);
  const leftEarAngle = -15 + earSwing * 10;
  const rightEarAngle = 15 - earSwing * 10;

  return `
    <!-- 左耳 -->
    <ellipse cx="55" cy="60" rx="18" ry="25" fill="${colors.ear}"
            transform="rotate(${leftEarAngle}deg, 55, 70)"/>
    <ellipse cx="55" cy="63" rx="10" ry="15" fill="${colors.earInner}"
            transform="rotate(${leftEarAngle}deg, 55, 70)"/>

    <!-- 右耳 -->
    <ellipse cx="145" cy="60" rx="18" ry="25" fill="${colors.ear}"
            transform="rotate(${rightEarAngle}deg, 145, 70)"/>
    <ellipse cx="145" cy="63" rx="10" ry="15" fill="${colors.earInner}"
            transform="rotate(${rightEarAngle}deg, 145, 70)"/>
  `;
}

function getEyeShapes(state, frameIndex, colors) {
  // 眼睛变化
  const blink = (frameIndex % 12) < 1; // 每第12帧眨眼一次
  const blinkProgress = (frameIndex % 12) / 1;

  let eyeY = 95;
  let eyeHeight = 15;
  let eyeContent = '';

  if (blink) {
    // 眨眼效果
    eyeHeight = 15 * (1 - blinkProgress);
    if (blinkProgress > 0.5 && blinkProgress < 0.8) {
      eyeContent = `<line x1="75" y1="${eyeY}" x2="105" y2="${eyeY}" stroke="${colors.eye}" stroke-width="3"/>`;
    }
  } else {
    // 正常眼睛
    if (state === 'thinking') {
      eyeY = 95 + Math.sin(frameIndex * 0.5) * 3;
    }
  }

  return `
    <!-- 左眼外圈 -->
    <ellipse cx="80" cy="${eyeY}" rx="12" ry="${eyeHeight}" fill="white"/>
    ${eyeContent ? eyeContent : `
      <!-- 左眼球 -->
      <circle cx="80" cy="${eyeY}" r="6" fill="${colors.eye}"/>
      <!-- 左眼高光 -->
      <circle cx="78" cy="${eyeY - 2}" r="2" fill="${colors.eyeHighlight}"/>
    `}

    <!-- 右眼外圈 -->
    <ellipse cx="120" cy="${eyeY}" rx="12" ry="${eyeHeight}" fill="white"/>
    ${eyeContent ? eyeContent : `
      <!-- 右眼球 -->
      <circle cx="120" cy="${eyeY}" r="6" fill="${colors.eye}"/>
      <!-- 右眼高光 -->
      <circle cx="118" cy="${eyeY - 2}" r="2" fill="${colors.eyeHighlight}"/>
    `}
  `;
}

function getNoseShape(state, frameIndex, colors) {
  // 鼻子变化
  const noseScale = 1 + Math.sin(frameIndex * 0.3) * 0.1;

  return `
    <ellipse cx="100" cy="110" rx="6" ry="5" fill="${colors.nose}" transform="scale(${noseScale})"/>
  `;
}

function getBlushShapes(state, frameIndex, colors) {
  // 腮红变化
  const blushScale = 0.7 + Math.sin(frameIndex * 0.2) * 0.2;

  return `
    <ellipse cx="70" cy="115" rx="8" ry="5" fill="${colors.blush}" opacity="${blushScale}"/>
    <ellipse cx="130" cy="115" rx="8" ry="5" fill="${colors.blush}" opacity="${blushScale}"/>
  `;
}

function getMouthShape(state, frameIndex, colors) {
  // 嘴巴变化
  let mouthPath = '';
  let mouthY = 120;

  switch (state) {
    case 'idle':
      const idleMouth = frameIndex % 3;
      if (idleMouth === 0) {
        mouthPath = '<path d="M 85 118 Q 90 122 95 118" stroke="#8B7355" stroke-width="2" fill="none"/>';
      } else if (idleMouth === 1) {
        mouthPath = '<path d="M 85 118 Q 90 120 95 118" stroke="#8B7355" stroke-width="2" fill="none"/>';
      } else {
        mouthPath = '<path d="M 85 118 Q 90 119 95 118" stroke="#8B7355" stroke-width="2" fill="none"/>';
      }
      break;

    case 'idle_long':
      // 睡觉嘴巴
      mouthY = 125;
      const sleepMouth = frameIndex % 4;
      if (sleepMouth === 0 || sleepMouth === 2) {
        mouthPath = '<circle cx="100" cy="125" r="3" fill="#8B7355"/>';
      } else {
        mouthPath = '<path d="M 90 125 Q 100 122 110 125" stroke="#8B7355" stroke-width="2" fill="none"/>';
      }
      break;

    case 'working':
      // 工作嘴巴（专注）
      const workMouth = frameIndex % 2;
      mouthY = 118;
      if (workMouth === 0) {
        mouthPath = '<rect x="92" y="118" width="16" height="4" rx="2" fill="#8B7355"/>';
      } else {
        mouthPath = '<path d="M 90 118 Q 100 120 110 118" stroke="#8B7355" stroke-width="2" fill="none"/>';
      }
      break;

    case 'thinking':
      // 思考嘴巴（疑惑）
      mouthY = 118;
      const thinkMouth = frameIndex % 3;
      if (thinkMouth === 0) {
        mouthPath = '<circle cx="100" cy="118" r="3" fill="none" stroke="#8B7355" stroke-width="2"/>';
      } else if (thinkMouth === 1) {
        mouthPath = '<ellipse cx="100" cy="118" rx="4" ry="2" fill="none" stroke="#8B7355" stroke-width="2"/>';
      } else {
        mouthPath = '<path d="M 92 118 Q 100 116 108 118" stroke="#8B7355" stroke-width="2" fill="none"/>';
      }
      break;

    case 'success':
      // 成功嘴巴（开心）
      const happyMouth = frameIndex % 4;
      const happyY = 118 + Math.sin(frameIndex * 0.8) * 5;
      if (happyMouth === 0) {
        mouthPath = '<path d="M 85 118 Q 100 128 115 118" stroke="#8B7355" stroke-width="3" fill="none"/>';
      } else if (happyMouth === 1) {
        mouthPath = '<path d="M 85 118 Q 100 130 115 118" stroke="#8B7355" stroke-width="3" fill="none"/>';
      } else if (happyMouth === 2) {
        mouthPath = '<path d="M 90 118 Q 100 127 110 118" stroke="#8B7355" stroke-width="3" fill="none"/>';
      } else {
        mouthPath = '<path d="M 90 118 Q 100 125 110 118" stroke="#8B7355" stroke-width="3" fill="none"/>';
      }
      break;

    case 'error':
      // 错误嘴巴（难过）
      mouthY = 122;
      const errorMouth = frameIndex % 4;
      if (errorMouth === 0) {
        mouthPath = '<path d="M 90 122 Q 100 120 110 122" stroke="#8B7355" stroke-width="2" fill="none"/>';
      } else if (errorMouth === 1) {
        mouthPath = '<path d="M 90 122 Q 100 118 110 122" stroke="#8B7355" stroke-width="2" fill="none"/>';
      } else if (errorMouth === 2) {
        mouthPath = '<path d="M 92 122 Q 100 119 108 122" stroke="#8B7355" stroke-width="2" fill="none"/>';
      } else {
        mouthPath = '<path d="M 92 122 Q 100 117 108 122" stroke="#8B7355" stroke-width="2" fill="none"/>';
      }
      break;

    default:
      mouthPath = '<path d="M 85 118 Q 90 122 95 118" stroke="#8B7355" stroke-width="2" fill="none"/>';
  }

  return mouthPath;
}

function getWhiskers(state, frameIndex, colors) {
  // 胡须变化
  const whiskerWave = Math.sin(frameIndex * 0.5) * 3;
  const whiskerOpacity = 0.6 + Math.sin(frameIndex * 0.3) * 0.3;

  return `
    <!-- 左侧胡须 -->
    <line x1="50" y1="105" x2="20" y2="${100 + whiskerWave}" stroke="${colors.whisker}" stroke-width="2" opacity="${whiskerOpacity}"/>
    <line x1="50" y1="110" x2="20" y2="${110 + whiskerWave}" stroke="${colors.whisker}" stroke-width="2" opacity="${whiskerOpacity}"/>
    <line x1="50" y1="115" x2="20" y2="${115 + whiskerWave}" stroke="${colors.whisker}" stroke-width="2" opacity="${whiskerOpacity}"/>

    <!-- 右侧胡须 -->
    <line x1="150" y1="105" x2="180" y2="${100 + whiskerWave}" stroke="${colors.whisker}" stroke-width="2" opacity="${whiskerOpacity}"/>
    <line x1="150" y1="110" x2="180" y2="${110 + whiskerWave}" stroke="${colors.whisker}" stroke-width="2" opacity="${whiskerOpacity}"/>
    <line x1="150" y1="115" x2="180" y2="${115 + whiskerWave}" stroke="${colors.whisker}" stroke-width="2" opacity="${whiskerOpacity}"/>
  `;
}

function getEffects(state, frameIndex, colors) {
  let effects = '';

  switch (state) {
    case 'idle':
      // 待机特效：偶尔星星
      if (frameIndex % 8 === 0) {
        effects = `
          <!-- 小星星 -->
          <text x="30" y="50" font-size="12" fill="#FFD700">✨</text>
        `;
      }
      break;

    case 'idle_long':
      // 睡觉特效：Z 气泡 + 呼噜
      const zPhase = Math.floor(frameIndex / 2) % 4;
      const zOpacity = 1 - Math.abs(Math.sin(frameIndex * 0.3)) * 0.5;

      effects = `
        <!-- Z 气泡 -->
        <ellipse cx="160" cy="50" rx="25" ry="20" fill="rgba(255,255,255,0.9)" stroke="#ccc" stroke-width="1" opacity="${zOpacity}"/>
        <text x="155" y="55" font-size="16" fill="#666" opacity="${zOpacity}">Z</text>

        <!-- 呼噜声波 -->
        ${zPhase === 1 ? '<text x="155" y="75" font-size="12" fill="#999">💤</text>' : ''}
        ${zPhase === 3 ? '<text x="155" y="75" font-size="12" fill="#999">💤</text>' : ''}
      `;
      break;

    case 'working':
      // 工作特效：打字光线
      const workPhase = frameIndex % 4;
      const glowOpacity = 0.8 + Math.sin(frameIndex * 0.8) * 0.2;

      effects = `
        <!-- 键盘光线 -->
        <ellipse cx="100" cy="150" rx="35" ry="8" fill="rgba(65, 105, 225, ${glowOpacity})"/>
        ${workPhase === 0 ? '<circle cx="80" cy="150" r="3" fill="rgba(255,255,255,0.5)"/>' : ''}
        ${workPhase === 1 ? '<circle cx="100" cy="148" r="4" fill="rgba(255,255,255,0.6)"/>' : ''}
        ${workPhase === 2 ? '<circle cx="120" cy="150" r="3" fill="rgba(255,255,255,0.5)"/>' : ''}
        ${workPhase === 3 ? '<circle cx="100" cy="152" r="3" fill="rgba(255,255,255,0.6)"/>' : ''}
      `;
      break;

    case 'thinking':
      // 思考特效：问号气泡
      const questionMarks = ['?', '??', '???'];
      const questionIndex = Math.floor(frameIndex / 3) % 3;
      const bubbleOpacity = 0.7 + Math.sin(frameIndex * 0.4) * 0.3;

      effects = `
        <!-- 思考气泡 -->
        <ellipse cx="160" cy="40" rx="30" ry="25" fill="rgba(255,255,255,${bubbleOpacity})" stroke="#4169E1" stroke-width="2"/>
        <text x="150" y="48" font-size="18" fill="#4169E1" font-weight="bold">${questionMarks[questionIndex]}</text>
      `;
      break;

    case 'success':
      // 成功特效：多星星 + 弹跳
      const starPositions = [
        {x: 25, y: 45}, {x: 170, y: 55},
        {x: 15, y: 75}, {x: 180, y: 65},
        {x: 20, y: 90}, {x: 175, y: 85}
      ];
      const jumpOffset = Math.abs(Math.sin(frameIndex * 0.7)) * 15;

      effects = starPositions.map((star, i) => `
        <!-- 星星 ${i + 1} -->
        <text x="${star.x}" y="${star.y - jumpOffset}" font-size="16">⭐</text>
      `).join('');

      break;

    case 'error':
      // 错误特效：眼泪 + 暗淡
      const tearProgress = (frameIndex % 6) / 6;
      const tearOpacity = Math.sin(frameIndex * 0.5) * 0.5 + 0.5;
      const dimOpacity = 0.7 - Math.sin(frameIndex * 0.3) * 0.2;

      effects = `
        <!-- 泪水 -->
        ${tearProgress < 0.3 ? `
          <ellipse cx="65" cy="115" rx="3" ry="4" fill="rgba(100, 149, 237, ${tearOpacity})"/>
        ` : ''}

        ${tearProgress >= 0.3 && tearProgress < 0.7 ? `
          <ellipse cx="135" cy="117" rx="2" ry="3" fill="rgba(100, 149, 237, ${tearOpacity})"/>
        ` : ''}

        <!-- 暗淡覆盖 -->
        <rect x="0" y="0" width="200" height="200" fill="rgba(0,0,0,${dimOpacity})" opacity="0.3"/>
      `;
      break;

    default:
      effects = '';
  }

  return effects;
}

async function generateEnhancedImages() {
  const states = {
    'idle': { frames: 12, duration: 100, name: '待机状态' },
    'idle_long': { frames: 8, duration: 250, name: '久等状态' },
    'working': { frames: 10, duration: 100, name: '工作状态' },
    'thinking': { frames: 9, duration: 130, name: '思考状态' },
    'success': { frames: 8, duration: 80, name: '成功状态' },
    'error': { frames: 10, duration: 150, name: '错误状态' }
  };

  console.log('🎨 增强版宠物图片生成器...\n');
  console.log('✨ 更多帧数，更流畅动画！\n');

  let totalFrames = 0;

  for (const [stateName, stateConfig] of Object.entries(states)) {
    console.log(`📁 生成 ${stateConfig.name} (${stateConfig.frames} 帧)`);

    const stateDir = path.join('.', 'sprites', stateName);

    // 创建状态目录
    await fs.mkdir(stateDir, { recursive: true });

    // 生成该状态的所有帧
    for (let i = 1; i <= stateConfig.frames; i++) {
      const svgContent = generatePetSVG(stateName, i);
      const filename = `frame_${i.toString().padStart(3, '0')}.svg`;

      await fs.writeFile(path.join(stateDir, filename), svgContent);
      console.log(`  ✅ ${filename}`);
      totalFrames++;
    }
  }

  // 创建增强版动画清单
  const manifest = {
    version: '2.0.0',
    totalFrames: totalFrames,
    states: {}
  };

  for (const [stateName, stateConfig] of Object.entries(states)) {
    manifest.states[stateName] = {
      frameCount: stateConfig.frames,
      duration: stateConfig.duration,
      frames: Array.from({ length: stateConfig.frames }, (_, i) => ({
        path: `${stateName}/frame_${(i + 1).toString().padStart(3, '0')}.svg`,
        width: 200,
        height: 200
      }))
    };
  }

  await fs.writeFile('./sprites/animation_manifest.json', JSON.stringify(manifest, null, 2));
  console.log('\n✅ 增强版动画清单已创建');

  console.log('\n🎉 增强版图片生成完成！');
  console.log(`📊 总计生成 ${totalFrames} 帧宠物图片`);
  console.log('📁 输出目录: ./sprites/');
  console.log('');
  console.log('✨ 增强功能：');
  console.log('  🔄 更多帧数：8-12帧/状态');
  console.log('  🎨 更多表情：眨眼、耳动、胡须摆动');
  console.log('  🌟 更多特效：星星、眼泪、光线、气泡');
  console.log('  📏 更大幅动作：身体缩放、跳跃、摇头');
  console.log('  ⚡ 更流畅动画：100-150ms/帧');
}

// 运行增强版生成器
generateEnhancedImages().catch(error => {
  console.error('❌ 生成失败:', error);
  process.exit(1);
});