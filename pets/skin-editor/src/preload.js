const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Skin operations
  loadSkin: (filePath) => ipcRenderer.invoke('skin:load', filePath),
  saveSkin: (skinData, dirPath) => ipcRenderer.invoke('skin:save', skinData, dirPath),
  exportSkin: (skinData, outputPath) => ipcRenderer.invoke('skin:export', skinData, outputPath),

  // Dialog operations
  openFileDialog: (options) => ipcRenderer.invoke('dialog:open-file', options),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:open-directory'),
  saveFileDialog: (options) => ipcRenderer.invoke('dialog:save-file', options),

  // File system operations
  readFile: (filePath) => ipcRenderer.invoke('fs:read-file', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write-file', filePath, content),
  readFileBinary: (filePath) => ipcRenderer.invoke('fs:read-file-binary', filePath),
  writeFileBinary: (filePath, base64Data) => ipcRenderer.invoke('fs:write-file-binary', filePath, base64Data),
  ensureDir: (dirPath) => ipcRenderer.invoke('fs:ensure-dir', dirPath),
  listDir: (dirPath) => ipcRenderer.invoke('fs:list-dir', dirPath)
});