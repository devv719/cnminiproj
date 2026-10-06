import React, { useState } from 'react';
import { Play, Square, Upload, FileText, Settings, Layers, Timer, Hash } from 'lucide-react';

const PRESET_FILES = [
  { name: 'small.txt', label: 'small.txt (Text, ~1.4 KB)', path: 'test_files/small.txt' },
  { name: 'sample.pdf', label: 'sample.pdf (PDF Document, ~0.6 KB)', path: 'test_files/sample.pdf' },
  { name: 'image.jpg', label: 'image.jpg (JPEG Image, ~4.7 KB)', path: 'test_files/image.jpg' },
  { name: 'data_5mb.bin', label: 'data_5mb.bin (Large Binary, 5.0 MB)', path: 'test_files/data_5mb.bin' },
];

export default function TransferControls({
  onStart,
  onStop,
  isRunning,
  activeStats,
  config,
  setConfig,
}) {
  const [selectedPreset, setSelectedPreset] = useState('test_files/small.txt');
  const [customFile, setCustomFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCustomFile(e.target.files[0]);
    }
  };

  const handleStart = () => {
    onStart({
      customFile,
      serverFilePath: customFile ? null : selectedPreset,
      protocol: config.protocol,
      packetSize: parseInt(config.packetSize, 10),
      timeout: parseFloat(config.timeout),
      adaptiveTimeout: config.adaptiveTimeout,
      windowSize: parseInt(config.windowSize, 10),
      maxRetries: parseInt(config.maxRetries, 10),
    });
  };

  const progress = activeStats?.progress_percentage || 0;
  const throughput = activeStats?.throughput_mbps || 0;

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/80">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <Settings className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Transfer Configuration</h2>
        </div>
        <span className="text-xs font-mono text-slate-400">Layer 4 ARQ Setup</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Protocol Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            ARQ Protocol
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800">
            {['saw', 'gbn', 'sr'].map((p) => (
              <button
                key={p}
                type="button"
                disabled={isRunning}
                onClick={() => setConfig({ ...config, protocol: p })}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all ${
                  config.protocol === p
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* 2. File Selection */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            File Source
          </label>
          <div className="flex gap-2">
            <select
              disabled={isRunning || !!customFile}
              value={selectedPreset}
              onChange={(e) => setSelectedPreset(e.target.value)}
              className="flex-1 bg-slate-900/90 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            >
              {PRESET_FILES.map((f) => (
                <option key={f.path} value={f.path}>
                  {f.label}
                </option>
              ))}
            </select>
            <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 p-2 rounded-xl flex items-center justify-center border border-slate-700 transition-colors">
              <Upload className="w-4 h-4" />
              <input type="file" onChange={handleFileChange} disabled={isRunning} className="hidden" />
            </label>
          </div>
          {customFile && (
            <div className="flex items-center justify-between text-[11px] text-blue-400 bg-blue-500/10 px-2 py-1 rounded-lg">
              <span className="truncate">{customFile.name} ({(customFile.size / 1024).toFixed(1)} KB)</span>
              <button onClick={() => setCustomFile(null)} className="text-slate-400 hover:text-rose-400 ml-2">✕</button>
            </div>
          )}
        </div>

        {/* 3. Window & Packet Size */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-indigo-400" />
              Window (N)
            </label>
            <input
              type="number"
              min="1"
              max="64"
              disabled={isRunning || config.protocol === 'saw'}
              value={config.protocol === 'saw' ? 1 : config.windowSize}
              onChange={(e) => setConfig({ ...config, windowSize: e.target.value })}
              className="w-full bg-slate-900/90 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-40"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              Payload (B)
            </label>
            <select
              disabled={isRunning}
              value={config.packetSize}
              onChange={(e) => setConfig({ ...config, packetSize: e.target.value })}
              className="w-full bg-slate-900/90 border border-slate-800 text-xs rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="256">256 B</option>
              <option value="512">512 B</option>
              <option value="1024">1024 B (1 KB)</option>
              <option value="2048">2048 B (2 KB)</option>
              <option value="4096">4096 B (4 KB)</option>
            </select>
          </div>
        </div>

        {/* 4. Timeout & Adaptive Switch */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-emerald-400" />
              Base RTO (s)
            </label>
            <input
              type="number"
              step="0.1"
              min="0.05"
              max="10.0"
              disabled={isRunning}
              value={config.timeout}
              onChange={(e) => setConfig({ ...config, timeout: e.target.value })}
              className="w-full bg-slate-900/90 border border-slate-800 text-xs rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-1.5 flex flex-col justify-end">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => setConfig({ ...config, adaptiveTimeout: !config.adaptiveTimeout })}
              className={`w-full py-2 px-2 text-xs font-bold rounded-xl border transition-all flex items-center justify-center gap-1.5 ${
                config.adaptiveTimeout
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span>{config.adaptiveTimeout ? 'Adaptive RTO: ON' : 'Fixed RTO'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress & Action Controls */}
      <div className="mt-5 pt-4 border-t border-slate-800/60 flex flex-col sm:flex-row items-center gap-4 justify-between">
        {/* Progress bar */}
        <div className="w-full sm:flex-1">
          <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
            <span className="text-slate-400">
              {isRunning
                ? `Transferring: ${activeStats?.unique_packets_delivered || 0} / ${activeStats?.total_data_packets || 0} packets`
                : activeStats?.status === 'completed'
                ? 'Transfer Completed Successfully'
                : 'Ready for transfer'}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-cyan-400 font-mono font-bold">{throughput.toFixed(2)} Mbps</span>
              <span className="text-slate-200 font-mono font-bold">{progress.toFixed(1)}%</span>
            </div>
          </div>
          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-800 relative">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                activeStats?.status === 'failed'
                  ? 'bg-rose-500'
                  : progress >= 100
                  ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>

        {/* Start / Stop Buttons */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Transfer
            </button>
          ) : (
            <button
              onClick={onStop}
              className="w-full sm:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center gap-2"
            >
              <Square className="w-4 h-4 fill-white" />
              Stop Transfer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
