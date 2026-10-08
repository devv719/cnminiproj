import json
import os
import sys
import time
import urllib.request
import urllib.parse
import hashlib

BASE_URL = "http://127.0.0.1:8000"

def run_test(name, protocol, file_path, window_size=4, loss_rate=0.0):
    print(f"\n==========================================", flush=True)
    print(f"TESTING: {name} (Protocol={protocol}, File={file_path}, Loss={loss_rate})", flush=True)
    print(f"==========================================", flush=True)

    # 1. Start transfer
    boundary = "----TestBoundary" + str(int(time.time()))
    cfg = {
        "server_file_path": file_path,
        "protocol": protocol,
        "packet_size": 512,
        "timeout": 0.5,
        "adaptive_timeout": True,
        "window_size": window_size,
        "max_retries": 15,
        "simulator": {
            "loss_rate": loss_rate,
            "corruption_rate": 0.0,
            "delay_ms": 5.0,
            "jitter_ms": 1.0,
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
        res = json.loads(resp.read().decode())
        print(f"[API] Transfer start response: {res}", flush=True)
        assert res.get("status") == "started"
        transfer_id = res.get("transfer_id")

    # 2. Poll status until completed
    start_wait = time.time()
    final_status = None
    while time.time() - start_wait < 15.0:
        req_status = urllib.request.Request(f"{BASE_URL}/api/transfer/status")
        with urllib.request.urlopen(req_status) as resp:
            status_data = json.loads(resp.read().decode())
            st = status_data.get("stats", {}).get("status")
            running = status_data.get("is_running")
            print(f"[API] Poll status: is_running={running}, status={st}", flush=True)
            if not running and st in ("completed", "failed"):
                final_status = status_data
                break
        time.sleep(0.3)

    assert final_status is not None, "Transfer timed out!"
    stats = final_status.get("stats", {})
    print(f"[API] Final Stats: status={stats.get('status')}, verified={stats.get('verified')}, duration={stats.get('duration_seconds')}s", flush=True)
    assert stats.get("status") == "completed", f"Transfer failed: {stats.get('error_message')}"
    assert stats.get("verified") is True, "Verification failed!"

    # 3. Verify on disk
    filename = os.path.basename(file_path)
    with open(file_path, "rb") as f:
        orig_hash = hashlib.sha256(f.read()).hexdigest()
    rec_file = os.path.join("received_files", filename)
    assert os.path.isfile(rec_file), f"Received file {rec_file} missing!"
    with open(rec_file, "rb") as f:
        rec_hash = hashlib.sha256(f.read()).hexdigest()

    print(f"[SHA-256] Orig: {orig_hash} | Recv: {rec_hash}", flush=True)
    assert orig_hash == rec_hash, "Checksum mismatch!"
    print(f">>> {name} PASSED 100%!", flush=True)

if __name__ == "__main__":
    run_test("Stop-and-Wait", "saw", "test_files/small.txt", window_size=1, loss_rate=0.0)
    run_test("Go-Back-N (with loss)", "gbn", "test_files/sample.pdf", window_size=4, loss_rate=0.05)
    run_test("Selective Repeat (with loss)", "sr", "test_files/image.jpg", window_size=4, loss_rate=0.05)
    print("\n==========================================", flush=True)
    print("ALL 3 PROTOCOL LIVE TRANSFERS PASSED!", flush=True)
    print("==========================================", flush=True)
