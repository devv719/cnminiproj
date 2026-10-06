import React from 'react';
import { ArrowUpRight } from 'lucide-react';

export default function Header({ activeView, setActiveView, isRunning, connected }) {
  return (
    <header className="sticky top-0 z-50 bg-[#F5F3EE]/90 backdrop-blur-md border-b border-[#DCD9D1] transition-all">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        {/* Brand Left */}
        <button 
          onClick={() => setActiveView('landing')}
          className="flex items-center gap-3 text-left group focus:outline-none"
        >
          <div className="w-8 h-8 rounded-full bg-[#141413] flex items-center justify-center text-[#F5F3EE] font-mono text-xs font-bold transition-transform group-hover:scale-105">
            UDP
          </div>
          <div>
            <span className="font-editorial text-sm font-bold tracking-tight text-[#141413] block">
              RELIABLE UDP LAB
            </span>
            <span className="text-[10px] font-mono text-[#969389] tracking-wider uppercase block">
              Transport Layer Research
            </span>
          </div>
        </button>

        {/* Center Minimal Navigation */}
        <nav className="hidden md:flex items-center gap-1 bg-[#ECE9E2] p-1.5 rounded-full border border-[#DCD9D1]">
          <button
            onClick={() => setActiveView('landing')}
            className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
              activeView === 'landing'
                ? 'bg-[#141413] text-[#F5F3EE] shadow-sm'
                : 'text-[#626059] hover:text-[#141413] hover:bg-[#E4E0D6]'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveView('lab')}
            className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
              activeView === 'lab'
                ? 'bg-[#141413] text-[#F5F3EE] shadow-sm'
                : 'text-[#626059] hover:text-[#141413] hover:bg-[#E4E0D6]'
            }`}
          >
            Lab
          </button>
          <button
            onClick={() => setActiveView('experiments')}
            className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
              activeView === 'experiments'
                ? 'bg-[#141413] text-[#F5F3EE] shadow-sm'
                : 'text-[#626059] hover:text-[#141413] hover:bg-[#E4E0D6]'
            }`}
          >
            Experiments
          </button>
          <button
            onClick={() => setActiveView('docs')}
            className={`px-5 py-2 rounded-full text-xs font-semibold tracking-wider uppercase transition-all ${
              activeView === 'docs'
                ? 'bg-[#141413] text-[#F5F3EE] shadow-sm'
                : 'text-[#626059] hover:text-[#141413] hover:bg-[#E4E0D6]'
            }`}
          >
            Documentation
          </button>
        </nav>

        {/* Right CTA */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setActiveView('lab')}
            className="btn-primary text-xs py-2.5 px-6 shadow-none flex items-center gap-2"
          >
            <span>{activeView === 'lab' ? (isRunning ? 'Running Lab' : 'Active Lab') : 'Open Lab'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </header>
  );
}
