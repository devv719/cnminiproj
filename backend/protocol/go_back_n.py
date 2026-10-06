"""
Go-Back-N (GBN) ARQ Protocol Implementation.

Key Characteristics:
- Sliding window of size N.
- Cumulative Acknowledgments: ACK(k) confirms receipt of all packets up to and including sequence number k.
- Single logical timer for the oldest unacknowledged packet (base).
- On timeout: Retransmits all unacknowledged packets currently in the window [base, next_seq_num - 1].
- Receiver accepts only in-order packets, discards out-of-order packets, and resends cumulative ACK.
"""
import socket
import threading
import time
from typing import Tuple, Optional, Dict, List

from protocol.packet import Packet, PacketType, CorruptPacketError
from protocol.base import BaseSender, BaseReceiver, compute_file_sha256
from protocol.events import EventType
from services.statistics import TransferStats


class GoBackNSender(BaseSender):
    def __init__(
        self,
        dest_host: str = "127.0.0.1",
        dest_port: int = 9000,
        packet_size: int = 1024,
        window_size: int = 4,
        timeout: float = 1.0,
        adaptive_timeout: bool = True,
        max_retries: int = 10,
        event_bus=None,
        bind_port: int = 0,
    ):
        super().__init__(
            dest_host=dest_host,
            dest_port=dest_port,
            packet_size=packet_size,
            timeout=timeout,
            adaptive_timeout=adaptive_timeout,
            max_retries=max_retries,
            event_bus=event_bus,
            bind_port=bind_port,
        )
        self.window_size = window_size

    @property
    def protocol_name(self) -> str:
        return "gbn"

    def send_data(self, data: bytes, filename: str = "transfer.bin") -> TransferStats:
        sock = self._setup_socket()
        sock.setblocking(False)  # Use non-blocking select/polling for window loop

        self.stats.start_time = time.time()
        self.stats.file_name = filename
        self.stats.file_size_bytes = len(data)
        self.stats.original_sha256 = compute_file_sha256(data)
        self.stats.status = "running"

        chunks = [
            data[i : i + self.packet_size]
            for i in range(0, len(data), self.packet_size)
        ]
        if not chunks:
            chunks = [b""]

        total_packets = len(chunks)
        self.stats.total_data_packets = total_packets

        self.emit_event(
            EventType.TRANSFER_STARTED,
            message=f"Starting Go-Back-N transfer of {filename} (Window={self.window_size}, Packets={total_packets})",
            details={"filename": filename, "window_size": self.window_size, "total_packets": total_packets},
        )

        try:
            # 1. Handshake: START packet
            self._do_handshake(
                sock,
                Packet.create_start(
                    filename=filename,
                    file_size=len(data),
                    total_packets=total_packets,
                    sha256_hash=self.stats.original_sha256,
                    packet_size=self.packet_size,
                ),
                expected_ack=0,
            )

            # 2. GBN Sliding Window Pipeline
            base = 0
            next_seq_num = 0
            timer_start: Optional[float] = None
            packet_attempts: Dict[int, int] = {i: 0 for i in range(total_packets)}
            packet_send_times: Dict[int, float] = {}

            packets = [Packet.create_data(seq=i, payload=chunks[i]) for i in range(total_packets)]

            while base < total_packets and not self._stop_flag.is_set():
                # A. Send packets within window
                while next_seq_num < base + self.window_size and next_seq_num < total_packets:
                    pkt = packets[next_seq_num]
                    pkt.timestamp = time.time()
                    packet_send_times[next_seq_num] = pkt.timestamp
                    packet_attempts[next_seq_num] += 1
                    attempt = packet_attempts[next_seq_num]

                    packed = pkt.pack()
                    sock.sendto(packed, (self.dest_host, self.dest_port))
                    self.stats.sent_attempts += 1
                    self.stats.total_bytes_sent += len(packed)

                    if attempt > 1:
                        self.stats.retransmissions += 1
                        self.emit_event(
                            EventType.RETRANSMISSION,
                            seq=next_seq_num,
                            pkt_type="DATA",
                            attempt=attempt,
                            message=f"GBN Retransmit DATA seq={next_seq_num} (attempt {attempt})",
                        )
                    else:
                        self.emit_event(
                            EventType.PACKET_SENT,
                            seq=next_seq_num,
                            pkt_type="DATA",
                            attempt=attempt,
                            message=f"GBN Sent DATA seq={next_seq_num} [Window: {base}..{next_seq_num}]",
                        )

                    # Start timer for base if not running
                    if base == next_seq_num:
                        timer_start = time.time()

                    next_seq_num += 1

                # B. Check for incoming ACKs (non-blocking)
                current_timeout = self.rtt_estimator.get_timeout()
                self.stats.current_timeout_ms = current_timeout * 1000.0

                try:
                    while True:
                        ack_data, _ = sock.recvfrom(4096)
                        try:
                            ack_pkt = Packet.unpack(ack_data)
                        except CorruptPacketError:
                            self.stats.corrupted_detected += 1
                            continue

                        if ack_pkt.pkt_type == PacketType.ACK:
                            self.stats.acks_received += 1
                            # Cumulative ACK: confirms all packets up to ack_pkt.ack
                            if ack_pkt.ack >= base:
                                now = time.time()
                                for acked_seq in range(base, min(ack_pkt.ack + 1, total_packets)):
                                    self.stats.unique_packets_delivered += 1
                                    self.stats.useful_bytes_sent += len(chunks[acked_seq])
                                    if packet_attempts[acked_seq] == 1 and acked_seq in packet_send_times:
                                        rtt = self.rtt_estimator.update_sample(
                                            seq=acked_seq,
                                            send_timestamp=packet_send_times[acked_seq],
                                            receive_timestamp=now,
                                            is_retransmission=False,
                                        )
                                        self.stats.record_rtt(rtt)

                                self.emit_event(
                                    EventType.ACK_RECEIVED,
                                    ack=ack_pkt.ack,
                                    pkt_type="ACK",
                                    message=f"GBN Cumulative ACK {ack_pkt.ack} received. Advancing window to {ack_pkt.ack + 1}.",
                                    details={"new_base": ack_pkt.ack + 1},
                                )
                                base = ack_pkt.ack + 1
                                self.stats.capture_timeseries_point()

                                # If window advanced and unacked packets remain, reset timer; else stop timer
                                if base < next_seq_num:
                                    timer_start = time.time()
                                else:
                                    timer_start = None

                except (BlockingIOError, socket.error, OSError):
                    pass  # No more pending ACKs in socket buffer right now

                # C. Check Timer for base packet
                if timer_start is not None:
                    elapsed = time.time() - timer_start
                    if elapsed > current_timeout:
                        # Timeout occurred! Go-Back-N retransmission of entire window
                        self.stats.timeouts += 1
                        self.rtt_estimator.on_timeout()
                        self.emit_event(
                            EventType.TIMEOUT,
                            seq=base,
                            message=f"GBN Timeout for base seq={base} ({elapsed:.3f}s > {current_timeout:.3f}s). Retransmitting window [{base}..{next_seq_num - 1}]",
                        )
                        if packet_attempts[base] > self.max_retries:
                            raise TimeoutError(
                                f"GBN failed: Exceeded max retries ({self.max_retries}) on base packet {base}"
                            )

                        # Rewind next_seq_num back to base to resend all unacked packets in window
                        next_seq_num = base
                        timer_start = time.time()

                time.sleep(0.002)  # Tiny yield to prevent 100% CPU spinning

            # 3. Handshake: END packet
            self._do_handshake(sock, Packet.create_end(seq=total_packets), expected_ack=total_packets)

            self.stats.end_time = time.time()
            self.stats.status = "completed"
            self.stats.verified = True
            self.emit_event(
                EventType.TRANSFER_COMPLETE,
                message=f"Go-Back-N transfer complete in {self.stats.duration_seconds:.2f}s ({self.stats.throughput_mbps:.3f} Mbps)",
                details=self.stats.to_dict(),
            )

        except Exception as e:
            self.stats.end_time = time.time()
            self.stats.status = "failed"
            self.stats.error_message = str(e)
            self.emit_event(
                EventType.TRANSFER_FAILED,
                message=f"GBN Transfer failed: {e}",
            )
            raise
        finally:
            self._close_socket()

        return self.stats

    def _do_handshake(self, sock: socket.socket, pkt: Packet, expected_ack: int) -> None:
        """Helper for reliable handshake (START/END) with blocking timeout."""
        attempt = 0
        sock.settimeout(0.2)
        while not self._stop_flag.is_set():
            attempt += 1
            if attempt > self.max_retries + 5:
                raise TimeoutError(f"GBN Handshake failed for {pkt.pkt_type.name}")

            pkt.timestamp = time.time()
            packed = pkt.pack()
            sock.sendto(packed, (self.dest_host, self.dest_port))
            self.stats.sent_attempts += 1
            self.stats.total_bytes_sent += len(packed)

            start_t = time.time()
            while time.time() - start_t < 0.2:
                try:
                    ack_data, _ = sock.recvfrom(4096)
                    ack_pkt = Packet.unpack(ack_data)
                    if ack_pkt.pkt_type == PacketType.ACK and ack_pkt.ack == expected_ack:
                        return
                except (CorruptPacketError, BlockingIOError):
                    continue
                except (socket.timeout, ConnectionResetError, OSError):
                    break


class GoBackNReceiver(BaseReceiver):
    @property
    def protocol_name(self) -> str:
        return "gbn"

    def listen_and_receive(self, timeout_seconds: Optional[float] = None) -> Tuple[bytes, TransferStats]:
        sock = self._setup_socket()
        self.stats.start_time = time.time()
        self.stats.status = "running"

        expected_seq = 0
        received_chunks: List[bytes] = []
        sender_addr = None
        overall_deadline = (time.time() + timeout_seconds) if timeout_seconds else None

        self.emit_event(
            EventType.TRANSFER_STARTED,
            message=f"GBN Receiver listening on {self.listen_port}",
        )

        try:
            while not self._stop_flag.is_set():
                if overall_deadline and time.time() > overall_deadline:
                    raise TimeoutError("GBN Receiver timeout waiting for transfer")

                try:
                    data, addr = sock.recvfrom(65535)
                except socket.timeout:
                    continue

                try:
                    pkt = Packet.unpack(data)
                except CorruptPacketError as e:
                    self.stats.corrupted_detected += 1
                    self.emit_event(EventType.PACKET_CORRUPTED, message=f"GBN Corrupted datagram: {e}")
                    continue

                sender_addr = addr

                # 1. START
                if pkt.pkt_type == PacketType.START:
                    meta = pkt.parse_metadata()
                    self.stats.file_name = meta.get("filename", "received.bin")
                    self.stats.file_size_bytes = meta.get("file_size", 0)
                    self.stats.total_data_packets = meta.get("total_packets", 0)
                    self.stats.original_sha256 = meta.get("sha256", "")
                    expected_seq = 0
                    received_chunks = []

                    ack_pkt = Packet.create_ack(ack=0)
                    sock.sendto(ack_pkt.pack(), sender_addr)
                    self.stats.acks_sent += 1
                    self.emit_event(
                        EventType.ACK_SENT,
                        ack=0,
                        message=f"GBN Received START '{self.stats.file_name}'. ACK 0 sent.",
                    )

                # 2. DATA
                elif pkt.pkt_type == PacketType.DATA:
                    if pkt.seq == expected_seq:
                        # In-order packet accepted!
                        received_chunks.append(pkt.payload)
                        self.stats.unique_packets_delivered += 1
                        self.stats.useful_bytes_sent += len(pkt.payload)

                        # Send Cumulative ACK for expected_seq
                        ack_pkt = Packet.create_ack(ack=expected_seq)
                        sock.sendto(ack_pkt.pack(), sender_addr)
                        self.stats.acks_sent += 1
                        self.emit_event(
                            EventType.ACK_SENT,
                            ack=expected_seq,
                            message=f"GBN Accepted in-order seq={pkt.seq}. Cumulative ACK {expected_seq} sent.",
                        )
                        expected_seq += 1

                    elif pkt.seq < expected_seq:
                        # Duplicate packet: resend last valid cumulative ACK (expected_seq - 1)
                        self.stats.duplicates_detected += 1
                        last_ack = expected_seq - 1
                        ack_pkt = Packet.create_ack(ack=max(0, last_ack))
                        sock.sendto(ack_pkt.pack(), sender_addr)
                        self.stats.acks_sent += 1
                        self.emit_event(
                            EventType.DUPLICATE_DETECTED,
                            seq=pkt.seq,
                            message=f"GBN Duplicate seq={pkt.seq} (expected {expected_seq}). Resent ACK {max(0, last_ack)}.",
                        )

                    else:
                        # Out-of-order packet: DISCARD in GBN and resend cumulative ACK for last in-order
                        last_ack = expected_seq - 1
                        if last_ack >= 0:
                            ack_pkt = Packet.create_ack(ack=last_ack)
                            sock.sendto(ack_pkt.pack(), sender_addr)
                            self.stats.acks_sent += 1
                        self.emit_event(
                            EventType.PACKET_REORDERED,
                            seq=pkt.seq,
                            message=f"GBN Out-of-order seq={pkt.seq} (expected {expected_seq}). Discarded. Resent ACK {max(0, last_ack)}.",
                        )

                # 3. END
                elif pkt.pkt_type == PacketType.END:
                    ack_pkt = Packet.create_ack(ack=pkt.seq)
                    for _ in range(3):
                        sock.sendto(ack_pkt.pack(), sender_addr)
                        self.stats.acks_sent += 1
                        time.sleep(0.01)

                    reconstructed = b"".join(received_chunks)
                    self.stats.reconstructed_sha256 = compute_file_sha256(reconstructed)
                    self.stats.verified = (
                        self.stats.reconstructed_sha256 == self.stats.original_sha256
                    )
                    self.stats.end_time = time.time()
                    self.stats.status = "completed" if self.stats.verified else "failed"

                    if self.output_dir:
                        import os
                        os.makedirs(self.output_dir, exist_ok=True)
                        with open(os.path.join(self.output_dir, self.stats.file_name), "wb") as f:
                            f.write(reconstructed)

                    self.emit_event(
                        EventType.TRANSFER_COMPLETE if self.stats.verified else EventType.TRANSFER_FAILED,
                        message=f"GBN Transfer Complete. SHA-256 {'VERIFIED' if self.stats.verified else 'FAILED'}!",
                    )
                    return reconstructed, self.stats

        finally:
            self._close_socket()

        return b"", self.stats
