import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

export default function StatsPanel({ activeStats, statusSnapshot }) {
  const stats = activeStats || statusSnapshot?.stats || {};
  const timeSeries = stats.time_series || [];

  const efficiency = ((stats.protocol_efficiency || 0) * 100).toFixed(1);
  const avgRtt = (stats.avg_rtt_ms || 0).toFixed(1);
  const throughput = (stats.throughput_mbps || 0).toFixed(2);
  const retransmissions = stats.retransmissions || 0;
  const lostPackets = stats.packets_lost || 0;
  const totalSent = stats.sent_attempts || 0;
  const uniqueDelivered = stats.unique_packets_delivered || 0;
  const duration = (stats.duration_seconds || 0).toFixed(2);

  return (
    <div className="space-y-8">
      
      {/* 1. Large Editorial Headline Metrics */}
      <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-12 shadow-sm">
        <div className="flex items-center justify-between pb-6 border-b border-[#ECE9E2] mb-10">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
              Telemetry Analysis
            </span>
            <h2 className="font-editorial text-2xl font-extrabold tracking-tight text-[#141413]">
              STATISTICS
            </h2>
          </div>
          <span className="text-xs font-mono text-[#626059]">
            Duration: {duration}s
          </span>
        </div>

        {/* 3 Massive Editorial Figures */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 pb-10 border-b border-[#ECE9E2]">
          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#969389] block mb-2">
              Efficiency
            </span>
            <div className="font-editorial text-5xl sm:text-6xl font-extrabold tracking-tighter text-[#141413]">
              {efficiency}<span className="text-2xl font-normal text-[#969389] ml-1">%</span>
            </div>
            <p className="text-xs text-[#626059] mt-2">
              Ratio of payload bytes to total wire bytes transmitted
            </p>
          </div>

          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#969389] block mb-2">
              Average RTT
            </span>
            <div className="font-editorial text-5xl sm:text-6xl font-extrabold tracking-tighter text-[#141413]">
              {avgRtt}<span className="text-2xl font-normal text-[#969389] ml-1">ms</span>
            </div>
            <p className="text-xs text-[#626059] mt-2">
              Smoothed round-trip latency across all ACKs
            </p>
          </div>

          <div>
            <span className="text-xs font-mono uppercase tracking-widest text-[#969389] block mb-2">
              Throughput
            </span>
            <div className="font-editorial text-5xl sm:text-6xl font-extrabold tracking-tighter text-[#141413]">
              {throughput}<span className="text-2xl font-normal text-[#969389] ml-1">Mbps</span>
            </div>
            <p className="text-xs text-[#626059] mt-2">
              Effective application-layer goodput speed
            </p>
          </div>
        </div>

        {/* Secondary Clean Counter Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8">
          <div>
            <span className="text-[11px] font-mono text-[#969389] uppercase block mb-1">
              Retransmissions
            </span>
            <span className="font-mono text-xl font-bold text-[#141413]">
              {retransmissions}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-mono text-[#969389] uppercase block mb-1">
              Packets Dropped
            </span>
            <span className="font-mono text-xl font-bold text-[#141413]">
              {lostPackets}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-mono text-[#969389] uppercase block mb-1">
              Packets Sent
            </span>
            <span className="font-mono text-xl font-bold text-[#141413]">
              {totalSent}
            </span>
          </div>

          <div>
            <span className="text-[11px] font-mono text-[#969389] uppercase block mb-1">
              Delivered
            </span>
            <span className="font-mono text-xl font-bold text-[#141413]">
              {uniqueDelivered}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Minimal Line Chart */}
      {timeSeries.length > 1 && (
        <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
                Time Series
              </span>
              <h3 className="font-editorial text-lg font-bold text-[#141413]">
                Throughput & Latency Dynamics
              </h3>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1 text-[#141413]">
                <span className="w-2.5 h-2.5 bg-[#141413] rounded-full inline-block"></span>
                Throughput (Mbps)
              </span>
              <span className="flex items-center gap-1 text-[#969389]">
                <span className="w-2.5 h-2.5 bg-[#969389] rounded-full inline-block"></span>
                RTT (ms)
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="#ECE9E2" vertical={false} />
                <XAxis 
                  dataKey="elapsed_s" 
                  tick={{ fill: '#969389', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: '#DCD9D1' }}
                />
                <YAxis 
                  yAxisId="mbps" 
                  tick={{ fill: '#969389', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: '#DCD9D1' }}
                />
                <YAxis 
                  yAxisId="rtt" 
                  orientation="right"
                  tick={{ fill: '#969389', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                  tickLine={false}
                  axisLine={{ stroke: '#DCD9D1' }}
                />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: '#FFFFFF', 
                    border: '1px solid #DCD9D1', 
                    borderRadius: '8px', 
                    fontFamily: 'JetBrains Mono', 
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }}
                />
                <Line 
                  yAxisId="mbps" 
                  type="monotone" 
                  dataKey="throughput_mbps" 
                  stroke="#141413" 
                  strokeWidth={2} 
                  dot={false} 
                />
                <Line 
                  yAxisId="rtt" 
                  type="monotone" 
                  dataKey="rtt_ms" 
                  stroke="#969389" 
                  strokeWidth={1.5} 
                  dot={false} 
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
