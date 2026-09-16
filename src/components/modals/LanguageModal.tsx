import React from 'react';
import { X, Globe, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const LanguageModal: React.FC = () => {
  const { closeModal, userState, setLanguage } = useApp();

  const languages = [
    { code: 'en', name: 'English', native: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', native: 'Español', flag: '🇪🇸' },
    { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
    { code: 'zh', name: 'Chinese', native: '简体中文', flag: '🇨🇳' },
    { code: 'hi', name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
    { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
    { code: 'ru', name: 'Russian', native: 'Русский', flag: '🇷🇺' },
    { code: 'tr', name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
    { code: 'ja', name: 'Japanese', native: '日本語', flag: '🇯🇵' },
    { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇦🇪' },
  ];

  const handleSelect = (code: string) => {
    setLanguage(code);
    setTimeout(() => {
      closeModal();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#0f172a] border border-blue-500/30 p-5 shadow-2xl shadow-blue-500/20 space-y-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">Select Language</h3>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Languages list */}
        <div className="grid grid-cols-1 gap-2">
          {languages.map((lang) => {
            const isSelected = userState.selectedLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => handleSelect(lang.code)}
                className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{lang.flag}</span>
                  <div className="text-left">
                    <div className="text-xs font-bold text-white">{lang.name}</div>
                    <div className="text-[10px] text-slate-400">{lang.native}</div>
                  </div>
                </div>

                {isSelected && (
                  <Check className="w-4 h-4 text-cyan-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
