// electron/preload.js
// Secure bridge between main and renderer processes

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose safe APIs to the renderer process
 * This is the ONLY way renderer can communicate with main process
 */
contextBridge.exposeInMainWorld('electron', {
  // Platform information
  platform: {
    async getInfo() {
      return await ipcRenderer.invoke('platform:info');
    },
    async getTheme() {
      return await ipcRenderer.invoke('theme:get');
    }
  },

  // Window controls
  window: {
    async resize(width, height, animated = true) {
      return await ipcRenderer.invoke('island:resize', { width, height, animated });
    },
    async setDraggable(draggable) {
      return await ipcRenderer.invoke('window:setDraggable', draggable);
    },
    async minimize() {
      return await ipcRenderer.invoke('window:minimize');
    },
    async restore() {
      return await ipcRenderer.invoke('window:restore');
    }
  },

  // Permissions
  permissions: {
    async request(type) {
      return await ipcRenderer.invoke('permissions:request', type);
    }
  },

  // App controls
  app: {
    async quit() {
      return await ipcRenderer.invoke('app:quit');
    }
  }
});

// Log when preload is ready
console.log('🔒 Preload script loaded - Secure bridge established');