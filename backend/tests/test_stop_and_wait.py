"""
Tests for Phase 2: Stop-and-Wait protocol transfer over UDP localhost sockets without simulator.
Verifies file transfers, SHA-256 integrity verification, and failure scenarios.
"""
import os
import threading
import time
import pytest

from protocol.stop_and_wait import StopAndWaitSender, StopAndWaitReceiver
from protocol.base import compute_file_sha256


def test_stop_and_wait_small_text_transfer():
    with open("test_files/small.txt", "rb") as f:
        original_data = f.read()

    original_sha = compute_file_sha256(original_data)
    port = 9101

    receiver = StopAndWaitReceiver(listen_host="127.0.0.1", listen_port=port)
    sender = StopAndWaitSender(dest_host="127.0.0.1", dest_port=port, packet_size=256, timeout=0.5)

    received_data_holder = []
    receiver_stats_holder = []

    def run_receiver():
        data, stats = receiver.listen_and_receive(timeout_seconds=5.0)
        received_data_holder.append(data)
        receiver_stats_holder.append(stats)

    t_recv = threading.Thread(target=run_receiver)
    t_recv.start()

    time.sleep(0.1)  # Allow receiver to bind socket

    sender_stats = sender.send_data(original_data, filename="small.txt")
    t_recv.join(timeout=5.0)

    assert len(received_data_holder) == 1
    assert received_data_holder[0] == original_data
    assert receiver_stats_holder[0].verified is True
    assert receiver_stats_holder[0].reconstructed_sha256 == original_sha
    assert sender_stats.status == "completed"
    assert sender_stats.unique_packets_delivered > 0


def test_stop_and_wait_pdf_binary_transfer():
    with open("test_files/sample.pdf", "rb") as f:
        pdf_data = f.read()

    original_sha = compute_file_sha256(pdf_data)
    port = 9102

    receiver = StopAndWaitReceiver(listen_host="127.0.0.1", listen_port=port)
    sender = StopAndWaitSender(dest_host="127.0.0.1", dest_port=port, packet_size=512, timeout=0.5)

    recv_res = []

    def run_receiver():
        data, stats = receiver.listen_and_receive(timeout_seconds=5.0)
        recv_res.append((data, stats))

    t = threading.Thread(target=run_receiver)
    t.start()
    time.sleep(0.1)

    sender_stats = sender.send_data(pdf_data, filename="sample.pdf")
    t.join(timeout=5.0)

    assert len(recv_res) == 1
    data, r_stats = recv_res[0]
    assert data == pdf_data
    assert r_stats.verified is True
    assert r_stats.reconstructed_sha256 == original_sha


def test_stop_and_wait_image_jpg_transfer():
    with open("test_files/image.jpg", "rb") as f:
        jpg_data = f.read()

    port = 9103
    receiver = StopAndWaitReceiver(listen_host="127.0.0.1", listen_port=port)
    sender = StopAndWaitSender(dest_host="127.0.0.1", dest_port=port, packet_size=1024, timeout=0.5)

    recv_res = []
    t = threading.Thread(target=lambda: recv_res.append(receiver.listen_and_receive(timeout_seconds=5.0)))
    t.start()
    time.sleep(0.1)

    sender_stats = sender.send_data(jpg_data, filename="image.jpg")
    t.join(timeout=5.0)

    data, r_stats = recv_res[0]
    assert data == jpg_data
    assert r_stats.verified is True


def test_stop_and_wait_max_retries_failure():
    # Attempt to send to an unbound port with short timeout and max_retries=2
    unbound_port = 9999
    sender = StopAndWaitSender(
        dest_host="127.0.0.1",
        dest_port=unbound_port,
        packet_size=256,
        timeout=0.1,
        max_retries=2,
    )

    with pytest.raises(TimeoutError, match="Exceeded max retries"):
        sender.send_data(b"Unreachable payload", filename="fail.bin")

    assert sender.stats.status == "failed"
    assert sender.stats.retransmissions >= 2
