import platform
import logging
import time

logger = logging.getLogger(__name__)


class MediaMonitor:
    """
    Monitors system media playback
    Currently uses MOCK data for demonstration until winsdk integration
    """

    def __init__(self):
        self.platform = platform.system()
        self.last_update = 0
        self.track_index = 0
        self.mock_tracks = [
            {"title": "Blinding Lights", "artist": "The Weeknd", "duration": 200},
            {"title": "As It Was", "artist": "Harry Styles", "duration": 167},
            {"title": "Midnight City", "artist": "M83", "duration": 243},
            {"title": "Wait a Minute!", "artist": "WILLOW", "duration": 196},
        ]
        self.current_start_time = time.time()
        self.is_playing = True
        logger.info(f"🎧 Initialized MediaMonitor ({self.platform} - Mock Mode)")

    async def get_media_info(self):
        """
        Get current media info
        Returns dict with title, artist, is_playing, progress (0-100)
        """
        # Mock logic: Rotate tracks every 30 seconds
        now = time.time()
        elapsed = now - self.current_start_time
        track = self.mock_tracks[self.track_index]

        # Auto-skip if track "finished" (mocking shorter duration for demo)
        demo_duration = 30  # seconds for demo

        if elapsed > demo_duration:
            self.track_index = (self.track_index + 1) % len(self.mock_tracks)
            self.current_start_time = now
            elapsed = 0
            track = self.mock_tracks[self.track_index]

        progress_percent = (elapsed / demo_duration) * 100

        return {
            "type": "media",
            "data": {
                "title": track["title"],
                "artist": track["artist"],
                "isPlaying": self.is_playing,
                "progress": round(progress_percent, 1),
                # 'artUrl': '...' # Future
            },
        }
