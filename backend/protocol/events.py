"""
Event system for Reliable UDP Lab.
Provides thread-safe event emitting, listener registration, and structured event formatting.
Used by CLI logs, live WebSocket dashboard streams, and CSV/JSON log exports.
"""
from dataclasses import dataclass, field, asdict
from enum import Enum
import json
import threading
import time
from typing import Callable, List, Optional, Dict, Any


class EventType(str, Enum):
    PACKET_SENT = "packet_sent"
    PACKET_RECEIVED = "packet_received"
    PACKET_LOST = "packet_lost"
    PACKET_CORRUPTED = "packet_corrupted"
    PACKET_DUPLICATED = "packet_duplicated"
    PACKET_REORDERED = "packet_reordered"
    ACK_SENT = "ack_sent"
    ACK_RECEIVED = "ack_received"
    TIMEOUT = "timeout"
    RETRANSMISSION = "retransmission"
    WINDOW_UPDATE = "window_update"
    DUPLICATE_DETECTED = "duplicate_detected"
    TRANSFER_STARTED = "transfer_started"
    TRANSFER_PROGRESS = "transfer_progress"
    TRANSFER_COMPLETE = "transfer_complete"
    TRANSFER_FAILED = "transfer_failed"


@dataclass
class Event:
    event_type: EventType
    timestamp: float = field(default_factory=time.time)
    seq: Optional[int] = None
    ack: Optional[int] = None
    pkt_type: Optional[str] = None
    attempt: int = 1
    direction: str = "forward"  # "forward" (sender->receiver) or "reverse" (receiver->sender)
    rtt: Optional[float] = None
    message: str = ""
    details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        d = asdict(self)
        d["event_type"] = self.event_type.value
        return d

    def to_json(self) -> str:
        return json.dumps(self.to_dict())


class EventBus:
    """Thread-safe publish-subscribe event bus."""
    def __init__(self):
        self._listeners: List[Callable[[Event], None]] = []
        self._lock = threading.Lock()
        self._history: List[Event] = []
        self._max_history = 5000

    def subscribe(self, callback: Callable[[Event], None]) -> Callable[[], None]:
        with self._lock:
            self._listeners.append(callback)

        def unsubscribe():
            with self._lock:
                if callback in self._listeners:
                    self._listeners.remove(callback)

        return unsubscribe

    def emit(self, event: Event) -> None:
        with self._lock:
            self._history.append(event)
            if len(self._history) > self._max_history:
                self._history.pop(0)
            listeners_copy = list(self._listeners)

        for listener in listeners_copy:
            try:
                listener(event)
            except Exception as e:
                # Keep event bus resilient
                pass

    def get_history(self) -> List[Event]:
        with self._lock:
            return list(self._history)

    def clear_history(self) -> None:
        with self._lock:
            self._history.clear()
