// electron/preload.js
// This script runs BEFORE the renderer process loads
// It acts as a secure bridge between Main and Renderer

const { contextBridge, ipcRenderer } = require('electron');

/**
 * Expose safe APIs to the renderer process
 * 
 * The renderer can access these via window.electron
 * Example: window.electron.sendMessage('hello')
 */
contextBridge.exposeInMainWorld('electron', {
  // Platform info
  platform: process.platform,
  
  // Send messages to main process
  sendMessage: (channel, data) => {
    // Whitelist of allowed channels for security
    const validChannels = ['resize-window', 'quit-app', 'minimize'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data);
    }
  },
  
  // Receive messages from main process
  onMessage: (channel, callback) => {
    const validChannels = ['system-data', 'media-update', 'notification'];
    if (validChannels.includes(channel)) {
      // Remove the event parameter for security
      ipcRenderer.on(channel, (event, ...args) => callback(...args));
    }
  },
  
  // Remove listener
  removeListener: (channel, callback) => {
    ipcRenderer.removeListener(channel, callback);
  }
});

/**
 * Expose WebSocket API for Python backend communication
 * This will connect to our Python server
 */
contextBridge.exposeInMainWorld('pythonAPI', {
  // These will be used by app.js to connect to Python backend
  connect: (url) => {
    // Renderer will handle WebSocket connection
    // We just expose the capability here
    return { url };
  }
});

console.log('✅ Preload script loaded');