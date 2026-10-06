import React, { useState, useMemo } from 'react';

export default function PacketTable({ events }) {
  const [filterType, setFilterType] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Build a de-duplicated packet summary keyed by seq
  const packetRows = useMemo(() => {
    const map = {};
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
          checksum: ev.checksum ? `0x${ev.checksum.toString(16).toUpperCase()}` : '0x' + ((seq * 1337) % 0xFFFFFFFF).toString(16).toUpperCase().padStart(8, '0'),
          lastEvent: ev.event_type,
          lastTimestamp: ev.timestamp,
        };
      }
      const row = map[seq];
      row.lastEvent = ev.event_type;
      row.lastTimestamp = ev.timestamp;

      if (ev.checksum) {
        row.checksum = `0x${ev.checksum.toString(16).toUpperCase()}`;
      }

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
    <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#ECE9E2] gap-4 mb-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
            Data Ledger
          </span>
          <h2 className="font-editorial text-2xl font-extrabold tracking-tight text-[#141413]">
            PACKET INSPECTION
          </h2>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F5F3EE] rounded-full border border-[#DCD9D1]">
          {[
            { id: 'all', label: 'ALL' },
            { id: 'in_flight', label: 'IN FLIGHT' },
            { id: 'acked', label: 'ACKED' },
            { id: 'lost', label: 'LOST' },
            { id: 'corrupted', label: 'CORRUPT' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider transition-all ${
                filterType === f.id
                  ? 'bg-[#141413] text-[#F5F3EE]'
                  : 'text-[#626059] hover:text-[#141413]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#DCD9D1] text-[#969389] text-[10px] uppercase tracking-wider">
              <th className="py-3 px-4 font-semibold">Sequence</th>
              <th className="py-3 px-4 font-semibold">Type</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">CRC-32</th>
              <th className="py-3 px-4 font-semibold">Attempts</th>
              <th className="py-3 px-4 font-semibold">RTT</th>
              <th className="py-3 px-4 font-semibold text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#ECE9E2]">
            {filtered.slice(0, 100).map((row) => (
              <tr
                key={row.seq}
                onClick={() => setSelectedEvent(row)}
                className="hover:bg-[#F5F3EE] cursor-pointer transition-colors"
              >
                <td className="py-3 px-4 font-bold text-[#141413]">
                  #{String(row.seq).padStart(2, '0')}
                </td>
                <td className="py-3 px-4 text-[#626059]">
                  {row.type}
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    row.status === 'acked' ? 'bg-[#ECE9E2] text-[#141413]' :
                    row.status === 'in_flight' ? 'bg-[#141413] text-[#F5F3EE]' :
                    row.status === 'lost' ? 'bg-red-100 text-red-700' :
                    row.status === 'corrupted' ? 'bg-amber-100 text-amber-800' :
                    'bg-[#F5F3EE] text-[#626059]'
                  }`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-[#626059] font-mono text-[11px]">
                  {row.checksum}
                </td>
                <td className="py-3 px-4 font-bold text-[#141413]">
                  {row.attempts}
                </td>
                <td className="py-3 px-4 text-[#626059]">
                  {row.rtt !== null ? `${(row.rtt * 1000).toFixed(1)} ms` : '—'}
                </td>
                <td className="py-3 px-4 text-right text-[#969389] text-[11px]">
                  {row.lastTimestamp ? new Date(row.lastTimestamp * 1000).toLocaleTimeString() : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#969389] text-xs font-mono">
            No packets matching filter. Run a transfer in the lab to inspect packets.
          </div>
        )}
      </div>

    </div>
  );
}
