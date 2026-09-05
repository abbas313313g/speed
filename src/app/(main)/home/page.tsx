
"use client";

import { useRef, useContext, useMemo, useState, useEffect } from "react";
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
import { useBanners } from "@/hooks/useBanners";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useOrders } from "@/hooks/useOrders";
import { ProductCard } from "@/components/ProductCard";

export default function HomePage() {
  const context = useContext(AppContext);
  const { banners, isLoading: bannersLoading } = useBanners();
  const { restaurants } = useRestaurants();
  const { categories } = useCategories();
  const { settings } = useAppSettings();
  const { allOrders } = useOrders();
  
  const { products: allProducts } = useProducts(undefined, undefined, 500);
  
  const mostSoldProducts = useMemo(() => {
      if (!allOrders.length || !allProducts.length) return [];
      
      const counts: {[key: string]: number} = {};
      const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
      
      deliveredOrders.forEach(order => {
          order.items.forEach(item => {
              counts[item.product.id] = (counts[item.product.id] || 0) + item.quantity;
          });
      });

      return [...allProducts]
          .filter(p => counts[p.id] > 0)
          .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
          .slice(0, 8);
  }, [allOrders, allProducts]);

  const plugin = useRef(Autoplay({ delay: 3500, stopOnInteraction: false }));
  
  const setActiveTab = context?.setActiveTab || (() => {});
  const setSelectedRestaurantId = context?.setSelectedRestaurantId || (() => {});

  const handleStoreClick = (id: string) => {
    setSelectedRestaurantId(id);
    setActiveTab(10);
  };

  const featuredBanners = useMemo(() => {
    if (!settings?.featuredBannerIds || settings.featuredBannerIds.length === 0) return banners.slice(0, 5);
    return banners.filter(b => settings.featuredBannerIds?.includes(b.id));
  }, [banners, settings]);

  const featuredStores = useMemo(() => {
    if (!settings?.featuredStoreIds || settings.featuredStoreIds.length === 0) return restaurants.slice(0, 8);
    return restaurants.filter(r => settings.featuredStoreIds?.includes(r.id));
  }, [restaurants, settings]);

  if (bannersLoading) return null;

  return (
    <div className="space-y-8 p-4 pb-32 animate-in fade-in duration-300 text-right">
      <header className="flex justify-between items-center py-2">
        <div className="p-2 bg-primary/10 rounded-xl"><ShoppingBasket className="h-6 w-6 text-primary" /></div>
        <div>
            <h1 className="text-3xl font-black text-primary leading-tight italic tracking-tighter">SPEED SHOP</h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">أسرع خدمة في منطقتك</p>
        </div>
      </header>

      <section className="relative">
        <Carousel className="w-full" opts={{ loop: true, direction: 'rtl' }} plugins={[plugin.current]}>
            <CarouselContent>
                {featuredBanners.map((banner, index) => (
                    <CarouselItem key={banner.id} className="basis-full">
                        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[2rem] shadow-lg border-4 border-white">
                            <Image src={banner.image} fill alt="" className="object-cover" unoptimized={true} priority={index === 0} />
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4 px-1">
            <button onClick={() => setActiveTab(1)} className="text-primary font-black text-xs">عرض الكل</button>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">اكتشف الأقسام</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
            {categories.slice(0, 4).map((category) => {
                const Icon = category.icon || ShoppingBasket;
                return (
                    <button key={category.id} onClick={() => { setActiveTab(1); }} className="flex flex-col items-center gap-2 group">
                        <div className="w-full aspect-square rounded-[1.8rem] flex items-center justify-center shadow-sm bg-white dark:bg-slate-900 border-2 border-slate-50 dark:border-slate-800 text-primary">
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
            <button onClick={() => setActiveTab(1)} className="text-primary font-black text-xs">تصفح المتاجر</button>
            <h2 className="text-xl font-black text-slate-800 dark:text-white">أشهر المتاجر</h2>
        </div>
        <ScrollArea className="w-full whitespace-nowrap" dir="rtl">
            <div className="flex w-max space-x-4 space-x-reverse pb-6 px-1">
                {featuredStores.map((store) => (
                    <div 
                        key={store.id} 
                        onClick={() => handleStoreClick(store.id)}
                        className="w-[260px] shrink-0 bg-white dark:bg-slate-900 rounded-[2.5rem] p-3 shadow-md border border-slate-50 dark:border-slate-800 relative group active:scale-95 transition-all"
                    >
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.8rem] mb-3 bg-muted/10">
                            <Image src={store.image} alt={store.name} fill className="object-cover" unoptimized={true} />
                            <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-black">{store.rating}</span>
                            </div>
                        </div>
                        <div className="px-2 flex justify-between items-center flex-row-reverse">
                            <div className="text-right">
                                <h3 className="font-black text-sm text-slate-800 dark:text-white truncate max-w-[150px]">{store.name}</h3>
                                <p className="text-[9px] text-muted-foreground font-bold italic">خدمة سريعة وموثوقة</p>
                            </div>
                            <div className="p-2 bg-primary/10 rounded-xl"><ChevronLeft className="h-4 w-4 text-primary" /></div>
                        </div>
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {mostSoldProducts.length > 0 && (
          <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                  <button onClick={() => setActiveTab(2)} className="text-primary font-black text-xs">عرض الكل</button>
                  <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    الأكثر مبيعاً <Flame className="h-5 w-5 text-red-500 animate-pulse" />
                  </h2>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  {mostSoldProducts.map((product) => (
                      <div key={`sold-prod-${product.id}`} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <ProductCard product={product} />
                      </div>
                  ))}
              </div>
          </section>
      )}
    </div>
  );
}
