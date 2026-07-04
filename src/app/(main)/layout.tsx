"use client";

import { useState, useEffect, useContext } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { isLocationInAllowedZones } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/contexts/AppContext';

import HomePage from './home/page';
import RestaurantsPage from './restaurants/page';
import ProductsPage from './products/page';
import CartPage from './cart/page';
import OrdersPage from './orders/page';
import AccountPage from './account/page';
import AddAddressPage from './account/add-address/page';
import SupportPage from './support/page';
import PrivacyPolicyPage from './privacy-policy/page';

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);
  const { settings, isLoading: settingsLoading } = useAppSettings();
  const { addresses, addAddress } = useAddresses();
  const { toast } = useToast();
  
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '' });
  const [islocLoading, setIslocLoading] = useState(false);

  if (!context) return null;
  const { activeTab } = context;

  useEffect(() => {
    if (!settingsLoading && addresses.length === 0) {
      setShowAddressPrompt(true);
    }
  }, [settingsLoading, addresses]);

  const handleGetLocation = () => {
    setIslocLoading(true);
    if (!navigator.geolocation) {
      toast({ title: "الموقع غير مدعوم", description: "متصفحك لا يدعم خدمة تحديد الموقع", variant: "destructive" });
      setIslocLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isLocationInAllowedZones(latitude, longitude)) {
          setIsBlocked(true);
          setShowAddressPrompt(false);
        } else {
          toast({ title: "تم تحديد الموقع بنجاح" });
          setNewAddr(prev => ({ ...prev, lat: latitude, lng: longitude } as any));
        }
        setIslocLoading(false);
      },
      () => {
        toast({ title: "فشل تحديد الموقع", description: "يرجى تفعيل الـ GPS وإعطاء الإذن للمتصفح", variant: "destructive" });
        setIslocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveAddress = () => {
    if (!newAddr.name || !newAddr.phone) {
      toast({ title: "بيانات ناقصة", description: "يرجى كتابة الاسم ورقم الهاتف لإكمال التسجيل", variant: "destructive" });
      return;
    }
    addAddress({
      ...newAddr,
      deliveryZone: "تلقائي",
      latitude: (newAddr as any).lat || 0,
      longitude: (newAddr as any).lng || 0
    });
    setShowAddressPrompt(false);
    toast({ title: "أهلاً بك!", description: "تم حفظ عنوانك، استمتع بالتسوق" });
  };

  if (settingsLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary"/>
            <p className="mt-4 text-muted-foreground animate-pulse font-bold">جارِ تشغيل سبيد شوب...</p>
        </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-8 text-center animate-in fade-in zoom-in duration-500">
        <AlertCircle className="h-24 w-24 text-destructive mb-6" />
        <h1 className="text-3xl font-black mb-4 text-primary">نعتذر منك جداً</h1>
        <p className="text-muted-foreground text-xl leading-relaxed">
          تطبيق سبيد شوب مخصص حالياً لخدمة مناطق <br/><span className="text-foreground font-black underline">(المدحتية، الهاشمية، القاسم)</span> فقط.
          <br/> انتظرنا قريباً في منطقتك!
        </p>
      </div>
    );
  }

  if (settings?.isMaintenanceMode) {
    return (
         <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4 text-center">
            <HardHat className="h-20 w-20 text-primary mb-6 animate-bounce"/>
            <h1 className="text-3xl font-bold mb-2 text-primary">نحن في صيانة قصيرة</h1>
            <p className="text-muted-foreground text-lg">نعمل على تحسين الخدمة لنصلك أسرع. سنعود خلال دقائق!</p>
        </div>
    )
  }

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-card shadow-2xl relative overflow-hidden">
      
      <main className="flex-1 relative z-0">
        <div 
          className="spa-stack-container" 
          style={{ 
            transform: `translateX(${activeTab * 100}%)` 
          }} 
        >
          <div className="spa-page-view"><HomePage /></div>
          <div className="spa-page-view"><RestaurantsPage /></div>
          <div className="spa-page-view"><ProductsPage /></div>
          <div className="spa-page-view"><CartPage /></div>
          <div className="spa-page-view"><OrdersPage /></div>
          <div className="spa-page-view"><AccountPage /></div>
          <div className="spa-page-view"><AddAddressPage /></div>
          <div className="spa-page-view"><SupportPage /></div>
          <div className="spa-page-view"><PrivacyPolicyPage /></div>
        </div>
      </main>
      
      <BottomNav />

      <Sheet open={showAddressPrompt} onOpenChange={() => {}}>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-[3rem] p-8 border-none shadow-2xl overflow-y-auto">
          <SheetHeader className="text-right">
            <SheetTitle className="text-3xl font-black text-primary">مرحباً بك في سبيد!</SheetTitle>
            <p className="text-muted-foreground text-lg">نحتاج لمعرفة موقعك لنتمكن من توصيل طلباتك بدقة</p>
          </SheetHeader>
          
          <div className="space-y-6 mt-8">
            <div className="space-y-3">
              <Label className="text-lg font-bold">اسم العنوان</Label>
              <Input 
                value={newAddr.name} 
                onChange={(e) => setNewAddr({...newAddr, name: e.target.value})} 
                placeholder="مثلاً: المنزل، المحل، المكتب" 
                className="h-14 text-lg border-2 rounded-2xl"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-lg font-bold">رقم الهاتف</Label>
              <Input 
                value={newAddr.phone} 
                onChange={(e) => setNewAddr({...newAddr, phone: e.target.value})} 
                placeholder="07XXXXXXXX" 
                type="tel" 
                dir="ltr"
                className="h-14 text-lg text-left border-2 rounded-2xl"
              />
            </div>

            <div className="pt-2">
                <button 
                    onClick={handleGetLocation} 
                    className={`w-full py-6 flex items-center justify-center text-xl border-2 border-dashed rounded-2xl ${islocLoading ? 'border-primary' : 'border-muted-foreground/30'}`}
                    disabled={islocLoading}
                >
                {islocLoading ? (
                    <><Loader2 className="animate-spin ml-3 h-8 w-8 text-primary" /> تحديد الموقع...</>
                ) : (
                    <><MapPin className="ml-3 h-8 w-8 text-primary" /> تحديد موقعي (GPS)</>
                )}
                </button>
            </div>

            <Button 
                onClick={handleSaveAddress} 
                className="w-full py-8 text-2xl font-black rounded-3xl shadow-xl shadow-primary/20 mt-4"
                disabled={islocLoading}
            >
                ابدأ التسوق الآن
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}