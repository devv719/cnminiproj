import React, { useMemo } from 'react';
import { Server, ArrowRight, ShieldCheck, AlertOctagon, RefreshCw, Send, CheckCircle2 } from 'lucide-react';

export default function PacketVisualizer({
  activeStats,
  latestEvent,
  config,
  events,
}) {
  const protocol = config?.protocol || 'saw';
  const totalPackets = activeStats?.total_data_packets || 10;
  const windowSize = protocol === 'saw' ? 1 : parseInt(config?.windowSize || 4, 10);

  // Compute sliding window base & status map from events
  const { currentBase, packetStatuses } = useMemo(() => {
    let base = 0;
    const statusMap = {};

    // Process events chronologically (reverse of latest-first)
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
            // Advance base past consecutively acked
            while (statusMap[base] === 'acked') {
              base++;
            }
          }
        }
      }
    });

    return { currentBase: base, packetStatuses: statusMap };
  }, [events, protocol]);

  // Display a reasonable number of sequence boxes (up to 32)
  const maxDisplayBoxes = Math.min(Math.max(12, totalPackets), 32);
  const sequenceBoxes = Array.from({ length: maxDisplayBoxes }, (_, i) => i);

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/80">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-800/60 gap-2">
        <div className="flex items-center gap-2.5">
          <Send className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Live Packet & Sliding Window Visualizer</h2>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-medium flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">ACKed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span className="text-slate-300">In-Flight</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Retransmit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-300">Lost / Corrupt</span>
          </div>
        </div>
      </div>

      {/* Network Pipeline Diagram */}
      <div className="relative p-6 bg-slate-950/60 rounded-2xl border border-slate-800/80 overflow-hidden mb-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
          {/* Sender Node */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-900/90 border border-blue-500/30 w-full sm:w-44 text-center">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Sender Node</span>
              <p className="text-[11px] font-mono text-slate-400">127.0.0.1:DynPort</p>
            </div>
          </div>

          {/* Animated Channel Node */}
          <div className="flex-1 flex flex-col items-center justify-center px-4 w-full">
            <div className="flex items-center justify-between w-full mb-1 text-[11px] font-semibold text-slate-400">
              <span>Forward (DATA)</span>
              <span className="text-indigo-400 font-mono">Proxy: 9000</span>
              <span>Reverse (ACK)</span>
            </div>

            {/* Flight Pipeline Track */}
            <div className="w-full h-8 bg-slate-900/90 rounded-xl border border-slate-800 relative flex items-center px-3 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 animate-pulse" />
              
              {/* Animated In-Flight Indicator */}
              {latestEvent && (
                <div
                  key={latestEvent.timestamp}
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono text-white shadow-md animate-flight absolute ${
                    latestEvent.event_type === 'packet_lost'
                      ? 'bg-rose-500 shadow-rose-500/50'
                      : latestEvent.event_type === 'packet_corrupted'
                      ? 'bg-amber-500 shadow-amber-500/50'
                      : latestEvent.event_type === 'ack_received' || latestEvent.event_type === 'ack_sent'
                      ? 'bg-emerald-500 shadow-emerald-500/50'
                      : latestEvent.event_type === 'retransmission'
                      ? 'bg-amber-500 shadow-amber-500/50'
                      : 'bg-blue-500 shadow-blue-500/50'
                  }`}
                >
                  {latestEvent.direction === 'reverse' ? '← ACK ' : '→ DATA '}
                  {latestEvent.seq !== null && latestEvent.seq !== undefined ? `#${latestEvent.seq}` : `#${latestEvent.ack || 0}`}
                </div>
              )}
            </div>

            <div className="text-[10px] font-mono text-slate-500 mt-1">
              Simulated UDP Proxy Channel (Loss, Delay, Bit Flips)
            </div>
          </div>

          {/* Receiver Node */}
          <div className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 w-full sm:w-44 text-center">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
              <Server className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">Receiver Node</span>
              <p className="text-[11px] font-mono text-slate-400">127.0.0.1:9001</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sliding Window Sequence Box Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300">
            Sliding Window Buffer (N = {windowSize})
          </span>
          <span className="font-mono text-blue-400 text-xs">
            Current Base: <strong className="text-white">#{currentBase}</strong> | Active Window: [#{currentBase} .. #{currentBase + windowSize - 1}]
          </span>
        </div>

        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 overflow-x-auto">
          <div className="flex items-center gap-1.5 min-w-max">
            {sequenceBoxes.map((seq) => {
              const isInsideWindow = seq >= currentBase && seq < currentBase + windowSize;
              const status = packetStatuses[seq] || (seq < currentBase ? 'acked' : 'idle');

              let bgClass = 'bg-slate-800/80 border-slate-700 text-slate-400';
              if (status === 'acked') {
                bgClass = 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300';
              } else if (status === 'in_flight') {
                bgClass = 'bg-blue-500/30 border-blue-500 text-blue-200 animate-pulse';
              } else if (status === 'retransmitting') {
                bgClass = 'bg-amber-500/30 border-amber-500 text-amber-200';
              } else if (status === 'lost') {
                bgClass = 'bg-rose-500/30 border-rose-500 text-rose-200';
              } else if (status === 'corrupted') {
                bgClass = 'bg-orange-500/30 border-orange-500 text-orange-200';
              }

              return (
                <div
                  key={seq}
                  className={`w-9 h-11 rounded-lg border flex flex-col items-center justify-between p-1 transition-all ${bgClass} ${
                    isInsideWindow ? 'ring-2 ring-blue-400 shadow-md shadow-blue-500/20' : ''
                  }`}
                  title={`Packet #${seq} | Status: ${status} | Inside Window: ${isInsideWindow}`}
                >
                  <span className="text-[10px] font-mono font-bold">{seq}</span>
                  <span className="text-[8px] uppercase tracking-tighter truncate font-semibold">
                    {status === 'acked' ? '✓' : status === 'in_flight' ? '✈' : status === 'lost' ? '✗' : ''}
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
