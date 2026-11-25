
"use client";

import { useMemo, useContext, useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { ArrowRight, Star, Bike, Navigation2, ShoppingBag, ArrowUp, ChevronLeft, MapPin, Sparkles } from 'lucide-react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { AppContext } from '@/contexts/AppContext';
import { calculateDistance, calculateDeliveryFee, formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function RestaurantReelsPage() {
  const context = useContext(AppContext);
  const { restaurants, isLoading } = useRestaurants();
  
  if (!context) return null;
  const { addresses, setActiveTab, setSelectedRestaurantId } = context;

  // العنوان النشط من السياق
  const activeAddress = addresses[0]; 

  // مضاعفة المصفوفة لعمل تكرار لانهائي وهمي (أو استخدام نظام الموديلو)
  // هنا نستخدم قائمة المتاجر مع حساب المسافات
  const restaurantData = useMemo(() => {
    return restaurants.map(r => {
      let distance = 0;
      let fee = 1000;
      if (activeAddress && activeAddress.latitude && r.latitude) {
        distance = calculateDistance(activeAddress.latitude, activeAddress.longitude!, r.latitude, r.longitude!);
        fee = calculateDeliveryFee(distance);
      }
      return { ...r, distance, fee };
    });
  }, [restaurants, activeAddress]);

  // إنشاء قائمة لا تنتهي عبر تكرار العناصر
  const loopedRestaurants = useMemo(() => {
      if (restaurantData.length === 0) return [];
      // نكرر القائمة 10 مرات لضمان عدم وصول الزبون للنهاية بسهولة، أو عمل حل برمجي للتكرار
      return [...restaurantData, ...restaurantData, ...restaurantData, ...restaurantData, ...restaurantData];
  }, [restaurantData]);

  const handleStoreClick = (id: string) => {
    setSelectedRestaurantId(id);
    setActiveTab(10);
  };

  if (isLoading) return <div className="h-full w-full flex items-center justify-center"><Loader2 className="animate-spin text-primary h-10 w-10"/></div>;

  return (
    <div className="h-screen w-full bg-black text-right relative overflow-hidden">
      {/* هيدر التحكم */}
      <header className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center flex-row-reverse bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center gap-3">
              <div className="text-right">
                <h1 className="text-xl font-black text-white italic leading-none">متاجر سبيد</h1>
                <p className="text-[9px] font-black text-primary uppercase tracking-widest mt-1">تصفح بأسلوب الريلز</p>
              </div>
              <div className="p-3 bg-primary rounded-2xl shadow-xl shadow-primary/20"><ShoppingBag className="h-6 w-6 text-white"/></div>
          </div>
          <button onClick={() => setActiveTab(0)} className="p-3 bg-white/10 backdrop-blur-md rounded-2xl text-white active:scale-75 transition-all">
              <ArrowRight className="h-6 w-6"/>
          </button>
      </header>

      {/* حاوية الريلز بنظام الـ Snap Scrolling */}
      <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scrollbar-hide">
          {loopedRestaurants.map((store, index) => (
              <div 
                key={`${store.id}-${index}`}
                className="h-screen w-full snap-start relative flex flex-col justify-end p-6 pb-32"
              >
                  {/* صورة الخلفية (الريل) */}
                  <div className="absolute inset-0 z-0">
                      <Image 
                        src={store.image} 
                        fill 
                        alt={store.name} 
                        className="object-cover" 
                        unoptimized={true} 
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/30" />
                  </div>

                  {/* معلومات المتجر العائمة */}
                  <div className="relative z-10 space-y-6 animate-in slide-in-from-bottom-8 duration-700">
                      <div className="flex items-center justify-between flex-row-reverse">
                          <div className="text-right">
                              <Badge className="bg-primary text-white border-none font-black text-[10px] mb-2 px-4 h-7 rounded-full shadow-lg">متجر موثوق ✅</Badge>
                              <h2 className="text-4xl font-black text-white leading-none tracking-tighter drop-shadow-2xl">{store.name}</h2>
                              <div className="flex items-center gap-3 justify-end mt-3">
                                  <div className="flex items-center gap-1 text-amber-400">
                                      <Star className="h-4 w-4 fill-amber-400" />
                                      <span className="text-sm font-black">{store.rating}</span>
                                  </div>
                                  <span className="text-white/40 text-xs font-bold">توصيل فائق السرعة ⚡</span>
                              </div>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                           <div className="bg-white/10 backdrop-blur-xl p-5 rounded-[2.2rem] border border-white/10 shadow-2xl flex flex-col items-center gap-1">
                                <Bike className="h-6 w-6 text-primary animate-bounce" />
                                <span className="text-[10px] font-black text-white/60 uppercase">أجرة التوصيل</span>
                                <span className="text-2xl font-black text-white tracking-tighter">{formatCurrency(store.fee)}</span>
                           </div>
                           <div className="bg-white/10 backdrop-blur-xl p-5 rounded-[2.2rem] border border-white/10 shadow-2xl flex flex-col items-center gap-1">
                                <Navigation2 className="h-6 w-6 text-white" />
                                <span className="text-[10px] font-black text-white/60 uppercase">المسافة</span>
                                <span className="text-2xl font-black text-white tracking-tighter">{store.distance.toFixed(1)} كم</span>
                           </div>
                      </div>

                      <div className="pt-2">
                        <Button 
                            onClick={() => handleStoreClick(store.id)}
                            className="w-full h-20 rounded-[2.2rem] bg-primary hover:bg-primary/90 text-white text-2xl font-black shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 group"
                        >
                            اطلب الآن من المنيو
                            <ChevronLeft className="h-8 w-8 group-active:translate-x-[-10px] transition-transform" />
                        </Button>
                      </div>
                  </div>

                  {!store.isStoreOpen && (
                      <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                          <div className="transform rotate-[-12deg] bg-red-600 text-white px-12 py-5 rounded-[2.5rem] border-4 border-white shadow-3xl">
                             <h3 className="text-4xl font-black italic">مغلق الآن</h3>
                             <p className="text-center font-bold text-sm mt-1 opacity-80">نعتذر عن استقبال الطلبات</p>
                          </div>
                      </div>
                  )}
              </div>
          ))}
      </div>

      {/* تلميح السحب للأعلى */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1 opacity-40 animate-bounce pointer-events-none">
          <span className="text-[9px] font-black text-white uppercase tracking-[0.3em]">اسحب للأعلى</span>
          <ArrowUp className="h-4 w-4 text-white" />
      </div>
    </div>
  );
}
