// electron/main.js
// This is the MAIN PROCESS - the "brain" of your Electron app

const { app, BrowserWindow, screen } = require('electron');
const path = require('path');

// Keep a global reference to prevent garbage collection
let mainWindow;

/**
 * Creates the Dynamic Island window
 * This function sets up all the special window properties
 */
function createWindow() {
  // Get primary display dimensions for positioning
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Define Dynamic Island dimensions
  const ISLAND_WIDTH = 200;  // Collapsed width
  const ISLAND_HEIGHT = 40;  // Collapsed height

  mainWindow = new BrowserWindow({
    // Window dimensions
    width: ISLAND_WIDTH,
    height: ISLAND_HEIGHT,
    
    // Position at top-center of screen
    x: Math.floor((width - ISLAND_WIDTH) / 2),
    y: 10, // 10px from top
    
    // Window behavior
    frame: false,           // Remove title bar and borders
    transparent: true,      // Enable transparency
    alwaysOnTop: true,      // Always stay above other windows
    resizable: false,       // Prevent manual resizing
    skipTaskbar: true,      // Don't show in taskbar
    
    // macOS-specific: Window level
    ...(process.platform === 'darwin' && {
      vibrancy: 'hud',      // Native blur effect on macOS
      visualEffectState: 'active'
    }),
    
    // Windows-specific
    ...(process.platform === 'win32' && {
      backgroundColor: '#00000000' // Transparent background
    }),
    
    webPreferences: {
      // Security settings
      nodeIntegration: false,        // Don't expose Node.js to renderer
      contextIsolation: true,        // Isolate preload context
      
      // Enable preload script (our secure bridge)
      preload: path.join(__dirname, 'preload.js'),
      
      // Enable web APIs we need
      devTools: true  // Allow opening DevTools with F12
    }
  });

  // Load the UI
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Optional: Open DevTools for debugging
  // mainWindow.webContents.openDevTools({ mode: 'detach' });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent window from being moved (optional)
  mainWindow.setMovable(false);

  console.log('✅ Dynamic Island window created');
}

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
});

// Quit when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Log when app is ready
app.on('ready', () => {
  console.log('🚀 Electron app is ready');
  console.log(`📍 Platform: ${process.platform}`);
});