
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
import { Layers, Sparkles, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import { useBanners } from "@/hooks/useBanners";
import { useProducts } from "@/hooks/useProducts";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useOrders } from "@/hooks/useOrders";
import { AppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const BannerItem = ({ banner }: { banner: any }) => {
  return (
    <CarouselItem 
      key={banner.id} 
      className="relative basis-full opacity-100"
    >
      <Card className="border-none shadow-none overflow-hidden rounded-[2rem]">
        <CardContent className="relative flex aspect-video items-center justify-center p-0 bg-muted/10">
            <Image 
                src={banner.image} 
                fill 
                alt="Promotion" 
                className="object-cover" 
                unoptimized={true}
                priority={true}
                loading="eager"
            />
        </CardContent>
      </Card>
    </CarouselItem>
  );
};

export default function HomePage() {
  const context = useContext(AppContext);
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { banners, isLoading: bannersLoading } = useBanners();
  const { products, isLoading: productsLoading } = useProducts();
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { allOrders, isLoading: ordersLoading } = useOrders();
  
  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )
  
  if (!context) return null;
  const { setActiveTab } = context;

  const isLoading = categoriesLoading || bannersLoading || productsLoading || restaurantsLoading || ordersLoading;

  const bestSellersByCategory = useMemo(() => {
    if (isLoading) return [];
    
    const salesCount: { [productId: string]: number } = {};
    allOrders.forEach(order => {
        order.items.forEach(item => {
            salesCount[item.product.id] = (salesCount[item.product.id] || 0) + item.quantity;
        });
    });

    const categoryGroups: { category: typeof categories[0]; products: typeof products }[] = [];

    categories.forEach(category => {
      const categoryProducts = products
        .filter(p => p.categoryId === category.id && salesCount[p.id] > 0)
        .sort((a, b) => salesCount[b.id] - salesCount[a.id])
        .slice(0, 10);

      if (categoryProducts.length > 0) {
        categoryGroups.push({
          category: category,
          products: categoryProducts
        });
      }
    });

    return categoryGroups;
  }, [isLoading, allOrders, products, categories]);

  if (isLoading) {
    return (
        <div className="p-4 space-y-8">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="w-full aspect-video rounded-lg" />
        <Skeleton className="h-8 w-1/4" />
        <div className="flex gap-4">
            <Skeleton className="h-32 w-24" />
            <Skeleton className="h-32 w-24" />
            <Skeleton className="h-32 w-24" />
        </div>
        </div>
    );
  }
  
  return (
    <div className="space-y-8 p-4 pb-20">
      <header>
        <h1 className="text-3xl font-black text-primary">سبيد شوب</h1>
        <p className="text-muted-foreground text-lg font-bold">أسرع توصيل في منطقتك!</p>
      </header>

      <section>
        <Carousel 
            className="w-full" 
            opts={{ loop: true, direction: 'rtl' }}
            plugins={[plugin.current]}
        >
          <CarouselContent>
            {(banners.length > 0 ? banners : [{id: 'placeholder', image: 'https://placehold.co/600x300.png'}]).map((banner) => (
              <BannerItem key={banner.id} banner={banner} />
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black">الأقسام</h2>
            <button onClick={() => setActiveTab(2)} className="text-primary font-black">عرض الكل</button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4 space-x-reverse pb-4">
                <button onClick={() => setActiveTab(2)} className="flex-shrink-0 group">
                    <div className="w-24 text-center">
                        <div className="p-4 bg-secondary rounded-[1.5rem] flex items-center justify-center aspect-square transition-all group-active:scale-90">
                            <Layers className="h-10 w-10 text-primary" />
                        </div>
                        <p className="mt-2 text-sm font-black truncate">الكل</p>
                    </div>
                </button>
                {categories.map((category) => (
                    <button key={category.id} onClick={() => setActiveTab(2)} className="flex-shrink-0 group">
                        <div className="w-24 text-center">
                            <div className="p-4 bg-secondary rounded-[1.5rem] flex items-center justify-center aspect-square transition-all group-active:scale-90">
                                <category.icon className="h-10 w-10 text-primary" />
                            </div>
                            <p className="mt-2 text-sm font-black truncate">{category.name}</p>
                        </div>
                    </button>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
      
      <section className="space-y-6">
        <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black">الأكثر مبيعاً</h2>
        </div>
        {bestSellersByCategory.map(({ category, products: categoryProducts }) => (
          <div key={category.id} className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-muted-foreground">{category.name}</h3>
                <button onClick={() => setActiveTab(2)} className="text-sm font-bold text-primary">مشاهدة الكل</button>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex w-max space-x-4 space-x-reverse pb-4">
                    {categoryProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        ))}
      </section>

      <section>
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-black flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
                أشهر المتاجر
            </h2>
             <button onClick={() => setActiveTab(1)} className="text-primary font-black">تصفح الكل</button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-5 space-x-reverse pb-6 px-1">
              {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} large={true} />
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
    </div>
  );
}
