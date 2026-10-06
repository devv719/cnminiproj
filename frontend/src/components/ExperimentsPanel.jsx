import React, { useState } from 'react';
import { FlaskConical, Play, Download, Loader2, CheckCircle } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const EXPERIMENT_TYPES = [
  { id: 'loss_sweep', label: 'Loss Rate Sweep (SAW vs GBN vs SR)', shortLabel: 'Loss Sweep' },
  { id: 'delay_sweep', label: 'Latency Impact by Protocol', shortLabel: 'Delay Sweep' },
  { id: 'packet_size_sweep', label: 'Packet Size vs Throughput', shortLabel: 'Packet Size' },
  { id: 'protocol_comparison', label: 'Protocol Comparison (Identical Conditions)', shortLabel: 'Comparison' },
  { id: 'corruption_sweep', label: 'Bit Corruption Impact', shortLabel: 'Corruption' },
  { id: 'timeout_comparison', label: 'Fixed vs Adaptive RTO', shortLabel: 'Timeout' },
];

const COLORS = {
  saw: '#f59e0b',
  gbn: '#3b82f6',
  sr: '#10b981',
  fixed: '#f43f5e',
  adaptive: '#10b981',
};

export default function ExperimentsPanel() {
  const [selectedType, setSelectedType] = useState('loss_sweep');
  const [seed, setSeed] = useState(42);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expId, setExpId] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const startExperiment = async () => {
    setIsRunning(true);
    setResults(null);
    setError(null);
    setProgress(0);

    try {
      const res = await fetch('/api/experiments/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiment_type: selectedType, seed: parseInt(seed, 10) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExpId(data.experiment_id);

      // Poll for results
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch('/api/experiments/status');
          const status = await statusRes.json();
          setProgress(status.progress_pct || 0);

          if (!status.is_running) {
            clearInterval(pollInterval);
            setIsRunning(false);
            if (status.results?.data) {
              setResults(status.results);
            }
          }
        } catch {
          clearInterval(pollInterval);
          setIsRunning(false);
        }
      }, 800);
    } catch (err) {
      setError(err.message);
      setIsRunning(false);
    }
  };

  const handleExportCSV = async () => {
    if (!expId) return;
    window.open(`/api/experiments/${expId}/export`, '_blank');
  };

  // Render charts based on experiment type
  const renderChart = () => {
    if (!results?.data) return null;
    const data = results.data;

    if (data.series && typeof data.series === 'object' && !Array.isArray(data.series)) {
      // Multi-protocol series (loss_sweep, delay_sweep)
      const paramKey = data.parameter;
      const protocols = Object.keys(data.series);
      const allPoints = data.series[protocols[0]] || [];
      const chartData = allPoints.map((pt, i) => {
        const row = { [paramKey]: pt[paramKey] };
        protocols.forEach((p) => {
          row[`${p}_throughput`] = data.series[p]?.[i]?.throughput_mbps;
          row[`${p}_retransmissions`] = data.series[p]?.[i]?.retransmissions;
        });
        return row;
      });

      return (
        <div className="space-y-4">
          <div className="h-48">
            <p className="text-xs font-semibold text-slate-400 mb-2">Throughput (Mbps) vs {paramKey}</p>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey={paramKey} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0d121e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {protocols.map((p) => (
                  <Line key={p} type="monotone" dataKey={`${p}_throughput`} stroke={COLORS[p] || '#fff'} strokeWidth={2} dot={{ r: 3 }} name={`${p.toUpperCase()} Throughput`} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="h-48">
            <p className="text-xs font-semibold text-slate-400 mb-2">Retransmissions vs {paramKey}</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey={paramKey} tick={{ fill: '#64748b', fontSize: 10 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
                <Tooltip contentStyle={{ background: '#0d121e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {protocols.map((p) => (
                  <Bar key={p} dataKey={`${p}_retransmissions`} fill={COLORS[p] || '#6b7280'} name={`${p.toUpperCase()} Retransmissions`} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    if (data.comparison) {
      // Protocol comparison table
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-800/60">
          <table className="w-full text-xs font-mono">
            <thead className="bg-slate-900/70">
              <tr>
                {['Protocol', 'Throughput (Mbps)', 'Duration (s)', 'Retransmissions', 'Efficiency %', 'Theo. SAW %', 'Verified'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {data.comparison.map((row) => (
                <tr key={row.protocol} className="hover:bg-slate-900/40">
                  <td className="px-3 py-2 font-bold text-white">{row.protocol}</td>
                  <td className="px-3 py-2 text-cyan-400">{(row.throughput_mbps || 0).toFixed(3)}</td>
                  <td className="px-3 py-2 text-slate-300">{(row.duration_seconds || 0).toFixed(2)}</td>
                  <td className={`px-3 py-2 font-bold ${row.retransmissions > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{row.retransmissions}</td>
                  <td className="px-3 py-2 text-emerald-400">{((row.protocol_efficiency || 0) * 100).toFixed(1)}%</td>
                  <td className="px-3 py-2 text-indigo-400">{((row.theoretical_saw_efficiency || 0) * 100).toFixed(1)}%</td>
                  <td className={`px-3 py-2 font-bold ${row.verified ? 'text-emerald-400' : 'text-rose-400'}`}>{row.verified ? '✓ YES' : '✗ NO'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (data.fixed && data.adaptive) {
      // Timeout comparison
      const chartData = data.fixed.map((pt, i) => ({
        jitter_ms: pt.jitter_ms,
        fixed_throughput: pt.throughput_mbps,
        adaptive_throughput: data.adaptive[i]?.throughput_mbps,
        fixed_timeouts: pt.timeouts,
        adaptive_timeouts: data.adaptive[i]?.timeouts,
      }));
      return (
        <div className="h-56">
          <p className="text-xs font-semibold text-slate-400 mb-2">Fixed vs Adaptive RTO: Throughput by Jitter</p>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="jitter_ms" tick={{ fill: '#64748b', fontSize: 10 }} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: '#0d121e', border: '1px solid #1e293b', borderRadius: 8, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="fixed_throughput" stroke={COLORS.fixed} strokeWidth={2} name="Fixed RTO Throughput" />
              <Line type="monotone" dataKey="adaptive_throughput" stroke={COLORS.adaptive} strokeWidth={2} name="Adaptive RTO Throughput" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return <pre className="text-xs text-slate-400 overflow-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/80">
      <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-800/60">
        <FlaskConical className="w-5 h-5 text-indigo-400" />
        <h2 className="text-base font-bold text-white tracking-wide">Automated Experiments Engine</h2>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <select
          disabled={isRunning}
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="flex-1 bg-slate-900/90 border border-slate-800 text-sm rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          {EXPERIMENT_TYPES.map((et) => (
            <option key={et.id} value={et.id}>{et.label}</option>
          ))}
        </select>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2">
            <span className="text-xs text-slate-400 font-semibold">Seed:</span>
            <input
              type="number"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              disabled={isRunning}
              className="w-16 bg-transparent text-xs font-mono text-white focus:outline-none"
            />
          </div>
          <button
            onClick={startExperiment}
            disabled={isRunning}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {isRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isRunning ? `Running... ${progress.toFixed(0)}%` : 'Run Experiment'}
          </button>
          {results && (
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 border border-slate-700"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
          )}
        </div>
      </div>

      {/* Progress */}
      {isRunning && (
        <div className="mb-4">
          <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
          {error}
        </div>
      )}

      {/* Results */}
      {results && !isRunning && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle className="w-4 h-4" />
            <span className="font-semibold">Experiment completed.</span>
          </div>
          {renderChart()}
        </div>
      )}
    </div>
  );
}
