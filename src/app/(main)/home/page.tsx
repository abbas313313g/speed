
"use client";

import { useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
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
import { Layers } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/hooks/useCategories";
import { useBanners } from "@/hooks/useBanners";
import { useProducts } from "@/hooks/useProducts";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useOrders } from "@/hooks/useOrders";


export default function HomePage() {
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { banners, isLoading: bannersLoading } = useBanners();
  const { products, isLoading: productsLoading } = useProducts();
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { allOrders, isLoading: ordersLoading } = useOrders();
  
  const plugin = useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )
  
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
        .slice(0, 10); // Get top 10 best sellers per category

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
        <Skeleton className="h-8 w-1/3" />
        <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
        </div>
    );
  }
  
  return (
    <div className="space-y-8 p-4">
      <header>
        <h1 className="text-2xl font-bold">مرحباً بك في سبيد شوب!</h1>
        <p className="text-muted-foreground">اطلب ما تشتهي، نصلك بأسرع وقت.</p>
      </header>

      <section>
        <Carousel 
            className="w-full" 
            opts={{ loop: true, direction: 'rtl' }}
            plugins={[plugin.current]}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
        >
          <CarouselContent>
            {(banners.length > 0 ? banners : [{id: 'placeholder', image: 'https://placehold.co/600x300.png', link: '#'}]).map((banner, index) => (
              <CarouselItem key={banner.id}>
                <Link href={banner.link}>
                    <Card>
                    <CardContent className="relative flex aspect-video items-center justify-center p-0">
                        <Image src={banner.image} fill alt={`Promotion ${index + 1}`} className="rounded-lg object-cover" data-ai-hint="shopping promotion" unoptimized={true}/>
                    </CardContent>
                    </Card>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">الأقسام</h2>
            <Link href="/products" className="text-sm font-semibold text-primary">
                عرض الكل
            </Link>
        </div>
        <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex w-max space-x-4 pb-4">
                <Link href="/products" className="flex-shrink-0">
                    <div className="w-24 text-center group">
                        <div className="p-4 bg-secondary rounded-lg flex items-center justify-center aspect-square transition-colors group-hover:bg-primary">
                            <Layers className="h-10 w-10 text-primary transition-colors group-hover:text-primary-foreground" />
                        </div>
                        <p className="mt-2 text-sm font-medium truncate">الكل</p>
                    </div>
                </Link>
                {categories.map((category) => (
                    <Link href={`/products?category=${category.id}`} key={category.id} className="flex-shrink-0">
                        <div className="w-24 text-center group">
                            <div className="p-4 bg-secondary rounded-lg flex items-center justify-center aspect-square transition-colors group-hover:bg-primary">
                                <category.icon className="h-10 w-10 text-primary transition-colors group-hover:text-primary-foreground" />
                            </div>
                            <p className="mt-2 text-sm font-medium truncate">{category.name}</p>
                        </div>
                    </Link>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
      
      <section className="space-y-6">
        <h2 className="text-xl font-bold">الأكثر مبيعاً</h2>
        {bestSellersByCategory.map(({ category, products: categoryProducts }) => (
          <div key={category.id}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold">{category.name}</h3>
                <Link href={`/products?category=${category.id}`} className="text-sm font-semibold text-primary">
                    عرض الكل
                </Link>
            </div>
            <ScrollArea className="w-full whitespace-nowrap rounded-md">
                <div className="flex w-max space-x-4 pb-4">
                    {categoryProducts.map((product) => (
                        <div key={product.id} className="w-40 flex-shrink-0">
                          <ProductCard product={product} />
                        </div>
                    ))}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        ))}
      </section>

      <section>
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">أشهر المتاجر</h2>
             <Link href="/restaurants" className="text-sm font-semibold text-primary">
                عرض الكل
            </Link>
        </div>
        <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex w-max space-x-4 pb-4">
              {restaurants.map((restaurant) => (
                <div key={restaurant.id} className="w-80 flex-shrink-0">
                  <RestaurantCard restaurant={restaurant} />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>
    </div>
  );
}
