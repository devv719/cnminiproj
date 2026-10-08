"""
Network Condition Simulator / UDP Proxy (protocol/channel.py).
Acts as a real bidirectional UDP proxy between sender and receiver.
Simulates packet loss, corruption, delay, jitter, duplicates, and reordering.
"""
from dataclasses import dataclass, field
import heapq
import random
import socket
import struct
import threading
import time
from typing import Optional, Tuple, Dict, Any, List

from protocol.checksum import corrupt_bytes
from protocol.events import EventBus, Event, EventType
from protocol.packet import Packet, PacketType
from protocol.base import _apply_udp_connreset


@dataclass
class ChannelConfig:
    loss_rate: float = 0.0          # 0.0 to 0.50
    corruption_rate: float = 0.0    # 0.0 to 0.50
    delay_ms: float = 0.0           # 0 to 2000 ms
    jitter_ms: float = 0.0          # 0 to 500 ms
    duplicate_rate: float = 0.0     # 0.0 to 0.20
    reorder_rate: float = 0.0       # 0.0 to 0.20
    seed: Optional[int] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "loss_rate": self.loss_rate,
            "corruption_rate": self.corruption_rate,
            "delay_ms": self.delay_ms,
            "jitter_ms": self.jitter_ms,
            "duplicate_rate": self.duplicate_rate,
            "reorder_rate": self.reorder_rate,
            "seed": self.seed,
        }


PRESETS: Dict[str, ChannelConfig] = {
    "LAN": ChannelConfig(loss_rate=0.0, corruption_rate=0.0, delay_ms=1.0, jitter_ms=0.5, duplicate_rate=0.0, reorder_rate=0.0),
    "WIFI": ChannelConfig(loss_rate=0.02, corruption_rate=0.01, delay_ms=15.0, jitter_ms=5.0, duplicate_rate=0.01, reorder_rate=0.01),
    "POOR": ChannelConfig(loss_rate=0.15, corruption_rate=0.05, delay_ms=120.0, jitter_ms=40.0, duplicate_rate=0.03, reorder_rate=0.05),
    "SATELLITE": ChannelConfig(loss_rate=0.03, corruption_rate=0.01, delay_ms=600.0, jitter_ms=50.0, duplicate_rate=0.0, reorder_rate=0.0),
    "CUSTOM": ChannelConfig(),
}


class NetworkChannel:
    """
    Bidirectional UDP Proxy that applies configurable impairments.
    
    Forward Path:  Sender -> Proxy (listen_port) -> Receiver (dest_port)
    Reverse Path:  Receiver -> Proxy -> Sender (dynamically discovered sender_addr)
    """
    def __init__(
        self,
        listen_host: str = "127.0.0.1",
        listen_port: int = 9000,
        dest_host: str = "127.0.0.1",
        dest_port: int = 9001,
        config: Optional[ChannelConfig] = None,
        event_bus: Optional[EventBus] = None,
    ):
        self.listen_host = listen_host
        self.listen_port = listen_port
        self.dest_host = dest_host
        self.dest_port = dest_port
        self.config = config or ChannelConfig()
        self.event_bus = event_bus or EventBus()

        self._rng = random.Random(self.config.seed)
        self.sock: Optional[socket.socket] = None
        self._sender_addr: Optional[Tuple[str, int]] = None
        self._receiver_addr: Tuple[str, int] = (dest_host, dest_port)

        self._stop_event = threading.Event()
        self._thread: Optional[threading.Thread] = None
        self._delayed_queue: List[Tuple[float, bytes, Tuple[str, int], str, Optional[int]]] = []
        self._delayed_lock = threading.Lock()
        self._reorder_buffer: Optional[Tuple[bytes, Tuple[str, int], str, Optional[int]]] = None

    def set_config(self, config: ChannelConfig) -> None:
        """Updates channel configuration dynamically at runtime."""
        self.config = config
        if config.seed is not None:
            self._rng = random.Random(config.seed)

    def start(self) -> None:
        """Starts the proxy loop in a background thread."""
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        _apply_udp_connreset(self.sock)
        self.sock.bind((self.listen_host, self.listen_port))
        self.sock.settimeout(0.005)

        self._stop_event.clear()
        self._thread = threading.Thread(target=self._proxy_loop, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        """Stops the proxy."""
        self._stop_event.set()
        if self._thread:
            self._thread.join(timeout=1.0)
            self._thread = None
        if self.sock:
            try:
                self.sock.close()
            except Exception:
                pass
            self.sock = None

    def _proxy_loop(self) -> None:
        while not self._stop_event.is_set():
            # 1. Dispatch any due delayed packets
            now = time.time()
            with self._delayed_lock:
                due_packets = []
                remaining = []
                for item in self._delayed_queue:
                    deliver_time, datagram, target, direction, seq = item
                    if deliver_time <= now:
                        due_packets.append((datagram, target, direction, seq))
                    else:
                        remaining.append(item)
                self._delayed_queue = remaining

            for datagram, target, direction, seq in due_packets:
                if self.sock and target:
                    try:
                        self.sock.sendto(datagram, target)
                    except Exception:
                        pass

            # 2. Receive incoming datagram
            try:
                data, addr = self.sock.recvfrom(65535)
            except (socket.timeout, OSError):
                continue

            # Determine routing direction: if source port matches receiver's listen port, it's reverse
            is_from_receiver = (addr[1] == self.dest_port)

            if is_from_receiver:
                direction = "reverse"
                target_addr = self._sender_addr
            else:
                direction = "forward"
                self._sender_addr = addr
                target_addr = self._receiver_addr

            if not target_addr:
                continue

            # Parse packet header if possible for event logging
            seq, ack, pkt_type_str = None, None, None
            try:
                pkt = Packet.unpack(data)
                seq = pkt.seq
                ack = pkt.ack
                pkt_type_str = pkt.pkt_type.name
            except Exception:
                pass

            # 3. Apply Simulated Impairments
            self._process_packet(data, target_addr, direction, seq, ack, pkt_type_str)

    def _process_packet(
        self,
        data: bytes,
        target_addr: Tuple[str, int],
        direction: str,
        seq: Optional[int],
        ack: Optional[int],
        pkt_type_str: Optional[str],
    ) -> None:
        # A. Packet Loss
        if self.config.loss_rate > 0 and self._rng.random() < self.config.loss_rate:
            self.event_bus.emit(
                Event(
                    event_type=EventType.PACKET_LOST,
                    seq=seq if direction == "forward" else None,
                    ack=ack if direction == "reverse" else None,
                    pkt_type=pkt_type_str,
                    direction=direction,
                    message=f"SIMULATOR: Dropped {pkt_type_str or 'packet'} ({direction})",
                )
            )
            return  # Dropped

        # B. Packet Corruption
        out_data = data
        if self.config.corruption_rate > 0 and self._rng.random() < self.config.corruption_rate:
            out_data = corrupt_bytes(data, 1.0)
            self.event_bus.emit(
                Event(
                    event_type=EventType.PACKET_CORRUPTED,
                    seq=seq if direction == "forward" else None,
                    ack=ack if direction == "reverse" else None,
                    pkt_type=pkt_type_str,
                    direction=direction,
                    message=f"SIMULATOR: Corrupted bits in {pkt_type_str or 'packet'} ({direction})",
                )
            )

        # C. Calculate Transmission Delay + Jitter
        delay_s = self.config.delay_ms / 1000.0
        if self.config.jitter_ms > 0:
            jitter_range = self.config.jitter_ms / 1000.0
            delay_s += self._rng.uniform(-jitter_range, jitter_range)
        delay_s = max(0.0, delay_s)

        # D. Reordering Simulation
        if self.config.reorder_rate > 0 and self._rng.random() < self.config.reorder_rate:
            if self._reorder_buffer is None:
                # Hold this packet back
                self._reorder_buffer = (out_data, target_addr, direction, seq)
                self.event_bus.emit(
                    Event(
                        event_type=EventType.PACKET_REORDERED,
                        seq=seq,
                        direction=direction,
                        message=f"SIMULATOR: Holding packet seq={seq} back for reordering",
                    )
                )
                return

        # Deliver held reordered packet first if present
        if self._reorder_buffer is not None:
            buf_data, buf_target, buf_dir, buf_seq = self._reorder_buffer
            self._reorder_buffer = None
            self._schedule_delivery(buf_data, buf_target, buf_dir, buf_seq, delay_s + 0.005)

        # E. Duplicate Simulation
        if self.config.duplicate_rate > 0 and self._rng.random() < self.config.duplicate_rate:
            self.event_bus.emit(
                Event(
                    event_type=EventType.PACKET_DUPLICATED,
                    seq=seq,
                    direction=direction,
                    message=f"SIMULATOR: Duplicating {pkt_type_str or 'packet'} seq={seq}",
                )
            )
            # Deliver original and duplicate back-to-back
            self._schedule_delivery(out_data, target_addr, direction, seq, delay_s)
            self._schedule_delivery(out_data, target_addr, direction, seq, delay_s + 0.001)
            return

        # Normal Scheduled Delivery
        self._schedule_delivery(out_data, target_addr, direction, seq, delay_s)

    def _schedule_delivery(
        self,
        data: bytes,
        target_addr: Tuple[str, int],
        direction: str,
        seq: Optional[int],
        delay_s: float,
    ) -> None:
        if delay_s <= 0.001:
            if self.sock and target_addr:
                try:
                    self.sock.sendto(data, target_addr)
                except Exception:
                    pass
        else:
            deliver_time = time.time() + delay_s
            with self._delayed_lock:
                self._delayed_queue.append((deliver_time, data, target_addr, direction, seq))
