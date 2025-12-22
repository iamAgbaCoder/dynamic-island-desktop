// electron/renderer/app.js
// Frontend logic for Dynamic Island UI

console.log('🎨 Renderer process started');

/**
 * STATE MANAGEMENT
 */
const state = {
  isExpanded: false,
  isConnected: false,
  mediaPlaying: false,
  systemData: {
    battery: 0,
    cpu: 0,
    ram: 0,
    network: 'disconnected'
  }
};

/**
 * DOM ELEMENTS
 */
const elements = {
  island: document.getElementById('island'),
  collapsedView: document.getElementById('collapsed-view'),
  expandedView: document.getElementById('expanded-view'),
  statusText: document.getElementById('status-text'),
  batteryPercent: document.getElementById('battery-percent'),
  cpuUsage: document.getElementById('cpu-usage'),
  ramUsage: document.getElementById('ram-usage'),
  networkStatus: document.getElementById('network-status'),
  networkIndicator: document.getElementById('network-indicator'),
  mediaSection: document.getElementById('media-section'),
  songTitle: document.getElementById('song-title'),
  songArtist: document.getElementById('song-artist'),
  progressBar: document.getElementById('progress-bar'),
  playPauseBtn: document.getElementById('play-pause-btn')
};

/**
 * TOGGLE ISLAND STATE
 * Smoothly expand/collapse the island
 */
function toggleIsland() {
  state.isExpanded = !state.isExpanded;
  
  if (state.isExpanded) {
    elements.island.classList.remove('island-collapsed');
    elements.island.classList.add('island-expanded');
    elements.expandedView.classList.remove('hidden');
    
    // Add fade-in animation to expanded content
    setTimeout(() => {
      elements.expandedView.classList.add('fade-in');
    }, 50);
    
    console.log('🔼 Island expanded');
  } else {
    elements.island.classList.remove('island-expanded');
    elements.island.classList.add('island-collapsed');
    elements.expandedView.classList.add('hidden');
    elements.expandedView.classList.remove('fade-in');
    
    console.log('🔽 Island collapsed');
  }
}

/**
 * UPDATE SYSTEM DATA
 * Updates UI with fresh system information
 */
function updateSystemData(data) {
  console.log('📊 System data received:', data);
  
  // Update battery
  if (data.battery !== undefined) {
    state.systemData.battery = data.battery;
    elements.batteryPercent.textContent = Math.round(data.battery);
  }
  
  // Update CPU
  if (data.cpu !== undefined) {
    state.systemData.cpu = data.cpu;
    elements.cpuUsage.textContent = `${Math.round(data.cpu)}%`;
  }
  
  // Update RAM
  if (data.ram !== undefined) {
    state.systemData.ram = data.ram;
    elements.ramUsage.textContent = `${Math.round(data.ram)}%`;
  }
  
  // Update network status
  if (data.network) {
    state.systemData.network = data.network;
    elements.networkStatus.textContent = data.network === 'connected' 
      ? 'Connected' 
      : 'Disconnected';
    
    elements.networkIndicator.className = data.network === 'connected'
      ? 'w-2 h-2 rounded-full bg-green-500'
      : 'w-2 h-2 rounded-full bg-red-500';
  }
  
  // Update collapsed view status
  updateCollapsedStatus();
}

/**
 * UPDATE MEDIA INFORMATION
 * Shows current playing media
 */
function updateMedia(data) {
  console.log('🎵 Media data received:', data);
  
  if (data.isPlaying) {
    state.mediaPlaying = true;
    elements.mediaSection.classList.remove('hidden');
    elements.songTitle.textContent = data.title || 'Unknown Track';
    elements.songArtist.textContent = data.artist || 'Unknown Artist';
    
    // Update progress bar
    if (data.progress !== undefined) {
      elements.progressBar.style.width = `${data.progress}%`;
    }
    
    // Update play/pause icon
    elements.playPauseBtn.innerHTML = data.isPlaying
      ? '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M5 3a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM13 3a2 2 0 00-2 2v10a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2z"/></svg>'
      : '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z"/></svg>';
  } else {
    state.mediaPlaying = false;
    elements.mediaSection.classList.add('hidden');
  }
  
  updateCollapsedStatus();
}

/**
 * UPDATE COLLAPSED STATUS TEXT
 * Shows relevant info in collapsed state
 */
function updateCollapsedStatus() {
  if (state.mediaPlaying) {
    elements.statusText.textContent = '🎵 Playing';
  } else if (state.isConnected) {
    elements.statusText.textContent = `CPU ${Math.round(state.systemData.cpu)}%`;
  } else {
    elements.statusText.textContent = 'Connecting...';
  }
}

/**
 * WEBSOCKET CONNECTION TO PYTHON BACKEND
 * Establishes real-time communication with Python
 */
let ws = null;
let reconnectInterval = null;

function connectToBackend() {
  const WS_URL = 'ws://localhost:8765';
  
  console.log('🔌 Connecting to Python backend...');
  elements.statusText.textContent = 'Connecting...';
  
  try {
    ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('✅ Connected to Python backend');
      state.isConnected = true;
      elements.statusText.textContent = 'Connected';
      
      // Clear reconnection attempts
      if (reconnectInterval) {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Route data based on type
        switch (data.type) {
          case 'system':
            updateSystemData(data.data);
            break;
          case 'media':
            updateMedia(data.data);
            break;
          case 'notification':
            console.log('🔔 Notification:', data.data);
            break;
          default:
            console.log('📦 Unknown data type:', data.type);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket data:', error);
      }
    };
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      elements.statusText.textContent = 'Connection error';
    };
    
    ws.onclose = () => {
      console.log('🔌 Disconnected from Python backend');
      state.isConnected = false;
      elements.statusText.textContent = 'Disconnected';
      
      // Attempt to reconnect
      if (!reconnectInterval) {
        reconnectInterval = setInterval(() => {
          console.log('🔄 Attempting to reconnect...');
          connectToBackend();
        }, 5000); // Try every 5 seconds
      }
    };
    
  } catch (error) {
    console.error('❌ Failed to create WebSocket:', error);
    elements.statusText.textContent = 'Connection failed';
  }
}

/**
 * EVENT LISTENERS
 */

// Toggle island on click (collapsed state only)
elements.island.addEventListener('click', (e) => {
  // Only toggle if clicking on collapsed view
  if (!state.isExpanded) {
    toggleIsland();
  }
});

// Close expanded view when clicking outside (future enhancement)
document.addEventListener('click', (e) => {
  if (state.isExpanded && !elements.island.contains(e.target)) {
    toggleIsland();
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // ESC to collapse
  if (e.key === 'Escape' && state.isExpanded) {
    toggleIsland();
  }
  
  // Space to toggle
  if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    toggleIsland();
  }
});

/**
 * INITIALIZATION
 * Start the app
 */
function init() {
  console.log('🚀 Initializing Dynamic Island...');
  console.log('🖥️  Platform:', window.electron?.platform || 'unknown');
  
  // Connect to Python backend
  connectToBackend();
  
  // Set initial state
  elements.statusText.textContent = 'Initializing...';
  
  console.log('✅ Dynamic Island initialized');
}

// Start when DOM is fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}