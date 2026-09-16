import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  Info, 
  ChevronUp, 
  Clock, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  Cpu, 
  Zap, 
  ShieldCheck, 
  Sparkles, 
  Activity, 
  Radio,
  Lock,
  Flame,
  Bot,
  Copy,
  Check,
  Filter,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCryptoPrice } from '../utils/cryptoApi';
import { CoinLogo } from './CoinLogo';

export const RobotScreen: React.FC = () => {
  const { 
    selectedCoin, 
    setSelectedCoin,
    coins,
    setActiveTab, 
    openModal, 
    userState, 
    history, 
    startQuantification, 
    isQuantifying,
    unlockMaturedInvestment
  } = useApp();

  const [activeTimeframe, setActiveTimeframe] = useState<string>('1D');
  const [hoveredCandle, setHoveredCandle] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<string>('18:00:40');
  const [timeUntilReset, setTimeUntilReset] = useState<string>('00:00:00');
  const [isScanning, setIsScanning] = useState<boolean>(true);
  const [robotEyeBlink, setRobotEyeBlink] = useState<boolean>(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'quantify' | 'transfer'>('all');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Digital countdown for daily reset
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${h}:${m}:${s} UTC`);

      // Calculate remaining time until next midnight UTC (daily quota reset)
      const nextUtcMidnight = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0
      ));
      const diffMs = Math.max(0, nextUtcMidnight.getTime() - now.getTime());
      const remH = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
      const remM = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
      const remS = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, '0');
      setTimeUntilReset(`${remH}:${remM}:${remS}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Robot eye blinking animation cycle
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setRobotEyeBlink(true);
      setTimeout(() => setRobotEyeBlink(false), 200);
    }, 3500);
    return () => clearInterval(blinkInterval);
  }, []);

  const timeframes = ['1D', '5D', '1M', '3M', 'YTD', '1Y', 'Max'];
  const chartData = selectedCoin.chartData && selectedCoin.chartData.length > 0 
    ? selectedCoin.chartData 
    : [
        { time: '10:00', open: selectedCoin.price * 0.99, high: selectedCoin.price * 1.01, low: selectedCoin.price * 0.985, close: selectedCoin.price, volume: 1500 }
      ];

  // Chart dimension bounds
  const minPrice = Math.min(...chartData.map(c => c.low)) * 0.998;
  const maxPrice = Math.max(...chartData.map(c => c.high)) * 1.002;
  const priceRange = maxPrice - minPrice || 1;

  const chartHeight = 165;
  const chartWidth = 320;

  const getY = (val: number) => {
    return chartHeight - ((val - minPrice) / priceRange) * (chartHeight - 35) - 18;
  };

  const currentCandle = hoveredCandle !== null ? chartData[hoveredCandle] : chartData[chartData.length - 1];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Filtered history
  const filteredHistory = history.filter(item => {
    if (historyFilter === 'quantify') return item.type === 'quantify';
    if (historyFilter === 'transfer') return item.type === 'deposit' || item.type === 'withdraw';
    return true;
  });

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-28 pt-2 space-y-4">
      
      {/* Header bar */}
      <div className="flex items-center justify-between py-1">
        <button
          id="robot-back-button"
          onClick={() => setActiveTab('home')}
          className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all shadow-sm"
          aria-label="Back to Home"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <h1 className="text-base font-extrabold text-white tracking-wider flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">GOLDROBO</span>
            {userState.vipLevel > 0 ? (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono">
                VIP {userState.vipLevel} (+{userState.dailyEarningRate.toFixed(1)}%)
              </span>
            ) : (
              <button
                onClick={() => openModal('vip')}
                className="text-xs px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-mono"
              >
                VIP 0 (Deposit $10)
              </button>
            )}
          </h1>
        </div>

        <button
          id="robot-api-button"
          onClick={() => openModal('apiKey')}
          className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400 hover:text-white active:scale-95 transition-all shadow-sm"
          title="Market API Connectivity"
        >
          <Radio className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {/* Asset Selector Row (Real Crypto Coins: BTC, ETH, LTC, TRX, ADA, SOL, etc.) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {coins.map((coin) => {
          const isSelected = coin.id === selectedCoin.id;
          const isPositive = coin.change24h >= 0;
          return (
            <button
              key={coin.id}
              onClick={() => setSelectedCoin(coin)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10'
                  : 'bg-[#0d1424] text-slate-400 border-slate-800 hover:text-white hover:border-slate-700'
              }`}
            >
              <CoinLogo symbol={coin.symbol} size="xs" />
              <span>{coin.symbol}</span>
              <span className={`text-[10px] font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                ${formatCryptoPrice(coin.price)}
              </span>
            </button>
          );
        })}
      </div>

      {/* GOLDROBO Animated Mascot & Quantum Scanner Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#12192e] via-[#0d1425] to-[#1a1506] border border-amber-500/30 p-4 shadow-2xl shadow-amber-500/10">
        <div className="absolute top-0 right-0 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3.5">
          {/* Animated Golden Robot SVG Character */}
          <div className="relative shrink-0 flex flex-col items-center">
            <div className="absolute -top-1 w-6 h-6 rounded-full border border-amber-400/50 animate-ping pointer-events-none" />
            
            <div className="w-20 h-24 relative flex items-center justify-center animate-[bounce_3s_infinite_ease-in-out]">
              <svg viewBox="0 0 100 120" className="w-full h-full drop-shadow-[0_0_12px_rgba(234,179,8,0.4)]">
                <defs>
                  <linearGradient id="goldRoboGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="40%" stopColor="#eab308" />
                    <stop offset="85%" stopColor="#ca8a04" />
                    <stop offset="100%" stopColor="#854d0e" />
                  </linearGradient>
                  <linearGradient id="plateGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#0f172a" />
                  </linearGradient>
                  <filter id="glowEyes" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#38bdf8" floodOpacity="0.9"/>
                  </filter>
                </defs>

                {/* Antenna */}
                <line x1="50" y1="24" x2="50" y2="8" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
                <circle cx="50" cy="7" r="4.5" fill="#facc15" className="animate-pulse" />
                <circle cx="50" cy="7" r="2" fill="#ffffff" />

                {/* Ear sensors */}
                <rect x="18" y="34" width="6" height="12" rx="3" fill="#ca8a04" stroke="#fef08a" strokeWidth="1" />
                <rect x="76" y="34" width="6" height="12" rx="3" fill="#ca8a04" stroke="#fef08a" strokeWidth="1" />

                {/* Robot Head */}
                <rect x="23" y="24" width="54" height="34" rx="12" fill="url(#goldRoboGrad)" stroke="#fef08a" strokeWidth="1.5" />

                {/* Visor Screen */}
                <rect x="28" y="31" width="44" height="19" rx="8" fill="#0b1120" stroke="#38bdf8" strokeWidth="1" />

                {/* Eyes (Blinking animated state) */}
                {robotEyeBlink ? (
                  <g>
                    <line x1="36" y1="40" x2="44" y2="40" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                    <line x1="56" y1="40" x2="64" y2="40" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                  </g>
                ) : (
                  <g filter="url(#glowEyes)">
                    <rect x="36" y="36" width="9" height="9" rx="2.5" fill="#38bdf8" />
                    <circle cx="41" cy="39" r="1.5" fill="#ffffff" />
                    
                    <rect x="55" y="36" width="9" height="9" rx="2.5" fill="#38bdf8" />
                    <circle cx="60" cy="39" r="1.5" fill="#ffffff" />
                  </g>
                )}

                {/* Neck Joint */}
                <rect x="42" y="58" width="16" height="5" rx="2" fill="#64748b" />

                {/* Robot Body */}
                <rect x="26" y="63" width="48" height="36" rx="10" fill="url(#plateGrad)" stroke="url(#goldRoboGrad)" strokeWidth="2" />

                {/* Chest Power Reactor (Live VIP Rate Core) */}
                <circle cx="50" cy="80" r="11" fill="#0f172a" stroke="#eab308" strokeWidth="1.5" />
                <circle cx="50" cy="80" r="8" fill="#eab308" opacity="0.3" className="animate-ping" />
                <text x="50" y="83" fill="#facc15" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="monospace">
                  {userState.dailyEarningRate.toFixed(1)}%
                </text>

                {/* Arms */}
                <path d="M 24 67 Q 16 75 22 84" stroke="url(#goldRoboGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
                <path d="M 76 67 Q 84 75 78 84" stroke="url(#goldRoboGrad)" strokeWidth="3.5" fill="none" strokeLinecap="round" />

                {/* Thruster Jet Flare at bottom */}
                <path d="M 40 99 L 50 112 L 60 99 Z" fill="#38bdf8" opacity="0.8" className="animate-pulse" />
                <circle cx="50" cy="104" r="3" fill="#ffffff" />
              </svg>
            </div>

            <div className="w-7 h-1.5 rounded-full bg-cyan-400 blur-sm -mt-1 shadow-cyan-400/80 shadow-md" />
          </div>

          {/* Robot Dialogue / Core Spec Box */}
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 flex items-center gap-1">
                <Bot className="w-3 h-3" />
                AI Arbitrage Node
              </span>
              <button 
                onClick={() => setIsScanning(!isScanning)}
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                  isScanning 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {isScanning ? '● RADAR ON' : 'PAUSED'}
              </button>
            </div>

            <div className="text-sm font-extrabold text-white leading-tight">
              GOLDROBO Live Arbitrage Engine
            </div>

            <p className="text-[11px] text-slate-300 leading-snug">
              {userState.vipLevel > 0 
                ? `Autonomous cross-exchange liquidity engine. Yields guaranteed +${userState.dailyEarningRate.toFixed(1)}% daily profit for VIP ${userState.vipLevel} (1 quantify/day).`
                : 'Autonomous cross-exchange liquidity engine. Deposit min $10.00 USDT to activate VIP 1 and unlock +3.0% daily earnings.'}
            </p>

            <div className="flex items-center gap-2 pt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                <Lock className="w-2.5 h-2.5" /> 40-Day Lock
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                <Zap className="w-2.5 h-2.5" /> {userState.vipLevel > 0 ? `+${userState.dailyEarningRate.toFixed(1)}% Yield` : 'Deposit $10 for Yield'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Price Header with Real-Time Values & Coin Logo */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5 mb-0.5">
            <CoinLogo symbol={selectedCoin.symbol} size="xs" />
            <span>Market Price: {selectedCoin.name} ({selectedCoin.symbol})</span>
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              ${formatCryptoPrice(selectedCoin.price)}
            </span>
            <span className={`text-xs font-bold flex items-center gap-0.5 ${
              selectedCoin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {selectedCoin.change24h >= 0 ? (
                <>
                  <TrendingUp className="w-3.5 h-3.5" />
                  +{selectedCoin.change24h.toFixed(2)}%
                </>
              ) : (
                <>
                  <TrendingDown className="w-3.5 h-3.5" />
                  {selectedCoin.change24h.toFixed(2)}%
                </>
              )}
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] text-slate-400">Pairing Engine</div>
          <div className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1 justify-end">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>{selectedCoin.binanceSymbol}</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            Vol: {selectedCoin.volume24h}
          </div>
        </div>
      </div>

      {/* Candlestick & Volume Chart */}
      <div className="rounded-3xl bg-[#0d1424] border border-slate-800/80 p-4 shadow-xl space-y-3">
        
        {/* Timeframe selector */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-1">
            {timeframes.map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeTimeframe === tf 
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
            <span>24H High: <strong className="text-white">${formatCryptoPrice(selectedCoin.high24h || selectedCoin.price * 1.02)}</strong></span>
          </div>
        </div>

        {/* Live Candlestick Canvas SVG */}
        <div className="relative w-full h-[175px] bg-[#070b14] rounded-2xl p-2 flex items-center justify-center border border-slate-900 overflow-hidden">
          
          {/* Subtle Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between p-3 opacity-15 pointer-events-none">
            <div className="border-b border-slate-500 border-dashed w-full" />
            <div className="border-b border-slate-500 border-dashed w-full" />
            <div className="border-b border-slate-500 border-dashed w-full" />
          </div>

          {/* SVG Candlesticks */}
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
            {chartData.map((candle, idx) => {
              const x = 20 + idx * ((chartWidth - 40) / (chartData.length - 1 || 1));
              const isGreen = candle.close >= candle.open;
              const candleColor = isGreen ? '#10b981' : '#f43f5e';
              const yHigh = getY(candle.high);
              const yLow = getY(candle.low);
              const yOpen = getY(candle.open);
              const yClose = getY(candle.close);
              const bodyTop = Math.min(yOpen, yClose);
              const bodyHeight = Math.max(3, Math.abs(yClose - yOpen));
              const isHovered = hoveredCandle === idx;

              return (
                <g 
                  key={idx} 
                  className="cursor-pointer transition-opacity"
                  onMouseEnter={() => setHoveredCandle(idx)}
                  onMouseLeave={() => setHoveredCandle(null)}
                >
                  {/* Wick */}
                  <line 
                    x1={x} 
                    y1={yHigh} 
                    x2={x} 
                    y2={yLow} 
                    stroke={candleColor} 
                    strokeWidth={isHovered ? 2.5 : 1.5} 
                  />

                  {/* Body */}
                  <rect
                    x={x - (isHovered ? 8 : 6.5)}
                    y={bodyTop}
                    width={isHovered ? 16 : 13}
                    height={bodyHeight}
                    rx={2.5}
                    fill={candleColor}
                    stroke={isHovered ? '#ffffff' : candleColor}
                    strokeWidth={isHovered ? 1.5 : 0.5}
                  />

                  {/* Volume bar at bottom */}
                  <rect
                    x={x - 4}
                    y={chartHeight - Math.min(22, (candle.volume / 8000) * 22)}
                    width={8}
                    height={Math.min(22, (candle.volume / 8000) * 22)}
                    fill={isGreen ? '#10b981' : '#f43f5e'}
                    opacity={0.35}
                    rx={1.5}
                  />

                  {/* Time label */}
                  <text
                    x={x}
                    y={chartHeight - 1}
                    fill={isHovered ? '#ffffff' : '#64748b'}
                    fontSize="8.5"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {candle.time}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Hover Tooltip Overlay */}
          {currentCandle && (
            <div className="absolute top-2 left-3 bg-[#0d1424]/90 border border-slate-700/80 rounded-xl px-2.5 py-1 text-[10px] font-mono text-slate-300 shadow-lg pointer-events-none flex items-center gap-3">
              <div>Time: <span className="text-white font-bold">{currentCandle.time}</span></div>
              <div>Close: <span className="text-emerald-400 font-bold">${formatCryptoPrice(currentCandle.close)}</span></div>
            </div>
          )}
        </div>
      </div>

      {/* Main Execution Card */}
      <div className="rounded-3xl bg-[#0f172a] border border-slate-800 p-4 shadow-xl space-y-3.5">
        
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-400 block font-medium">Selected Asset</span>
            <span className="text-base font-extrabold text-white flex items-center gap-1.5">
              <span>{selectedCoin.name}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono font-bold">
                {selectedCoin.symbol}
              </span>
            </span>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 block font-medium">VIP {userState.vipLevel} Daily Yield</span>
            <span className="text-base font-black text-emerald-400 font-mono">
              +{userState.dailyEarningRate.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Business Rules Metrics Matrix */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
          
          <div className="p-3 rounded-2xl bg-[#0b1120] border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
              <span>Daily Quota</span>
              <span className="text-amber-300 font-bold font-mono">
                {userState.todayQuantifiableCount}/{userState.maxDailyQuantifiable}
              </span>
            </div>
            <div className="text-xs font-bold text-white mt-1">
              {userState.todayQuantifiableCount >= userState.maxDailyQuantifiable ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 1/1 Completed
                </span>
              ) : (
                <span className="text-amber-300">1 Available Today</span>
              )}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#0b1120] border border-slate-800/80">
            <div className="text-[10px] text-slate-400 font-medium flex items-center justify-between">
              <span>40-Day Lock Term</span>
              <span className="text-amber-300 font-bold font-mono">
                Day {userState.investmentDaysElapsed}/40
              </span>
            </div>
            <div className="text-xs font-bold text-white mt-1 font-mono">
              ${userState.lockedInvestment.toFixed(2)} USDT
            </div>
          </div>

        </div>

        {/* Balance & Profit Breakdown */}
        <div className="space-y-1.5 p-3 rounded-2xl bg-[#0d1424] border border-slate-800 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Total Account Capital:</span>
            <span className="font-bold text-white">${userState.totalBalance.toFixed(2)} USDT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Withdrawable Profit (Anytime):</span>
            <span className="font-bold text-emerald-400">${userState.withdrawableBalance.toFixed(2)} USDT</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Est. 1-Trade Profit (+{userState.dailyEarningRate.toFixed(1)}%):</span>
            <span className="font-bold text-amber-300">
              +${((userState.lockedInvestment > 0 ? userState.lockedInvestment : userState.totalBalance) * (userState.dailyEarningRate / 100)).toFixed(2)} USDT
            </span>
          </div>
        </div>

        {/* Real 40-Day Term Information & Unlock */}
        <div className="p-3 rounded-2xl bg-[#0b1120] border border-amber-500/20 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              40-Day Capital Lock Status
            </span>
            <span className="text-amber-400 font-mono font-bold text-[11px]">
              {userState.investmentDaysElapsed >= 40 ? 'Matured & Ready' : `${40 - userState.investmentDaysElapsed} Days Left`}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
              style={{ width: `${Math.min(100, (userState.investmentDaysElapsed / 40) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Started: {userState.lockStartDate || '2026-09-14'}</span>
            <span>Principal: ${userState.lockedInvestment.toFixed(2)} USDT</span>
          </div>

          {userState.investmentDaysElapsed >= 40 && userState.lockedInvestment > 0 && (
            <button
              onClick={unlockMaturedInvestment}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black text-xs tracking-wider shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              UNLOCK MATURED CAPITAL (${userState.lockedInvestment.toFixed(2)} USDT)
            </button>
          )}
        </div>

        {/* Policy Highlights Pills */}
        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-slate-300 space-y-1 leading-snug">
          <div className="flex items-center justify-between font-semibold text-amber-300">
            <span>🔒 40-Day Locked Capital Term</span>
            <span>⚡ Profit Withdrawable Anytime</span>
          </div>
          <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
            <span>Min Quantify: $10 USDT</span>
            <span>Min Withdraw: $10 USDT (5% Fee)</span>
          </div>
        </div>

        {/* Big Action Button: START GOLDROBO */}
        <button
          id="btn-start-quantifiable"
          onClick={() => startQuantification(selectedCoin.id)}
          disabled={isQuantifying || userState.todayQuantifiableCount >= userState.maxDailyQuantifiable || userState.totalBalance < 10}
          className={`w-full py-4 rounded-2xl font-black text-sm tracking-wider transition-all shadow-xl flex items-center justify-center gap-2 ${
            userState.totalBalance < 10
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : userState.todayQuantifiableCount >= userState.maxDailyQuantifiable
              ? 'bg-slate-800/90 text-emerald-400 cursor-not-allowed border border-emerald-500/40'
              : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-amber-500/25 active:scale-[0.98]'
          }`}
        >
          {isQuantifying ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-slate-950/40 border-t-slate-950 rounded-full animate-spin" />
              <span>QUANTIFYING SPREAD (+{userState.dailyEarningRate.toFixed(1)}%)...</span>
            </div>
          ) : userState.totalBalance < 10 ? (
            <span>MINIMUM 10 USDT REQUIRED TO QUANTIFY</span>
          ) : userState.todayQuantifiableCount >= userState.maxDailyQuantifiable ? (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>1/1 DAILY QUANTIFY DONE (+{userState.dailyEarningRate.toFixed(1)}% SECURED)</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>START GOLDROBO (+{userState.dailyEarningRate.toFixed(1)}% TODAY)</span>
            </div>
          )}
        </button>

      </div>

      {/* Daily Reset Countdown - Only displayed after user has completed their daily quantify */}
      {userState.todayQuantifiableCount >= userState.maxDailyQuantifiable && (
        <div className="flex items-center justify-center py-1 animate-fadeIn">
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d1424] border border-amber-500/30 shadow-[0_0_12px_rgba(234,179,8,0.15)]">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-slate-400">Next Daily Quantify In:</span>
            <span className="font-mono text-xs font-bold text-amber-300 tracking-wider">
              {timeUntilReset}
            </span>
          </div>
        </div>
      )}

      {/* Re-designed Ledger-Style Real Trade History Section */}
      <div className="rounded-3xl bg-[#0d1424] border border-slate-800 p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide">
              Arbitrage & Settlement Ledger
            </h4>
            <span className="text-[11px] text-slate-400">
              Verified on-chain & internal matching records
            </span>
          </div>

          {/* History filter toggle */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setHistoryFilter('all')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                historyFilter === 'all'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setHistoryFilter('quantify')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                historyFilter === 'quantify'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Quantify
            </button>
            <button
              onClick={() => setHistoryFilter('transfer')}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                historyFilter === 'transfer'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Transfers
            </button>
          </div>
        </div>

        {/* History Item Cards */}
        <div className="space-y-2.5">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl bg-[#090e1a] border border-slate-800 text-xs text-slate-500 space-y-1">
              <p className="font-bold text-slate-400">No Transactions in Ledger</p>
              <p className="text-[11px] text-slate-500">Real-time quantification records will appear here as soon as you execute a trade.</p>
            </div>
          ) : (
            filteredHistory.slice(0, 6).map((item) => {
              const isProfit = item.profitAmount >= 0;
              const isQuantify = item.type === 'quantify';

              return (
                <div
                  key={item.id}
                  id={`ledger-${item.id}`}
                  className="p-3.5 rounded-2xl bg-[#090e1a] border border-slate-800/90 hover:border-amber-500/40 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${
                        item.status === 'Completed' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'
                      }`} />
                      <span className="text-xs font-bold text-white">
                        {item.coinName}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`text-xs font-black font-mono ${
                        isProfit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isProfit ? `+${item.profitAmount.toFixed(2)}` : item.profitAmount.toFixed(2)} USDT
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
                    <div className="flex items-center gap-2">
                      <span>{item.dateStr} {item.timeStr}</span>
                      {item.profitPercent > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                          +{item.profitPercent.toFixed(1)}% Yield
                        </span>
                      )}
                    </div>
                    <div className="text-slate-300 font-semibold">
                      Bal: ${item.balanceAfter.toFixed(2)}
                    </div>
                  </div>

                  {/* Order ID & Tx Details Footer */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1.5 border-t border-slate-800/60">
                    <div className="truncate max-w-[170px] text-slate-400">
                      ID: {item.orderId || item.id}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">{item.network || 'TRC20'}</span>
                      {item.txHash && (
                        <button
                          onClick={() => handleCopy(item.txHash || '')}
                          className="text-amber-400/80 hover:text-amber-300 flex items-center gap-0.5 hover:underline"
                          title="Copy Transaction Hash"
                        >
                          {copiedHash === item.txHash ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Hash</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* View full history button */}
        <button
          onClick={() => openModal('history')}
          className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all text-center"
        >
          View Complete Audit Ledger ({history.length} Records) →
        </button>

      </div>

    </div>
  );
};
