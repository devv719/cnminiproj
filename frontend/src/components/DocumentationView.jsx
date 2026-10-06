import React from 'react';

export default function DocumentationView() {
  return (
    <div className="space-y-12 pb-16">
      
      {/* Editorial Header */}
      <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-14 shadow-sm">
        <span className="text-xs font-mono font-bold tracking-widest text-[#969389] uppercase block mb-3">
          Computer Networks Technical Reference
        </span>
        <h1 className="font-editorial text-4xl sm:text-5xl font-extrabold tracking-tight text-[#141413] mb-6">
          Reliable Transport Architecture
        </h1>
        <p className="text-lg text-[#626059] max-w-3xl leading-relaxed">
          How application-level reliability mechanisms guarantee in-order, lossless, uncorrupted byte stream delivery over unreliable User Datagram Protocol (UDP).
        </p>
      </div>

      {/* 1. Protocol Architecture Comparison */}
      <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-12 shadow-sm space-y-8">
        <h2 className="font-editorial text-2xl font-bold tracking-tight text-[#141413] pb-4 border-b border-[#ECE9E2]">
          01 / ARQ Protocols Compared
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          <div className="p-6 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
            <span className="font-mono text-xs font-bold text-[#969389] block mb-2">01. STOP-AND-WAIT</span>
            <h3 className="font-editorial text-lg font-bold text-[#141413] mb-3">Lockstep Transfer</h3>
            <p className="text-xs text-[#626059] leading-relaxed mb-4">
              Transmits 1 packet and pauses until ACK arrives or timer triggers retransmission. Window size is strictly 1.
            </p>
            <div className="text-[11px] font-mono text-[#141413] bg-[#FFFFFF] p-3 rounded border border-[#DCD9D1]">
              <strong>Efficiency:</strong><br />
              U = Tt / (Tt + 2·Tp)
            </div>
          </div>

          <div className="p-6 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
            <span className="font-mono text-xs font-bold text-[#969389] block mb-2">02. GO-BACK-N</span>
            <h3 className="font-editorial text-lg font-bold text-[#141413] mb-3">Cumulative Sliding Window</h3>
            <p className="text-xs text-[#626059] leading-relaxed mb-4">
              Allows N unacknowledged packets in flight. If packet k is lost, sender rewinds and retransmits all packets from k to next_seq_num.
            </p>
            <div className="text-[11px] font-mono text-[#141413] bg-[#FFFFFF] p-3 rounded border border-[#DCD9D1]">
              <strong>Efficiency:</strong><br />
              U = N · Tt / (Tt + 2·Tp)
            </div>
          </div>

          <div className="p-6 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
            <span className="font-mono text-xs font-bold text-[#969389] block mb-2">03. SELECTIVE REPEAT</span>
            <h3 className="font-editorial text-lg font-bold text-[#141413] mb-3">Individual ACK Recovery</h3>
            <p className="text-xs text-[#626059] leading-relaxed mb-4">
              Sender and receiver both maintain buffers. Receiver individually ACKs correctly received packets. Sender only retransmits lost packets.
            </p>
            <div className="text-[11px] font-mono text-[#141413] bg-[#FFFFFF] p-3 rounded border border-[#DCD9D1]">
              <strong>Constraint:</strong><br />
              Window ≤ 2^(k-1)
            </div>
          </div>

        </div>
      </div>

      {/* 2. Packet Framing & Checksums */}
      <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-12 shadow-sm space-y-6">
        <h2 className="font-editorial text-2xl font-bold tracking-tight text-[#141413] pb-4 border-b border-[#ECE9E2]">
          02 / Packet Header Framing & CRC-32
        </h2>

        <p className="text-sm text-[#626059] leading-relaxed">
          Every datagram begins with a fixed binary header packed with big-endian network byte order integers:
        </p>

        <div className="p-6 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1] font-mono text-xs overflow-x-auto">
          <div className="text-[#969389] mb-2">// 20-Byte Binary Header Structure: !BIIIH8s</div>
          <div className="grid grid-cols-6 gap-2 text-center text-[11px]">
            <div className="p-2 bg-[#FFFFFF] border border-[#DCD9D1] rounded">
              <span className="text-[#969389] block text-[9px]">TYPE (1B)</span>
              DATA / ACK
            </div>
            <div className="p-2 bg-[#FFFFFF] border border-[#DCD9D1] rounded">
              <span className="text-[#969389] block text-[9px]">SEQ (4B)</span>
              Sequence #
            </div>
            <div className="p-2 bg-[#FFFFFF] border border-[#DCD9D1] rounded">
              <span className="text-[#969389] block text-[9px]">ACK (4B)</span>
              ACK #
            </div>
            <div className="p-2 bg-[#FFFFFF] border border-[#DCD9D1] rounded">
              <span className="text-[#969389] block text-[9px]">CHECKSUM (4B)</span>
              CRC-32 IEEE
            </div>
            <div className="p-2 bg-[#FFFFFF] border border-[#DCD9D1] rounded">
              <span className="text-[#969389] block text-[9px]">PAYLOAD LEN (2B)</span>
              Length (Bytes)
            </div>
            <div className="p-2 bg-[#FFFFFF] border border-[#DCD9D1] rounded">
              <span className="text-[#969389] block text-[9px]">FLAGS (8B)</span>
              SYN/FIN/PAD
            </div>
          </div>
        </div>
      </div>

      {/* 3. Adaptive RTT Estimation (Jacobson RFC 6298) */}
      <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-12 shadow-sm space-y-6">
        <h2 className="font-editorial text-2xl font-bold tracking-tight text-[#141413] pb-4 border-b border-[#ECE9E2]">
          03 / Adaptive RTT & Timeout Computation
        </h2>

        <p className="text-sm text-[#626059] leading-relaxed">
          The sender tracks sample Round Trip Time measurements and smooths variance using Exponentially Weighted Moving Averages:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
          <div className="p-5 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
            <span className="text-[#969389] block mb-2">1. Smoothed RTT (SRTT)</span>
            <code className="text-[#141413] font-bold block">
              SRTT = (1 - α) · SRTT + α · SampleRTT<br />
              (where α = 0.125)
            </code>
          </div>
          <div className="p-5 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
            <span className="text-[#969389] block mb-2">2. RTT Variation & RTO</span>
            <code className="text-[#141413] font-bold block">
              RTTVAR = (1 - β) · RTTVAR + β · |SRTT - SampleRTT|<br />
              RTO = SRTT + max(G, K · RTTVAR) (where K = 4)
            </code>
          </div>
        </div>
      </div>

    </div>
  );
}
