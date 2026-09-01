
"use client";

import { useState, useEffect, useContext } from 'react';
import { RestaurantProvider, RestaurantContext } from '@/contexts/RestaurantContext';
import RestaurantLoginPage from './login/page';
import RestaurantDashboardPage from './page';
import RestaurantProductsPage from './products-view';
import RestaurantHistoryPage from './history/page';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

function RestaurantLayoutContent() {
  const [activeTab, setActiveTabState] = useState(-1); // -1: Checking Auth, 0: Login, 1: Dashboard...
  const context = useContext(RestaurantContext);

  useEffect(() => {
    if (!context?.isInitialCheckDone) return;

    if (context.restaurant) {
      if (activeTab <= 0) setActiveTabState(1);
    } else {
      setActiveTabState(0);
    }
  }, [context?.restaurant, context?.isInitialCheckDone]);

  // دعم زر الرجوع لنسخة المطعم
  useEffect(() => {
    if (typeof window !== 'undefined') {
        if (window.history.state === null) {
            window.history.replaceState({ restTab: activeTab }, '');
        }

        const handlePop = (e: PopStateEvent) => {
            if (e.state && typeof e.state.restTab === 'number') {
                setActiveTabState(e.state.restTab);
            }
        };
        window.addEventListener('popstate', handlePop);
        return () => window.removeEventListener('popstate', handlePop);
    }
  }, [activeTab]);

  const setActiveTab = (idx: number) => {
    setActiveTabState(idx);
    if (typeof window !== 'undefined') {
        window.history.pushState({ restTab: idx }, '');
    }
  };

  if (activeTab === -1 || !context?.isInitialCheckDone) {
      return (
          <div className="flex h-screen w-full items-center justify-center bg-background">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
      );
  }

  return (
    <div className={cn("flex h-screen w-full flex-col bg-card shadow-2xl relative overflow-hidden restaurant-active")} dir="rtl">
        <main className="flex-1 relative overflow-hidden">
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
