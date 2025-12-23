// electron/renderer/lib/store.js
// Lightweight state management using Zustand

import { create } from 'zustand';

/**
 * MAIN APPLICATION STORE
 * Centralized state management for the Dynamic Island
 */
export const useStore = create((set, get) => ({
  // ========================================
  // ISLAND STATE
  // ========================================
  island: {
    isExpanded: false,
    currentWidth: 200,
    currentHeight: 40,
    isAnimating: false
  },

  // ========================================
  // CONNECTION STATE
  // ========================================
  connection: {
    isConnected: false,
    reconnectAttempts: 0,
    lastConnected: null
  },

  // ========================================
  // SYSTEM DATA
  // ========================================
  system: {
    battery: {
      percent: 0,
      isCharging: false,
      timeRemaining: null
    },
    cpu: 0,
    ram: 0,
    network: {
      status: 'disconnected',
      type: null // wifi, ethernet, cellular
    },
    platform: {
      os: null,
      isMac: false,
      isWindows: false,
      isLinux: false
    }
  },

  // ========================================
  // LIVE ACTIVITIES
  // ========================================
  liveActivities: {
    media: {
      isActive: false,
      isPlaying: false,
      title: '',
      artist: '',
      album: '',
      progress: 0,
      duration: 0,
      artworkUrl: null
    },
    timer: {
      isActive: false,
      remaining: 0,
      total: 0
    },
    bluetooth: {
      isActive: false,
      deviceName: '',
      batteryLeft: null,
      batteryRight: null
    },
    download: {
      isActive: false,
      filename: '',
      progress: 0,
      speed: 0
    }
  },

  // ========================================
  // NOTIFICATIONS
  // ========================================
  notifications: [],

  // ========================================
  // WIDGETS
  // ========================================
  widgets: {
    calendar: {
      events: [],
      nextEvent: null
    },
    weather: {
      temperature: null,
      condition: '',
      location: '',
      forecast: []
    },
    reminders: []
  },

  // ========================================
  // SETTINGS
  // ========================================
  settings: {
    theme: 'dark',
    size: 'medium', // small, medium, large
    enableAnimations: true,
    enableHaptics: true,
    autoHide: false,
    autoHideDelay: 5000
  },

  // ========================================
  // ACTIONS
  // ========================================

  // Island actions
  setIslandExpanded: (isExpanded) =>
    set((state) => ({
      island: { ...state.island, isExpanded }
    })),

  setIslandSize: (width, height) =>
    set((state) => ({
      island: { ...state.island, currentWidth: width, currentHeight: height }
    })),

  setIslandAnimating: (isAnimating) =>
    set((state) => ({
      island: { ...state.island, isAnimating }
    })),

  // Connection actions
  setConnected: (isConnected) =>
    set((state) => ({
      connection: {
        ...state.connection,
        isConnected,
        lastConnected: isConnected ? new Date() : state.connection.lastConnected,
        reconnectAttempts: isConnected ? 0 : state.connection.reconnectAttempts
      }
    })),

  incrementReconnectAttempts: () =>
    set((state) => ({
      connection: {
        ...state.connection,
        reconnectAttempts: state.connection.reconnectAttempts + 1
      }
    })),

  // System actions
  updateSystemData: (data) =>
    set((state) => ({
      system: {
        ...state.system,
        ...data
      }
    })),

  updateBattery: (batteryData) =>
    set((state) => ({
      system: {
        ...state.system,
        battery: { ...state.system.battery, ...batteryData }
      }
    })),

  updateNetwork: (networkData) =>
    set((state) => ({
      system: {
        ...state.system,
        network: { ...state.system.network, ...networkData }
      }
    })),

  setPlatform: (platformData) =>
    set((state) => ({
      system: {
        ...state.system,
        platform: { ...state.system.platform, ...platformData }
      }
    })),

  // Live Activity actions
  updateMediaActivity: (mediaData) =>
    set((state) => ({
      liveActivities: {
        ...state.liveActivities,
        media: { ...state.liveActivities.media, ...mediaData }
      }
    })),

  updateTimerActivity: (timerData) =>
    set((state) => ({
      liveActivities: {
        ...state.liveActivities,
        timer: { ...state.liveActivities.timer, ...timerData }
      }
    })),

  updateBluetoothActivity: (bluetoothData) =>
    set((state) => ({
      liveActivities: {
        ...state.liveActivities,
        bluetooth: { ...state.liveActivities.bluetooth, ...bluetoothData }
      }
    })),

  updateDownloadActivity: (downloadData) =>
    set((state) => ({
      liveActivities: {
        ...state.liveActivities,
        download: { ...state.liveActivities.download, ...downloadData }
      }
    })),

  // Notification actions
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        {
          id: Date.now(),
          timestamp: new Date(),
          ...notification
        }
      ]
    })),

  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    })),

  clearNotifications: () =>
    set({ notifications: [] }),

  // Widget actions
  updateCalendar: (calendarData) =>
    set((state) => ({
      widgets: {
        ...state.widgets,
        calendar: { ...state.widgets.calendar, ...calendarData }
      }
    })),

  updateWeather: (weatherData) =>
    set((state) => ({
      widgets: {
        ...state.widgets,
        weather: { ...state.widgets.weather, ...weatherData }
      }
    })),

  updateReminders: (reminders) =>
    set((state) => ({
      widgets: {
        ...state.widgets,
        reminders
      }
    })),

  // Settings actions
  updateSettings: (settings) =>
    set((state) => ({
      settings: { ...state.settings, ...settings }
    })),

  // Utility: Get active live activity
  getActiveLiveActivity: () => {
    const state = get();
    const { media, timer, bluetooth, download } = state.liveActivities;

    // Priority order: media > timer > bluetooth > download
    if (media.isActive) return { type: 'media', data: media };
    if (timer.isActive) return { type: 'timer', data: timer };
    if (bluetooth.isActive) return { type: 'bluetooth', data: bluetooth };
    if (download.isActive) return { type: 'download', data: download };

    return null;
  }
}));

// Export selectors for optimized re-renders
export const selectIslandState = (state) => state.island;
export const selectConnectionState = (state) => state.connection;
export const selectSystemData = (state) => state.system;
export const selectLiveActivities = (state) => state.liveActivities;
export const selectNotifications = (state) => state.notifications;
export const selectWidgets = (state) => state.widgets;
export const selectSettings = (state) => state.settings;
