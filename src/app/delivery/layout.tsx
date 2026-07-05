"use client";

import { useState, useEffect } from 'react';
import DeliveryLoginPage from './login/page';
import DeliveryPage from './page';
import DeliveryStatsPage from './stats/page';
import DeliveryOrderDetailPage from './order/[id]/page';

export default function DeliveryLayout() {
  const [activeTab, setActiveTab] = useState(0); // 0: Login, 1: Dashboard, 2: Stats, 3: OrderDetail
  const [isAuth, setIsAuth] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('deliveryWorkerId');
    if (id) {
        setIsAuth(true);
        setActiveTab(1);
    }
  }, []);

  const handleNavigateToOrder = (orderId: string) => {
      setSelectedOrderId(orderId);
      setActiveTab(3);
  };

  const handleNavigateToStats = () => {
      setActiveTab(2);
  };

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-card shadow-lg relative overflow-hidden" dir="rtl">
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
             <DeliveryPage 
                onNavigate={setActiveTab} 
                onViewOrder={handleNavigateToOrder}
             />
          </div>
          <div className="spa-page-view">
             <DeliveryStatsPage onBack={() => setActiveTab(1)} />
          </div>
          <div className="spa-page-view">
             {selectedOrderId ? (
                 <DeliveryOrderDetailPage 
                    orderId={selectedOrderId} 
                    onBack={() => setActiveTab(1)} 
                 />
             ) : (
                 <div className="flex h-full items-center justify-center font-bold">لم يتم اختيار طلب</div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}