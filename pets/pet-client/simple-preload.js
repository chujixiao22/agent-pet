const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getStatus: () => ipcRenderer.sendSync('get-status'),
  getConfig: () => ipcRenderer.sendSync('get-config'),
  showMessage: (message) => ipcRenderer.send('show-message', message)
});