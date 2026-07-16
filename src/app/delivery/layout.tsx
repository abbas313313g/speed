
"use client";

import { useState, useEffect } from 'react';
import DeliveryLoginPage from './login/page';
import DeliveryPage from './page';
import DeliveryStatsPage from './stats/page';
import DeliveryOrderDetailPage from './order/[id]/page';
import { cn } from '@/lib/utils';

declare global {
  interface Window {
    OneSignal: any;
  }
}

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

    // تهيئة OneSignal
    const initOneSignal = () => {
        const script = document.createElement('script');
        script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
        script.async = true;
        document.head.appendChild(script);

        window.OneSignal = window.OneSignal || [];
        window.OneSignal.push(() => {
            window.OneSignal.init({
                appId: "fbb7ab81-ec87-4f8c-aaa8-de12522e62b3",
                safari_web_id: "web.onesignal.auto.52026857-e6f6-4528-9892-23c2a613612d",
                notifyButton: {
                    enable: true,
                },
            });

            // ربط المندوب بالمعرف الخارجي إذا كان مسجلاً
            if (id) {
                window.OneSignal.login(id);
            }
        });
    };

    initOneSignal();
  }, []);

  const handleNavigateToOrder = (orderId: string) => {
      setSelectedOrderId(orderId);
      setActiveTab(3);
  };

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
