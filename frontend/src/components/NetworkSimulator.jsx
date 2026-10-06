import React, { useState } from 'react';
import { Sliders, Zap, AlertTriangle, Clock, Copy, RefreshCw, Radio } from 'lucide-react';

const PRESETS = {
  LAN: { loss_rate: 0.0, corruption_rate: 0.0, delay_ms: 1.0, jitter_ms: 0.5, duplicate_rate: 0.0, reorder_rate: 0.0 },
  WIFI: { loss_rate: 0.02, corruption_rate: 0.01, delay_ms: 15.0, jitter_ms: 5.0, duplicate_rate: 0.01, reorder_rate: 0.01 },
  POOR: { loss_rate: 0.15, corruption_rate: 0.05, delay_ms: 120.0, jitter_ms: 40.0, duplicate_rate: 0.03, reorder_rate: 0.05 },
  SATELLITE: { loss_rate: 0.03, corruption_rate: 0.01, delay_ms: 600.0, jitter_ms: 50.0, duplicate_rate: 0.0, reorder_rate: 0.0 },
};

export default function NetworkSimulator({ simulatorConfig, onConfigChange, activeStats }) {
  const [activePreset, setActivePreset] = useState('CUSTOM');

  const updateField = (field, val) => {
    setActivePreset('CUSTOM');
    const newCfg = { ...simulatorConfig, [field]: val };
    onConfigChange(newCfg);
  };

  const applyPreset = (name) => {
    setActivePreset(name);
    const preset = PRESETS[name];
    if (preset) {
      onConfigChange(preset);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/80">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-800/60 gap-3">
        <div className="flex items-center gap-2.5">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-bold text-white tracking-wide">Network Condition Simulator (UDP Proxy)</h2>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-400 mr-1 font-medium">Presets:</span>
          {Object.keys(PRESETS).map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
                activePreset === p
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* 1. Packet Loss Slider */}
        <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-rose-400" />
              Packet Loss Rate
            </span>
            <span className="text-rose-400 font-mono font-bold">
              {((simulatorConfig?.loss_rate || 0) * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={simulatorConfig?.loss_rate || 0}
            onChange={(e) => updateField('loss_rate', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0% (Ideal)</span>
            <span>25%</span>
            <span>50% (Extreme)</span>
          </div>
        </div>

        {/* 2. Checksum Bit Corruption */}
        <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Bit Corruption
            </span>
            <span className="text-amber-400 font-mono font-bold">
              {((simulatorConfig?.corruption_rate || 0) * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.01"
            value={simulatorConfig?.corruption_rate || 0}
            onChange={(e) => updateField('corruption_rate', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0%</span>
            <span>25%</span>
            <span>50% (Noisy Channel)</span>
          </div>
        </div>

        {/* 3. Delay / Latency */}
        <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              One-Way Delay
            </span>
            <span className="text-blue-400 font-mono font-bold">
              {(simulatorConfig?.delay_ms || 0).toFixed(0)} ms
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="10"
            value={simulatorConfig?.delay_ms || 0}
            onChange={(e) => updateField('delay_ms', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0 ms (Local)</span>
            <span>200 ms</span>
            <span>1000 ms (GEO Satellite)</span>
          </div>
        </div>

        {/* 4. Jitter */}
        <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              Latency Jitter
            </span>
            <span className="text-cyan-400 font-mono font-bold">
              ±{(simulatorConfig?.jitter_ms || 0).toFixed(0)} ms
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="250"
            step="5"
            value={simulatorConfig?.jitter_ms || 0}
            onChange={(e) => updateField('jitter_ms', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0 ms</span>
            <span>100 ms</span>
            <span>250 ms</span>
          </div>
        </div>

        {/* 5. Packet Duplicates */}
        <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <Copy className="w-3.5 h-3.5 text-purple-400" />
              Duplicate Rate
            </span>
            <span className="text-purple-400 font-mono font-bold">
              {((simulatorConfig?.duplicate_rate || 0) * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.2"
            step="0.01"
            value={simulatorConfig?.duplicate_rate || 0}
            onChange={(e) => updateField('duplicate_rate', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0%</span>
            <span>10%</span>
            <span>20%</span>
          </div>
        </div>

        {/* 6. Packet Reordering */}
        <div className="space-y-2 p-3 bg-slate-900/60 rounded-xl border border-slate-800/60">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
              Reorder Rate
            </span>
            <span className="text-emerald-400 font-mono font-bold">
              {((simulatorConfig?.reorder_rate || 0) * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="0.2"
            step="0.01"
            value={simulatorConfig?.reorder_rate || 0}
            onChange={(e) => updateField('reorder_rate', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>0% (Strict Order)</span>
            <span>10%</span>
            <span>20%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
