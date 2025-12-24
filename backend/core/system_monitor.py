#!/usr/bin/env python3
"""
System Monitor Module
Cross-platform system resource monitoring
"""

import psutil
import platform
import logging
import math

logger = logging.getLogger(__name__)

# Windows audio control
try:
    from comtypes import CLSCTX_ALL
    from pycaw.pycaw import AudioUtilities, IAudioEndpointVolume
except ImportError:
    pass


class SystemMonitor:
    """
    Monitors system resources across different platforms
    Provides CPU, RAM, battery, and network information
    """

    def __init__(self):
        self.platform = platform.system()
        logger.info(f"🖥️  Initialized SystemMonitor for {self.platform}")

        # Platform-specific initialization
        if self.platform == "Darwin":  # macOS
            self._init_macos()
        elif self.platform == "Windows":
            self._init_windows()
        elif self.platform == "Linux":
            self._init_linux()

    def _init_macos(self):
        """Initialize macOS-specific monitoring"""
        logger.info("🍎 Initializing macOS monitoring")
        # Future: Add macOS-specific features
        pass

    def _init_windows(self):
        """Initialize Windows-specific monitoring"""
        logger.info("🪟 Initializing Windows monitoring")
        # Future: Add Windows-specific features
        pass

    def _init_linux(self):
        """Initialize Linux-specific monitoring"""
        logger.info("🐧 Initializing Linux monitoring")
        # Future: Add Linux-specific features
        pass

    def set_volume(self, value):
        """Set system master volume (0-100)"""
        if self.platform != "Windows":
            return False

        try:
            val = float(value) / 100.0
            devices = AudioUtilities.GetSpeakers()
            interface = devices.Activate(IAudioEndpointVolume._iid_, CLSCTX_ALL, None)
            volume = interface.QueryInterface(IAudioEndpointVolume)

            # Clamp value between 0 and 1
            val = max(0.0, min(1.0, val))

            # The set_master_volume_level expects decibels, or we can use set_master_volume_level_scalar
            volume.SetMasterVolumeLevelScalar(val, None)
            logger.info(f"🔊 System volume set to {value}%")
            return True
        except Exception as e:
            logger.error(f"❌ Error setting volume: {e}")
            return False

    def get_cpu_percent(self):
        """
        Get CPU usage percentage
        Returns: float (0-100)
        """
        try:
            # interval=None means non-blocking delta since last call
            cpu_percent = psutil.cpu_percent(interval=None)
            return round(cpu_percent, 1)
        except Exception as e:
            logger.error(f"❌ Error getting CPU percent: {e}")
            return 0.0

    def get_ram_percent(self):
        """
        Get RAM usage percentage
        Returns: float (0-100)
        """
        try:
            memory = psutil.virtual_memory()
            return round(memory.percent, 1)
        except Exception as e:
            logger.error(f"❌ Error getting RAM percent: {e}")
            return 0.0

    def get_battery_info(self):
        """
        Get battery information
        Returns: dict with percent, charging status, time remaining
        """
        try:
            battery = psutil.sensors_battery()

            if battery is None:
                # No battery (desktop computer)
                return {
                    "percent": 100,
                    "charging": False,
                    "plugged": True,
                    "time_remaining": None,
                }

            return {
                "percent": round(battery.percent, 1),
                "charging": battery.power_plugged,
                "plugged": battery.power_plugged,
                "time_remaining": (
                    battery.secsleft
                    if battery.secsleft != psutil.POWER_TIME_UNLIMITED
                    else None
                ),
            }
        except Exception as e:
            logger.error(f"❌ Error getting battery info: {e}")
            return {
                "percent": 100,
                "charging": False,
                "plugged": True,
                "time_remaining": None,
            }

    def get_network_status(self):
        """
        Get network connectivity status
        Returns: str ('connected' or 'disconnected')
        """
        try:
            # Check if any network interface is up
            net_if_stats = psutil.net_if_stats()

            for interface, stats in net_if_stats.items():
                # Skip loopback interface
                if interface.startswith("lo"):
                    continue

                # Check if interface is up
                if stats.isup:
                    return "connected"

            return "disconnected"

        except Exception as e:
            logger.error(f"❌ Error getting network status: {e}")
            return "unknown"

    def get_disk_usage(self):
        """
        Get disk usage for primary drive
        Returns: dict with total, used, free, percent
        """
        try:
            disk = psutil.disk_usage("/")
            return {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": round(disk.percent, 1),
            }
        except Exception as e:
            logger.error(f"❌ Error getting disk usage: {e}")
            return {"total": 0, "used": 0, "free": 0, "percent": 0}

    def get_system_info(self):
        """
        Get comprehensive system information
        Returns: dict with all system metrics
        """
        try:
            battery_info = self.get_battery_info()

            return {
                "cpu_percent": self.get_cpu_percent(),
                "ram_percent": self.get_ram_percent(),
                "battery_percent": battery_info["percent"],
                "battery_charging": battery_info["charging"],
                "network_status": self.get_network_status(),
                "disk_usage": self.get_disk_usage(),
                "platform": self.platform,
            }
        except Exception as e:
            logger.error(f"❌ Error getting system info: {e}")
            return {
                "cpu_percent": 0,
                "ram_percent": 0,
                "battery_percent": 100,
                "battery_charging": False,
                "network_status": "unknown",
                "disk_usage": {"percent": 0},
                "platform": self.platform,
            }


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    monitor = SystemMonitor()
    info = monitor.get_system_info()

    print("\n📊 System Information:")
    print(f"  CPU:     {info['cpu_percent']}%")
    print(f"  RAM:     {info['ram_percent']}%")
    print(
        f"  Battery: {info['battery_percent']}% {'(charging)' if info['battery_charging'] else ''}"
    )
    print(f"  Network: {info['network_status']}")
    print(f"  Disk:    {info['disk_usage']['percent']}%")
    print(f"  Platform: {info['platform']}")
