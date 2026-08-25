
"use client";

import { useState, useEffect, useContext } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, AlertCircle, Navigation, MapPin, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isLocationInAllowedZones, safeStorage } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/AppContext';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';

import HomePage from './home/page';
import RestaurantsPage from './restaurants/page';
import ProductsPage from './products/page';
import CartPage from './cart/page';
import OrdersPage from './orders/page';
import AccountPage from './account/page';
import AddAddressPage from './account/add-address/page';
import SupportPage from './support/page';
import PrivacyPolicyPage from './privacy-policy/page';
import ProductDetailPage from './products/[id]/page';
import RestaurantProductsPage from './restaurants/[id]/page';

export default function MainAppLayout() {
  const context = useContext(AppContext);
  const { settings } = useAppSettings();
  const { addresses, addAddress } = useAddresses();
  const { toast } = useToast();
  
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', details: '', lat: 0, lng: 0 });
  const [islocLoading, setIslocLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  if (!context) return null;
  const { activeTab, syncUserByPhone, isMainDataReady } = context;

  // السبلاش يختفي فوراً بعد 500 ملي ثانية لضمان ظهور الختم وسرعة الإقلاع
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 500); 
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showSplash && !settings?.isMaintenanceMode) {
      const storedUserId = safeStorage.get('speedShopUserId');
      if (!storedUserId && addresses.length === 0 && !safeStorage.get('speedShopSetupDone')) {
          setShowAddressPrompt(true);
      }
    }
  }, [showSplash, settings?.isMaintenanceMode, addresses.length]);

  const handleGetLocation = () => {
    setIslocLoading(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                if (!isLocationInAllowedZones(latitude, longitude)) {
                    setIsBlocked(true);
                    setShowAddressPrompt(false);
                } else {
                    setNewAddr(prev => ({ ...prev, lat: latitude, lng: longitude }));
                    toast({ title: "تم تحديد موقعك بدقة بنجاح 🛰️" });
                }
                setIslocLoading(false);
            },
            () => { toast({ title: "يرجى تفعيل الموقع", variant: "destructive" }); setIslocLoading(false); },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    }
  };

  const handleSaveAddress = async () => {
    if (!newAddr.name || !newAddr.phone || newAddr.lat === 0) return;
    setIsSaving(true);
    try {
        let currentDeviceId = safeStorage.get('speedShopDeviceId') || uuidv4();
        safeStorage.set('speedShopDeviceId', currentDeviceId);
        
        const phoneQuery = query(collection(db, "addresses"), where("phone", "==", newAddr.phone), limit(1));
        const phoneSnap = await getDocs(phoneQuery);
        
        if (!phoneSnap.empty) {
            const existingData = phoneSnap.docs[0].data();
            if (existingData.deviceId && existingData.deviceId !== currentDeviceId) {
                toast({ title: "هذا الرقم مسجل فعلاً", variant: "destructive" });
                setIsSaving(false); return;
            }
        }
        await syncUserByPhone(newAddr.phone);
        await addAddress({ ...newAddr, latitude: newAddr.lat, longitude: newAddr.lng, deliveryZone: "عام", branchId: "main" } as any);
        safeStorage.set('speedShopSetupDone', 'true');
        setShowAddressPrompt(false);
    } catch (e) { toast({ title: "خطأ في الاتصال", variant: "destructive" }); } finally { setIsSaving(false); }
  };

  const content = (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <main className="flex-1 relative z-0 overflow-hidden">
        <div className="spa-stack-container" style={{ transform: `translateX(${activeTab * 100}%)` }}>
          <div className="spa-page-view"><HomePage /></div>
          <div className="spa-page-view"><RestaurantsPage /></div>
          <div className="spa-page-view"><ProductsPage /></div>
          <div className="spa-page-view"><CartPage /></div>
          <div className="spa-page-view"><OrdersPage /></div>
          <div className="spa-page-view"><AccountPage /></div>
          <div className="spa-page-view"><AddAddressPage /></div>
          <div className="spa-page-view"><SupportPage /></div>
          <div className="spa-page-view"><PrivacyPolicyPage /></div>
          <div className="spa-page-view"><ProductDetailPage /></div>
          <div className="spa-page-view"><RestaurantProductsPage /></div>
        </div>
      </main>
      <BottomNav />
    </div>
  );

  return (
    <div className="h-[100dvh] w-full bg-background flex flex-col relative overflow-hidden">
        {showSplash && (
            <div className="fixed inset-0 flex flex-col items-center justify-center bg-white z-[100]">
                <div className="p-8 rounded-[2.5rem] stamp-effect flex flex-col items-center justify-center">
                    <h1 className="text-4xl font-black text-white italic tracking-tighter">SPEED</h1>
                    <h1 className="text-4xl font-black text-white italic tracking-tighter leading-none">SHOP</h1>
                </div>
                <div className="mt-8 flex flex-col items-center gap-2 animate-pulse">
                    <p className="text-primary font-black text-[10px] tracking-widest uppercase">أسرع توصيل في منطقتك</p>
                </div>
            </div>
        )}
        {isBlocked ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-8 text-center bg-background">
              <AlertCircle className="h-20 w-20 text-destructive mb-6" />
              <h1 className="text-2xl font-black mb-4">نعتذر منك جداً</h1>
              <p className="text-muted-foreground font-bold">خدمتنا متوفرة في بابل فقط حالياً.</p>
            </div>
        ) : settings?.isMaintenanceMode ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-10 text-center bg-background">
                <HardHat className="h-20 w-20 text-primary mb-6 animate-bounce"/>
                <h1 className="text-2xl font-black mb-4">المتجر في صيانة</h1>
                <p className="text-muted-foreground font-bold">{settings.maintenanceMessage || 'سنعود قريباً جداً!'}</p>
            </div>
        ) : content}

        <Sheet open={showAddressPrompt} onOpenChange={() => {}}>
            <SheetContent side="bottom" className="h-[75vh] p-0 bg-background rounded-t-[3rem] overflow-hidden">
                <div className="p-6 space-y-6">
                    <div className="flex items-center gap-4 py-4">
                        <div className="p-3 bg-primary/10 rounded-2xl"><Navigation className="h-8 w-8 text-primary" /></div>
                        <div><SheetTitle className="text-2xl font-black">مرحباً بك!</SheetTitle></div>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Input value={newAddr.name} onChange={(e)=>setNewAddr({...newAddr, name: e.target.value})} placeholder="الاسم الكامل" className="h-12 rounded-xl bg-muted/30 border-none" />
                            <Input value={newAddr.phone} onChange={(e)=>setNewAddr({...newAddr, phone: e.target.value})} placeholder="07XXXXXXXX" type="tel" className="h-12 rounded-xl bg-muted/30 border-none text-center font-bold" />
                        </div>
                        <button onClick={handleGetLocation} className={`w-full py-8 flex flex-col items-center gap-2 border-4 border-dashed rounded-[2.5rem] transition-all ${newAddr.lat !== 0 ? 'border-green-500 bg-green-50' : 'border-primary/20 bg-card'}`}>
                            {islocLoading ? <Loader2 className="animate-spin h-8 w-8 text-primary" /> : newAddr.lat !== 0 ? <CheckCircle2 className="h-8 w-8 text-green-500" /> : <MapPin className="h-8 w-8 text-primary" />}
                            <span className="font-black text-sm">{newAddr.lat !== 0 ? "تم استلام الموقع ✅" : "اضغط لتحديد موقعك (GPS)"}</span>
                        </button>
                        <Button onClick={handleSaveAddress} className="w-full h-16 rounded-[1.8rem] text-xl font-black shadow-xl" disabled={isSaving || newAddr.lat === 0}>
                            {isSaving ? "جارِ الحفظ..." : "حفظ وبدء التسوق"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    </div>
  );
}
