import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, Check, Zap } from 'lucide-react';

const DEFAULT_PRESETS = {
  IDEAL:     { loss_rate: 0.0,  corruption_rate: 0.0,  delay_ms: 0.0,   jitter_ms: 0.0,  duplicate_rate: 0.0,  reorder_rate: 0.0 },
  LAN:       { loss_rate: 0.0,  corruption_rate: 0.0,  delay_ms: 1.0,   jitter_ms: 0.5,  duplicate_rate: 0.0,  reorder_rate: 0.0 },
  'WI-FI':   { loss_rate: 0.02, corruption_rate: 0.01, delay_ms: 15.0,  jitter_ms: 5.0,  duplicate_rate: 0.01, reorder_rate: 0.01 },
  POOR:      { loss_rate: 0.15, corruption_rate: 0.05, delay_ms: 120.0, jitter_ms: 40.0, duplicate_rate: 0.03, reorder_rate: 0.05 },
  SATELLITE: { loss_rate: 0.03, corruption_rate: 0.01, delay_ms: 600.0, jitter_ms: 50.0, duplicate_rate: 0.0,  reorder_rate: 0.0 },
};

const SLIDERS = [
  { key: 'loss_rate',       label: 'Packet Loss',     min: 0, max: 0.5,  step: 0.01, unit: '%',  factor: 100 },
  { key: 'corruption_rate', label: 'Bit Corruption',  min: 0, max: 0.5,  step: 0.01, unit: '%',  factor: 100 },
  { key: 'delay_ms',        label: 'Propagation Delay',min: 0, max: 800,  step: 10,   unit: 'ms', factor: 1 },
  { key: 'jitter_ms',       label: 'Latency Jitter',  min: 0, max: 200,  step: 5,    unit: 'ms', factor: 1, prefix: '±' },
  { key: 'duplicate_rate',  label: 'Duplicate Rate',  min: 0, max: 0.2,  step: 0.01, unit: '%',  factor: 100 },
  { key: 'reorder_rate',    label: 'Reorder Rate',    min: 0, max: 0.2,  step: 0.01, unit: '%',  factor: 100 },
];

export default function NetworkSimulator({ simulatorConfig, onConfigChange }) {
  const [activePreset, setActivePreset] = useState('WI-FI');
  const [presets, setPresets] = useState(DEFAULT_PRESETS);
  const isCustom = activePreset === 'CUSTOM';

  useEffect(() => {
    fetch('/api/profiles')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setPresets((prev) => ({
            ...prev,
            LAN: data.LAN || prev.LAN,
            'WI-FI': data.WIFI || data['WI-FI'] || prev['WI-FI'],
            POOR: data.POOR || prev.POOR,
            SATELLITE: data.SATELLITE || prev.SATELLITE,
          }));
        }
      })
      .catch((err) => {
        console.warn('Could not load profiles from backend, using defaults:', err);
      });
  }, []);

  const updateField = (field, val) => {
    setActivePreset('CUSTOM');
    onConfigChange({ ...simulatorConfig, [field]: val });
  };

  const applyPreset = (name) => {
    setActivePreset(name);
    if (name !== 'CUSTOM' && presets[name]) {
      onConfigChange(presets[name]);
    }
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#ECE9E2] gap-4 mb-6">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
            Channel Environment
          </span>
          <h2 className="font-editorial text-2xl font-extrabold tracking-tight text-[#141413]">
            NETWORK CONDITIONS
          </h2>
        </div>

        {/* Preset Pill Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F5F3EE] rounded-full border border-[#DCD9D1]">
          {['IDEAL', 'LAN', 'WI-FI', 'POOR', 'SATELLITE', 'CUSTOM'].map((p) => {
            const isSelected = activePreset === p;
            return (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider transition-all ${
                  isSelected
                    ? 'bg-[#141413] text-[#F5F3EE] shadow-sm'
                    : 'text-[#626059] hover:text-[#141413] hover:bg-[#ECE9E2]'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Summary when preset selected */}
      {!isCustom && (
        <div className="p-4 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1] flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-xs font-mono text-[#626059]">
            <div>
              <span className="text-[#969389] block text-[10px]">LOSS</span>
              <span className="font-bold text-[#141413]">{(simulatorConfig.loss_rate * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-[#969389] block text-[10px]">CORRUPT</span>
              <span className="font-bold text-[#141413]">{(simulatorConfig.corruption_rate * 100).toFixed(0)}%</span>
            </div>
            <div>
              <span className="text-[#969389] block text-[10px]">DELAY</span>
              <span className="font-bold text-[#141413]">{simulatorConfig.delay_ms.toFixed(0)} ms</span>
            </div>
            <div>
              <span className="text-[#969389] block text-[10px]">JITTER</span>
              <span className="font-bold text-[#141413]">±{simulatorConfig.jitter_ms.toFixed(0)} ms</span>
            </div>
          </div>

          <button
            onClick={() => setActivePreset('CUSTOM')}
            className="text-xs font-mono font-bold text-[#141413] flex items-center gap-1.5 hover:underline"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Customize Impairments</span>
          </button>
        </div>
      )}

      {/* Custom Sliders Revealed Smoothly */}
      <AnimatePresence>
        {isCustom && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {SLIDERS.map(({ key, label, min, max, step, unit, factor, prefix = '' }) => {
                const val = simulatorConfig?.[key] || 0;
                const display = factor === 100 ? (val * 100).toFixed(0) : val.toFixed(0);

                return (
                  <div key={key} className="p-4 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[11px] font-mono uppercase text-[#626059] font-medium">
                        {label}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#141413] bg-[#FFFFFF] px-2 py-0.5 rounded border border-[#DCD9D1]">
                        {prefix}{display} {unit}
                      </span>
                    </div>

                    <input
                      type="range"
                      min={min} max={max} step={step}
                      value={val}
                      onChange={(e) => updateField(key, parseFloat(e.target.value))}
                    />

                    <div className="flex justify-between text-[10px] font-mono text-[#969389] mt-2">
                      <span>{min * factor}{unit}</span>
                      <span>{max * factor}{unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
