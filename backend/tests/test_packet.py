"""
Unit tests for packet serialization, unpack validation, checksum verification,
and error handling when corrupt datagrams are encountered.
"""
import pytest
import time
from protocol.packet import Packet, PacketType, CorruptPacketError, HEADER_SIZE
from protocol.checksum import (
    compute_crc32,
    compute_internet_checksum,
    verify_crc32,
    corrupt_bytes,
)


def test_checksum_basic():
    data = b"Hello Reliable UDP Lab!"
    crc = compute_crc32(data)
    assert isinstance(crc, int)
    assert 0 <= crc <= 0xFFFFFFFF
    assert verify_crc32(data, crc)
    assert not verify_crc32(data + b"x", crc)

    inet_cksum = compute_internet_checksum(data)
    assert 0 <= inet_cksum <= 0xFFFF


def test_packet_pack_unpack_roundtrip():
    payload = b"Sample network payload for packet testing \x00\x01\x02\xFF"
    now = time.time()
    pkt = Packet.create_data(seq=42, payload=payload, timestamp=now)
    packed = pkt.pack()

    assert len(packed) == HEADER_SIZE + len(payload)

    unpacked = Packet.unpack(packed)
    assert unpacked.pkt_type == PacketType.DATA
    assert unpacked.seq == 42
    assert unpacked.ack == 0
    assert unpacked.payload == payload
    assert unpacked.length == len(payload)
    assert abs(unpacked.timestamp - now) < 1e-6


def test_ack_packet():
    pkt = Packet.create_ack(ack=105)
    packed = pkt.pack()
    unpacked = Packet.unpack(packed)

    assert unpacked.pkt_type == PacketType.ACK
    assert unpacked.ack == 105
    assert unpacked.seq == 0
    assert unpacked.payload == b""
    assert unpacked.length == 0


def test_start_packet_metadata():
    filename = "assignment_report.pdf"
    file_size = 5242880
    total_packets = 5120
    sha256 = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    pkt = Packet.create_start(
        filename=filename,
        file_size=file_size,
        total_packets=total_packets,
        sha256_hash=sha256,
        packet_size=1024,
    )
    packed = pkt.pack()
    unpacked = Packet.unpack(packed)

    assert unpacked.pkt_type == PacketType.START
    meta = unpacked.parse_metadata()
    assert meta["filename"] == filename
    assert meta["file_size"] == file_size
    assert meta["total_packets"] == total_packets
    assert meta["sha256"] == sha256
    assert meta["packet_size"] == 1024


def test_end_packet():
    pkt = Packet.create_end(seq=999)
    packed = pkt.pack()
    unpacked = Packet.unpack(packed)
    assert unpacked.pkt_type == PacketType.END
    assert unpacked.seq == 999


def test_truncated_header_raises_error():
    packed = Packet.create_data(seq=1, payload=b"test").pack()
    truncated = packed[:10]  # Less than HEADER_SIZE (23 bytes)
    with pytest.raises(CorruptPacketError, match="Datagram too short"):
        Packet.unpack(truncated)


def test_truncated_payload_raises_error():
    packed = Packet.create_data(seq=1, payload=b"1234567890").pack()
    truncated = packed[:-3]  # Strip 3 bytes from payload
    with pytest.raises(CorruptPacketError, match="Payload length mismatch"):
        Packet.unpack(truncated)


def test_corrupted_payload_raises_checksum_error():
    pkt = Packet.create_data(seq=7, payload=b"Strict integrity checking")
    packed = bytearray(pkt.pack())
    
    # Flip a bit in the payload
    packed[-1] ^= 0x01

    with pytest.raises(CorruptPacketError, match="Checksum mismatch"):
        Packet.unpack(bytes(packed))


def test_corrupted_header_raises_checksum_error():
    pkt = Packet.create_data(seq=7, payload=b"Strict integrity checking")
    packed = bytearray(pkt.pack())
    
    # Flip a bit in seq number byte (index 2)
    packed[2] ^= 0x01

    with pytest.raises(CorruptPacketError):
        Packet.unpack(bytes(packed))


def test_corrupt_bytes_utility():
    data = b"Testing simulator bit flipping"
    corrupted = corrupt_bytes(data, corruption_rate=1.0)
    assert corrupted != data
    assert len(corrupted) == len(data)


def test_packet_to_dict():
    pkt = Packet.create_data(seq=12, payload=b"sample")
    pkt_dict = pkt.to_dict()
    assert pkt_dict["type"] == "DATA"
    assert pkt_dict["seq"] == 12
    assert pkt_dict["length"] == 6
    assert "checksum" in pkt_dict
