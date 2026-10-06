import React, { useState } from 'react';
import { Play, Square, ChevronDown, ChevronUp, Upload, CheckCircle2, AlertCircle } from 'lucide-react';

const PRESET_FILES = [
  { name: 'small.txt', label: 'small.txt (~1.4 KB Text)', path: 'test_files/small.txt' },
  { name: 'sample.pdf', label: 'sample.pdf (~0.6 KB PDF)', path: 'test_files/sample.pdf' },
  { name: 'image.jpg', label: 'image.jpg (~4.7 KB JPEG)', path: 'test_files/image.jpg' },
  { name: 'data_5mb.bin', label: 'data_5mb.bin (5.0 MB Binary)', path: 'test_files/data_5mb.bin' },
];

const PROTOCOLS = [
  { id: 'saw', name: 'Stop-and-Wait', desc: 'Single packet lockstep' },
  { id: 'gbn', name: 'Go-Back-N', desc: 'Sliding cumulative window' },
  { id: 'sr', name: 'Selective Repeat', desc: 'Isolated selective recovery' },
];

export default function TransferControls({ onStart, onStop, isRunning, activeStats, config, setConfig }) {
  const [selectedPreset, setSelectedPreset] = useState('test_files/small.txt');
  const [customFile, setCustomFile] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setCustomFile(e.target.files[0]);
  };

  const handleStart = () => onStart({
    customFile,
    serverFilePath: customFile ? null : selectedPreset,
    protocol: config.protocol,
    packetSize: parseInt(config.packetSize, 10),
    timeout: parseFloat(config.timeout),
    adaptiveTimeout: config.adaptiveTimeout,
    windowSize: parseInt(config.windowSize, 10),
    maxRetries: parseInt(config.maxRetries, 10),
  });

  const progress = activeStats?.progress_percentage || 0;
  const throughput = activeStats?.throughput_mbps || 0;
  const isSuccess = activeStats?.status === 'completed';
  const isFailed = activeStats?.status === 'failed';

  return (
    <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#ECE9E2] mb-8">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
            Configuration
          </span>
          <h2 className="font-editorial text-2xl font-extrabold tracking-tight text-[#141413]">
            TRANSFER SETUP
          </h2>
        </div>
        <span className="tag-pill">
          {config.protocol.toUpperCase()} PROTOCOL
        </span>
      </div>

      <div className="space-y-8">
        
        {/* 1. Protocol Selection */}
        <div>
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[#626059] block mb-3">
            Choose Protocol
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {PROTOCOLS.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={isRunning}
                onClick={() => setConfig({ ...config, protocol: p.id })}
                className={`p-4 rounded-xl text-left border transition-all ${
                  config.protocol === p.id
                    ? 'bg-[#141413] text-[#F5F3EE] border-[#141413] shadow-sm'
                    : 'bg-[#F5F3EE] text-[#141413] border-[#DCD9D1] hover:border-[#141413]'
                } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="font-editorial text-sm font-bold block">
                  {p.name}
                </span>
                <span className={`text-[11px] font-mono mt-1 block ${config.protocol === p.id ? 'text-[#AAA59A]' : 'text-[#626059]'}`}>
                  {p.desc}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. File Selection */}
        <div>
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-[#626059] block mb-3">
            Choose File Payload
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <select
                disabled={isRunning || !!customFile}
                value={selectedPreset}
                onChange={(e) => setSelectedPreset(e.target.value)}
                className="w-full bg-[#F5F3EE] border border-[#DCD9D1] rounded-xl px-4 py-3 text-sm font-mono text-[#141413] focus:outline-none focus:border-[#141413] transition-colors disabled:opacity-50"
              >
                {PRESET_FILES.map((f) => (
                  <option key={f.path} value={f.path}>{f.label}</option>
                ))}
              </select>
            </div>

            <label className={`cursor-pointer inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[#DCD9D1] bg-[#F5F3EE] hover:bg-[#ECE9E2] text-xs font-mono font-semibold uppercase tracking-wider text-[#141413] transition-all ${isRunning ? 'opacity-50 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4 text-[#626059]" />
              <span>Upload Custom</span>
              <input type="file" onChange={handleFileChange} disabled={isRunning} className="hidden" />
            </label>
          </div>

          {customFile && (
            <div className="mt-3 p-3 bg-[#ECE9E2] border border-[#DCD9D1] rounded-lg flex items-center justify-between">
              <span className="text-xs font-mono text-[#141413]">
                Selected: <strong>{customFile.name}</strong> ({(customFile.size / 1024).toFixed(1)} KB)
              </span>
              <button 
                onClick={() => setCustomFile(null)}
                className="text-xs font-mono text-[#626059] hover:text-[#141413] uppercase underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>

        {/* 3. Collapsible Advanced Settings */}
        <div className="border-t border-[#ECE9E2] pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs font-mono font-semibold text-[#626059] hover:text-[#141413] uppercase tracking-wider"
          >
            <span>{showAdvanced ? 'Hide Advanced Parameters' : 'Show Advanced Parameters'}</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-5 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
              <div>
                <label className="text-[11px] font-mono text-[#626059] uppercase block mb-1">
                  Window Size (N)
                </label>
                <input
                  type="number" min="1" max="64"
                  disabled={isRunning || config.protocol === 'saw'}
                  value={config.protocol === 'saw' ? 1 : config.windowSize}
                  onChange={(e) => setConfig({ ...config, windowSize: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#DCD9D1] rounded-lg px-3 py-2 text-xs font-mono text-[#141413]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#626059] uppercase block mb-1">
                  Payload Size
                </label>
                <select
                  disabled={isRunning}
                  value={config.packetSize}
                  onChange={(e) => setConfig({ ...config, packetSize: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#DCD9D1] rounded-lg px-3 py-2 text-xs font-mono text-[#141413]"
                >
                  <option value="256">256 B</option>
                  <option value="512">512 B</option>
                  <option value="1024">1024 B</option>
                  <option value="2048">2048 B</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#626059] uppercase block mb-1">
                  Base Timeout (s)
                </label>
                <input
                  type="number" step="0.1" min="0.05" max="5.0"
                  disabled={isRunning}
                  value={config.timeout}
                  onChange={(e) => setConfig({ ...config, timeout: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#DCD9D1] rounded-lg px-3 py-2 text-xs font-mono text-[#141413]"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-[#626059] uppercase block mb-1">
                  RTO Mode
                </label>
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => setConfig({ ...config, adaptiveTimeout: !config.adaptiveTimeout })}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-mono font-bold border transition-colors ${
                    config.adaptiveTimeout 
                      ? 'bg-[#141413] text-[#F5F3EE] border-[#141413]' 
                      : 'bg-[#FFFFFF] text-[#626059] border-[#DCD9D1]'
                  }`}
                >
                  {config.adaptiveTimeout ? 'Adaptive (EWMA)' : 'Fixed Timeout'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 4. Action & Live Progress */}
        <div className="border-t border-[#ECE9E2] pt-6 space-y-4">
          
          {/* Progress Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isRunning && <span className="w-2 h-2 rounded-full bg-[#141413] animate-ping" />}
              <span className="text-xs font-mono text-[#626059]">
                {isRunning
                  ? `Transmitting — ${activeStats?.unique_packets_delivered || 0} of ${activeStats?.total_data_packets || '?'} packets`
                  : isSuccess ? 'Transfer Completed Successfully'
                  : isFailed ? 'Transfer Interrupted'
                  : 'Ready to transmit'}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-[#626059]">
                {throughput.toFixed(2)} Mbps
              </span>
              <span className="font-editorial text-lg font-bold text-[#141413]">
                {progress.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Minimal Progress Bar */}
          <div className="w-full h-1.5 bg-[#ECE9E2] rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#141413] transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 pt-2">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="btn-primary py-3 px-8 flex items-center gap-2 text-xs"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Transfer</span>
              </button>
            ) : (
              <button
                onClick={onStop}
                className="btn-secondary py-3 px-8 flex items-center gap-2 text-xs text-red-600 border-red-200 hover:bg-red-50 hover:border-red-400"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop Transfer</span>
              </button>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
