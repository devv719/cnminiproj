"""
Tests for Phase 3: Network condition simulator (protocol/channel.py).
Tests Stop-and-Wait ARQ under simulated network impairments:
- Packet loss (20%)
- Packet corruption (20%)
- Packet duplicates
- Network delay and jitter
- Packet reordering
- Preset testing (POOR network, SATELLITE network)
"""
import threading
import time
import pytest

from protocol.channel import NetworkChannel, ChannelConfig, PRESETS
from protocol.stop_and_wait import StopAndWaitSender, StopAndWaitReceiver
from protocol.base import compute_file_sha256


def run_transfer_through_channel(
    data: bytes,
    config: ChannelConfig,
    sender_timeout: float = 0.3,
    receiver_timeout: float = 10.0,
    packet_size: int = 256,
    base_port: int = 9200,
):
    channel_port = base_port
    receiver_port = base_port + 1

    channel = NetworkChannel(
        listen_host="127.0.0.1",
        listen_port=channel_port,
        dest_host="127.0.0.1",
        dest_port=receiver_port,
        config=config,
    )
    receiver = StopAndWaitReceiver(listen_host="127.0.0.1", listen_port=receiver_port)
    sender = StopAndWaitSender(
        dest_host="127.0.0.1",
        dest_port=channel_port,
        packet_size=packet_size,
        timeout=sender_timeout,
        max_retries=20,
    )

    channel.start()
    time.sleep(0.05)

    recv_res = []
    t_recv = threading.Thread(
        target=lambda: recv_res.append(receiver.listen_and_receive(timeout_seconds=receiver_timeout))
    )
    t_recv.start()
    time.sleep(0.05)

    try:
        sender_stats = sender.send_data(data, filename="channel_test.bin")
        t_recv.join(timeout=receiver_timeout)
    finally:
        channel.stop()

    assert len(recv_res) == 1
    received_bytes, receiver_stats = recv_res[0]
    return received_bytes, sender_stats, receiver_stats


def test_channel_loss_20_percent():
    data = b"Testing packet loss resilience in Stop-and-Wait ARQ. " * 30
    config = ChannelConfig(loss_rate=0.20, seed=42)

    received_bytes, s_stats, r_stats = run_transfer_through_channel(
        data=data,
        config=config,
        sender_timeout=0.15,
        base_port=9210,
    )

    assert received_bytes == data
    assert r_stats.verified is True
    assert s_stats.retransmissions > 0  # Confirms packets were retransmitted


def test_channel_corruption_20_percent():
    data = b"Testing CRC32 corruption detection and retransmission. " * 25
    config = ChannelConfig(corruption_rate=0.20, seed=101)

    received_bytes, s_stats, r_stats = run_transfer_through_channel(
        data=data,
        config=config,
        sender_timeout=0.15,
        base_port=9220,
    )

    assert received_bytes == data
    assert r_stats.verified is True
    assert r_stats.corrupted_detected > 0  # Confirms corrupted packets were detected & discarded


def test_channel_duplicates():
    data = b"Testing duplicate packet handling and idempotent receiver writes. " * 30
    config = ChannelConfig(duplicate_rate=0.50, seed=42)

    received_bytes, s_stats, r_stats = run_transfer_through_channel(
        data=data,
        config=config,
        sender_timeout=0.2,
        base_port=9230,
    )

    assert received_bytes == data
    assert r_stats.verified is True
    # Verify file length is exact and receiver detected duplicates
    assert len(received_bytes) == len(data)
    assert r_stats.duplicates_detected > 0


def test_channel_delay_and_jitter():
    data = b"Testing latency and jitter tolerance with adaptive timeout. " * 15
    config = ChannelConfig(delay_ms=30.0, jitter_ms=10.0, seed=55)

    received_bytes, s_stats, r_stats = run_transfer_through_channel(
        data=data,
        config=config,
        sender_timeout=0.3,
        base_port=9240,
    )

    assert received_bytes == data
    assert r_stats.verified is True
    assert s_stats.avg_rtt_ms is not None
    assert s_stats.avg_rtt_ms >= 20.0  # RTT includes proxy delay


def test_channel_reordering():
    data = b"Testing packet reordering survivability. " * 20
    config = ChannelConfig(reorder_rate=0.25, seed=1234)

    received_bytes, s_stats, r_stats = run_transfer_through_channel(
        data=data,
        config=config,
        sender_timeout=0.2,
        base_port=9250,
    )

    assert received_bytes == data
    assert r_stats.verified is True


def test_channel_poor_network_preset():
    data = b"Testing combined POOR network preset (loss + corruption + jitter + delay). " * 10
    config = PRESETS["POOR"]
    config.seed = 42

    received_bytes, s_stats, r_stats = run_transfer_through_channel(
        data=data,
        config=config,
        sender_timeout=0.4,
        receiver_timeout=15.0,
        base_port=9260,
    )

    assert received_bytes == data
    assert r_stats.verified is True
