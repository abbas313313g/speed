"use client";

import { useState, useEffect, useContext } from 'react';
import { RestaurantProvider, RestaurantContext } from '@/contexts/RestaurantContext';
import RestaurantLoginPage from './login/page';
import RestaurantDashboardPage from './page';
import RestaurantProductsPage from './products-view';
import RestaurantHistoryPage from './history/page';
import { cn } from '@/lib/utils';

function RestaurantLayoutContent() {
  const [activeTab, setActiveTab] = useState(0); // 0: Login, 1: Orders (Dashboard), 2: Products, 3: History
  const context = useContext(RestaurantContext);

  useEffect(() => {
    if (context?.restaurant) {
      if (activeTab === 0) setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  }, [context?.restaurant, activeTab]);

  return (
    <div className={cn("mx-auto flex h-screen max-w-4xl flex-col bg-card shadow-lg relative overflow-hidden restaurant-active")} dir="rtl">
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
                    <RestaurantProductsPage onBack={() => setActiveTab(1)} />
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