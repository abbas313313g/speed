
"use client";

import React, { useContext, useState } from "react";
import Image from "next/image";
import { Card, CardTitle } from "@/components/ui/card";
import type { Restaurant } from "@/lib/types";
import { Badge } from "./ui/badge";
import { AppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface RestaurantCardProps {
  restaurant: Restaurant;
  large?: boolean;
  compact?: boolean; 
}

function RestaurantCardComponent({ restaurant, large = false, compact = false }: RestaurantCardProps) {
  const context = useContext(AppContext);
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);
  
  if (imgError) return null;
  if (!restaurant.image) return null;

  const handleOpenRestaurant = () => {
    if (context) {
        context.setSelectedRestaurantId(restaurant.id);
        context.setActiveTab(10); 
    }
  };

  if (compact) {
      return (
        <div 
            onClick={handleOpenRestaurant} 
            className={cn(
                "group cursor-pointer w-[240px] shrink-0 transition-all duration-500",
                isImgLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
            )}
        >
            <Card className="overflow-hidden border-none shadow-md bg-card transition-all active:scale-95 p-3 rounded-[2rem]">
                <div className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl mb-3 bg-muted/20">
                    <Image
                        src={restaurant.image}
                        alt={restaurant.name}
                        fill
                        className="object-cover"
                        unoptimized={true}
                        onLoadingComplete={() => setIsImgLoading(false)}
                        onError={() => setImgError(true)}
                    />
                    {!restaurant.isStoreOpen && (
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center">
                            <Badge variant="destructive" className="text-[8px] font-black px-2 py-0.5 rounded-lg">مغلق</Badge>
                        </div>
                    )}
                </div>
                <div className="text-right px-1">
                    <CardTitle className="font-black text-slate-800 text-sm truncate">{restaurant.name}</CardTitle>
                    <p className="text-[9px] text-muted-foreground font-bold mt-1">توصيل سريع 🚀</p>
                </div>
            </Card>
        </div>
      );
  }

  return (
    <div 
        onClick={handleOpenRestaurant} 
        className={cn(
            "group cursor-pointer w-full transition-all duration-500",
            isImgLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
    >
      <Card className={cn(
          "overflow-hidden border-none shadow-md bg-card transition-all active:scale-95",
          large ? "p-4 rounded-[2.5rem]" : "p-3 rounded-[1.5rem] flex items-center gap-4"
      )}>
        <div className={cn(
            "relative flex-shrink-0 overflow-hidden rounded-2xl bg-muted/20",
            large ? "w-full aspect-[16/9] mb-4" : "h-20 w-20"
        )}>
          <Image
            src={restaurant.image}
            alt={restaurant.name}
            fill
            className="object-cover"
            unoptimized={true}
            onLoadingComplete={() => setIsImgLoading(false)}
            onError={() => setImgError(true)}
          />
          {large && !restaurant.isStoreOpen && (
              <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                  <Badge variant="destructive" className="text-sm font-black px-4 py-1.5 rounded-xl">مغلق حالياً</Badge>
              </div>
          )}
        </div>
        <div className="flex-grow text-right">
          <div className="flex justify-between items-start">
             <CardTitle className={cn("font-black text-slate-800", large ? "text-2xl" : "text-lg")}>{restaurant.name}</CardTitle>
             {!large && (
                 <Badge variant={restaurant.isStoreOpen ? 'secondary' : 'destructive'} className={cn("rounded-xl text-[10px]", restaurant.isStoreOpen && "bg-green-100 text-green-700")}>
                    {restaurant.isStoreOpen ? 'مفتوح' : 'مغلق'}
                 </Badge>
             )}
          </div>
          
          <div className="flex flex-col gap-1 mt-1">
             <p className="text-[10px] text-muted-foreground font-bold">أسرع توصيل في منطقتك</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const RestaurantCard = React.memo(RestaurantCardComponent);
