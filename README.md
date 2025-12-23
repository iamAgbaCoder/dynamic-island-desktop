# 🏝️ Dynamic Island Desktop

> **Apple-level premium desktop overlay** - Bringing iOS Dynamic Island to Windows, macOS, and Linux

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Electron](https://img.shields.io/badge/Electron-39.2.7-47848F?logo=electron)](https://www.electronjs.org/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?logo=python)](https://www.python.org/)

---

## ✨ Features

### 🎯 Core Features
- **🏝️ Dynamic Island UI** - Morphing pill interface with smooth animations
- **🎵 Media Player** - Live music playback with controls
- **🔋 Battery Monitor** - Real-time battery status with charging animations
- **📊 System Stats** - CPU, RAM, and network monitoring
- **🪟 Window Tracking** - Active application detection
- **🎨 Premium Animations** - GSAP-powered spring physics

### 🚀 Upcoming Features
- **🔔 Notifications** - System notification integration
- **⏱️ Timers** - Countdown timers with circular progress
- **🔵 Bluetooth** - Device connection status
- **📆 Calendar** - Today's events and reminders
- **⛅ Weather** - Current conditions and forecast
- **📷 Camera Preview** - Quick mirror for video calls
- **🧩 Extensions** - Plugin system for custom widgets

---

## 🎨 Design Philosophy

This project follows **Apple Human Interface Guidelines** with a focus on:

1. **Emotional Design** - UI that feels alive and responsive
2. **Motion Design** - Spring-based physics for natural movement
3. **Minimalism** - Every pixel serves a purpose
4. **Performance** - Blazing fast 60fps animations
5. **Cross-Platform** - Native feel on every OS

---

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│      Electron Main Process          │
│   (Window Management, IPC)          │
└─────────────┬───────────────────────┘
              │
              ├─► Preload (IPC Bridge)
              │
┌─────────────▼───────────────────────┐
│      Renderer Process (UI)          │
│  ┌─────────────────────────────┐   │
│  │   GSAP Animation Engine     │   │
│  ├─────────────────────────────┤   │
│  │   Zustand State Manager     │   │
│  ├─────────────────────────────┤   │
│  │   Components & Widgets      │   │
│  └─────────────────────────────┘   │
└─────────────┬───────────────────────┘
              │ WebSocket
┌─────────────▼───────────────────────┐
│    Python Backend Server            │
│  ┌─────────────────────────────┐   │
│  │   System Monitors           │   │
│  │   - Battery, CPU, RAM       │   │
│  │   - Media Playback          │   │
│  │   - Window Tracking         │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

---

## 📦 Installation

### Prerequisites

- **Node.js** v18+ ([Download](https://nodejs.org/))
- **Python** 3.10+ ([Download](https://www.python.org/))
- **pnpm** (Install: `npm install -g pnpm`)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/iamAgbaCoder/dynamic-island-desktop.git
cd dynamic-island-desktop

# Install Node dependencies
pnpm install

# Install Python dependencies
cd backend
pip install -r requirements.txt
cd ..
```

---

## 🚀 Running the Application

### Option 1: Manual (Recommended for Development)

**Terminal 1 - Start Python Backend:**
```bash
cd backend
python server.py
```

**Terminal 2 - Start Electron App:**
```bash
pnpm start
```

### Option 2: Development Mode

```bash
pnpm dev
```

---

## 🎮 Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Click` | Expand/Collapse island |
| `Space` | Toggle island |
| `Esc` | Collapse island |
| `Cmd/Ctrl + Q` | Quit application |

### Interactions

- **Hover** - Preview animation
- **Click** - Expand to full view
- **Click outside** - Collapse back

---

## 🛠️ Development

### Project Structure

```
dynamic-island-desktop/
├── electron/
│   ├── main.js              # Main process
│   ├── preload.js           # IPC bridge
│   └── renderer/
│       ├── index.html       # UI structure
│       ├── styles.css       # Premium styling
│       ├── app.js           # Application logic
│       └── lib/
│           ├── animations.js # GSAP animations
│           ├── store.js     # State management
│           └── utils.js     # Utility functions
├── backend/
│   ├── server.py            # WebSocket server
│   └── core/
│       ├── system_monitor.py
│       ├── media_monitor.py
│       └── window_monitor.py
└── package.json
```

### Tech Stack

**Frontend:**
- **Electron** - Desktop framework
- **GSAP** - Professional animations
- **Zustand** - State management
- **Vanilla JS** - No framework overhead

**Backend:**
- **Python** - System monitoring
- **WebSockets** - Real-time communication
- **psutil** - System information
- **asyncio** - Async event loop

---

## 🎨 Customization

### Animation Presets

```javascript
// Available spring presets
SpringPresets.gentle   // Subtle interactions
SpringPresets.bouncy   // Default iOS feel
SpringPresets.snappy   // Quick responses
SpringPresets.smooth   // Large movements
SpringPresets.elastic  // Emphasis
```

### Color Tokens

Edit `styles.css` to customize colors:

```css
:root {
  --color-accent: #0a84ff;      /* Primary accent */
  --color-success: #30d158;     /* Success state */
  --color-warning: #ff9f0a;     /* Warning state */
  --color-error: #ff453a;       /* Error state */
}
```

---

## 🧪 Testing

```bash
# Run linter
pnpm lint

# Format code
pnpm format

# Test Python backend
cd backend
python -m pytest
```

---

## 📝 API Reference

### WebSocket Messages

**From Backend to Frontend:**

```json
{
  "type": "system",
  "data": {
    "cpu": 45.2,
    "ram": 62.8,
    "battery": 87,
    "isCharging": false,
    "network": "connected"
  },
  "timestamp": "2025-12-23T03:24:02Z"
}
```

```json
{
  "type": "media",
  "data": {
    "isActive": true,
    "isPlaying": true,
    "title": "Blinding Lights",
    "artist": "The Weeknd",
    "progress": 45.2,
    "duration": 200
  }
}
```

**From Frontend to Backend:**

```json
{
  "type": "ping"
}
```

```json
{
  "type": "media_control",
  "action": "play_pause"
}
```

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- **JavaScript**: Use ES6+ modules, async/await
- **Python**: Follow PEP 8, use type hints
- **CSS**: Use CSS variables, BEM naming
- **Commits**: Use conventional commits

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Apple** - For the Dynamic Island inspiration
- **GSAP** - For professional animation tools
- **Electron** - For cross-platform desktop framework
- **psutil** - For system monitoring capabilities

---

## 🗺️ Roadmap

### Phase 1: Foundation ✅
- [x] Basic island with expand/collapse
- [x] WebSocket backend connection
- [x] System monitoring (CPU, RAM, battery)
- [x] Premium animations with GSAP

### Phase 2: Core Features 🚧
- [x] Media player integration
- [ ] Notification system
- [ ] Charging animations
- [ ] System HUD replacements

### Phase 3: Intelligence 📅
- [ ] Calendar & reminders
- [ ] Weather integration
- [ ] Bluetooth management
- [ ] Camera preview

### Phase 4: Extensibility 🔮
- [ ] Plugin system
- [ ] Theme marketplace
- [ ] Visual customization tool
- [ ] Analytics dashboard

### Phase 5: Polish 🚀
- [ ] Multi-language support
- [ ] Accessibility features
- [ ] Mobile companion app
- [ ] Auto-updater

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/iamAgbaCoder/dynamic-island-desktop/issues)
- **Discussions**: [GitHub Discussions](https://github.com/iamAgbaCoder/dynamic-island-desktop/discussions)
- **Email**: [your-email@example.com](mailto:your-email@example.com)

---

## ⭐ Star History

If you find this project useful, please consider giving it a star! ⭐

---

<div align="center">

**Made with ❤️ by [Favour Bamgboye (iamAgbaCoder)](https://github.com/iamAgbaCoder)**

*Bringing Apple-level polish to desktop overlays*

</div>
