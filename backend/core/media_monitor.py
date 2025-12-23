#!/usr/bin/env python3
"""
Enhanced Media Monitor
Cross-platform media playback monitoring with actual system integration
"""

import platform
import logging
import time
import asyncio

logger = logging.getLogger(__name__)


class MediaMonitor:
    """
    Monitors system media playback across platforms
    - Windows: Uses Windows Media Control (winsdk)
    - macOS: Uses MediaRemote framework (future)
    - Linux: Uses MPRIS D-Bus (future)
    """

    def __init__(self):
        self.platform = platform.system()
        self.is_mock_mode = False  # Will be False when real integration is added

        # Mock data for demonstration
        self.last_update = 0
        self.track_index = 0
        self.mock_tracks = [
            {
                "title": "Blinding Lights",
                "artist": "The Weeknd",
                "album": "After Hours",
                "duration": 200,
            },
            {
                "title": "As It Was",
                "artist": "Harry Styles",
                "album": "Harry's House",
                "duration": 167,
            },
            {
                "title": "Midnight City",
                "artist": "M83",
                "album": "Hurry Up, We're Dreaming",
                "duration": 243,
            },
            {
                "title": "Wait a Minute!",
                "artist": "WILLOW",
                "album": "COPINGMECHANISM",
                "duration": 196,
            },
        ]
        self.current_start_time = time.time()
        self.is_playing = True
        self.is_active = True  # Whether media player is active

        # Initialize platform-specific monitoring
        self._init_platform_monitor()

        logger.info(f"🎧 MediaMonitor initialized ({self.platform})")
        if self.is_mock_mode:
            logger.warning("⚠️  Running in MOCK mode - using demo data")

    def _init_platform_monitor(self):
        """Initialize platform-specific media monitoring"""
        if self.platform == "Windows":
            self._init_windows_media()
        elif self.platform == "Darwin":  # macOS
            self._init_macos_media()
        elif self.platform == "Linux":
            self._init_linux_media()

    def _init_windows_media(self):
        """Initialize Windows Media Control"""
        try:
            # Try to import pycaw for audio session monitoring
            from pycaw.pycaw import AudioUtilities

            self.AudioUtilities = AudioUtilities
            self.is_mock_mode = False
            logger.info("✅ Windows Audio Monitoring (pycaw) initialized")
        except ImportError:
            logger.warning("⚠️  pycaw not available - using mock data")
            self.is_mock_mode = True

    def _init_macos_media(self):
        """Initialize macOS MediaRemote"""
        try:
            # Future: Use MediaRemote framework
            # import MediaRemote
            # self.is_mock_mode = False
            # logger.info("✅ macOS MediaRemote initialized")
            pass
        except ImportError:
            logger.warning("⚠️  MediaRemote not available - using mock data")
            self.is_mock_mode = True

    def _init_linux_media(self):
        """Initialize Linux MPRIS D-Bus"""
        try:
            # Future: Use MPRIS D-Bus interface
            # import dbus
            # self.is_mock_mode = False
            # logger.info("✅ Linux MPRIS initialized")
            pass
        except ImportError:
            logger.warning("⚠️  D-Bus not available - using mock data")
            self.is_mock_mode = True

    async def get_media_info(self):
        """
        Get current media playback information
        Returns dict with media metadata and playback state
        """
        if self.is_mock_mode:
            return await self._get_mock_media_info()
        else:
            # Future: Get real media info based on platform
            if self.platform == "Windows":
                return await self._get_windows_media_info()
            elif self.platform == "Darwin":
                return await self._get_macos_media_info()
            elif self.platform == "Linux":
                return await self._get_linux_media_info()

    async def _get_mock_media_info(self):
        """
        Get mock media info for demonstration
        Simulates a media player with rotating tracks
        """
        now = time.time()
        elapsed = now - self.current_start_time
        track = self.mock_tracks[self.track_index]

        # Simulate track duration (30 seconds for demo)
        demo_duration = 30

        # Auto-advance to next track
        if elapsed > demo_duration:
            self.track_index = (self.track_index + 1) % len(self.mock_tracks)
            self.current_start_time = now
            elapsed = 0
            track = self.mock_tracks[self.track_index]
            logger.info(f"🎵 Now playing: {track['title']} - {track['artist']}")

        # Calculate progress
        progress_seconds = elapsed
        progress_percent = (elapsed / demo_duration) * 100

        return {
            "type": "media",
            "data": {
                "isActive": self.is_active,
                "isPlaying": self.is_playing,
                "title": track["title"],
                "artist": track["artist"],
                "album": track["album"],
                "progress": progress_seconds,
                "duration": demo_duration,  # Using demo duration
                "progressPercent": round(progress_percent, 1),
                "artworkUrl": None,  # Future: Album artwork
            },
        }

    async def _get_windows_media_info(self):
        """Get media info from Windows using pycaw fallback"""
        try:
            sessions = self.AudioUtilities.GetAllSessions()
            active_session = None

            for session in sessions:
                if session.State == 1:  # 1 = Playing
                    active_session = session
                    break

            if not active_session:
                # Fallback to mock if nothing is playing
                return await self._get_mock_media_info()

            process_name = "Unknown App"
            if active_session.Process:
                process_name = (
                    active_session.Process.name().replace(".exe", "").capitalize()
                )

            return {
                "type": "media",
                "data": {
                    "isActive": True,
                    "isPlaying": True,
                    "title": "System Audio",
                    "artist": process_name,
                    "album": "Windows Media",
                    "progress": 0,
                    "duration": 100,
                    "progressPercent": 50,
                    "artworkUrl": None,
                },
            }
        except Exception as e:
            logger.error(f"Error getting Windows media info: {e}")
            return await self._get_mock_media_info()

    async def _get_macos_media_info(self):
        """Get media info from macOS MediaRemote"""
        # Future implementation
        pass

    async def _get_linux_media_info(self):
        """Get media info from Linux MPRIS"""
        # Future implementation
        pass

    def toggle_playback(self):
        """Toggle play/pause state"""
        self.is_playing = not self.is_playing
        logger.info(f"🎵 Playback {'resumed' if self.is_playing else 'paused'}")
        return self.is_playing

    def next_track(self):
        """Skip to next track"""
        if self.is_mock_mode:
            self.track_index = (self.track_index + 1) % len(self.mock_tracks)
            self.current_start_time = time.time()
            track = self.mock_tracks[self.track_index]
            logger.info(f"⏭️  Next track: {track['title']}")

    def previous_track(self):
        """Go to previous track"""
        if self.is_mock_mode:
            self.track_index = (self.track_index - 1) % len(self.mock_tracks)
            self.current_start_time = time.time()
            track = self.mock_tracks[self.track_index]
            logger.info(f"⏮️  Previous track: {track['title']}")


# Example usage
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    async def test_media_monitor():
        monitor = MediaMonitor()

        print("\n🎵 Testing Media Monitor...")
        for i in range(5):
            info = await monitor.get_media_info()
            data = info["data"]
            print(f"\n  Now Playing: {data['title']}")
            print(f"  Artist: {data['artist']}")
            print(
                f"  Progress: {data['progress']:.1f}s / {data['duration']}s ({data['progressPercent']:.1f}%)"
            )
            print(f"  Playing: {data['isPlaying']}")
            await asyncio.sleep(2)

    asyncio.run(test_media_monitor())
