#!/usr/bin/env python3
"""
Enhanced Dynamic Island Backend Server
Event-driven WebSocket server with advanced system monitoring
"""

import asyncio
import json
import websockets
import logging
from datetime import datetime
from typing import Set
from core.system_monitor import SystemMonitor
from core.media_monitor import MediaMonitor
from core.window_monitor import WindowMonitor

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class DynamicIslandServer:
    """
    Enhanced WebSocket server for Dynamic Island
    Features:
    - Event-driven updates
    - Multiple client support
    - Efficient broadcasting
    - Automatic reconnection handling
    """

    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.clients: Set[websockets.WebSocketServerProtocol] = set()

        # Initialize monitors
        self.system_monitor = SystemMonitor()
        self.media_monitor = MediaMonitor()
        self.window_monitor = WindowMonitor()

        self.is_running = False

        # Cache for change detection
        self.last_state = {"battery": None, "network": None, "media": None}

    async def register(self, websocket):
        """Register a new client connection"""
        self.clients.add(websocket)
        logger.info(
            f"✅ Client connected from {websocket.remote_address}. Total: {len(self.clients)}"
        )

        # Send initial data immediately
        await self.send_initial_data(websocket)

    async def unregister(self, websocket):
        """Unregister a disconnected client"""
        self.clients.discard(websocket)
        logger.info(f"❌ Client disconnected. Total: {len(self.clients)}")

    async def send_to_client(self, websocket, data):
        """Send data to a specific client with error handling"""
        try:
            await websocket.send(json.dumps(data))
        except websockets.exceptions.ConnectionClosed:
            logger.warning("⚠️  Connection closed while sending")
            await self.unregister(websocket)
        except Exception as e:
            logger.error(f"❌ Error sending data: {e}")

    async def broadcast(self, data):
        """Broadcast data to all connected clients"""
        if self.clients:
            # Create tasks for concurrent sending
            tasks = [
                self.send_to_client(client, data) for client in self.clients.copy()
            ]
            await asyncio.gather(*tasks, return_exceptions=True)

    async def send_initial_data(self, websocket):
        """Send initial system state to newly connected client"""
        try:
            # System info
            system_data = await self.get_system_data()
            await self.send_to_client(websocket, system_data)

            # Media info
            media_data = await self.media_monitor.get_media_info()
            await self.send_to_client(websocket, media_data)

            # Window info
            window_data = {
                "type": "window",
                "data": self.window_monitor.get_active_window(),
            }
            await self.send_to_client(websocket, window_data)

            logger.info("📤 Sent initial data to client")

        except Exception as e:
            logger.error(f"❌ Error sending initial data: {e}")

    async def handle_client(self, websocket):
        """
        Handle individual client connection
        Manages bidirectional communication
        """
        await self.register(websocket)

        try:
            # Keep connection alive and handle incoming messages
            async for message in websocket:
                try:
                    data = json.loads(message)
                    await self.handle_client_message(websocket, data)
                except json.JSONDecodeError:
                    logger.error("❌ Invalid JSON received")
                except Exception as e:
                    logger.error(f"❌ Error handling message: {e}")

        except websockets.exceptions.ConnectionClosed:
            logger.info("🔌 Client connection closed normally")
        except Exception as e:
            logger.error(f"❌ Error in client handler: {e}")
        finally:
            await self.unregister(websocket)

    async def handle_client_message(self, websocket, data):
        """Handle messages from client"""
        msg_type = data.get("type")

        if msg_type == "ping":
            # Respond to ping
            await self.send_to_client(
                websocket, {"type": "pong", "timestamp": datetime.now().isoformat()}
            )

        elif msg_type == "media_control":
            action = data.get("action")
            logger.info(f"🎵 Media control: {action}")
            if action == "toggle":
                await self.media_monitor.toggle_playback()
            elif action == "next":
                await self.media_monitor.next_track()
            elif action == "previous":
                await self.media_monitor.previous_track()
            media_data = await self.media_monitor.get_media_info()
            await self.broadcast(media_data)

        elif msg_type == "system_control":
            action = data.get("action")
            if action == "volume":
                value = data.get("value")
                self.system_monitor.set_volume(value)
        else:
            logger.debug(f"📨 Received: {data}")

    async def get_system_data(self):
        """
        Gather system data and format for frontend
        Returns a dictionary with system information
        """
        try:
            system_info = self.system_monitor.get_system_info()

            return {
                "type": "system",
                "data": {
                    "cpu": system_info["cpu_percent"],
                    "ram": system_info["ram_percent"],
                    "battery": system_info["battery_percent"],
                    "isCharging": system_info["battery_charging"],
                    "network": system_info["network_status"],
                    "platform": system_info["platform"],
                },
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"❌ Error getting system data: {e}")
            return {"type": "error", "message": str(e)}

    async def broadcast_loop(self):
        """
        Main broadcast loop
        Sends updates to all clients at regular intervals
        Implements smart change detection to reduce unnecessary updates
        """
        logger.info("🔄 Starting broadcast loop...")
        update_interval = 0.5  # seconds for smoother UI
        notif_counter = 0

        while self.is_running:
            try:
                if self.clients:
                    # 1. System Info
                    sys_data = await self.get_system_data()
                    await self.broadcast(sys_data)

                    # 2. Media Info (Broadcasting frequently for progress bar)
                    media_data = await self.media_monitor.get_media_info()
                    await self.broadcast(media_data)

                    # 3. Window Info
                    window_info = self.window_monitor.get_active_window()
                    window_data = {"type": "window", "data": window_info}
                    await self.broadcast(window_data)

                    # 4. Mock notification (every 30s)
                    notif_counter += 1
                    if notif_counter >= 60:  # 30 seconds at 0.5s interval
                        notif_counter = 0
                        await self.broadcast(
                            {
                                "type": "notification",
                                "data": {
                                    "app": "System",
                                    "title": "Security Update",
                                    "body": "Your system is up to date.",
                                },
                            }
                        )

                # Wait before next update
                await asyncio.sleep(update_interval)

            except Exception as e:
                logger.error(f"❌ Error in broadcast loop: {e}")
                await asyncio.sleep(5)  # Wait longer on error

    async def start(self):
        """Start the WebSocket server"""
        self.is_running = True

        logger.info("=" * 60)
        logger.info("🚀 Dynamic Island Server Starting...")
        logger.info(f"🔗 Host: {self.host}")
        logger.info(f"🔗 Port: {self.port}")
        logger.info(f"🔗 WebSocket URL: ws://{self.host}:{self.port}")
        logger.info("=" * 60)

        # Start the WebSocket server
        async with websockets.serve(
            self.handle_client,
            self.host,
            self.port,
            ping_interval=20,  # Send ping every 20 seconds
            ping_timeout=10,  # Wait 10 seconds for pong
        ):
            logger.info("✅ Server is running!")
            logger.info("💡 Press Ctrl+C to stop")

            # Start broadcast loop
            await self.broadcast_loop()

    def stop(self):
        """Stop the server"""
        logger.info("🛑 Stopping server...")
        self.is_running = False


def main():
    """
    Main entry point
    """
    server = DynamicIslandServer()

    try:
        # Run the server
        asyncio.run(server.start())
    except KeyboardInterrupt:
        logger.info("\n🛑 Server stopped by user")
        server.stop()
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        server.stop()


if __name__ == "__main__":
    main()
