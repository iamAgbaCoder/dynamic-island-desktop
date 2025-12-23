// electron/renderer/app.js
// Main application logic with Apple-level polish

import { animator, SpringPresets, hapticFeedback } from './lib/animations.js';
import { 
  formatTime, 
  formatBattery, 
  getPlatformIcon, 
  getGreeting,
  debounce,
  log 
} from './lib/utils.js';

/* ═══════════════════════════════════════════════════════════
   APPLICATION STATE
   ═══════════════════════════════════════════════════════════ */
const state = {
  island: {
    isExpanded: false,
    isAnimating: false,
    currentWidth: 680,
    currentHeight: 32
  },
  connection: {
    isConnected: false,
    ws: null,
    reconnectAttempts: 0,
    reconnectInterval: null
  },
  system: {
    battery: { percent: 0, isCharging: false },
    cpu: 0,
    ram: 0,
    network: { status: 'disconnected', type: 'wifi' },
    platform: {}
  },
  liveActivities: {
    media: {
      isActive: false,
      isPlaying: false,
      title: '',
      artist: '',
      progress: 0,
      duration: 0
    },
    timer: { isActive: false, remaining: 0 },
    bluetooth: { isActive: false, deviceName: '', battery: null }
  }
};

/* ═══════════════════════════════════════════════════════════
   DOM ELEMENTS
   ═══════════════════════════════════════════════════════════ */
const elements = {
  // Island
  island: document.getElementById('island'),
  collapsedView: document.getElementById('collapsed-view'),
  expandedView: document.getElementById('expanded-view'),
  
  // Collapsed view - Navbar icons
  activeAppName: document.getElementById('active-app-name'),
  controlPanelBtn: document.getElementById('control-panel-btn'),
  wifiBtn: document.getElementById('wifi-btn'),
  bluetoothBtn: document.getElementById('bluetooth-btn'),
  batteryIndicator: document.getElementById('battery-indicator'),
  batteryFill: document.getElementById('battery-fill'),
  batteryPercent: document.getElementById('battery-percent'),
  dateDisplay: document.getElementById('date-display'),
  timeDisplay: document.getElementById('time-display'),
  liveIndicator: document.getElementById('live-indicator'),
  mediaWave: document.getElementById('media-wave'),
  statusText: document.getElementById('status-text'),
  
  // Expanded view
  greetingText: document.getElementById('greeting-text'),
  settingsBtn: document.getElementById('settings-btn'),
  closeBtn: document.getElementById('close-btn'),
  
  // Live Activities
  mediaActivity: document.getElementById('media-activity'),
  mediaTitle: document.getElementById('media-title'),
  mediaArtist: document.getElementById('media-artist'),
  mediaArtworkImg: document.getElementById('media-artwork-img'),
  mediaPlayPause: document.getElementById('media-play-pause'),
  mediaPrev: document.getElementById('media-prev'),
  mediaNext: document.getElementById('media-next'),
  mediaProgressFill: document.getElementById('media-progress-fill'),
  mediaCurrentTime: document.getElementById('media-current-time'),
  mediaDuration: document.getElementById('media-duration'),
  
  timerActivity: document.getElementById('timer-activity'),
  timerText: document.getElementById('timer-text'),
  timerProgress: document.getElementById('timer-progress'),
  
  bluetoothActivity: document.getElementById('bluetooth-activity'),
  bluetoothName: document.getElementById('bluetooth-name'),
  bluetoothBatteryLeft: document.getElementById('bluetooth-battery-left'),
  bluetoothBatteryRight: document.getElementById('bluetooth-battery-right'),
  
  // System stats
  cpuValue: document.getElementById('cpu-value'),
  ramValue: document.getElementById('ram-value'),
  networkIcon: document.getElementById('network-icon'),
  networkValue: document.getElementById('network-value')
};

/* ═══════════════════════════════════════════════════════════
   ISLAND ANIMATIONS
   ═══════════════════════════════════════════════════════════ */

/**
 * Toggle island between collapsed and expanded states
 */
async function toggleIsland() {
  if (state.island.isAnimating) return;
  
  state.island.isAnimating = true;
  state.island.isExpanded = !state.island.isExpanded;
  
  const isExpanded = state.island.isExpanded;
  
  log.info(`Island ${isExpanded ? 'expanding' : 'collapsing'}...`);
  
  // Update data attribute for CSS
  elements.island.dataset.state = isExpanded ? 'expanded' : 'collapsed';
  
  if (isExpanded) {
    // EXPAND ANIMATION
    const expandedWidth = 400;
    const expandedHeight = 380;
    
    // 1. Show expanded view immediately (opacity 0)
    elements.expandedView.classList.remove('hidden');
    elements.expandedView.style.opacity = '0';
    
    // 2. Morph island size
    await animator.morphIsland(elements.island, {
      width: expandedWidth,
      height: expandedHeight
    }, 'bouncy');
    
    // 3. Fade out collapsed view
    await animator.fadeOut(elements.collapsedView, 0.2);
    
    // 4. Fade in expanded view
    await animator.fadeIn(elements.expandedView, 0.3);
    
    // 5. Stagger animate children
    const children = elements.expandedView.querySelectorAll('.expanded-header, .live-activities, .stats-grid');
    animator.stagger(children, { opacity: 1, y: 0 }, 0.05);
    
    // Update window size via IPC
    if (window.electron?.window) {
      await window.electron.window.resize(expandedWidth, expandedHeight, true);
    }
    
  } else {
    // COLLAPSE ANIMATION
    const collapsedWidth = 680;
    const collapsedHeight = 32;
    
    // 1. Fade out expanded view
    await animator.fadeOut(elements.expandedView, 0.2);
    
    // 2. Morph island size
    await animator.morphIsland(elements.island, {
      width: collapsedWidth,
      height: collapsedHeight
    }, 'snappy');
    
    // 3. Hide expanded view
    elements.expandedView.classList.add('hidden');
    
    // 4. Fade in collapsed view
    await animator.fadeIn(elements.collapsedView, 0.2);
    
    // Update window size via IPC
    if (window.electron?.window) {
      await window.electron.window.resize(collapsedWidth, collapsedHeight, true);
    }
  }
  
  state.island.isAnimating = false;
  log.success(`Island ${isExpanded ? 'expanded' : 'collapsed'}`);
}

/* ═══════════════════════════════════════════════════════════
   SYSTEM DATA UPDATES
   ═══════════════════════════════════════════════════════════ */

/**
 * Update system information
 */
function updateSystemData(data) {
  // Battery
  if (data.battery !== undefined) {
    state.system.battery.percent = data.battery;
    state.system.battery.isCharging = data.isCharging || false;
    
    // Update battery percentage
    elements.batteryPercent.textContent = `${Math.round(data.battery)}%`;
    
    // Update battery fill width (SVG)
    const fillWidth = (data.battery / 100) * 16; // 16 is max width
    if (elements.batteryFill) {
      elements.batteryFill.setAttribute('width', fillWidth);
    }
    
    // Update battery indicator classes
    elements.batteryIndicator.classList.toggle('charging', data.isCharging);
    elements.batteryIndicator.classList.toggle('low', data.battery < 20);
  }
  
  // CPU
  if (data.cpu !== undefined) {
    state.system.cpu = data.cpu;
    elements.cpuValue.textContent = `${Math.round(data.cpu)}%`;
    elements.cpuValue.style.color = colorFromPercentage(data.cpu);
  }
  
  // RAM
  if (data.ram !== undefined) {
    state.system.ram = data.ram;
    elements.ramValue.textContent = `${Math.round(data.ram)}%`;
    elements.ramValue.style.color = colorFromPercentage(data.ram);
  }
  
  // Network / WiFi
  if (data.network) {
    state.system.network.status = data.network;
    const isConnected = data.network === 'connected';
    
    // Update WiFi indicator in collapsed view
    if (elements.wifiIndicator) {
      elements.wifiIndicator.classList.toggle('disconnected', !isConnected);
      elements.wifiIndicator.classList.remove('weak');
    }
    
    // Update network status in expanded view
    elements.networkValue.textContent = isConnected ? 'Connected' : 'Offline';
    elements.networkIcon.innerHTML = isConnected 
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path><path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path><path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path><path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path><path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>';
  }
  
  updateCollapsedStatus();
}

/**
 * Update collapsed view status text and indicators
 */
function updateCollapsedStatus() {
  const { media, timer, bluetooth } = state.liveActivities;
  const isMusicPlaying = media.isActive && media.isPlaying;
  
  // Update Media Wave
  if (elements.mediaWave) {
    elements.mediaWave.style.display = isMusicPlaying ? 'flex' : 'none';
  }

  // Update Status Text
  if (elements.statusText) {
    if (isMusicPlaying) {
      elements.statusText.textContent = `${media.title} • ${media.artist}`;
      elements.statusText.classList.remove('hidden');
    } else if (timer.isActive) {
      elements.statusText.textContent = `Timer: ${formatTime(timer.remaining)}`;
      elements.statusText.classList.remove('hidden');
    } else {
      elements.statusText.classList.add('hidden');
    }
  }
}

/**
 * Color based on percentage
 */
function colorFromPercentage(percent) {
  if (percent <= 20) return '#10b981'; // Green (low usage)
  if (percent <= 50) return '#eab308'; // Yellow
  if (percent <= 75) return '#f59e0b'; // Orange
  return '#ef4444'; // Red (high usage)
}

/* ═══════════════════════════════════════════════════════════
   LIVE ACTIVITIES
   ═══════════════════════════════════════════════════════════ */

/**
 * Update media player activity
 */
function updateMediaActivity(data) {
  state.liveActivities.media = { ...state.liveActivities.media, ...data };
  
  const { isActive, isPlaying, title, artist, progress, duration } = state.liveActivities.media;
  
  if (isActive) {
    elements.mediaActivity.classList.remove('hidden');
    elements.mediaTitle.textContent = title || 'Unknown Track';
    elements.mediaArtist.textContent = artist || 'Unknown Artist';
    
    // Update artwork
    if (elements.mediaArtworkImg) {
      if (data.artworkUrl) {
        elements.mediaArtworkImg.src = data.artworkUrl;
        elements.mediaArtworkImg.classList.add('loaded');
      } else {
        elements.mediaArtworkImg.classList.remove('loaded');
      }
    }
    
    // Update progress
    if (duration > 0) {
      const progressPercent = (progress / duration) * 100;
      elements.mediaProgressFill.style.width = `${progressPercent}%`;
      elements.mediaCurrentTime.textContent = formatTime(progress);
      elements.mediaDuration.textContent = formatTime(duration);
    }
    
    // Update play/pause icon
    elements.mediaPlayPause.innerHTML = isPlaying
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    
  } else {
    elements.mediaActivity.classList.add('hidden');
  }
  
  updateCollapsedStatus();
}

/**
 * Update timer activity
 */
function updateTimerActivity(data) {
  state.liveActivities.timer = { ...state.liveActivities.timer, ...data };
  
  const { isActive, remaining, total } = state.liveActivities.timer;
  
  if (isActive) {
    elements.timerActivity.classList.remove('hidden');
    elements.timerText.textContent = formatTime(remaining);
    
    // Update circular progress
    const circumference = 2 * Math.PI * 45; // radius = 45
    const progress = (remaining / total) * circumference;
    elements.timerProgress.style.strokeDashoffset = circumference - progress;
    
  } else {
    elements.timerActivity.classList.add('hidden');
  }
  
  updateCollapsedStatus();
}

/**
 * Update bluetooth activity
 */
function updateBluetoothActivity(data) {
  state.liveActivities.bluetooth = { ...state.liveActivities.bluetooth, ...data };
  
  const { isActive, deviceName, batteryLeft, batteryRight } = state.liveActivities.bluetooth;
  
  if (isActive) {
    elements.bluetoothActivity.classList.remove('hidden');
    elements.bluetoothName.textContent = deviceName;
    elements.bluetoothBatteryLeft.textContent = batteryLeft !== null ? batteryLeft : '--';
    elements.bluetoothBatteryRight.textContent = batteryRight !== null ? batteryRight : '--';
  } else {
    elements.bluetoothActivity.classList.add('hidden');
  }
  
  updateCollapsedStatus();
}

/* ═══════════════════════════════════════════════════════════
   WEBSOCKET CONNECTION
   ═══════════════════════════════════════════════════════════ */

/**
 * Connect to Python backend via WebSocket
 */
function connectToBackend() {
  const WS_URL = 'ws://localhost:8765';
  
  log.info('Connecting to backend...');
  elements.statusText.textContent = 'Connecting...';
  
  try {
    state.connection.ws = new WebSocket(WS_URL);
    
    state.connection.ws.onopen = () => {
      log.success('Connected to backend');
      state.connection.isConnected = true;
      state.connection.reconnectAttempts = 0;
      elements.statusText.textContent = 'Connected';
      
      // Clear reconnect interval
      if (state.connection.reconnectInterval) {
        clearInterval(state.connection.reconnectInterval);
        state.connection.reconnectInterval = null;
      }
      
      // Pulse animation on connection
      animator.pulse(elements.island, 1.02, 0.4);
    };
    
    state.connection.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleBackendMessage(message);
      } catch (error) {
        log.error('Failed to parse message:', error);
      }
    };
    
    state.connection.ws.onerror = (error) => {
      log.error('WebSocket error:', error);
    };
    
    state.connection.ws.onclose = () => {
      log.warning('Disconnected from backend');
      state.connection.isConnected = false;
      elements.statusText.textContent = 'Disconnected';
      
      // Attempt reconnection
      if (!state.connection.reconnectInterval) {
        state.connection.reconnectInterval = setInterval(() => {
          state.connection.reconnectAttempts++;
          log.info(`Reconnecting... (attempt ${state.connection.reconnectAttempts})`);
          connectToBackend();
        }, 5000);
      }
    };
    
  } catch (error) {
    log.error('Failed to create WebSocket:', error);
  }
}

/**
 * Handle messages from backend
 */
function handleBackendMessage(message) {
  const { type, data } = message;
  
  switch (type) {
    case 'system':
      updateSystemData(data);
      break;
      
    case 'media':
      updateMediaActivity(data);
      break;
      
    case 'timer':
      updateTimerActivity(data);
      break;
      
    case 'bluetooth':
      updateBluetoothActivity(data);
      break;
      
    case 'notification':
      handleNotification(data);
      break;
      
    case 'window':
      handleWindowUpdate(data);
      break;
      
    default:
      log.debug('Unknown message type:', type);
  }
}

/**
 * Handle notification (future feature)
 */
function handleNotification(data) {
  log.info('Notification received:', data);
  // TODO: Implement notification UI
}

/**
 * Handle window update (active app name)
 */
/**
 * Handle window update (active app name)
 */
function handleWindowUpdate(data) {
  if (!data || !data.title) return;
  
  // Try to simplify app name (e.g. "Visual Studio Code" from a long title)
  let appName = data.title;
  if (data.path) {
    const parts = data.path.split(/[\\/]/);
    const exeName = parts[parts.length - 1].replace(/.exe$/i, '');
    appName = exeName.charAt(0).toUpperCase() + exeName.slice(1);
    
    // Map common names
    const commonNames = {
      'Code': 'Visual Studio Code',
      'Chrome': 'Google Chrome',
      'Spotify': 'Spotify',
      'Explorer': 'File Explorer',
      'Taskmgr': 'Task Manager'
    };
    if (commonNames[appName]) appName = commonNames[appName];
  }
  
  if (elements.activeAppName) {
    elements.activeAppName.textContent = appName;
  }
}

/**
 * Send command to backend
 */
function sendCommand(type, action, data = {}) {
  if (state.connection.ws && state.connection.isConnected) {
    state.connection.ws.send(JSON.stringify({
      type,
      action,
      ...data
    }));
  }
}

/* ═══════════════════════════════════════════════════════════
   EVENT LISTENERS
   ═══════════════════════════════════════════════════════════ */

/**
 * Setup all event listeners
 */
function setupEventListeners() {
  // Island click (toggle expand/collapse)
  elements.island.addEventListener('click', (e) => {
    if (!state.island.isExpanded && !state.island.isAnimating) {
      hapticFeedback(elements.island, 'light');
      toggleIsland();
    }
  });
  
  // Close button
  elements.closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    hapticFeedback(elements.closeBtn, 'medium');
    toggleIsland();
  });
  
  // Settings button
  elements.settingsBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    hapticFeedback(elements.settingsBtn, 'medium');
    log.info('Settings clicked (not implemented yet)');
  });
  
  // Media controls
  elements.mediaPlayPause?.addEventListener('click', (e) => {
    e.stopPropagation();
    hapticFeedback(elements.mediaPlayPause, 'medium');
    sendCommand('media_control', 'toggle');
  });

  elements.mediaPrev?.addEventListener('click', (e) => {
    e.stopPropagation();
    hapticFeedback(elements.mediaPrev, 'light');
    sendCommand('media_control', 'previous');
  });

  elements.mediaNext?.addEventListener('click', (e) => {
    e.stopPropagation();
    hapticFeedback(elements.mediaNext, 'light');
    sendCommand('media_control', 'next');
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // ESC to collapse
    if (e.key === 'Escape' && state.island.isExpanded) {
      toggleIsland();
    }
    
    // Space to toggle
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      toggleIsland();
    }
    
    // Cmd/Ctrl + Q to quit
    if ((e.metaKey || e.ctrlKey) && e.key === 'q') {
      e.preventDefault();
      window.electron?.app.quit();
    }
  });
  
  // Click outside to collapse (when expanded)
  document.addEventListener('click', (e) => {
    if (state.island.isExpanded && !elements.island.contains(e.target)) {
      toggleIsland();
    }
    
    // Close modals when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      if (!modal.classList.contains('hidden') && !modal.contains(e.target) && !e.target.closest('.status-icon')) {
        modal.classList.add('hidden');
      }
    });
  });

  // Modal Buttons
  if (elements.controlPanelBtn) {
    elements.controlPanelBtn.addEventListener('click', (e) => {
      toggleModal('control-center-modal');
    });
  }
  
  if (elements.wifiBtn) {
    elements.wifiBtn.addEventListener('click', (e) => {
      toggleModal('wifi-modal');
    });
  }

  if (elements.bluetoothBtn) {
    elements.bluetoothBtn.addEventListener('click', (e) => {
      toggleModal('bluetooth-modal');
    });
  }
}

/**
 * Toggle a modal visibility
 */
function toggleModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  
  const isHidden = modal.classList.contains('hidden');
  
  // Close other modals
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  
  if (isHidden) {
    modal.classList.remove('hidden');
    animator.fadeIn(modal, 0.2);
  } else {
    modal.classList.add('hidden');
  }
}

/* ═══════════════════════════════════════════════════════════
   CLOCK UPDATE
   ═══════════════════════════════════════════════════════════ */

/**
 * Update the clock display
 */
function updateClock() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  
  // Format time as HH:MM
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  if (elements.timeDisplay) {
    elements.timeDisplay.textContent = timeString;
  }
  
  // Update date: "Tue 23 Dec"
  if (elements.dateDisplay) {
    const options = { weekday: 'short', day: 'numeric', month: 'short' };
    elements.dateDisplay.textContent = now.toLocaleDateString('en-US', options);
  }
}

/**
 * Start the clock update interval
 */
function startClock() {
  // Update immediately
  updateClock();
  
  // Update every second
  setInterval(updateClock, 1000);
}

/* ═══════════════════════════════════════════════════════════
   INITIALIZATION
   ═══════════════════════════════════════════════════════════ */

/**
 * Initialize the application
 */
async function init() {
  log.info('Initializing Dynamic Island...');
  
  // Get platform information
  if (window.electron?.platform) {
    const platformInfo = await window.electron.platform.getInfo();
    state.system.platform = platformInfo;
    log.info(`Platform: ${platformInfo.platform}`);
  }
  
  // Set greeting
  elements.greetingText.textContent = getGreeting();
  
  // Start clock
  startClock();
  
  // Setup event listeners
  setupEventListeners();
  
  // Connect to backend
  connectToBackend();
  
  // Initial animation
  animator.fadeIn(elements.island, 0.6);
  
  log.success('Dynamic Island initialized');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}