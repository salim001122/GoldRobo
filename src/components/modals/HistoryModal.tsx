import React, { useState } from 'react';
import { ChevronLeft, ArrowUpFromLine, ArrowDownToLine, Cpu, Layers } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { TradeHistoryItem } from '../../types';

export const HistoryModal: React.FC = () => {
  const { closeModal, history } = useApp();
  // Default to 'withdraw' or 'deposit' as shown in the screenshot
  const [activeTab, setActiveTab] = useState<'withdraw' | 'deposit' | 'all'>('withdraw');

  const filteredHistory = history.filter((item) => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  // Format record values for consistent display matching screenshot
  const formatCardValues = (item: TradeHistoryItem) => {
    const rawAmount = item.amount !== undefined 
      ? item.amount 
      : Math.abs(item.profitAmount || 0);

    let actualAmount = item.actualAmount;
    let serviceCharge = item.serviceCharge;

    if (item.type === 'withdraw') {
      if (serviceCharge === undefined) {
        serviceCharge = +(rawAmount * 0.05).toFixed(2); // 5% fee
      }
      if (actualAmount === undefined) {
        actualAmount = +(rawAmount - serviceCharge).toFixed(2);
      }
    } else if (item.type === 'deposit') {
      if (serviceCharge === undefined) serviceCharge = 0.00;
      if (actualAmount === undefined) actualAmount = rawAmount;
    } else {
      // Quantify or bonus
      if (serviceCharge === undefined) serviceCharge = 0.00;
      if (actualAmount === undefined) actualAmount = Math.abs(item.profitAmount);
    }

    // Screenshot order ID format: ID:TX2609150127514367
    let displayId = item.orderId || '';
    if (!displayId.startsWith('ID:TX') && !displayId.startsWith('TX')) {
      const numericSeed = (item.id + item.timestamp).replace(/\D/g, '');
      const padded = (numericSeed + '2609150127514367').slice(0, 16);
      displayId = `ID:TX${padded}`;
    } else if (!displayId.startsWith('ID:')) {
      displayId = `ID:${displayId}`;
    }

    // Date format matching screenshot: "2026-09-14 18:27:51"
    let displayDate = item.fullDateStr;
    if (!displayDate) {
      try {
        const d = new Date(item.timestamp || Date.now());
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        displayDate = `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
      } catch {
        displayDate = `${item.dateStr} ${item.timeStr}`;
      }
    }

    const approvalStatus = item.approvalStatus || (
      item.status === 'Completed' 
        ? 'Audit successful' 
        : item.status === 'Rejected' 
        ? 'Audit rejected' 
        : 'Auditing in progress'
    );
    const paymentStatus = item.paymentStatus || (
      item.status === 'Completed' 
        ? 'Payment successful' 
        : item.status === 'Rejected' 
        ? 'Rejected' 
        : 'Pending Admin Confirmation'
    );

    return {
      idDisplay: displayId,
      amount: rawAmount.toFixed(2),
      actualReceived: (actualAmount || 0).toFixed(2),
      serviceCharge: (serviceCharge || 0).toFixed(2),
      approvalStatus,
      paymentStatus,
      dateDisplay: displayDate
    };
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'withdraw':
        return 'Withdraw Record';
      case 'deposit':
        return 'Deposit Record';
      case 'all':
      default:
        return 'All Records';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md rounded-3xl bg-[#080e1b] border border-emerald-500/30 shadow-2xl shadow-emerald-500/10 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar matching user's Screenshot: "< Withdraw Record" */}
        <div className="px-4 py-3.5 border-b border-slate-800/80 flex items-center justify-between bg-[#0a1122]">
          <div className="flex items-center gap-3">
            <button
              onClick={closeModal}
              id="btn-history-back"
              className="w-9 h-9 rounded-full bg-slate-800/70 border border-slate-700/60 text-emerald-400 hover:text-white flex items-center justify-center active:scale-95 transition-all"
              aria-label="Back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-base font-bold text-white tracking-wide">
              {getTitle()}
            </h2>
          </div>

          {/* Record Count Badge */}
          <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            {filteredHistory.length} Records
          </span>
        </div>

        {/* Record Type Switcher Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-3 bg-[#070b16] border-b border-slate-800/60">
          <button
            id="tab-history-withdraw"
            onClick={() => setActiveTab('withdraw')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'withdraw'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800/60 hover:text-white'
            }`}
          >
            <ArrowUpFromLine className="w-3.5 h-3.5 text-emerald-400" />
            <span>Withdraw Record</span>
          </button>

          <button
            id="tab-history-deposit"
            onClick={() => setActiveTab('deposit')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'deposit'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800/60 hover:text-white'
            }`}
          >
            <ArrowDownToLine className="w-3.5 h-3.5 text-cyan-400" />
            <span>Deposit Record</span>
          </button>

          <button
            id="tab-history-all"
            onClick={() => setActiveTab('all')}
            className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border ${
              activeTab === 'all'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                : 'bg-slate-900/60 text-slate-400 border-slate-800/60 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>All Records</span>
          </button>
        </div>

        {/* Scrollable Records Container */}
        <div className="p-4 space-y-3.5 overflow-y-auto max-h-[70vh]">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-800/50 text-slate-500 flex items-center justify-center mx-auto">
                <ChevronLeft className="w-5 h-5 rotate-90" />
              </div>
              <p className="text-xs text-slate-400 font-medium">
                No {activeTab} records found.
              </p>
              <p className="text-[11px] text-slate-500">
                New on-chain submissions will appear here with instant audit statuses.
              </p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const card = formatCardValues(item);

              return (
                <div
                  key={item.id}
                  className="rounded-2xl bg-[#0c1424] border border-slate-800/90 hover:border-emerald-500/40 p-4 space-y-3 shadow-md transition-all"
                >
                  {/* Top Centered Pill Badge matching user's Screenshot: "[ ID:TX2609150127514367 ]" */}
                  <div className="flex justify-center">
                    <span className="inline-block px-3.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold tracking-tight shadow-sm">
                      {card.idDisplay}
                    </span>
                  </div>

                  {/* Clean Two-Column Layout strictly matching user's Screenshot */}
                  <div className="space-y-2 text-xs">
                    {/* Amount */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Amount</span>
                      <span className="text-white font-mono font-semibold text-sm">
                        {card.amount}
                      </span>
                    </div>

                    {/* Actual amount received */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Actual amount received</span>
                      <span className="text-white font-mono font-semibold text-sm">
                        {card.actualReceived}
                      </span>
                    </div>

                    {/* Service Charge */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Service Charge</span>
                      <span className="text-slate-300 font-mono font-semibold">
                        {card.serviceCharge}
                      </span>
                    </div>

                    {/* Approval Status */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Approval Status</span>
                      <span className={`font-semibold tracking-wide flex items-center gap-1.5 ${
                        item.status === 'Completed' 
                          ? 'text-emerald-400' 
                          : item.status === 'Rejected' 
                          ? 'text-rose-400' 
                          : 'text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'Completed' 
                            ? 'bg-emerald-400' 
                            : item.status === 'Rejected' 
                            ? 'bg-rose-400' 
                            : 'bg-amber-400 animate-pulse'
                        }`} />
                        {card.approvalStatus}
                      </span>
                    </div>

                    {/* Payment status */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-medium">Payment status</span>
                      <span className={`font-semibold tracking-wide flex items-center gap-1.5 ${
                        item.status === 'Completed' 
                          ? 'text-emerald-400' 
                          : item.status === 'Rejected' 
                          ? 'text-rose-400' 
                          : 'text-amber-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.status === 'Completed' 
                            ? 'bg-emerald-400' 
                            : item.status === 'Rejected' 
                            ? 'bg-rose-400' 
                            : 'bg-amber-400 animate-pulse'
                        }`} />
                        {card.paymentStatus}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                      <span className="text-slate-400 font-medium">Date</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        {card.dateDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
