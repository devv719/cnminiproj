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
