
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
  
  const handleOpenRestaurant = () => {
    if (context) {
        context.setSelectedRestaurantId(restaurant.id);
        context.setActiveTab(10); 
    }
  };

  return (
    <div 
        onClick={handleOpenRestaurant} 
        className={cn(
            "group cursor-pointer transition-all duration-300 relative",
            compact ? "w-[240px] shrink-0" : (large ? "w-[300px] shrink-0" : "w-full")
        )}
    >
      <Card className={cn(
          "overflow-hidden border-none shadow-md bg-card transition-all active:scale-95 w-full",
          compact ? "p-3 rounded-[2rem]" : (large ? "p-4 rounded-[2.5rem]" : "p-3 rounded-[1.5rem] flex items-center gap-4")
      )}>
          <div className={cn(
              "relative flex-shrink-0 overflow-hidden rounded-2xl bg-muted/20",
              compact ? "w-full aspect-[4/3] mb-3" : (large ? "w-full aspect-[16/9] mb-4" : "h-20 w-20")
          )}>
              {restaurant.image && (
                  <Image
                      src={restaurant.image}
                      alt={restaurant.name}
                      fill
                      className={cn("object-cover transition-all duration-500", isImgLoading ? "blur-md scale-110" : "blur-0 scale-100")}
                      unoptimized={true}
                      onLoadingComplete={() => setIsImgLoading(false)}
                  />
              )}
              {!restaurant.isStoreOpen && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <Badge variant="destructive" className="text-[8px] font-black px-2 py-0.5 rounded-lg">مغلق</Badge>
                  </div>
              )}
          </div>
          <div className="flex-grow text-right">
              <div className="flex justify-between items-start">
                  <CardTitle className={cn("font-black text-slate-800", large ? "text-2xl" : "text-sm truncate")}>{restaurant.name}</CardTitle>
                  {!large && !compact && (
                      <Badge variant={restaurant.isStoreOpen ? 'secondary' : 'destructive'} className={cn("rounded-xl text-[10px]", restaurant.isStoreOpen && "bg-green-100 text-green-700")}>
                          {restaurant.isStoreOpen ? 'مفتوح' : 'مغلق'}
                      </Badge>
                  )}
              </div>
              <p className="text-[9px] text-muted-foreground font-bold mt-1">أسرع توصيل في منطقتك</p>
          </div>
      </Card>
    </div>
  );
}

export const RestaurantCard = React.memo(RestaurantCardComponent);
