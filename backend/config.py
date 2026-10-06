"""
Configuration and default parameters for Reliable UDP Lab.
"""
from dataclasses import dataclass, field
from typing import Dict, Any


@dataclass
class ServerConfig:
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    proxy_host: str = "127.0.0.1"
    proxy_port: int = 9000
    receiver_host: str = "127.0.0.1"
    receiver_port: int = 9001
    default_packet_size: int = 1024
    default_timeout: float = 1.0
    default_window_size: int = 4
    default_max_retries: int = 15
    uploads_dir: str = "temp_uploads"
    received_dir: str = "received_files"


DEFAULT_CONFIG = ServerConfig()
