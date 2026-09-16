import React from 'react';
import { X, ShieldCheck, Award, Cpu, Globe2, FileCode, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const AboutModal: React.FC = () => {
  const { closeModal } = useApp();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#0f172a] border border-blue-500/30 p-5 shadow-2xl shadow-blue-500/20 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">About GOLDROBO</h3>
              <span className="text-[11px] text-slate-400">Institutional AI Quantification Engine</span>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Company Vision */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-[#1c1a0c] to-[#12192e] border border-amber-500/30 space-y-2">
          <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            GOLDROBO Autonomous Architecture
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed">
            GOLDROBO utilizes high-frequency quantitative algorithms to deliver a stable 3.00% daily profit per trade cycle. The platform supports 1 quantify daily for all members with an automated 40-day investment lifecycle.
          </p>
        </div>

        {/* Key Platform Specifications */}
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
          <span className="font-bold text-amber-300 block">GOLDROBO Operating Rules</span>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Daily Frequency</div>
              <div className="font-bold text-white mt-0.5">1 Quantify / Day</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Daily Profit</div>
              <div className="font-bold text-emerald-400 mt-0.5">3.00% Guaranteed</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Capital Lock</div>
              <div className="font-bold text-amber-300 mt-0.5">40 Days Lock</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Profit Withdraw</div>
              <div className="font-bold text-cyan-300 mt-0.5">Anytime (Min $10)</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Withdraw Fee</div>
              <div className="font-bold text-rose-300 mt-0.5">5% Handling Fee</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">Approval Speed</div>
              <div className="font-bold text-purple-300 mt-0.5">1 Min - 24 Hours</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">L1 Referral Rebate</div>
              <div className="font-bold text-yellow-300 mt-0.5">8% Commission</div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
              <div className="text-slate-400">1st Deposit Bonus</div>
              <div className="font-bold text-emerald-300 mt-0.5">3% Instant Bonus</div>
            </div>
          </div>
        </div>

        {/* Security & Audit Certifications */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-300 block">Security & Audits</span>
          
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">CertiK Security Verified</div>
              <div className="text-[11px] text-slate-400">Smart contract source code verified with zero critical vulnerabilities.</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <Award className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">FinCEN MSB Licensed</div>
              <div className="text-[11px] text-slate-400">Compliant Money Services Business registration No. 31000289419.</div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <Globe2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-xs font-bold text-white">100% Proof of Reserve</div>
              <div className="text-[11px] text-slate-400">All client deposits backed 1:1 with publicly verifiable on-chain multi-sig wallets.</div>
            </div>
          </div>
        </div>

        {/* System Specs */}
        <div className="grid grid-cols-2 gap-2 text-center pt-1 font-mono">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">Engine Speed</div>
            <div className="text-sm font-bold text-cyan-400 mt-0.5">0.038 ms</div>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400">Total Volume</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">$482.5M</div>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={closeModal}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
        >
          Close Information
        </button>

      </div>
    </div>
  );
};
