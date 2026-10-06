"""
CLI Sender for Reliable UDP Lab.
Sends a file using selected ARQ protocol over UDP sockets with live metrics and RTT tracking.
"""
import argparse
import sys
import os

# Ensure backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from protocol.stop_and_wait import StopAndWaitSender
from protocol.events import Event, EventType


def cli_event_listener(event: Event) -> None:
    time_str = f"[{event.timestamp:.3f}]"
    if event.event_type == EventType.PACKET_SENT:
        print(f"{time_str} \033[94mSEND\033[0m: {event.message}")
    elif event.event_type == EventType.ACK_RECEIVED:
        print(f"{time_str} \033[92mACK \033[0m: {event.message}")
    elif event.event_type == EventType.TIMEOUT:
        print(f"{time_str} \033[91mTOUT\033[0m: {event.message}")
    elif event.event_type == EventType.RETRANSMISSION:
        print(f"{time_str} \033[93mRETX\033[0m: {event.message}")
    elif event.event_type == EventType.TRANSFER_PROGRESS:
        print(f"{time_str} PROG: {event.message}")
    elif event.event_type == EventType.TRANSFER_COMPLETE:
        print(f"{time_str} \033[92mDONE\033[0m: {event.message}")
    elif event.event_type == EventType.TRANSFER_FAILED:
        print(f"{time_str} \033[91mFAIL\033[0m: {event.message}")
    else:
        print(f"{time_str} INFO: {event.message}")


def main():
    parser = argparse.ArgumentParser(description="Reliable UDP Lab - CLI Sender")
    parser.add_argument("-f", "--file", required=True, help="Path to file to send")
    parser.add_argument(
        "-p", "--protocol", choices=["saw", "gbn", "sr"], default="saw", help="ARQ protocol to use"
    )
    parser.add_argument("--host", default="127.0.0.1", help="Destination host IP")
    parser.add_argument("--port", type=int, default=9001, help="Destination UDP port")
    parser.add_argument("--packet-size", type=int, default=1024, help="Payload size per packet in bytes")
    parser.add_argument("--timeout", type=float, default=1.0, help="Base retransmission timeout in seconds")
    parser.add_argument("--window-size", "-w", type=int, default=4, help="Window size N (for GBN/SR)")
    parser.add_argument("--no-adaptive", action="store_true", help="Disable adaptive RTT timeout (use fixed)")
    parser.add_argument("--max-retries", type=int, default=10, help="Max retransmissions before failure")
    args = parser.parse_args()

    if not os.path.isfile(args.file):
        print(f"Error: File '{args.file}' not found.")
        sys.exit(1)

    with open(args.file, "rb") as f:
        file_bytes = f.read()

    filename = os.path.basename(args.file)

    print("=" * 60)
    print("           RELIABLE UDP LAB - SENDER")
    print(f" File: {filename} ({len(file_bytes)} bytes)")
    print(f" Protocol: {args.protocol.upper()}")
    print(f" Target: {args.host}:{args.port}")
    print(f" Packet Size: {args.packet_size} bytes")
    print(f" Window Size: {args.window_size if args.protocol != 'saw' else 1}")
    print(f" Adaptive Timeout: {not args.no_adaptive} (base={args.timeout}s)")
    print("=" * 60)

    if args.protocol == "saw":
        sender = StopAndWaitSender(
            dest_host=args.host,
            dest_port=args.port,
            packet_size=args.packet_size,
            timeout=args.timeout,
            adaptive_timeout=not args.no_adaptive,
            max_retries=args.max_retries,
        )
    elif args.protocol == "gbn":
        from protocol.go_back_n import GoBackNSender
        sender = GoBackNSender(
            dest_host=args.host,
            dest_port=args.port,
            packet_size=args.packet_size,
            window_size=args.window_size,
            timeout=args.timeout,
            adaptive_timeout=not args.no_adaptive,
            max_retries=args.max_retries,
        )
    elif args.protocol == "sr":
        from protocol.selective_repeat import SelectiveRepeatSender
        sender = SelectiveRepeatSender(
            dest_host=args.host,
            dest_port=args.port,
            packet_size=args.packet_size,
            window_size=args.window_size,
            timeout=args.timeout,
            adaptive_timeout=not args.no_adaptive,
            max_retries=args.max_retries,
        )
    else:
        print(f"Unknown protocol: {args.protocol}")
        sys.exit(1)

    sender.event_bus.subscribe(cli_event_listener)

    try:
        stats = sender.send_data(file_bytes, filename=filename)
        print("\n" + "=" * 60)
        print(" SENDER TRANSFER METRICS:")
        print(f"  Duration: {stats.duration_seconds:.3f} s")
        print(f"  Total Data Packets: {stats.total_data_packets}")
        print(f"  Sent Attempts: {stats.sent_attempts}")
        print(f"  Retransmissions: {stats.retransmissions}")
        print(f"  Timeouts: {stats.timeouts}")
        print(f"  Throughput: {stats.throughput_mbps:.3f} Mbps")
        print(f"  Protocol Efficiency: {stats.protocol_efficiency * 100:.1f}%")
        print(f"  Theoretical SAW Efficiency: {stats.theoretical_saw_efficiency * 100:.1f}%")
        print(f"  Avg RTT: {stats.avg_rtt_ms:.2f} ms" if stats.avg_rtt_ms else "  Avg RTT: N/A")
        print("=" * 60)
    except KeyboardInterrupt:
        print("\nSender stopped by user.")
        sender.stop()
    except Exception as e:
        print(f"\nTransfer failed with error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
