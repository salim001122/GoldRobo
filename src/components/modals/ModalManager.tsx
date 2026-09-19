import React from 'react';
import { useApp } from '../../context/AppContext';
import { DepositModal } from './DepositModal';
import { WithdrawModal } from './WithdrawModal';
import { InviteModal } from './InviteModal';
import { PositionsModal } from './PositionsModal';
import { VipModal } from './VipModal';
import { AboutModal } from './AboutModal';
import { BonusModal } from './BonusModal';
import { HistoryModal } from './HistoryModal';
import { ProfileModal } from './ProfileModal';
import { LanguageModal } from './LanguageModal';
import { CoinInfoModal } from './CoinInfoModal';
import { QuantifyExecutionModal } from './QuantifyExecutionModal';
import { ApiKeyModal } from './ApiKeyModal';
import { SupportModal } from './SupportModal';

export const ModalManager: React.FC = () => {
  const { activeModal } = useApp();

  if (!activeModal) return null;

  switch (activeModal) {
    case 'deposit':
      return <DepositModal />;
    case 'withdraw':
      return <WithdrawModal />;
    case 'invite':
      return <InviteModal />;
    case 'positions':
      return <PositionsModal />;
    case 'vip':
      return <VipModal />;
    case 'about':
      return <AboutModal />;
    case 'bonus':
      return <BonusModal />;
    case 'history':
      return <HistoryModal />;
    case 'profile':
      return <ProfileModal />;
    case 'language':
      return <LanguageModal />;
    case 'coinInfo':
      return <CoinInfoModal />;
    case 'quantifyExecution':
      return <QuantifyExecutionModal />;
    case 'apiKey':
      return <ApiKeyModal />;
    case 'support':
      return <SupportModal />;
    default:
      return null;
  }
};
