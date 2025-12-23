// electron/main.js
// Main Process - Enhanced with advanced window management and IPC

const { app, BrowserWindow, screen, ipcMain, systemPreferences, nativeTheme } = require('electron');
const path = require('path');

// Keep a global reference to prevent garbage collection
let mainWindow;
let islandState = {
  isExpanded: false,
  currentWidth: 200,
  currentHeight: 40,
  position: { x: 0, y: 10 }
};

// Platform detection
const platform = {
  isMac: process.platform === 'darwin',
  isWindows: process.platform === 'win32',
  isLinux: process.platform === 'linux'
};

/**
 * Get platform-specific window options
 */
function getPlatformOptions() {
  const baseOptions = {
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true,
      backgroundThrottling: false // Prevent throttling when window is hidden
    }
  };

  // macOS-specific options
  if (platform.isMac) {
    return {
      ...baseOptions,
      vibrancy: 'hud', // Native blur effect
      visualEffectState: 'active',
      titleBarStyle: 'customButtonsOnHover',
      trafficLightPosition: { x: -100, y: -100 } // Hide traffic lights
    };
  }

  // Windows-specific options
  if (platform.isWindows) {
    return {
      ...baseOptions,
      backgroundColor: '#00000000',
      // Windows 11 acrylic effect (if available)
      ...(parseInt(require('os').release()) >= 10 && {
        backgroundMaterial: 'acrylic'
      })
    };
  }

  // Linux fallback
  return baseOptions;
}

/**
 * Calculate center position for the island
 */
function getCenterPosition(width, height) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth } = primaryDisplay.workAreaSize;
  
  return {
    x: Math.floor((screenWidth - width) / 2),
    y: 10 // 10px from top
  };
}

/**
 * Creates the Dynamic Island window
 */
function createWindow() {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

  // Initial dimensions (collapsed state - Floating Navbar Mode)
  const ISLAND_WIDTH = 680;
  const ISLAND_HEIGHT = 32;

  const position = getCenterPosition(ISLAND_WIDTH, ISLAND_HEIGHT);

  mainWindow = new BrowserWindow({
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
    x: position.x,
    y: position.y,
    ...getPlatformOptions()
  });

  // Load the UI
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Prevent window from being moved by default
  mainWindow.setMovable(false);

  // Make window ignore mouse events in transparent areas
  if (platform.isWindows) {
    mainWindow.setIgnoreMouseEvents(false);
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Log creation
  console.log('✅ Dynamic Island window created');
  console.log(`📍 Platform: ${process.platform}`);
  console.log(`📐 Screen: ${screenWidth}x${screenHeight}`);
  console.log(`📍 Position: (${position.x}, ${position.y})`);

  // Optional: Open DevTools for debugging
  // mainWindow.webContents.openDevTools({ mode: 'detach' });
}

/**
 * IPC Handlers - Communication between renderer and main process
 */

// Expand/Collapse island with smooth animation
ipcMain.handle('island:resize', async (event, { width, height, animated = true }) => {
  if (!mainWindow) return;

  const newPosition = getCenterPosition(width, height);
  
  if (animated) {
    // Smooth resize animation
    const steps = 20;
    const currentBounds = mainWindow.getBounds();
    const deltaWidth = (width - currentBounds.width) / steps;
    const deltaHeight = (height - currentBounds.height) / steps;
    const deltaX = (newPosition.x - currentBounds.x) / steps;
    const deltaY = (newPosition.y - currentBounds.y) / steps;

    for (let i = 0; i < steps; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
      mainWindow.setBounds({
        x: Math.round(currentBounds.x + deltaX * i),
        y: Math.round(currentBounds.y + deltaY * i),
        width: Math.round(currentBounds.width + deltaWidth * i),
        height: Math.round(currentBounds.height + deltaHeight * i)
      });
    }
  }

  // Final position
  mainWindow.setBounds({
    x: newPosition.x,
    y: newPosition.y,
    width,
    height
  });

  islandState.currentWidth = width;
  islandState.currentHeight = height;
  islandState.position = newPosition;

  return { success: true };
});

// Get platform information
ipcMain.handle('platform:info', () => {
  return {
    platform: process.platform,
    isMac: platform.isMac,
    isWindows: platform.isWindows,
    isLinux: platform.isLinux,
    arch: process.arch,
    version: process.version,
    electronVersion: process.versions.electron,
    chromeVersion: process.versions.chrome
  };
});

// Get system theme
ipcMain.handle('theme:get', () => {
  if (platform.isMac) {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  }
  return 'dark'; // Default to dark
});

// Request permissions (camera, microphone, etc.)
ipcMain.handle('permissions:request', async (event, type) => {
  if (platform.isMac) {
    try {
      const status = await systemPreferences.askForMediaAccess(type);
      return { granted: status };
    } catch (error) {
      console.error(`Permission request failed for ${type}:`, error);
      return { granted: false, error: error.message };
    }
  }
  return { granted: true }; // Auto-grant on other platforms
});

// Toggle window draggable state
ipcMain.handle('window:setDraggable', (event, draggable) => {
  if (!mainWindow) return;
  mainWindow.setMovable(draggable);
  return { success: true };
});

// Minimize to tray (future feature)
ipcMain.handle('window:minimize', () => {
  if (!mainWindow) return;
  mainWindow.hide();
  return { success: true };
});

// Restore from tray
ipcMain.handle('window:restore', () => {
  if (!mainWindow) return;
  mainWindow.show();
  return { success: true };
});

// Quit application
ipcMain.handle('app:quit', () => {
  app.quit();
});

/**
 * App Lifecycle Events
 */

// When Electron has finished initialization
app.whenReady().then(() => {
  createWindow();

  // macOS: Re-create window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  console.log('🚀 Electron app is ready');
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (!platform.isMac) {
    app.quit();
  }
});

// Handle app before quit
app.on('before-quit', () => {
  console.log('👋 Application shutting down...');
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('⚠️  Another instance is already running');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Focus the existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// macOS: Handle dock icon clicks
if (platform.isMac) {
  app.dock?.hide(); // Hide from dock (optional)
}

// Error handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});