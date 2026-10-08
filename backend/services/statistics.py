"""
Comprehensive statistics and metrics tracking for file transfer sessions.
Calculates throughput, protocol efficiency, loss rates, and theoretical bounds.
"""
from dataclasses import dataclass, field, asdict
import csv
import io
import time
from typing import Dict, Any, Optional, List


@dataclass
class TransferStats:
    protocol: str = "saw"
    start_time: float = 0.0
    end_time: float = 0.0
    file_name: str = ""
    file_size_bytes: int = 0
    packet_size_bytes: int = 1024

    # Counters
    total_data_packets: int = 0
    unique_packets_delivered: int = 0
    sent_attempts: int = 0
    retransmissions: int = 0
    packets_lost: int = 0
    corrupted_detected: int = 0
    duplicates_detected: int = 0
    out_of_order_buffered: int = 0
    acks_sent: int = 0
    acks_received: int = 0
    acks_lost: int = 0
    timeouts: int = 0

    # Byte counters
    useful_bytes_sent: int = 0
    total_bytes_sent: int = 0  # Includes retransmissions and packet headers

    # RTT / Timing stats
    min_rtt_ms: Optional[float] = None
    avg_rtt_ms: Optional[float] = None
    max_rtt_ms: Optional[float] = None
    current_timeout_ms: float = 1000.0

    # Verification
    original_sha256: str = ""
    reconstructed_sha256: str = ""
    verified: bool = False
    status: str = "idle"  # idle, running, completed, failed
    error_message: str = ""

    # Time series points for graphing (timestamp, throughput_mbps, rtt_ms, timeout_ms, progress_pct)
    time_series: List[Dict[str, Any]] = field(default_factory=list)

    @property
    def duration_seconds(self) -> float:
        if self.start_time == 0.0:
            return 0.0
        finish = self.end_time if self.end_time > 0.0 else time.time()
        return max(0.0001, finish - self.start_time)

    @property
    def throughput_mbps(self) -> float:
        """Throughput based on useful bytes received / elapsed time (Mbps)."""
        if self.duration_seconds <= 0:
            return 0.0
        return (self.useful_bytes_sent * 8.0) / (self.duration_seconds * 1_000_000.0)

    @property
    def protocol_efficiency(self) -> float:
        """Protocol Efficiency = Useful Data Bytes / Total Bytes Transmitted."""
        if self.total_bytes_sent <= 0:
            return 0.0
        return min(1.0, self.useful_bytes_sent / float(self.total_bytes_sent))

    @property
    def theoretical_saw_efficiency(self) -> float:
        """
        Theoretical Stop-and-Wait efficiency:
          U_saw = T_trans / (T_trans + RTT)
        where T_trans is transmission delay of one packet over an assumed nominal 100Mbps link.
        """
        avg_rtt_s = ((self.avg_rtt_ms or 10.0) / 1000.0)
        # Assuming nominal link speed of 100 Mbps (12.5 MB/s)
        link_speed_bps = 100 * 1000 * 1000
        t_trans = (self.packet_size_bytes * 8) / link_speed_bps
        if (t_trans + avg_rtt_s) == 0:
            return 1.0
        return min(1.0, t_trans / (t_trans + avg_rtt_s))

    @property
    def packet_loss_rate(self) -> float:
        if self.sent_attempts == 0:
            return 0.0
        return self.packets_lost / float(self.sent_attempts)

    @property
    def progress_percentage(self) -> float:
        if self.total_data_packets == 0:
            return 0.0
        return min(100.0, (self.unique_packets_delivered / float(self.total_data_packets)) * 100.0)

    def record_rtt(self, rtt_seconds: float) -> None:
        rtt_ms = rtt_seconds * 1000.0
        if self.min_rtt_ms is None or rtt_ms < self.min_rtt_ms:
            self.min_rtt_ms = rtt_ms
        if self.max_rtt_ms is None or rtt_ms > self.max_rtt_ms:
            self.max_rtt_ms = rtt_ms
        if self.avg_rtt_ms is None:
            self.avg_rtt_ms = rtt_ms
        else:
            self.avg_rtt_ms = (self.avg_rtt_ms * 0.85) + (rtt_ms * 0.15)

    def capture_timeseries_point(self) -> None:
        self.time_series.append({
            "elapsed_s": round(self.duration_seconds, 2),
            "throughput_mbps": round(self.throughput_mbps, 3),
            "rtt_ms": round(self.avg_rtt_ms or 0.0, 2),
            "timeout_ms": round(self.current_timeout_ms, 2),
            "retransmissions": self.retransmissions,
            "progress_pct": round(self.progress_percentage, 1),
        })

    def to_dict(self) -> Dict[str, Any]:
        time_series_copy = list(self.time_series)
        return {
            "protocol": self.protocol,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "file_name": self.file_name,
            "file_size_bytes": self.file_size_bytes,
            "packet_size_bytes": self.packet_size_bytes,
            "total_data_packets": self.total_data_packets,
            "unique_packets_delivered": self.unique_packets_delivered,
            "sent_attempts": self.sent_attempts,
            "retransmissions": self.retransmissions,
            "packets_lost": self.packets_lost,
            "corrupted_detected": self.corrupted_detected,
            "duplicates_detected": self.duplicates_detected,
            "out_of_order_buffered": self.out_of_order_buffered,
            "acks_sent": self.acks_sent,
            "acks_received": self.acks_received,
            "acks_lost": self.acks_lost,
            "timeouts": self.timeouts,
            "useful_bytes_sent": self.useful_bytes_sent,
            "total_bytes_sent": self.total_bytes_sent,
            "min_rtt_ms": self.min_rtt_ms,
            "avg_rtt_ms": self.avg_rtt_ms,
            "max_rtt_ms": self.max_rtt_ms,
            "current_timeout_ms": self.current_timeout_ms,
            "original_sha256": self.original_sha256,
            "reconstructed_sha256": self.reconstructed_sha256,
            "verified": self.verified,
            "status": self.status,
            "error_message": self.error_message,
            "time_series": time_series_copy,
            "duration_seconds": round(self.duration_seconds, 3),
            "throughput_mbps": round(self.throughput_mbps, 3),
            "protocol_efficiency": round(self.protocol_efficiency, 4),
            "theoretical_saw_efficiency": round(self.theoretical_saw_efficiency, 4),
            "packet_loss_rate": round(self.packet_loss_rate, 4),
            "progress_percentage": round(self.progress_percentage, 1),
        }

    def to_csv(self) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        data = self.to_dict()
        writer.writerow(["Metric", "Value"])
        for k, v in data.items():
            if k != "time_series":
                writer.writerow([k, v])
        return output.getvalue()
