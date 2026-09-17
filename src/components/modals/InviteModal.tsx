import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  Copy, 
  Check, 
  Share2, 
  Sparkles, 
  Award, 
  DollarSign, 
  TrendingUp, 
  UserCheck, 
  Clock, 
  ChevronRight,
  ShieldCheck,
  Layers,
  ListOrdered,
  ArrowUpRight
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { 
  subscribeToUserTeam, 
  subscribeToUserCommissions, 
  TeamStats 
} from '../../utils/referralSystem';
import { ReferralMember, ReferralCommissionLog } from '../../types';

export const InviteModal: React.FC = () => {
  const { closeModal, userState } = useApp();
  const [activeTab, setActiveTab] = useState<'invite' | 'team' | 'commissions'>('invite');
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3>(1);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Real-time team state
  const [teamMembers, setTeamMembers] = useState<ReferralMember[]>([]);
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalTeamSize: userState.teamSize || (userState.l1Referrals + userState.l2Referrals + (userState.l3Referrals || 0)),
    l1Count: userState.l1Referrals,
    l2Count: userState.l2Referrals,
    l3Count: userState.l3Referrals || 0,
    totalTeamRecharge: userState.teamRecharge || 0.00,
    totalCommissionEarned: userState.referralEarnings || 0.00,
    l1Commission: userState.l1Earnings || 0.00,
    l2Commission: userState.l2Earnings || 0.00,
    l3Commission: userState.l3Earnings || 0.00
  });

  // Real-time commissions log
  const [commissions, setCommissions] = useState<ReferralCommissionLog[]>([]);

  // The user's username IS their referral code!
  const emailPrefix = userState.email ? userState.email.split('@')[0] : '';
  const cleanUsername = (userState.username && !userState.username.toUpperCase().startsWith('GOLD')) ? userState.username : '';
  const myReferralCode = cleanUsername || emailPrefix || (userState.referralCode && !userState.referralCode.toUpperCase().startsWith('GOLD') ? userState.referralCode : 'trader');
  const liveOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://goldrobo.io';
  const inviteLink = `${liveOrigin}/?ref=${encodeURIComponent(myReferralCode)}`;

  // Subscribe to real-time team updates
  useEffect(() => {
    if (!userState.uid) return;
    const unsubTeam = subscribeToUserTeam(userState.uid, (members, stats) => {
      setTeamMembers(members);
      setTeamStats(stats);
    });

    const unsubComm = subscribeToUserCommissions(userState.uid, (logs) => {
      setCommissions(logs);
    });

    return () => {
      unsubTeam();
      unsubComm();
    };
  }, [userState.uid]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(myReferralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filter members by selected level
  const filteredMembers = teamMembers.filter(m => m.level === selectedLevel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md rounded-3xl bg-[#0b1120] border border-amber-500/40 p-4 sm:p-5 shadow-2xl shadow-amber-500/10 space-y-4 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/90 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-inner">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide flex items-center gap-1.5">
                <span>Affiliate & Team Center</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                  Live Synced
                </span>
              </h3>
              <p className="text-[10px] text-amber-400/90 font-medium">
                Username-Linked • Real-Time 3-Tier Multi-Level Tracking
              </p>
            </div>
          </div>
          <button
            id="close-invite-modal"
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/90 text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-slate-700/50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Main Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('invite')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'invite'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Share2 className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Invite & Link</span>
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'team'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Team Tracking</span>
            {teamStats.totalTeamSize > 0 && (
              <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono font-black ${
                activeTab === 'team' ? 'bg-slate-950 text-amber-400' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {teamStats.totalTeamSize}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('commissions')}
            className={`py-2 px-1 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'commissions'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Commissions</span>
          </button>
        </div>

        {/* TAB 1: INVITE & CODE */}
        {activeTab === 'invite' && (
          <div className="space-y-3.5 overflow-y-auto pr-1">
            {/* Username as Referral Code Callout */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border border-amber-500/30 text-center space-y-1 shadow-sm">
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Username Is Your Referral Code
              </div>
              <h4 className="text-sm sm:text-base font-black text-white">Share Your Username To Earn</h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                When new traders sign up using your username as sponsor, they are automatically linked to your Level 1 team with instant lifetime commissions!
              </p>
            </div>

            {/* Code & Link copy cards */}
            <div className="space-y-2.5">
              {/* Referral Code (Username) */}
              <div>
                <label className="text-xs text-slate-300 font-semibold flex items-center justify-between mb-1">
                  <span>Your Referral Username (Inviter ID)</span>
                  <span className="text-[10px] text-amber-400 font-mono font-bold">1-Click Share</span>
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#070b14] border border-amber-500/30">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="text-amber-500/70 font-mono font-bold text-sm">@</span>
                    <span className="text-base sm:text-lg font-mono font-extrabold text-amber-400 tracking-wider truncate">
                      {myReferralCode}
                    </span>
                  </div>
                  <button
                    id="copy-referral-code-btn"
                    onClick={handleCopyCode}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 active:scale-95 shrink-0"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied!' : 'Copy Username'}</span>
                  </button>
                </div>
              </div>

              {/* Referral URL */}
              <div>
                <label className="text-xs text-slate-300 font-semibold flex items-center justify-between mb-1">
                  <span>Direct Invitation Link</span>
                  <span className="text-[10px] text-slate-400 font-mono">Auto-fills Sponsor</span>
                </label>
                <div className="flex items-center justify-between p-2.5 rounded-2xl bg-[#070b14] border border-slate-800">
                  <span className="text-xs font-mono text-slate-300 truncate max-w-[210px]">
                    {inviteLink}
                  </span>
                  <button
                    id="copy-referral-link-btn"
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 3-Tier Commission Schedule */}
            <div className="rounded-2xl bg-[#070b14] border border-slate-800 p-3.5 space-y-2.5">
              <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-400" />
                Multi-Level Commission Structure
              </span>

              {/* Level 1 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs shadow-md">
                    L1
                  </span>
                  <div>
                    <span className="text-white font-bold block text-xs">Level 1 (Direct Referrals)</span>
                    <span className="text-[10px] text-amber-300 font-mono">10% Deposit Rebate • 8% Quantify Profit</span>
                  </div>
                </div>
                <span className="font-black text-amber-400 font-mono text-sm">10% / 8%</span>
              </div>

              {/* Level 2 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-slate-700 text-slate-200 font-black flex items-center justify-center text-xs">
                    L2
                  </span>
                  <div>
                    <span className="text-slate-200 font-bold block text-xs">Level 2 (Secondary Referrals)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Members invited by your L1 team</span>
                  </div>
                </div>
                <span className="font-black text-slate-300 font-mono text-sm">3% Rebate</span>
              </div>

              {/* Level 3 */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/50 border border-slate-800 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-slate-700 text-slate-200 font-black flex items-center justify-center text-xs">
                    L3
                  </span>
                  <div>
                    <span className="text-slate-200 font-bold block text-xs">Level 3 (Indirect Referrals)</span>
                    <span className="text-[10px] text-slate-400 font-mono">Members invited by your L2 team</span>
                  </div>
                </div>
                <span className="font-black text-slate-300 font-mono text-sm">1% Rebate</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: REAL-TIME TEAM TRACKING */}
        {activeTab === 'team' && (
          <div className="space-y-3.5 overflow-y-auto pr-1">
            {/* Real-time Team Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-2xl bg-[#070b14] border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Total Members</span>
                <span className="text-base sm:text-lg font-black text-white font-mono mt-0.5 block">
                  {teamStats.totalTeamSize}
                </span>
                <span className="text-[9px] text-amber-400 font-semibold">L1+L2+L3</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#070b14] border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Team Deposit</span>
                <span className="text-base sm:text-lg font-black text-emerald-400 font-mono mt-0.5 block">
                  ${teamStats.totalTeamRecharge.toFixed(2)}
                </span>
                <span className="text-[9px] text-emerald-400/80 font-semibold">USDT Total</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#070b14] border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-medium">Your Commission</span>
                <span className="text-base sm:text-lg font-black text-amber-400 font-mono mt-0.5 block">
                  ${teamStats.totalCommissionEarned.toFixed(2)}
                </span>
                <span className="text-[9px] text-amber-400/80 font-semibold">Earned</span>
              </div>
            </div>

            {/* Level Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-slate-800">
              <button
                onClick={() => setSelectedLevel(1)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  selectedLevel === 1
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Level 1</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/20 font-black">
                  {teamStats.l1Count}
                </span>
              </button>

              <button
                onClick={() => setSelectedLevel(2)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  selectedLevel === 2
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Level 2</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/20 font-black">
                  {teamStats.l2Count}
                </span>
              </button>

              <button
                onClick={() => setSelectedLevel(3)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  selectedLevel === 3
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Level 3</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-950/20 font-black">
                  {teamStats.l3Count}
                </span>
              </button>
            </div>

            {/* Level Description Bar */}
            <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
              <span>
                {selectedLevel === 1 && 'Level 1: Direct Invitees (10% Deposit Rebate • 8% Quantify)'}
                {selectedLevel === 2 && 'Level 2: Secondary Network (3% Rebate)'}
                {selectedLevel === 3 && 'Level 3: Indirect Network (1% Rebate)'}
              </span>
              <span className="text-amber-400 font-mono font-bold">
                {filteredMembers.length} Member{filteredMembers.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Real-time Member List */}
            <div className="space-y-2">
              {filteredMembers.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#070b14] border border-slate-800 text-center space-y-2">
                  <UserCheck className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-300 font-medium">
                    No Level {selectedLevel} members yet.
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    {selectedLevel === 1 
                      ? 'Share your username or invite link with friends to start building your Level 1 direct team.'
                      : 'When your Level ' + (selectedLevel - 1) + ' members invite traders, they will automatically appear here in real time.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('invite')}
                    className="mt-1 px-4 py-1.5 rounded-xl bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold border border-amber-500/40 inline-flex items-center gap-1 transition-all"
                  >
                    <span>Share My Code</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                filteredMembers.map((member) => (
                  <div 
                    key={member.id}
                    className="p-3 rounded-2xl bg-[#070b14] border border-slate-800/90 hover:border-slate-700 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 text-amber-400 font-black flex items-center justify-center text-xs font-mono shrink-0 border border-slate-700">
                        {member.memberUsername ? member.memberUsername.slice(0, 2).toUpperCase() : 'TR'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate font-mono">
                            @{member.memberUsername}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono shrink-0">
                            VIP {member.vipLevel || 1}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                          <span>Joined: {new Date(member.joinedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          {member.level > 1 && member.directInviterUsername && (
                            <span className="text-slate-500">via @{member.directInviterUsername}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-white">
                        ${(member.totalDeposit || 0).toFixed(2)} <span className="text-[10px] text-slate-400">USDT</span>
                      </div>
                      <div className="text-[10px] font-mono font-bold text-emerald-400 mt-0.5">
                        +${(member.commissionEarned || 0).toFixed(2)} earned
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: COMMISSION LEDGER */}
        {activeTab === 'commissions' && (
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs px-1 text-slate-400">
              <span>Real-Time Commission History</span>
              <span className="text-amber-400 font-mono font-bold">
                Total: ${teamStats.totalCommissionEarned.toFixed(2)} USDT
              </span>
            </div>

            {commissions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-[#070b14] border border-slate-800 text-center space-y-2">
                <DollarSign className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-300 font-medium">
                  No commission records yet.
                </p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  When members of your Level 1, 2, or 3 team deposit or execute quantifications, your rebate commissions will be automatically credited and logged here!
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {commissions.map((comm) => (
                  <div 
                    key={comm.id}
                    className="p-3 rounded-2xl bg-[#070b14] border border-slate-800/90 hover:border-slate-700 transition-colors flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white font-mono">
                          +{comm.commissionAmount.toFixed(4)} USDT
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
                          Level {comm.level} ({comm.percent}%)
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        From <span className="text-amber-300 font-semibold">@{comm.fromUsername}</span> • {comm.type.replace('_', ' ').toUpperCase()}
                      </div>
                      <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                        {comm.dateStr} {comm.timeStr} • Principal: ${comm.sourceAmount.toFixed(2)} USDT
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                        Credited
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer Security Note */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono shrink-0">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cryptographically Verified Uplines</span>
          </span>
          <span className="text-amber-400 font-bold">VIP Liquidity Node</span>
        </div>

      </div>
    </div>
  );
};
