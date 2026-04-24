const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get current status
  getStatus: () => ipcRenderer.invoke('get-status'),

  // Get pet configuration
  getConfig: () => ipcRenderer.invoke('get-config'),

  // Listen for status changes
  onStatusChange: (callback) => {
    const subscription = (event, status) => callback(status);
    ipcRenderer.on('status-change', subscription);
    return () => ipcRenderer.removeListener('status-change', subscription);
  },

  // Listen for initial status
  onInitialStatus: (callback) => {
    const subscription = (event, status) => callback(status);
    ipcRenderer.on('initial-status', subscription);
    return () => ipcRenderer.removeListener('initial-status', subscription);
  },

  // Listen for show command
  onShowPet: (callback) => {
    const subscription = () => callback();
    ipcRenderer.on('show-pet', subscription);
    return () => ipcRenderer.removeListener('show-pet', subscription);
  },

  // Listen for display message
  onDisplayMessage: (callback) => {
    const subscription = (event, message) => callback(message);
    ipcRenderer.on('display-message', subscription);
    return () => ipcRenderer.removeListener('display-message', subscription);
  },

  // Show context menu
  showContextMenu: () => ipcRenderer.send('show-context-menu'),

  // Show message
  showMessage: (message) => ipcRenderer.send('show-message', message)
});
