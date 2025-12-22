import platform
import logging
import asyncio

logger = logging.getLogger(__name__)

# Try importing pywin32, but handle failure gracefully
try:
    import win32gui
    import win32process
    import psutil

    HAS_WIN32 = True
except ImportError:
    HAS_WIN32 = False
    logger.warning(
        "⚠️ pywin32 not found. Active window detection will be disabled or mocked."
    )


class WindowMonitor:
    """
    Monitors the currently active window/application.
    """

    def __init__(self):
        self.platform = platform.system()
        self.last_app_name = ""
        logger.info(f"🖥️  Initialized WindowMonitor for {self.platform}")

    def get_active_window(self):
        """
        Get info about the currently focused window
        Returns: dict with app_name, window_title
        """
        if not HAS_WIN32 or self.platform != "Windows":
            return {
                "app_name": "Finder" if self.platform == "Darwin" else "System",
                "window_title": "Desktop",
                "menu_items": ["File", "Edit", "View", "Go", "Window", "Help"],
            }

        try:
            window_handle = win32gui.GetForegroundWindow()
            _, pid = win32process.GetWindowThreadProcessId(window_handle)

            # Get process name
            try:
                process = psutil.Process(pid)
                app_name = process.name().replace(".exe", "").title()
            except Exception:
                app_name = "Unknown"

            # Get window title
            window_title = win32gui.GetWindowText(window_handle)

            # Mock menu items (Hard to get real ones without accessibility API)
            menu_items = ["File", "Edit", "View", "Window", "Help"]

            return {
                "app_name": app_name,
                "window_title": window_title,
                "menu_items": menu_items,
            }

        except Exception as e:
            logger.error(f"❌ Error getting active window: {e}")
            return {"app_name": "System", "window_title": "", "menu_items": []}
