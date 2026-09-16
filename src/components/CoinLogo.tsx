import React from 'react';

interface CoinLogoProps {
  symbol: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  network?: 'TRC20' | 'BEP20' | 'ERC20' | string;
  showNetworkBadge?: boolean;
}

export const CoinLogo: React.FC<CoinLogoProps> = ({
  symbol,
  size = 'md',
  className = '',
  network,
  showNetworkBadge = false
}) => {
  const sym = (symbol || '').toUpperCase().trim();

  const sizeClasses = {
    xs: 'w-5 h-5 min-w-[20px]',
    sm: 'w-7 h-7 min-w-[28px]',
    md: 'w-10 h-10 min-w-[40px]',
    lg: 'w-12 h-12 min-w-[48px]',
    xl: 'w-16 h-16 min-w-[64px]'
  };

  const renderSvg = () => {
    switch (sym) {
      // 1. TETHER USDT (Official green #26A17B with authentic white stylized ₮ emblem)
      case 'USDT':
      case 'TETHER':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#26A17B" />
            <path
              d="M17.922 17.383c-.11.008-.68.04-1.922.04-1.066 0-1.705-.032-1.85-.04-4.08-.184-7.14-1.04-7.14-2.072s3.06-1.888 7.14-2.072v3.296c.148.01.79.034 1.856.034 1.234 0 1.804-.026 1.916-.034v-3.296c4.08.184 7.14 1.04 7.14 2.072 0 1.032-3.06 1.888-7.14 2.072zm0-4.328v-2.587h5.922V7.4h-15.844v3.068h5.922v2.587c-4.664.218-8.156 1.25-8.156 2.498 0 1.248 3.492 2.28 8.156 2.498v8.669h4.004v-8.669c4.664-.218 8.156-1.25 8.156-2.498 0-1.248-3.492-2.28-8.156-2.498z"
              fill="#FFFFFF"
            />
          </svg>
        );

      // 2. BITCOIN (Official orange #F7931A with white ₿)
      case 'BTC':
      case 'BITCOIN':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#F7931A" />
            <path
              d="M23.189 14.02c.314-2.096-1.283-3.223-3.465-3.975l.708-2.84-1.728-.43-.69 2.765c-.454-.114-.922-.221-1.387-.327l.695-2.784-1.727-.431-.708 2.839c-.376-.086-.745-.17-1.102-.258l.002-.007-2.384-.595-.46 1.846s1.283.294 1.256.312c.7.175.827.638.806 1.006l-.808 3.238c.048.012.111.03.18.056-.058-.014-.12-.03-.183-.045l-1.131 4.536c-.086.212-.303.531-.793.41.018.025-1.256-.314-1.256-.314l-.858 1.978 2.25.561c.418.105.828.215 1.231.318l-.715 2.872 1.727.43.708-2.84c.472.127.93.245 1.378.357l-.705 2.827 1.728.431.715-2.866c2.948.558 5.164.333 6.097-2.333.752-2.146-.037-3.385-1.588-4.192 1.13-.26 1.98-1.003 2.207-2.538zm-3.95 5.537c-.535 2.146-4.148.986-5.318.695l.949-3.803c1.17.292 4.928.872 4.369 3.108zm.536-5.572c-.488 1.954-3.495.962-4.47.718l.86-3.45c.976.243 4.119.698 3.61 2.732z"
              fill="#FFFFFF"
            />
          </svg>
        );

      // 3. ETHEREUM (Official #627EEA with faceted gem diamond)
      case 'ETH':
      case 'ETHEREUM':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#627EEA" />
            <g fill="#FFFFFF" fillRule="nonzero">
              <path d="M16.498 4v8.87l7.497 3.35z" fillOpacity="0.6" />
              <path d="M16.498 4L9 16.22l7.498-3.35z" />
              <path d="M16.498 21.968v6.027L24 17.616z" fillOpacity="0.6" />
              <path d="M16.498 27.995v-6.027L9 17.616z" />
              <path d="M16.498 20.573l7.497-4.353-7.497-3.348z" fillOpacity="0.2" />
              <path d="M9 16.22l7.498 4.353v-7.701z" fillOpacity="0.6" />
            </g>
          </svg>
        );

      // 4. RIPPLE XRP (Official #23292F circle with white iconic curved X)
      case 'XRP':
      case 'RIPPLE':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#23292F" />
            <path
              d="M23.754 7.5h2.518L18.49 15.275c-.718.705-1.884.705-2.602 0L8.11 7.5h2.518l6.57 6.444c.449.44 1.176.44 1.625 0l4.93-4.835zM8.11 24.5h-2.52l7.783-7.775c.718-.705 1.883-.705 2.602 0l7.778 7.775h-2.518l-6.56-6.444c-.449-.44-1.176-.44-1.625 0l-4.94 4.835z"
              fill="#FFFFFF"
            />
          </svg>
        );

      // 5. DOGECOIN (Official #C2A633 with white bold Ð)
      case 'DOGE':
      case 'DOGECOIN':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#C2A633" />
            <path
              d="M11 7.5h6.35c4.78 0 7.65 3.32 7.65 8.5s-2.87 8.5-7.65 8.5H11V7.5zm3.74 3.12v3.74h6.05v2.28h-6.05v4.98h2.38c2.8 0 4.67-1.94 4.67-5.38s-1.87-5.62-4.67-5.62h-2.38z"
              fill="#FFFFFF"
            />
          </svg>
        );

      // 6. TRON TRX (Official red #EC0928 geometric polygon)
      case 'TRX':
      case 'TRON':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#EC0928" />
            <path
              d="M7 8l17.5 4.5-9 12.5L7 8zm2.4 2.1l12.4 3.2-6.5 2.2-5.9-5.4zm7.3 6.6l6.2-2.1-7.2 10 1-7.9z"
              fill="#FFFFFF"
            />
          </svg>
        );

      // 7. CARDANO ADA (Official blue #0033AD with signature concentric dots)
      case 'ADA':
      case 'CARDANO':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#0033AD" />
            <circle cx="16" cy="16" r="3.2" fill="#FFFFFF" />
            <circle cx="16" cy="8.5" r="1.5" fill="#FFFFFF" />
            <circle cx="16" cy="23.5" r="1.5" fill="#FFFFFF" />
            <circle cx="9.5" cy="12.2" r="1.5" fill="#FFFFFF" />
            <circle cx="22.5" cy="12.2" r="1.5" fill="#FFFFFF" />
            <circle cx="9.5" cy="19.8" r="1.5" fill="#FFFFFF" />
            <circle cx="22.5" cy="19.8" r="1.5" fill="#FFFFFF" />
            <circle cx="16" cy="5" r="0.9" fill="#FFFFFF" opacity="0.7" />
            <circle cx="16" cy="27" r="0.9" fill="#FFFFFF" opacity="0.7" />
            <circle cx="6.5" cy="10.5" r="0.9" fill="#FFFFFF" opacity="0.7" />
            <circle cx="25.5" cy="10.5" r="0.9" fill="#FFFFFF" opacity="0.7" />
            <circle cx="6.5" cy="21.5" r="0.9" fill="#FFFFFF" opacity="0.7" />
            <circle cx="25.5" cy="21.5" r="0.9" fill="#FFFFFF" opacity="0.7" />
          </svg>
        );

      // 8. SOLANA (Official #141416 with gradient neon bars)
      case 'SOL':
      case 'SOLANA':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#000000" />
            <defs>
              <linearGradient id="solGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00FFA3" />
                <stop offset="100%" stopColor="#DC1FFF" />
              </linearGradient>
            </defs>
            <path
              d="M9.5 20.8h11.2c.4 0 .7.2.9.5l2.4 2.4c.3.3.1.8-.3.8H12.5c-.4 0-.7-.2-.9-.5l-2.4-2.4c-.3-.3-.1-.8.3-.8zm0-6.4h11.2c.4 0 .7.2.9.5l2.4 2.4c.3.3.1.8-.3.8H12.5c-.4 0-.7-.2-.9-.5l-2.4-2.4c-.3-.3-.1-.8.3-.8zm3.3-6.4h11.2c.4 0 .7.2.9.5l2.4 2.4c.3.3.1.8-.3.8H15.8c-.4 0-.7-.2-.9-.5l-2.4-2.4c-.3-.3-.1-.8.3-.8z"
              fill="url(#solGrad)"
            />
          </svg>
        );

      // 9. BNB (Official #F3BA2F with geometric diamond lattice)
      case 'BNB':
      case 'BINANCE':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#F3BA2F" />
            <path
              d="M16 7l2.8 2.8-5.6 5.6-2.8-2.8L16 7zm0 18l-2.8-2.8 5.6-5.6 2.8 2.8L16 25zm-9-9l2.8-2.8 2.8 2.8-2.8 2.8L7 16zm18 0l-2.8-2.8 2.8-2.8 2.8 2.8L25 16zm-9-3.2l3.2 3.2-3.2 3.2-3.2-3.2 3.2-3.2z"
              fill="#FFFFFF"
            />
          </svg>
        );

      // 10. LITECOIN (Official #345D9D with white Ł)
      case 'LTC':
      case 'LITECOIN':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#345D9D" />
            <path
              d="M13.8 8h3.4l-2.5 9.4 3.7-1.1-.6 2.2-3.8 1.1-1.2 4.4h9.4l-.8 2h-12l4.4-18z"
              fill="#FFFFFF"
            />
          </svg>
        );

      // 11. AVALANCHE (Official #E84142 with white triangles)
      case 'AVAX':
      case 'AVALANCHE':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#E84142" />
            <path
              d="M16 6l9.5 16.5h-4.3L16 13.5l-2.2 4h-4L16 6zm-7 13l-3 5h5.5l2-3.5L9 19zm14 0l-2 3.5h5.5l-3-5h-.5z"
              fill="#FFFFFF"
            />
          </svg>
        );

      // 12. CHAINLINK (Official #375BD2 with white hexagon links)
      case 'LINK':
      case 'CHAINLINK':
        return (
          <svg viewBox="0 0 32 32" className="w-full h-full" fill="none">
            <circle cx="16" cy="16" r="16" fill="#375BD2" />
            <path
              d="M16 6l8 4.6v9.2L16 24.4l-8-4.6v-9.2L16 6zm0 3.2l-5.3 3.1v6.1L16 21.5l5.3-3.1v-6.1L16 9.2z"
              fill="#FFFFFF"
            />
          </svg>
        );

      // Fallback: Elegant branded circular gradient with coin symbol
      default:
        return (
          <div className="w-full h-full rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center font-bold text-slate-950 text-xs shadow-md">
            {sym.slice(0, 3)}
          </div>
        );
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center ${sizeClasses[size]} ${className}`}>
      {renderSvg()}
      {showNetworkBadge && network && (
        <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-full bg-slate-900 border border-slate-700 text-[8px] font-black font-mono text-amber-300 shadow-md">
          {network}
        </span>
      )}
    </div>
  );
};
