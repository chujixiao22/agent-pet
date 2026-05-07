const path = require('path');
const fs = require('fs');
const os = require('os');

async function installSkin(skinPath) {
  if (!skinPath) {
    console.error('Usage: agent-pet install-skin <path-to-skin>');
    return;
  }

  // pet-desktop 使用 ~/.claw-pet/skins/
  const skinsDir = path.join(os.homedir(), '.claw-pet', 'skins');
  const skinName = path.basename(skinPath);
  const destPath = path.join(skinsDir, skinName);

  console.log('Installing skin: ' + skinName);

  // Ensure target directory exists
  fs.mkdirSync(skinsDir, { recursive: true });

  // Copy skin
  copyDir(skinPath, destPath);

  console.log('✅ Skin installed to: ' + destPath);
  console.log('ℹ️  Run agent-pet skin ' + skinName + ' to activate');
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

module.exports = { installSkin };