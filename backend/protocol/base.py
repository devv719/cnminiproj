"""
Base sender and receiver abstractions for Reliable UDP protocols.
Shared socket setup, event emitting, stats recording, and cancellation logic.
"""
from abc import ABC, abstractmethod
import hashlib
import os
import socket
import threading
import time
from typing import Optional, Tuple, Callable

from protocol.packet import Packet, PacketType, CorruptPacketError
from protocol.events import EventBus, Event, EventType
from protocol.rtt import RTTEstimator
from services.statistics import TransferStats


def compute_file_sha256(filepath_or_bytes: bytes | str) -> str:
    """Computes SHA-256 hash of a file path or raw bytes."""
    hasher = hashlib.sha256()
    if isinstance(filepath_or_bytes, bytes):
        hasher.update(filepath_or_bytes)
    else:
        with open(filepath_or_bytes, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
    return hasher.hexdigest()


class BaseSender(ABC):
    def __init__(
        self,
        dest_host: str = "127.0.0.1",
        dest_port: int = 9000,
        packet_size: int = 1024,
        timeout: float = 1.0,
        adaptive_timeout: bool = True,
        max_retries: int = 10,
        event_bus: Optional[EventBus] = None,
        bind_port: int = 0,
    ):
        self.dest_host = dest_host
        self.dest_port = dest_port
        self.packet_size = packet_size
        self.timeout = timeout
        self.adaptive_timeout = adaptive_timeout
        self.max_retries = max_retries
        self.event_bus = event_bus or EventBus()
        self.bind_port = bind_port

        self.stats = TransferStats(
            protocol=self.protocol_name,
            packet_size_bytes=packet_size,
            current_timeout_ms=timeout * 1000.0,
        )
        self.rtt_estimator = RTTEstimator(
            initial_timeout=timeout,
            adaptive=adaptive_timeout,
        )
        self.sock: Optional[socket.socket] = None
        self._stop_flag = threading.Event()

    @property
    @abstractmethod
    def protocol_name(self) -> str:
        pass

    def _setup_socket(self) -> socket.socket:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        # On Windows, ignore ICMP port unreachable so it behaves like real UDP drop
        if hasattr(socket, "SIO_UDP_CONNRESET"):
            try:
                sock.ioctl(socket.SIO_UDP_CONNRESET, False)
            except Exception:
                pass
        sock.bind(("0.0.0.0", self.bind_port))
        sock.settimeout(self.timeout)
        self.sock = sock
        return sock

    def _close_socket(self) -> None:
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None

    def emit_event(
        self,
        event_type: EventType,
        seq: Optional[int] = None,
        ack: Optional[int] = None,
        pkt_type: Optional[str] = None,
        attempt: int = 1,
        direction: str = "forward",
        rtt: Optional[float] = None,
        message: str = "",
        details: Optional[dict] = None,
    ) -> None:
        event = Event(
            event_type=event_type,
            timestamp=time.time(),
            seq=seq,
            ack=ack,
            pkt_type=pkt_type,
            attempt=attempt,
            direction=direction,
            rtt=rtt,
            message=message,
            details=details or {},
        )
        self.event_bus.emit(event)

    def stop(self) -> None:
        self._stop_flag.set()

    @abstractmethod
    def send_data(self, data: bytes, filename: str = "transfer.bin") -> TransferStats:
        """Sends data bytes over UDP and returns completed transfer stats."""
        pass


class BaseReceiver(ABC):
    def __init__(
        self,
        listen_host: str = "0.0.0.0",
        listen_port: int = 9001,
        event_bus: Optional[EventBus] = None,
        output_dir: Optional[str] = None,
    ):
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.event_bus = event_bus or EventBus()
        self.output_dir = output_dir

        self.stats = TransferStats(
            protocol=self.protocol_name,
        )
        self.sock: Optional[socket.socket] = None
        self._stop_flag = threading.Event()

    @property
    @abstractmethod
    def protocol_name(self) -> str:
        pass

    def _setup_socket(self) -> socket.socket:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        if hasattr(socket, "SIO_UDP_CONNRESET"):
            try:
                sock.ioctl(socket.SIO_UDP_CONNRESET, False)
            except Exception:
                pass
        sock.bind((self.listen_host, self.listen_port))
        sock.settimeout(2.0)  # Periodic timeout to check _stop_flag
        self.sock = sock
        return sock

    def _close_socket(self) -> None:
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None

    def emit_event(
        self,
        event_type: EventType,
        seq: Optional[int] = None,
        ack: Optional[int] = None,
        pkt_type: Optional[str] = None,
        attempt: int = 1,
        direction: str = "reverse",
        rtt: Optional[float] = None,
        message: str = "",
        details: Optional[dict] = None,
    ) -> None:
        event = Event(
            event_type=event_type,
            timestamp=time.time(),
            seq=seq,
            ack=ack,
            pkt_type=pkt_type,
            attempt=attempt,
            direction=direction,
            rtt=rtt,
            message=message,
            details=details or {},
        )
        self.event_bus.emit(event)

    def stop(self) -> None:
        self._stop_flag.set()

    @abstractmethod
    def listen_and_receive(self, timeout_seconds: Optional[float] = None) -> Tuple[bytes, TransferStats]:
        """Listens for an incoming transfer, verifies SHA-256 and returns (reconstructed_bytes, stats)."""
        pass
