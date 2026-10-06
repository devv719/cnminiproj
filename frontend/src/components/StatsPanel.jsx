import React, { useMemo } from 'react';
import { BarChart2, Activity, Target, RefreshCw, Clock, Zap, TrendingUp, Award } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

function StatCard({ label, value, unit, color = 'blue', icon: Icon }) {
  const colorMap = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    green: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
    purple: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  };
  return (
    <div className={`rounded-xl p-3.5 border ${colorMap[color]} flex flex-col gap-1.5`}>
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 opacity-80" />}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-300">{label}</span>
      </div>
      <div className="flex items-end gap-1">
        <span className="text-2xl font-black font-mono">{value}</span>
        {unit && <span className="text-xs text-slate-400 mb-0.5">{unit}</span>}
      </div>
    </div>
  );
}

export default function StatsPanel({ activeStats, statusSnapshot }) {
  const stats = activeStats || statusSnapshot?.stats || {};
  const timeSeries = stats.time_series || [];

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/80">
      <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-800/60">
        <BarChart2 className="w-5 h-5 text-purple-400" />
        <h2 className="text-base font-bold text-white tracking-wide">Live Transfer Statistics</h2>
      </div>

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        <StatCard label="Throughput" value={(stats.throughput_mbps || 0).toFixed(3)} unit="Mbps" color="cyan" icon={TrendingUp} />
        <StatCard label="Efficiency" value={((stats.protocol_efficiency || 0) * 100).toFixed(1)} unit="%" color="green" icon={Target} />
        <StatCard label="Retransmissions" value={stats.retransmissions || 0} color="amber" icon={RefreshCw} />
        <StatCard label="Packets Lost" value={stats.packets_lost || 0} color="rose" icon={Zap} />
        <StatCard label="Avg RTT" value={(stats.avg_rtt_ms || 0).toFixed(1)} unit="ms" color="blue" icon={Activity} />
        <StatCard label="Current RTO" value={(stats.current_timeout_ms || 1000).toFixed(0)} unit="ms" color="purple" icon={Clock} />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 text-xs">
        {[
          { label: 'Total Sent Attempts', value: stats.sent_attempts || 0 },
          { label: 'Unique Delivered', value: stats.unique_packets_delivered || 0 },
          { label: 'Duplicates Detected', value: stats.duplicates_detected || 0 },
          { label: 'Corrupted Detected', value: stats.corrupted_detected || 0 },
          { label: 'ACKs Sent', value: stats.acks_sent || 0 },
          { label: 'ACKs Received', value: stats.acks_received || 0 },
          { label: 'Timeouts', value: stats.timeouts || 0 },
          { label: 'Duration', value: `${(stats.duration_seconds || 0).toFixed(2)}s` },
        ].map(({ label, value }) => (
          <div key={label} className="bg-slate-900/70 rounded-xl p-2.5 border border-slate-800/60 flex justify-between items-center">
            <span className="text-slate-400 font-medium">{label}</span>
            <span className="text-white font-mono font-bold">{value}</span>
          </div>
        ))}
      </div>

      {/* Theoretical SAW Efficiency comparison */}
      {stats.theoretical_saw_efficiency !== undefined && (
        <div className="mb-5 p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-indigo-300">
            <Award className="w-4 h-4" />
            <span className="font-semibold">Theoretical Stop-and-Wait Efficiency (Tt / (Tt + RTT)):</span>
          </div>
          <span className="font-mono font-bold text-indigo-300 text-sm">
            {((stats.theoretical_saw_efficiency || 0) * 100).toFixed(2)}%
          </span>
        </div>
      )}

      {/* Time Series Chart */}
      {timeSeries.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-300">Throughput & RTT Over Transfer Time</h3>
          <div className="h-44 rounded-xl bg-slate-900/60 p-2 border border-slate-800/60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 4, right: 8, left: -15, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="elapsed_s" tick={{ fill: '#64748b', fontSize: 10 }} label={{ value: 'Time (s)', fill: '#64748b', fontSize: 10 }} />
                <YAxis yAxisId="mbps" tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis yAxisId="rtt" orientation="right" tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ background: '#0d121e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: '#94a3b8' }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="mbps" type="monotone" dataKey="throughput_mbps" stroke="#06b6d4" strokeWidth={2} dot={false} name="Throughput (Mbps)" />
                <Line yAxisId="rtt" type="monotone" dataKey="rtt_ms" stroke="#f59e0b" strokeWidth={2} dot={false} name="RTT (ms)" />
                <Line yAxisId="rtt" type="monotone" dataKey="timeout_ms" stroke="#8b5cf6" strokeWidth={1.5} dot={false} strokeDasharray="5 5" name="RTO (ms)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
