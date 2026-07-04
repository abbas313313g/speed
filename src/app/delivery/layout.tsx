"use client";

import { useState, useEffect } from 'react';
import DeliveryLoginPage from './login/page';
import DeliveryPage from './page';
import DeliveryStatsPage from './stats/page';

export default function DeliveryLayout() {
  const [activeTab, setActiveTab] = useState(0); // 0: Login, 1: Dashboard, 2: Stats
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const id = localStorage.getItem('deliveryWorkerId');
    if (id) {
        setIsAuth(true);
        setActiveTab(1);
    }
  }, []);

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-card shadow-lg relative overflow-hidden">
      <main className="flex-1 relative">
        <div 
          className="spa-stack-container" 
          style={{ 
            transform: `translateX(${activeTab * 100}%)` 
          }} 
        >
          <div className="spa-page-view">
             <DeliveryLoginPage onLogin={() => { setIsAuth(true); setActiveTab(1); }} />
          </div>
          <div className="spa-page-view">
             <DeliveryPage onNavigate={(tab: number) => setActiveTab(tab)} />
          </div>
          <div className="spa-page-view">
             <DeliveryStatsPage onBack={() => setActiveTab(1)} />
          </div>
        </div>
      </main>
    </div>
  );
}