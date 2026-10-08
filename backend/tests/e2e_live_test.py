import asyncio
import json
import os
import time
import urllib.request
import urllib.parse
import websockets
import hashlib

BASE_URL = "http://127.0.0.1:8000"
WS_URL = "ws://127.0.0.1:8000/ws/events"

async def test_saw_transfer():
    print("\n--- TEST 1: STOP-AND-WAIT TRANSFER ---")
    events_received = []

    async def ws_listener():
        try:
            async with websockets.connect(WS_URL) as ws:
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("kind") == "event":
                        ev = data.get("payload", {})
                        events_received.append(ev)
                        if ev.get("event_type") in ("transfer_complete", "transfer_failed"):
                            break
        except Exception as e:
            print(f"WS error: {e}")

    ws_task = asyncio.create_task(ws_listener())
    await asyncio.sleep(0.5)

    # 1. Start SAW transfer
    boundary = "----WebKitFormBoundaryTest123"
    cfg = {
        "server_file_path": "test_files/small.txt",
        "protocol": "saw",
        "packet_size": 512,
        "timeout": 1.0,
        "adaptive_timeout": True,
        "window_size": 1,
        "max_retries": 10,
        "simulator": {
            "loss_rate": 0.0,
            "corruption_rate": 0.0,
            "delay_ms": 1.0,
            "jitter_ms": 0.5,
            "duplicate_rate": 0.0,
            "reorder_rate": 0.0,
        }
    }

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="config_json"\r\n\r\n'
        f"{json.dumps(cfg)}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/transfer/start",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )

    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode())
        print(f"Start Response: {res_data}")
        assert res_data.get("status") == "started"
        transfer_id = res_data.get("transfer_id")

    # Wait for completion
    await asyncio.wait_for(ws_task, timeout=10.0)
    print(f"Total events received: {len(events_received)}")
    event_types = [e.get("event_type") for e in events_received]
    print(f"Event types: {set(event_types)}")
    assert "transfer_started" in event_types
    assert "packet_sent" in event_types
    assert "ack_received" in event_types
    assert "transfer_complete" in event_types

    # Check received file
    with open("test_files/small.txt", "rb") as f:
        orig_bytes = f.read()
    orig_hash = hashlib.sha256(orig_bytes).hexdigest()

    rec_path = os.path.join("received_files", "small.txt")
    assert os.path.isfile(rec_path), f"Received file {rec_path} does not exist"
    with open(rec_path, "rb") as f:
        rec_bytes = f.read()
    rec_hash = hashlib.sha256(rec_bytes).hexdigest()

    print(f"Original SHA-256:     {orig_hash}")
    print(f"Reconstructed SHA-256: {rec_hash}")
    assert orig_hash == rec_hash, "SHA-256 hash mismatch!"
    print(">>> STOP-AND-WAIT TEST PASSED SUCCESSFULLY!\n")


async def test_gbn_transfer_with_loss():
    print("\n--- TEST 2: GO-BACK-N TRANSFER WITH LOSS ---")
    events_received = []

    async def ws_listener():
        try:
            async with websockets.connect(WS_URL) as ws:
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("kind") == "event":
                        ev = data.get("payload", {})
                        events_received.append(ev)
                        if ev.get("event_type") in ("transfer_complete", "transfer_failed"):
                            break
        except Exception as e:
            print(f"WS error: {e}")

    ws_task = asyncio.create_task(ws_listener())
    await asyncio.sleep(0.5)

    boundary = "----WebKitFormBoundaryTest456"
    cfg = {
        "server_file_path": "test_files/sample.pdf",
        "protocol": "gbn",
        "packet_size": 256,
        "timeout": 0.5,
        "adaptive_timeout": True,
        "window_size": 4,
        "max_retries": 15,
        "simulator": {
            "loss_rate": 0.05,
            "corruption_rate": 0.0,
            "delay_ms": 10.0,
            "jitter_ms": 2.0,
            "duplicate_rate": 0.0,
            "reorder_rate": 0.0,
            "seed": 42,
        }
    }

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="config_json"\r\n\r\n'
        f"{json.dumps(cfg)}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/transfer/start",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )

    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode())
        print(f"Start Response: {res_data}")
        assert res_data.get("status") == "started"

    # Wait for completion
    await asyncio.wait_for(ws_task, timeout=15.0)
    event_types = [e.get("event_type") for e in events_received]
    print(f"Total events received: {len(events_received)}")
    print(f"Event types: {set(event_types)}")
    assert "transfer_complete" in event_types

    # Verify integrity
    with open("test_files/sample.pdf", "rb") as f:
        orig_bytes = f.read()
    orig_hash = hashlib.sha256(orig_bytes).hexdigest()

    rec_path = os.path.join("received_files", "sample.pdf")
    with open(rec_path, "rb") as f:
        rec_bytes = f.read()
    rec_hash = hashlib.sha256(rec_bytes).hexdigest()

    print(f"Original SHA-256:     {orig_hash}")
    print(f"Reconstructed SHA-256: {rec_hash}")
    assert orig_hash == rec_hash, "SHA-256 hash mismatch!"
    print(">>> GO-BACK-N TEST PASSED SUCCESSFULLY!\n")


async def test_sr_transfer_with_loss():
    print("\n--- TEST 3: SELECTIVE REPEAT TRANSFER WITH LOSS ---")
    events_received = []

    async def ws_listener():
        try:
            async with websockets.connect(WS_URL) as ws:
                while True:
                    msg = await ws.recv()
                    data = json.loads(msg)
                    if data.get("kind") == "event":
                        ev = data.get("payload", {})
                        events_received.append(ev)
                        if ev.get("event_type") in ("transfer_complete", "transfer_failed"):
                            break
        except Exception as e:
            print(f"WS error: {e}")

    ws_task = asyncio.create_task(ws_listener())
    await asyncio.sleep(0.5)

    boundary = "----WebKitFormBoundaryTest789"
    cfg = {
        "server_file_path": "test_files/image.jpg",
        "protocol": "sr",
        "packet_size": 512,
        "timeout": 0.5,
        "adaptive_timeout": True,
        "window_size": 4,
        "max_retries": 15,
        "simulator": {
            "loss_rate": 0.05,
            "corruption_rate": 0.01,
            "delay_ms": 10.0,
            "jitter_ms": 2.0,
            "duplicate_rate": 0.0,
            "reorder_rate": 0.0,
            "seed": 123,
        }
    }

    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="config_json"\r\n\r\n'
        f"{json.dumps(cfg)}\r\n"
        f"--{boundary}--\r\n"
    ).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/transfer/start",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )

    with urllib.request.urlopen(req) as resp:
        res_data = json.loads(resp.read().decode())
        print(f"Start Response: {res_data}")
        assert res_data.get("status") == "started"

    # Wait for completion
    await asyncio.wait_for(ws_task, timeout=15.0)
    event_types = [e.get("event_type") for e in events_received]
    print(f"Total events received: {len(events_received)}")
    print(f"Event types: {set(event_types)}")
    assert "transfer_complete" in event_types

    # Verify integrity
    with open("test_files/image.jpg", "rb") as f:
        orig_bytes = f.read()
    orig_hash = hashlib.sha256(orig_bytes).hexdigest()

    rec_path = os.path.join("received_files", "image.jpg")
    with open(rec_path, "rb") as f:
        rec_bytes = f.read()
    rec_hash = hashlib.sha256(rec_bytes).hexdigest()

    print(f"Original SHA-256:     {orig_hash}")
    print(f"Reconstructed SHA-256: {rec_hash}")
    assert orig_hash == rec_hash, "SHA-256 hash mismatch!"
    print(">>> SELECTIVE REPEAT TEST PASSED SUCCESSFULLY!\n")


async def main():
    await test_saw_transfer()
    await test_gbn_transfer_with_loss()
    await test_sr_transfer_with_loss()
    print("\n========================================")
    print("ALL 3 END-TO-END TRANSFERS PASSED 100%!")
    print("========================================")

if __name__ == "__main__":
    asyncio.run(main())
