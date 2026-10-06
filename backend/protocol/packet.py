"""
Custom Packet implementation for Reliable UDP Lab.
Packets are packed into binary format using `struct` with network byte order (!).

Header Structure (23 bytes):
  - type        (1 byte, uint8): 0=DATA, 1=ACK, 2=START, 3=END, 4=NAK
  - seq         (4 bytes, uint32): Sequence number
  - ack         (4 bytes, uint32): Acknowledgment number
  - length      (2 bytes, uint16): Payload length
  - checksum    (4 bytes, uint32): CRC32 of zeroed-header + payload
  - timestamp   (8 bytes, double): Send time for RTT measurement
Payload:
  - 0 to 65535 bytes (configured per transfer, e.g. 1024 bytes)
"""
from dataclasses import dataclass
from enum import IntEnum
import json
import struct
import time
from typing import Optional, Dict, Any

from protocol.checksum import compute_crc32


class PacketType(IntEnum):
    DATA = 0
    ACK = 1
    START = 2
    END = 3
    NAK = 4


class CorruptPacketError(Exception):
    """Raised when a packet is corrupt, fails checksum validation, or has invalid format."""
    pass


HEADER_FORMAT = "!B I I H I d"
HEADER_SIZE = struct.calcsize(HEADER_FORMAT)  # 23 bytes


@dataclass
class Packet:
    pkt_type: PacketType
    seq: int
    ack: int
    payload: bytes = b""
    checksum: int = 0
    timestamp: float = 0.0

    @property
    def length(self) -> int:
        return len(self.payload)

    def pack(self) -> bytes:
        """
        Serializes the packet to binary bytes with network byte order.
        Calculates CRC32 checksum over the header (with checksum=0) + payload.
        """
        if self.timestamp == 0.0:
            self.timestamp = time.time()

        # Step 1: Pack header with checksum set to 0
        header_zero_cksum = struct.pack(
            HEADER_FORMAT,
            int(self.pkt_type),
            self.seq,
            self.ack,
            len(self.payload),
            0,
            self.timestamp,
        )

        # Step 2: Compute CRC32 over (zero-cksum header + payload)
        self.checksum = compute_crc32(header_zero_cksum + self.payload)

        # Step 3: Re-pack header with calculated checksum
        header = struct.pack(
            HEADER_FORMAT,
            int(self.pkt_type),
            self.seq,
            self.ack,
            len(self.payload),
            self.checksum,
            self.timestamp,
        )

        return header + self.payload

    @classmethod
    def unpack(cls, data: bytes) -> "Packet":
        """
        Deserializes binary datagram into a Packet object.
        Validates datagram length and CRC32 checksum.
        Raises CorruptPacketError on any failure.
        """
        if len(data) < HEADER_SIZE:
            raise CorruptPacketError(
                f"Datagram too short: received {len(data)} bytes, expected at least {HEADER_SIZE} bytes."
            )

        try:
            raw_type, seq, ack, length, received_checksum, timestamp = struct.unpack(
                HEADER_FORMAT, data[:HEADER_SIZE]
            )
        except struct.error as e:
            raise CorruptPacketError(f"Malformed header: {e}") from e

        try:
            pkt_type = PacketType(raw_type)
        except ValueError:
            raise CorruptPacketError(f"Invalid packet type: {raw_type}")

        payload = data[HEADER_SIZE:]
        if len(payload) != length:
            raise CorruptPacketError(
                f"Payload length mismatch: header specifies {length} bytes, received {len(payload)} bytes."
            )

        # Verify checksum: pack header with checksum=0, then verify CRC32
        header_zero_cksum = struct.pack(
            HEADER_FORMAT,
            raw_type,
            seq,
            ack,
            length,
            0,
            timestamp,
        )
        calculated_checksum = compute_crc32(header_zero_cksum + payload)

        if calculated_checksum != received_checksum:
            raise CorruptPacketError(
                f"Checksum mismatch: received {received_checksum:#010x}, calculated {calculated_checksum:#010x}."
            )

        return cls(
            pkt_type=pkt_type,
            seq=seq,
            ack=ack,
            payload=payload,
            checksum=received_checksum,
            timestamp=timestamp,
        )

    # Factory helper methods
    @classmethod
    def create_data(cls, seq: int, payload: bytes, timestamp: Optional[float] = None) -> "Packet":
        return cls(
            pkt_type=PacketType.DATA,
            seq=seq,
            ack=0,
            payload=payload,
            timestamp=timestamp or time.time(),
        )

    @classmethod
    def create_ack(cls, ack: int, timestamp: Optional[float] = None) -> "Packet":
        return cls(
            pkt_type=PacketType.ACK,
            seq=0,
            ack=ack,
            payload=b"",
            timestamp=timestamp or time.time(),
        )

    @classmethod
    def create_nak(cls, ack: int, timestamp: Optional[float] = None) -> "Packet":
        return cls(
            pkt_type=PacketType.NAK,
            seq=0,
            ack=ack,
            payload=b"",
            timestamp=timestamp or time.time(),
        )

    @classmethod
    def create_start(
        cls,
        filename: str,
        file_size: int,
        total_packets: int,
        sha256_hash: str,
        packet_size: int = 1024,
        timestamp: Optional[float] = None,
    ) -> "Packet":
        metadata: Dict[str, Any] = {
            "filename": filename,
            "file_size": file_size,
            "total_packets": total_packets,
            "sha256": sha256_hash,
            "packet_size": packet_size,
        }
        payload = json.dumps(metadata).encode("utf-8")
        return cls(
            pkt_type=PacketType.START,
            seq=0,
            ack=0,
            payload=payload,
            timestamp=timestamp or time.time(),
        )

    @classmethod
    def create_end(cls, seq: int, timestamp: Optional[float] = None) -> "Packet":
        return cls(
            pkt_type=PacketType.END,
            seq=seq,
            ack=0,
            payload=b"",
            timestamp=timestamp or time.time(),
        )

    def parse_metadata(self) -> Dict[str, Any]:
        """Parses START packet payload as JSON metadata."""
        if self.pkt_type != PacketType.START:
            raise ValueError("Cannot parse metadata from non-START packet")
        try:
            return json.loads(self.payload.decode("utf-8"))
        except Exception as e:
            raise CorruptPacketError(f"Invalid START metadata payload: {e}") from e

    def to_dict(self) -> Dict[str, Any]:
        """Dictionary representation of packet for logging and UI inspector."""
        return {
            "type": self.pkt_type.name,
            "type_code": int(self.pkt_type),
            "seq": self.seq,
            "ack": self.ack,
            "length": self.length,
            "checksum": f"{self.checksum:#010x}",
            "timestamp": self.timestamp,
            "payload_hex": self.payload.hex() if len(self.payload) <= 64 else self.payload[:64].hex() + "...",
        }
