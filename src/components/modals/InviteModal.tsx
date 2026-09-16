import React, { useState } from 'react';
import { X, Users, Copy, Check, Share2, Sparkles, Trophy, Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const InviteModal: React.FC = () => {
  const { closeModal, userState } = useApp();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Dynamic live platform URL with user referral code
  const liveOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://goldrobo.io';
  const inviteLink = `${liveOrigin}/?ref=${userState.referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(userState.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#0f172a] border border-amber-500/30 p-5 shadow-2xl shadow-amber-500/10 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Invite & Earn</h3>
              <span className="text-[10px] text-amber-400 font-semibold">GOLDROBO Affiliate</span>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 border border-amber-500/30 text-center space-y-1">
          <div className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Direct Affiliate Matrix</div>
          <h4 className="text-lg font-black text-white">8% Level 1 Commission</h4>
          <p className="text-xs text-slate-300">
            Earn 8% instant commission from every quantification and deposit executed by your direct invitees.
          </p>
        </div>

        {/* Code & Link copy */}
        <div className="space-y-2.5">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Your Referral Code</label>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-base font-mono font-extrabold text-amber-400 tracking-wider">
                {userState.referralCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Invitation Link</label>
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs font-mono text-slate-300 truncate max-w-[200px]">
                {inviteLink}
              </span>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {/* Commission Tiers breakdown */}
        <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-3 space-y-2 font-sans">
          <span className="text-xs font-bold text-slate-300 block">Tier Rebate Matrix</span>
          
          <div className="flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-black flex items-center justify-center text-[10px]">
                L1
              </span>
              <div>
                <span className="text-white font-bold block">Direct Referrals</span>
                <span className="text-[10px] text-amber-300">Highest Reward Tier</span>
              </div>
            </div>
            <span className="font-extrabold text-amber-300 font-mono text-sm">8% Direct</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-[10px]">
                L2
              </span>
              <span className="text-slate-300">Secondary Network</span>
            </div>
            <span className="font-bold text-slate-300 font-mono">3% Rebate</span>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-slate-800/60 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 font-bold flex items-center justify-center text-[10px]">
                L3
              </span>
              <span className="text-slate-300">Indirect Network</span>
            </div>
            <span className="font-bold text-slate-300 font-mono">1% Rebate</span>
          </div>
        </div>

      </div>
    </div>
  );
};
