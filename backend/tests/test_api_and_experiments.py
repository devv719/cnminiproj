"""
Tests for Phase 6 & Phase 7: FastAPI endpoints, experiment runner sweeps, and data exports.
"""
from fastapi.testclient import TestClient
import time
import pytest
from main import app
from services.experiments import ExperimentRunner
from protocol.channel import ChannelConfig

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_api_profiles():
    response = client.get("/api/profiles")
    assert response.status_code == 200
    profiles = response.json()
    assert "LAN" in profiles
    assert "WIFI" in profiles
    assert "POOR" in profiles
    assert "SATELLITE" in profiles


def test_experiment_runner_types():
    response = client.get("/api/experiments/types")
    assert response.status_code == 200
    types = response.json()
    assert len(types) >= 5
    ids = [t["id"] for t in types]
    assert "loss_sweep" in ids
    assert "protocol_comparison" in ids


def test_experiment_runner_protocol_comparison():
    runner = ExperimentRunner()
    # Run comparison on small data
    exp_id = runner.run_experiment_async("protocol_comparison", file_bytes=b"0123456789" * 10, seed=42)
    
    # Wait for completion
    timeout = 15.0
    start = time.time()
    while runner.is_running and (time.time() - start < timeout):
        time.sleep(0.1)

    assert not runner.is_running
    assert exp_id in runner.history
    res = runner.history[exp_id]
    assert "data" in res
    assert "comparison" in res["data"]
    comp = res["data"]["comparison"]
    assert len(comp) == 3  # SAW, GBN, SR
    
    # Test CSV export
    csv_str = runner.export_csv(exp_id)
    assert "Experiment ID" in csv_str
    assert "SAW" in csv_str
    assert "GBN" in csv_str
    assert "SR" in csv_str


def test_api_log_export():
    response = client.get("/api/log/export?format=json")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

    response_csv = client.get("/api/log/export?format=csv")
    assert response_csv.status_code == 200
    assert "Timestamp,Type,Seq,Ack" in response_csv.text

from unittest.mock import patch


def test_api_transfer_start_accepts_config_json():
    """Verify /api/transfer/start accepts multipart config_json payload (the wiring the UI uses)."""
    import json
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
            "delay_ms": 0.0,
            "jitter_ms": 0.0,
            "duplicate_rate": 0.0,
            "reorder_rate": 0.0,
        },
    }
    with patch("main.transfer_manager.start_transfer", return_value="mock-transfer-123") as mock_start:
        response = client.post("/api/transfer/start", data={"config_json": json.dumps(cfg)})
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "started"
        assert data.get("transfer_id") == "mock-transfer-123"
        assert mock_start.called
        kwargs = mock_start.call_args.kwargs
        assert kwargs["protocol"] == "saw"
        assert kwargs["packet_size"] == 512


def test_api_transfer_start_wifi_simulator_config():
    """Verify config_json with WI-FI simulator block is accepted and passed to transfer manager."""
    import json
    cfg = {
        "server_file_path": "test_files/small.txt",
        "protocol": "gbn",
        "packet_size": 1024,
        "timeout": 1.5,
        "adaptive_timeout": True,
        "window_size": 8,
        "max_retries": 15,
        "simulator": {
            # WI-FI preset values (matching backend WIFI preset)
            "loss_rate": 0.02,
            "corruption_rate": 0.01,
            "delay_ms": 15.0,
            "jitter_ms": 5.0,
            "duplicate_rate": 0.01,
            "reorder_rate": 0.01,
        },
    }
    with patch("main.transfer_manager.start_transfer", return_value="mock-wifi-transfer") as mock_start:
        response = client.post("/api/transfer/start", data={"config_json": json.dumps(cfg)})
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "started"
        assert data.get("transfer_id") == "mock-wifi-transfer"
        assert mock_start.called
        kwargs = mock_start.call_args.kwargs
        assert kwargs["protocol"] == "gbn"
        assert kwargs["window_size"] == 8
        assert kwargs["simulator_config"].loss_rate == 0.02
        assert kwargs["simulator_config"].delay_ms == 15.0


