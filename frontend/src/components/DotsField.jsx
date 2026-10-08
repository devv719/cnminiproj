import React, { useState, useRef, useEffect, useCallback } from 'react';

// CN protocol concepts for interactive dots
const DOT_INFOS = [
  {
    id: 'udp',
    title: 'UDP PROTOCOL',
    body: 'User Datagram Protocol is connectionless and unreliable. No handshake, no ordering, no delivery guarantee — blazing fast, zero overhead.',
  },
  {
    id: 'packetization',
    title: 'PACKETIZATION',
    body: 'Files are chunked into fixed-size datagrams (default 1024 bytes). Each packet carries sequence metadata, payload, and a checksum.',
  },
  {
    id: 'seqnum',
    title: 'SEQUENCE NUMBERS',
    body: 'Every packet is numbered so the receiver can detect gaps, reorder out-of-sequence arrivals, and acknowledge the correct boundary.',
  },
  {
    id: 'checksum',
    title: 'CRC-32 CHECKSUM',
    body: 'A 32-bit cyclic redundancy check is computed over the packet payload. Receivers reject any datagram whose checksum does not match.',
  },
  {
    id: 'ack',
    title: 'ACKNOWLEDGEMENTS',
    body: 'Cumulative ACKs (GBN) or per-packet SACKs (SR) signal which data was received. Silence past the timeout triggers retransmission.',
  },
  {
    id: 'timeout',
    title: 'TIMEOUT & RETRANSMISSION',
    body: 'RTO is computed via EWMA smoothed RTT (RFC 6298). Expired timers cause automatic retransmission of unacknowledged packets.',
  },
  {
    id: 'loss',
    title: 'PACKET LOSS SIM',
    body: 'The channel stochastically drops datagrams at a configurable rate. Simulates real-world router queue overflows and congestion.',
  },
  {
    id: 'corruption',
    title: 'CORRUPTION SIM',
    body: 'Bit-flip injection corrupts a fraction of packets in transit. The receiver detects this via CRC-32 and requests retransmission.',
  },
  {
    id: 'sha256',
    title: 'SHA-256 INTEGRITY',
    body: 'A SHA-256 hash of the original file is compared against the reconstructed file after transfer. Any data mutation is detected.',
  },
  {
    id: 'stats',
    title: 'TRANSFER STATISTICS',
    body: 'RTT, throughput, retransmission rate, packet loss %, window utilization and efficiency are tracked in real-time during transfer.',
  },
];

// All dot positions (percentage of container width/height)
// Some are "active" (have info), most are purely decorative
const DOTS = [
  // decorative
  { x: 6.8, y: 0.9, active: false },
  { x: 1.1, y: 7.1, active: false },
  { x: 6.8, y: 7.1, active: false },
  { x: 20.1, y: 15.5, active: false },
  { x: 88.6, y: 7.1, active: false },
  { x: 79.9, y: 24.8, active: false },
  { x: 79.9, y: 47.6, active: false },
  { x: 79.9, y: 66.1, active: false },
  { x: 79.9, y: 71.2, active: false },
  { x: 79.9, y: 85.7, active: false },
  { x: 34.2, y: 91.9, active: false },
  { x: 50.3, y: 91.9, active: false },
  { x: 34.2, y: 67.3, active: false },
  { x: 34.2, y: 55.7, active: false },
  { x: 65.7, y: 55.7, active: false },
  { x: 65.7, y: 67.3, active: false },
  { x: 84.1, y: 47.6, active: false },
  { x: 84.1, y: 56.1, active: false },
  { x: 84.1, y: 62.7, active: false },
  { x: 84.1, y: 85.6, active: false },
  { x: 98.9, y: 7.1, active: false },
  { x: 84.1, y: 24.8, active: false },
  { x: 44.4, y: 19.5, active: false },
  { x: 44.4, y: 30.7, active: false },
  { x: 20.1, y: 26.3, active: false },
  { x: 14.8, y: 43.7, active: false },
  { x: 6.8, y: 56.9, active: false },
  { x: 6.8, y: 66.9, active: false },
  { x: 6.8, y: 80.0, active: false },
  { x: 20.1, y: 84.6, active: false },
  { x: 20.1, y: 80.0, active: false },
  { x: 20.1, y: 75.7, active: false },
  { x: 20.1, y: 66.9, active: false },
  { x: 20.1, y: 64.4, active: false },
  { x: 20.1, y: 56.9, active: false },
  { x: 20.1, y: 48.8, active: false },
  { x: 21.5, y: 45.7, active: false },
  { x: 83.8, y: 89.7, active: false },
  { x: 87.2, y: 85.6, active: false },

  // ACTIVE DOTS — each maps to a DOT_INFOS entry by index
  { x: 13.5, y: 4.1, active: true, infoIdx: 0 },    // udp
  { x: 85.8, y: 7.1, active: true, infoIdx: 1 },    // packetization
  { x: 79.9, y: 24.8, active: true, infoIdx: 2 },   // seqnum — reuses coord for active
  { x: 50.0, y: 49.6, active: true, infoIdx: 3 },   // checksum — center cluster
  { x: 65.7, y: 67.3, active: true, infoIdx: 4 },   // ack
  { x: 6.8, y: 56.9, active: true, infoIdx: 5 },    // timeout
  { x: 50.3, y: 91.9, active: true, infoIdx: 6 },   // loss
  { x: 93.2, y: 85.4, active: true, infoIdx: 7 },   // corruption
  { x: 6.8, y: 25.1, active: true, infoIdx: 8 },    // sha256
  { x: 50.0, y: 19.5, active: true, infoIdx: 9 },   // stats
];

function InfoCard({ info, dotX, dotY, containerRef, onClose }) {
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!containerRef.current || !cardRef.current) return;
    const container = containerRef.current;
    const cw = container.offsetWidth;
    const ch = container.offsetHeight;
    const card = cardRef.current;
    const cCardW = card.offsetWidth;
    const cCardH = card.offsetHeight;

    const dotPxX = (dotX / 100) * cw;
    const dotPxY = (dotY / 100) * ch;

    let left = dotPxX + 14;
    let top = dotPxY - 20;

    if (left + cCardW > cw - 8) left = dotPxX - cCardW - 14;
    if (top + cCardH > ch - 8) top = ch - cCardH - 8;
    if (top < 8) top = 8;
    if (left < 8) left = 8;

    setPos({ top, left });
  }, [dotX, dotY]);

  return (
    <div
      ref={cardRef}
      className="dots-info-card"
      style={{ position: 'absolute', top: pos.top, left: pos.left }}
      role="tooltip"
      aria-live="polite"
    >
      <button
        className="dots-info-close"
        onClick={onClose}
        aria-label="Close info card"
      >
        ✕
      </button>
      <div className="dots-info-label">{info.title}</div>
      <div className="dots-info-body">{info.body}</div>
    </div>
  );
}

export default function DotsField() {
  const containerRef = useRef(null);
  const [openIdx, setOpenIdx] = useState(null);

  const handleDotClick = useCallback((dotIdx) => {
    setOpenIdx((prev) => (prev === dotIdx ? null : dotIdx));
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (!e.target.closest('.dots-dot-active') && !e.target.closest('.dots-info-card')) {
        setOpenIdx(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <section className="dots-section">
      <div className="dots-section__inner">
        <div className="dots-section__label">
          <span className="dots-section__tag">CN Protocol Concepts</span>
          <p className="dots-section__hint">
            <span className="dots-hint-dot" /> Hover to discover
          </p>
        </div>

        <div ref={containerRef} className="dots-field" aria-label="Interactive concept dots">
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid meet"
            className="dots-svg"
            aria-hidden="true"
          >
            {DOTS.filter(d => !d.active).map((dot, i) => (
              <circle
                key={`dec-${i}`}
                cx={dot.x}
                cy={dot.y}
                r="0.9"
                fill="#151515"
                opacity="0.7"
              />
            ))}
          </svg>

          {/* Render active dots as positioned divs for easy interaction */}
          {DOTS.filter(d => d.active).map((dot, i) => {
            const globalIdx = i; // index into active dots
            const info = DOT_INFOS[dot.infoIdx];
            const isOpen = openIdx === globalIdx;
            return (
              <React.Fragment key={`active-${i}`}>
                <button
                  className={`dots-dot-active${isOpen ? ' dots-dot-active--open' : ''}`}
                  style={{
                    left: `${dot.x}%`,
                    top: `${dot.y}%`,
                  }}
                  onClick={(e) => { e.stopPropagation(); handleDotClick(globalIdx); }}
                  aria-expanded={isOpen}
                  aria-label={`Learn about ${info.title}`}
                  data-interactive
                >
                  <span className="dots-dot-active__inner" />
                  <span className="dots-dot-active__ring" />
                </button>

                {isOpen && (
                  <InfoCard
                    info={info}
                    dotX={dot.x}
                    dotY={dot.y}
                    containerRef={containerRef}
                    onClose={() => setOpenIdx(null)}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </section>
  );
}
