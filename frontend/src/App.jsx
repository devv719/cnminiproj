import React, { useState, useCallback } from 'react';
import './index.css';

import { useEventStream } from './hooks/useEventStream';
import Header from './components/Header';
import TransferControls from './components/TransferControls';
import NetworkSimulator from './components/NetworkSimulator';
import PacketVisualizer from './components/PacketVisualizer';
import StatsPanel from './components/StatsPanel';
import PacketTable from './components/PacketTable';
import IntegrityPanel from './components/IntegrityPanel';
import EventLog from './components/EventLog';
import ExperimentsPanel from './components/ExperimentsPanel';

// Nav tabs
const TABS = [
  { id: 'transfer', label: 'Transfer' },
  { id: 'visualizer', label: 'Visualizer' },
  { id: 'stats', label: 'Statistics' },
  { id: 'packets', label: 'Packet Table' },
  { id: 'integrity', label: 'Integrity' },
  { id: 'events', label: 'Event Log' },
  { id: 'experiments', label: 'Experiments' },
];

const API_BASE = 'http://localhost:8000';

export default function App() {
  const [activeTab, setActiveTab] = useState('transfer');
  const [transferConfig, setTransferConfig] = useState({
    protocol: 'saw',
    packetSize: '1024',
    timeout: '1.0',
    adaptiveTimeout: true,
    windowSize: '4',
    maxRetries: '15',
  });
  const [simulatorConfig, setSimulatorConfig] = useState({
    loss_rate: 0.0,
    corruption_rate: 0.0,
    delay_ms: 5.0,
    jitter_ms: 2.0,
    duplicate_rate: 0.0,
    reorder_rate: 0.0,
  });
  const [activeStats, setActiveStats] = useState(null);
  const [transferId, setTransferId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const { connected, events, latestEvent, statusSnapshot, clearEvents } = useEventStream();

  // Keep stats synced from WS snapshot
  React.useEffect(() => {
    if (statusSnapshot) {
      if (statusSnapshot.stats) {
        setActiveStats(statusSnapshot.stats);
      }
      setIsRunning(statusSnapshot.is_running || false);
    }
  }, [statusSnapshot]);

  // Also sync from events (for transfer_complete)
  React.useEffect(() => {
    if (latestEvent?.event_type === 'transfer_complete' || latestEvent?.event_type === 'transfer_failed') {
      setIsRunning(false);
      // Refresh result
      if (transferId) {
        fetch(`${API_BASE}/api/transfer/result?transfer_id=${transferId}`)
          .then((r) => r.json())
          .then((data) => {
            if (data?.stats) setActiveStats(data.stats);
          })
          .catch(() => {});
      }
    }
  }, [latestEvent, transferId]);

  const handleStart = useCallback(async ({ customFile, serverFilePath, ...params }) => {
    clearEvents();
    setActiveStats(null);
    setIsRunning(true);

    try {
      const formData = new FormData();
      if (customFile) {
        formData.append('file', customFile);
      }
      const configPayload = {
        server_file_path: customFile ? null : serverFilePath,
        protocol: params.protocol,
        packet_size: params.packetSize,
        timeout: params.timeout,
        adaptive_timeout: params.adaptiveTimeout,
        window_size: params.windowSize,
        max_retries: params.maxRetries,
        simulator: simulatorConfig,
      };
      formData.append('config_json', JSON.stringify(configPayload));

      const resp = await fetch(`${API_BASE}/api/transfer/start`, {
        method: 'POST',
        body: formData,
      });
      const data = await resp.json();
      if (data.transfer_id) {
        setTransferId(data.transfer_id);
      }
    } catch (err) {
      console.error('Transfer start failed:', err);
      setIsRunning(false);
    }
  }, [simulatorConfig, clearEvents]);

  const handleStop = useCallback(async () => {
    await fetch(`${API_BASE}/api/transfer/stop`, { method: 'POST' });
    setIsRunning(false);
  }, []);

  const handleSimulatorChange = useCallback(async (newConfig) => {
    setSimulatorConfig(newConfig);
    try {
      await fetch(`${API_BASE}/api/simulator/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch (e) {}
  }, []);

  return (
    <div className="min-h-screen bg-[#080b11]">
      <Header
        connected={connected}
        activeProtocol={transferConfig.protocol}
        isRunning={isRunning}
      />

      {/* Navigation Tabs */}
      <div className="border-b border-slate-800 bg-[#0d121e]/60 sticky top-[57px] z-30">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400 bg-blue-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {activeTab === 'transfer' && (
          <>
            <TransferControls
              onStart={handleStart}
              onStop={handleStop}
              isRunning={isRunning}
              activeStats={activeStats}
              config={transferConfig}
              setConfig={setTransferConfig}
            />
            <NetworkSimulator
              simulatorConfig={simulatorConfig}
              onConfigChange={handleSimulatorChange}
              activeStats={activeStats}
            />
          </>
        )}

        {activeTab === 'visualizer' && (
          <PacketVisualizer
            activeStats={activeStats}
            latestEvent={latestEvent}
            config={transferConfig}
            events={events}
          />
        )}

        {activeTab === 'stats' && (
          <StatsPanel activeStats={activeStats} statusSnapshot={statusSnapshot} />
        )}

        {activeTab === 'packets' && (
          <PacketTable events={events} />
        )}

        {activeTab === 'integrity' && (
          <IntegrityPanel stats={activeStats} transferId={transferId} />
        )}

        {activeTab === 'events' && (
          <EventLog events={events} onClear={clearEvents} />
        )}

        {activeTab === 'experiments' && (
          <ExperimentsPanel />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-4 mt-8 text-center text-xs text-slate-500">
        Reliable UDP Lab — Computer Networks Mini-Project • Stop-and-Wait | Go-Back-N | Selective Repeat ARQ Protocols
      </footer>
    </div>
  );
}
