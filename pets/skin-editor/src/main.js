const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');

class SkinEditorApp {
  constructor() {
    this.mainWindow = null;
  }

  createWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 900,
      minHeight: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      },
      title: 'Skin Editor'
    });

    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  setupIPC() {
    // Load skin from file path
    ipcMain.handle('skin:load', async (event, filePath) => {
      try {
        const data = await this.loadSkinFromFile(filePath);
        return { success: true, data };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Save skin to directory
    ipcMain.handle('skin:save', async (event, skinData, dirPath) => {
      try {
        await this.saveSkinToDirectory(skinData, dirPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Export skin as zip
    ipcMain.handle('skin:export', async (event, skinData, outputPath) => {
      try {
        await this.exportSkinAsZip(skinData, outputPath);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Open file dialog
    ipcMain.handle('dialog:open-file', async (event, options) => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openFile'],
        filters: options.filters || [{ name: 'All Files', extensions: ['*'] }]
      });
      return result;
    });

    // Open directory dialog
    ipcMain.handle('dialog:open-directory', async (event) => {
      const result = await dialog.showOpenDialog(this.mainWindow, {
        properties: ['openDirectory']
      });
      return result;
    });

    // Save file dialog
    ipcMain.handle('dialog:save-file', async (event, options) => {
      const result = await dialog.showSaveDialog(this.mainWindow, {
        filters: options.filters || [{ name: 'All Files', extensions: ['*'] }],
        defaultPath: options.defaultPath
      });
      return result;
    });

    // Read file
    ipcMain.handle('fs:read-file', async (event, filePath) => {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return { success: true, content };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Write file
    ipcMain.handle('fs:write-file', async (event, filePath, content) => {
      try {
        fs.writeFileSync(filePath, content, 'utf-8');
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Read binary file
    ipcMain.handle('fs:read-file-binary', async (event, filePath) => {
      try {
        const buffer = fs.readFileSync(filePath);
        return { success: true, data: buffer };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Write binary file
    ipcMain.handle('fs:write-file-binary', async (event, filePath, base64Data) => {
      try {
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // Ensure directory exists
    ipcMain.handle('fs:ensure-dir', async (event, dirPath) => {
      try {
        if (!fs.existsSync(dirPath)) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    // List directory
    ipcMain.handle('fs:list-dir', async (event, dirPath) => {
      try {
        const files = fs.readdirSync(dirPath, { withFileTypes: true });
        const result = files.map(f => ({
          name: f.name,
          isDirectory: f.isDirectory(),
          isFile: f.isFile()
        }));
        return { success: true, files: result };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
  }

  async loadSkinFromFile(zipPath) {
    const buffer = fs.readFileSync(zipPath);
    const zip = await JSZip.loadAsync(buffer);

    const skinData = {
      name: path.basename(zipPath, '.zip'),
      manifest: null,
      animationManifest: null,
      states: {}
    };

    // Load manifest.json
    const manifestFile = zip.file('manifest.json');
    if (manifestFile) {
      skinData.manifest = JSON.parse(await manifestFile.async('string'));
      skinData.name = skinData.manifest.name || skinData.name;
    }

    // Load animation_manifest.json
    const animManifestFile = zip.file('animation_manifest.json');
    if (animManifestFile) {
      skinData.animationManifest = JSON.parse(await animManifestFile.async('string'));
    }

    // Load frame files for each state
    const states = skinData.manifest?.states || {};
    for (const stateName of Object.keys(states)) {
      const frameFiles = Object.keys(zip.files)
        .filter(f => f.startsWith(stateName + '/') && f.endsWith('.svg'))
        .sort();

      skinData.states[stateName] = [];
      for (const framePath of frameFiles) {
        const frameFile = zip.file(framePath);
        if (frameFile) {
          const svgContent = await frameFile.async('string');
          const fileName = path.basename(framePath);
          skinData.states[stateName].push({
            name: fileName,
            path: framePath,
            content: svgContent
          });
        }
      }
    }

    return skinData;
  }

  async saveSkinToDirectory(skinData, dirPath) {
    // Ensure directory exists
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    // Write manifest.json
    if (skinData.manifest) {
      fs.writeFileSync(
        path.join(dirPath, 'manifest.json'),
        JSON.stringify(skinData.manifest, null, 2),
        'utf-8'
      );
    }

    // Write animation_manifest.json
    if (skinData.animationManifest) {
      fs.writeFileSync(
        path.join(dirPath, 'animation_manifest.json'),
        JSON.stringify(skinData.animationManifest, null, 2),
        'utf-8'
      );
    }

    // Write frame files
    for (const [stateName, frames] of Object.entries(skinData.states)) {
      const stateDir = path.join(dirPath, stateName);
      if (!fs.existsSync(stateDir)) {
        fs.mkdirSync(stateDir, { recursive: true });
      }

      for (const frame of frames) {
        fs.writeFileSync(
          path.join(stateDir, frame.name),
          frame.content,
          'utf-8'
        );
      }
    }
  }

  async exportSkinAsZip(skinData, outputPath) {
    const zip = new JSZip();

    // Add manifest.json
    if (skinData.manifest) {
      zip.file('manifest.json', JSON.stringify(skinData.manifest, null, 2));
    }

    // Add animation_manifest.json
    if (skinData.animationManifest) {
      zip.file('animation_manifest.json', JSON.stringify(skinData.animationManifest, null, 2));
    }

    // Add frame files
    for (const [stateName, frames] of Object.entries(skinData.states)) {
      for (const frame of frames) {
        zip.file(`${stateName}/${frame.name}`, frame.content);
      }
    }

    const content = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(outputPath, content);
  }
}

// App lifecycle
const skinEditorApp = new SkinEditorApp();

app.whenReady().then(() => {
  skinEditorApp.setupIPC();
  skinEditorApp.createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      skinEditorApp.createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});