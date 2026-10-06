import React, { useState } from 'react';
import { Play, Download, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const RESEARCH_EXPERIMENTS = [
  { 
    id: 'loss_sweep', 
    num: '01', 
    title: 'LOSSY WI-FI CHANNEL', 
    desc: 'Evaluate Stop-and-Wait vs Go-Back-N vs Selective Repeat over escalating packet loss (0% to 30%).',
    param: 'Loss Rate 0.0 - 0.3'
  },
  { 
    id: 'delay_sweep', 
    num: '02', 
    title: 'SATELLITE PROPAGATION LATENCY', 
    desc: 'Benchmark bandwidth-delay product degradation across high latency links (10ms to 600ms).',
    param: 'Delay 10ms - 600ms'
  },
  { 
    id: 'protocol_comparison', 
    num: '03', 
    title: 'HEAD-TO-HEAD PROTOCOL COMPARISON', 
    desc: 'Execute identical file payload transfers across SAW, GBN, and SR with synchronized seed.',
    param: 'Standard 5% Loss Channel'
  },
  { 
    id: 'packet_size_sweep', 
    num: '04', 
    title: 'PAYLOAD MTU OPTIMIZATION', 
    desc: 'Analyze overhead ratio and goodput efficiency across 256B to 4096B payload boundaries.',
    param: 'Packet Sizes 256B - 4KB'
  },
  { 
    id: 'corruption_sweep', 
    num: '05', 
    title: 'CORRUPTED BITSTREAM CHANNEL', 
    desc: 'Test CRC-32 integrity rejections and retransmission overhead under high noise levels.',
    param: 'Corruption 0% - 20%'
  },
  { 
    id: 'timeout_comparison', 
    num: '06', 
    title: 'ADAPTIVE VS FIXED TIMEOUT (RTO)', 
    desc: 'Compare Jacobson/Karns EWMA variance estimation against static timeout under high jitter.',
    param: 'Jitter 0ms - 150ms'
  },
];

export default function ExperimentsPanel() {
  const [selectedType, setSelectedType] = useState('loss_sweep');
  const [seed, setSeed] = useState(42);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [expId, setExpId] = useState(null);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const startExperiment = async (expTypeId = selectedType) => {
    setSelectedType(expTypeId);
    setIsRunning(true);
    setResults(null);
    setError(null);
    setProgress(0);

    try {
      const res = await fetch('/api/experiments/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ experiment_type: expTypeId, seed: parseInt(seed, 10) }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExpId(data.experiment_id);

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

  const renderChart = () => {
    if (!results?.data) return null;
    const data = results.data;

    if (data.series && typeof data.series === 'object' && !Array.isArray(data.series)) {
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
        <div className="space-y-8 mt-6">
          <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-xl p-6">
            <h4 className="font-editorial text-base font-bold text-[#141413] mb-4">
              Throughput (Mbps) vs {paramKey}
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 4" stroke="#ECE9E2" vertical={false} />
                  <XAxis dataKey={paramKey} tick={{ fill: '#969389', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <YAxis tick={{ fill: '#969389', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                  <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #DCD9D1', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono', paddingTop: '8px' }} />
                  <Line type="monotone" dataKey="saw_throughput" stroke="#969389" strokeWidth={1.5} name="Stop-and-Wait" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="gbn_throughput" stroke="#626059" strokeWidth={2} name="Go-Back-N" dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="sr_throughput" stroke="#141413" strokeWidth={2.5} name="Selective Repeat" dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }

    if (data.comparison) {
      return (
        <div className="mt-6 bg-[#FFFFFF] border border-[#DCD9D1] rounded-xl p-6 overflow-x-auto">
          <h4 className="font-editorial text-base font-bold text-[#141413] mb-4">
            Protocol Comparison Results
          </h4>
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#DCD9D1] text-[#969389] text-[10px] uppercase">
                <th className="py-2.5 px-3">Protocol</th>
                <th className="py-2.5 px-3">Throughput</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Retransmissions</th>
                <th className="py-2.5 px-3">Efficiency</th>
                <th className="py-2.5 px-3">Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ECE9E2]">
              {data.comparison.map((row) => (
                <tr key={row.protocol} className="hover:bg-[#F5F3EE]">
                  <td className="py-3 px-3 font-bold text-[#141413]">{row.protocol}</td>
                  <td className="py-3 px-3 text-[#141413]">{(row.throughput_mbps || 0).toFixed(3)} Mbps</td>
                  <td className="py-3 px-3 text-[#626059]">{(row.duration_seconds || 0).toFixed(2)} s</td>
                  <td className="py-3 px-3 font-bold text-[#141413]">{row.retransmissions}</td>
                  <td className="py-3 px-3 text-[#141413]">{((row.protocol_efficiency || 0) * 100).toFixed(1)}%</td>
                  <td className="py-3 px-3 font-bold">{row.verified ? '✓ VERIFIED' : '✗ FAILED'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (data.fixed && data.adaptive) {
      const chartData = data.fixed.map((pt, i) => ({
        jitter_ms: pt.jitter_ms,
        fixed_throughput: pt.throughput_mbps,
        adaptive_throughput: data.adaptive[i]?.throughput_mbps,
      }));
      return (
        <div className="mt-6 bg-[#FFFFFF] border border-[#DCD9D1] rounded-xl p-6">
          <h4 className="font-editorial text-base font-bold text-[#141413] mb-4">
            Adaptive vs Fixed RTO Goodput
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#ECE9E2" vertical={false} />
                <XAxis dataKey="jitter_ms" tick={{ fill: '#969389', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <YAxis tick={{ fill: '#969389', fontSize: 10, fontFamily: 'JetBrains Mono' }} />
                <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #DCD9D1', borderRadius: '8px', fontFamily: 'JetBrains Mono', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'JetBrains Mono' }} />
                <Line type="monotone" dataKey="fixed_throughput" stroke="#969389" strokeWidth={1.5} name="Fixed RTO" />
                <Line type="monotone" dataKey="adaptive_throughput" stroke="#141413" strokeWidth={2.5} name="Adaptive EWMA RTO" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      );
    }

    return <pre className="text-xs text-[#626059] p-4 bg-[#F5F3EE] rounded-xl overflow-auto">{JSON.stringify(data, null, 2)}</pre>;
  };

  return (
    <div className="space-y-10">
      
      {/* Header */}
      <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-12 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#ECE9E2] gap-4 mb-8">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
              Scientific Benchmarking
            </span>
            <h2 className="font-editorial text-3xl font-extrabold tracking-tight text-[#141413]">
              RESEARCH EXPERIMENTS
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#F5F3EE] border border-[#DCD9D1] rounded-xl px-3 py-2">
              <span className="text-xs font-mono text-[#626059]">Seed:</span>
              <input
                type="number"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                disabled={isRunning}
                className="w-14 bg-transparent font-mono text-xs font-bold text-[#141413] focus:outline-none"
              />
            </div>
            {results && (
              <button
                onClick={handleExportCSV}
                className="btn-secondary text-xs py-2 px-4 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <div className="mb-8 p-4 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
            <div className="flex items-center justify-between text-xs font-mono text-[#141413] mb-2">
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Running Automated Benchmark...
              </span>
              <span className="font-bold">{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#ECE9E2] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#141413] transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 6 Research Experiments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {RESEARCH_EXPERIMENTS.map((exp) => (
            <div
              key={exp.id}
              className={`p-6 rounded-xl border transition-all flex flex-col justify-between ${
                selectedType === exp.id
                  ? 'bg-[#F5F3EE] border-[#141413] ring-1 ring-[#141413]'
                  : 'bg-[#FFFFFF] border-[#DCD9D1] hover:border-[#141413]'
              }`}
            >
              <div>
                <span className="font-mono text-xs font-bold text-[#969389] block mb-2">
                  {exp.num} / EXPERIMENT
                </span>
                <h3 className="font-editorial text-base font-bold text-[#141413] mb-2">
                  {exp.title}
                </h3>
                <p className="text-xs text-[#626059] leading-relaxed mb-4">
                  {exp.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-[#ECE9E2] flex items-center justify-between">
                <span className="tag-pill text-[10px]">
                  {exp.param}
                </span>
                <button
                  onClick={() => startExperiment(exp.id)}
                  disabled={isRunning}
                  className="btn-primary text-[11px] py-1.5 px-3 flex items-center gap-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Execute</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Results Visualizer Section */}
        {results && !isRunning && (
          <div className="mt-10 pt-8 border-t border-[#ECE9E2]">
            <div className="flex items-center gap-2 text-xs font-mono text-[#141413] font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>Experiment Finished. Analysis generated below:</span>
            </div>
            {renderChart()}
          </div>
        )}

      </div>

    </div>
  );
}
