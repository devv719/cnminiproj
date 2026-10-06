"""
Tests for Phase 4: RTT estimator (Jacobson's algorithm, Karn's algorithm, exponential backoff)
and TransferStats calculations (throughput, protocol efficiency, theoretical SAW efficiency).
"""
import time
import pytest
from protocol.rtt import RTTEstimator
from protocol.events import EventBus, Event, EventType
from services.statistics import TransferStats


def test_rtt_estimator_initialization():
    rtt = RTTEstimator(initial_timeout=1.0, min_rto=0.1, max_rto=10.0, adaptive=True)
    assert rtt.get_timeout() == 1.0
    assert rtt.estimated_rtt is None
    assert rtt.dev_rtt is None


def test_rtt_estimator_jacobson_update():
    rtt = RTTEstimator(initial_timeout=1.0, min_rto=0.05, max_rto=5.0, adaptive=True)

    # First sample: 100ms
    send_t = 1000.0
    recv_t = 1000.100  # 100 ms RTT
    sample = rtt.update_sample(seq=0, send_timestamp=send_t, receive_timestamp=recv_t, is_retransmission=False)
    assert abs(sample - 0.100) < 1e-4
    assert rtt.estimated_rtt is not None
    assert abs(rtt.estimated_rtt - 0.100) < 1e-4
    # RFC 6298: DevRTT = Sample / 2 = 0.050
    assert abs(rtt.dev_rtt - 0.050) < 1e-4
    # RTO = Est + 4 * Dev = 0.100 + 4 * 0.050 = 0.300
    assert abs(rtt.get_timeout() - 0.300) < 1e-3

    # Second sample: 120ms
    rtt.update_sample(seq=1, send_timestamp=1000.0, receive_timestamp=1000.120, is_retransmission=False)
    assert rtt.sample_count == 2
    assert rtt.avg_rtt > 0


def test_karns_algorithm_ignores_retransmissions():
    rtt = RTTEstimator(initial_timeout=1.0, adaptive=True)
    # Update on normal packet
    rtt.update_sample(seq=0, send_timestamp=1000.0, receive_timestamp=1000.050, is_retransmission=False)
    est_before = rtt.estimated_rtt

    # Retransmitted packet ACK should NOT update EstimatedRTT
    rtt.update_sample(seq=1, send_timestamp=1000.0, receive_timestamp=1000.500, is_retransmission=True)
    assert rtt.estimated_rtt == est_before


def test_exponential_backoff_on_timeout():
    rtt = RTTEstimator(initial_timeout=0.5, max_rto=4.0, adaptive=True)
    assert rtt.get_timeout() == 0.5
    rtt.on_timeout()
    assert rtt.get_timeout() == 1.0
    rtt.on_timeout()
    assert rtt.get_timeout() == 2.0
    rtt.on_timeout()
    assert rtt.get_timeout() == 4.0
    rtt.on_timeout()
    assert rtt.get_timeout() == 4.0  # Clamped at max_rto


def test_transfer_stats_efficiency_and_throughput():
    stats = TransferStats(
        protocol="saw",
        start_time=100.0,
        end_time=102.0,  # 2.0 seconds duration
        packet_size_bytes=1024,
        useful_bytes_sent=1_000_000,
        total_bytes_sent=1_200_000,
        avg_rtt_ms=20.0,
    )
    assert stats.duration_seconds == 2.0
    # Throughput: 1,000,000 * 8 / 2,000,000 = 4.0 Mbps
    assert abs(stats.throughput_mbps - 4.0) < 1e-3
    # Efficiency: 1,000,000 / 1,200,000 = 0.8333
    assert abs(stats.protocol_efficiency - (1.0 / 1.2)) < 1e-3
    assert 0.0 < stats.theoretical_saw_efficiency <= 1.0


def test_event_bus_subscribe_emit():
    bus = EventBus()
    received_events = []

    unsub = bus.subscribe(lambda e: received_events.append(e))
    bus.emit(Event(event_type=EventType.PACKET_SENT, seq=1, message="test"))
    assert len(received_events) == 1
    assert received_events[0].seq == 1

    unsub()
    bus.emit(Event(event_type=EventType.PACKET_SENT, seq=2, message="test2"))
    assert len(received_events) == 1  # Unsubscribed, no more additions
