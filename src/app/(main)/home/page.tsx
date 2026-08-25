
"use client";

import { useRef, useContext, useMemo } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import { 
  ChevronLeft,
  Star,
  Flame,
  ShoppingBasket
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AppContext } from "@/contexts/AppContext";
import { formatCurrency } from "@/lib/utils";
import { useBanners } from "@/hooks/useBanners";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";

export default function HomePage() {
  const context = useContext(AppContext);
  const { banners, isLoading: bannersLoading } = useBanners();
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { categories, isLoading: categoriesLoading } = useCategories();
  
  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: false }));
  
  const setActiveTab = context?.setActiveTab || (() => {});
  const setSelectedRestaurantId = context?.setSelectedRestaurantId || (() => {});
  const { filteredProducts } = context || { filteredProducts: [] };

  const handleStoreClick = (id: string) => {
    setSelectedRestaurantId(id);
    setActiveTab(10);
  };

  const topStores = useMemo(() => restaurants.slice(0, 8), [restaurants]);
  
  // تصفية المنتجات الأكثر مبيعاً
  const topSellers = useMemo(() => filteredProducts.slice(0, 8), [filteredProducts]);

  const isLoading = bannersLoading && restaurantsLoading && categoriesLoading;

  if (isLoading) {
      return (
          <div className="p-4 space-y-8 animate-pulse">
              <Skeleton className="w-full aspect-[21/9] rounded-[2rem]" />
              <div className="grid grid-cols-4 gap-3">
                  {[1,2,3,4].map(i => <Skeleton key={i} className="aspect-square rounded-2xl" />)}
              </div>
              <Skeleton className="h-48 w-full rounded-[2.5rem]" />
          </div>
      );
  }

  return (
    <div className="space-y-8 p-4 pb-32 animate-in fade-in duration-300">
      <header className="flex justify-between items-center py-2">
        <div>
            <h1 className="text-3xl font-black text-primary leading-tight italic tracking-tighter">SPEED SHOP</h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">أسرع توصيل في منطقتك</p>
        </div>
      </header>

      <section className="relative">
        <Carousel className="w-full" opts={{ loop: true, direction: 'rtl' }} plugins={[plugin.current]}>
            <CarouselContent>
                {banners.map((banner, index) => (
                    <CarouselItem key={banner.id} className="basis-full">
                        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[2rem] shadow-lg border-4 border-white">
                            <Image 
                                src={banner.image} 
                                fill 
                                alt="Promotion" 
                                className="object-cover" 
                                unoptimized={true}
                                priority={index === 0}
                                decoding="async"
                            />
                        </div>
                    </CarouselItem>
                ))}
                {banners.length === 0 && (
                    <CarouselItem className="basis-full">
                            <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[2rem] bg-muted/20 flex items-center justify-center border-4 border-white border-dashed">
                            <p className="text-muted-foreground font-bold">جاهز لعروضك الجديدة</p>
                            </div>
                    </CarouselItem>
                )}
            </CarouselContent>
        </Carousel>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-black text-slate-800">اكتشف الأقسام</h2>
            <button onClick={() => setActiveTab(1)} className="text-primary font-black text-xs">عرض الكل</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
            {categories.map((category) => {
                const Icon = category.icon || ShoppingBasket;
                return (
                    <button 
                      key={category.id} 
                      onClick={() => { setActiveTab(1); }} 
                      className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-full aspect-square rounded-[1.5rem] flex items-center justify-center shadow-sm transition-all group-active:scale-90 bg-white border-2 border-slate-50 text-primary">
                            <Icon className="h-8 w-8" />
                        </div>
                        <span className="text-[10px] font-black">{category.name}</span>
                    </button>
                )
            })}
        </div>
      </section>

      <section>
         <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-black text-slate-800">أشهر المتاجر</h2>
             <button onClick={() => setActiveTab(1)} className="text-primary font-black text-xs">تصفح المتاجر</button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4 space-x-reverse pb-6 px-1">
                {topStores.map((store, index) => (
                    <div 
                        key={store.id} 
                        onClick={() => handleStoreClick(store.id)}
                        className="w-[260px] shrink-0 bg-white rounded-[2.5rem] p-3 shadow-md border border-slate-50 relative group active:scale-95 transition-all"
                    >
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.8rem] mb-3 bg-muted/10">
                            <Image 
                                src={store.image} 
                                alt={store.name} 
                                fill 
                                className="object-cover" 
                                unoptimized={true}
                                decoding="async"
                                priority={index < 2}
                            />
                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-black">{store.rating}</span>
                            </div>
                        </div>
                        <div className="px-2 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm text-slate-800 truncate max-w-[150px]">{store.name}</h3>
                                <p className="text-[9px] text-muted-foreground font-bold italic">توصيل سريع وموثوق</p>
                            </div>
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <ChevronLeft className="h-4 w-4 text-primary" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {topSellers.length > 0 && (
          <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-red-500 animate-pulse" />
                    الأكثر طلباً الآن
                  </h2>
                  <button onClick={() => setActiveTab(2)} className="text-primary font-black text-xs">عرض المنيو</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  {topSellers.map((product) => {
                      // إصلاح مشكلة السعر 0: البحث عن أقل سعر في الأنواع إذا كان السعر الرئيسي 0
                      const activeSizes = product.sizes?.filter(s => s.isActive !== false) || [];
                      const hasSizes = activeSizes.length > 0;
                      let finalPrice = product.discountPrice || product.price || 0;
                      
                      if (hasSizes && finalPrice === 0) {
                          const prices = activeSizes.map(s => s.price).filter(p => p > 0);
                          if (prices.length > 0) {
                              finalPrice = Math.min(...prices);
                          }
                      }

                      return (
                        <div 
                            key={product.id} 
                            onClick={() => { context?.setSelectedProductId(product.id); setActiveTab(9); }}
                            className="bg-white rounded-[2rem] p-2 shadow-sm border border-slate-50 flex flex-col gap-2 active:scale-95 transition-all"
                        >
                            <div className="relative aspect-square rounded-[1.5rem] overflow-hidden bg-muted/5">
                                <Image 
                                    src={product.image} 
                                    fill 
                                    alt={product.name} 
                                    className="object-cover" 
                                    unoptimized={true} 
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                            <div className="px-1 py-1">
                                <h3 className="font-black text-xs text-slate-800 truncate">{product.name}</h3>
                                <p className="text-primary font-black text-[10px] mt-1">
                                    {hasSizes && (product.price === 0) ? `من ${formatCurrency(finalPrice)}` : formatCurrency(finalPrice)}
                                </p>
                            </div>
                        </div>
                      );
                  })}
              </div>
          </section>
      )}
    </div>
  );
}
