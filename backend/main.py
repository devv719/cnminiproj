"""
FastAPI Main Application for Reliable UDP Lab.
Provides RESTful APIs, background transfer orchestration, and WebSocket streaming of network events.
"""
import asyncio
import io
import json
import os
import shutil
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse, Response, FileResponse
from pydantic import BaseModel, Field

from config import DEFAULT_CONFIG
from protocol.events import EventBus, Event, EventType
from protocol.channel import ChannelConfig, PRESETS
from services.transfer import TransferManager
from services.experiments import ExperimentRunner

app = FastAPI(
    title="Reliable UDP Lab API",
    description="Computer Networks Lab - File Transfer over UDP with Stop-and-Wait, Go-Back-N, and Selective Repeat",
    version="1.0.0",
)

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
global_event_bus = EventBus()
transfer_manager = TransferManager(event_bus=global_event_bus)
experiment_runner = ExperimentRunner()


# Ensure test files exist
from create_test_files import create_test_files
try:
    create_test_files("test_files")
    create_test_files(os.path.join(os.path.dirname(__file__), "test_files"))
    create_test_files(os.path.join(os.path.dirname(os.path.dirname(__file__)), "test_files"))
except Exception:
    pass


def resolve_file_path(path_str: Optional[str]) -> Optional[str]:
    if not path_str:
        return None
    if os.path.isabs(path_str) and os.path.isfile(path_str):
        return path_str
    
    candidates = [
        path_str,
        os.path.join(os.getcwd(), path_str),
        os.path.join(os.path.dirname(__file__), path_str),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), path_str),
        os.path.join(os.getcwd(), "test_files", os.path.basename(path_str)),
        os.path.join(os.path.dirname(__file__), "test_files", os.path.basename(path_str)),
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "test_files", os.path.basename(path_str)),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return os.path.abspath(c)
    return None


# --- Pydantic Request Models ---

class SimulatorConfigRequest(BaseModel):
    loss_rate: float = Field(0.0, ge=0.0, le=0.50)
    corruption_rate: float = Field(0.0, ge=0.0, le=0.50)
    delay_ms: float = Field(0.0, ge=0.0, le=2000.0)
    jitter_ms: float = Field(0.0, ge=0.0, le=500.0)
    duplicate_rate: float = Field(0.0, ge=0.0, le=0.20)
    reorder_rate: float = Field(0.0, ge=0.0, le=0.20)
    seed: Optional[int] = None


class TransferStartRequest(BaseModel):
    server_file_path: Optional[str] = None
    protocol: str = "saw"
    packet_size: int = 1024
    timeout: float = 1.0
    adaptive_timeout: bool = True
    window_size: int = 4
    max_retries: int = 15
    simulator: SimulatorConfigRequest = Field(default_factory=SimulatorConfigRequest)


class ExperimentRunRequest(BaseModel):
    experiment_type: str
    seed: int = 42


# --- REST Endpoints ---

@app.get("/api/health")
def health_check():
    return {"status": "ok", "service": "Reliable UDP Lab Backend"}


@app.get("/api/profiles")
def get_profiles():
    return {k: v.to_dict() for k, v in PRESETS.items()}


@app.post("/api/transfer/start")
async def start_transfer(
    file: Optional[UploadFile] = File(None),
    config_json: Optional[str] = Form(None),
):
    """
    Starts a file transfer. Accepts either multipart uploaded file or server file path in config_json.
    """
    if config_json:
        try:
            cfg_dict = json.loads(config_json)
            req = TransferStartRequest(**cfg_dict)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid config JSON: {e}")
    else:
        req = TransferStartRequest()

    if file:
        file_bytes = await file.read()
        filename = file.filename or "uploaded_file.bin"
    elif req.server_file_path:
        resolved_path = resolve_file_path(req.server_file_path)
        if not resolved_path:
            raise HTTPException(status_code=404, detail=f"File not found: {req.server_file_path}")
        with open(resolved_path, "rb") as f:
            file_bytes = f.read()
        filename = os.path.basename(resolved_path)
    else:
        # Default fallback to sample test file
        resolved_default = resolve_file_path("test_files/small.txt")
        if resolved_default:
            with open(resolved_default, "rb") as f:
                file_bytes = f.read()
            filename = "small.txt"
        else:
            file_bytes = b"Hello from Reliable UDP Lab! " * 50
            filename = "sample.txt"

    sim_config = ChannelConfig(
        loss_rate=req.simulator.loss_rate,
        corruption_rate=req.simulator.corruption_rate,
        delay_ms=req.simulator.delay_ms,
        jitter_ms=req.simulator.jitter_ms,
        duplicate_rate=req.simulator.duplicate_rate,
        reorder_rate=req.simulator.reorder_rate,
        seed=req.simulator.seed,
    )

    try:
        transfer_id = transfer_manager.start_transfer(
            file_bytes=file_bytes,
            filename=filename,
            protocol=req.protocol,
            packet_size=req.packet_size,
            timeout=req.timeout,
            adaptive_timeout=req.adaptive_timeout,
            window_size=req.window_size,
            max_retries=req.max_retries,
            simulator_config=sim_config,
        )
        return {"status": "started", "transfer_id": transfer_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/transfer/stop")
def stop_transfer():
    stopped = transfer_manager.stop_transfer()
    return {"status": "stopped" if stopped else "no_active_transfer"}


@app.get("/api/transfer/status")
def get_transfer_status():
    return transfer_manager.get_status()


@app.get("/api/transfer/result")
def get_transfer_result(transfer_id: Optional[str] = Query(None)):
    res = transfer_manager.get_result(transfer_id)
    if not res:
        raise HTTPException(status_code=404, detail="No result found")
    return res


@app.get("/api/simulator/config")
def get_simulator_config():
    if transfer_manager.active_channel:
        return transfer_manager.active_channel.config.to_dict()
    return PRESETS.get("LAN", ChannelConfig()).to_dict()


@app.post("/api/simulator/config")
def update_simulator_config(req: SimulatorConfigRequest):
    cfg = ChannelConfig(
        loss_rate=req.loss_rate,
        corruption_rate=req.corruption_rate,
        delay_ms=req.delay_ms,
        jitter_ms=req.jitter_ms,
        duplicate_rate=req.duplicate_rate,
        reorder_rate=req.reorder_rate,
        seed=req.seed,
    )
    success = transfer_manager.update_simulator_config(cfg)
    return {"status": "updated" if success else "simulator_inactive", "config": cfg.to_dict()}


@app.get("/api/experiments/types")
def get_experiment_types():
    return experiment_runner.list_experiment_types()


@app.post("/api/experiments/run")
def run_experiment(req: ExperimentRunRequest):
    try:
        exp_id = experiment_runner.run_experiment_async(
            experiment_type=req.experiment_type,
            seed=req.seed,
        )
        return {"status": "running", "experiment_id": exp_id}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/experiments/status")
def get_experiments_status():
    return {
        "is_running": experiment_runner.is_running,
        "progress_pct": round(experiment_runner.progress_pct, 1),
        "active_experiment_id": experiment_runner.active_experiment_id,
        "results": experiment_runner.results,
    }


@app.get("/api/experiments/{experiment_id}")
def get_experiment_by_id(experiment_id: str):
    if experiment_id not in experiment_runner.history:
        if experiment_runner.active_experiment_id == experiment_id:
            return {"status": "running", "progress": experiment_runner.progress_pct}
        raise HTTPException(status_code=404, detail="Experiment ID not found")
    return experiment_runner.history[experiment_id]


@app.get("/api/experiments/{experiment_id}/export")
def export_experiment_csv(experiment_id: str):
    csv_data = experiment_runner.export_csv(experiment_id)
    if not csv_data:
        raise HTTPException(status_code=404, detail="Experiment export data not found")
    return PlainTextResponse(
        csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=experiment_{experiment_id}.csv"},
    )


@app.get("/api/log/export")
def export_logs(format: str = Query("json")):
    history = global_event_bus.get_history()
    if format == "csv":
        import io, csv
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Timestamp", "Type", "Seq", "Ack", "Attempt", "Direction", "RTT", "Message"])
        for ev in history:
            writer.writerow([ev.timestamp, ev.event_type.value, ev.seq, ev.ack, ev.attempt, ev.direction, ev.rtt, ev.message])
        return PlainTextResponse(
            output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=event_logs.csv"},
        )
    return [ev.to_dict() for ev in history]


@app.get("/api/download/{transfer_id}")
def download_file(transfer_id: str):
    res = transfer_manager.get_result(transfer_id)
    if not res:
        raise HTTPException(status_code=404, detail="Transfer not found")

    filename = res.get("config", {}).get("filename", "downloaded.bin")
    received_path = os.path.join(DEFAULT_CONFIG.received_dir, filename)

    if os.path.isfile(received_path):
        return FileResponse(
            received_path,
            media_type="application/octet-stream",
            filename=filename,
        )

    if transfer_manager.received_file_bytes:
        return Response(
            content=transfer_manager.received_file_bytes,
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    raise HTTPException(status_code=404, detail="Received file content not available")


# --- WebSocket Streaming ---

@app.websocket("/ws/events")
async def websocket_events_endpoint(websocket: WebSocket):
    await websocket.accept()
    queue: asyncio.Queue = asyncio.Queue()
    loop = asyncio.get_running_loop()

    def on_event(ev: Event):
        loop.call_soon_threadsafe(queue.put_nowait, ev)

    unsubscribe = global_event_bus.subscribe(on_event)

    try:
        # Stream events and periodic status snapshot
        while True:
            try:
                # Wait for next event with a 250ms timeout to also push periodic stats
                ev = await asyncio.wait_for(queue.get(), timeout=0.25)
                await websocket.send_json({
                    "kind": "event",
                    "payload": ev.to_dict(),
                })
            except asyncio.TimeoutError:
                # Send periodic status snapshot
                status = transfer_manager.get_status()
                await websocket.send_json({
                    "kind": "snapshot",
                    "payload": status,
                })
    except (WebSocketDisconnect, Exception):
        pass
    finally:
        unsubscribe()
