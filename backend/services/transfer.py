"""
Transfer orchestration service (services/transfer.py).
Coordinates background execution of sender, receiver, and network proxy channel.
Maintains thread safety, real-time event broadcasting, and live simulator configuration.
"""
import os
import threading
import time
import uuid
from typing import Optional, Dict, Any, Tuple

from config import DEFAULT_CONFIG
from protocol.events import EventBus, Event, EventType
from protocol.channel import NetworkChannel, ChannelConfig, PRESETS
from protocol.stop_and_wait import StopAndWaitSender, StopAndWaitReceiver
from protocol.go_back_n import GoBackNSender, GoBackNReceiver
from protocol.selective_repeat import SelectiveRepeatSender, SelectiveRepeatReceiver
from services.statistics import TransferStats


class TransferManager:
    def __init__(self, event_bus: Optional[EventBus] = None):
        self.event_bus = event_bus or EventBus()
        self.active_transfer_id: Optional[str] = None
        self.active_channel: Optional[NetworkChannel] = None
        self.active_sender = None
        self.active_receiver = None
        self.active_stats: Optional[TransferStats] = None
        self.active_config: Dict[str, Any] = {}
        self.received_file_bytes: Optional[bytes] = None

        self._transfer_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._history: Dict[str, Dict[str, Any]] = {}

    def is_running(self) -> bool:
        with self._lock:
            return (
                self._transfer_thread is not None
                and self._transfer_thread.is_alive()
                and self.active_stats is not None
                and self.active_stats.status == "running"
            )

    def start_transfer(
        self,
        file_bytes: bytes,
        filename: str,
        protocol: str = "saw",
        packet_size: int = 1024,
        timeout: float = 1.0,
        adaptive_timeout: bool = True,
        window_size: int = 4,
        max_retries: int = 15,
        simulator_config: Optional[ChannelConfig] = None,
    ) -> str:
        with self._lock:
            if self.is_running():
                raise RuntimeError("A transfer is already running. Please stop it first.")

            transfer_id = str(uuid.uuid4())[:8]
            self.active_transfer_id = transfer_id
            self.received_file_bytes = None
            sim_cfg = simulator_config or ChannelConfig()

            # 1. Setup Network Simulator Proxy
            self.active_channel = NetworkChannel(
                listen_host=DEFAULT_CONFIG.proxy_host,
                listen_port=DEFAULT_CONFIG.proxy_port,
                dest_host=DEFAULT_CONFIG.receiver_host,
                dest_port=DEFAULT_CONFIG.receiver_port,
                config=sim_cfg,
                event_bus=self.event_bus,
            )

            # 2. Setup Receiver
            if protocol == "saw":
                self.active_receiver = StopAndWaitReceiver(
                    listen_host=DEFAULT_CONFIG.receiver_host,
                    listen_port=DEFAULT_CONFIG.receiver_port,
                    event_bus=self.event_bus,
                    output_dir=DEFAULT_CONFIG.received_dir,
                )
                self.active_sender = StopAndWaitSender(
                    dest_host=DEFAULT_CONFIG.proxy_host,
                    dest_port=DEFAULT_CONFIG.proxy_port,
                    packet_size=packet_size,
                    timeout=timeout,
                    adaptive_timeout=adaptive_timeout,
                    max_retries=max_retries,
                    event_bus=self.event_bus,
                )
            elif protocol == "gbn":
                self.active_receiver = GoBackNReceiver(
                    listen_host=DEFAULT_CONFIG.receiver_host,
                    listen_port=DEFAULT_CONFIG.receiver_port,
                    event_bus=self.event_bus,
                    output_dir=DEFAULT_CONFIG.received_dir,
                )
                self.active_sender = GoBackNSender(
                    dest_host=DEFAULT_CONFIG.proxy_host,
                    dest_port=DEFAULT_CONFIG.proxy_port,
                    packet_size=packet_size,
                    window_size=window_size,
                    timeout=timeout,
                    adaptive_timeout=adaptive_timeout,
                    max_retries=max_retries,
                    event_bus=self.event_bus,
                )
            elif protocol == "sr":
                self.active_receiver = SelectiveRepeatReceiver(
                    listen_host=DEFAULT_CONFIG.receiver_host,
                    listen_port=DEFAULT_CONFIG.receiver_port,
                    window_size=window_size,
                    event_bus=self.event_bus,
                    output_dir=DEFAULT_CONFIG.received_dir,
                )
                self.active_sender = SelectiveRepeatSender(
                    dest_host=DEFAULT_CONFIG.proxy_host,
                    dest_port=DEFAULT_CONFIG.proxy_port,
                    packet_size=packet_size,
                    window_size=window_size,
                    timeout=timeout,
                    adaptive_timeout=adaptive_timeout,
                    max_retries=max_retries,
                    event_bus=self.event_bus,
                )
            else:
                raise ValueError(f"Unsupported protocol: {protocol}")

            self.active_stats = self.active_sender.stats
            self.active_config = {
                "transfer_id": transfer_id,
                "protocol": protocol,
                "filename": filename,
                "file_size": len(file_bytes),
                "packet_size": packet_size,
                "timeout": timeout,
                "adaptive_timeout": adaptive_timeout,
                "window_size": window_size,
                "max_retries": max_retries,
                "simulator": sim_cfg.to_dict(),
            }

            # 3. Launch background execution
            self._transfer_thread = threading.Thread(
                target=self._run_transfer_workflow,
                args=(file_bytes, filename),
                daemon=True,
            )
            self._transfer_thread.start()

            return transfer_id

    def _run_transfer_workflow(self, file_bytes: bytes, filename: str) -> None:
        try:
            # Start channel proxy
            self.active_channel.start()
            time.sleep(0.05)

            # Start receiver in separate thread
            recv_result_holder = []
            recv_thread = threading.Thread(
                target=lambda: recv_result_holder.append(
                    self.active_receiver.listen_and_receive(timeout_seconds=600.0)
                ),
                daemon=True,
            )
            recv_thread.start()
            time.sleep(0.05)

            # Run sender
            sender_stats = self.active_sender.send_data(file_bytes, filename=filename)
            recv_thread.join(timeout=10.0)

            if recv_result_holder:
                self.received_file_bytes, receiver_stats = recv_result_holder[0]
                # Merge verification and receiver-side stats into active_stats
                self.active_stats.reconstructed_sha256 = receiver_stats.reconstructed_sha256
                self.active_stats.verified = receiver_stats.verified
                self.active_stats.duplicates_detected = receiver_stats.duplicates_detected
                self.active_stats.corrupted_detected = receiver_stats.corrupted_detected
                self.active_stats.out_of_order_buffered = receiver_stats.out_of_order_buffered

        except Exception as e:
            if self.active_stats:
                self.active_stats.status = "failed"
                self.active_stats.error_message = str(e)
        finally:
            if self.active_channel:
                self.active_channel.stop()
            with self._lock:
                if self.active_transfer_id and self.active_stats:
                    self._history[self.active_transfer_id] = {
                        "config": dict(self.active_config),
                        "stats": self.active_stats.to_dict(),
                    }

    def stop_transfer(self) -> bool:
        with self._lock:
            if not self.is_running():
                return False
            if self.active_sender:
                self.active_sender.stop()
            if self.active_receiver:
                self.active_receiver.stop()
            if self.active_channel:
                self.active_channel.stop()
            return True

    def update_simulator_config(self, config: ChannelConfig) -> bool:
        with self._lock:
            if self.active_channel:
                self.active_channel.set_config(config)
                self.active_config["simulator"] = config.to_dict()
                return True
            return False

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            if not self.active_stats:
                return {"status": "idle", "active_transfer_id": None}
            return {
                "active_transfer_id": self.active_transfer_id,
                "is_running": self.is_running(),
                "config": self.active_config,
                "stats": self.active_stats.to_dict(),
            }

    def get_result(self, transfer_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        with self._lock:
            target_id = transfer_id or self.active_transfer_id
            if not target_id:
                return None
            if target_id in self._history:
                return self._history[target_id]
            if self.active_stats and self.active_transfer_id == target_id:
                return {
                    "config": self.active_config,
                    "stats": self.active_stats.to_dict(),
                }
            return None
