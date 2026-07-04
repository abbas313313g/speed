"use client";

import { useState, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
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

// استيراد الصفحات لاستخدامها كمكونات في الـ SPA
import HomePage from './home/page';
import RestaurantsPage from './restaurants/page';
import CartPage from './cart/page';
import OrdersPage from './orders/page';
import AccountPage from './account/page';

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { settings, isLoading: settingsLoading } = useAppSettings();
  const { addresses, addAddress } = useAddresses();
  const { toast } = useToast();
  
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', details: '' });
  const [islocLoading, setIslocLoading] = useState(false);

  // تحديد ترتيب الصفحة الحالية للحركة الجانبية (RTL)
  const activeIndex = useMemo(() => {
    if (pathname === '/home' || pathname === '/') return 0;
    if (pathname.startsWith('/restaurants')) return 1;
    if (pathname.startsWith('/cart')) return 2;
    if (pathname.startsWith('/orders')) return 3;
    if (pathname.startsWith('/account')) return 4;
    return 0;
  }, [pathname]);

  useEffect(() => {
    if (!settingsLoading && addresses.length === 0) {
      setShowAddressPrompt(true);
    }
  }, [settingsLoading, addresses]);

  const handleGetLocation = () => {
    setIslocLoading(true);
    if (!navigator.geolocation) {
      toast({ title: "الموقع غير مدعوم", description: "متصفحك لا يدعم تحديد الموقع", variant: "destructive" });
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
        toast({ title: "فشل تحديد الموقع", description: "يرجى تفعيل الـ GPS وإعطاء الإذن للمتصفح في الإعدادات", variant: "destructive" });
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
    toast({ title: "أهلاً بك في سبيد!", description: "تم حفظ عنوانك، استمتع بالتسوق" });
  };

  if (settingsLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
            <p className="mt-4 text-muted-foreground animate-pulse">جارِ تحميل سبيد شوب...</p>
        </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center animate-in fade-in zoom-in duration-300">
        <AlertCircle className="h-20 w-20 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">نعتذر منك</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          تطبيق سبيد شوب غير متوفر حالياً في منطقتك الجغرافية. نحن نغطي حالياً (المدحتية، الهاشمية، القاسم) فقط.
          <br/> انتظرنا قريباً في منطقتك!
        </p>
      </div>
    );
  }

  if (settings?.isMaintenanceMode) {
    return (
         <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4 text-center">
            <HardHat className="h-20 w-20 text-primary mb-6 animate-bounce"/>
            <h1 className="text-3xl font-bold mb-2">نحن في صيانة قصيرة</h1>
            <p className="text-muted-foreground text-lg">نعمل على تحسين الخدمة لنصلك أسرع. سنعود خلال دقائق!</p>
        </div>
    )
  }

  // إذا كنا في صفحة فرعية (تفاصيل منتج مثلاً)، نعرض الـ children بشكل طبيعي
  const isSubPage = pathname.split('/').length > 2;

  return (
    <div className="mx-auto flex h-screen max-w-md flex-col bg-card shadow-xl relative overflow-hidden">
      
      <main className="flex-1 relative z-0">
        {isSubPage ? (
          <div className="h-full overflow-y-auto pb-20 animate-in slide-in-from-left duration-300">
            {children}
          </div>
        ) : (
          <div 
            className="page-stack-container" 
            style={{ transform: `translateX(${activeIndex * 20}%)` }} // منطق RTL: الازاحة موجبة لتحريك المحتوى لليسار
          >
            {/* الصفحات الخمس الأساسية محملة مسبقاً للانتقال اللحظي */}
            <div className="page-view"><HomePage /></div>
            <div className="page-view"><RestaurantsPage /></div>
            <div className="page-view"><CartPage /></div>
            <div className="page-view"><OrdersPage /></div>
            <div className="page-view"><AccountPage /></div>
          </div>
        )}
      </main>
      
      <BottomNav />

      {/* شاشة العنوان الإلزامية الاحترافية */}
      <Sheet open={showAddressPrompt} onOpenChange={() => {}}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-[2.5rem] p-8 border-none shadow-2xl overflow-y-auto">
          <SheetHeader className="text-right">
            <SheetTitle className="text-3xl font-black text-primary">مرحباً بك في سبيد!</SheetTitle>
            <p className="text-muted-foreground text-lg">لنبدأ، نحتاج لمعرفة موقعك لتوصيل طلباتك</p>
          </SheetHeader>
          
          <div className="space-y-6 mt-8">
            <div className="space-y-3">
              <Label className="text-md font-bold">اسم العنوان</Label>
              <Input 
                value={newAddr.name} 
                onChange={(e) => setNewAddr({...newAddr, name: e.target.value})} 
                placeholder="مثلاً: المنزل، العمل، المحل" 
                className="h-12 text-lg border-2"
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-md font-bold">رقم الهاتف</Label>
              <Input 
                value={newAddr.phone} 
                onChange={(e) => setNewAddr({...newAddr, phone: e.target.value})} 
                placeholder="07XXXXXXXX" 
                type="tel" 
                dir="ltr"
                className="h-12 text-lg text-left border-2"
              />
            </div>

            <div className="pt-2">
                <Button 
                    onClick={handleGetLocation} 
                    variant="outline" 
                    className={`w-full py-8 text-lg border-2 border-dashed ${islocLoading ? 'border-primary' : 'border-muted-foreground/30'}`}
                    disabled={islocLoading}
                >
                {islocLoading ? (
                    <><Loader2 className="animate-spin ml-3 h-6 w-6 text-primary" /> تحديد الموقع...</>
                ) : (
                    <><MapPin className="ml-3 h-6 w-6 text-primary" /> تحديد موقعي الحالي (GPS)</>
                )}
                </Button>
            </div>

            <Button 
                onClick={handleSaveAddress} 
                className="w-full py-8 text-xl font-bold rounded-2xl shadow-lg shadow-primary/20"
                disabled={islocLoading}
            >
                حفظ ودخول التطبيق
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}