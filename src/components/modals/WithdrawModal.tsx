import React, { useState } from 'react';
import { X, ArrowUpFromLine, AlertCircle, CheckCircle2, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CoinLogo } from '../CoinLogo';

export const WithdrawModal: React.FC = () => {
  const { closeModal, withdrawFunds, userState } = useApp();
  const [network, setNetwork] = useState<string>('TRC20');
  const [address, setAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const numAmount = parseFloat(amount) || 0;
  const feeRate = 0.05; // Strictly 5% fee as requested by user
  const feeAmount = numAmount > 0 ? +(numAmount * feeRate).toFixed(2) : 0;
  const netArrival = numAmount > feeAmount ? +(numAmount - feeAmount).toFixed(2) : 0;

  const handleMax = () => {
    setAmount(userState.withdrawableBalance.toFixed(2));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!address.trim()) {
      setErrorMsg('Please enter a destination withdrawal wallet address.');
      return;
    }

    if (numAmount < 10) {
      setErrorMsg('Minimum withdrawal amount is 10.00 USDT.');
      return;
    }

    if (numAmount > userState.withdrawableBalance) {
      setErrorMsg(`Insufficient withdrawable profit. Available: $${userState.withdrawableBalance.toFixed(2)} USDT. Note: Principal ($${userState.lockedInvestment.toFixed(2)} USDT) is locked for 40 days.`);
      return;
    }

    if (!pin || pin.length < 4) {
      setErrorMsg('Please enter your 4-6 digit Security PIN / 2FA Code.');
      return;
    }

    if (userState.securityPin && pin.trim() !== userState.securityPin.trim()) {
      setErrorMsg('Incorrect Security PIN. Please enter your valid authorization PIN.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const res = withdrawFunds(numAmount, address, network, pin);
      setIsSubmitting(false);

      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          closeModal();
        }, 2200);
      } else {
        setErrorMsg(res.message);
      }
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#0f172a] border border-amber-500/30 p-5 shadow-2xl shadow-amber-500/10 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <CoinLogo symbol="USDT" size="md" />
            <div>
              <h3 className="text-base font-bold text-white">Withdraw USDT</h3>
              <span className="text-[10px] text-amber-400 font-semibold">Fast Payout • 5% Security Fee</span>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Status Banner */}
        <div className="p-3 rounded-2xl bg-[#161f36] border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block">Withdrawable Profit</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                ${userState.withdrawableBalance.toFixed(2)} USDT
              </span>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block">40-Day Locked Capital</span>
              <span className="text-xs font-semibold text-amber-400 font-mono">
                ${userState.lockedInvestment.toFixed(2)} USDT
              </span>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800 flex items-center justify-between">
            <span>⚡ Profits withdrawable anytime</span>
            <span className="text-amber-300 font-medium">Locked 40 Days (Day {userState.investmentDaysElapsed}/40)</span>
          </div>
        </div>

        {/* 1 min to 24 hours notice */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-amber-300 text-xs font-medium">
          <span className="text-base">⏱️</span>
          <span>Approval Time: <strong>1 minute to 24 hours</strong></span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Network */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Network</label>
            <div className="grid grid-cols-3 gap-2">
              {['TRC20', 'BEP20', 'ERC20'].map((net) => (
                <button
                  type="button"
                  key={net}
                  onClick={() => setNetwork(net)}
                  className={`py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    network === net
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/30'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  USDT-{net}
                </button>
              ))}
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1">Wallet Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={`Paste your ${network} address`}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400 font-medium">Withdrawal Amount (Min 10 USDT)</label>
              <button
                type="button"
                onClick={handleMax}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold"
              >
                MAX PROFIT
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Min 10.00"
                className="w-full px-3 py-2.5 pr-16 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                USDT
              </span>
            </div>
          </div>

          {/* Fee & Arrival breakdown (5% Fee) */}
          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1 font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Handling Fee (5%):</span>
              <span className="text-rose-400">-${feeAmount.toFixed(2)} USDT</span>
            </div>
            <div className="flex justify-between text-white font-bold pt-1 border-t border-slate-800">
              <span>Net Arrival:</span>
              <span className="text-emerald-400">${netArrival.toFixed(2)} USDT</span>
            </div>
          </div>

          {/* Security PIN */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
                <Lock className="w-3 h-3 text-amber-400" />
                Security PIN / 2FA Code
              </label>
              <span className="text-[10px] text-slate-500 font-mono">4-6 Digits Required</span>
            </div>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Enter your 4-6 digit Security PIN"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-xs font-mono text-center tracking-widest focus:outline-none focus:border-amber-500"
            />
          </div>

          {errorMsg && (
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={isSubmitting || userState.withdrawableBalance < 10}
            className={`w-full py-3 rounded-xl font-bold text-xs tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 ${
              userState.withdrawableBalance < 10
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/25 active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? 'PROCESSING WITHDRAWAL...' : 'CONFIRM WITHDRAWAL (MIN 10 USDT)'}
          </button>
        </form>

        <div className="text-[11px] text-slate-400 text-center leading-relaxed">
          GOLDROBO smart contracts review and process requests within <strong>1 minute to 24 hours</strong>.
        </div>
      </div>
    </div>
  );
};
