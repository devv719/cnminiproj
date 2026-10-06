import React from 'react';
import { ShieldCheck, XCircle, Download, Hash } from 'lucide-react';

export default function IntegrityPanel({ stats, transferId }) {
  const verified = stats?.verified;
  const originalHash = stats?.original_sha256 || '';
  const reconstructedHash = stats?.reconstructed_sha256 || '';
  const hasResult = originalHash.length > 0;
  const filename = stats?.file_name || 'unknown';
  const fileSize = stats?.file_size_bytes || 0;

  const handleDownload = () => {
    if (!transferId) return;
    window.open(`http://localhost:8000/api/download/${transferId}`, '_blank');
  };

  return (
    <div className="glass-panel rounded-2xl p-5 shadow-xl border border-slate-800/80">
      <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-slate-800/60">
        <ShieldCheck className="w-5 h-5 text-emerald-400" />
        <h2 className="text-base font-bold text-white tracking-wide">File Integrity Verification (SHA-256)</h2>
      </div>

      {!hasResult ? (
        <div className="text-center py-8 text-slate-500 text-xs">
          No transfer completed yet. SHA-256 integrity results will appear after transfer.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Big Status Badge */}
          <div className={`flex items-center justify-center gap-4 py-6 rounded-2xl ${
            verified
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-rose-500/10 border border-rose-500/30'
          }`}>
            {verified ? (
              <ShieldCheck className="w-12 h-12 text-emerald-400" />
            ) : (
              <XCircle className="w-12 h-12 text-rose-400" />
            )}
            <div>
              <p className={`text-2xl font-black tracking-tight ${verified ? 'text-emerald-300' : 'text-rose-300'}`}>
                {verified ? '✓ INTEGRITY VERIFIED' : '✗ CHECKSUM MISMATCH'}
              </p>
              <p className="text-sm text-slate-400 mt-0.5">
                {verified
                  ? `File '${filename}' (${(fileSize / 1024).toFixed(1)} KB) transferred without data corruption.`
                  : 'Reconstructed file data does not match original file.'}
              </p>
            </div>
          </div>

          {/* SHA-256 Hashes */}
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/60 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 mb-1.5">
                <Hash className="w-3.5 h-3.5" />
                Original File SHA-256
              </div>
              <code className="text-xs font-mono text-blue-300 break-all leading-relaxed">
                {originalHash || '—'}
              </code>
            </div>

            <div className={`p-3.5 rounded-xl border space-y-1 ${
              verified
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-rose-500/5 border-rose-500/20'
            }`}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold mb-1.5 ${
                verified ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                <Hash className="w-3.5 h-3.5" />
                Reconstructed File SHA-256
              </div>
              <code className={`text-xs font-mono break-all leading-relaxed ${
                verified ? 'text-emerald-300' : 'text-rose-300'
              }`}>
                {reconstructedHash || '—'}
              </code>
            </div>
          </div>

          {/* Download Button */}
          {verified && (
            <button
              onClick={handleDownload}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              <Download className="w-4 h-4" />
              Download Verified File ({filename})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
