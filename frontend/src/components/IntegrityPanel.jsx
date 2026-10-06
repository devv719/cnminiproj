import React from 'react';
import { Download, CheckCircle2, AlertCircle } from 'lucide-react';

export default function IntegrityPanel({ stats, transferId }) {
  const verified = stats?.verified;
  const originalHash = stats?.original_sha256 || '';
  const reconstructedHash = stats?.reconstructed_sha256 || '';
  const hasResult = originalHash.length > 0;
  const filename = stats?.file_name || 'payload.bin';
  const fileSize = stats?.file_size_bytes || 0;

  const handleDownload = () => {
    if (!transferId) return;
    window.open(`http://localhost:8000/api/download/${transferId}`, '_blank');
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#DCD9D1] rounded-2xl p-8 md:p-12 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-[#ECE9E2] mb-10">
        <div>
          <span className="text-[11px] font-mono uppercase tracking-widest text-[#969389] block mb-1">
            Cryptographic Proof
          </span>
          <h2 className="font-editorial text-2xl font-extrabold tracking-tight text-[#141413]">
            DATA INTEGRITY
          </h2>
        </div>
        <span className="tag-pill">
          SHA-256 HASH CHECK
        </span>
      </div>

      {!hasResult ? (
        <div className="text-center py-16 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
          <p className="font-editorial text-lg font-bold text-[#141413] mb-1">
            Awaiting Completed Transfer
          </p>
          <p className="text-xs font-mono text-[#626059]">
            SHA-256 hashes will be computed and verified upon transfer completion.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* Editorial Hash Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-center">
            
            {/* ORIGINAL */}
            <div className="lg:col-span-5 p-6 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#969389] block mb-2">
                ORIGINAL
              </span>
              <span className="text-[10px] font-mono uppercase text-[#626059] block mb-2">
                SHA-256 DIGEST
              </span>
              <div className="font-mono text-xs break-all text-[#141413] font-semibold bg-[#FFFFFF] p-4 rounded-lg border border-[#DCD9D1] leading-relaxed">
                {originalHash}
              </div>
            </div>

            {/* VS */}
            <div className="lg:col-span-1 text-center font-editorial text-xl font-extrabold text-[#969389]">
              VS
            </div>

            {/* RECEIVED */}
            <div className="lg:col-span-5 p-6 bg-[#F5F3EE] rounded-xl border border-[#DCD9D1]">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-[#969389] block mb-2">
                RECEIVED
              </span>
              <span className="text-[10px] font-mono uppercase text-[#626059] block mb-2">
                SHA-256 DIGEST
              </span>
              <div className="font-mono text-xs break-all text-[#141413] font-semibold bg-[#FFFFFF] p-4 rounded-lg border border-[#DCD9D1] leading-relaxed">
                {reconstructedHash}
              </div>
            </div>

          </div>

          {/* Verdict Banner */}
          <div className={`p-8 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${
            verified
              ? 'bg-[#ECE9E2] border-[#DCD9D1]'
              : 'bg-red-50 border-red-300'
          }`}>
            <div>
              <div className="flex items-center gap-2 mb-1">
                {verified ? (
                  <CheckCircle2 className="w-5 h-5 text-[#141413]" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <span className="font-editorial text-2xl font-extrabold tracking-tight text-[#141413]">
                  {verified ? 'INTEGRITY VERIFIED' : 'CHECKSUM MISMATCH'}
                </span>
              </div>
              <p className="text-xs font-mono text-[#626059] mt-1">
                {verified
                  ? `File '${filename}' (${(fileSize / 1024).toFixed(1)} KB) bitstream transferred with 100% byte fidelity.`
                  : 'Reconstructed file bits differ from original. Data corrupted.'}
              </p>
            </div>

            {verified && (
              <button
                onClick={handleDownload}
                className="btn-primary text-xs py-3 px-6 whitespace-nowrap self-start sm:self-center"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Verified File</span>
              </button>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
