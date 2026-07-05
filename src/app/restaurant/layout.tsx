
"use client";

import { useState, useEffect, useContext } from 'react';
import { RestaurantProvider, RestaurantContext } from '@/contexts/RestaurantContext';
import RestaurantLoginPage from './login/page';
import RestaurantDashboardPage from './page';
import RestaurantHistoryPage from './history/page';

function RestaurantLayoutContent() {
  const [activeTab, setActiveTab] = useState(0); // 0: Login, 1: Dashboard, 2: History
  const context = useContext(RestaurantContext);

  useEffect(() => {
    if (context?.restaurant) {
      setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  }, [context?.restaurant]);

  return (
    <div className="mx-auto flex h-screen max-w-4xl flex-col bg-card shadow-lg relative overflow-hidden">
        <main className="flex-1 relative">
            <div 
                className="spa-stack-container" 
                style={{ 
                    transform: `translateX(${activeTab * 100}%)` 
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
  );
}

export default function RestaurantLayout() {
  return (
    <RestaurantProvider>
        <RestaurantLayoutContent />
    </RestaurantProvider>
  );
}
