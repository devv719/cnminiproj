"""
Comprehensive tests for Go-Back-N (GBN) and Selective Repeat (SR).
Tests plain transfers, transfers over impaired channels, and cross-protocol comparisons.
"""
import threading
import time
import pytest

from protocol.channel import NetworkChannel, ChannelConfig, PRESETS
from protocol.stop_and_wait import StopAndWaitSender, StopAndWaitReceiver
from protocol.go_back_n import GoBackNSender, GoBackNReceiver
from protocol.selective_repeat import SelectiveRepeatSender, SelectiveRepeatReceiver
from protocol.base import compute_file_sha256


def test_go_back_n_plain_transfer():
    with open("test_files/sample.pdf", "rb") as f:
        data = f.read()

    port = 9301
    receiver = GoBackNReceiver(listen_host="127.0.0.1", listen_port=port)
    sender = GoBackNSender(dest_host="127.0.0.1", dest_port=port, packet_size=512, window_size=4, timeout=0.3)

    recv_res = []
    t = threading.Thread(target=lambda: recv_res.append(receiver.listen_and_receive(timeout_seconds=5.0)))
    t.start()
    time.sleep(0.05)

    sender_stats = sender.send_data(data, filename="sample.pdf")
    t.join(timeout=5.0)

    assert len(recv_res) == 1
    received_bytes, r_stats = recv_res[0]
    assert received_bytes == data
    assert r_stats.verified is True


def test_selective_repeat_plain_transfer():
    with open("test_files/sample.pdf", "rb") as f:
        data = f.read()

    port = 9302
    receiver = SelectiveRepeatReceiver(listen_host="127.0.0.1", listen_port=port, window_size=4)
    sender = SelectiveRepeatSender(dest_host="127.0.0.1", dest_port=port, packet_size=512, window_size=4, timeout=0.3)

    recv_res = []
    t = threading.Thread(target=lambda: recv_res.append(receiver.listen_and_receive(timeout_seconds=5.0)))
    t.start()
    time.sleep(0.05)

    sender_stats = sender.send_data(data, filename="sample.pdf")
    t.join(timeout=5.0)

    assert len(recv_res) == 1
    received_bytes, r_stats = recv_res[0]
    assert received_bytes == data
    assert r_stats.verified is True


def test_go_back_n_impaired_channel():
    data = b"Testing GBN under loss and corruption. " * 30
    channel_port = 9310
    recv_port = 9311

    config = ChannelConfig(loss_rate=0.15, corruption_rate=0.05, delay_ms=10.0, seed=123)
    channel = NetworkChannel(
        listen_host="127.0.0.1",
        listen_port=channel_port,
        dest_host="127.0.0.1",
        dest_port=recv_port,
        config=config,
    )
    receiver = GoBackNReceiver(listen_host="127.0.0.1", listen_port=recv_port)
    sender = GoBackNSender(
        dest_host="127.0.0.1",
        dest_port=channel_port,
        packet_size=256,
        window_size=4,
        timeout=0.25,
        max_retries=20,
    )

    channel.start()
    time.sleep(0.05)
    recv_res = []
    t = threading.Thread(target=lambda: recv_res.append(receiver.listen_and_receive(timeout_seconds=10.0)))
    t.start()
    time.sleep(0.05)

    try:
        sender_stats = sender.send_data(data, filename="gbn_test.bin")
        t.join(timeout=10.0)
    finally:
        channel.stop()

    assert len(recv_res) == 1
    received_bytes, r_stats = recv_res[0]
    assert received_bytes == data
    assert r_stats.verified is True


def test_selective_repeat_impaired_channel():
    data = b"Testing SR under loss and corruption with buffering. " * 30
    channel_port = 9320
    recv_port = 9321

    config = ChannelConfig(loss_rate=0.15, corruption_rate=0.05, delay_ms=10.0, seed=456)
    channel = NetworkChannel(
        listen_host="127.0.0.1",
        listen_port=channel_port,
        dest_host="127.0.0.1",
        dest_port=recv_port,
        config=config,
    )
    receiver = SelectiveRepeatReceiver(listen_host="127.0.0.1", listen_port=recv_port, window_size=5)
    sender = SelectiveRepeatSender(
        dest_host="127.0.0.1",
        dest_port=channel_port,
        packet_size=256,
        window_size=5,
        timeout=0.25,
        max_retries=20,
    )

    channel.start()
    time.sleep(0.05)
    recv_res = []
    t = threading.Thread(target=lambda: recv_res.append(receiver.listen_and_receive(timeout_seconds=10.0)))
    t.start()
    time.sleep(0.05)

    try:
        sender_stats = sender.send_data(data, filename="sr_test.bin")
        t.join(timeout=10.0)
    finally:
        channel.stop()

    assert len(recv_res) == 1
    received_bytes, r_stats = recv_res[0]
    assert received_bytes == data
    assert r_stats.verified is True
