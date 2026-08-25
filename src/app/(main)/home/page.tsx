
"use client";

import { useRef, useMemo, useContext } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay"

import { ProductCard } from "@/components/ProductCard";
import { RestaurantCard } from "@/components/RestaurantCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Layers, Sparkles } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useBanners } from "@/hooks/useBanners";
import { useProducts } from "@/hooks/useProducts";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useOrders } from "@/hooks/useOrders";
import { AppContext } from "@/contexts/AppContext";

const BannerItem = ({ banner, index }: { banner: any, index: number }) => {
  return (
    <CarouselItem key={banner.id || index} className="relative basis-full">
      <Card className="border-none shadow-none overflow-hidden rounded-[2rem]">
        <CardContent className="relative flex aspect-video items-center justify-center p-0 bg-muted/5">
            {banner.image ? (
                <Image 
                    src={banner.image} 
                    fill 
                    alt="Promotion" 
                    className="object-cover" 
                    unoptimized={true}
                    priority={index < 2}
                />
            ) : <div className="w-full h-full bg-muted/20 animate-pulse" />}
        </CardContent>
      </Card>
    </CarouselItem>
  );
};

export default function HomePage() {
  const context = useContext(AppContext);
  const { categories } = useCategories();
  const { banners } = useBanners();
  const { products } = useProducts();
  const { restaurants } = useRestaurants();
  const { allOrders } = useOrders();
  
  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: true }));
  
  const setActiveTab = context?.setActiveTab || (() => {});

  // الأكثر مبيعاً: آخر 8 وجبات حقيقية فقط بناءً على الطلبات المسلمة
  const latestBestSellers = useMemo(() => {
    if (!allOrders.length || !products.length) return [];
    
    const deliveredOrders = [...allOrders]
        .filter(o => o.status === 'delivered')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const soldProductIds = new Set<string>();
    deliveredOrders.forEach(order => {
        order.items.forEach(item => {
            if (soldProductIds.size < 8) {
                soldProductIds.add(item.product.id);
            }
        });
    });

    return Array.from(soldProductIds)
        .map(id => products.find(p => p.id === id))
        .filter((p): p is any => !!p && p.status === 'approved' && p.isActive !== false);
  }, [allOrders, products]);

  // الرئيسية تعرض 8 متاجر فقط لتقليل حمل البيانات
  const homeRestaurants = useMemo(() => {
    return restaurants.slice(0, 8);
  }, [restaurants]);
  
  return (
    <div className="space-y-8 p-4 pb-24 animate-in fade-in duration-300">
      <header>
        <h1 className="text-3xl font-black text-primary leading-tight">سبيد شوب</h1>
        <p className="text-muted-foreground text-lg font-bold">أسرع توصيل في منطقتك!</p>
      </header>

      {/* البنرات */}
      <section className="min-h-[160px] relative">
        <Carousel className="w-full" opts={{ loop: true, direction: 'rtl' }} plugins={[plugin.current]}>
            <CarouselContent>
                {banners.length > 0 ? banners.map((banner, idx) => (
                    <BannerItem key={banner.id} banner={banner} index={idx} />
                )) : <CarouselItem><div className="aspect-video bg-muted/5 rounded-[2rem] border-2 border-dashed animate-pulse" /></CarouselItem>}
            </CarouselContent>
        </Carousel>
      </section>

      {/* الأقسام */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-2xl font-black">الأقسام</h2>
            <button onClick={() => setActiveTab(2)} className="text-primary font-black text-sm">عرض الكل</button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4 space-x-reverse pb-4">
                <button onClick={() => setActiveTab(2)} className="flex-shrink-0 group">
                    <div className="w-24 text-center">
                        <div className="p-4 bg-secondary rounded-[1.5rem] flex items-center justify-center aspect-square transition-all group-active:scale-90 shadow-sm">
                            <Layers className="h-10 w-10 text-primary" />
                        </div>
                        <p className="mt-2 text-sm font-black truncate">الكل</p>
                    </div>
                </button>
                {categories.length > 0 ? categories.map((category) => (
                    <button key={category.id} onClick={() => setActiveTab(2)} className="flex-shrink-0 group">
                        <div className="w-24 text-center">
                            <div className="p-4 bg-secondary rounded-[1.5rem] flex items-center justify-center aspect-square transition-all group-active:scale-90 shadow-sm">
                                <category.icon className="h-10 w-10 text-primary" />
                            </div>
                            <p className="mt-2 text-sm font-black truncate">{category.name}</p>
                        </div>
                    </button>
                )) : [1,2,3].map(i => <div key={i} className="w-24 h-24 bg-muted/10 rounded-[1.5rem] animate-pulse" />)}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
      
      {/* الأكثر مبيعاً */}
      {latestBestSellers.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-black flex items-center gap-2">
                    <Sparkles className="h-6 w-6 text-amber-500" /> الأكثر مبيعاً
                </h2>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4 space-x-reverse pb-4 px-1">
                    {latestBestSellers.map((product, idx) => (
                        <ProductCard key={product.id} product={product} priority={idx < 4} />
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>
      )}

      {/* أشهر المتاجر */}
      <section>
         <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-2xl font-black">أشهر المتاجر</h2>
             <button onClick={() => setActiveTab(1)} className="text-primary font-black text-sm">تصفح الكل</button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-5 space-x-reverse pb-6 px-1">
              {homeRestaurants.length > 0 ? homeRestaurants.map((restaurant, idx) => (
                  <RestaurantCard key={restaurant.id} restaurant={restaurant} large={true} priority={idx < 4} />
              )) : [1,2].map(i => <div key={i} className="w-[280px] aspect-[16/9] bg-muted/5 rounded-[2.5rem] border-2 border-dashed animate-pulse" />)}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
    </div>
  );
}
