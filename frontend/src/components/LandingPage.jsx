import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  ArrowUpRight, 
  ShieldCheck, 
  Layers, 
  Gauge, 
  CheckCircle2, 
  AlertTriangle,
  RefreshCw,
  Clock,
  Shuffle
} from 'lucide-react';
import { ScrollReveal, ScrollStagger, ScrollText, ParallaxHeading } from './ScrollAnimations';
import DotsField from './DotsField';

export default function LandingPage({ onEnterLab, onOpenExperiments, onOpenDocs }) {
  const [activeProtoTab, setActiveProtoTab] = useState('saw');
  const [activeFailureTab, setActiveFailureTab] = useState('loss');
  const [previewTab, setPreviewTab] = useState('visualizer');

  const failureDetails = {
    loss: {
      title: 'PACKET LOSS',
      desc: 'Packets dropped by congested routers or physical signal decay. The sender detects absence of ACK via timer expiry and initiates automatic retransmission.',
      icon: AlertTriangle,
      metric: 'Adaptive RTO Trigger'
    },
    corruption: {
      title: 'BIT CORRUPTION',
      desc: 'Electrical noise flips binary bits in transit. The receiver validates the 32-bit CRC checksum, discards corrupted datagrams, and requests a resend.',
      icon: ShieldCheck,
      metric: 'CRC-32 Checksum Rejection'
    },
    delay: {
      title: 'PROPAGATION DELAY',
      desc: 'Geographic distance and queue buffering increase Round Trip Time (RTT). Adaptive timers maintain smooth pacing without premature timeouts.',
      icon: Clock,
      metric: 'EWMA Smoothed RTT'
    },
    jitter: {
      title: 'LATENCY JITTER',
      desc: 'Varying route load causes unpredictable packet arrivals. The system tracks RTT variance (RTTVAR) to dynamically calibrate timeout boundaries.',
      icon: Gauge,
      metric: 'RTT Variance Tracking'
    },
    reordering: {
      title: 'PACKET REORDERING',
      desc: 'Multi-path internet routing causes packet N+1 to arrive before packet N. The sequence numbering buffer reassembles data in exact byte order.',
      icon: Shuffle,
      metric: 'Sequence Number Reassembly'
    }
  };

  return (
    <div className="bg-[#F5F3EE] text-[#141413] selection:bg-[#141413] selection:text-[#F5F3EE] overflow-x-hidden">
      
      {/* ============================================================ */}
      {/* 1. HERO SECTION */}
      {/* ============================================================ */}
      <section className="relative pt-24 pb-28 md:pt-32 md:pb-36 border-b border-[#DCD9D1]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-end">
            
            {/* Left Column: Massive Editorial Typography */}
            <div className="lg:col-span-8">
              <motion.div 
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 mb-8"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-[#141413]"></span>
                <span className="text-xs font-mono font-semibold tracking-widest text-[#626059] uppercase">
                  Computer Networks / Reliable Data Transfer
                </span>
              </motion.div>


              <motion.h1 
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="font-editorial text-5xl sm:text-7xl lg:text-[5.75rem] font-extrabold leading-[0.94] tracking-tighter text-[#141413] mb-10"
              >
                Reliable<br />
                data transfer<br />
                <span className="text-[#969389]">over UDP.</span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-lg sm:text-xl text-[#626059] max-w-2xl font-normal leading-relaxed mb-12"
              >
                A visual laboratory for understanding how reliable communication is built on top of an unreliable transport protocol.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-4"
              >
                <button 
                  onClick={onEnterLab}
                  className="btn-primary flex items-center gap-2 group"
                >
                  <span>Enter the Lab</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
                <button 
                  onClick={onOpenExperiments}
                  className="btn-secondary"
                >
                  View Experiments
                </button>
              </motion.div>
            </div>

            {/* Right Column: Hero Mini Specs */}
            <div className="lg:col-span-4 lg:pl-6 border-t lg:border-t-0 lg:border-l border-[#DCD9D1] pt-8 lg:pt-0">
              <div className="space-y-6">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">Architecture</span>
                  <p className="font-editorial text-base font-semibold text-[#141413]">Client-Server UDP Transport with Sliding Window & CRC-32</p>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">Mechanisms</span>
                  <p className="text-sm text-[#626059]">Sequence Numbers, Cumulative & Selective ACKs, Adaptive RTT/RTO, Loss Recovery</p>
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">Protocols Implemented</span>
                  <div className="flex gap-2 mt-2">
                    <span className="tag-pill">01 SAW</span>
                    <span className="tag-pill">02 GBN</span>
                    <span className="tag-pill">03 SR</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ============================================================ */}
          {/* HERO VISUAL: Minimal Art-Directed Packet Flow Visual */}
          {/* ============================================================ */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="mt-20 pt-12 border-t border-[#DCD9D1]"
          >
            <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-12 shadow-sm">
              <div className="flex items-center justify-between mb-8 pb-6 border-b border-[#ECE9E2]">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-bold tracking-widest uppercase text-[#141413]">Interactive Transmission Concept</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#141413]"></span>
                  <span className="text-xs font-mono text-[#969389]">Sliding Window Dynamics</span>
                </div>
                <span className="text-xs font-mono text-[#626059] hidden sm:inline">RFC 793 / RFC 6298 Principles</span>
              </div>

              {/* Minimal Packet Flow Diagram */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                
                {/* SENDER */}
                <div className="md:col-span-3 bg-[#F5F3EE] p-6 rounded-xl border border-[#DCD9D1]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-editorial text-xs font-bold tracking-wider uppercase text-[#141413]">SENDER</span>
                    <span className="text-[10px] font-mono text-[#969389]">WINDOW = 4</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {['01', '02', '03', '04'].map((seq, i) => (
                      <div 
                        key={seq}
                        className="h-14 rounded-lg bg-[#141413] text-[#F5F3EE] flex flex-col items-center justify-center font-mono text-xs font-bold"
                      >
                        <span className="text-[9px] text-[#969389] font-normal">SEQ</span>
                        {seq}
                      </div>
                    ))}
                  </div>
                </div>

                {/* UNRELIABLE NETWORK CHANNEL */}
                <div className="md:col-span-6 flex flex-col items-center justify-center px-4 relative py-6">
                  <div className="w-full border-t-2 border-dashed border-[#DCD9D1] relative">
                    {/* Animated moving packet */}
                    <motion.div 
                      animate={{ 
                        x: ['0%', '100%'],
                        opacity: [0, 1, 1, 0]
                      }}
                      transition={{ 
                        duration: 3, 
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="absolute -top-3 w-8 h-6 bg-[#141413] text-[#F5F3EE] rounded flex items-center justify-center font-mono text-[10px] font-bold shadow-md"
                    >
                      PKT
                    </motion.div>

                    {/* Animated moving ACK */}
                    <motion.div 
                      animate={{ 
                        x: ['100%', '0%'],
                        opacity: [0, 1, 1, 0]
                      }}
                      transition={{ 
                        duration: 3, 
                        delay: 1.5,
                        repeat: Infinity, 
                        ease: "easeInOut" 
                      }}
                      className="absolute -bottom-3 w-8 h-6 bg-[#FFFFFF] border border-[#141413] text-[#141413] rounded flex items-center justify-center font-mono text-[10px] font-bold"
                    >
                      ACK
                    </motion.div>
                  </div>

                  <div className="mt-8 text-center">
                    <span className="text-xs font-mono font-bold uppercase tracking-widest text-[#141413] block">
                      UNRELIABLE NETWORK CHANNEL
                    </span>
                    <span className="text-[11px] font-mono text-[#969389] mt-1 block">
                      Stochastic Loss • Bit Flips • Variable Latency • Reordering
                    </span>
                  </div>
                </div>

                {/* RECEIVER */}
                <div className="md:col-span-3 bg-[#F5F3EE] p-6 rounded-xl border border-[#DCD9D1]">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-editorial text-xs font-bold tracking-wider uppercase text-[#141413]">RECEIVER</span>
                    <span className="text-[10px] font-mono text-[#969389]">EXPECT = 01</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {['01', '02', '03', '04'].map((seq, i) => (
                      <div 
                        key={seq}
                        className="h-14 rounded-lg bg-[#ECE9E2] border border-[#DCD9D1] text-[#141413] flex flex-col items-center justify-center font-mono text-xs font-medium"
                      >
                        <span className="text-[9px] text-[#969389]">BUF</span>
                        {seq}
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </motion.div>

        </div>
      </section>


      {/* ============================================================ */}
      {/* 2. EDITORIAL SECTION: Large Typography Statement */}
      {/* ============================================================ */}
      <section className="py-28 md:py-40 border-b border-[#DCD9D1] bg-[#ECE9E2]/60">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            
            <ScrollReveal className="lg:col-span-4" variant="slide-right" threshold={0.2}>
              <span className="text-xs font-mono font-semibold tracking-widest text-[#969389] uppercase block mb-4">
                01 / Transport Philosophy
              </span>
              <p className="text-sm text-[#626059] leading-relaxed">
                Standard UDP sends datagrams without guarantees. If a router queue overflows, datagrams vanish silently. Reliability must be engineered at the application layer.
              </p>
            </ScrollReveal>

            <div className="lg:col-span-8 lg:pl-12">
              <div className="space-y-4">
                <ParallaxHeading speed={0.08}>
                  <ScrollReveal variant="slide-up" delay={0} threshold={0.15}>
                    <h2 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter text-[#141413]">
                      UDP is fast.
                    </h2>
                  </ScrollReveal>
                </ParallaxHeading>
                <ParallaxHeading speed={0.12}>
                  <ScrollReveal variant="slide-up" delay={80} threshold={0.15}>
                    <h2 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter text-[#626059]">
                      UDP is simple.
                    </h2>
                  </ScrollReveal>
                </ParallaxHeading>
                <ParallaxHeading speed={0.16}>
                  <ScrollReveal variant="slide-up" delay={160} threshold={0.15}>
                    <h2 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter text-[#969389]">
                      UDP is unreliable.
                    </h2>
                  </ScrollReveal>
                </ParallaxHeading>
              </div>

              <ScrollReveal className="mt-12 pt-12 border-t border-[#DCD9D1] max-w-2xl" variant="fade" delay={200} threshold={0.2}>
                <p className="font-editorial text-2xl sm:text-3xl font-medium text-[#141413] leading-snug">
                  <ScrollText
                    text="Reliable UDP Lab adds the mechanisms needed to make data transfer reliable."
                    splitBy="word"
                  />
                </p>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>


      {/* ============================================================ */}
      {/* 3. PROTOCOL SECTION: Editorial Scrolling Breakdown */}
      {/* ============================================================ */}
      <section className="py-28 md:py-36 border-b border-[#DCD9D1]">
        <div className="max-w-7xl mx-auto px-6">
          
          <ScrollReveal className="flex flex-col md:flex-row md:items-end justify-between mb-20" variant="slide-up" threshold={0.1}>
            <div>
              <span className="text-xs font-mono font-semibold tracking-widest text-[#969389] uppercase block mb-2">
                02 / Core Protocols
              </span>
              <h2 className="font-editorial text-4xl sm:text-5xl font-extrabold tracking-tight text-[#141413]">
                Three foundations of reliable transport.
              </h2>
            </div>
            <p className="text-sm text-[#626059] mt-4 md:mt-0 max-w-xs">
              Explore how protocol complexity trades memory and logic for line throughput.
            </p>
          </ScrollReveal>

          <div className="space-y-16">
            
            {/* Protocol 01: Stop-and-Wait */}
            <ScrollReveal variant="slide-up" delay={0} threshold={0.1}>
            <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-14 transition-all hover:border-[#141413]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5">
                  <span className="font-mono text-4xl sm:text-5xl font-extrabold text-[#969389] block mb-4">
                    01
                  </span>
                  <h3 className="font-editorial text-3xl font-extrabold tracking-tight text-[#141413] mb-4">
                    STOP-AND-WAIT
                  </h3>
                  <div className="space-y-1 font-editorial text-lg text-[#626059] mb-6">
                    <p>One packet.</p>
                    <p>One acknowledgement.</p>
                    <p>One decision at a time.</p>
                  </div>
                  <p className="text-sm text-[#626059] leading-relaxed mb-6">
                    The sender transmits a single packet and pauses all activity until the receiver confirms delivery or the retransmission timer expires. Perfect simplicity with minimal link utilization.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="tag-pill">Window = 1</span>
                    <span className="tag-pill">Zero Buffer Overhead</span>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#F5F3EE] p-8 rounded-xl border border-[#DCD9D1]">
                  <div className="flex items-center justify-between text-xs font-mono text-[#969389] mb-6 pb-2 border-b border-[#DCD9D1]">
                    <span>TRANSMISSION CYCLE</span>
                    <span>RTT DEPENDENCY: HIGH</span>
                  </div>
                  <div className="flex items-center justify-around py-4">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl bg-[#141413] text-[#F5F3EE] flex items-center justify-center font-mono font-bold text-sm mx-auto mb-2">
                        PKT 0
                      </div>
                      <span className="text-[11px] font-mono text-[#626059]">Transmit</span>
                    </div>
                    <div className="flex-1 px-4 text-center">
                      <div className="border-t border-[#141413] relative my-2">
                        <ArrowRight className="w-4 h-4 text-[#141413] absolute -top-2 right-0" />
                      </div>
                      <span className="text-[10px] font-mono text-[#969389]">Wait 1 RTT</span>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl bg-[#ECE9E2] border border-[#141413] text-[#141413] flex items-center justify-center font-mono font-bold text-sm mx-auto mb-2">
                        ACK 0
                      </div>
                      <span className="text-[11px] font-mono text-[#626059]">Confirm</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* Protocol 02: Go-Back-N */}
            <ScrollReveal variant="slide-up" delay={0} threshold={0.1}>
            <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-14 transition-all hover:border-[#141413]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5">
                  <span className="font-mono text-4xl sm:text-5xl font-extrabold text-[#969389] block mb-4">
                    02
                  </span>
                  <h3 className="font-editorial text-3xl font-extrabold tracking-tight text-[#141413] mb-4">
                    GO-BACK-N
                  </h3>
                  <div className="space-y-1 font-editorial text-lg text-[#626059] mb-6">
                    <p>Sliding window.</p>
                    <p>Cumulative acknowledgement.</p>
                    <p>Retransmission.</p>
                  </div>
                  <p className="text-sm text-[#626059] leading-relaxed mb-6">
                    Allows up to N unacknowledged packets in flight. If a single packet is lost, the sender rewinds and retransmits all packets starting from the oldest unacknowledged sequence number.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="tag-pill">Pipelined Window</span>
                    <span className="tag-pill">Cumulative ACK</span>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#F5F3EE] p-8 rounded-xl border border-[#DCD9D1]">
                  <div className="flex items-center justify-between text-xs font-mono text-[#969389] mb-6 pb-2 border-b border-[#DCD9D1]">
                    <span>SLIDING WINDOW: [ BASE = 2, NEXT = 6 ]</span>
                    <span>WINDOW SIZE = 4</span>
                  </div>
                  <div className="grid grid-cols-6 gap-2 py-3">
                    <div className="p-3 bg-[#E4E0D6] border border-[#DCD9D1] rounded text-center">
                      <span className="text-[9px] font-mono block text-[#969389]">ACKED</span>
                      <span className="font-mono text-xs font-bold text-[#626059]">00</span>
                    </div>
                    <div className="p-3 bg-[#E4E0D6] border border-[#DCD9D1] rounded text-center">
                      <span className="text-[9px] font-mono block text-[#969389]">ACKED</span>
                      <span className="font-mono text-xs font-bold text-[#626059]">01</span>
                    </div>
                    <div className="p-3 bg-[#141413] text-[#F5F3EE] rounded text-center ring-2 ring-[#141413] ring-offset-2">
                      <span className="text-[9px] font-mono block text-[#969389]">BASE</span>
                      <span className="font-mono text-xs font-bold">02</span>
                    </div>
                    <div className="p-3 bg-[#141413] text-[#F5F3EE] rounded text-center">
                      <span className="text-[9px] font-mono block text-[#969389]">SENT</span>
                      <span className="font-mono text-xs font-bold">03</span>
                    </div>
                    <div className="p-3 bg-[#141413] text-[#F5F3EE] rounded text-center">
                      <span className="text-[9px] font-mono block text-[#969389]">SENT</span>
                      <span className="font-mono text-xs font-bold">04</span>
                    </div>
                    <div className="p-3 bg-[#ECE9E2] border border-dashed border-[#141413] rounded text-center">
                      <span className="text-[9px] font-mono block text-[#969389]">NEXT</span>
                      <span className="font-mono text-xs font-bold text-[#141413]">05</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* Protocol 03: Selective Repeat */}
            <ScrollReveal variant="slide-up" delay={0} threshold={0.1}>
            <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-14 transition-all hover:border-[#141413]">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-5">
                  <span className="font-mono text-4xl sm:text-5xl font-extrabold text-[#969389] block mb-4">
                    03
                  </span>
                  <h3 className="font-editorial text-3xl font-extrabold tracking-tight text-[#141413] mb-4">
                    SELECTIVE REPEAT
                  </h3>
                  <div className="space-y-1 font-editorial text-lg text-[#626059] mb-6">
                    <p>Selective recovery.</p>
                    <p>Individual acknowledgements.</p>
                    <p>Receiver buffering.</p>
                  </div>
                  <p className="text-sm text-[#626059] leading-relaxed mb-6">
                    The sender maintains individual timers for each unacknowledged packet and only retransmits specifically dropped packets. The receiver buffers out-of-order packets until missing datagrams arrive.
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="tag-pill">Optimal Bandwidth</span>
                    <span className="tag-pill">Dual Buffering</span>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-[#F5F3EE] p-8 rounded-xl border border-[#DCD9D1]">
                  <div className="flex items-center justify-between text-xs font-mono text-[#969389] mb-6 pb-2 border-b border-[#DCD9D1]">
                    <span>SELECTIVE ACK STATE</span>
                    <span>ISOLATED RETRANSMISSION</span>
                  </div>
                  <div className="grid grid-cols-4 gap-3 py-3">
                    <div className="p-4 bg-[#E4E0D6] rounded text-center">
                      <span className="text-[10px] font-mono text-[#626059] block">ACKED</span>
                      <span className="font-mono text-sm font-bold text-[#141413]">PKT 04</span>
                    </div>
                    <div className="p-4 bg-[#FFFFFF] border-2 border-[#141413] rounded text-center">
                      <span className="text-[10px] font-mono text-[#141413] font-bold block">LOST (RESEND)</span>
                      <span className="font-mono text-sm font-bold text-[#141413]">PKT 05</span>
                    </div>
                    <div className="p-4 bg-[#E4E0D6] rounded text-center">
                      <span className="text-[10px] font-mono text-[#626059] block">ACKED</span>
                      <span className="font-mono text-sm font-bold text-[#141413]">PKT 06</span>
                    </div>
                    <div className="p-4 bg-[#E4E0D6] rounded text-center">
                      <span className="text-[10px] font-mono text-[#626059] block">ACKED</span>
                      <span className="font-mono text-sm font-bold text-[#141413]">PKT 07</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </ScrollReveal>

          </div>

        </div>
      </section>


      {/* ============================================================ */}
      {/* 4. NETWORK SIMULATION STORYTELLING SECTION */}
      {/* ============================================================ */}
      <section className="py-28 md:py-36 border-b border-[#DCD9D1] bg-[#ECE9E2]/40">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start" id="network-section">
            
            <ScrollReveal className="lg:col-span-6" variant="slide-right" threshold={0.1}>
              <span className="text-xs font-mono font-semibold tracking-widest text-[#969389] uppercase block mb-4">
                03 / Chaos Engineering
              </span>
              
              <h2 className="font-editorial text-4xl sm:text-6xl font-extrabold tracking-tighter text-[#141413] leading-[1.0] mb-8">
                WHAT HAPPENS<br />
                WHEN THE<br />
                NETWORK FAILS?
              </h2>

              <p className="text-base text-[#626059] leading-relaxed max-w-md mb-8">
                Reliable protocols are defined not by how they perform in pristine conditions, but by how cleanly they recover when real-world network anomalies strike.
              </p>

              {/* Interactive buttons */}
              <div className="flex flex-wrap gap-2">
                {['loss', 'corruption', 'delay', 'jitter', 'reordering'].map((key) => (
                  <button
                    key={key}
                    onClick={() => setActiveFailureTab(key)}
                    className={`px-4 py-2 rounded-full font-mono text-xs uppercase font-bold tracking-wider transition-all ${
                      activeFailureTab === key
                        ? 'bg-[#141413] text-[#F5F3EE]'
                        : 'bg-[#FFFFFF] border border-[#DCD9D1] text-[#626059] hover:border-[#141413]'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
            </ScrollReveal>

            {/* Visual Reveal with Framer Motion */}
            <ScrollReveal className="lg:col-span-6" variant="slide-left" delay={100} threshold={0.1}>
            <div>
              <motion.div 
                key={activeFailureTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-12 shadow-sm"
              >
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#ECE9E2]">
                  <span className="text-xs font-mono font-bold tracking-widest text-[#969389] uppercase">
                    Failure Mechanism Analysis
                  </span>
                  <span className="tag-pill">
                    {failureDetails[activeFailureTab].metric}
                  </span>
                </div>

                <h3 className="font-editorial text-2xl sm:text-3xl font-extrabold text-[#141413] tracking-tight mb-4">
                  {failureDetails[activeFailureTab].title}
                </h3>

                <p className="text-base text-[#626059] leading-relaxed mb-8">
                  {failureDetails[activeFailureTab].desc}
                </p>

                <div className="p-4 rounded-xl bg-[#F5F3EE] border border-[#DCD9D1] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#969389] block uppercase">Simulation Control</span>
                    <span className="text-xs font-mono font-bold text-[#141413]">Fine-grained stochastic injector</span>
                  </div>
                  <button 
                    onClick={onEnterLab}
                    className="text-xs font-mono font-bold text-[#141413] flex items-center gap-1 hover:underline"
                  >
                    <span>Simulate in Lab</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            </div>
            </ScrollReveal>

          </div>

        </div>
      </section>


      {/* ============================================================ */}
      {/* 4.5 INTERACTIVE DOTS FIELD */}
      {/* ============================================================ */}
      <ScrollReveal variant="fade" threshold={0.05}>
        <DotsField />
      </ScrollReveal>


      {/* ============================================================ */}
      {/* 5. PRODUCT PREVIEW: Large Agency-Style Lab Showcase */}
      {/* ============================================================ */}
      <section className="py-28 md:py-36 border-b border-[#DCD9D1]">
        <div className="max-w-7xl mx-auto px-6">
          
          <ScrollReveal className="text-center max-w-3xl mx-auto mb-16" variant="slide-up" threshold={0.1}>
            <span className="text-xs font-mono font-semibold tracking-widest text-[#969389] uppercase block mb-2">
              04 / Complete Workspace
            </span>
            <h2 className="font-editorial text-4xl sm:text-5xl font-extrabold tracking-tight text-[#141413]">
              Engineered for visual clarity.
            </h2>
            <p className="text-base text-[#626059] mt-4">
              Real-time telemetry, live packet dissection, SHA-256 byte integrity, and automated benchmarking.
            </p>
          </ScrollReveal>

          {/* Browser Shell Preview */}
          <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl overflow-hidden shadow-sm">
            
            {/* Window bar */}
            <div className="bg-[#ECE9E2] px-6 py-4 border-b border-[#DCD9D1] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#DCD9D1]"></span>
                <span className="w-3 h-3 rounded-full bg-[#DCD9D1]"></span>
                <span className="w-3 h-3 rounded-full bg-[#DCD9D1]"></span>
              </div>
              <div className="text-xs font-mono text-[#626059] tracking-wider">
                app.reliable-udp.lab / transfer-workspace
              </div>
              <div className="w-12"></div>
            </div>

            {/* Showcase Navigation Bar */}
            <div className="bg-[#F5F3EE] px-6 py-3 border-b border-[#DCD9D1] flex flex-wrap gap-2 items-center justify-between">
              <div className="flex gap-2">
                {[
                  { id: 'transfer', label: 'TRANSFER' },
                  { id: 'visualizer', label: 'VISUALIZER' },
                  { id: 'statistics', label: 'STATISTICS' },
                  { id: 'packets', label: 'PACKETS' },
                  { id: 'integrity', label: 'INTEGRITY' },
                  { id: 'experiments', label: 'EXPERIMENTS' }
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setPreviewTab(t.id)}
                    className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold tracking-wider transition-all ${
                      previewTab === t.id
                        ? 'bg-[#141413] text-[#F5F3EE]'
                        : 'text-[#626059] hover:text-[#141413]'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <span className="text-xs font-mono text-[#969389] hidden md:inline">Interactive Preview Mode</span>
            </div>

            {/* Showcase Content */}
            <div className="p-8 md:p-12 bg-[#FAF9F5]">
              {previewTab === 'visualizer' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-[#141413] uppercase tracking-wider">Sliding Window Live Stream</span>
                    <span className="text-xs font-mono text-[#626059]">Window: 4 | In Flight: 3</span>
                  </div>
                  <div className="grid grid-cols-8 gap-3">
                    {['00 ACK', '01 ACK', '02 ACK', '03 FLY', '04 FLY', '05 FLY', '06 RDY', '07 RDY'].map((p, i) => (
                      <div key={i} className={`p-4 rounded-xl border text-center font-mono text-xs ${
                        p.includes('ACK') ? 'bg-[#ECE9E2] border-[#DCD9D1] text-[#626059]' :
                        p.includes('FLY') ? 'bg-[#141413] text-[#F5F3EE] border-[#141413]' :
                        'bg-[#FFFFFF] border-dashed border-[#DCD9D1] text-[#969389]'
                      }`}>
                        <div className="text-[10px] text-[#969389]">PKT</div>
                        <div className="font-bold mt-1">{p}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewTab === 'statistics' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#DCD9D1]">
                    <span className="text-[11px] font-mono text-[#969389] uppercase tracking-widest block">EFFICIENCY</span>
                    <span className="font-editorial text-4xl font-extrabold text-[#141413] block mt-2">94.2%</span>
                    <span className="text-xs text-[#626059] block mt-1">Bandwidth utilization vs payload</span>
                  </div>
                  <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#DCD9D1]">
                    <span className="text-[11px] font-mono text-[#969389] uppercase tracking-widest block">AVERAGE RTT</span>
                    <span className="font-editorial text-4xl font-extrabold text-[#141413] block mt-2">42 ms</span>
                    <span className="text-xs text-[#626059] block mt-1">Smoothed round-trip latency</span>
                  </div>
                  <div className="bg-[#FFFFFF] p-6 rounded-xl border border-[#DCD9D1]">
                    <span className="text-[11px] font-mono text-[#969389] uppercase tracking-widest block">THROUGHPUT</span>
                    <span className="font-editorial text-4xl font-extrabold text-[#141413] block mt-2">2.4 Mbps</span>
                    <span className="text-xs text-[#626059] block mt-1">Effective application payload rate</span>
                  </div>
                </div>
              )}

              {previewTab === 'integrity' && (
                <div className="bg-[#FFFFFF] p-8 rounded-xl border border-[#DCD9D1] space-y-6">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#141413]">SHA-256 Checksum Validation</span>
                    <span className="tag-pill text-[#141413] font-bold">100% MATCH</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F5F3EE] rounded-lg border border-[#DCD9D1]">
                      <span className="text-[10px] font-mono uppercase text-[#969389] block mb-1">ORIGINAL SHA-256</span>
                      <span className="font-mono text-xs break-all text-[#141413]">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
                    </div>
                    <div className="p-4 bg-[#F5F3EE] rounded-lg border border-[#DCD9D1]">
                      <span className="text-[10px] font-mono uppercase text-[#969389] block mb-1">RECEIVED SHA-256</span>
                      <span className="font-mono text-xs break-all text-[#141413]">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
                    </div>
                  </div>
                </div>
              )}

              {['transfer', 'packets', 'experiments'].includes(previewTab) && (
                <div className="text-center py-8">
                  <p className="font-editorial text-xl font-bold text-[#141413] mb-2">Interactive {previewTab.toUpperCase()} Module</p>
                  <p className="text-sm text-[#626059] mb-6">Fully wired to the live Python backend engine and WebSocket stream.</p>
                  <button onClick={onEnterLab} className="btn-primary text-xs">
                    Launch in Full Lab View
                  </button>
                </div>
              )}
            </div>

          </div>

        </div>
      </section>


      {/* ============================================================ */}
      {/* 6. FINAL CTA SECTION */}
      {/* ============================================================ */}
      <section className="py-28 md:py-40 bg-[#141413] text-[#F5F3EE]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            
            <ScrollReveal variant="fade" threshold={0.1}>
              <span className="text-xs font-mono font-semibold tracking-widest text-[#969389] uppercase block mb-6">
                Interactive Transport Research
              </span>
            </ScrollReveal>

            <ScrollReveal variant="slide-up" delay={100} threshold={0.1}>
              <h2 className="font-editorial text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-[1.0] mb-8">
                Don't just learn<br />
                how reliability works.<br />
                <span className="text-[#969389]">See it happen.</span>
              </h2>
            </ScrollReveal>

            <ScrollReveal variant="slide-up" delay={200} threshold={0.1}>
              <p className="text-lg text-[#AAA59A] max-w-xl mx-auto mb-12">
                Run live file transfers, inject physical network impairments, watch packet sliding windows evolve, and inspect exact byte checksums.
              </p>

              <button
                onClick={onEnterLab}
                className="inline-flex items-center justify-center gap-3 bg-[#F5F3EE] text-[#141413] px-10 py-5 rounded-full font-editorial font-bold text-base tracking-wider uppercase transition-all hover:bg-[#FFFFFF] hover:scale-105 active:scale-100 shadow-xl"
              >
                <span>ENTER THE LAB</span>
                <ArrowUpRight className="w-5 h-5" />
              </button>
            </ScrollReveal>

          </div>
        </div>
      </section>


      {/* ============================================================ */}
      {/* 7. MINIMAL EDITORIAL FOOTER */}
      {/* ============================================================ */}
      <footer className="py-12 border-t border-[#DCD9D1] bg-[#F5F3EE]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-[#141413] flex items-center justify-center text-[#F5F3EE] font-mono text-[10px] font-bold">
              UDP
            </div>
            <span className="font-editorial text-xs font-bold tracking-tight text-[#141413]">
              RELIABLE UDP LAB
            </span>
          </div>

          <div className="flex items-center gap-8 text-xs font-mono text-[#626059]">
            <button onClick={onEnterLab} className="hover:text-[#141413] uppercase">Lab Workspace</button>
            <button onClick={onOpenExperiments} className="hover:text-[#141413] uppercase">Experiments</button>
            <button onClick={onOpenDocs} className="hover:text-[#141413] uppercase">Documentation</button>
          </div>

          <span className="text-xs font-mono text-[#969389]">
            Computer Networks Capstone
          </span>
        </div>
      </footer>

    </div>
  );
}
