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

  // Network condition simulation config (defaults to WI-FI matching backend WIFI preset)
  const [simulatorConfig, setSimulatorConfig] = useState({
    loss_rate: 0.02,
    corruption_rate: 0.01,
    delay_ms: 15.0,
    jitter_ms: 5.0,
    duplicate_rate: 0.01,
    reorder_rate: 0.01,
  });

  // Transfer state
  const [activeTransferId, setActiveTransferId] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activeStats, setActiveStats] = useState(null);
  const [transferError, setTransferError] = useState(null);

  // Update backend network simulation params
  const handleConfigChange = useCallback(async (newConfig) => {
    setSimulatorConfig(newConfig);
    try {
      await fetch('/api/simulator/config', {
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
    setTransferError(null);
    clearEvents();

    try {
      const formData = new FormData();
      if (params.customFile) {
        formData.append('file', params.customFile);
      }

      const configPayload = {
        server_file_path: params.customFile ? null : params.serverFilePath,
        protocol: params.protocol,
        packet_size: params.packetSize,
        timeout: params.timeout,
        adaptive_timeout: params.adaptiveTimeout,
        window_size: params.windowSize,
        max_retries: params.maxRetries,
        simulator: simulatorConfig,
      };

      formData.append('config_json', JSON.stringify(configPayload));

      const res = await fetch('/api/transfer/start', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.detail || `Server error (${res.status})`;
        throw new Error(msg);
      }

      const data = await res.json();
      if (data.transfer_id) {
        setActiveTransferId(data.transfer_id);
      }
      setIsRunning(true);
    } catch (err) {
      console.error('Failed to start transfer:', err);
      setIsRunning(false);
      setTransferError(err.message || 'Failed to start transfer');
    }
  }, [clearEvents, simulatorConfig]);

  // Stop file transfer
  const handleStopTransfer = useCallback(async () => {
    try {
      const res = await fetch('/api/transfer/stop', { method: 'POST' });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to stop transfer');
      }
      setIsRunning(false);
    } catch (e) {
      console.error('Failed to stop transfer:', e);
      setTransferError(e.message || 'Failed to stop transfer');
    }
  }, []);

  // Update active transfer stats from snapshot
  React.useEffect(() => {
    if (statusSnapshot) {
      if (statusSnapshot.is_running !== undefined) {
        setIsRunning(statusSnapshot.is_running);
      }
      if (statusSnapshot.stats) {
        setActiveStats((prev) => ({ ...(prev || {}), ...statusSnapshot.stats }));
      }
      if (statusSnapshot.active_transfer_id || statusSnapshot.transfer_id) {
        setActiveTransferId(statusSnapshot.active_transfer_id || statusSnapshot.transfer_id);
      }
    }
  }, [statusSnapshot]);

  // Handle transfer events from WebSocket stream
  React.useEffect(() => {
    if (latestEvent) {
      if (latestEvent.event_type === 'transfer_started') {
        setIsRunning(true);
        setTransferError(null);
        setActiveStats((prev) => ({
          ...(prev || {}),
          status: 'running',
          file_name: latestEvent.details?.filename || prev?.file_name,
          file_size_bytes: latestEvent.details?.file_size || prev?.file_size_bytes,
          total_data_packets: latestEvent.details?.total_packets ?? prev?.total_data_packets,
          original_sha256: latestEvent.details?.sha256_hash || prev?.original_sha256,
          unique_packets_delivered: 0,
          progress_percentage: 0,
        }));
      } else if (latestEvent.event_type === 'transfer_progress') {
        setActiveStats((prev) => ({
          ...(prev || {}),
          progress_percentage: latestEvent.details?.progress ?? prev?.progress_percentage,
          unique_packets_delivered: latestEvent.seq !== undefined && latestEvent.seq !== null ? latestEvent.seq + 1 : prev?.unique_packets_delivered,
        }));
      } else if (latestEvent.event_type === 'transfer_complete') {
        setIsRunning(false);
        if (latestEvent.details) {
          setActiveStats((prev) => ({ ...(prev || {}), ...latestEvent.details, status: 'completed' }));
        }
      } else if (latestEvent.event_type === 'transfer_failed') {
        setIsRunning(false);
        setTransferError(latestEvent.message || 'Transfer failed');
        setActiveStats((prev) => ({ ...(prev || {}), status: 'failed', error_message: latestEvent.message }));
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
                      errorMessage={transferError}
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
