import React, { useRef, useEffect } from 'react';
import { Download, Trash2 } from 'lucide-react';

export default function EventLog({ events, onClear }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const handleExport = () => {
    const rows = ['Timestamp,Type,Seq,Ack,Direction,RTT,Message'];
    [...events].reverse().forEach((ev) => {
      rows.push([
        new Date(ev.timestamp * 1000).toISOString(),
        ev.event_type,
        ev.seq ?? '',
        ev.ack ?? '',
        ev.direction ?? '',
        ev.rtt !== null && ev.rtt !== undefined ? (ev.rtt * 1000).toFixed(2) : '',
        `"${(ev.message || '').replace(/"/g, "'")}"`,
      ].join(','));
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'udp_event_timeline.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayEvents = [...events].reverse().slice(0, 300);

  return (
    <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#ECE9E2] gap-4 mb-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
            Chronological Audit
          </span>
          <h2 className="font-editorial text-2xl font-extrabold tracking-tight text-[#141413]">
            EVENT TIMELINE
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onClear}
            className="btn-secondary text-xs py-2 px-4 hover:border-red-400 hover:text-red-600"
          >
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      <div className="max-h-96 overflow-y-auto pr-2 space-y-3 font-mono text-xs">
        {displayEvents.length === 0 ? (
          <div className="text-center py-16 bg-[#F5F3EE] rounded-xl text-[#969389]">
            Timeline empty. Transmit packets to generate events.
          </div>
        ) : (
          displayEvents.map((ev, idx) => {
            const timeStr = new Date(ev.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
            });

            let dotColor = 'bg-[#141413]';
            let label = 'INFO';
            let isHighlight = false;

            if (ev.event_type === 'packet_lost') {
              dotColor = 'bg-red-500';
              label = 'LOSS';
              isHighlight = true;
            } else if (ev.event_type === 'packet_corrupted') {
              dotColor = 'bg-amber-500';
              label = 'CRC';
              isHighlight = true;
            } else if (ev.event_type === 'ack_received') {
              dotColor = 'bg-[#ECE9E2] border border-[#141413]';
              label = 'ACK';
            } else if (ev.event_type === 'retransmission' || ev.event_type === 'timeout') {
              dotColor = 'bg-[#141413] ring-2 ring-amber-400';
              label = 'RTO';
              isHighlight = true;
            } else if (ev.event_type === 'packet_sent') {
              dotColor = 'bg-[#141413]';
              label = 'SEND';
            }

            return (
              <div 
                key={idx}
                className={`p-3 rounded-xl border flex items-start justify-between gap-4 transition-colors ${
                  isHighlight 
                    ? 'bg-[#F5F3EE] border-[#BEB9AC]' 
                    : 'bg-[#FFFFFF] border-[#ECE9E2] hover:border-[#DCD9D1]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex items-center justify-center">
                    <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`}></span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#141413] uppercase tracking-wider text-[11px]">
                        {ev.message || ev.event_type.replace(/_/g, ' ')}
                      </span>
                      {ev.seq !== null && ev.seq !== undefined && (
                        <span className="text-[10px] bg-[#ECE9E2] text-[#141413] px-1.5 py-0.2 rounded font-bold">
                          PKT #{ev.seq}
                        </span>
                      )}
                      {ev.ack !== null && ev.ack !== undefined && ev.ack !== ev.seq && (
                        <span className="text-[10px] bg-[#ECE9E2] text-[#141413] px-1.5 py-0.2 rounded font-bold">
                          ACK #{ev.ack}
                        </span>
                      )}
                    </div>
                    {ev.rtt !== null && ev.rtt !== undefined && (
                      <span className="text-[10px] text-[#969389] block mt-0.5">
                        RTT: {(ev.rtt * 1000).toFixed(1)} ms
                      </span>
                    )}
                  </div>
                </div>

                <span className="text-[#969389] text-[10px] whitespace-nowrap">
                  {timeStr}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

    </div>
  );
}
