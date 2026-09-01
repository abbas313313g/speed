
"use client";

import { useState, useEffect } from 'react';
import DeliveryLoginPage from './login/page';
import DeliveryPage from './page';
import DeliveryStatsPage from './stats/page';
import DeliveryOrderDetailPage from './order/[id]/page';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

declare global {
  interface Window {
    OneSignal: any;
  }
}

export default function DeliveryLayout() {
  const [activeTab, setActiveTab] = useState(-1); // -1: Checking Auth, 0: Login, 1: Dashboard...
  const [isAuth, setIsAuth] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    let id: string | null = null;
    try {
        id = localStorage.getItem('deliveryWorkerId');
    } catch (e) {}

    if (id) {
        setIsAuth(true);
        setActiveTab(1);
    } else {
        setActiveTab(0);
    }

    const initOneSignal = () => {
        try {
            const script = document.createElement('script');
            script.src = "https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js";
            script.async = true;
            document.head.appendChild(script);

            window.OneSignal = window.OneSignal || [];
            window.OneSignal.push(() => {
                window.OneSignal.init({
                    appId: "48becd5d-aae6-4e25-8f8d-451b8ec5ef8a",
                    allowLocalhostAsSecureOrigin: true,
                    notifyButton: { enable: true, position: 'bottom-left' },
                    welcomeNotification: { title: "سبيد شوب", message: "تم تفعيل إشعارات المهام بنجاح! 🚀" }
                });
                if (id) {
                    window.OneSignal.login(id);
                }
            });
        } catch (e) {
            console.error("OneSignal Init Error:", e);
        }
    };

    initOneSignal();

    return () => {
        if (window.OneSignal) {
            try { window.OneSignal.logout(); } catch(e) {}
        }
    };
  }, []);

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
                 setIsAuth(true); 
                 setActiveTab(1); 
                 const id = localStorage.getItem('deliveryWorkerId');
                 if (id && window.OneSignal) window.OneSignal.login(id);
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
