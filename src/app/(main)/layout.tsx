
"use client";

import { useState, useEffect, useContext } from 'react';
import { BottomNav } from '@/components/BottomNav';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useAddresses } from '@/hooks/useAddresses';
import { HardHat, Loader2, MapPin, AlertCircle, ShoppingBag, User, Phone, Home, CheckCircle2 } from 'lucide-react';
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
import ProductDetailPage from './products/[id]/page';
import RestaurantProductsPage from './restaurants/[id]/page';

export default function MainAppLayout() {
  const context = useContext(AppContext);
  const { settings, isLoading: settingsLoading } = useAppSettings();
  const { addresses, addAddress } = useAddresses();
  const { toast } = useToast();
  
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', details: '', lat: 0, lng: 0 });
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
      toast({ title: "الموقع غير مدعوم", description: "عذراً، متصفحك لا يدعم خدمة تحديد المواقع.", variant: "destructive" });
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
          toast({ title: "تم التحديد بنجاح", description: "تم التعرف على موقعك الجغرافي بدقة." });
          setNewAddr(prev => ({ ...prev, lat: latitude, lng: longitude }));
        }
        setIslocLoading(false);
      },
      () => {
        toast({ title: "فشل تحديد الموقع", description: "يرجى تفعيل الـ GPS في جهازك وإعطاء الإذن للمتصفح.", variant: "destructive" });
        setIslocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveAddress = () => {
    if (!newAddr.name || !newAddr.phone || !newAddr.details) {
      toast({ title: "بيانات ناقصة", description: "يرجى إكمال كتابة اسمك، رقم هاتفك، وعنوانك للمتابعة.", variant: "destructive" });
      return;
    }
    if (newAddr.lat === 0) {
        toast({ title: "الموقع مطلوب", description: "يرجى الضغط على زر تحديد الموقع الجغرافي أولاً.", variant: "destructive" });
        return;
    }
    addAddress({
      name: newAddr.name,
      phone: newAddr.phone,
      deliveryZone: "تلقائي",
      details: newAddr.details,
      latitude: newAddr.lat || 0,
      longitude: newAddr.lng || 0
    });
    setShowAddressPrompt(false);
    toast({ title: "مرحباً بك!", description: "تم حفظ عنوانك، يمكنك البدء بالتسوق الآن." });
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
          <br/> سنصل إليك قريباً في منطقتك!
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
      
      <main className="flex-1 relative z-0 overflow-hidden">
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
          <div className="spa-page-view"><ProductDetailPage /></div>
          <div className="spa-page-view"><RestaurantProductsPage /></div>
        </div>
      </main>
      
      <div className="h-20 shrink-0">
        <BottomNav />
      </div>

      <Sheet open={showAddressPrompt} onOpenChange={() => {}}>
        <SheetContent side="bottom" className="h-[82vh] w-full p-0 border-none shadow-none flex flex-col bg-background rounded-t-[3rem]">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <SheetHeader className="text-right">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/10 rounded-2xl">
                        <ShoppingBag className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <SheetTitle className="text-xl font-black text-primary">أهلاً بك في سبيد!</SheetTitle>
                        <p className="text-muted-foreground text-xs">املأ بياناتك لمرة واحدة فقط للبدء بالطلب.</p>
                    </div>
                </div>
            </SheetHeader>
            
            <div className="space-y-3">
                <div className="space-y-1">
                    <Label className="text-xs font-bold flex items-center gap-2 pr-1"><User className="h-3 w-3 text-primary"/> الاسم الكامل</Label>
                    <Input 
                        value={newAddr.name} 
                        onChange={(e) => setNewAddr({...newAddr, name: e.target.value})} 
                        placeholder="اكتب اسمك الثلاثي..." 
                        className="h-11 text-base border-2 rounded-xl bg-card px-4"
                    />
                </div>
                
                <div className="space-y-1">
                    <Label className="text-xs font-bold flex items-center gap-2 pr-1"><Phone className="h-3 w-3 text-primary"/> رقم الهاتف</Label>
                    <Input 
                        value={newAddr.phone} 
                        onChange={(e) => setNewAddr({...newAddr, phone: e.target.value})} 
                        placeholder="07XXXXXXXX" 
                        type="tel" 
                        dir="ltr"
                        className="h-11 text-base text-left border-2 rounded-xl bg-card px-4"
                    />
                </div>

                <div className="space-y-1">
                    <Label className="text-xs font-bold flex items-center gap-2 pr-1"><Home className="h-3 w-3 text-primary"/> تفاصيل العنوان (المنطقة / أقرب نقطة دالة)</Label>
                    <Input 
                        value={newAddr.details} 
                        onChange={(e) => setNewAddr({...newAddr, details: e.target.value})} 
                        placeholder="مثال: المدحتية - قرب مكتبة الطالب" 
                        className="h-11 text-base border-2 rounded-xl bg-card px-4"
                    />
                </div>

                <div className="pt-2">
                    <button 
                        onClick={handleGetLocation} 
                        className={`w-full py-4 flex flex-row items-center justify-center gap-3 text-sm border-2 border-dashed rounded-2xl transition-all active:scale-95 ${newAddr.lat !== 0 ? 'border-green-500 bg-green-50' : 'border-primary/40 bg-card'}`}
                        disabled={islocLoading}
                    >
                    {islocLoading ? (
                        <><Loader2 className="animate-spin h-5 w-5 text-primary" /> <span className="font-bold">جارِ تحديد موقعك...</span></>
                    ) : (
                        newAddr.lat !== 0 ? (
                            <><CheckCircle2 className="h-5 w-5 text-green-500" /> <span className="font-bold text-green-600">تم تحديد موقعك بنجاح!</span></>
                        ) : (
                            <><MapPin className="h-5 w-5 text-primary" /> <span className="font-bold text-primary">تحديد موقعي الجغرافي (GPS)</span></>
                        )
                    )}
                    </button>
                    {newAddr.lat === 0 && (
                        <p className="text-center text-[10px] text-muted-foreground mt-1">يجب الضغط هنا لتتمكن من إرسال الطلبات لاحقاً.</p>
                    )}
                </div>
            </div>
          </div>

          <div className="p-6 bg-background border-t">
              <Button 
                onClick={handleSaveAddress} 
                className="w-full py-7 text-xl font-black rounded-2xl shadow-xl shadow-primary/20"
                disabled={islocLoading}
              >
                حفظ وابدأ التسوق
              </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
