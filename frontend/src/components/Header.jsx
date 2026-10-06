import React from 'react';
import { Activity, Wifi, WifiOff, Radio, ShieldCheck, Cpu } from 'lucide-react';

export default function Header({ connected, activeProtocol, isRunning }) {
  return (
    <header className="border-b border-slate-800 bg-[#0d121e]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Branding & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
                Reliable UDP Lab
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                v2.0 ARQ Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Real File Transfer over UDP • Stop-and-Wait • Go-Back-N • Selective Repeat
            </p>
          </div>
        </div>

        {/* Right: Status Indicators & Protocol Tag */}
        <div className="flex items-center gap-3">
          {/* Active Protocol Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span className="text-xs text-slate-400 font-medium">Protocol:</span>
            <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
              {activeProtocol === 'saw' ? 'Stop-and-Wait' : activeProtocol === 'gbn' ? 'Go-Back-N' : 'Selective Repeat'}
            </span>
          </div>

          {/* Transfer State Badge */}
          {isRunning ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse">
              <Activity className="w-4 h-4 animate-spin" />
              <span className="text-xs font-semibold">Active Transfer</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-400">
              <ShieldCheck className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-semibold">Ready</span>
            </div>
          )}

          {/* WebSocket Link Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
            connected
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
          }`}>
            {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            <span>{connected ? 'WS Live' : 'Connecting...'}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
