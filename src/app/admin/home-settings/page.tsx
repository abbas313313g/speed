
"use client";

import { useState, useEffect } from 'react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useBanners } from '@/hooks/useBanners';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Store, Image as ImageIcon, Save, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export default function HomeSettingsPage() {
  const { restaurants } = useRestaurants();
  const { banners } = useBanners();
  const { settings, setSettings, isSaving } = useAppSettings();
  const { toast } = useToast();

  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedBanners, setSelectedBanners] = useState<string[]>([]);

  useEffect(() => {
    if (settings) {
        setSelectedStores(settings.featuredStoreIds || []);
        setSelectedBanners(settings.featuredBannerIds || []);
    }
  }, [settings]);

  const toggleStore = (id: string) => {
    if (selectedStores.includes(id)) {
        setSelectedStores(prev => prev.filter(i => i !== id));
    } else {
        if (selectedStores.length >= 8) {
            toast({ title: "الحد الأقصى هو 8 متاجر", variant: "destructive" });
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

  const handleSaveSettings = async () => {
      await setSettings({
          featuredStoreIds: selectedStores,
          featuredBannerIds: selectedBanners
      });
      toast({ title: "تم تحديث واجهة التطبيق فوراً ✅" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-black text-primary italic">تخصيص الواجهة</h1>
          <p className="text-muted-foreground font-bold mt-1">اختر المحتوى الذي سيظهر للزبائن في الصفحة الرئيسية.</p>
        </div>
        <Button onClick={handleSaveSettings} disabled={isSaving} className="h-14 rounded-2xl font-black gap-2 shadow-xl px-8">
            {isSaving ? <Loader2 className="animate-spin h-5 w-5"/> : <Save className="h-5 w-5" />}
            حفظ التغييرات الآن
        </Button>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
          <section className="space-y-4">
              <h2 className="text-xl font-black flex items-center gap-2 px-1 justify-end">
                  الإعلانات المفضلة ({selectedBanners.length}) <ImageIcon className="text-primary h-5 w-5"/>
              </h2>
              <div className="grid gap-3">
                  {banners.map(b => (
                      <Card 
                        key={b.id} 
                        onClick={() => toggleBanner(b.id)}
                        className={cn("p-2 rounded-2xl cursor-pointer border-2 transition-all relative overflow-hidden", selectedBanners.includes(b.id) ? "border-primary bg-primary/5" : "border-transparent bg-white")}
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
              <h2 className="text-xl font-black flex items-center gap-2 px-1 justify-end">
                  أشهر المتاجر ({selectedStores.length}/8) <Store className="text-primary h-5 w-5"/>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                  {restaurants.map(r => (
                      <Card 
                        key={r.id} 
                        onClick={() => toggleStore(r.id)}
                        className={cn("p-3 rounded-2xl cursor-pointer border-2 transition-all text-center", selectedStores.includes(r.id) ? "border-primary bg-primary/5" : "border-transparent bg-white")}
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
    </div>
  );
}
