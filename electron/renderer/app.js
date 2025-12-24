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
    state: 'collapsed', // 'idle', 'collapsed', 'expanded'
    isExpanded: false,
    isAnimating: false,
    currentWidth: 680,
    currentHeight: 32,
    lastInteraction: Date.now()
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
  },
  ui: {
    navbarState: 'greeting', // 'greeting' or 'activity'
    greetingText: null,
    greetingTimeout: null
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
  batteryBtn: document.getElementById('battery-btn'),
  batteryFill: document.getElementById('battery-fill'),
  batteryPercent: document.getElementById('battery-percent'),
  weatherBtn: document.getElementById('weather-btn'),
  weatherTemp: document.getElementById('weather-temp'),
  dateDisplay: document.getElementById('date-display'),
  timeDisplay: document.getElementById('time-display'),
  liveIndicator: document.getElementById('live-indicator'),
  mediaDisco: document.getElementById('media-disco'),
  statusDot: document.getElementById('status-dot'),
  statusText: document.getElementById('status-text'),
  
  // Modal Fields
  wifiSSID: document.getElementById('wifi-ssid'),
  wifiSignal: document.getElementById('wifi-signal'),
  batteryStatus: document.getElementById('battery-status'),
  batteryChargeLarge: document.getElementById('battery-charge-large'),
  
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
  
  networkIcon: document.getElementById('network-icon'),
  networkValue: document.getElementById('network-value'),
  
  // Volume
  volumeSlider: document.getElementById('volume-slider'),
  ccBTDevice: document.getElementById('cc-bt-device')
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
  
  // Update state
  const isExpanded = state.island.isExpanded;
  elements.island.dataset.state = isExpanded ? 'expanded' : 'collapsed';
  
  if (isExpanded) captureMouse();
  else releaseMouse();

  // Close any open modals when island state changes
  document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
  
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
    await animator.fadeIn(elements.expandedView, 0.2);
    
    // 5. Stagger animate children
    const children = elements.expandedView.querySelectorAll('.expanded-header, .live-activities, .stats-grid');
    animator.stagger(children, { opacity: 1, y: 0 }, 0.04);
    
    // Update window size via IPC
    if (window.electron?.window) {
      await window.electron.window.resize(expandedWidth, expandedHeight, true);
    }
    
  } else {
    // COLLAPSE ANIMATION
    const collapsedWidth = 680;
    const collapsedHeight = 32;
    
    // 1. Fade out expanded view
    await animator.fadeOut(elements.expandedView, 0.15);
    
    // 2. Morph island size
    await animator.morphIsland(elements.island, {
      width: collapsedWidth,
      height: collapsedHeight
    }, 'snappy');
    
    // 3. Hide expanded view
    elements.expandedView.classList.add('hidden');
    
    // 4. Fade in collapsed view
    await animator.fadeIn(elements.collapsedView, 0.15);
    
    // Update window size via IPC
    if (window.electron?.window) {
      await window.electron.window.resize(collapsedWidth, collapsedHeight, true);
    }
  }
  
  state.island.isAnimating = false;
  
  // Sync window size after transition
  updateWindowSize();
}

/**
 * Automatically sync Electron window size with island dimensions
 */
function updateWindowSize() {
  if (!window.electron?.window) return;
  
  const rect = elements.island.getBoundingClientRect();
  const width = Math.ceil(rect.width);
  const height = Math.ceil(rect.height);
  
  // Don't resize if minimized
  if (width < 10) return;

  // If a modal is open, we need more height
  const openModals = Array.from(document.querySelectorAll('.modal')).filter(m => !m.classList.contains('hidden'));
  const finalHeight = openModals.length > 0 ? 450 : height + 20;

  window.electron.window.resize(width + 20, finalHeight, true);
}

// Watch for manual size changes via ResizeObserver
const islandObserver = new ResizeObserver(debounce(() => {
  if (!state.island.isAnimating) {
    updateWindowSize();
  }
}, 50));

islandObserver.observe(elements.island);

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
    if (elements.batteryPercent) elements.batteryPercent.textContent = `${Math.round(data.battery)}%`;
    if (elements.batteryChargeLarge) elements.batteryChargeLarge.textContent = `${Math.round(data.battery)}%`;
    if (elements.batteryStatus) elements.batteryStatus.textContent = data.isCharging ? 'Charging' : 'On Battery';
    
    // Update battery fill width (SVG)
    const fillWidth = (data.battery / 100) * 16; // 16 is max width
    if (elements.batteryFill) {
      elements.batteryFill.setAttribute('width', fillWidth);
    }
    
    // Update battery indicator classes
    const batteryBtn = document.getElementById('battery-btn');
    batteryBtn?.classList.toggle('charging', data.isCharging);
    batteryBtn?.classList.toggle('low', data.battery < 20);
  }
  
  // CPU
  if (data.cpu !== undefined) {
    state.system.cpu = data.cpu;
    if (elements.cpuValue) {
      elements.cpuValue.textContent = `${Math.round(data.cpu)}%`;
      elements.cpuValue.style.color = colorFromPercentage(data.cpu);
    }
  }
  
  // RAM
  if (data.ram !== undefined) {
    state.system.ram = data.ram;
    if (elements.ramValue) {
      elements.ramValue.textContent = `${Math.round(data.ram)}%`;
      elements.ramValue.style.color = colorFromPercentage(data.ram);
    }
  }
  
  // Network / WiFi
  if (data.network) {
    const isConnected = data.network === 'connected' || (typeof data.network === 'object' && data.network.connected);
    state.system.network.status = isConnected ? 'connected' : 'disconnected';
    
    // Update WiFi modal fields
    if (elements.wifiSSID) elements.wifiSSID.textContent = isConnected ? 'Dynamic_WiFi' : 'Disconnected';
    if (elements.wifiSignal) elements.wifiSignal.textContent = isConnected ? '98%' : '--';

    // Update WiFi indicator in collapsed view
    if (elements.wifiBtn) {
      elements.wifiBtn.classList.toggle('disconnected', !isConnected);
    }
    
    // Update network status in expanded view
    if (elements.networkValue) elements.networkValue.textContent = isConnected ? 'Connected' : 'Offline';
  }
  
  updateCollapsedStatus();
}

/**
 * Update collapsed view status text and indicators
 */
function updateCollapsedStatus() {
  const { media, timer, bluetooth } = state.liveActivities;
  const { isConnected } = state.connection;
  const isMusicPlaying = media.isActive && media.isPlaying;
  
  // Update Visual Indicators
  if (elements.mediaDisco) {
    elements.mediaDisco.classList.toggle('hidden', !isMusicPlaying);
  }
  
  if (elements.statusDot) {
    elements.statusDot.classList.toggle('disconnected', !isConnected);
  }

  // Update Status Text
  if (elements.statusText) {
    if (isMusicPlaying) {
      // Show Music Info - Faster reveal
      elements.island.dataset.state = 'music';
      if (media.title && media.title !== 'Now Playing' && media.title !== 'System Audio' && media.title !== 'Playing') {
        elements.statusText.textContent = `${media.title} • ${media.artist}`;
      } else {
        elements.statusText.textContent = 'Now Playing';
      }
      elements.statusText.style.color = '#ffffff';
      state.ui.navbarState = 'activity';
    } else {
      // Show Greeting only if no music
      if (!state.ui.greetingText) {
        state.ui.greetingText = getGreeting();
      }
      elements.statusText.textContent = state.ui.greetingText;
      elements.statusText.style.color = 'rgba(255,255,255,0.85)';
      state.ui.navbarState = 'greeting';
      
      // If we were in music state, go back to collapsed or idle
      if (elements.island.dataset.state === 'music') {
        elements.island.dataset.state = 'collapsed';
      }
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
  const media = state.liveActivities.media;
  
  if (media.isActive) {
    elements.mediaActivity.classList.remove('hidden');
    elements.mediaTitle.textContent = media.title || 'No media playing';
    elements.mediaArtist.textContent = media.artist || '--';
    
    // Log currently playing music
    if (media.isPlaying && state.liveActivities.media.title !== media.title) {
      log.info(`🎵 Now Playing: ${media.title} by ${media.artist}`);
    }

    // Update artwork
    if (elements.mediaArtworkImg) {
      if (media.artworkUrl) {
        elements.mediaArtworkImg.src = media.artworkUrl;
        elements.mediaArtworkImg.classList.add('loaded');
      } else {
        elements.mediaArtworkImg.src = '';
        elements.mediaArtworkImg.classList.remove('loaded');
      }
    }
    
    // Update progress
    if (media.duration > 0) {
      const progressPercent = (media.progress / media.duration) * 100;
      elements.mediaProgressFill.style.width = `${progressPercent}%`;
      elements.mediaCurrentTime.textContent = formatTime(media.progress);
      elements.mediaDuration.textContent = formatTime(media.duration);
    }
    
    // Update play/pause icon
    elements.mediaPlayPause.innerHTML = media.isPlaying
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    
  } else {
    elements.mediaActivity.classList.add('hidden');
    elements.mediaTitle.textContent = 'No media playing';
    elements.mediaArtist.textContent = '--';
  }
  
  updateCollapsedStatus();
}

/**
 * Update timer activity
 */
function updateTimerActivity(data) {
  state.liveActivities.timer = { ...state.liveActivities.timer, ...data };
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
    
    if (elements.ccBTDevice) {
      elements.ccBTDevice.textContent = deviceName;
    }
  } else {
    elements.bluetoothActivity.classList.add('hidden');
    if (elements.ccBTDevice) {
      elements.ccBTDevice.textContent = 'None';
    }
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
  
  // Pulse island for feedback
  animator.pulse(elements.island, 1.05, 0.4);

  // Add to modal list
  const list = document.getElementById('notification-list');
  if (list) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.innerHTML = `
      <div class="notification-icon">🔔</div>
      <div class="notification-content">
        <div class="notification-title">${data.title}</div>
        <div class="notification-body">${data.body || ''}</div>
      </div>
    `;
    list.prepend(item);
  }
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

  if (elements.statusText) {
    elements.statusText.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!state.island.isExpanded) toggleIsland();
    });
  }

  // Modal Buttons
  if (elements.controlPanelBtn) {
    elements.controlPanelBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModal('control-center-modal');
    });
  }
  
  if (elements.wifiBtn) {
    elements.wifiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModal('wifi-modal');
    });
  }

  if (elements.bluetoothBtn) {
    elements.bluetoothBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModal('bluetooth-modal');
    });
  }

  if (elements.batteryBtn) {
    elements.batteryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleModal('battery-modal');
    });
  }

  if (elements.weatherBtn) {
    elements.weatherBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      log.info('Weather clicked');
      updateWeather();
    });
  }

  // Volume Slider
  if (elements.volumeSlider) {
    elements.volumeSlider.addEventListener('input', (e) => {
      const volume = e.target.value;
      sendCommand('system_control', 'volume', { value: volume });
    });
  }

  // Notification Icon
  const notifBtn = document.getElementById('notification-btn');
  notifBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleModal('notification-modal');
  });

  // Mouse Interactivity Helpers
  const captureArea = (el) => {
    el.addEventListener('mouseenter', captureMouse);
    el.addEventListener('mouseleave', () => {
      if (!state.island.isExpanded) releaseMouse();
    });
  };

  // Capture mouse for all interactive elements
  const overlays = document.getElementById('component-overlays');
  if (overlays) {
    overlays.addEventListener('mouseenter', captureMouse);
    overlays.addEventListener('mouseleave', () => {
      if (!state.island.isExpanded) releaseMouse();
    });
  }

  elements.island.addEventListener('mouseenter', () => {
    state.island.lastInteraction = Date.now();
    if (elements.island.dataset.state === 'idle') {
      elements.island.dataset.state = 'collapsed';
    }
    captureMouse();
  });

  elements.island.addEventListener('mouseleave', () => {
    if (!state.island.isExpanded) {
      releaseMouse();
    }
  });

  // Idle check
  setInterval(() => {
    if (!state.island.isExpanded && 
        Date.now() - state.island.lastInteraction > 5000 && 
        elements.island.dataset.state === 'collapsed') {
      elements.island.dataset.state = 'idle';
    }
  }, 1000);
}

/**
 * Capture mouse events in Electron
 */
function captureMouse() {
  window.electron?.window.setIgnoreMouseEvents(false);
}

/**
 * Release mouse events in Electron accurately
 */
function releaseMouse() {
  // Only release if no modals are open
  const openModals = Array.from(document.querySelectorAll('.modal')).filter(m => !m.classList.contains('hidden'));
  if (openModals.length === 0) {
    window.electron?.window.setIgnoreMouseEvents(true, { forward: true });
  }
}

/**
 * Toggle a modal visibility with sleek transition
 */
async function toggleModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  
  // If island is expanded, collapse it first then show modal
  if (state.island.isExpanded) {
    await toggleIsland();
  }
  
  const isCurrentlyHidden = modal.classList.contains('hidden');
  
  // Close all other modals immediately
  document.querySelectorAll('.modal').forEach(m => {
    if (m.id !== id) {
      m.classList.add('hidden');
      gsap.killTweensOf(m);
    }
  });
  
  if (isCurrentlyHidden) {
    modal.classList.remove('hidden');
    hapticFeedback(elements.island, 'light');
    captureMouse(); // Capture on modal open
    
    // Expand window to fit modal
    updateWindowSize(); 
    
    gsap.fromTo(modal, 
      { opacity: 0, scale: 0.9, y: 10, transformPerspective: 1000, rotationX: -10 }, 
      { opacity: 1, scale: 1, y: 0, rotationX: 0, duration: 0.4, ease: 'power4.out' }
    );
  } else {
    gsap.to(modal, { 
      opacity: 0, scale: 0.9, y: 10, duration: 0.2, ease: 'power2.in',
      onComplete: () => {
        modal.classList.add('hidden');
        releaseMouse(); // Release on modal close
        updateWindowSize(); // Shrink window back
      }
    });
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
  
  // Start clock and weather
  startClock();
  updateWeather();
  setInterval(updateWeather, 600000); // Update every 10 mins
  
  // Setup event listeners
  setupEventListeners();
  
  // Connect to backend
  connectToBackend();
  
  // Initial animation
  animator.fadeIn(elements.island, 0.6);
  
  log.success('Dynamic Island initialized');
}

/**
 * Update Weather Data
 */
async function updateWeather() {
  // Mock weather update - could integrate OpenWeatherMap here
  const temps = ['22°', '24°', '19°', '21°'];
  const randomTemp = temps[Math.floor(Math.random() * temps.length)];
  if (elements.weatherTemp) {
    elements.weatherTemp.textContent = randomTemp;
  }
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}