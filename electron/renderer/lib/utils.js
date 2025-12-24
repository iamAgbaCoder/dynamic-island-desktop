// electron/renderer/lib/utils.js
// Utility functions for the Dynamic Island

/**
 * FORMAT TIME
 * Converts seconds to MM:SS format
 */
export function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * FORMAT BATTERY
 * Returns battery percentage with appropriate icon
 */
export function formatBattery(percent, isCharging = false) {
  const level = Math.round(percent);
  
  if (isCharging) {
    return { level, icon: '⚡', color: '#10b981' }; // Green
  }
  
  if (level <= 20) {
    return { level, icon: '🪫', color: '#ef4444' }; // Red
  }
  
  if (level <= 50) {
    return { level, icon: '🔋', color: '#f59e0b' }; // Orange
  }
  
  return { level, icon: '🔋', color: '#10b981' }; // Green
}

/**
 * DEBOUNCE
 * Limits function execution frequency
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * THROTTLE
 * Ensures function executes at most once per interval
 */
export function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * CLAMP
 * Restricts a number to a range
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * LERP (Linear Interpolation)
 * Smoothly interpolate between two values
 */
export function lerp(start, end, factor) {
  return start + (end - start) * factor;
}

/**
 * GET PLATFORM ICON
 * Returns appropriate OS icon
 */
export function getPlatformIcon(platform) {
  const icons = {
    darwin: '🍎', // macOS
    win32: '🪟',  // Windows
    linux: '🐧'   // Linux
  };
  return icons[platform] || '💻';
}

/**
 * GET NETWORK ICON
 * Returns network status icon
 */
export function getNetworkIcon(status, type = 'wifi') {
  if (status === 'disconnected') return '📡';
  
  const icons = {
    wifi: '📶',
    ethernet: '🔌',
    cellular: '📱'
  };
  
  return icons[type] || '🌐';
}

/**
 * TRUNCATE TEXT
 * Truncates text with ellipsis
 */
export function truncate(text, maxLength = 30) {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * FORMAT BYTES
 * Converts bytes to human-readable format
 */
export function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * FORMAT SPEED
 * Converts bytes/sec to human-readable speed
 */
export function formatSpeed(bytesPerSecond) {
  return formatBytes(bytesPerSecond) + '/s';
}

/**
 * GET TIME OF DAY GREETING
 * Returns appropriate greeting based on time with variety
 */
export function getGreeting() {
  const hour = new Date().getHours();
  
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

/**
 * IS TODAY
 * Checks if a date is today
 */
export function isToday(date) {
  const today = new Date();
  const checkDate = new Date(date);
  
  return checkDate.getDate() === today.getDate() &&
         checkDate.getMonth() === today.getMonth() &&
         checkDate.getFullYear() === today.getFullYear();
}

/**
 * FORMAT DATE
 * Formats date for display
 */
export function formatDate(date, format = 'short') {
  const d = new Date(date);
  
  if (format === 'short') {
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  }
  
  return d.toLocaleDateString();
}

/**
 * GET WEATHER EMOJI
 * Returns emoji for weather condition
 */
export function getWeatherEmoji(condition) {
  const conditions = {
    clear: '☀️',
    sunny: '☀️',
    'partly cloudy': '⛅',
    cloudy: '☁️',
    overcast: '☁️',
    rain: '🌧️',
    drizzle: '🌦️',
    snow: '❄️',
    sleet: '🌨️',
    fog: '🌫️',
    wind: '💨',
    storm: '⛈️',
    thunderstorm: '⛈️'
  };
  
  const key = condition.toLowerCase();
  return conditions[key] || '🌤️';
}

/**
 * COLOR FROM PERCENTAGE
 * Returns color based on percentage value
 */
export function colorFromPercentage(percent) {
  if (percent <= 20) return '#ef4444'; // Red
  if (percent <= 50) return '#f59e0b'; // Orange
  if (percent <= 75) return '#eab308'; // Yellow
  return '#10b981'; // Green
}

/**
 * GENERATE ID
 * Generates unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * WAIT
 * Promise-based delay
 */
export function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * REQUEST ANIMATION FRAME PROMISE
 * Promise wrapper for requestAnimationFrame
 */
export function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(resolve));
}

/**
 * DETECT REDUCED MOTION
 * Checks if user prefers reduced motion
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * GET CONTRAST COLOR
 * Returns black or white based on background
 */
export function getContrastColor(hexColor) {
  // Convert hex to RGB
  const r = parseInt(hexColor.substr(1, 2), 16);
  const g = parseInt(hexColor.substr(3, 2), 16);
  const b = parseInt(hexColor.substr(5, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * PARSE WEBSOCKET MESSAGE
 * Safely parse WebSocket JSON messages
 */
export function parseWSMessage(message) {
  try {
    return JSON.parse(message);
  } catch (error) {
    console.error('Failed to parse WebSocket message:', error);
    return null;
  }
}

/**
 * LOG WITH EMOJI
 * Enhanced console logging
 */
export const log = {
  info: (msg, ...args) => console.log(`ℹ️ ${msg}`, ...args),
  success: (msg, ...args) => console.log(`✅ ${msg}`, ...args),
  warning: (msg, ...args) => console.warn(`⚠️ ${msg}`, ...args),
  error: (msg, ...args) => console.error(`❌ ${msg}`, ...args),
  debug: (msg, ...args) => console.log(`🐛 ${msg}`, ...args)
};
