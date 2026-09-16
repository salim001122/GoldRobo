import React, { useState, useEffect } from 'react';
import { X, Copy, Check, AlertCircle, ArrowDownToLine, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import QRCode from 'qrcode';
import { useApp } from '../../context/AppContext';
import { CoinLogo } from '../CoinLogo';

export const DepositModal: React.FC = () => {
  const { closeModal, depositFunds, userState, history } = useApp();
  const [network, setNetwork] = useState<'TRC20' | 'BEP20'>('TRC20');
  const [copied, setCopied] = useState<boolean>(false);
  const [amount, setAmount] = useState<string>('50');
  const [txHash, setTxHash] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Real deposit addresses for USDT
  const networkAddresses: Record<'TRC20' | 'BEP20', string> = {
    TRC20: 'TN3B5Z4G9aFq2wL7eR1Z4tY8uXoNpKaLmQ',
    BEP20: '0x71C5e32B0f6a27e3663b15638210d9f4e6628b03'
  };

  const address = networkAddresses[network];

  // Generate real dynamic QR code data URL using qrcode library
  useEffect(() => {
    let isMounted = true;
    QRCode.toDataURL(address, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0a0f1d',
        light: '#ffffff'
      }
    })
      .then(url => {
        if (isMounted) setQrCodeUrl(url);
      })
      .catch(err => {
        console.error('QR code generation error:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [address]);

  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (isNaN(num) || num < 10) {
      setStatusMsg({ type: 'error', text: 'Minimum deposit is $10.00 USDT' });
      return;
    }

    setSubmitting(true);
    setStatusMsg(null);

    const res = depositFunds(num, `USDT ${network}`, txHash);
    setSubmitting(false);

    if (res.success) {
      setStatusMsg({ type: 'success', text: res.message });
      setTxHash('');
    } else {
      setStatusMsg({ type: 'error', text: res.message });
    }
  };

  // Find most recent pending deposit to display queue status
  const pendingDeposit = history.find(h => h.type === 'deposit' && h.status === 'Pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#0f172a] border border-blue-500/30 p-5 shadow-2xl shadow-blue-500/20 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <CoinLogo symbol="USDT" size="md" />
            <div>
              <h3 className="text-base font-bold text-white">Deposit USDT</h3>
              <span className="text-[11px] text-emerald-400 font-semibold">Tether Secure Liquidity Gateway</span>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3% First Deposit Bonus Banner */}
        <div className={`p-3 rounded-2xl border ${
          !userState.hasReceivedFirstDepositBonus
            ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-600/20 border-amber-500/40'
            : 'bg-slate-900/80 border-slate-800'
        }`}>
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🎁</span>
            <div>
              <div className="text-xs font-bold text-amber-300">
                {!userState.hasReceivedFirstDepositBonus ? '3% First Deposit Bonus Guarantee' : 'First Deposit Bonus Received'}
              </div>
              <div className="text-[11px] text-slate-300 leading-snug mt-0.5">
                {!userState.hasReceivedFirstDepositBonus
                  ? 'Complete your first deposit to activate a 3% cash bonus, claimable in Bonus Center upon transaction success.'
                  : 'Your first deposit welcome bonus was verified and activated.'}
              </div>
            </div>
          </div>
        </div>

        {/* Network Selector */}
        <div className="space-y-1.5">
          <label className="text-xs text-slate-300 font-semibold block">Select USDT Network</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setNetwork('TRC20')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                network === 'TRC20'
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-md shadow-emerald-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              USDT (TRC20)
            </button>
            <button
              type="button"
              onClick={() => setNetwork('BEP20')}
              className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border ${
                network === 'BEP20'
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md shadow-amber-500/10'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              USDT (BEP20)
            </button>
          </div>
        </div>

        {/* Authentic Dynamic QR Code */}
        <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white text-slate-900 shadow-inner">
          <div className="w-40 h-40 relative flex items-center justify-center bg-white rounded-xl overflow-hidden p-1">
            {qrCodeUrl ? (
              <img 
                src={qrCodeUrl} 
                alt="USDT Deposit QR Code" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                Generating QR...
              </div>
            )}
            {/* Center authentic Tether logo */}
            <div className="absolute w-7 h-7 rounded-full bg-white p-0.5 shadow-md flex items-center justify-center pointer-events-none">
              <CoinLogo symbol="USDT" size="sm" />
            </div>
          </div>
          <span className="text-[11px] font-bold text-slate-800 mt-2 font-mono">
            USDT - {network}
          </span>
        </div>

        {/* Deposit Address */}
        <div className="space-y-1">
          <label className="text-xs text-slate-300 font-semibold block">Official Deposit Address</label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-200 font-mono truncate flex-1 select-all">
              {address}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-all shrink-0 active:scale-95"
              title="Copy address"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          {copied && (
            <span className="text-[10px] text-emerald-400 block mt-0.5">
              Address copied to clipboard!
            </span>
          )}
        </div>

        {/* 40-Day Lock & 3% Daily Yield Notice */}
        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span>🔒 Investment Lock Term:</span>
            <span className="text-amber-400 font-bold">40 Days</span>
          </div>
          <div className="flex items-center justify-between text-slate-300 font-semibold">
            <span>⚡ Daily Quantify Profit:</span>
            <span className="text-emerald-400 font-bold">3.00% / day</span>
          </div>
          <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 leading-relaxed">
            Minimum deposit: 10.00 USDT. Your funds are secured in the 40-day yield contract. Profit is withdrawable anytime with 5% transaction fee.
          </p>
        </div>

        {/* Real Deposit Submission Form */}
        <form onSubmit={handleSubmitDeposit} className="space-y-2.5 pt-2 border-t border-slate-800">
          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-semibold block">Deposit Amount (USDT)</label>
            <div className="relative">
              <input
                type="number"
                min="10"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10.00"
                required
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 pr-16"
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-emerald-400">USDT</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300 font-semibold block">Transaction Hash / TXID (Optional)</label>
            <input
              type="text"
              value={txHash}
              onChange={(e) => setTxHash(e.target.value)}
              placeholder="e.g. 0x8a7f... or Tron TXID"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Deposit Request'}
          </button>
        </form>

        {/* Status Alert */}
        {statusMsg && (
          <div className={`p-2.5 rounded-xl text-xs font-semibold text-center animate-pulse ${
            statusMsg.type === 'success' 
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
          }`}>
            {statusMsg.text}
          </div>
        )}

        {/* Pending Deposit Administrator Verification Status */}
        {pendingDeposit && (
          <div className="p-3 rounded-2xl bg-[#0a101f] border border-amber-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                Awaiting Administrator Audit
              </span>
              <span className="text-xs font-mono font-bold text-white">
                ${pendingDeposit.profitAmount.toFixed(2)} USDT
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
              <span>{pendingDeposit.orderId}</span>
              <span className="text-amber-400 font-semibold">Audit Status: Pending</span>
            </div>
            <p className="text-[10px] text-slate-300 leading-relaxed bg-slate-900/90 p-2.5 rounded-xl border border-slate-800">
              Your deposit is submitted and awaiting verification by the administrator. Once approved, the funds will be automatically credited to your balance.
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
