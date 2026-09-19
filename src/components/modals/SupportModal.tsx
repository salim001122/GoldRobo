import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Send, 
  Bot, 
  User, 
  Headphones, 
  Sparkles, 
  ArrowRight, 
  HelpCircle, 
  Trash2, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  Zap,
  Coins,
  ArrowDownToLine,
  ArrowUpFromLine,
  Users,
  Clock
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
  action?: {
    type: 'deposit' | 'withdraw' | 'invite' | 'robot' | 'vip' | 'bonus' | 'telegram';
    label: string;
  };
}

interface QuickQuestion {
  id: string;
  icon: string;
  title: string;
  query: string;
  category: 'deposit' | 'quantify' | 'withdraw' | 'referral' | 'vip' | 'bonus';
}

const QUICK_QUESTIONS: QuickQuestion[] = [
  {
    id: 'q-deposit',
    icon: '💳',
    title: 'How to Deposit USDT?',
    query: 'How do I deposit USDT into my account?',
    category: 'deposit',
  },
  {
    id: 'q-quantify',
    icon: '🤖',
    title: 'How does Daily Quantify work?',
    query: 'How does the daily AI quantification cycle and profit work?',
    category: 'quantify',
  },
  {
    id: 'q-withdraw',
    icon: '💸',
    title: 'Withdrawal Rules & Minimums',
    query: 'What are the withdrawal rules, minimum limit, and processing time?',
    category: 'withdraw',
  },
  {
    id: 'q-referral',
    icon: '👥',
    title: '3-Tier Team Commission',
    query: 'How does the 3-tier referral commission system work?',
    category: 'referral',
  },
  {
    id: 'q-bonus',
    icon: '🎁',
    title: '3% First Deposit Bonus',
    query: 'How do I claim my 3% first deposit welcome bonus?',
    category: 'bonus',
  },
  {
    id: 'q-vip',
    icon: '⭐',
    title: 'VIP Tiers & Daily Rates',
    query: 'What are the VIP tiers and daily profit earning percentages?',
    category: 'vip',
  },
  {
    id: 'q-human',
    icon: '👨‍💼',
    title: 'Human Agent / Telegram Help',
    query: 'How can I speak to a live human official customer service agent?',
    category: 'vip',
  },
];

export const SupportModal: React.FC = () => {
  const { closeModal, openModal, setActiveTab, userState, playAudioTone } = useApp();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputVal, setInputVal] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedTelegram, setCopiedTelegram] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const storageKey = `goldrobo_support_chat_${userState.uid || 'guest'}`;
  const officialTelegramHandle = '@GoldRoboSupport';
  const officialTelegramLink = 'https://t.me/GoldRoboSupport';

  // Initialize messages from localStorage or default greeting
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {
      // ignore
    }

    // Default welcome message
    const welcomeMsg: ChatMessage = {
      id: 'welcome-1',
      sender: 'bot',
      text: `👋 Hello ${userState.username || 'Trader'}! Welcome to **GOLDROBO 24/7 VIP Customer Care**.\n\nI am **RoboCare AI**, your intelligent trading specialist. I can assist you instantly with deposits, daily quantification, withdrawals, VIP tiers, and referral bonuses.\n\nSelect any popular topic below or type your question in any language!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcomeMsg]);
  }, [userState.uid, userState.username]);

  // Save messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      } catch {
        // ignore
      }
    }
  }, [messages, storageKey]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleClearChat = () => {
    const freshWelcome: ChatMessage = {
      id: `welcome-${Date.now()}`,
      sender: 'bot',
      text: `Chat history refreshed. How can I help you today, ${userState.username || 'Trader'}? Ask me anything or tap any quick topic below.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([freshWelcome]);
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  };

  const handleCopyTelegram = () => {
    navigator.clipboard.writeText(officialTelegramHandle);
    setCopiedTelegram(true);
    setTimeout(() => setCopiedTelegram(false), 2000);
  };

  // The Smart Automated Response Engine
  const generateBotResponse = (userQuery: string): { text: string; action?: ChatMessage['action'] } => {
    const q = userQuery.toLowerCase().trim();

    // 1. DEPOSIT / RECHARGE
    if (
      q.includes('deposit') || 
      q.includes('recharge') || 
      q.includes('fund') || 
      q.includes('trc20') || 
      q.includes('bep20') || 
      q.includes('address') || 
      q.includes('jama') || 
      q.includes('paisa daal') ||
      q.includes('how to add money')
    ) {
      return {
        text: `💳 **How to Deposit USDT on GOLDROBO:**\n\n1. Tap the **Deposit** button below or on your Home screen.\n2. Choose your preferred network (**TRC-20** or **BEP-20 / ERC-20**).\n3. Copy your unique generated wallet deposit address or scan the QR code.\n4. Transfer USDT from your crypto wallet (Binance, OKX, Trust Wallet, etc.).\n\n⚡ **Key Details:**\n• **Minimum Deposit:** Only **$10 USDT**\n• **Speed:** Credits within 1–3 network block confirmations.\n• **Bonus:** You get an instant **+3% Welcome Bonus** on your 1st deposit!`,
        action: {
          type: 'deposit',
          label: 'Go to Deposit Screen 💳'
        }
      };
    }

    // 2. QUANTIFY / DAILY PROFIT / ROBOT ACTIVATION
    if (
      q.includes('quantif') || 
      q.includes('robot') || 
      q.includes('bot') || 
      q.includes('activat') || 
      q.includes('trade') || 
      q.includes('cycle') || 
      q.includes('daily profit') || 
      q.includes('earning') || 
      q.includes('munafa') || 
      q.includes('kaise chalaye') || 
      q.includes('40 day')
    ) {
      return {
        text: `🤖 **How AI Quantification & Daily Profit Works:**\n\n1. Go to the **Robot** tab at the bottom center of the screen.\n2. Tap the large glowing button **"1-Click Quantify"**.\n3. The AI node scans high-frequency spreads across top exchanges (Binance, OKX, Bybit, KuCoin) and locks automated arbitrage profit directly into your balance.\n\n📊 **Rules & Yields:**\n• **Frequency:** 1 execution allowed per 24 hours.\n• **Yield Rate:** **3.00% to 6.00% daily** depending on your VIP level.\n• **Investment Cycle:** 40-day principal protection lifecycle.\n• **Profits:** Daily profits are credited immediately and withdrawable anytime!`,
        action: {
          type: 'robot',
          label: 'Open Robot Trading Desk ⚡'
        }
      };
    }

    // 3. WITHDRAW / PAYOUT / CASHOUT
    if (
      q.includes('withdraw') || 
      q.includes('cashout') || 
      q.includes('payout') || 
      q.includes('nikal') || 
      q.includes('minimum withdraw') || 
      q.includes('limit') || 
      q.includes('fee')
    ) {
      return {
        text: `💸 **Withdrawal Rules & Information:**\n\n• **Minimum Withdrawal:** **$10.00 USDT**\n• **Availability:** Available **24 hours / 7 days a week**.\n• **What can be withdrawn?** All daily quantitative earnings, referral commissions, and bonus cash can be withdrawn anytime!\n• **Speed:** Processed via automated on-chain batching within 5–30 minutes.\n• **Security:** Ensure you have configured your 6-digit Security PIN and saved your TRC-20 / BEP-20 payout wallet address correctly.`,
        action: {
          type: 'withdraw',
          label: 'Go to Withdraw Screen 💸'
        }
      };
    }

    // 4. REFERRAL / AFFILIATE / TEAM COMMISSION
    if (
      q.includes('refer') || 
      q.includes('invite') || 
      q.includes('team') || 
      q.includes('commission') || 
      q.includes('rebate') || 
      q.includes('friend') || 
      q.includes('dost') || 
      q.includes('code')
    ) {
      return {
        text: `👥 **GOLDROBO 3-Tier Multi-Level Affiliate System:**\n\nShare your username or invite link with friends to earn perpetual multi-tier commissions:\n\n🥇 **Level 1 (Direct Invites):** **10%** Instant Deposit Rebate + **8%** Daily Quantify Profit Share!\n🥈 **Level 2 (Secondary Team):** **3%** Team Rebate\n🥉 **Level 3 (Indirect Network):** **1%** Team Rebate\n\n🔑 **Your Referral Code:** Your unique **@username** is automatically your referral code! Real-time member tracking and live commission accounting are available in your Team Dashboard.`,
        action: {
          type: 'invite',
          label: 'Open Team & Invite Hub 👥'
        }
      };
    }

    // 5. BONUS / WELCOME BONUS / MYSTERY CHEST
    if (
      q.includes('bonus') || 
      q.includes('welcome') || 
      q.includes('first deposit') || 
      q.includes('chest') || 
      q.includes('inaam') || 
      q.includes('gift')
    ) {
      return {
        text: `🎁 **Promotional Bonuses & Mystery Chests:**\n\n• **3% First Deposit Cash Bonus:** When you make your first USDT deposit, an extra 3% cash is credited automatically to your trading balance.\n• **Daily Check-in Streaks:** Visit the Bonus section daily to claim free crypto check-in rewards and build your consecutive streak multipliers.\n• **VIP Level Chests:** Higher VIP tiers unlock random Mystery Airdrop Chests containing cash vouchers.`,
        action: {
          type: 'bonus',
          label: 'Check Bonus & Chests 🎁'
        }
      };
    }

    // 6. VIP TIERS / PACKAGES
    if (
      q.includes('vip') || 
      q.includes('tier') || 
      q.includes('package') || 
      q.includes('rates') || 
      q.includes('percent') || 
      q.includes('level')
    ) {
      return {
        text: `⭐ **VIP Tiers & Daily Profit Yield Structure:**\n\n• **VIP 1:** $10 – $99 USDT ➔ **3.0% Daily** (e.g. $100 earns $3.00/day)\n• **VIP 2:** $100 – $499 USDT ➔ **3.5% Daily**\n• **VIP 3:** $500 – $1,999 USDT ➔ **4.0% Daily**\n• **VIP 4:** $2,000 – $4,999 USDT ➔ **4.5% Daily**\n• **VIP 5:** $5,000 – $9,999 USDT ➔ **5.0% Daily**\n• **VIP 6:** $10,000 – $29,999 USDT ➔ **5.5% Daily**\n• **VIP 7:** $30,000+ USDT ➔ **6.0% Daily**\n\nYour account auto-upgrades immediately as your total deposit crosses each threshold.`,
        action: {
          type: 'vip',
          label: 'View All VIP Privileges ⭐'
        }
      };
    }

    // 7. HUMAN AGENT / TELEGRAM / CONTACT / NUMBER
    if (
      q.includes('human') || 
      q.includes('agent') || 
      q.includes('telegram') || 
      q.includes('admin') || 
      q.includes('contact') || 
      q.includes('owner') || 
      q.includes('whatsapp') || 
      q.includes('phone') || 
      q.includes('call') || 
      q.includes('baat')
    ) {
      return {
        text: `👨‍💼 **Official Live Human Support:**\n\nOur certified support managers and compliance supervisors are available 24/7 on Telegram for custom inquiries, large OTC transactions, or account verification:\n\n📱 **Telegram Support:** [${officialTelegramHandle}](${officialTelegramLink})\n📢 **Official Announcements Channel:** @GoldRoboOfficial\n\n⏱️ **Typical response time:** 1–5 minutes.\nPlease never share your security password or PIN with anyone! Official staff will NEVER ask for your private key.`,
        action: {
          type: 'telegram',
          label: 'Open Official Telegram Support 📱'
        }
      };
    }

    // 8. SECURITY / PIN / 2FA / PASSWORD
    if (
      q.includes('pin') || 
      q.includes('security') || 
      q.includes('password') || 
      q.includes('reset') || 
      q.includes('safe') || 
      q.includes('2fa')
    ) {
      return {
        text: `🔒 **Account Security & Withdrawal PIN:**\n\n• Your account is safeguarded by AES-256 encrypted protocols.\n• For security, every withdrawal requires your 6-digit **Security PIN**.\n• If you need to verify or update your security credentials, tap your profile avatar in the top header.`,
      };
    }

    // 9. GREETINGS
    if (
      q === 'hi' || 
      q === 'hello' || 
      q === 'hey' || 
      q === 'salam' || 
      q.startsWith('asalam') || 
      q.includes('kese ho') || 
      q.includes('how are you')
    ) {
      return {
        text: `👋 Hello there! How are you doing today? I am here 24/7 to assist you with any questions about deposits, trading robots, daily profits, or withdrawals. What can I do for you?`,
      };
    }

    // 10. INTELLIGENT FALLBACK
    const ticketId = `GR-${Math.floor(100000 + Math.random() * 900000)}`;
    return {
      text: `🤖 Thank you for reaching out! I have recorded your inquiry under Support Ticket **#${ticketId}**.\n\n• For immediate answers, you can tap any of the popular topics below (Deposit, Quantify, Withdraw, Referral).\n• For specialized account investigations or human supervisor help, you can connect directly with our 24/7 official Telegram support team at **${officialTelegramHandle}**.`,
      action: {
        type: 'telegram',
        label: `Connect Telegram (${officialTelegramHandle})`
      }
    };
  };

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputVal).trim();
    if (!query || isTyping) return;

    if (playAudioTone) playAudioTone('click');

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    if (!textToSend) setInputVal('');
    setIsTyping(true);

    // Simulate natural AI agent typing delay
    setTimeout(() => {
      const response = generateBotResponse(query);
      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        action: response.action,
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      if (playAudioTone) playAudioTone('success');
    }, 650);
  };

  const handleActionClick = (action: ChatMessage['action']) => {
    if (!action) return;
    if (playAudioTone) playAudioTone('click');

    switch (action.type) {
      case 'deposit':
        closeModal();
        openModal('deposit');
        break;
      case 'withdraw':
        closeModal();
        openModal('withdraw');
        break;
      case 'invite':
        closeModal();
        openModal('invite');
        break;
      case 'robot':
        closeModal();
        setActiveTab('robot');
        break;
      case 'vip':
        closeModal();
        openModal('vip');
        break;
      case 'bonus':
        closeModal();
        openModal('bonus');
        break;
      case 'telegram':
        window.open(officialTelegramLink, '_blank', 'noopener,noreferrer');
        break;
      default:
        break;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg rounded-3xl bg-[#090f1f] border border-amber-500/40 shadow-2xl shadow-amber-500/20 flex flex-col h-[88vh] max-h-[720px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#0d162e] via-[#111e3f] to-[#0d162e] border-b border-slate-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-md shadow-amber-500/25">
                <div className="w-full h-full rounded-[14px] bg-[#090f20] flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-amber-400" />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#090f20] animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
                  <span>GOLDROBO Support</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    24/7 VIP
                  </span>
                </h3>
              </div>
              <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                <span>Online • RoboCare AI & Live Desk</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              id="btn-clear-chat"
              onClick={handleClearChat}
              className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
              title="Clear Chat History"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              id="btn-close-support"
              onClick={closeModal}
              className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Status Bar */}
        <div className="px-4 py-2 bg-[#0b1226] border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-white font-bold">@{userState.username || 'Trader'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-400 border border-slate-700">
              VIP {userState.vipLevel}
            </span>
          </div>

          <button
            onClick={handleCopyTelegram}
            className="flex items-center gap-1 text-sky-400 hover:text-sky-300 transition-colors"
            title="Official Telegram Support"
          >
            <span>{copiedTelegram ? 'Copied!' : officialTelegramHandle}</span>
            {copiedTelegram ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3.5 text-xs">
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            return (
              <div 
                key={msg.id}
                className={`flex gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0 font-bold shadow-md shadow-amber-500/20 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-3 shadow-md ${
                  isBot 
                    ? 'bg-[#121c38] text-slate-200 border border-slate-700/80 rounded-tl-sm' 
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-sm shadow-amber-500/20'
                }`}>
                  {/* Message Content with simple bold & newline rendering */}
                  <div className="whitespace-pre-line leading-relaxed">
                    {msg.text.split('\n').map((line, idx) => {
                      // bold text replacement **text**
                      const parts = line.split(/(\*\*.*?\*\*)/g);
                      return (
                        <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>
                          {parts.map((part, pIdx) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={pIdx} className={isBot ? 'text-amber-300 font-bold' : 'text-black font-black'}>{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          })}
                        </p>
                      );
                    })}
                  </div>

                  {/* Interactive Action Button if attached */}
                  {msg.action && (
                    <div className="mt-3 pt-2 border-t border-slate-700/60">
                      <button
                        onClick={() => handleActionClick(msg.action)}
                        className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:from-amber-400 hover:to-yellow-300 active:scale-95 transition-all cursor-pointer"
                      >
                        <span>{msg.action.label}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-950" />
                      </button>
                    </div>
                  )}

                  <div className={`text-[9px] mt-1.5 text-right font-mono ${isBot ? 'text-slate-500' : 'text-slate-900 font-semibold'}`}>
                    {msg.timestamp}
                  </div>
                </div>

                {!isBot && (
                  <div className="w-7 h-7 rounded-xl bg-slate-800 text-amber-400 border border-slate-700 flex items-center justify-center shrink-0 font-bold text-[11px] font-mono mt-0.5">
                    {userState.username ? userState.username.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl rounded-tl-sm bg-[#121c38] border border-slate-700/80 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="text-[11px] text-slate-400 font-mono ml-2">RoboCare is typing...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick FAQ Questions Carousel */}
        <div className="p-2.5 bg-[#0b1226] border-t border-slate-800/80 shrink-0">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 px-1">
            <span className="flex items-center gap-1 font-semibold text-amber-400">
              <Sparkles className="w-3 h-3" />
              <span>Instant Answers & FAQs</span>
            </span>
            <span className="text-[10px] text-slate-500">Tap to ask instantly</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q.id}
                onClick={() => handleSendMessage(q.query)}
                className="whitespace-nowrap px-2.5 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/50 text-slate-300 hover:text-white text-[11px] font-medium flex items-center gap-1.5 active:scale-95 transition-all shrink-0 cursor-pointer shadow-sm"
              >
                <span>{q.icon}</span>
                <span>{q.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-[#080d1a] border-t border-slate-800/90 flex items-center gap-2 shrink-0"
        >
          <input
            id="input-support-chat"
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Type your question in any language (e.g. Deposit, Withdraw, VIP)..."
            className="flex-1 py-2.5 px-3.5 rounded-xl bg-[#0f172a] border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-amber-500/70 transition-colors"
          />

          <button
            id="btn-send-support-msg"
            type="submit"
            disabled={!inputVal.trim() || isTyping}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-md shadow-amber-500/20"
          >
            <span className="hidden sm:inline text-xs">Send</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
