
"use client";

import { useState } from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useBanners } from '@/hooks/useBanners';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, LayoutDashboard, Copy, Code, Save, Store, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function HomeSettingsPage() {
  const { restaurants } = useRestaurants();
  const { banners } = useBanners();
  const { toast } = useToast();

  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedBanners, setSelectedBanners] = useState<string[]>([]);

  const toggleStore = (id: string) => {
    if (selectedStores.includes(id)) {
        setSelectedStores(prev => prev.filter(i => i !== id));
    } else {
        if (selectedStores.length >= 8) {
            toast({ title: "الحد الأقصى 8 متاجر", variant: "destructive" });
            return;
        }
        setSelectedStores(prev => [...prev, id]);
    }
  };

  const toggleBanner = (id: string) => {
      if (selectedBanners.includes(id)) {
          setSelectedBanners(prev => prev.filter(i => i !== id));
      } else {
          setSelectedBanners(prev => [...prev, id]);
      }
  };

  const generateCode = () => {
      const storesData = restaurants
        .filter(r => selectedStores.includes(r.id))
        .map(r => ({ id: r.id, name: r.name, image: r.image, rating: r.rating }));
      
      const bannersData = banners
        .filter(b => selectedBanners.includes(b.id))
        .map(b => ({ id: b.id, image: b.image, link: b.link }));

      const code = `
// انسخ هذا الكود وأرسله للمبرمج لتحديث الصفحة الرئيسية
const STATIC_BANNERS = ${JSON.stringify(bannersData, null, 2)};
const STATIC_STORES = ${JSON.stringify(storesData, null, 2)};
      `;

      navigator.clipboard.writeText(code);
      toast({ title: "تم نسخ كود التحديث!", description: "أرسل الكود للمبرمج ليقوم بتجميده في الصفحة الرئيسية." });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-primary">تخصيص الواجهة الرئيسية</h1>
          <p className="text-muted-foreground font-bold">اختر المحتوى الذي سيظهر "فورياً" للزبائن بدون تحميل.</p>
        </div>
        <Button onClick={generateCode} className="h-14 rounded-2xl font-black gap-2 shadow-xl">
            <Save className="h-5 w-5" /> حفظ وتوليد كود التحديث
        </Button>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
          <section className="space-y-4">
              <h2 className="text-xl font-black flex items-center gap-2 px-1">
                  <ImageIcon className="text-primary"/> البنرات المختارة ({selectedBanners.length})
              </h2>
              <div className="grid gap-3">
                  {banners.map(b => (
                      <Card 
                        key={b.id} 
                        onClick={() => toggleBanner(b.id)}
                        className={cn("p-2 rounded-2xl cursor-pointer border-2 transition-all", selectedBanners.includes(b.id) ? "border-primary bg-primary/5" : "border-transparent bg-white")}
                      >
                          <div className="relative aspect-video rounded-xl overflow-hidden">
                              <Image src={b.image} fill className="object-cover" alt="" unoptimized={true} />
                              {selectedBanners.includes(b.id) && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><CheckCircle2 className="text-white h-10 w-10 shadow-xl"/></div>}
                          </div>
                      </Card>
                  ))}
              </div>
          </section>

          <section className="space-y-4">
              <h2 className="text-xl font-black flex items-center gap-2 px-1">
                  <Store className="text-primary"/> المتاجر الـ 8 المفضلة ({selectedStores.length}/8)
              </h2>
              <div className="grid grid-cols-2 gap-3">
                  {restaurants.map(r => (
                      <Card 
                        key={r.id} 
                        onClick={() => toggleStore(r.id)}
                        className={cn("p-3 rounded-2xl cursor-pointer border-2 transition-all text-right", selectedStores.includes(r.id) ? "border-primary bg-primary/5" : "border-transparent bg-white")}
                      >
                          <div className="relative aspect-square rounded-xl overflow-hidden mb-2">
                              <Image src={r.image} fill className="object-cover" alt="" unoptimized={true} />
                              {selectedStores.includes(r.id) && <div className="absolute inset-0 bg-primary/20 flex items-center justify-center"><CheckCircle2 className="text-white h-6 w-6"/></div>}
                          </div>
                          <p className="font-black text-xs truncate">{r.name}</p>
                      </Card>
                  ))}
              </div>
          </section>
      </div>

      <Card className="rounded-[2.5rem] bg-slate-800 text-white border-none p-8 text-center">
            <Code className="h-12 w-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-black">نظام التحديث البرمجي</h2>
            <p className="text-white/60 font-bold mt-2 px-10">
                لأنك طلبت أداءً صاروخياً، الصفحة الرئيسية لا تعتمد على السيرفر في كل مرة. <br/>
                عند تغيير الاختيارات أعلاه، اضغط على زر "توليد الكود" وأرسله لي ليقوم التطبيق بتغيير الواجهة فوراً في الزيارة القادمة.
            </p>
      </Card>
    </div>
  );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
