"""
CLI Receiver for Reliable UDP Lab.
Listens on UDP socket, receives file transfer, prints live events and verifies SHA-256 integrity.
"""
import argparse
import sys
import os

# Ensure backend modules can be imported
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from protocol.stop_and_wait import StopAndWaitReceiver
from protocol.events import Event, EventType


def cli_event_listener(event: Event) -> None:
    time_str = f"[{event.timestamp:.3f}]"
    if event.event_type == EventType.PACKET_RECEIVED:
        print(f"{time_str} \033[94mRECV\033[0m: {event.message}")
    elif event.event_type == EventType.ACK_SENT:
        print(f"{time_str} \033[92mACK \033[0m: {event.message}")
    elif event.event_type == EventType.DUPLICATE_DETECTED:
        print(f"{time_str} \033[93mDUPL\033[0m: {event.message}")
    elif event.event_type == EventType.PACKET_CORRUPTED:
        print(f"{time_str} \033[91mCORR\033[0m: {event.message}")
    elif event.event_type == EventType.TRANSFER_COMPLETE:
        print(f"{time_str} \033[92mDONE\033[0m: {event.message}")
    elif event.event_type == EventType.TRANSFER_FAILED:
        print(f"{time_str} \033[91mFAIL\033[0m: {event.message}")
    else:
        print(f"{time_str} INFO: {event.message}")


def main():
    parser = argparse.ArgumentParser(description="Reliable UDP Lab - CLI Receiver")
    parser.add_argument(
        "-p", "--protocol", choices=["saw", "gbn", "sr"], default="saw", help="ARQ protocol to use"
    )
    parser.add_argument("--host", default="0.0.0.0", help="Listen IP address")
    parser.add_argument("--port", type=int, default=9001, help="Listen UDP port")
    parser.add_argument("--out-dir", default="received_files", help="Directory to save received file")
    args = parser.parse_args()

    print("=" * 60)
    print("           RELIABLE UDP LAB - RECEIVER")
    print(f" Protocol: {args.protocol.upper()}")
    print(f" Listening on: {args.host}:{args.port}")
    print(f" Output Directory: {args.out_dir}")
    print("=" * 60)

    if args.protocol == "saw":
        receiver = StopAndWaitReceiver(
            listen_host=args.host,
            listen_port=args.port,
            output_dir=args.out_dir,
        )
    elif args.protocol == "gbn":
        from protocol.go_back_n import GoBackNReceiver
        receiver = GoBackNReceiver(
            listen_host=args.host,
            listen_port=args.port,
            output_dir=args.out_dir,
        )
    elif args.protocol == "sr":
        from protocol.selective_repeat import SelectiveRepeatReceiver
        receiver = SelectiveRepeatReceiver(
            listen_host=args.host,
            listen_port=args.port,
            output_dir=args.out_dir,
        )
    else:
        print(f"Unknown protocol: {args.protocol}")
        sys.exit(1)

    receiver.event_bus.subscribe(cli_event_listener)

    try:
        data, stats = receiver.listen_and_receive()
        print("\n" + "=" * 60)
        print(" TRANSFER SUMMARY:")
        print(f"  File: {stats.file_name} ({stats.file_size_bytes} bytes)")
        print(f"  Unique Packets Delivered: {stats.unique_packets_delivered}/{stats.total_data_packets}")
        print(f"  Duplicates Detected: {stats.duplicates_detected}")
        print(f"  Corrupted Detected: {stats.corrupted_detected}")
        print(f"  Original SHA-256:     {stats.original_sha256}")
        print(f"  Reconstructed SHA-256: {stats.reconstructed_sha256}")
        if stats.verified:
            print("  Status: \033[92mVERIFIED - FILE INTEGRITY MATCHES 100%\033[0m")
        else:
            print("  Status: \033[91mFAILED - CHECKSUM MISMATCH\033[0m")
        print("=" * 60)
    except KeyboardInterrupt:
        print("\nReceiver stopped by user.")
        receiver.stop()


if __name__ == "__main__":
    main()
