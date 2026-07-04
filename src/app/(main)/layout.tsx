
"use client";

import { useState, useEffect } from 'react';
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

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { settings, isLoading: settingsLoading } = useAppSettings();
  const { addresses, addAddress } = useAddresses();
  const { toast } = useToast();
  
  const [showAddressPrompt, setShowAddressPrompt] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [newAddr, setNewAddr] = useState({ name: '', phone: '', details: '' });
  const [islocLoading, setIslocLoading] = useState(false);

  useEffect(() => {
    if (!settingsLoading && addresses.length === 0) {
      setShowAddressPrompt(true);
    }
  }, [settingsLoading, addresses]);

  const handleGetLocation = () => {
    setIslocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (!isLocationInAllowedZones(latitude, longitude)) {
          setIsBlocked(true);
          setShowAddressPrompt(false);
        } else {
          toast({ title: "تم تحديد الموقع بنجاح" });
        }
        setIslocLoading(false);
      },
      () => {
        toast({ title: "فشل تحديد الموقع", description: "الرجاء تفعيل الـ GPS", variant: "destructive" });
        setIslocLoading(false);
      }
    );
  };

  const handleSaveAddress = () => {
    if (!newAddr.name || !newAddr.phone) {
      toast({ title: "الرجاء ملء الحقول المطلوبة", variant: "destructive" });
      return;
    }
    addAddress({
      ...newAddr,
      deliveryZone: "تلقائي",
      latitude: 0,
      longitude: 0
    });
    setShowAddressPrompt(false);
  };

  if (settingsLoading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
        </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-6 text-center">
        <AlertCircle className="h-20 w-20 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">نعتذر منك</h1>
        <p className="text-muted-foreground text-lg">
          التطبيق غير متوفر حالياً في مدينتك (نحن نغطي جنوب بابل فقط). انتظرنا قريباً!
        </p>
      </div>
    );
  }

  if (settings?.isMaintenanceMode) {
    return (
         <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4 text-center">
            <HardHat className="h-20 w-20 text-primary mb-6"/>
            <h1 className="text-3xl font-bold mb-2">التطبيق في وضع الصيانة</h1>
            <p className="text-muted-foreground text-lg">نحن نعمل على تحسين تجربتك. سنعود قريبًا!</p>
        </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg relative">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />

      {/* شاشة إضافة عنوان إلزامية */}
      <Sheet open={showAddressPrompt} onOpenChange={() => {}}>
        <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl p-6">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">أهلاً بك! نحتاج لعنوانك</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>اسم العنوان (مثال: المنزل)</Label>
              <Input value={newAddr.name} onChange={(e) => setNewAddr({...newAddr, name: e.target.value})} placeholder="المنزل، العمل..." />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input value={newAddr.phone} onChange={(e) => setNewAddr({...newAddr, phone: e.target.value})} placeholder="07XXXXXXXX" type="tel" />
            </div>
            <Button onClick={handleGetLocation} variant="outline" className="w-full py-6" disabled={islocLoading}>
              {islocLoading ? <Loader2 className="animate-spin ml-2" /> : <MapPin className="ml-2" />}
              تحديد موقعي الحالي (GPS)
            </Button>
            <Button onClick={handleSaveAddress} className="w-full py-6 text-lg">حفظ ومتابعة</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
