const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

async function build() {
  console.log('Building agent-pet...');

  const projectRoot = path.join(__dirname, '../../..');
  const petDesktopPath = path.join(projectRoot, 'pets/pet-desktop');
  const outputPath = path.join(os.homedir(), '.agent-pet', 'pet-desktop');

  // 1. Clean old build
  console.log('Cleaning old build...');
  if (fs.existsSync(outputPath)) {
    fs.rmSync(outputPath, { recursive: true, force: true });
  }

  // 2. Install dependencies
  console.log('Installing dependencies...');
  try {
    execSync('npm install', { cwd: petDesktopPath, stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to install dependencies');
    return;
  }

  // 3. Build Electron app
  console.log('Building Electron app...');
  try {
    execSync('npx electron-builder --win portable', {
      cwd: petDesktopPath,
      stdio: 'inherit',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined }
    });
  } catch (e) {
    console.error('Build failed');
    return;
  }

  // 4. Find build output
  const distDir = path.join(petDesktopPath, 'dist');
  const winUnpacked = path.join(distDir, 'win-unpacked');

  if (fs.existsSync(winUnpacked)) {
    console.log('Copying to user directory...');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    copyDir(winUnpacked, outputPath);
    console.log('Build complete!');
    console.log('Installed to: ' + outputPath);
  } else {
    console.error('Build output not found');
  }
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

module.exports = { build };