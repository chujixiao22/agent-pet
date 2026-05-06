const path = require('path');
const fs = require('fs');
const os = require('os');

async function skin(skinName) {
  if (!skinName) {
    // 列出可用皮肤
    const configDir = path.join(os.homedir(), '.agent-pet');
    const skinsDir = path.join(configDir, 'skins');

    console.log('🎨 Available skins:');

    if (fs.existsSync(skinsDir)) {
      const skins = fs.readdirSync(skinsDir).filter(d => {
        return fs.statSync(path.join(skinsDir, d)).isDirectory();
      });

      if (skins.length === 0) {
        console.log('  No custom skins installed');
        console.log('  Use agent-pet skin <name> to switch');
      } else {
        skins.forEach(s => console.log(`  - ${s}`));
      }
    } else {
      console.log('  No custom skins installed');
    }

    // 显示当前皮肤
    const configPath = path.join(configDir, 'config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log(`\n📌 Current skin: ${config.skin || 'default'}`);
    }
    return;
  }

  // 切换皮肤
  const configDir = path.join(os.homedir(), '.agent-pet');
  const configPath = path.join(configDir, 'config.json');

  let config = { enabled: true, autoStart: true, skin: 'default' };
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  config.skin = skinName;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  console.log(`✅ Skin changed to: ${skinName}`);
  console.log('ℹ️  Restart pet to apply: agent-pet restart');
}

module.exports = { skin };