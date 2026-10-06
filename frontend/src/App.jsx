import React, { useState, useCallback } from 'react';
import './index.css';

import { useEventStream } from './hooks/useEventStream';
import Header from './components/Header';
import LandingPage from './components/LandingPage';
import TransferControls from './components/TransferControls';
import NetworkSimulator from './components/NetworkSimulator';
import PacketVisualizer from './components/PacketVisualizer';
import StatsPanel from './components/StatsPanel';
import PacketTable from './components/PacketTable';
import IntegrityPanel from './components/IntegrityPanel';
import EventLog from './components/EventLog';
import ExperimentsPanel from './components/ExperimentsPanel';
import DocumentationView from './components/DocumentationView';

export default function App() {
  // Main view state: 'landing' | 'lab' | 'experiments' | 'docs'
  const [activeView, setActiveView] = useState('landing');
  
  // Lab subtab state: 'overview' | 'visualizer' | 'statistics' | 'packets' | 'integrity' | 'timeline'
  const [labTab, setLabTab] = useState('overview');

  // WebSocket event stream hook
  const {
    connected,
    events,
    latestEvent,
    statusSnapshot,
    clearEvents,
  } = useEventStream();

  // Transfer configuration
  const [transferConfig, setTransferConfig] = useState({
    protocol: 'saw',
    packetSize: '1024',
    timeout: '1.0',
    adaptiveTimeout: true,
    windowSize: '4',
    maxRetries: '10',
  });

  // Network condition simulation config
  const [simulatorConfig, setSimulatorConfig] = useState({
    loss_rate: 0.0,
    corruption_rate: 0.0,
    delay_ms: 2.0,
    jitter_ms: 0.5,
    duplicate_rate: 0.0,
    reorder_rate: 0.0,
  });

  // Transfer state
  const [activeTransferId, setActiveTransferId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStats, setActiveStats] = useState(null);

  // Update backend network simulation params
  const handleConfigChange = useCallback(async (newConfig) => {
    setSimulatorConfig(newConfig);
    try {
      await fetch('/api/network/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
    } catch (e) {
      console.error('Failed to update network simulator config:', e);
    }
  }, []);

  // Start file transfer
  const handleStartTransfer = useCallback(async (params) => {
    clearEvents();
    setIsRunning(true);
    setActiveStats(null);

    try {
      let res;
      if (params.customFile) {
        const formData = new FormData();
        formData.append('file', params.customFile);
        formData.append('protocol', params.protocol);
        formData.append('packet_size', params.packetSize);
        formData.append('timeout', params.timeout);
        formData.append('adaptive_timeout', params.adaptiveTimeout);
        formData.append('window_size', params.windowSize);
        formData.append('max_retries', params.maxRetries);

        res = await fetch('/api/transfer/start', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/transfer/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            server_file_path: params.serverFilePath,
            protocol: params.protocol,
            packet_size: params.packetSize,
            timeout: params.timeout,
            adaptive_timeout: params.adaptiveTimeout,
            window_size: params.windowSize,
            max_retries: params.maxRetries,
          }),
        });
      }

      const data = await res.json();
      if (data.transfer_id) {
        setActiveTransferId(data.transfer_id);
      }
    } catch (err) {
      console.error('Failed to start transfer:', err);
      setIsRunning(false);
    }
  }, [clearEvents]);

  // Stop file transfer
  const handleStopTransfer = useCallback(async () => {
    try {
      await fetch('/api/transfer/stop', { method: 'POST' });
      setIsRunning(false);
    } catch (e) {
      console.error('Failed to stop transfer:', e);
    }
  }, []);

  // Update active transfer stats from snapshot or latest event
  React.useEffect(() => {
    if (statusSnapshot) {
      if (statusSnapshot.is_running !== undefined) {
        setIsRunning(statusSnapshot.is_running);
      }
      if (statusSnapshot.stats) {
        setActiveStats(statusSnapshot.stats);
      }
      if (statusSnapshot.transfer_id) {
        setActiveTransferId(statusSnapshot.transfer_id);
      }
    }
  }, [statusSnapshot]);

  // Handle transfer completed/failed from event stream
  React.useEffect(() => {
    if (latestEvent) {
      if (latestEvent.event_type === 'transfer_complete') {
        setIsRunning(false);
      } else if (latestEvent.event_type === 'transfer_failed') {
        setIsRunning(false);
      }
    }
  }, [latestEvent]);

  return (
    <div className="min-h-screen bg-[#F5F3EE] text-[#141413] flex flex-col font-sans">
      
      {/* Sticky Header */}
      <Header
        activeView={activeView}
        setActiveView={setActiveView}
        isRunning={isRunning}
        connected={connected}
      />

      {/* Main View Router */}
      <main className="flex-1">
        
        {/* 1. LANDING PAGE VIEW */}
        {activeView === 'landing' && (
          <LandingPage
            onEnterLab={() => setActiveView('lab')}
            onOpenExperiments={() => setActiveView('experiments')}
            onOpenDocs={() => setActiveView('docs')}
          />
        )}

        {/* 2. LAB INTERFACE VIEW */}
        {activeView === 'lab' && (
          <div className="max-w-7xl mx-auto px-6 py-12 space-y-10">
            
            {/* Lab Subnav Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-[#DCD9D1] gap-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
                  Active Environment
                </span>
                <h1 className="font-editorial text-3xl sm:text-4xl font-extrabold tracking-tight text-[#141413]">
                  LAB WORKSPACE
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#ECE9E2] rounded-full border border-[#DCD9D1]">
                {[
                  { id: 'overview', label: 'TRANSFER' },
                  { id: 'visualizer', label: 'VISUALIZER' },
                  { id: 'statistics', label: 'STATISTICS' },
                  { id: 'packets', label: 'PACKETS' },
                  { id: 'integrity', label: 'INTEGRITY' },
                  { id: 'timeline', label: 'TIMELINE' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setLabTab(t.id)}
                    className={`px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase transition-all ${
                      labTab === t.id
                        ? 'bg-[#141413] text-[#F5F3EE] shadow-sm'
                        : 'text-[#626059] hover:text-[#141413]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtab Contents */}
            {labTab === 'overview' && (
              <div className="space-y-10">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-7">
                    <TransferControls
                      onStart={handleStartTransfer}
                      onStop={handleStopTransfer}
                      isRunning={isRunning}
                      activeStats={activeStats}
                      config={transferConfig}
                      setConfig={setTransferConfig}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <NetworkSimulator
                      simulatorConfig={simulatorConfig}
                      onConfigChange={handleConfigChange}
                    />
                  </div>
                </div>

                <PacketVisualizer
                  activeStats={activeStats}
                  latestEvent={latestEvent}
                  config={transferConfig}
                  events={events}
                />

                <StatsPanel
                  activeStats={activeStats}
                  statusSnapshot={statusSnapshot}
                />
              </div>
            )}

            {labTab === 'visualizer' && (
              <div className="space-y-10">
                <PacketVisualizer
                  activeStats={activeStats}
                  latestEvent={latestEvent}
                  config={transferConfig}
                  events={events}
                />
                <NetworkSimulator
                  simulatorConfig={simulatorConfig}
                  onConfigChange={handleConfigChange}
                />
              </div>
            )}

            {labTab === 'statistics' && (
              <StatsPanel
                activeStats={activeStats}
                statusSnapshot={statusSnapshot}
              />
            )}

            {labTab === 'packets' && (
              <PacketTable events={events} />
            )}

            {labTab === 'integrity' && (
              <IntegrityPanel
                stats={activeStats}
                transferId={activeTransferId}
              />
            )}

            {labTab === 'timeline' && (
              <EventLog
                events={events}
                onClear={clearEvents}
              />
            )}

          </div>
        )}

        {/* 3. EXPERIMENTS VIEW */}
        {activeView === 'experiments' && (
          <div className="max-w-7xl mx-auto px-6 py-12">
            <ExperimentsPanel />
          </div>
        )}

        {/* 4. DOCUMENTATION VIEW */}
        {activeView === 'docs' && (
          <div className="max-w-5xl mx-auto px-6 py-12">
            <DocumentationView />
          </div>
        )}

      </main>

    </div>
  );
}
