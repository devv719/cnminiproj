"""
Checksum utilities for reliable UDP protocol.
Supports standard CRC32 checksum and 16-bit Internet Checksum (RFC 1071).
Includes bit corruption simulation utilities for network testing.
"""
import zlib
import random
from typing import Tuple


def compute_crc32(data: bytes) -> int:
    """
    Computes 32-bit CRC checksum over the given byte sequence.
    Returns an unsigned 32-bit integer (0 to 2^32 - 1).
    """
    return zlib.crc32(data) & 0xFFFFFFFF


def compute_internet_checksum(data: bytes) -> int:
    """
    Computes standard 16-bit Internet Checksum (RFC 1071).
    Used as an educational alternative / complement to CRC32.
    """
    if len(data) % 2 == 1:
        data += b'\x00'
    
    total = 0
    for i in range(0, len(data), 2):
        word = (data[i] << 8) + data[i + 1]
        total += word
        # Fold 32-bit sum to 16 bits
        while total > 0xFFFF:
            total = (total & 0xFFFF) + (total >> 16)
            
    return (~total) & 0xFFFF


def verify_crc32(data: bytes, expected_checksum: int) -> bool:
    """Verifies if CRC32 of data matches expected checksum."""
    return compute_crc32(data) == (expected_checksum & 0xFFFFFFFF)


def corrupt_bytes(data: bytes, corruption_rate: float = 1.0) -> bytes:
    """
    Simulates bit flips or byte corruptions in payload or header.
    Flips 1 to 3 random bits in a randomly chosen byte.
    """
    if not data or random.random() > corruption_rate:
        return data
    
    byte_arr = bytearray(data)
    idx = random.randint(0, len(byte_arr) - 1)
    bit_flip_mask = 1 << random.randint(0, 7)
    byte_arr[idx] ^= bit_flip_mask
    return bytes(byte_arr)
