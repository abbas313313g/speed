
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useTelegramConfigs = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useTelegramConfigs must be used within an AppProvider');
    }
    return {
        telegramConfigs: context.telegramConfigs,
        isLoading: context.isLoading,
        addTelegramConfig: context.addTelegramConfig,
        deleteTelegramConfig: context.deleteTelegramConfig,
    };
};
