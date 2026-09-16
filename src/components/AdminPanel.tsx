import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  LogOut, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  Search, 
  Filter, 
  RefreshCw, 
  Copy, 
  Check, 
  DollarSign, 
  ExternalLink,
  Shield,
  Layers,
  Users,
  Wallet
} from 'lucide-react';
import { 
  ADMIN_CREDENTIALS, 
  isAdminAuthenticated, 
  setAdminAuthenticated, 
  getAllSystemTransactions, 
  updateSystemTransactionStatus, 
  SystemTransaction 
} from '../utils/adminTransactions';
import { CoinLogo } from './CoinLogo';

interface AdminPanelProps {
  onExit: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onExit }) => {
  const [authenticated, setAuthenticated] = useState<boolean>(isAdminAuthenticated());
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Transactions State
  const [transactions, setTransactions] = useState<SystemTransaction[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'Pending' | 'Completed' | 'Rejected'>('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Rejection Modal State
  const [rejectModalTx, setRejectModalTx] = useState<SystemTransaction | null>(null);
  const [rejectReason, setRejectReason] = useState('Invalid TXID or transfer not detected on blockchain.');

  // Load transactions
  const loadTransactions = () => {
    const list = getAllSystemTransactions();
    setTransactions(list);
  };

  useEffect(() => {
    if (authenticated) {
      loadTransactions();
      const interval = setInterval(loadTransactions, 3000);

      const handleUpdate = () => loadTransactions();
      window.addEventListener('goldrobo_system_tx_updated', handleUpdate);
      window.addEventListener('storage', handleUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('goldrobo_system_tx_updated', handleUpdate);
        window.removeEventListener('storage', handleUpdate);
      };
    }
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');

    setTimeout(() => {
      const emailTrim = loginEmail.trim().toLowerCase();
      const passTrim = loginPassword.trim();

      if (emailTrim === ADMIN_CREDENTIALS.email.toLowerCase() && passTrim === ADMIN_CREDENTIALS.password) {
        setAdminAuthenticated(true);
        setAuthenticated(true);
      } else {
        setLoginError('Access denied: Invalid administrator email or password.');
      }
      setLoading(false);
    }, 400);
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    setAuthenticated(false);
    setLoginEmail('');
    setLoginPassword('');
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = (tx: SystemTransaction) => {
    const res = updateSystemTransactionStatus(tx.id, 'Completed', 'Approved & Credited by Admin salim@gmail.com');
    if (res) {
      // Also update local user state if this user is active in current browser
      try {
        const rawUser = localStorage.getItem('goldrobo_user_state');
        if (rawUser) {
          const user = JSON.parse(rawUser);
          if (user.uid === tx.userUid || user.email === tx.userEmail) {
            if (tx.type === 'deposit') {
              const amount = tx.profitAmount || tx.amount || 0;
              const isFirstDeposit = !user.hasReceivedFirstDepositBonus && !user.canClaimFirstDepositBonus;
              const bonusAmount = isFirstDeposit ? +(amount * 0.03).toFixed(2) : 0;
              const newTotal = +(user.totalBalance + amount).toFixed(2);
              const newLocked = +(user.lockedInvestment + amount).toFixed(2);

              const shouldUnlockVip1 = (user.vipLevel === 0 || !user.vipLevel) && newTotal >= 10;
              const updatedUser = {
                ...user,
                totalBalance: newTotal,
                lockedInvestment: newLocked,
                vipLevel: shouldUnlockVip1 ? 1 : user.vipLevel,
                dailyEarningRate: shouldUnlockVip1 ? 3.0 : user.dailyEarningRate,
                canClaimFirstDepositBonus: isFirstDeposit,
                firstDepositBonusAmount: isFirstDeposit ? bonusAmount : user.firstDepositBonusAmount,
                lockStartDate: user.lockStartDate || new Date().toISOString().split('T')[0]
              };
              localStorage.setItem('goldrobo_user_state', JSON.stringify(updatedUser));
            }
          }
        }
      } catch {}

      loadTransactions();
      const actionText = tx.type === 'deposit' ? `+$${(tx.profitAmount || tx.amount || 0).toFixed(2)} USDT credited` : `payout sent`;
      setActionSuccessMsg(`Transaction ${tx.orderId || tx.id} successfully APPROVED (${actionText}).`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  const handleConfirmReject = () => {
    if (!rejectModalTx) return;
    const res = updateSystemTransactionStatus(rejectModalTx.id, 'Rejected', rejectReason);
    if (res) {
      // If a withdrawal was rejected, refund the user's balance in localStorage as well
      try {
        if (rejectModalTx.type === 'withdraw') {
          const rawUser = localStorage.getItem('goldrobo_user_state');
          if (rawUser) {
            const user = JSON.parse(rawUser);
            if (user.uid === rejectModalTx.userUid || user.email === rejectModalTx.userEmail) {
              const refundAmount = Math.abs(rejectModalTx.profitAmount || rejectModalTx.amount || 0);
              const updatedUser = {
                ...user,
                totalBalance: +(user.totalBalance + refundAmount).toFixed(2),
                withdrawableBalance: +(user.withdrawableBalance + refundAmount).toFixed(2)
              };
              localStorage.setItem('goldrobo_user_state', JSON.stringify(updatedUser));
            }
          }
        }
      } catch {}

      loadTransactions();
      setActionSuccessMsg(`Transaction ${rejectModalTx.orderId || rejectModalTx.id} REJECTED: ${rejectReason}`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
    setRejectModalTx(null);
  };

  // Filtered transactions
  const filtered = transactions.filter(t => {
    const matchesStatus = filterStatus === 'all' ? true : t.status === filterStatus;
    const query = searchQuery.toLowerCase();
    const matchesQuery = !query || 
      t.coinName?.toLowerCase().includes(query) ||
      t.orderId?.toLowerCase().includes(query) ||
      t.id?.toLowerCase().includes(query) ||
      t.txHash?.toLowerCase().includes(query) ||
      t.userEmail?.toLowerCase().includes(query) ||
      t.userUid?.toLowerCase().includes(query);
    return matchesStatus && matchesQuery;
  });

  const pendingCount = transactions.filter(t => t.status === 'Pending').length;
  const pendingVolume = transactions
    .filter(t => t.status === 'Pending')
    .reduce((acc, t) => acc + (t.profitAmount || t.amount || 0), 0);
  const completedVolume = transactions
    .filter(t => t.status === 'Completed')
    .reduce((acc, t) => acc + (t.profitAmount || t.amount || 0), 0);

  // Authentication Login Gate
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-[#050811] text-slate-100 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-[#0a101f] border border-amber-500/30 rounded-3xl p-6 md:p-8 shadow-2xl relative z-10 space-y-6">
          {/* Top Logo & Authority Badge */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 text-amber-400 shadow-lg shadow-amber-500/10 mb-1">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-black tracking-tight text-white uppercase">
              GOLDROBO Admin Terminal
            </h1>
            <p className="text-xs text-slate-400">
              Institutional Transaction Settlement & Authorization Portal (/panel)
            </p>
          </div>

          {/* Error Banner */}
          {loginError && (
            <div className="p-3 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Administrator Email
              </label>
              <input
                id="admin-login-email"
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="salim@gmail.com"
                className="w-full px-4 py-3 rounded-xl bg-[#060a14] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-400 font-mono transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Security Passkey
              </label>
              <input
                id="admin-login-password"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl bg-[#060a14] border border-slate-700/80 text-white text-sm focus:outline-none focus:border-amber-400 font-mono transition-colors"
              />
            </div>

            <button
              id="btn-admin-login"
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Authenticate Root Access</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-slate-800 text-center">
            <button
              onClick={onExit}
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to User Client App</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Logged In Admin Dashboard
  return (
    <div className="min-h-screen bg-[#050811] text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0a101f]/90 backdrop-blur-md border-b border-slate-800 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wider">
                  GOLDROBO Admin Panel
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">
                  ROOT PRIVILEGE
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Operator: <strong className="text-amber-300">{ADMIN_CREDENTIALS.email}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onExit}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit to User App</span>
            </button>

            <button
              onClick={handleLogout}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Action Toast */}
        {actionSuccessMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{actionSuccessMsg}</span>
            </div>
            <button onClick={() => setActionSuccessMsg(null)} className="text-emerald-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Metrics Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-3xl bg-[#0a101f] border border-amber-500/30 shadow-lg relative overflow-hidden">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
              <span>Pending Deposits for Review</span>
              <Clock className="w-4 h-4 text-amber-400 animate-spin" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-white">{pendingCount}</span>
              <span className="text-xs text-slate-400">requests queued</span>
            </div>
            <div className="text-xs text-amber-300 font-mono font-bold mt-1">
              ${pendingVolume.toFixed(2)} USDT Pending
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[#0a101f] border border-emerald-500/30 shadow-lg">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
              <span>Total Settled / Approved</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-emerald-400">
                ${completedVolume.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">USDT total</span>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Verified on blockchain ledger
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-[#0a101f] border border-slate-800 shadow-lg">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Settlement Engine</span>
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-sm font-bold text-white">TRC20 & BEP20</span>
              <span className="text-xs text-emerald-400 font-bold">● Synchronized</span>
            </div>
            <div className="text-xs text-slate-400 mt-1 font-mono">
              Server Host: 0.0.0.0:3000
            </div>
          </div>
        </div>

        {/* Transactions Table & Filters */}
        <div className="rounded-3xl bg-[#0a101f] border border-slate-800 p-4 md:p-6 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                <span>System Transactions Ledger</span>
              </h3>
              <span className="text-xs text-slate-400">
                Review, approve, or reject user deposits and withdrawal requests
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadTransactions}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                title="Refresh Ledger"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Filter tabs & search */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                onClick={() => setFilterStatus('Pending')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  filterStatus === 'Pending'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Audit ({pendingCount})</span>
              </button>

              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterStatus === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                All ({transactions.length})
              </button>

              <button
                onClick={() => setFilterStatus('Completed')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterStatus === 'Completed'
                    ? 'bg-emerald-500 text-slate-950 shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Approved
              </button>

              <button
                onClick={() => setFilterStatus('Rejected')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterStatus === 'Rejected'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Rejected
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search TXID, Order ID, User..."
                className="w-full md:w-64 pl-9 pr-4 py-2 rounded-xl bg-[#060a14] border border-slate-800 text-white text-xs focus:outline-none focus:border-amber-400 transition-colors"
              />
            </div>
          </div>

          {/* Transactions List */}
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2 border border-dashed border-slate-800 rounded-2xl">
              <AlertCircle className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">No transactions match your criteria.</p>
              <p className="text-xs text-slate-500">
                {filterStatus === 'Pending' 
                  ? 'All user transactions have been processed and settled.' 
                  : 'Try changing your search term or filter state.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((tx) => {
                const isPending = tx.status === 'Pending';
                const isCompleted = tx.status === 'Completed';
                const isRejected = tx.status === 'Rejected';

                return (
                  <div
                    key={tx.id}
                    id={`admin-tx-${tx.id}`}
                    className={`p-4 rounded-2xl bg-[#070b16] border transition-all space-y-3 ${
                      isPending 
                        ? 'border-amber-500/40 shadow-lg shadow-amber-500/5' 
                        : isCompleted 
                        ? 'border-slate-800/80' 
                        : 'border-rose-500/30'
                    }`}
                  >
                    {/* Row 1: Header with Order ID, Type, Amount, and Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          isPending ? 'bg-amber-400 animate-ping' : isCompleted ? 'bg-emerald-400' : 'bg-rose-500'
                        }`} />
                        <span className="text-sm font-bold text-white">
                          {tx.coinName || 'USDT Deposit'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono">
                          {tx.network || 'TRC20'}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-base font-black font-mono text-emerald-400">
                          +${(tx.profitAmount || tx.amount || 0).toFixed(2)} USDT
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          isPending 
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                            : isCompleted 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>

                    {/* Row 2: Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                      <div>
                        <span className="text-slate-500 text-[10px] block">USER ACCOUNT:</span>
                        <span className="text-slate-200 font-semibold truncate block">
                          {tx.userEmail || 'user@goldrobo.io'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">ORDER ID / SUBMISSION TIME:</span>
                        <span className="text-slate-200 truncate block">
                          {tx.orderId || tx.id} • {tx.dateStr} {tx.timeStr}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">BLOCKCHAIN TXID:</span>
                        <div className="flex items-center gap-1 text-amber-400">
                          <span className="truncate max-w-[140px]">{tx.txHash || 'N/A'}</span>
                          {tx.txHash && (
                            <button
                              onClick={() => handleCopy(tx.txHash || '', tx.id)}
                              className="text-slate-400 hover:text-white"
                              title="Copy TX Hash"
                            >
                              {copiedId === tx.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Row 3: Admin Notes if present */}
                    {tx.adminNotes && (
                      <div className="text-[11px] text-slate-400 italic bg-[#060a14] px-3 py-1.5 rounded-lg border border-slate-800">
                        Admin Note: {tx.adminNotes}
                      </div>
                    )}

                    {/* Row 4: Action Buttons (Only for Pending) */}
                    {isPending && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                        <button
                          id={`btn-reject-${tx.id}`}
                          onClick={() => setRejectModalTx(tx)}
                          className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>

                        <button
                          id={`btn-approve-${tx.id}`}
                          onClick={() => handleApprove(tx)}
                          className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <CheckCircle2 className="w-4 h-4 text-slate-950" />
                          <span>{tx.type === 'deposit' ? 'Approve & Credit Capital' : 'Approve & Release Payout'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Reject Confirmation Modal */}
      {rejectModalTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-[#0a101f] border border-rose-500/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-rose-400">
              <div className="w-9 h-9 rounded-full bg-rose-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">Reject Transaction</h4>
                <span className="text-xs text-slate-400 font-mono">{rejectModalTx.orderId || rejectModalTx.id}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to reject the {rejectModalTx.type === 'deposit' ? 'deposit' : 'withdrawal'} request of <strong>${(rejectModalTx.profitAmount || rejectModalTx.amount || 0).toFixed(2)} USDT</strong> for account <span className="font-mono text-amber-300">{rejectModalTx.userEmail}</span>? {rejectModalTx.type === 'withdraw' && 'Withdrawn funds will be immediately refunded back to the user balance.'}
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-400">Audit Rejection Reason:</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl bg-[#060a14] border border-slate-700 text-white text-xs focus:outline-none focus:border-rose-400 font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModalTx(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-reject"
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black shadow-lg shadow-rose-600/30"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
