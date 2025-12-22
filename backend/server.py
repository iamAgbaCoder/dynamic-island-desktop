#!/usr/bin/env python3
"""
Dynamic Island Backend Server
WebSocket server that monitors system resources and sends data to Electron
"""

import asyncio
import json
import websockets
import logging
from datetime import datetime
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
    WebSocket server for Dynamic Island
    Manages connections and broadcasts system data
    """

    def __init__(self, host="localhost", port=8765):
        self.host = host
        self.port = port
        self.clients = set()  # Connected clients
        self.system_monitor = SystemMonitor()
        self.media_monitor = MediaMonitor()
        self.window_monitor = WindowMonitor()
        self.is_running = False

    async def register(self, websocket):
        """Register a new client connection"""
        self.clients.add(websocket)
        logger.info(f"✅ Client connected. Total clients: {len(self.clients)}")

    async def unregister(self, websocket):
        """Unregister a disconnected client"""
        self.clients.discard(websocket)
        logger.info(f"❌ Client disconnected. Total clients: {len(self.clients)}")

    async def send_to_client(self, websocket, data):
        """Send data to a specific client"""
        try:
            await websocket.send(json.dumps(data))
        except websockets.exceptions.ConnectionClosed:
            logger.warning("⚠️  Client connection closed while sending data")
            await self.unregister(websocket)
        except Exception as e:
            logger.error(f"❌ Error sending data: {e}")

    async def broadcast(self, data):
        """Broadcast data to all connected clients"""
        if self.clients:
            # Send to all clients concurrently
            await asyncio.gather(
                *[self.send_to_client(client, data) for client in self.clients],
                return_exceptions=True,
            )

    async def handle_client(self, websocket):
        """
        Handle individual client connection
        This function runs for each connected client
        """
        await self.register(websocket)

        try:
            # Send initial system data immediately
            initial_data = await self.get_system_data()
            await self.send_to_client(websocket, initial_data)

            # Send initial media data
            media_data = await self.media_monitor.get_media_info()
            await self.send_to_client(websocket, media_data)

            # Keep connection alive and handle incoming messages
            async for message in websocket:
                try:
                    data = json.loads(message)
                    logger.info(f"📨 Received from client: {data}")

                    # Handle different message types
                    if data.get("type") == "ping":
                        await self.send_to_client(
                            websocket,
                            {"type": "pong", "timestamp": datetime.now().isoformat()},
                        )

                except json.JSONDecodeError:
                    logger.error("❌ Invalid JSON received")

        except websockets.exceptions.ConnectionClosed:
            logger.info("🔌 Client connection closed normally")
        except Exception as e:
            logger.error(f"❌ Error handling client: {e}")
        finally:
            await self.unregister(websocket)

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
                    "network": system_info["network_status"],
                },
                "timestamp": datetime.now().isoformat(),
            }
        except Exception as e:
            logger.error(f"❌ Error getting system data: {e}")
            return {"type": "error", "message": str(e)}

    async def broadcast_loop(self):
        """
        Continuously broadcast system data to all clients
        Runs every 2 seconds
        """
        logger.info("🔄 Starting broadcast loop...")

        while self.is_running:
            try:
                if self.clients:
                    # 1. System Info
                    sys_data = await self.get_system_data()
                    await self.broadcast(sys_data)

                    # 2. Media Info
                    media_data = await self.media_monitor.get_media_info()
                    await self.broadcast(media_data)

                    # 3. Window Info
                    window_data = {
                        "type": "window",
                        "data": self.window_monitor.get_active_window(),
                    }
                    await self.broadcast(window_data)

                # Wait 1 second before next update
                await asyncio.sleep(1)

            except Exception as e:
                logger.error(f"❌ Error in broadcast loop: {e}")
                await asyncio.sleep(5)  # Wait longer on error

    async def start(self):
        """Start the WebSocket server"""
        self.is_running = True

        logger.info(f"🚀 Starting Dynamic Island Server on {self.host}:{self.port}")

        # Start the WebSocket server
        async with websockets.serve(self.handle_client, self.host, self.port):
            logger.info("✅ Server is running!")
            logger.info(f"🔗 Listening on ws://{self.host}:{self.port}")

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
