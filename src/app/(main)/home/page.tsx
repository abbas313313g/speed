
"use client";

import { useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppContext } from "@/contexts/AppContext";
import { categories, products, restaurants } from "@/lib/mock-data";
import { ProductCard } from "@/components/ProductCard";
import { RestaurantCard } from "@/components/RestaurantCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const context = useContext(AppContext);
  const bestSellers = products.filter(p => p.bestSeller);
  
  return (
    <div className="space-y-8 p-4">
      <header>
        <h1 className="text-2xl font-bold">مرحباً, {context?.user?.name.split(" ")[0]}!</h1>
        <p className="text-muted-foreground">اطلب ما تشتهي، نصلك بأسرع وقت.</p>
      </header>

      <section>
        <Carousel className="w-full" opts={{ loop: true, direction: 'rtl' }}>
          <CarouselContent>
            {Array.from({ length: 3 }).map((_, index) => (
              <CarouselItem key={index}>
                <Card>
                  <CardContent className="relative flex aspect-video items-center justify-center p-0">
                    <Image src={`https://placehold.co/600x300.png`} fill alt={`Promotion ${index + 1}`} className="rounded-lg object-cover" data-ai-hint="food promotion" />
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="right-4 left-auto" />
          <CarouselNext className="left-4 right-auto" />
        </Carousel>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">الأقسام</h2>
        <ScrollArea className="w-full whitespace-nowrap rounded-md">
            <div className="flex w-max space-x-4 pb-4">
                {categories.map((category) => (
                    <Link href="/products" key={category.id} className="flex-shrink-0">
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
      
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">الأكثر مبيعاً</h2>
          <Link href="/products" className="text-sm font-semibold text-primary">
            عرض الكل
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {bestSellers.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-bold mb-4">أفضل المطاعم</h2>
        <div className="space-y-4">
          {restaurants.map((restaurant) => (
            <RestaurantCard key={restaurant.id} restaurant={restaurant} />
          ))}
        </div>
      </section>
    </div>
  );
}
