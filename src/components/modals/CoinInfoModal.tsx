import React, { useState } from 'react';
import { X, Info, ExternalLink, Copy, Check, TrendingUp, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatCryptoPrice } from '../../utils/cryptoApi';

export const CoinInfoModal: React.FC = () => {
  const { closeModal, selectedCoin } = useApp();
  const [copied, setCopied] = useState<boolean>(false);

  const contractAddress = selectedCoin.contractAddress || `0x2170ed0880ac9a755fd29b2688956bd959f933f8`;

  const handleCopy = () => {
    navigator.clipboard.writeText(contractAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{selectedCoin.name}</h3>
              <span className="text-[11px] text-slate-400">On-Chain Asset & Liquidity Profile</span>
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
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#16203d] to-[#0c1326] border border-amber-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl ${selectedCoin.avatarBg} text-white font-black text-lg flex items-center justify-center shadow-lg`}>
              {selectedCoin.avatarInitial}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-white">{selectedCoin.name}</span>
                <span>{selectedCoin.flag}</span>
              </div>
              <span className="text-xs text-amber-400 font-mono font-semibold">{selectedCoin.symbol}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-base font-extrabold text-white font-mono">${formatCryptoPrice(selectedCoin.price)}</div>
            <div className={`text-xs font-bold ${selectedCoin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {selectedCoin.change24h >= 0 ? `+${selectedCoin.change24h.toFixed(2)}%` : `${selectedCoin.change24h.toFixed(2)}%`}
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Category</span>
            <span className="font-bold text-slate-200 mt-0.5 block">{selectedCoin.category}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Binance Symbol</span>
            <span className="font-bold text-amber-400 font-mono mt-0.5 block">{selectedCoin.binanceSymbol}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Market Cap</span>
            <span className="font-bold text-cyan-400 font-mono mt-0.5 block">{selectedCoin.marketCap}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">24H Volume</span>
            <span className="font-bold text-emerald-400 font-mono mt-0.5 block">{selectedCoin.volume24h}</span>
          </div>
        </div>

        {/* Description */}
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
          {selectedCoin.description}
        </div>

        {/* Smart Contract / Public Identifier */}
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-1">Contract / Routing Hash</label>
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-xs text-slate-300 font-mono truncate flex-1">
              {contractAddress}
            </span>
            <button
              onClick={handleCopy}
              className="p-1 rounded-md text-amber-400 hover:text-white transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <button
          onClick={closeModal}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all"
        >
          Close
        </button>

      </div>
    </div>
  );
};
