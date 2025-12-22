import asyncio
import websockets
import json
import sys


async def test_connection():
    uri = "ws://localhost:8765"
    print(f"Attempting to connect to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to server")
            # Wait for initial data
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"Received data type: {data.get('type')}")
                if data.get("type") == "system":
                    print("Verification SUCCESS: Received system data")
                else:
                    print("Verification WARNING: Received unexpected data")
            except asyncio.TimeoutError:
                print("Verification FAILED: Timed out waiting for data")
                sys.exit(1)

    except Exception as e:
        print(f"Verification FAILED: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(test_connection())
