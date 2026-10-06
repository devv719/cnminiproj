import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function PacketVisualizer({
  activeStats,
  latestEvent,
  config,
  events,
}) {
  const protocol = config?.protocol || 'saw';
  const totalPackets = activeStats?.total_data_packets || 12;
  const windowSize = protocol === 'saw' ? 1 : parseInt(config?.windowSize || 4, 10);

  // Compute sliding window base & status map from events
  const { currentBase, packetStatuses } = useMemo(() => {
    let base = 0;
    const statusMap = {};
    const reversedEvents = [...events].reverse();

    reversedEvents.forEach((ev) => {
      if (ev.seq !== null && ev.seq !== undefined) {
        const s = ev.seq;
        if (ev.event_type === 'packet_sent') {
          if (!statusMap[s] || statusMap[s] === 'idle') {
            statusMap[s] = 'in_flight';
          }
        } else if (ev.event_type === 'retransmission') {
          statusMap[s] = 'retransmitting';
        } else if (ev.event_type === 'packet_lost') {
          statusMap[s] = 'lost';
        } else if (ev.event_type === 'packet_corrupted') {
          statusMap[s] = 'corrupted';
        }
      }

      if (ev.ack !== null && ev.ack !== undefined) {
        if (ev.event_type === 'ack_received') {
          if (protocol === 'gbn') {
            for (let i = 0; i <= ev.ack; i++) {
              statusMap[i] = 'acked';
            }
            base = ev.ack + 1;
          } else {
            statusMap[ev.ack] = 'acked';
            while (statusMap[base] === 'acked') {
              base++;
            }
          }
        }
      }
    });

    return { currentBase: base, packetStatuses: statusMap };
  }, [events, protocol]);

  const maxDisplayBoxes = Math.min(Math.max(16, totalPackets), 32);
  const sequenceBoxes = Array.from({ length: maxDisplayBoxes }, (_, i) => i);

  return (
    <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#ECE9E2] gap-4 mb-8">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
            Real-Time Pipeline
          </span>
          <h2 className="font-editorial text-2xl font-extrabold tracking-tight text-[#141413]">
            PACKET VISUALIZER
          </h2>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#141413]"></span>
            <span className="text-[#626059]">In Flight</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ECE9E2] border border-[#DCD9D1]"></span>
            <span className="text-[#626059]">ACKed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E4E0D6] border border-[#141413]"></span>
            <span className="text-[#626059]">Window</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span>
            <span className="text-[#626059]">Lost / Corrupt</span>
          </div>
        </div>
      </div>

      {/* SENDER → NETWORK → RECEIVER Flow */}
      <div className="bg-[#F5F3EE] p-6 sm:p-8 rounded-xl border border-[#DCD9D1] mb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          
          {/* Sender Node */}
          <div className="md:col-span-3 bg-[#FFFFFF] p-5 rounded-xl border border-[#DCD9D1] text-center">
            <span className="text-[10px] font-mono text-[#969389] uppercase tracking-widest block mb-1">
              Source
            </span>
            <span className="font-editorial text-lg font-bold text-[#141413] block">
              SENDER NODE
            </span>
            <span className="text-[11px] font-mono text-[#626059] block mt-1">
              127.0.0.1:Client
            </span>
          </div>

          {/* Network Channel */}
          <div className="md:col-span-6 px-2 py-4 text-center">
            <div className="flex items-center justify-between text-[11px] font-mono text-[#626059] mb-2 px-2">
              <span className="flex items-center gap-1">DATA →</span>
              <span className="font-bold text-[#141413]">UDP CHANNEL</span>
              <span className="flex items-center gap-1">← ACK</span>
            </div>

            {/* In-Flight Animation Track */}
            <div className="h-12 bg-[#FFFFFF] rounded-xl border border-[#DCD9D1] relative flex items-center justify-center overflow-hidden px-4">
              {latestEvent ? (
                <motion.div
                  key={latestEvent.timestamp}
                  initial={{ x: latestEvent.direction === 'reverse' ? 80 : -80, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-bold ${
                    latestEvent.event_type === 'packet_lost'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : latestEvent.event_type === 'packet_corrupted'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : latestEvent.direction === 'reverse'
                      ? 'bg-[#ECE9E2] text-[#141413] border border-[#141413]'
                      : 'bg-[#141413] text-[#F5F3EE]'
                  }`}
                >
                  {latestEvent.direction === 'reverse' ? '← ACK ' : '→ PKT '}
                  {latestEvent.seq !== null && latestEvent.seq !== undefined ? `#${latestEvent.seq}` : `#${latestEvent.ack || 0}`}
                </motion.div>
              ) : (
                <span className="text-xs font-mono text-[#969389]">
                  Channel Idle
                </span>
              )}
            </div>

            <div className="text-[10px] font-mono text-[#969389] mt-2">
              Proxy Port 9000 • Dynamic Impairment Simulator
            </div>
          </div>

          {/* Receiver Node */}
          <div className="md:col-span-3 bg-[#FFFFFF] p-5 rounded-xl border border-[#DCD9D1] text-center">
            <span className="text-[10px] font-mono text-[#969389] uppercase tracking-widest block mb-1">
              Destination
            </span>
            <span className="font-editorial text-lg font-bold text-[#141413] block">
              RECEIVER NODE
            </span>
            <span className="text-[11px] font-mono text-[#626059] block mt-1">
              127.0.0.1:9001
            </span>
          </div>

        </div>
      </div>

      {/* Sliding Window Sequence Strip */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <span className="font-editorial text-sm font-bold text-[#141413]">
              SEQUENCE BUFFER
            </span>
            <span className="tag-pill text-[10px]">
              {protocol === 'saw' ? 'STOP & WAIT (N=1)' : `WINDOW SIZE N = ${windowSize}`}
            </span>
          </div>

          <div className="text-xs font-mono text-[#626059]">
            Base: <strong className="text-[#141413]">#{currentBase}</strong> | Active Span: [#{currentBase} .. #{currentBase + windowSize - 1}]
          </div>
        </div>

        <div className="p-4 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1] overflow-x-auto">
          <div className="flex items-center gap-2 min-w-max">
            {sequenceBoxes.map((seq) => {
              const isInsideWindow = seq >= currentBase && seq < currentBase + windowSize;
              const status = packetStatuses[seq] || (seq < currentBase ? 'acked' : 'idle');

              let boxStyle = 'bg-[#FFFFFF] border-[#DCD9D1] text-[#969389]';
              let badge = '';

              if (status === 'acked') {
                boxStyle = 'bg-[#ECE9E2] border-[#DCD9D1] text-[#141413]';
                badge = 'ACK';
              } else if (status === 'in_flight') {
                boxStyle = 'bg-[#141413] border-[#141413] text-[#F5F3EE] shadow-sm';
                badge = 'FLY';
              } else if (status === 'retransmitting') {
                boxStyle = 'bg-[#141413] border-[#141413] text-[#F5F3EE] ring-2 ring-amber-500';
                badge = 'RTO';
              } else if (status === 'lost') {
                boxStyle = 'bg-red-50 border-red-300 text-red-700';
                badge = 'LOST';
              } else if (status === 'corrupted') {
                boxStyle = 'bg-amber-50 border-amber-300 text-amber-700';
                badge = 'CRC';
              }

              return (
                <div
                  key={seq}
                  className={`w-11 h-14 rounded-lg border flex flex-col items-center justify-between p-1.5 transition-all ${boxStyle} ${
                    isInsideWindow ? 'ring-2 ring-[#141413]' : ''
                  }`}
                  title={`Packet #${seq} | Status: ${status}`}
                >
                  <span className="text-[10px] font-mono font-bold">{seq}</span>
                  <span className="text-[8px] font-mono uppercase font-bold tracking-tighter">
                    {badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
}
