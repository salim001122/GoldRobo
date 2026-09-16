import React, { useState } from 'react';
import { X, FileText, CheckCircle2, TrendingUp, ShieldCheck, Cpu } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface Position {
  id: string;
  pair: string;
  type: 'Binance Arbitrage Node' | 'OKX Liquidity Spread' | 'Bybit HFT Cluster';
  entryPrice: number;
  markPrice: number;
  size: string;
  pnl: number;
  pnlPercent: number;
}

export const PositionsModal: React.FC = () => {
  const { closeModal, userState, startQuantification } = useApp();
  const [positions, setPositions] = useState<Position[]>([
    {
      id: 'pos-1',
      pair: 'BTC / USDT',
      type: 'Binance Arbitrage Node',
      entryPrice: 77240.00,
      markPrice: 77460.00,
      size: '25.00 USDT',
      pnl: 0.75,
      pnlPercent: 3.00
    },
    {
      id: 'pos-2',
      pair: 'ETH / USDT',
      type: 'OKX Liquidity Spread',
      entryPrice: 2475.20,
      markPrice: 2489.40,
      size: '15.00 USDT',
      pnl: 0.45,
      pnlPercent: 3.00
    },
    {
      id: 'pos-3',
      pair: 'TRX / USDT',
      type: 'Bybit HFT Cluster',
      entryPrice: 0.3360,
      markPrice: 0.3378,
      size: '10.00 USDT',
      pnl: 0.30,
      pnlPercent: 3.00
    }
  ]);

  const [closeToast, setCloseToast] = useState<string>('');

  const handleClosePosition = (id: string, pair: string, pnl: number) => {
    setPositions(prev => prev.filter(p => p.id !== id));
    setCloseToast(`Position for ${pair} settled! +$${pnl.toFixed(2)} USDT harvested.`);
    setTimeout(() => setCloseToast(''), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#0b1120] border border-amber-500/40 p-5 shadow-2xl shadow-amber-500/20 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Live Open Positions</h3>
              <span className="text-[11px] text-slate-400 font-mono">
                {positions.length} Active Cross-Exchange Arbitrage Swaps
              </span>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Security badge */}
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>Zero-loss delta neutral hedging active on live market pairs.</span>
        </div>

        {closeToast && (
          <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs text-center font-semibold animate-pulse">
            {closeToast}
          </div>
        )}

        {/* Positions List */}
        <div className="space-y-3">
          {positions.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-xs text-slate-400">All positions harvested.</p>
              <button
                onClick={() => {
                  closeModal();
                  startQuantification();
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/25"
              >
                Launch Next Quantification
              </button>
            </div>
          ) : (
            positions.map((pos) => (
              <div
                key={pos.id}
                className="p-3.5 rounded-2xl bg-[#0e1628] border border-slate-800 space-y-2.5 hover:border-amber-500/30 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">{pos.pair}</span>
                    <span className="text-[10px] text-amber-400 font-medium font-mono">{pos.type}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-emerald-400 font-mono block">
                      +{pos.pnl.toFixed(2)}$
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold font-mono">
                      +{pos.pnlPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-2 border-t border-slate-800/80 font-mono">
                  <div>
                    <span className="block text-slate-500">Entry</span>
                    <span className="text-slate-200">${pos.entryPrice >= 1 ? pos.entryPrice.toLocaleString() : pos.entryPrice}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Mark</span>
                    <span className="text-slate-200">${pos.markPrice >= 1 ? pos.markPrice.toLocaleString() : pos.markPrice}</span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Allocation</span>
                    <span className="text-slate-200">{pos.size}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleClosePosition(pos.id, pos.pair, pos.pnl)}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 active:scale-95 transition-all"
                >
                  Settle & Harvest Profit
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
