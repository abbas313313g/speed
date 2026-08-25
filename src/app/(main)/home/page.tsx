
"use client";

import { useRef, useMemo, useContext } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay"

import { RestaurantCard } from "@/components/RestaurantCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Layers } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useBanners } from "@/hooks/useBanners";
import { useRestaurants } from "@/hooks/useRestaurants";
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
                    priority={index === 0}
                    loading={index === 0 ? "eager" : "lazy"}
                />
            ) : <Skeleton className="w-full h-full" />}
        </CardContent>
      </Card>
    </CarouselItem>
  );
};

export default function HomePage() {
  const context = useContext(AppContext);
  
  // استدعاء البيانات الأساسية للرئيسية فقط (معزولة عن المنتجات)
  const { categories, isLoading: catLoading } = useCategories();
  const { banners, isLoading: bannerLoading } = useBanners();
  const { restaurants, isLoading: restLoading } = useRestaurants();
  
  const plugin = useRef(Autoplay({ delay: 3500, stopOnInteraction: true }));
  const setActiveTab = context?.setActiveTab || (() => {});

  // عرض أول 8 متاجر فقط لتسريع الرندر اللحظي
  const homeRestaurants = useMemo(() => restaurants.slice(0, 8), [restaurants]);
  
  return (
    <div className="space-y-8 p-4 pb-24 animate-in fade-in duration-300">
      <header className="flex justify-between items-end">
        <div>
            <h1 className="text-3xl font-black text-primary leading-tight">سبيد شوب</h1>
            <p className="text-muted-foreground text-lg font-bold">أسرع توصيل في منطقتك!</p>
        </div>
      </header>

      {/* قسم البانر الإعلاني - مستقل */}
      <section className="min-h-[160px] relative">
        {bannerLoading ? (
            <Skeleton className="w-full aspect-video rounded-[2rem]" />
        ) : (
            <Carousel className="w-full" opts={{ loop: true, direction: 'rtl' }} plugins={[plugin.current]}>
                <CarouselContent>
                    {banners.length > 0 ? banners.map((banner, idx) => (
                        <BannerItem key={banner.id} banner={banner} index={idx} />
                    )) : <Skeleton className="aspect-video w-full rounded-[2rem]" />}
                </CarouselContent>
            </Carousel>
        )}
      </section>

      {/* قسم الأقسام - مستقل */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-2xl font-black">الأقسام</h2>
            <button onClick={() => setActiveTab(2)} className="text-primary font-black text-sm">عرض الكل</button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4 space-x-reverse pb-4">
                {catLoading ? (
                    [1,2,3,4].map(i => <Skeleton key={i} className="w-24 h-24 rounded-[1.5rem]" />)
                ) : (
                    <>
                        <button onClick={() => setActiveTab(2)} className="flex-shrink-0 group">
                            <div className="w-24 text-center">
                                <div className="p-4 bg-secondary rounded-[1.5rem] flex items-center justify-center aspect-square shadow-sm">
                                    <Layers className="h-10 w-10 text-primary" />
                                </div>
                                <p className="mt-2 text-sm font-black truncate">الكل</p>
                            </div>
                        </button>
                        {categories.map((category) => (
                            <button key={category.id} onClick={() => setActiveTab(2)} className="flex-shrink-0 group">
                                <div className="w-24 text-center">
                                    <div className="p-4 bg-secondary rounded-[1.5rem] flex items-center justify-center aspect-square shadow-sm">
                                        <category.icon className="h-10 w-10 text-primary" />
                                    </div>
                                    <p className="mt-2 text-sm font-black truncate">{category.name}</p>
                                </div>
                            </button>
                        ))}
                    </>
                )}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* قسم أشهر المتاجر - مستقل */}
      <section>
         <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-2xl font-black">أشهر المتاجر</h2>
             <button onClick={() => setActiveTab(1)} className="text-primary font-black text-sm">تصفح الكل</button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-5 space-x-reverse pb-6 px-1">
              {restLoading ? (
                  [1,2].map(i => <Skeleton key={i} className="w-[280px] aspect-[16/9] rounded-[2.5rem]" />)
              ) : homeRestaurants.length > 0 ? (
                  homeRestaurants.map((restaurant, idx) => (
                      <RestaurantCard key={restaurant.id} restaurant={restaurant} large={true} priority={idx < 2} />
                  ))
              ) : <Skeleton className="w-[280px] h-40 rounded-[2.5rem]" />}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
    </div>
  );
}
