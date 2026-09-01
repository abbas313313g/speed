
"use client";

import { useState, useEffect } from 'react';
import DeliveryLoginPage from './login/page';
import DeliveryPage from './page';
import DeliveryStatsPage from './stats/page';
import DeliveryOrderDetailPage from './order/[id]/page';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useFcm } from '@/hooks/useFcm';

export default function DeliveryLayout() {
  const [activeTab, setActiveTab] = useState(-1); 
  const [isAuth, setIsAuth] = useState(false);
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    let id: string | null = null;
    try {
        id = localStorage.getItem('deliveryWorkerId');
    } catch (e) {}

    if (id) {
        setWorkerId(id);
        setIsAuth(true);
        setActiveTab(1);
    } else {
        setActiveTab(0);
    }
  }, []);

  // تفعيل إشعارات جوجل للمندوب
  useFcm('deliveryWorkers', workerId);

  const handleNavigateToOrder = (orderId: string) => {
      setSelectedOrderId(orderId);
      setActiveTab(3);
  };

  if (activeTab === -1) return <div className="flex h-screen items-center justify-center bg-background"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

  return (
    <div className={cn("flex h-screen w-full flex-col bg-card shadow-lg relative overflow-hidden delivery-active")} dir="rtl">
      <main className="flex-1 relative overflow-hidden">
        <div 
          className="spa-stack-container" 
          style={{ 
            transform: `translateX(${activeTab * 100}%)` 
          }} 
        >
          <div className="spa-page-view">
             <DeliveryLoginPage onLogin={() => { 
                 const id = localStorage.getItem('deliveryWorkerId');
                 setWorkerId(id);
                 setIsAuth(true); 
                 setActiveTab(1); 
             }} />
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
                 <div className="flex h-full items-center justify-center font-bold">يرجى العودة واختيار طلب</div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}
