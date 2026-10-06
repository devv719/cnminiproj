import React, { useState, useMemo } from 'react';
import { Table, ChevronDown, ChevronUp, Info } from 'lucide-react';

const STATUS_STYLES = {
  acked:        'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  in_flight:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  retransmitting: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  lost:         'bg-rose-500/10 text-rose-400 border-rose-500/20',
  corrupted:    'bg-orange-500/10 text-orange-400 border-orange-500/20',
  default:      'bg-slate-700/30 text-slate-400 border-slate-700/30',
};

export default function PacketTable({ events }) {
  const [filterType, setFilterType] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Build a de-duplicated packet summary keyed by seq
  const packetRows = useMemo(() => {
    const map = {};
    // Events are latest-first; process in chronological order
    const reversed = [...events].reverse();

    reversed.forEach((ev) => {
      const seq = ev.seq !== null && ev.seq !== undefined ? ev.seq : ev.ack;
      if (seq === null || seq === undefined) return;
      if (!map[seq]) {
        map[seq] = {
          seq,
          type: ev.pkt_type || (ev.ack !== null ? 'ACK' : 'DATA'),
          status: 'idle',
          attempts: 0,
          rtt: null,
          lastEvent: ev.event_type,
          lastTimestamp: ev.timestamp,
        };
      }
      const row = map[seq];
      row.lastEvent = ev.event_type;
      row.lastTimestamp = ev.timestamp;

      if (ev.event_type === 'packet_sent') {
        row.attempts += 1;
        row.status = 'in_flight';
      } else if (ev.event_type === 'retransmission') {
        row.attempts += 1;
        row.status = 'retransmitting';
      } else if (ev.event_type === 'packet_lost') {
        row.status = 'lost';
      } else if (ev.event_type === 'packet_corrupted') {
        row.status = 'corrupted';
      } else if (ev.event_type === 'ack_received') {
        row.status = 'acked';
        if (ev.rtt !== null) row.rtt = ev.rtt;
      }
    });

    return Object.values(map).sort((a, b) => a.seq - b.seq);
  }, [events]);

  const filtered = filterType === 'all'
    ? packetRows
    : packetRows.filter((r) => r.status === filterType);

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/80">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 mb-4 border-b border-slate-800/60 gap-3">
        <div className="flex items-center gap-2.5">
          <Table className="w-5 h-5 text-amber-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Packet Inspector Table</h2>
          <span className="text-xs font-mono text-slate-400">({filtered.length} packets)</span>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {['all', 'in_flight', 'acked', 'retransmitting', 'lost', 'corrupted'].map((f) => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                filterType === f
                  ? 'bg-slate-300 text-slate-900 border-slate-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {f === 'all' ? 'All' : f.replace('_', '-')}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800/60">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/60">
              {['Seq', 'Type', 'Status', 'Attempts', 'RTT', 'Last Event', 'Timestamp'].map((col) => (
                <th key={col} className="px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {col}
                </th>
              ))}
              <th className="px-3 py-2.5 text-center text-[11px] text-slate-400">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40">
            {filtered.slice(0, 100).map((row) => {
              const statusStyle = STATUS_STYLES[row.status] || STATUS_STYLES.default;
              return (
                <tr
                  key={row.seq}
                  className="hover:bg-slate-900/60 transition-colors cursor-pointer"
                  onClick={() => setSelectedEvent(row)}
                >
                  <td className="px-3 py-2 font-bold text-white">#{row.seq}</td>
                  <td className="px-3 py-2 text-slate-300">{row.type || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${statusStyle}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className={`px-3 py-2 font-bold ${row.attempts > 1 ? 'text-amber-400' : 'text-slate-300'}`}>
                    {row.attempts}
                  </td>
                  <td className="px-3 py-2 text-cyan-400">
                    {row.rtt !== null ? `${(row.rtt * 1000).toFixed(1)} ms` : '—'}
                  </td>
                  <td className="px-3 py-2 text-slate-400 text-[10px]">
                    {row.lastEvent?.replace(/_/g, ' ')}
                  </td>
                  <td className="px-3 py-2 text-slate-500 text-[10px]">
                    {row.lastTimestamp ? new Date(row.lastTimestamp * 1000).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <Info className="w-3.5 h-3.5 text-slate-500 hover:text-blue-400 inline" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-xs">
            No packets to display. Start a transfer to see live packet data.
          </div>
        )}
      </div>

      {/* Event Details Drawer */}
      {selectedEvent && (
        <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-700/60 relative">
          <button
            onClick={() => setSelectedEvent(null)}
            className="absolute top-3 right-3 text-slate-500 hover:text-white text-xs"
          >
            ✕ Close
          </button>
          <h3 className="text-xs font-bold text-white mb-3 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-400" />
            Protocol Inspector: Packet #{selectedEvent.seq}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            {Object.entries(selectedEvent).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                <span className="text-slate-400">{k}:</span>
                <span className="text-white font-bold truncate">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
