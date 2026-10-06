"""
Automated Multi-Run Experiments Engine (services/experiments.py).
Conducts parameter sweeps, records reproducible series, and exports CSV/JSON data.
"""
import csv
import io
import threading
import time
import uuid
from typing import Dict, Any, List, Optional

from protocol.channel import NetworkChannel, ChannelConfig, PRESETS
from protocol.stop_and_wait import StopAndWaitSender, StopAndWaitReceiver
from protocol.go_back_n import GoBackNSender, GoBackNReceiver
from protocol.selective_repeat import SelectiveRepeatSender, SelectiveRepeatReceiver
from protocol.events import EventBus


class ExperimentRunner:
    def __init__(self):
        self.active_experiment_id: Optional[str] = None
        self.is_running: bool = False
        self.progress_pct: float = 0.0
        self.results: Dict[str, Any] = {}
        self.history: Dict[str, Dict[str, Any]] = {}
        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None

    def list_experiment_types(self) -> List[Dict[str, str]]:
        return [
            {
                "id": "loss_sweep",
                "name": "Effect of Packet Loss on Throughput & Retransmissions",
                "description": "Sweeps packet loss from 0% to 30% across SAW, GBN, and SR protocols.",
            },
            {
                "id": "delay_sweep",
                "name": "Effect of Network Latency on Protocol Performance",
                "description": "Evaluates how propagation delay (10ms to 500ms) impacts pipelined vs Stop-and-Wait throughput.",
            },
            {
                "id": "packet_size_sweep",
                "name": "Effect of Packet Size on Transfer Efficiency",
                "description": "Sweeps packet payload sizes (256B to 4096B) and analyzes protocol overhead.",
            },
            {
                "id": "protocol_comparison",
                "name": "Stop-and-Wait vs Go-Back-N vs Selective Repeat",
                "description": "Direct side-by-side benchmark of all three ARQ protocols under identical lossy conditions.",
            },
            {
                "id": "corruption_sweep",
                "name": "Effect of Checksum Bit Corruption",
                "description": "Tests CRC32 error detection and retransmission overhead under bit error rates.",
            },
            {
                "id": "timeout_comparison",
                "name": "Fixed Timeout vs Adaptive RTT Timeout (Jacobson/Karels)",
                "description": "Compares static timeout vs RFC 6298 adaptive timeout on high-jitter networks.",
            },
        ]

    def run_experiment_async(
        self,
        experiment_type: str,
        file_bytes: Optional[bytes] = None,
        seed: int = 42,
    ) -> str:
        if self.is_running:
            raise RuntimeError("An experiment is currently in progress.")

        experiment_id = str(uuid.uuid4())[:8]
        self.active_experiment_id = experiment_id
        self.is_running = True
        self.progress_pct = 0.0
        self._stop_event.clear()

        # Default test payload if none provided: 50 KB pattern data
        if file_bytes is None:
            file_bytes = b"".join(bytes([i % 256 for i in range(1024)]) for _ in range(50))

        self._thread = threading.Thread(
            target=self._execute_experiment,
            args=(experiment_id, experiment_type, file_bytes, seed),
            daemon=True,
        )
        self._thread.start()
        return experiment_id

    def stop(self) -> None:
        self._stop_event.set()

    def _execute_experiment(
        self, experiment_id: str, experiment_type: str, file_bytes: bytes, seed: int
    ) -> None:
        try:
            if experiment_type == "loss_sweep":
                data = self._run_loss_sweep(file_bytes, seed)
            elif experiment_type == "delay_sweep":
                data = self._run_delay_sweep(file_bytes, seed)
            elif experiment_type == "packet_size_sweep":
                data = self._run_packet_size_sweep(file_bytes, seed)
            elif experiment_type == "protocol_comparison":
                data = self._run_protocol_comparison(file_bytes, seed)
            elif experiment_type == "corruption_sweep":
                data = self._run_corruption_sweep(file_bytes, seed)
            elif experiment_type == "timeout_comparison":
                data = self._run_timeout_comparison(file_bytes, seed)
            else:
                data = {"error": f"Unknown experiment type {experiment_type}"}

            result_entry = {
                "experiment_id": experiment_id,
                "type": experiment_type,
                "completed_at": time.time(),
                "data": data,
            }
            self.results = result_entry
            self.history[experiment_id] = result_entry

        except Exception as e:
            self.results = {
                "experiment_id": experiment_id,
                "type": experiment_type,
                "error": str(e),
            }
        finally:
            self.is_running = False
            self.progress_pct = 100.0

    def _single_run(
        self,
        protocol: str,
        file_bytes: bytes,
        sim_config: ChannelConfig,
        packet_size: int = 1024,
        window_size: int = 4,
        timeout: float = 0.3,
        adaptive_timeout: bool = True,
        base_port: int = 9400,
    ) -> Dict[str, Any]:
        proxy_port = base_port
        recv_port = base_port + 1

        channel = NetworkChannel(
            listen_host="127.0.0.1",
            listen_port=proxy_port,
            dest_host="127.0.0.1",
            dest_port=recv_port,
            config=sim_config,
        )

        if protocol == "saw":
            receiver = StopAndWaitReceiver(listen_host="127.0.0.1", listen_port=recv_port)
            sender = StopAndWaitSender(
                dest_host="127.0.0.1",
                dest_port=proxy_port,
                packet_size=packet_size,
                timeout=timeout,
                adaptive_timeout=adaptive_timeout,
                max_retries=20,
            )
        elif protocol == "gbn":
            receiver = GoBackNReceiver(listen_host="127.0.0.1", listen_port=recv_port)
            sender = GoBackNSender(
                dest_host="127.0.0.1",
                dest_port=proxy_port,
                packet_size=packet_size,
                window_size=window_size,
                timeout=timeout,
                adaptive_timeout=adaptive_timeout,
                max_retries=20,
            )
        elif protocol == "sr":
            receiver = SelectiveRepeatReceiver(listen_host="127.0.0.1", listen_port=recv_port, window_size=window_size)
            sender = SelectiveRepeatSender(
                dest_host="127.0.0.1",
                dest_port=proxy_port,
                packet_size=packet_size,
                window_size=window_size,
                timeout=timeout,
                adaptive_timeout=adaptive_timeout,
                max_retries=20,
            )
        else:
            raise ValueError(f"Unknown protocol: {protocol}")

        channel.start()
        time.sleep(0.02)

        recv_res = []
        t_recv = threading.Thread(
            target=lambda: recv_res.append(receiver.listen_and_receive(timeout_seconds=30.0)),
            daemon=True,
        )
        t_recv.start()
        time.sleep(0.02)

        try:
            stats = sender.send_data(file_bytes, filename="exp_test.bin")
            t_recv.join(timeout=15.0)
        finally:
            channel.stop()

        return stats.to_dict()

    # --- Sweep Implementations ---

    def _run_loss_sweep(self, file_bytes: bytes, seed: int) -> Dict[str, Any]:
        loss_rates = [0.0, 0.05, 0.10, 0.15, 0.20, 0.30]
        protocols = ["saw", "gbn", "sr"]
        series: Dict[str, List[Dict[str, Any]]] = {p: [] for p in protocols}

        total_steps = len(loss_rates) * len(protocols)
        step = 0

        for loss in loss_rates:
            for proto in protocols:
                if self._stop_event.is_set():
                    break
                cfg = ChannelConfig(loss_rate=loss, delay_ms=15.0, seed=seed)
                res = self._single_run(proto, file_bytes, cfg, packet_size=512)
                series[proto].append({
                    "loss_percent": int(loss * 100),
                    "throughput_mbps": res["throughput_mbps"],
                    "retransmissions": res["retransmissions"],
                    "efficiency": res["protocol_efficiency"],
                    "duration_s": res["duration_seconds"],
                })
                step += 1
                self.progress_pct = (step / total_steps) * 100.0

        return {"parameter": "loss_percent", "series": series}

    def _run_delay_sweep(self, file_bytes: bytes, seed: int) -> Dict[str, Any]:
        delays = [5.0, 25.0, 50.0, 100.0, 200.0, 400.0]
        protocols = ["saw", "gbn", "sr"]
        series: Dict[str, List[Dict[str, Any]]] = {p: [] for p in protocols}

        total_steps = len(delays) * len(protocols)
        step = 0

        for delay in delays:
            for proto in protocols:
                if self._stop_event.is_set():
                    break
                cfg = ChannelConfig(loss_rate=0.02, delay_ms=delay, seed=seed)
                res = self._single_run(proto, file_bytes, cfg, packet_size=512, window_size=6, timeout=max(0.2, delay * 4 / 1000.0))
                series[proto].append({
                    "delay_ms": delay,
                    "throughput_mbps": res["throughput_mbps"],
                    "avg_rtt_ms": res["avg_rtt_ms"],
                    "efficiency": res["protocol_efficiency"],
                    "duration_s": res["duration_seconds"],
                })
                step += 1
                self.progress_pct = (step / total_steps) * 100.0

        return {"parameter": "delay_ms", "series": series}

    def _run_packet_size_sweep(self, file_bytes: bytes, seed: int) -> Dict[str, Any]:
        sizes = [256, 512, 1024, 2048, 4096]
        series = []
        total_steps = len(sizes)

        for i, sz in enumerate(sizes):
            if self._stop_event.is_set():
                break
            cfg = ChannelConfig(loss_rate=0.03, delay_ms=10.0, seed=seed)
            res = self._single_run("sr", file_bytes, cfg, packet_size=sz, window_size=4)
            series.append({
                "packet_size_bytes": sz,
                "throughput_mbps": res["throughput_mbps"],
                "total_packets": res["total_data_packets"],
                "efficiency": res["protocol_efficiency"],
                "duration_s": res["duration_seconds"],
            })
            self.progress_pct = ((i + 1) / total_steps) * 100.0

        return {"parameter": "packet_size_bytes", "series": series}

    def _run_protocol_comparison(self, file_bytes: bytes, seed: int) -> Dict[str, Any]:
        protocols = ["saw", "gbn", "sr"]
        cfg = ChannelConfig(loss_rate=0.10, corruption_rate=0.02, delay_ms=30.0, jitter_ms=10.0, seed=seed)
        comparison = []

        for i, proto in enumerate(protocols):
            if self._stop_event.is_set():
                break
            res = self._single_run(proto, file_bytes, cfg, packet_size=512, window_size=6, timeout=0.3)
            comparison.append({
                "protocol": proto.upper(),
                "throughput_mbps": res["throughput_mbps"],
                "duration_seconds": res["duration_seconds"],
                "retransmissions": res["retransmissions"],
                "protocol_efficiency": res["protocol_efficiency"],
                "theoretical_saw_efficiency": res["theoretical_saw_efficiency"],
                "verified": res["verified"],
            })
            self.progress_pct = ((i + 1) / len(protocols)) * 100.0

        return {"comparison": comparison, "conditions": cfg.to_dict()}

    def _run_corruption_sweep(self, file_bytes: bytes, seed: int) -> Dict[str, Any]:
        corruption_rates = [0.0, 0.02, 0.05, 0.10, 0.15]
        series = []

        for i, corr in enumerate(corruption_rates):
            if self._stop_event.is_set():
                break
            cfg = ChannelConfig(corruption_rate=corr, delay_ms=10.0, seed=seed)
            res = self._single_run("sr", file_bytes, cfg, packet_size=512)
            series.append({
                "corruption_percent": int(corr * 100),
                "corrupted_detected": res["corrupted_detected"],
                "throughput_mbps": res["throughput_mbps"],
                "retransmissions": res["retransmissions"],
                "efficiency": res["protocol_efficiency"],
            })
            self.progress_pct = ((i + 1) / len(corruption_rates)) * 100.0

        return {"parameter": "corruption_percent", "series": series}

    def _run_timeout_comparison(self, file_bytes: bytes, seed: int) -> Dict[str, Any]:
        jitters = [5.0, 20.0, 50.0, 100.0]
        series_fixed = []
        series_adaptive = []

        total_steps = len(jitters) * 2
        step = 0

        for jit in jitters:
            cfg = ChannelConfig(loss_rate=0.05, delay_ms=50.0, jitter_ms=jit, seed=seed)
            # Fixed timeout
            res_fixed = self._single_run("sr", file_bytes, cfg, timeout=0.15, adaptive_timeout=False)
            series_fixed.append({"jitter_ms": jit, "throughput_mbps": res_fixed["throughput_mbps"], "timeouts": res_fixed["timeouts"]})
            step += 1
            self.progress_pct = (step / total_steps) * 100.0

            # Adaptive timeout
            res_adapt = self._single_run("sr", file_bytes, cfg, timeout=0.15, adaptive_timeout=True)
            series_adaptive.append({"jitter_ms": jit, "throughput_mbps": res_adapt["throughput_mbps"], "timeouts": res_adapt["timeouts"]})
            step += 1
            self.progress_pct = (step / total_steps) * 100.0

        return {"fixed": series_fixed, "adaptive": series_adaptive}

    def export_csv(self, experiment_id: str) -> str:
        if experiment_id not in self.history:
            return ""
        exp = self.history[experiment_id]
        output = io.StringIO()
        writer = csv.writer(output)

        writer.writerow(["Experiment ID", exp["experiment_id"]])
        writer.writerow(["Type", exp["type"]])
        writer.writerow(["Completed At", exp["completed_at"]])
        writer.writerow([])

        data = exp.get("data", {})
        if "series" in data:
            series = data["series"]
            if isinstance(series, dict):
                for proto, points in series.items():
                    writer.writerow([f"Protocol: {proto.upper()}"])
                    if points:
                        writer.writerow(list(points[0].keys()))
                        for pt in points:
                            writer.writerow(list(pt.values()))
                    writer.writerow([])
            elif isinstance(series, list):
                if series:
                    writer.writerow(list(series[0].keys()))
                    for pt in series:
                        writer.writerow(list(pt.values()))
        elif "comparison" in data:
            comp = data["comparison"]
            if comp:
                writer.writerow(list(comp[0].keys()))
                for row in comp:
                    writer.writerow(list(row.values()))

        return output.getvalue()
