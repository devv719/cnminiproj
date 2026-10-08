import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  ExternalLink,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ShieldCheck,
  FileCode,
  Radio,
  Sliders,
  Sparkles,
  BookOpen,
  Video,
  FileText
} from 'lucide-react';
import { ScrollReveal, ScrollStagger, ScrollText } from './ScrollAnimations';

// ============================================================================
// 1. ARQ INTERACTIVE PACKET-FLOW VISUALIZER
// ============================================================================
function ArqMiniVisualizer({ type }) {
  const [step, setStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Auto-step loop for micro animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStep((prev) => (prev + 1) % 6);
    }, 1400);
    return () => clearInterval(interval);
  }, [isPlaying, type]);

  // Protocol specific state descriptions
  const stepData = {
    saw: [
      { text: 'Sender transmits Packet 0', sender: 'PKT 0 →', receiver: 'Idle', progress: 20, status: 'flight' },
      { text: 'Receiver verifies CRC & accepts Packet 0', sender: 'Waiting ACK', receiver: 'CRC OK → ACK 0', progress: 50, status: 'ack-gen' },
      { text: 'ACK 0 propagates back to Sender', sender: 'Waiting ACK', receiver: '← ACK 0', progress: 80, status: 'ack-flight' },
      { text: 'Sender receives ACK 0. Window moves to Packet 1', sender: 'ACK 0 OK! Slide', receiver: 'Ready', progress: 100, status: 'delivered' },
      { text: 'Sender transmits Packet 1', sender: 'PKT 1 →', receiver: 'Idle', progress: 20, status: 'flight' },
      { text: 'Receiver verifies CRC & delivers Packet 1', sender: 'Waiting ACK', receiver: 'CRC OK → ACK 1', progress: 50, status: 'delivered' }
    ],
    gbn: [
      { text: 'Sender bursts Window (Packets 0, 1, 2, 3)', sender: 'Window [0..3] →', receiver: 'Ready', progress: 25, status: 'flight' },
      { text: 'Packet 1 is DROPPED in noisy channel', sender: 'Flight [0, 1(LOST), 2, 3]', receiver: 'PKT 0 OK → ACK 0', progress: 45, status: 'loss' },
      { text: 'Receiver gets 2 & 3 out-of-order → Discards & Sends Dup ACK 0', sender: 'In flight', receiver: 'Discard 2,3! ← Dup ACK 0', progress: 65, status: 'discard' },
      { text: 'Sender Timer for Packet 1 EXPIRES (Timeout)', sender: 'Timeout on PKT 1!', receiver: 'Waiting PKT 1', progress: 85, status: 'timeout' },
      { text: 'Sender rewinds window and retransmits ALL [1, 2, 3]', sender: 'Rewind & Resend [1, 2, 3] →', receiver: 'Waiting', progress: 95, status: 'resend' },
      { text: 'Receiver gets Packet 1, 2, 3 in sequence → Cumulative ACK 3', sender: 'Window slides to [4..7]', receiver: 'Delivered [1..3]! ← ACK 3', progress: 100, status: 'delivered' }
    ],
    sr: [
      { text: 'Sender bursts Window (Packets 0, 1, 2, 3)', sender: 'Window [0..3] →', receiver: 'Ready', progress: 25, status: 'flight' },
      { text: 'Packet 1 is DROPPED. Receiver receives 0, 2, 3', sender: 'Flight [0, 1(LOST), 2, 3]', receiver: 'Buffer [2, 3] & ACK 0, SACK 2, 3', progress: 50, status: 'loss' },
      { text: 'Receiver individually ACKs 2 & 3 and holds in buffer', sender: 'Got ACK 0, SACK 2, 3', receiver: 'Buffer holds [2,3] ← SACK 2, 3', progress: 70, status: 'buffer' },
      { text: 'Sender timer for Packet 1 expires. Only Packet 1 is resubmitted', sender: 'Retransmit ONLY PKT 1 →', receiver: 'Awaiting PKT 1', progress: 85, status: 'resend' },
      { text: 'Receiver gets missing Packet 1 & reassembles continuous byte stream', sender: 'Waiting ACK 1', receiver: 'Reassemble [0,1,2,3] → Deliver', progress: 95, status: 'delivered' },
      { text: 'Sender receives ACK 3. Window slides forward efficiently', sender: 'Slide Window to [4..7]', receiver: 'Ready for [4..7]', progress: 100, status: 'delivered' }
    ]
  };

  const current = stepData[type][step];

  return (
    <div className="mt-4 p-4 bg-[#141413] text-[#F5F3EE] rounded-xl border border-[#2A2A28] font-mono text-xs select-none">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2A2A28]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#00FB96] animate-pulse" />
          <span className="text-[10px] tracking-wider text-[#969389] uppercase font-bold">
            Live Packet Simulation
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#969389]">Step {step + 1}/6</span>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1 hover:text-[#00FB96] transition-colors"
            title={isPlaying ? 'Pause simulation' : 'Play simulation'}
          >
            {isPlaying ? <span className="text-[10px] px-1 border border-[#3A3A38] rounded">PAUSE</span> : <Play className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* Wire Diagram */}
      <div className="relative py-3 px-2 bg-[#1C1C1A] rounded-lg border border-[#2A2A28] mb-3">
        <div className="flex justify-between items-center text-[11px] mb-2 font-semibold">
          <span className="text-[#00FB96]">SENDER (TX)</span>
          <span className="text-[#BEB9AC]">RECEIVER (RX)</span>
        </div>

        {/* Animated Wire Track */}
        <div className="relative h-6 bg-[#141413] rounded flex items-center px-2 overflow-hidden border border-[#2A2A28]">
          <div
            className="absolute h-full bg-[#00FB96]/10 transition-all duration-700 ease-out"
            style={{ width: `${current.progress}%` }}
          />

          {/* Animated Packet Token */}
          <motion.div
            key={`${type}-${step}`}
            initial={{ left: current.progress > 50 ? '80%' : '10%', opacity: 0 }}
            animate={{ left: `${current.progress}%`, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            className={`absolute -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-bold shadow-sm ${
              current.status === 'loss'
                ? 'bg-rose-500 text-white'
                : current.status === 'timeout'
                ? 'bg-amber-500 text-black'
                : current.status === 'discard'
                ? 'bg-orange-500 text-white'
                : 'bg-[#00FB96] text-[#141413]'
            }`}
          >
            {current.status === 'loss' ? '✕ DROP' : current.status === 'timeout' ? '⏱ TIMEOUT' : 'DATAGRAM'}
          </motion.div>
        </div>

        {/* Status markers */}
        <div className="flex justify-between mt-2 text-[10px] text-[#969389]">
          <span>Tx: {current.sender}</span>
          <span>Rx: {current.receiver}</span>
        </div>
      </div>

      {/* Step Explanation */}
      <div className="text-[11px] text-[#DCD9D1] leading-relaxed flex items-start gap-2 bg-[#181816] p-2.5 rounded border border-[#2A2A28]">
        <span className="text-[#00FB96] font-bold">❯</span>
        <span>{current.text}</span>
      </div>
    </div>
  );
}

// ============================================================================
// 2. INTERACTIVE PACKET HEADER FIELD INSPECTOR
// ============================================================================
const HEADER_FIELDS = [
  {
    id: 'type',
    name: 'TYPE',
    bytes: '1 Byte',
    offset: '0..1',
    format: 'B (uint8)',
    desc: 'Protocol command indicator. Defines whether the datagram is DATA (0x01), ACK (0x02), SYN (0x03), or FIN (0x04) for connection handshake & teardown.',
    example: '0x01 (DATA)',
    bitWidth: '8 Bits'
  },
  {
    id: 'seq',
    name: 'SEQ NUM',
    bytes: '4 Bytes',
    offset: '1..5',
    format: 'I (uint32)',
    desc: 'Monotonically increasing sequence number in big-endian network byte order. Enables receiver gap detection, duplicate rejection, and in-order reassembly.',
    example: '0x0000002A (42)',
    bitWidth: '32 Bits'
  },
  {
    id: 'ack',
    name: 'ACK NUM',
    bytes: '4 Bytes',
    offset: '5..9',
    format: 'I (uint32)',
    desc: 'Acknowledgment sequence number. In Go-Back-N, represents cumulative next-expected byte. In Selective Repeat, confirms receipt of specific segment.',
    example: '0x0000002A (42)',
    bitWidth: '32 Bits'
  },
  {
    id: 'checksum',
    name: 'CHECKSUM',
    bytes: '4 Bytes',
    offset: '9..13',
    format: 'I (uint32)',
    desc: 'IEEE 802.3 CRC-32 cyclic redundancy check computed over entire payload chunk. Verified before any processing; corrupted packets are silently discarded.',
    example: '0x9B14E8F2',
    bitWidth: '32 Bits'
  },
  {
    id: 'length',
    name: 'PAYLOAD LEN',
    bytes: '2 Bytes',
    offset: '13..15',
    format: 'H (uint16)',
    desc: 'Exact byte count of following data payload (0 to 1024 bytes). Handles final partial chunks cleanly without zero-padding corruption.',
    example: '0x0400 (1024)',
    bitWidth: '16 Bits'
  },
  {
    id: 'flags',
    name: 'FLAGS / PAD',
    bytes: '8 Bytes',
    offset: '15..23',
    format: '8s (bytes[8])',
    desc: 'Reserved control flags, SACK bitmap bitmasks, and 64-bit boundary alignment padding for future protocol extensions and hardware DMA acceleration.',
    example: '0x0000000000000000',
    bitWidth: '64 Bits'
  }
];

// ============================================================================
// 3. INTERACTIVE ADAPTIVE RTT SIMULATOR
// ============================================================================
function AdaptiveRttSimulator() {
  const [sampleRtt, setSampleRtt] = useState(35);
  const [history, setHistory] = useState([
    { sample: 30, srtt: 30, rttvar: 15, rto: 90 },
    { sample: 32, srtt: 30.25, rttvar: 11.75, rto: 77.25 },
    { sample: 45, srtt: 32.09, rttvar: 12.04, rto: 80.25 },
    { sample: 35, srtt: 32.45, rttvar: 9.67, rto: 71.13 }
  ]);

  const alpha = 0.125;
  const beta = 0.25;
  const K = 4;
  const G = 1; // 1ms clock granularity

  const latest = history[history.length - 1];
  const newSrtt = ((1 - alpha) * latest.srtt + alpha * sampleRtt).toFixed(2);
  const newRttvar = ((1 - beta) * latest.rttvar + beta * Math.abs(latest.srtt - sampleRtt)).toFixed(2);
  const newRto = (parseFloat(newSrtt) + Math.max(G, K * parseFloat(newRttvar))).toFixed(2);

  const handlePushSample = () => {
    setHistory((prev) => [
      ...prev.slice(-5),
      {
        sample: sampleRtt,
        srtt: parseFloat(newSrtt),
        rttvar: parseFloat(newRttvar),
        rto: parseFloat(newRto)
      }
    ]);
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-[#ECE9E2] gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
            RFC 6298 Mathematical Engine
          </span>
          <h3 className="font-editorial text-2xl font-bold text-[#141413]">
            Live RTT Estimator & Timer Bounds
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#626059]">Interactive Mode</span>
          <span className="w-2.5 h-2.5 rounded-full bg-[#00FB96]" />
        </div>
      </div>

      {/* Interactive Slider & Live Calculation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-8">
        <div className="lg:col-span-6 space-y-4">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[#626059] uppercase font-bold">Inject Measured SampleRTT:</span>
            <span className="text-base font-extrabold text-[#141413] bg-[#F5F3EE] px-2.5 py-1 rounded border border-[#DCD9D1]">
              {sampleRtt} ms
            </span>
          </div>

          <input
            type="range"
            min="5"
            max="180"
            value={sampleRtt}
            onChange={(e) => setSampleRtt(Number(e.target.value))}
            className="w-full cursor-pointer accent-[#141413]"
          />

          <div className="flex justify-between text-[10px] font-mono text-[#969389]">
            <span>5ms (Fiber LAN)</span>
            <span>60ms (Wi-Fi)</span>
            <span>180ms (Intercontinental)</span>
          </div>

          <div className="pt-2">
            <button
              onClick={handlePushSample}
              className="w-full py-2.5 px-4 bg-[#141413] text-[#F5F3EE] hover:bg-[#2A2A28] rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.99]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#00FB96]" />
              Update EWMA Smoothed State
            </button>
          </div>
        </div>

        {/* Live Gauges */}
        <div className="lg:col-span-6 grid grid-cols-3 gap-3 font-mono text-center">
          <div className="p-4 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
            <span className="text-[10px] text-[#969389] uppercase block mb-1">SRTT</span>
            <div className="text-xl font-extrabold text-[#141413]">{newSrtt}</div>
            <span className="text-[9px] text-[#626059]">ms (α=0.125)</span>
          </div>

          <div className="p-4 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
            <span className="text-[10px] text-[#969389] uppercase block mb-1">RTTVAR</span>
            <div className="text-xl font-extrabold text-[#141413]">{newRttvar}</div>
            <span className="text-[9px] text-[#626059]">ms (β=0.25)</span>
          </div>

          <div className="p-4 bg-[#141413] text-[#F5F3EE] rounded-xl border border-[#141413]">
            <span className="text-[10px] text-[#00FB96] uppercase block mb-1 font-bold">RTO DEADLINE</span>
            <div className="text-xl font-extrabold text-[#00FB96]">{newRto}</div>
            <span className="text-[9px] text-[#969389]">ms (SRTT+4·VAR)</span>
          </div>
        </div>
      </div>

      {/* Animated Visual Flow: Sender -> Packet -> Receiver -> ACK */}
      <div className="p-5 bg-[#141413] text-[#F5F3EE] rounded-xl border border-[#2A2A28] space-y-4">
        <div className="text-[11px] font-mono text-[#969389] flex items-center justify-between">
          <span className="uppercase font-bold text-[#00FB96]">Protocol RTT Timeline & Watchdog Timer</span>
          <span>Sample = {sampleRtt}ms | Timeout Boundary = {newRto}ms</span>
        </div>

        <div className="relative py-4 px-2">
          {/* Timeline bar */}
          <div className="h-3 w-full bg-[#2A2A28] rounded-full overflow-hidden relative">
            {/* Measured RTT progress */}
            <motion.div
              className="h-full bg-[#00FB96]"
              animate={{ width: `${Math.min(100, (sampleRtt / 200) * 100)}%` }}
              transition={{ duration: 0.4 }}
            />
            {/* RTO marker */}
            <motion.div
              className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10"
              animate={{ left: `${Math.min(99, (parseFloat(newRto) / 200) * 100)}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>

          <div className="flex justify-between items-center text-[10px] font-mono text-[#969389] mt-2">
            <span className="text-[#00FB96]">0ms: Sender Transmits [SEQ=k]</span>
            <span className="text-[#00FB96]">{sampleRtt}ms: ACK Arrives</span>
            <span className="text-amber-400">{newRto}ms: RTO Timeout Threshold</span>
          </div>
        </div>

        <div className="text-xs font-mono text-[#DCD9D1] bg-[#1C1C1A] p-3 rounded-lg border border-[#2A2A28] leading-relaxed">
          <strong className="text-[#00FB96]">Karn's Algorithm Guard:</strong> If a packet is retransmitted upon timeout, the subsequent ACK is ambiguous (did it acknowledge original or retransmit?). SampleRTT measurements for retransmissions are strictly omitted from EWMA calculations to prevent variance corruption.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. PACKET JOURNEY (SCROLL-DRIVEN 10-STEP TECHNICAL STORY)
// ============================================================================
const JOURNEY_STEPS = [
  {
    step: '01',
    label: 'FILE INPUT',
    title: 'Raw Binary Byte Stream',
    desc: 'The application reads the target file from storage as an immutable byte sequence, computing its authoritative cryptographic SHA-256 hash.',
    detail: 'SHA-256 Digest generated before serialization'
  },
  {
    step: '02',
    label: 'CHUNKING',
    title: 'Payload Segmentation',
    desc: 'The byte stream is segmented into fixed-size chunks (default 1024 bytes). The final chunk handles remainder bytes without zero-padding drift.',
    detail: 'Chunk size = 1024 Bytes (Configurable MSS)'
  },
  {
    step: '03',
    label: 'PACKETIZATION',
    title: 'Binary Header Encapsulation',
    desc: 'Each chunk is prefixed with a 20-byte struct header containing Type, Seq, Ack, Checksum, Length, and Flags packed in big-endian network byte order (!BIIIH8s).',
    detail: 'Header overhead = 20 Bytes per Datagram'
  },
  {
    step: '04',
    label: 'NUMBERING',
    title: 'Monotonic Sequence Numbering',
    desc: 'Every datagram receives an incrementing 32-bit sequence integer (k = 0, 1, 2...). This provides total ordering for gap detection and stream reconstruction.',
    detail: 'Range: 0 to 2^32 - 1 (Wraps safely)'
  },
  {
    step: '05',
    label: 'CRC-32',
    title: 'Polynomial Error Detection',
    desc: 'A 32-bit IEEE 802.3 CRC checksum is calculated over the raw chunk data. Any bit-flip induced by channel noise will cause a polynomial mismatch.',
    detail: 'Polynomial: 0xEDB88320 (IEEE 802.3 standard)'
  },
  {
    step: '06',
    label: 'UDP EMISSION',
    title: 'Datagram Kernel Dispatch',
    desc: 'The completed binary packet is passed to the OS kernel via POSIX/Windows sendto() socket syscall across the simulated lossy, jittery network channel.',
    detail: 'Connectionless, minimal kernel overhead'
  },
  {
    step: '07',
    label: 'RECEIVER',
    title: 'Socket Ingestion & Verification',
    desc: 'The receiver extracts the datagram via recvfrom(), unpacks the 20-byte header, and validates the calculated CRC-32 against the header checksum.',
    detail: 'Corrupted datagrams are immediately rejected'
  },
  {
    step: '08',
    label: 'ACK DISPATCH',
    title: 'Feedback Confirmation',
    desc: 'The receiver generates an ACK datagram carrying the acknowledged sequence number and sends it back to the transmitter.',
    detail: 'GBN = Cumulative ACK | SR = Selective ACK'
  },
  {
    step: '09',
    label: 'VERIFICATION',
    title: 'Window Advancement & File Assembly',
    desc: 'Upon receiving valid ACK, the sender advances its transmission window. The receiver writes verified chunks in byte order into the reconstructed file.',
    detail: 'Reassembled file matches original byte-for-byte'
  },
  {
    step: '10',
    label: 'RETRANSMISSION',
    title: 'Watchdog Timer Recovery',
    desc: 'If an ACK is not received before the dynamically computed RTO timer expires, the sender automatically retransmits the missing datagram.',
    detail: 'Exponential Backoff prevents congestion collapse'
  }
];

// ============================================================================
// 5. INTERACTIVE INFORMATION DOTS SECTION
// ============================================================================
const DOC_DOTS = [
  { id: 'udp', title: 'UDP PROTOCOL', text: 'User Datagram Protocol is connectionless and lightweight. It provides zero delivery or ordering guarantees, making it the ideal base for custom transport logic.', x: 12, y: 15 },
  { id: 'arq', title: 'ARQ MECHANISMS', text: 'Automatic Repeat reQuest protocols (Stop-and-Wait, Go-Back-N, Selective Repeat) use feedback and timers to ensure 100% reliable packet delivery.', x: 38, y: 28 },
  { id: 'seq', title: 'SEQUENCE NUMBERS', text: 'Monotonic 32-bit sequence identifiers allow the receiver to detect missing packets, discard duplicates, and assemble bytes in pristine order.', x: 72, y: 18 },
  { id: 'crc', title: 'CRC-32 CHECKSUM', text: 'Cyclic Redundancy Check computes a 32-bit polynomial hash. Receiver recalculates the checksum and discards datagrams with corrupted bits.', x: 88, y: 45 },
  { id: 'loss', title: 'PACKET LOSS', text: 'Simulates dropped packets at routers. Absence of acknowledgment causes the sender timer to expire and trigger automated retransmission.', x: 22, y: 62 },
  { id: 'timeout', title: 'TIMEOUT ENGINE', text: 'High-resolution asynchronous timers track every packet in flight. If time exceeds RTO boundary, recovery logic is immediately fired.', x: 50, y: 50 },
  { id: 'rtt', title: 'ADAPTIVE RTT', text: 'Jacobson / Karn EWMA algorithm continuously calculates smoothed RTT and variance to dynamically adapt timeout boundaries to live network latency.', x: 78, y: 75 },
  { id: 'sha', title: 'SHA-256 INTEGRITY', text: 'Authoritative cryptographic hash calculated across the entire source file and destination file to prove 100% byte-level accuracy.', x: 35, y: 85 },
];

function InteractiveDocDotsField() {
  const [activeDot, setActiveDot] = useState(null);

  return (
    <div className="bg-[#141413] text-[#F5F3EE] rounded-3xl p-8 sm:p-12 border border-[#2A2A28] relative overflow-hidden my-16 select-none">
      {/* Editorial Header inside Dots */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-8 mb-8 border-b border-[#2A2A28] gap-4">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#00FB96] block mb-1">
            06 / Concept Constellation
          </span>
          <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-[#F5F3EE]">
            Interactive Information Matrix
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#969389]">
          <span className="w-2 h-2 rounded-full bg-[#00FB96] animate-pulse" />
          <span>Hover or tap active glowing nodes</span>
        </div>
      </div>

      {/* Constellation Canvas */}
      <div className="relative w-full h-[420px] sm:h-[480px] bg-[#181816] rounded-2xl border border-[#2A2A28] overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-15"
          style={{
            backgroundImage: `radial-gradient(#969389 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />

        {/* Decorative inactive dots */}
        {[
          { x: 5, y: 40 }, { x: 18, y: 88 }, { x: 28, y: 10 }, { x: 45, y: 8 },
          { x: 58, y: 35 }, { x: 62, y: 90 }, { x: 82, y: 32 }, { x: 92, y: 88 },
          { x: 95, y: 12 }, { x: 15, y: 35 }, { x: 84, y: 15 }, { x: 48, y: 72 }
        ].map((d, i) => (
          <div
            key={`inactive-${i}`}
            className="absolute w-1.5 h-1.5 rounded-full bg-[#3A3A38]"
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
          />
        ))}

        {/* Active interactive dots */}
        {DOC_DOTS.map((dot) => {
          const isActive = activeDot?.id === dot.id;
          return (
            <div
              key={dot.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
              style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
              onMouseEnter={() => setActiveDot(dot)}
              onClick={() => setActiveDot(isActive ? null : dot)}
            >
              {/* Outer pulsing beacon ring */}
              <div
                className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? 'border-[#00FB96] bg-[#00FB96]/20 scale-125'
                    : 'border-[#00FB96]/40 hover:border-[#00FB96] bg-[#141413]'
                }`}
              >
                <div
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    isActive ? 'bg-[#00FB96]' : 'bg-[#00FB96]/80'
                  }`}
                />
              </div>

              {/* Monospace label tag */}
              <span className="text-[10px] font-mono tracking-wider text-[#BEB9AC] uppercase font-bold absolute top-9 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#141413]/90 px-1.5 py-0.5 rounded border border-[#2A2A28]">
                {dot.title}
              </span>
            </div>
          );
        })}

        {/* Floating Active Info Card Modal Overlay */}
        <AnimatePresence>
          {activeDot && (
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md bg-[#141413] border border-[#00FB96]/40 p-5 rounded-xl shadow-2xl z-30 font-mono text-xs"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#2A2A28]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00FB96]" />
                  <span className="text-[#00FB96] font-bold uppercase">{activeDot.title}</span>
                </div>
                <button
                  onClick={() => setActiveDot(null)}
                  className="text-[#969389] hover:text-[#F5F3EE] text-sm px-1"
                >
                  ✕
                </button>
              </div>
              <p className="text-[#DCD9D1] font-sans leading-relaxed text-sm">
                {activeDot.text}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ============================================================================
// 6. RESOURCES & REFERENCES SECTION (FINAL CHAPTER)
// ============================================================================
const YOUTUBE_RESOURCES = [
  {
    topic: 'Go-Back-N vs Selective Repeat',
    desc: 'Visual animated comparison of cumulative sliding window vs individual buffering protocols.',
    url: 'https://youtu.be/b8pho4bhafy',
    badge: 'ARQ PROTOCOLS'
  },
  {
    topic: 'Stop-and-Wait',
    desc: 'Lockstep half-duplex acknowledgment mechanism and channel utilization limits.',
    url: 'https://youtu.be/n09dfvemntq',
    badge: 'FUNDAMENTALS'
  },
  {
    topic: 'Jacobson/Karn RTT and Timeout',
    desc: 'Mathematical derivation of EWMA smoothed round-trip time and adaptive timer bounds.',
    url: 'https://youtu.be/yikuyilitzA',
    badge: 'RTT & TIMEOUT'
  }
];

const RESEARCH_PAPERS = [
  {
    author: 'Van Jacobson',
    title: 'Congestion Avoidance and Control',
    year: '1988',
    publication: 'ACM SIGCOMM Computer Communication Review',
    doi: '10.1145/52325.52356',
    url: 'https://doi.org/10.1145/52325.52356'
  },
  {
    author: 'P. Karn and C. Partridge',
    title: 'Improving Round-Trip Time Estimates in Reliable Transport Protocols',
    year: '1987',
    publication: 'ACM SIGCOMM Computer Communication Review',
    doi: '10.1145/55483.55484',
    url: 'https://doi.org/10.1145/55483.55484'
  },
  {
    author: 'Yunhong Gu and Robert L. Grossman',
    title: 'UDT: UDP-based Data Transfer for High-Speed Wide Area Networks',
    year: '2007',
    publication: 'Computer Networks, Elsevier',
    doi: '10.1016/j.comnet.2006.11.009',
    url: 'https://doi.org/10.1016/j.comnet.2006.11.009'
  }
];

const PROTOCOL_RFCS = [
  {
    code: 'RFC 768',
    title: 'User Datagram Protocol (UDP)',
    year: '1980',
    desc: 'Defines connectionless datagram transport and 8-byte header structure.',
    url: 'https://www.rfc-editor.org/rfc/rfc768.html'
  },
  {
    code: 'RFC 6298',
    title: "Computing TCP's Retransmission Timer",
    year: '2011',
    desc: 'Standardizes EWMA calculation of SRTT, RTTVAR, and conservative RTO backoff.',
    url: 'https://www.rfc-editor.org/rfc/rfc6298.html'
  },
  {
    code: 'RFC 1071',
    title: 'Computing the Internet Checksum',
    year: '1988',
    desc: 'Algorithms and mathematical principles behind high-throughput binary verification.',
    url: 'https://www.rfc-editor.org/rfc/rfc1071.html'
  },
  {
    code: 'RFC 9000',
    title: 'QUIC: A UDP-Based Multiplexed and Secure Transport',
    year: '2021',
    desc: 'Modern IETF standard for high-performance reliable stream multiplexing over UDP.',
    url: 'https://www.rfc-editor.org/rfc/rfc9000.html'
  }
];

// ============================================================================
// MAIN COMPONENT: DOCUMENTATION VIEW
// ============================================================================
export default function DocumentationView({ onEnterLab }) {
  const [selectedHeaderField, setSelectedHeaderField] = useState(HEADER_FIELDS[0]);
  const [selectedArqTab, setSelectedArqTab] = useState('saw');

  return (
    <div className="bg-[#F5F3EE] text-[#141413] selection:bg-[#141413] selection:text-[#F5F3EE] overflow-x-hidden min-h-screen">
      
      {/* ============================================================ */}
      {/* 1. HERO SECTION */}
      {/* ============================================================ */}
      <section className="relative pt-20 pb-24 md:pt-28 md:pb-32 border-b border-[#DCD9D1] bg-[#F5F3EE]">
        <div className="max-w-7xl mx-auto px-6">
          
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-[#141413]" />
            <span className="text-xs font-mono font-bold tracking-widest text-[#626059] uppercase">
              Computer Networks Technical Reference
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#141413] mb-8 leading-[1.08]"
          >
            reliable transport,<br />
            <span className="text-[#969389]">built over udp.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg sm:text-xl text-[#626059] max-w-3xl font-normal leading-relaxed mb-10"
          >
            How application-level reliability mechanisms guarantee in-order, lossless, uncorrupted byte stream delivery over unreliable User Datagram Protocol (UDP).
          </motion.p>

          {/* Technical Tags */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-wrap items-center gap-2 sm:gap-3"
          >
            {['stop-and-wait', 'arq', 'crc-32', 'adaptive rtt', 'retransmission'].map((tag) => (
              <span
                key={tag}
                className="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-[#FFFFFF] border border-[#DCD9D1] text-[#141413] shadow-sm hover:border-[#141413] transition-colors"
              >
                {tag}
              </span>
            ))}
          </motion.div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 2. ARQ COMPARISON WITH INTERACTIVE PACKET-FLOW VISUALIZATION */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 border-b border-[#DCD9D1] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-[#ECE9E2] gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-[#969389] uppercase block mb-2">
                01 / Protocol Architecture Comparison
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-[#141413]">
                ARQ Protocols Compared
              </h2>
            </div>
            <p className="text-xs font-mono text-[#626059] max-w-md">
              Hover over or select any protocol card below to run its real-time packet-flow state machine and window dynamics simulation.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Card 1: Stop-and-Wait */}
            <motion.div
              whileHover={{ y: -4 }}
              onClick={() => setSelectedArqTab('saw')}
              className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                selectedArqTab === 'saw'
                  ? 'bg-[#F5F3EE] border-[#141413] shadow-md ring-1 ring-[#141413]'
                  : 'bg-[#FAF8F5] border-[#DCD9D1] hover:border-[#BEB9AC]'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-xs font-bold text-[#969389]">01. STOP-AND-WAIT</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#DCD9D1] text-[#141413]">
                    Window = 1
                  </span>
                </div>
                <h3 className="font-editorial text-xl font-bold text-[#141413] mb-3">Lockstep Transfer</h3>
                <p className="text-xs text-[#626059] leading-relaxed mb-4">
                  Transmits 1 packet and pauses until ACK arrives or timer triggers retransmission. Sender is completely blocked during Round Trip Time.
                </p>

                <div className="text-[11px] font-mono text-[#141413] bg-[#FFFFFF] p-3 rounded-xl border border-[#DCD9D1] mb-4">
                  <strong className="text-[#626059] block mb-1">Channel Utilization:</strong>
                  <code>U = Tt / (Tt + 2 · Tp)</code>
                </div>
              </div>

              <ArqMiniVisualizer type="saw" />
            </motion.div>

            {/* Card 2: Go-Back-N */}
            <motion.div
              whileHover={{ y: -4 }}
              onClick={() => setSelectedArqTab('gbn')}
              className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                selectedArqTab === 'gbn'
                  ? 'bg-[#F5F3EE] border-[#141413] shadow-md ring-1 ring-[#141413]'
                  : 'bg-[#FAF8F5] border-[#DCD9D1] hover:border-[#BEB9AC]'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-xs font-bold text-[#969389]">02. GO-BACK-N</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#DCD9D1] text-[#141413]">
                    Window = N
                  </span>
                </div>
                <h3 className="font-editorial text-xl font-bold text-[#141413] mb-3">Cumulative Sliding Window</h3>
                <p className="text-xs text-[#626059] leading-relaxed mb-4">
                  Allows N unacknowledged packets in flight. If packet k is lost, receiver discards all subsequent packets. Sender rewinds and retransmits all packets from k.
                </p>

                <div className="text-[11px] font-mono text-[#141413] bg-[#FFFFFF] p-3 rounded-xl border border-[#DCD9D1] mb-4">
                  <strong className="text-[#626059] block mb-1">Channel Utilization:</strong>
                  <code>U = N · Tt / (Tt + 2 · Tp)</code>
                </div>
              </div>

              <ArqMiniVisualizer type="gbn" />
            </motion.div>

            {/* Card 3: Selective Repeat */}
            <motion.div
              whileHover={{ y: -4 }}
              onClick={() => setSelectedArqTab('sr')}
              className={`p-6 sm:p-8 rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer ${
                selectedArqTab === 'sr'
                  ? 'bg-[#F5F3EE] border-[#141413] shadow-md ring-1 ring-[#141413]'
                  : 'bg-[#FAF8F5] border-[#DCD9D1] hover:border-[#BEB9AC]'
              }`}
            >
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-mono text-xs font-bold text-[#969389]">03. SELECTIVE REPEAT</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFFFFF] border border-[#DCD9D1] text-[#141413]">
                    Window ≤ 2^(k-1)
                  </span>
                </div>
                <h3 className="font-editorial text-xl font-bold text-[#141413] mb-3">Individual ACK Recovery</h3>
                <p className="text-xs text-[#626059] leading-relaxed mb-4">
                  Sender and receiver both maintain buffer windows. Receiver individually ACKs correctly received packets. Sender only retransmits precisely the lost packets.
                </p>

                <div className="text-[11px] font-mono text-[#141413] bg-[#FFFFFF] p-3 rounded-xl border border-[#DCD9D1] mb-4">
                  <strong className="text-[#626059] block mb-1">Window Constraint:</strong>
                  <code>Window_Sender + Window_Receiver ≤ 2^k</code>
                </div>
              </div>

              <ArqMiniVisualizer type="sr" />
            </motion.div>

          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 3. PACKET HEADER & FRAMING (INTERACTIVE FIELD EXPLORER) */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 border-b border-[#DCD9D1] bg-[#F5F3EE]">
        <div className="max-w-7xl mx-auto px-6 space-y-10">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-[#DCD9D1] gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-[#969389] uppercase block mb-2">
                02 / Binary Wire Serialization
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-[#141413]">
                20-Byte Binary Header Framing & CRC-32
              </h2>
            </div>
            <div className="font-mono text-xs text-[#626059] bg-[#FFFFFF] px-3 py-1.5 rounded-lg border border-[#DCD9D1]">
              Struct Format: <code className="font-bold text-[#141413]">!BIIIH8s</code>
            </div>
          </div>

          <p className="text-sm sm:text-base text-[#626059] max-w-3xl leading-relaxed">
            Every datagram is prefixed with a fixed 20-byte binary header packed with big-endian network byte order integers. Click or hover any header field below to inspect bit-level byte layouts, offsets, and protocol verification roles.
          </p>

          {/* Interactive Binary Header Grid */}
          <ScrollReveal variant="slide-up">
            <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-6 sm:p-8 shadow-sm">
              <div className="text-xs font-mono text-[#969389] mb-4 flex items-center justify-between">
                <span>// Network Byte Order (Big-Endian) Binary Wire Frame:</span>
                <span className="text-[#00FB96] font-bold">Total Header: 20 Bytes (160 Bits)</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
                {HEADER_FIELDS.map((field) => {
                  const isSelected = selectedHeaderField.id === field.id;
                  return (
                    <motion.button
                      key={field.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedHeaderField(field)}
                      onMouseEnter={() => setSelectedHeaderField(field)}
                      className={`p-4 rounded-xl border text-left transition-all duration-200 ${
                        isSelected
                          ? 'bg-[#141413] text-[#F5F3EE] border-[#141413] shadow-md'
                          : 'bg-[#F5F3EE] text-[#141413] border-[#DCD9D1] hover:border-[#141413]'
                      }`}
                    >
                      <span className={`block text-[10px] font-mono uppercase mb-1 font-bold ${isSelected ? 'text-[#00FB96]' : 'text-[#969389]'}`}>
                        {field.bytes} (Off: {field.offset})
                      </span>
                      <div className="font-editorial text-sm font-extrabold tracking-tight">
                        {field.name}
                      </div>
                      <div className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-[#DCD9D1]' : 'text-[#626059]'}`}>
                        {field.format}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Inspector Card for Selected Header Field */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedHeaderField.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="bg-[#141413] text-[#F5F3EE] rounded-xl p-6 border border-[#2A2A28] font-mono text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-[#2A2A28] gap-3">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 rounded bg-[#00FB96] text-[#141413] font-bold text-[10px]">
                        {selectedHeaderField.name}
                      </span>
                      <span className="text-[#DCD9D1] font-semibold text-sm">
                        {selectedHeaderField.bitWidth} ({selectedHeaderField.bytes})
                      </span>
                    </div>
                    <div className="text-[11px] text-[#969389]">
                      Wire Offset: <span className="text-[#F5F3EE]">Bytes {selectedHeaderField.offset}</span> | Format: <span className="text-[#00FB96]">{selectedHeaderField.format}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start font-sans">
                    <div className="md:col-span-8 text-sm text-[#DCD9D1] leading-relaxed">
                      {selectedHeaderField.desc}
                    </div>
                    <div className="md:col-span-4 bg-[#1C1C1A] p-3.5 rounded-lg border border-[#2A2A28] font-mono text-[11px]">
                      <span className="text-[#969389] block mb-1">Example Wire Value:</span>
                      <div className="text-[#00FB96] font-bold">{selectedHeaderField.example}</div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </ScrollReveal>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 4. ADAPTIVE RTT & TIMEOUT (JACOBSON RFC 6298) */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 border-b border-[#DCD9D1] bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-[#ECE9E2] gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-[#969389] uppercase block mb-2">
                03 / Dynamic Timeout Estimation
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-[#141413]">
                Adaptive RTT & Timeout Computation
              </h2>
            </div>
            <p className="text-xs font-mono text-[#626059] max-w-md">
              Jacobson / Karn algorithm tracks exponential moving averages of Round Trip Time to dynamically size the Retransmission Timeout.
            </p>
          </div>

          {/* Mathematical Formulas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
            <div className="p-6 bg-[#F5F3EE] rounded-2xl border border-[#DCD9D1]">
              <span className="text-[#969389] font-bold block mb-2">1. Smoothed RTT (SRTT)</span>
              <code className="text-[#141413] font-bold block text-sm leading-relaxed mb-2">
                SRTT = (1 - α) · SRTT + α · SampleRTT
              </code>
              <p className="text-[#626059] font-sans text-xs">
                Where α = 0.125 (1/8 weight on new sample). Smooths high-frequency channel jitter.
              </p>
            </div>

            <div className="p-6 bg-[#F5F3EE] rounded-2xl border border-[#DCD9D1]">
              <span className="text-[#969389] font-bold block mb-2">2. RTT Variation & RTO</span>
              <code className="text-[#141413] font-bold block text-sm leading-relaxed mb-2">
                RTTVAR = (1 - β) · RTTVAR + β · |SRTT - SampleRTT|<br />
                RTO = SRTT + max(G, K · RTTVAR) (where K = 4)
              </code>
              <p className="text-[#626059] font-sans text-xs">
                Where β = 0.25 (1/4 weight). Sets conservative 4× variance cushion to eliminate spurious retransmissions.
              </p>
            </div>
          </div>

          {/* Interactive RTT Simulator Component */}
          <AdaptiveRttSimulator />

        </div>
      </section>

      {/* ============================================================ */}
      {/* 5. PACKET JOURNEY (SCROLL-DRIVEN 10-STEP STORYTELLING) */}
      {/* ============================================================ */}
      <section className="py-20 md:py-28 border-b border-[#DCD9D1] bg-[#F5F3EE]">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 border-b border-[#DCD9D1] gap-4">
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-[#969389] uppercase block mb-2">
                04 / Lifecycle Architecture
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl font-extrabold text-[#141413]">
                The Packet Journey
              </h2>
            </div>
            <p className="text-xs font-mono text-[#626059] max-w-md">
              From raw binary disk chunks to network sockets and SHA-256 cryptographic proof.
            </p>
          </div>

          {/* Scroll-Driven Steps Flow */}
          <div className="space-y-4">
            {JOURNEY_STEPS.map((s, idx) => (
              <ScrollReveal key={s.step} delay={idx * 60} variant="slide-up">
                <div className="p-6 sm:p-8 bg-[#FFFFFF] rounded-2xl border border-[#DCD9D1] hover:border-[#141413] transition-all duration-300 shadow-sm group">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    
                    <div className="flex items-start gap-4 sm:gap-6">
                      <span className="text-2xl sm:text-3xl font-mono font-extrabold text-[#BEB9AC] group-hover:text-[#141413] transition-colors">
                        {s.step}
                      </span>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#969389] font-bold">
                            {s.label}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#F5F3EE] text-[#626059] border border-[#DCD9D1]">
                            {s.detail}
                          </span>
                        </div>
                        <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#141413] mb-2">
                          {s.title}
                        </h3>
                        <p className="text-xs sm:text-sm text-[#626059] max-w-3xl leading-relaxed font-sans">
                          {s.desc}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono text-[#969389] group-hover:text-[#141413] transition-colors self-end lg:self-center">
                      <span>STEP {idx + 1} OF 10</span>
                      <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                    </div>

                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 6. INTERACTIVE INFORMATION DOTS CONSTELLATION */}
      {/* ============================================================ */}
      <section className="max-w-7xl mx-auto px-6">
        <InteractiveDocDotsField />
      </section>

      {/* ============================================================ */}
      {/* 7. FINAL STATEMENT SECTION */}
      {/* ============================================================ */}
      <section className="py-24 md:py-36 bg-[#141413] text-[#F5F3EE] border-b border-[#2A2A28]">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
          
          <ScrollReveal variant="fade">
            <span className="text-xs font-mono font-bold tracking-widest text-[#00FB96] uppercase block mb-4">
              The Fundamental Principle
            </span>
            <h2 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#F5F3EE] leading-[1.05]">
              unreliable underneath.<br />
              <span className="text-[#00FB96]">reliable above.</span>
            </h2>
          </ScrollReveal>

          {/* Progressive reveals of guarantees */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left font-mono text-xs pt-8">
            {[
              { guarantee: 'UDP gives speed.', detail: 'Zero connection establishment handshake delay.' },
              { guarantee: 'ARQ gives reliability.', detail: '100% lossless in-order packet delivery guarantees.' },
              { guarantee: 'CRC-32 gives corruption detection.', detail: 'Bit-level mathematical error rejection.' },
              { guarantee: 'Adaptive RTT gives intelligent retransmission.', detail: 'Dynamic pacing tailored to channel variance.' },
              { guarantee: 'SHA-256 gives final integrity verification.', detail: 'Cryptographic proof of identical source and destination.' }
            ].map((item, i) => (
              <ScrollReveal key={i} delay={i * 80} variant="slide-up">
                <div className="p-5 bg-[#1C1C1A] rounded-xl border border-[#2A2A28] hover:border-[#00FB96]/50 transition-colors h-full flex flex-col justify-between">
                  <div>
                    <span className="text-[#00FB96] font-bold block mb-1 text-sm">{item.guarantee}</span>
                    <p className="text-[#969389] font-sans text-xs leading-relaxed">{item.detail}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#2A2A28] text-[10px] text-[#626059]">
                    PROVEN IN LAB
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

        </div>
      </section>

      {/* ============================================================ */}
      {/* 8. RESOURCES & REFERENCES (THE FINAL CHAPTER) */}
      {/* ============================================================ */}
      <section className="py-24 md:py-32 bg-[#F5F3EE] border-b border-[#DCD9D1]">
        <div className="max-w-7xl mx-auto px-6 space-y-16">
          
          {/* Chapter Header */}
          <div className="space-y-4">
            <span className="text-xs font-mono font-bold tracking-widest text-[#969389] uppercase block">
              Chapter 05 / Academic Foundation
            </span>
            <h2 className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#141413] tracking-tight">
              continue exploring.
            </h2>
            <p className="text-lg text-[#626059] max-w-2xl font-normal">
              protocols, algorithms and research behind the implementation.
            </p>
          </div>

          {/* Subsection 1: Watch & Understand */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCD9D1]">
              <Video className="w-4 h-4 text-[#141413]" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#141413]">
                1. Watch & Understand (Video Lectures)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {YOUTUBE_RESOURCES.map((res, i) => (
                <ScrollReveal key={res.topic} delay={i * 80} variant="slide-up">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-6 bg-[#FFFFFF] rounded-2xl border border-[#DCD9D1] hover:border-[#141413] transition-all duration-300 flex flex-col justify-between h-full group shadow-sm hover:shadow-md"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F5F3EE] border border-[#DCD9D1] text-[#626059]">
                          {res.badge}
                        </span>
                        <ExternalLink className="w-3.5 h-3.5 text-[#969389] group-hover:text-[#141413] transition-colors" />
                      </div>
                      <h4 className="font-editorial text-base font-bold text-[#141413] mb-2 group-hover:text-black">
                        {res.topic}
                      </h4>
                      <p className="text-xs text-[#626059] font-sans leading-relaxed mb-6">
                        {res.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#141413] pt-4 border-t border-[#ECE9E2]">
                      <span>watch</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform text-[#00FB96]" />
                    </div>
                  </a>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Subsection 2: Research Papers */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCD9D1]">
              <FileText className="w-4 h-4 text-[#141413]" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#141413]">
                2. Research Papers & Foundational Literature
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {RESEARCH_PAPERS.map((paper, i) => (
                <ScrollReveal key={paper.title} delay={i * 80} variant="slide-up">
                  <a
                    href={paper.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-6 bg-[#FFFFFF] rounded-2xl border border-[#DCD9D1] hover:border-[#141413] transition-all duration-300 flex flex-col justify-between h-full group shadow-sm hover:shadow-md"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2 text-xs font-mono text-[#969389]">
                        <span>{paper.author}</span>
                        <span>{paper.year}</span>
                      </div>
                      <h4 className="font-editorial text-base font-bold text-[#141413] mb-2 group-hover:text-black leading-snug">
                        "{paper.title}"
                      </h4>
                      <div className="text-[11px] font-mono text-[#626059] mb-1">
                        {paper.publication}
                      </div>
                      <div className="text-[10px] font-mono text-[#969389] break-all mb-6">
                        DOI: {paper.doi}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#141413] pt-4 border-t border-[#ECE9E2]">
                      <span>view paper</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform text-[#00FB96]" />
                    </div>
                  </a>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Subsection 3: Protocol RFC References */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-3 border-b border-[#DCD9D1]">
              <BookOpen className="w-4 h-4 text-[#141413]" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-bold text-[#141413]">
                3. Official Protocol RFC Specifications
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PROTOCOL_RFCS.map((rfc, i) => (
                <ScrollReveal key={rfc.code} delay={i * 60} variant="slide-up">
                  <a
                    href={rfc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-6 bg-[#FFFFFF] rounded-2xl border border-[#DCD9D1] hover:border-[#141413] transition-all duration-300 flex flex-col justify-between h-full group shadow-sm hover:shadow-md"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2 font-mono">
                        <span className="text-xs font-extrabold text-[#141413] bg-[#F5F3EE] px-2 py-0.5 rounded border border-[#DCD9D1]">
                          {rfc.code}
                        </span>
                        <span className="text-[10px] text-[#969389]">{rfc.year}</span>
                      </div>
                      <h4 className="font-editorial text-sm font-bold text-[#141413] mb-2 leading-snug">
                        {rfc.title}
                      </h4>
                      <p className="text-xs text-[#626059] font-sans leading-relaxed mb-4">
                        {rfc.desc}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#141413] pt-3 border-t border-[#ECE9E2]">
                      <span>read rfc</span>
                      <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-1.5 transition-transform text-[#00FB96]" />
                    </div>
                  </a>
                </ScrollReveal>
              ))}
            </div>
          </div>

          {/* Interactive Lab Callout */}
          {onEnterLab && (
            <div className="p-8 sm:p-12 bg-[#141413] text-[#F5F3EE] rounded-3xl border border-[#2A2A28] flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div>
                <span className="text-[11px] font-mono font-bold tracking-widest text-[#00FB96] uppercase block mb-2">
                  Hands-on Experimentation
                </span>
                <h3 className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#F5F3EE] mb-2">
                  Ready to test these protocols live?
                </h3>
                <p className="text-sm text-[#969389] max-w-xl">
                  Launch the interactive network simulator to inject packet drops, latency jitter, and bit corruption in real time.
                </p>
              </div>
              <button
                onClick={onEnterLab}
                className="px-8 py-4 bg-[#00FB96] text-[#141413] hover:bg-[#00e287] rounded-full font-mono text-xs font-bold uppercase tracking-wider transition-all transform hover:scale-105 shadow-lg flex items-center justify-center gap-2 whitespace-nowrap self-start md:self-center"
              >
                <span>Open Lab Workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

        </div>
      </section>

      {/* ============================================================ */}
      {/* 9. MINIMAL EDITORIAL FOOTER */}
      {/* ============================================================ */}
      <footer className="py-12 bg-[#F5F3EE] text-[#141413]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-[#626059] border-t border-[#DCD9D1] pt-8">
            <div className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-[#141413]" />
              <span className="font-bold text-[#141413]">CN MINI PROJECT</span>
              <span>/</span>
              <span>RELIABLE TRANSPORT OVER UDP</span>
            </div>
            <div className="text-[11px] text-[#969389]">
              ACADEMIC PROJECT / COMPUTER NETWORKS
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
