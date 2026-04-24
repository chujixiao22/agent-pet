// 生成真实的宠物图片（SVG格式）
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
    nose: '#FF6B6B',
    blush: '#FFB347'
  };

  // 基础 SVG 模板
  const svgTemplate = `
    <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <!-- 背景：透明 -->
      <rect width="180" height="180" fill="none"/>

      <!-- 身体 -->
      <ellipse cx="90" cy="100" rx="55" ry="50" fill="${colors.body}"/>
      <ellipse cx="90" cy="105" rx="45" ry="35" fill="${colors.bodyDark}"/>

      <!-- 肚子 -->
      <ellipse cx="90" cy="115" rx="35" ry="25" fill="${colors.belly}"/>

      <!-- 左耳 -->
      <ellipse cx="50" cy="65" rx="15" ry="20" fill="${colors.ear}"/>
      <ellipse cx="50" cy="67" rx="8" ry="12" fill="${colors.earInner}"/>

      <!-- 右耳 -->
      <ellipse cx="130" cy="65" rx="15" ry="20" fill="${colors.ear}"/>
      <ellipse cx="130" cy="67" rx="8" ry="12" fill="${colors.earInner}"/>

      <!-- 左眼 -->
      <ellipse cx="75" cy="90" rx="10" ry="12" fill="white"/>
      <circle cx="75" cy="90" r="5" fill="${colors.eye}"/>
      <circle cx="73" cy="88" r="2" fill="white"/>

      <!-- 右眼 -->
      <ellipse cx="105" cy="90" rx="10" ry="12" fill="white"/>
      <circle cx="105" cy="90" r="5" fill="${colors.eye}"/>
      <circle cx="103" cy="88" r="2" fill="white"/>

      <!-- 鼻子 -->
      <ellipse cx="90" cy="105" rx="4" ry="3" fill="${colors.nose}"/>

      <!-- 腮红 -->
      <ellipse cx="70" cy="105" rx="5" ry="3" fill="${colors.blush}" opacity="0.7"/>
      <ellipse cx="110" cy="105" rx="5" ry="3" fill="${colors.blush}" opacity="0.7"/>

      <!-- 嘴巴 -->
      <path d="M 85 110 Q 90 105 95 110" stroke="#5D4037" stroke-width="2" fill="none"/>

      <!-- 状态特定元素 -->
      ${getStateSpecificElements(state, frameIndex)}
    </svg>
  `;

  return svgTemplate.trim();
}

function getStateSpecificElements(state, frameIndex) {
  switch (state) {
    case 'idle':
      // 待机：正常表情
      return '';
    case 'idle_long':
      // 久等：闭眼 + Z 气泡
      return `
        <!-- 闭眼 -->
        <path d="M 65 88 Q 70 85 75 88" stroke="#2C3E50" stroke-width="2" fill="none"/>
        <path d="M 105 88 Q 110 85 115 88" stroke="#2C3E50" stroke-width="2" fill="none"/>
        <!-- Z 气泡 -->
        <ellipse cx="135" cy="40" rx="20" ry="15" fill="rgba(255,255,255,0.8)" stroke="#ccc" stroke-width="1"/>
        <text x="128" y="45" font-size="16" fill="#666">Z</text>
      `;
    case 'working':
      // 工作：打字姿势
      const workOffset = (frameIndex % 2) === 0 ? 5 : 0;
      return `
        <!-- 工作姿势 -->
        <ellipse cx="75" cy="100" rx="8" ry="6" fill="#FFE4B5"/>
        <ellipse cx="105" cy="100" rx="8" ry="6" fill="#FFE4B5"/>
        <!-- 键盘光线 -->
        <ellipse cx="90" cy="125" rx="30" ry="5" fill="rgba(65, 105, 225, 0.2)"/>
      `;
    case 'thinking':
      // 思考：歪头 + 问号
      return `
        <!-- 歪头效果 -->
        <g transform="rotate(5, 90, 100)">
          <ellipse cx="90" cy="100" rx="55" ry="50" fill="#FF8C42"/>
          <ellipse cx="90" cy="105" rx="45" ry="35" fill="#FFE4B5"/>
        </g>
        <!-- 问号气泡 -->
        <ellipse cx="135" cy="40" rx="25" ry="20" fill="rgba(255,255,255,0.9)" stroke="#4169E1" stroke-width="2"/>
        <text x="128" y="47" font-size="20" fill="#4169E1" font-weight="bold">?</text>
      `;
    case 'success':
      // 成功：跳跃姿势 + 星星
      const jumpOffset = (frameIndex % 2) === 0 ? -8 : 0;
      return `
        <!-- 跳跃姿势 -->
        <ellipse cx="90" cy="${100 + jumpOffset}" rx="55" ry="50" fill="#FF8C42"/>
        <ellipse cx="90" cy="${105 + jumpOffset}" rx="45" ry="35" fill="#FFE4B5"/>
        <!-- 开心眼 -->
        <path d="M 70 85 L 80 85 M 100 85 L 110 85" stroke="#2C3E50" stroke-width="3" fill="none"/>
        <!-- 星星 -->
        <text x="30" y="60" font-size="24">⭐</text>
        <text x="150" y="70" font-size="20">✨</text>
      `;
    case 'error':
      // 错误：难过表情 + 泪水
      return `
        <!-- 难过表情 -->
        <ellipse cx="90" cy="100" rx="55" ry="50" fill="#CD5C5C"/>
        <ellipse cx="90" cy="105" rx="45" ry="35" fill="#FFE4B5"/>
        <!-- 下垂眼睛 -->
        <path d="M 65 90 Q 70 95 75 90" stroke="#5D4037" stroke-width="2" fill="none"/>
        <path d="M 105 90 Q 110 95 115 90" stroke="#5D4037" stroke-width="2" fill="none"/>
        <!-- 泪水 -->
        <ellipse cx="60" cy="100" rx="3" ry="4" fill="rgba(100, 149, 237, 0.8)"/>
        <ellipse cx="120" cy="102" rx="2" ry="3" fill="rgba(100, 149, 237, 0.8)"/>
      `;
    default:
      return '';
  }
}

async function generateAllImages() {
  const states = ['idle', 'idle_long', 'working', 'thinking', 'success', 'error'];
  const framesPerState = 4;

  console.log('🎨 开始生成宠物图片...\n');

  for (const state of states) {
    const stateDir = path.join('.', 'sprites', state);

    // 创建状态目录
    await fs.mkdir(stateDir, { recursive: true });

    console.log(`📁 生成 ${state} 状态 (${framesPerState} 帧)`);

    for (let i = 1; i <= framesPerState; i++) {
      const svgContent = generatePetSVG(state, i);
      const filename = `frame_${i.toString().padStart(3, '0')}.svg`;

      // 将 SVG 转换为 base64 图片
      const base64Image = Buffer.from(svgContent).toString('base64');

      // 保存为 SVG 文件（可以转换为 PNG）
      const outputPath = path.join(stateDir, filename);
      await fs.writeFile(outputPath, svgContent);

      console.log(`  ✅ ${filename}`);
    }
  }

  // 创建动画清单
  const manifest = {
    version: '1.0.0',
    totalFrames: 24,
    states: {}
  };

  for (const state of states) {
    manifest.states[state] = {
      frameCount: framesPerState,
      duration: state === 'success' ? 150 : (state === 'working' ? 200 : 250),
      frames: Array.from({ length: framesPerState }, (_, i) => ({
        path: `${state}/frame_${(i + 1).toString().padStart(3, '0')}.svg`,
        width: 180,
        height: 180
      }))
    };
  }

  await fs.writeFile('./sprites/animation_manifest.json', JSON.stringify(manifest, null, 2));
  console.log('\n✅ 动画清单已创建');

  console.log('\n🎉 所有图片生成完成！');
  console.log(`总共生成 ${states.length * framesPerState} 帧宠物图片`);
  console.log('📁 输出目录: ./sprites/');
}

// 运行生成器
generateAllImages().catch(error => {
  console.error('❌ 生成失败:', error);
  process.exit(1);
});