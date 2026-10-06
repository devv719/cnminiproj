"""
Stop-and-Wait (SAW) ARQ Protocol Implementation.

Design:
- Monotonically increasing 32-bit sequence numbers (0, 1, 2, ... N-1).
- 1-packet sliding window (Window Size = 1).
- Sender transmits packet, starts timer, waits for matching ACK before advancing.
- Retransmission on timeout up to max_retries.
- Receiver accepts only in-order packets, discards corrupt packets, and re-ACKs duplicates.
- Karn's algorithm applied for RTT samples (retransmissions do not distort RTT).
"""
import socket
import time
import os
from typing import Tuple, Optional

from protocol.packet import Packet, PacketType, CorruptPacketError
from protocol.base import BaseSender, BaseReceiver, compute_file_sha256
from protocol.events import EventType
from services.statistics import TransferStats


class StopAndWaitSender(BaseSender):
    @property
    def protocol_name(self) -> str:
        return "saw"

    def send_data(self, data: bytes, filename: str = "transfer.bin") -> TransferStats:
        sock = self._setup_socket()
        self.stats.start_time = time.time()
        self.stats.file_name = filename
        self.stats.file_size_bytes = len(data)
        self.stats.original_sha256 = compute_file_sha256(data)
        self.stats.status = "running"

        # Split data into chunks
        chunks = [
            data[i : i + self.packet_size]
            for i in range(0, len(data), self.packet_size)
        ]
        if not chunks:
            chunks = [b""]  # Handle empty file transfer

        total_packets = len(chunks)
        self.stats.total_data_packets = total_packets

        self.emit_event(
            EventType.TRANSFER_STARTED,
            message=f"Starting Stop-and-Wait transfer of {filename} ({len(data)} bytes, {total_packets} packets)",
            details={"filename": filename, "file_size": len(data), "total_packets": total_packets},
        )

        try:
            # 1. START Handshake
            start_pkt = Packet.create_start(
                filename=filename,
                file_size=len(data),
                total_packets=total_packets,
                sha256_hash=self.stats.original_sha256,
                packet_size=self.packet_size,
            )
            self._send_and_wait_ack(sock, start_pkt, expected_ack=0, is_handshake=True)

            # 2. Transfer DATA packets one by one
            for seq, chunk in enumerate(chunks):
                if self._stop_flag.is_set():
                    raise InterruptedError("Transfer cancelled by user")

                pkt = Packet.create_data(seq=seq, payload=chunk)
                self._send_and_wait_ack(sock, pkt, expected_ack=seq)

                self.stats.unique_packets_delivered += 1
                self.stats.useful_bytes_sent += len(chunk)
                self.stats.current_timeout_ms = self.rtt_estimator.get_timeout() * 1000.0
                self.stats.capture_timeseries_point()

                self.emit_event(
                    EventType.TRANSFER_PROGRESS,
                    seq=seq,
                    message=f"Delivered packet {seq + 1}/{total_packets}",
                    details={"progress": self.stats.progress_percentage},
                )

            # 3. END Handshake
            end_pkt = Packet.create_end(seq=total_packets)
            self._send_and_wait_ack(sock, end_pkt, expected_ack=total_packets, is_handshake=True)

            self.stats.end_time = time.time()
            self.stats.status = "completed"
            self.stats.verified = True
            self.emit_event(
                EventType.TRANSFER_COMPLETE,
                message=f"Stop-and-Wait transfer completed successfully in {self.stats.duration_seconds:.2f}s",
                details=self.stats.to_dict(),
            )

        except Exception as e:
            self.stats.end_time = time.time()
            self.stats.status = "failed"
            self.stats.error_message = str(e)
            self.emit_event(
                EventType.TRANSFER_FAILED,
                message=f"Transfer failed: {e}",
                details={"error": str(e)},
            )
            raise
        finally:
            self._close_socket()

        return self.stats

    def _send_and_wait_ack(
        self, sock: socket.socket, pkt: Packet, expected_ack: int, is_handshake: bool = False
    ) -> None:
        """Sends a packet and waits for matching ACK with retransmissions on timeout."""
        attempt = 0
        packed_data = pkt.pack()

        while not self._stop_flag.is_set():
            attempt += 1
            if attempt > (self.max_retries + 1):
                raise TimeoutError(
                    f"Stop-and-Wait failed: Exceeded max retries ({self.max_retries}) for packet seq={pkt.seq}, type={pkt.pkt_type.name}"
                )

            # Set socket timeout based on RTT estimator
            current_timeout = self.rtt_estimator.get_timeout()
            sock.settimeout(current_timeout)

            # Timestamp packet send
            pkt.timestamp = time.time()
            packed_data = pkt.pack()

            # Transmit datagram
            sock.sendto(packed_data, (self.dest_host, self.dest_port))
            self.stats.sent_attempts += 1
            self.stats.total_bytes_sent += len(packed_data)

            if attempt > 1:
                self.stats.retransmissions += 1
                self.emit_event(
                    EventType.RETRANSMISSION,
                    seq=pkt.seq,
                    pkt_type=pkt.pkt_type.name,
                    attempt=attempt,
                    message=f"Retransmitting {pkt.pkt_type.name} seq={pkt.seq} (attempt {attempt})",
                )
            else:
                self.emit_event(
                    EventType.PACKET_SENT,
                    seq=pkt.seq,
                    pkt_type=pkt.pkt_type.name,
                    attempt=attempt,
                    message=f"Sent {pkt.pkt_type.name} seq={pkt.seq}",
                )

            # Wait for ACK
            try:
                while True:
                    ack_data, _ = sock.recvfrom(4096)
                    try:
                        ack_pkt = Packet.unpack(ack_data)
                    except CorruptPacketError:
                        self.stats.corrupted_detected += 1
                        continue  # Corrupted ACK; treat like lost ACK, wait for timeout

                    if ack_pkt.pkt_type == PacketType.ACK:
                        if ack_pkt.ack == expected_ack:
                            # Valid matching ACK received
                            now = time.time()
                            rtt = self.rtt_estimator.update_sample(
                                seq=expected_ack,
                                send_timestamp=pkt.timestamp,
                                receive_timestamp=now,
                                is_retransmission=(attempt > 1),
                            )
                            self.stats.record_rtt(rtt)
                            self.stats.acks_received += 1
                            self.emit_event(
                                EventType.ACK_RECEIVED,
                                ack=ack_pkt.ack,
                                pkt_type="ACK",
                                rtt=rtt,
                                message=f"Received ACK {ack_pkt.ack} (RTT: {rtt * 1000:.1f}ms)",
                            )
                            return  # Successfully ACKed!
                        else:
                            # Stale / out-of-order ACK; continue listening until timeout
                            continue

            except (socket.timeout, ConnectionResetError, OSError):
                self.stats.timeouts += 1
                self.rtt_estimator.on_timeout()
                self.emit_event(
                    EventType.TIMEOUT,
                    seq=pkt.seq,
                    pkt_type=pkt.pkt_type.name,
                    attempt=attempt,
                    message=f"Timeout waiting for ACK {expected_ack} (timeout={current_timeout:.3f}s)",
                )
                continue


class StopAndWaitReceiver(BaseReceiver):
    @property
    def protocol_name(self) -> str:
        return "saw"

    def listen_and_receive(self, timeout_seconds: Optional[float] = None) -> Tuple[bytes, TransferStats]:
        sock = self._setup_socket()
        self.stats.start_time = time.time()
        self.stats.status = "running"

        expected_seq = 0
        total_packets: Optional[int] = None
        received_chunks: list[bytes] = []
        sender_addr = None
        overall_deadline = (time.time() + timeout_seconds) if timeout_seconds else None

        self.emit_event(
            EventType.TRANSFER_STARTED,
            message=f"Receiver listening on port {self.listen_port} for Stop-and-Wait transfer",
        )

        try:
            while not self._stop_flag.is_set():
                if overall_deadline and time.time() > overall_deadline:
                    raise TimeoutError("Receiver exceeded overall transfer timeout limit")

                try:
                    data, addr = sock.recvfrom(65535)
                except socket.timeout:
                    continue

                try:
                    pkt = Packet.unpack(data)
                except CorruptPacketError as e:
                    self.stats.corrupted_detected += 1
                    self.emit_event(
                        EventType.PACKET_CORRUPTED,
                        message=f"Received corrupt packet: {e}. Discarding.",
                    )
                    continue

                sender_addr = addr

                # Handle START
                if pkt.pkt_type == PacketType.START:
                    meta = pkt.parse_metadata()
                    self.stats.file_name = meta.get("filename", "received.bin")
                    self.stats.file_size_bytes = meta.get("file_size", 0)
                    self.stats.total_data_packets = meta.get("total_packets", 0)
                    self.stats.original_sha256 = meta.get("sha256", "")
                    total_packets = self.stats.total_data_packets
                    expected_seq = 0
                    received_chunks = []

                    # Send ACK(0)
                    ack_pkt = Packet.create_ack(ack=0)
                    sock.sendto(ack_pkt.pack(), sender_addr)
                    self.stats.acks_sent += 1
                    self.emit_event(
                        EventType.ACK_SENT,
                        ack=0,
                        message=f"Received START for '{self.stats.file_name}'. Sent ACK 0.",
                        details=meta,
                    )

                # Handle DATA
                elif pkt.pkt_type == PacketType.DATA:
                    self.emit_event(
                        EventType.PACKET_RECEIVED,
                        seq=pkt.seq,
                        pkt_type="DATA",
                        message=f"Received DATA seq={pkt.seq}",
                    )

                    if pkt.seq == expected_seq:
                        # In-order packet
                        received_chunks.append(pkt.payload)
                        self.stats.unique_packets_delivered += 1
                        self.stats.useful_bytes_sent += len(pkt.payload)
                        expected_seq += 1

                        # Send ACK
                        ack_pkt = Packet.create_ack(ack=pkt.seq)
                        sock.sendto(ack_pkt.pack(), sender_addr)
                        self.stats.acks_sent += 1
                        self.emit_event(
                            EventType.ACK_SENT,
                            ack=pkt.seq,
                            message=f"Sent ACK {pkt.seq} for in-order DATA",
                        )

                    elif pkt.seq < expected_seq:
                        # Duplicate packet: sender likely timed out due to lost ACK
                        self.stats.duplicates_detected += 1
                        self.emit_event(
                            EventType.DUPLICATE_DETECTED,
                            seq=pkt.seq,
                            message=f"Duplicate DATA seq={pkt.seq} (expected {expected_seq}). Resending ACK {pkt.seq}.",
                        )
                        # Re-send ACK so sender can advance
                        ack_pkt = Packet.create_ack(ack=pkt.seq)
                        sock.sendto(ack_pkt.pack(), sender_addr)
                        self.stats.acks_sent += 1

                    else:
                        # Future / out-of-order packet (should not occur in SAW)
                        self.emit_event(
                            EventType.PACKET_REORDERED,
                            seq=pkt.seq,
                            message=f"Out-of-order DATA seq={pkt.seq} (expected {expected_seq}). Discarding.",
                        )

                # Handle END
                elif pkt.pkt_type == PacketType.END:
                    self.emit_event(
                        EventType.PACKET_RECEIVED,
                        seq=pkt.seq,
                        pkt_type="END",
                        message=f"Received END packet seq={pkt.seq}",
                    )
                    # Acknowledge END
                    ack_pkt = Packet.create_ack(ack=pkt.seq)
                    for _ in range(3):
                        sock.sendto(ack_pkt.pack(), sender_addr)
                        self.stats.acks_sent += 1
                        time.sleep(0.01)

                    # Reconstruct file
                    reconstructed_bytes = b"".join(received_chunks)
                    self.stats.reconstructed_sha256 = compute_file_sha256(reconstructed_bytes)
                    self.stats.verified = (
                        self.stats.reconstructed_sha256 == self.stats.original_sha256
                    )
                    self.stats.end_time = time.time()
                    self.stats.status = "completed" if self.stats.verified else "failed"

                    # Save file if output directory specified
                    if self.output_dir:
                        os.makedirs(self.output_dir, exist_ok=True)
                        out_path = os.path.join(self.output_dir, self.stats.file_name)
                        with open(out_path, "wb") as f:
                            f.write(reconstructed_bytes)

                    self.emit_event(
                        EventType.TRANSFER_COMPLETE if self.stats.verified else EventType.TRANSFER_FAILED,
                        message=f"Transfer complete. SHA-256 {'VERIFIED' if self.stats.verified else 'MISMATCH'}!",
                        details={
                            "verified": self.stats.verified,
                            "original_sha256": self.stats.original_sha256,
                            "reconstructed_sha256": self.stats.reconstructed_sha256,
                        },
                    )
                    return reconstructed_bytes, self.stats

        finally:
            self._close_socket()

        return b"", self.stats
