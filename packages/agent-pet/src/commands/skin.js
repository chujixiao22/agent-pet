const path = require('path');
const fs = require('fs');
const os = require('os');

async function skin(skinName) {
  // pet-desktop 使用 ~/.claw-pet/ 目录
  const clawPetDir = path.join(os.homedir(), '.claw-pet');
  const clawPetSkinsDir = path.join(clawPetDir, 'skins');
  const clawPetSkinConfig = path.join(clawPetDir, 'skin-config.json');

  // agent-pet 使用 ~/.agent-pet/ 目录
  const agentPetDir = path.join(os.homedir(), '.agent-pet');
  const agentPetConfig = path.join(agentPetDir, 'config.json');

  // 列出可用皮肤
  if (!skinName) {
    console.log('🎨 Available skins:');

    // 检查 ~/.claw-pet/skins/
    if (fs.existsSync(clawPetSkinsDir)) {
      const skins = fs.readdirSync(clawPetSkinsDir).filter(d => {
        return fs.statSync(path.join(clawPetSkinsDir, d)).isDirectory();
      });
      skins.forEach(s => console.log(`  - ${s}`));
    }

    // 检查 packages/skins（开发时使用）
    const devSkinsDir = path.join(__dirname, '..', '..', 'skins');
    if (fs.existsSync(devSkinsDir)) {
      const skins = fs.readdirSync(devSkinsDir).filter(d => {
        return fs.statSync(path.join(devSkinsDir, d)).isDirectory();
      });
      if (skins.length > 0) {
        console.log('\n📦 Development skins (not installed):');
        skins.forEach(s => console.log(`  - ${s} (run install-skin to use)`));
      }
    }

    // 显示当前皮肤
    if (fs.existsSync(clawPetSkinConfig)) {
      const config = JSON.parse(fs.readFileSync(clawPetSkinConfig, 'utf8'));
      console.log(`\n📌 Current skin: ${config.skin || 'default'}`);
    } else if (fs.existsSync(agentPetConfig)) {
      const config = JSON.parse(fs.readFileSync(agentPetConfig, 'utf8'));
      console.log(`\n📌 Current skin: ${config.skin || 'default'}`);
    }
    return;
  }

  // 确保 ~/.claw-pet 目录存在
  if (!fs.existsSync(clawPetDir)) {
    fs.mkdirSync(clawPetDir, { recursive: true });
  }

  // 切换皮肤 - 更新 pet-desktop 的配置
  const skinConfig = { skin: skinName };
  fs.writeFileSync(clawPetSkinConfig, JSON.stringify(skinConfig, null, 2));
  console.log(`✅ Skin config updated: ${skinName}`);

  // 同时更新 agent-pet 的配置
  let agentConfig = { enabled: true, autoStart: true, skin: skinName };
  if (fs.existsSync(agentPetConfig)) {
    try {
      agentConfig = { ...JSON.parse(fs.readFileSync(agentPetConfig, 'utf8')), skin: skinName };
    } catch (e) {}
  }
  fs.writeFileSync(agentPetConfig, JSON.stringify(agentConfig, null, 2));

  // 如果皮肤在开发目录中但不在 ~/.claw-pet/skins/ 中，自动复制
  const devSkinPath = path.join(__dirname, '..', '..', '..', 'skins', skinName);
  const targetSkinPath = path.join(clawPetSkinsDir, skinName);

  if (fs.existsSync(devSkinPath) && !fs.existsSync(targetSkinPath)) {
    console.log('📦 Auto-installing skin to ~/.claw-pet/skins/...');
    fs.mkdirSync(clawPetSkinsDir, { recursive: true });
    copyDir(devSkinPath, targetSkinPath);
  }

  console.log('ℹ️  Restart pet to apply: agent-pet restart');
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

module.exports = { skin };