"use client";

import { useState } from 'react';
import { RestaurantProvider } from '@/contexts/RestaurantContext';
import RestaurantLoginPage from './login/page';
import RestaurantDashboardPage from './page';
import RestaurantHistoryPage from './history/page';

export default function RestaurantLayout() {
  const [activeTab, setActiveTab] = useState(0); // 0: Login, 1: Dashboard, 2: History

  return (
    <RestaurantProvider>
        <div className="mx-auto flex h-screen max-w-4xl flex-col bg-card shadow-lg relative overflow-hidden">
            <main className="flex-1 relative">
                <div 
                className="spa-stack-container" 
                style={{ 
                    width: '300%',
                    transform: `translateX(${activeTab * (100 / 3)}%)` 
                }} 
                >
                <div className="spa-page-view">
                    <RestaurantLoginPage onLogin={() => setActiveTab(1)} />
                </div>
                <div className="spa-page-view">
                    <RestaurantDashboardPage onNavigate={(tab: number) => setActiveTab(tab)} />
                </div>
                <div className="spa-page-view">
                    <RestaurantHistoryPage onBack={() => setActiveTab(1)} />
                </div>
                </div>
            </main>
        </div>
    </RestaurantProvider>
  );
}