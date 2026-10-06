"""
RTT Estimator and Adaptive Retransmission Timeout (RTO) calculation.
Implements RFC 6298 / Jacobson's algorithm & Karn's algorithm.

Formulas:
  SampleRTT = now - send_timestamp
  EstimatedRTT = (1 - alpha) * EstimatedRTT + alpha * SampleRTT  (alpha = 0.125)
  DevRTT = (1 - beta) * DevRTT + beta * |SampleRTT - EstimatedRTT| (beta = 0.25)
  RTO = EstimatedRTT + 4 * DevRTT

Karn's Algorithm:
  Do NOT update RTT estimates for retransmitted packets.
  On timeout: backoff RTO exponentially (RTO = RTO * 2) up to max_rto.
"""
from dataclasses import dataclass
from typing import Optional, List


@dataclass
class RTTSample:
    seq: int
    sample_rtt: float
    estimated_rtt: float
    dev_rtt: float
    timeout: float
    timestamp: float


class RTTEstimator:
    def __init__(
        self,
        initial_timeout: float = 1.0,
        min_rto: float = 0.05,
        max_rto: float = 10.0,
        alpha: float = 0.125,
        beta: float = 0.25,
        adaptive: bool = True,
    ):
        self.initial_timeout = initial_timeout
        self.min_rto = min_rto
        self.max_rto = max_rto
        self.alpha = alpha
        self.beta = beta
        self.adaptive = adaptive

        self.estimated_rtt: Optional[float] = None
        self.dev_rtt: Optional[float] = None
        self.current_timeout: float = initial_timeout
        self.samples: List[RTTSample] = []
        self.min_sample: Optional[float] = None
        self.max_sample: Optional[float] = None
        self.sum_samples: float = 0.0
        self.sample_count: int = 0

    @property
    def avg_rtt(self) -> float:
        return (self.sum_samples / self.sample_count) if self.sample_count > 0 else 0.0

    def update_sample(self, seq: int, send_timestamp: float, receive_timestamp: float, is_retransmission: bool = False) -> float:
        """
        Updates RTT estimators with a new ACK sample.
        Applies Karn's algorithm: ignores samples for packets that were retransmitted.
        Returns the sampled RTT in seconds.
        """
        sample_rtt = max(0.0001, receive_timestamp - send_timestamp)

        # Karn's algorithm: Do not measure RTT for retransmitted packets
        if is_retransmission:
            return sample_rtt

        self.sum_samples += sample_rtt
        self.sample_count += 1
        self.min_sample = min(self.min_sample or sample_rtt, sample_rtt)
        self.max_sample = max(self.max_sample or sample_rtt, sample_rtt)

        if not self.adaptive:
            return sample_rtt

        if self.estimated_rtt is None:
            # First sample initialization (RFC 6298: Est = Sample, Dev = Sample / 2)
            self.estimated_rtt = sample_rtt
            self.dev_rtt = sample_rtt / 2.0
        else:
            sample_diff = abs(sample_rtt - self.estimated_rtt)
            self.dev_rtt = (1.0 - self.beta) * self.dev_rtt + self.beta * sample_diff
            self.estimated_rtt = (1.0 - self.alpha) * self.estimated_rtt + self.alpha * sample_rtt

        calculated_rto = self.estimated_rtt + 4.0 * (self.dev_rtt or 0.0)
        self.current_timeout = max(self.min_rto, min(self.max_rto, calculated_rto))

        self.samples.append(
            RTTSample(
                seq=seq,
                sample_rtt=sample_rtt,
                estimated_rtt=self.estimated_rtt or sample_rtt,
                dev_rtt=self.dev_rtt or 0.0,
                timeout=self.current_timeout,
                timestamp=receive_timestamp,
            )
        )

        return sample_rtt

    def on_timeout(self) -> float:
        """
        Handles timeout event by applying exponential backoff.
        Returns new backed-off timeout.
        """
        if self.adaptive:
            self.current_timeout = min(self.max_rto, self.current_timeout * 2.0)
        return self.current_timeout

    def get_timeout(self) -> float:
        """Returns the active timeout in seconds."""
        return self.current_timeout

    def reset(self, initial_timeout: Optional[float] = None) -> None:
        """Resets RTT estimation state."""
        if initial_timeout is not None:
            self.initial_timeout = initial_timeout
        self.current_timeout = self.initial_timeout
        self.estimated_rtt = None
        self.dev_rtt = None
        self.samples.clear()
        self.min_sample = None
        self.max_sample = None
        self.sum_samples = 0.0
        self.sample_count = 0
