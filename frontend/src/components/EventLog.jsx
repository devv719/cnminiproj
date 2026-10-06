import React, { useRef, useEffect } from 'react';
import { Terminal, Trash2, Download } from 'lucide-react';

const EVENT_STYLES = {
  packet_sent:        { color: 'text-blue-400', prefix: '→ SEND' },
  packet_received:    { color: 'text-emerald-400', prefix: '← RECV' },
  packet_lost:        { color: 'text-rose-400', prefix: '✗ LOST' },
  packet_corrupted:   { color: 'text-orange-400', prefix: '⚠ CORR' },
  packet_duplicated:  { color: 'text-purple-400', prefix: '⊕ DUPE' },
  packet_reordered:   { color: 'text-cyan-400', prefix: '⇌ RORD' },
  ack_sent:           { color: 'text-emerald-300', prefix: '→ ACK·' },
  ack_received:       { color: 'text-emerald-400', prefix: '← ACK·' },
  timeout:            { color: 'text-amber-400', prefix: '⏰ TOUT' },
  retransmission:     { color: 'text-yellow-400', prefix: '↺ RETX' },
  window_update:      { color: 'text-sky-400', prefix: '⊞ WIND' },
  duplicate_detected: { color: 'text-purple-300', prefix: '⊕ DUPL' },
  transfer_started:   { color: 'text-green-300', prefix: '▶ STRT' },
  transfer_progress:  { color: 'text-slate-400', prefix: '· PROG' },
  transfer_complete:  { color: 'text-emerald-300', prefix: '✓ DONE' },
  transfer_failed:    { color: 'text-rose-400', prefix: '✗ FAIL' },
};

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
    a.download = 'event_log.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Display chronologically (latest at bottom)
  const displayEvents = [...events].reverse().slice(0, 200);

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/80 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <Terminal className="w-5 h-5 text-slate-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Event Log</h2>
          <span className="text-xs font-mono text-slate-500">{events.length} total events</span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={onClear}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      <div className="h-64 overflow-y-auto bg-[#06090f] rounded-xl border border-slate-800/60 font-mono text-[11px] p-3 space-y-0.5">
        {displayEvents.length === 0 ? (
          <div className="text-slate-600 text-center py-12">Start a transfer to see events...</div>
        ) : (
          displayEvents.map((ev, idx) => {
            const style = EVENT_STYLES[ev.event_type] || { color: 'text-slate-400', prefix: '· INFO' };
            const timeStr = new Date(ev.timestamp * 1000).toLocaleTimeString([], {
              hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
            });
            return (
              <div key={idx} className="flex items-start gap-2 hover:bg-slate-800/20 px-1 py-0.5 rounded">
                <span className="text-slate-600 min-w-[72px]">{timeStr}</span>
                <span className={`min-w-[48px] font-bold ${style.color}`}>{style.prefix}</span>
                {(ev.seq !== null && ev.seq !== undefined) && (
                  <span className="text-slate-500">#{ev.seq}</span>
                )}
                {(ev.ack !== null && ev.ack !== undefined && ev.ack !== ev.seq) && (
                  <span className="text-slate-500">ACK={ev.ack}</span>
                )}
                {ev.rtt !== null && ev.rtt !== undefined && (
                  <span className="text-cyan-600">[RTT={( ev.rtt * 1000).toFixed(1)}ms]</span>
                )}
                <span className={`${style.color} opacity-80`}>{ev.message}</span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
