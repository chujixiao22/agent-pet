const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  dragStart: (x, y) => ipcRenderer.send('drag-start', { x, y }),
  dragEnd: () => ipcRenderer.send('drag-end'),
  onTasksUpdate: (callback) => {
    ipcRenderer.on('tasks-update', (event, tasks) => callback(tasks));
  },
  openProject: (cwd) => ipcRenderer.send('open-project', cwd),
  dismissTask: (taskId) => ipcRenderer.send('dismiss-task', taskId),
  onSkinConfig: (callback) => {
    ipcRenderer.on('skin-config', (event, config) => callback(config));
  },
  setSkin: (skinName) => {
    ipcRenderer.send('set-skin', skinName);
  }
});
