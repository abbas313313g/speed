
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';

export const useBanners = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useBanners must be used within an AppProvider');
    }
    return {
        banners: context.banners,
        isLoading: context.isLoading,
        addBanner: context.addBanner,
        updateBanner: context.updateBanner,
        deleteBanner: context.deleteBanner,
    };
};
