"""
Selective Repeat (SR) ARQ Protocol Implementation.

Key Characteristics:
- Sliding sender and receiver windows of size N.
- Individual Acknowledgments: ACK(k) acknowledges specifically and only packet k.
- Per-packet logical timers: Only timed-out packets are retransmitted (not the whole window).
- Receiver buffers out-of-order packets falling inside its window [rcv_base .. rcv_base + N - 1].
- When rcv_base is received, receiver delivers all consecutive buffered packets in order to the application.
"""
import os
import socket
import time
from typing import Tuple, Optional, Dict, List, Set

from protocol.packet import Packet, PacketType, CorruptPacketError
from protocol.base import BaseSender, BaseReceiver, compute_file_sha256
from protocol.events import EventType
from services.statistics import TransferStats


class SelectiveRepeatSender(BaseSender):
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
        return "sr"

    def send_data(self, data: bytes, filename: str = "transfer.bin") -> TransferStats:
        sock = self._setup_socket()
        sock.setblocking(False)

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
            message=f"Starting Selective Repeat transfer of {filename} (Window={self.window_size}, Packets={total_packets})",
            details={"filename": filename, "window_size": self.window_size, "total_packets": total_packets},
        )

        try:
            # 1. START Handshake
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

            # 2. SR Sliding Window Pipeline
            base = 0
            next_seq_num = 0
            acked: List[bool] = [False] * total_packets
            packet_timers: Dict[int, float] = {}
            packet_attempts: Dict[int, int] = {i: 0 for i in range(total_packets)}
            packets = [Packet.create_data(seq=i, payload=chunks[i]) for i in range(total_packets)]

            while base < total_packets and not self._stop_flag.is_set():
                # A. Send packets within window
                while next_seq_num < base + self.window_size and next_seq_num < total_packets:
                    pkt = packets[next_seq_num]
                    pkt.timestamp = time.time()
                    packet_timers[next_seq_num] = pkt.timestamp
                    packet_attempts[next_seq_num] += 1
                    attempt = packet_attempts[next_seq_num]

                    packed = pkt.pack()
                    sock.sendto(packed, (self.dest_host, self.dest_port))
                    self.stats.sent_attempts += 1
                    self.stats.total_bytes_sent += len(packed)

                    self.emit_event(
                        EventType.PACKET_SENT,
                        seq=next_seq_num,
                        pkt_type="DATA",
                        attempt=attempt,
                        message=f"SR Sent DATA seq={next_seq_num} [Window: {base}..{min(base+self.window_size-1, total_packets-1)}]",
                    )
                    next_seq_num += 1

                # B. Receive Individual ACKs
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
                            ack_seq = ack_pkt.ack

                            if 0 <= ack_seq < total_packets and not acked[ack_seq]:
                                acked[ack_seq] = True
                                self.stats.unique_packets_delivered += 1
                                self.stats.useful_bytes_sent += len(chunks[ack_seq])

                                now = time.time()
                                if packet_attempts[ack_seq] == 1 and ack_seq in packet_timers:
                                    rtt = self.rtt_estimator.update_sample(
                                        seq=ack_seq,
                                        send_timestamp=packet_timers[ack_seq],
                                        receive_timestamp=now,
                                        is_retransmission=False,
                                    )
                                    self.stats.record_rtt(rtt)

                                self.emit_event(
                                    EventType.ACK_RECEIVED,
                                    ack=ack_seq,
                                    pkt_type="ACK",
                                    message=f"SR Individual ACK {ack_seq} received.",
                                    details={"base": base, "acked_seq": ack_seq},
                                )

                                # Advance base past consecutively acked packets
                                prev_base = base
                                while base < total_packets and acked[base]:
                                    base += 1

                                if base != prev_base:
                                    self.emit_event(
                                        EventType.WINDOW_UPDATE,
                                        seq=base,
                                        message=f"SR Window Base advanced to {base}",
                                        details={"base": base},
                                    )
                                    self.stats.capture_timeseries_point()

                except (BlockingIOError, socket.error, OSError):
                    pass

                # C. Check per-packet timers for unacknowledged packets in flight
                now = time.time()
                for seq_i in range(base, next_seq_num):
                    if not acked[seq_i]:
                        elapsed = now - packet_timers.get(seq_i, now)
                        if elapsed > current_timeout:
                            # Selective retransmission of ONLY packet seq_i
                            self.stats.timeouts += 1
                            self.stats.retransmissions += 1
                            self.rtt_estimator.on_timeout()

                            packet_attempts[seq_i] += 1
                            attempt = packet_attempts[seq_i]

                            if attempt > self.max_retries + 1:
                                raise TimeoutError(
                                    f"SR failed: Exceeded max retries ({self.max_retries}) on packet {seq_i}"
                                )

                            pkt = packets[seq_i]
                            pkt.timestamp = now
                            packet_timers[seq_i] = now
                            packed = pkt.pack()
                            sock.sendto(packed, (self.dest_host, self.dest_port))
                            self.stats.sent_attempts += 1
                            self.stats.total_bytes_sent += len(packed)

                            self.emit_event(
                                EventType.RETRANSMISSION,
                                seq=seq_i,
                                pkt_type="DATA",
                                attempt=attempt,
                                message=f"SR Selective Retransmit DATA seq={seq_i} (attempt {attempt}, elapsed {elapsed:.3f}s)",
                            )

                time.sleep(0.002)

            # 3. END Handshake
            self._do_handshake(sock, Packet.create_end(seq=total_packets), expected_ack=total_packets)

            self.stats.end_time = time.time()
            self.stats.status = "completed"
            self.stats.verified = True
            self.emit_event(
                EventType.TRANSFER_COMPLETE,
                message=f"Selective Repeat transfer complete in {self.stats.duration_seconds:.2f}s ({self.stats.throughput_mbps:.3f} Mbps)",
                details=self.stats.to_dict(),
            )

        except Exception as e:
            self.stats.end_time = time.time()
            self.stats.status = "failed"
            self.stats.error_message = str(e)
            self.emit_event(EventType.TRANSFER_FAILED, message=f"SR Transfer failed: {e}")
            raise
        finally:
            self._close_socket()

        return self.stats

    def _do_handshake(self, sock: socket.socket, pkt: Packet, expected_ack: int) -> None:
        attempt = 0
        sock.settimeout(0.2)
        while not self._stop_flag.is_set():
            attempt += 1
            if attempt > self.max_retries + 5:
                raise TimeoutError(f"SR Handshake failed for {pkt.pkt_type.name}")

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


class SelectiveRepeatReceiver(BaseReceiver):
    def __init__(
        self,
        listen_host: str = "0.0.0.0",
        listen_port: int = 9001,
        window_size: int = 4,
        event_bus=None,
        output_dir: Optional[str] = None,
    ):
        super().__init__(
            listen_host=listen_host,
            listen_port=listen_port,
            event_bus=event_bus,
            output_dir=output_dir,
        )
        self.window_size = window_size

    @property
    def protocol_name(self) -> str:
        return "sr"

    def listen_and_receive(self, timeout_seconds: Optional[float] = None) -> Tuple[bytes, TransferStats]:
        sock = self._setup_socket()
        self.stats.start_time = time.time()
        self.stats.status = "running"

        rcv_base = 0
        received_chunks: List[bytes] = []
        rcv_buffer: Dict[int, bytes] = {}  # Out-of-order buffer: seq -> payload
        sender_addr = None
        overall_deadline = (time.time() + timeout_seconds) if timeout_seconds else None

        self.emit_event(
            EventType.TRANSFER_STARTED,
            message=f"SR Receiver listening on {self.listen_port} (Window={self.window_size})",
        )

        try:
            while not self._stop_flag.is_set():
                if overall_deadline and time.time() > overall_deadline:
                    raise TimeoutError("SR Receiver timeout waiting for transfer")

                try:
                    data, addr = sock.recvfrom(65535)
                except socket.timeout:
                    continue

                try:
                    pkt = Packet.unpack(data)
                except CorruptPacketError as e:
                    self.stats.corrupted_detected += 1
                    self.emit_event(EventType.PACKET_CORRUPTED, message=f"SR Corrupted datagram: {e}")
                    continue

                sender_addr = addr

                # 1. START
                if pkt.pkt_type == PacketType.START:
                    meta = pkt.parse_metadata()
                    self.stats.file_name = meta.get("filename", "received.bin")
                    self.stats.file_size_bytes = meta.get("file_size", 0)
                    self.stats.total_data_packets = meta.get("total_packets", 0)
                    self.stats.original_sha256 = meta.get("sha256", "")
                    rcv_base = 0
                    received_chunks = []
                    rcv_buffer.clear()

                    ack_pkt = Packet.create_ack(ack=0)
                    sock.sendto(ack_pkt.pack(), sender_addr)
                    self.stats.acks_sent += 1
                    self.emit_event(
                        EventType.ACK_SENT,
                        ack=0,
                        message=f"SR Received START '{self.stats.file_name}'. ACK 0 sent.",
                    )

                # 2. DATA
                elif pkt.pkt_type == PacketType.DATA:
                    seq = pkt.seq

                    # Case A: Inside current receive window [rcv_base .. rcv_base + N - 1]
                    if rcv_base <= seq < rcv_base + self.window_size:
                        # Send individual ACK for seq
                        ack_pkt = Packet.create_ack(ack=seq)
                        sock.sendto(ack_pkt.pack(), sender_addr)
                        self.stats.acks_sent += 1

                        if seq not in rcv_buffer and seq >= len(received_chunks):
                            rcv_buffer[seq] = pkt.payload
                            if seq > rcv_base:
                                self.stats.out_of_order_buffered += 1
                                self.emit_event(
                                    EventType.PACKET_RECEIVED,
                                    seq=seq,
                                    message=f"SR Buffered out-of-order DATA seq={seq} [rcv_base={rcv_base}]. Sent ACK {seq}.",
                                )
                            else:
                                self.emit_event(
                                    EventType.PACKET_RECEIVED,
                                    seq=seq,
                                    message=f"SR Received in-window DATA seq={seq}. Sent ACK {seq}.",
                                )

                        # If seq == rcv_base, deliver all consecutively buffered packets
                        while rcv_base in rcv_buffer:
                            payload = rcv_buffer.pop(rcv_base)
                            received_chunks.append(payload)
                            self.stats.unique_packets_delivered += 1
                            self.stats.useful_bytes_sent += len(payload)
                            rcv_base += 1

                    # Case B: Previously acknowledged packet [0 .. rcv_base - 1]
                    elif seq < rcv_base:
                        # Duplicate/old packet: must re-ACK so sender can advance
                        self.stats.duplicates_detected += 1
                        ack_pkt = Packet.create_ack(ack=seq)
                        sock.sendto(ack_pkt.pack(), sender_addr)
                        self.stats.acks_sent += 1
                        self.emit_event(
                            EventType.DUPLICATE_DETECTED,
                            seq=seq,
                            message=f"SR Duplicate DATA seq={seq} (< rcv_base={rcv_base}). Resent ACK {seq}.",
                        )

                    # Case C: Outside window
                    else:
                        self.emit_event(
                            EventType.PACKET_REORDERED,
                            seq=seq,
                            message=f"SR Ignored out-of-window packet seq={seq} (rcv_base={rcv_base})",
                        )

                # 3. END
                elif pkt.pkt_type == PacketType.END:
                    # Send ACK multiple times to overcome channel loss on final packet
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
                        os.makedirs(self.output_dir, exist_ok=True)
                        with open(os.path.join(self.output_dir, self.stats.file_name), "wb") as f:
                            f.write(reconstructed)

                    self.emit_event(
                        EventType.TRANSFER_COMPLETE if self.stats.verified else EventType.TRANSFER_FAILED,
                        message=f"SR Transfer Complete. SHA-256 {'VERIFIED' if self.stats.verified else 'FAILED'}!",
                    )
                    return reconstructed, self.stats

        finally:
            self._close_socket()

        return b"", self.stats
