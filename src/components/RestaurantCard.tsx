
"use client";

import React, { useContext, useState, useMemo } from "react";
import Image from "next/image";
import { Star, MapPin } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import type { Restaurant } from "@/lib/types";
import { Badge } from "./ui/badge";
import { AppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";
import { useBranches } from "@/hooks/useBranches";

interface RestaurantCardProps {
  restaurant: Restaurant;
  large?: boolean;
}

function RestaurantCardComponent({ restaurant, large = false }: RestaurantCardProps) {
  const context = useContext(AppContext);
  const { branches } = useBranches();
  const [isImgLoading, setIsImgLoading] = useState(true);
  
  const imageUrl = restaurant.image && (restaurant.image.startsWith('http') || restaurant.image.startsWith('data:')) ? restaurant.image : 'https://picsum.photos/seed/speedr/400/400';
  
  const branchName = useMemo(() => {
      if (restaurant.branchId === 'main') return 'فرع المدحتية';
      return branches.find(b => b.id === restaurant.branchId)?.name || 'فرع مستقل';
  }, [restaurant.branchId, branches]);

  const handleOpenRestaurant = () => {
    if (context) {
        context.setSelectedRestaurantId(restaurant.id);
        context.setActiveTab(10); 
    }
  };

  return (
    <div onClick={handleOpenRestaurant} className="group cursor-pointer w-full">
      <Card className={cn(
          "overflow-hidden border-none shadow-md bg-card transition-all active:scale-95",
          large ? "p-4 rounded-[2.5rem]" : "p-3 rounded-[1.5rem] flex items-center gap-4"
      )}>
        <div className={cn(
            "relative flex-shrink-0 overflow-hidden rounded-2xl",
            large ? "w-full aspect-[16/9] mb-4" : "h-20 w-20",
            isImgLoading && "animate-pulse bg-muted"
        )}>
          <Image
            src={imageUrl}
            alt={restaurant.name}
            fill
            className={cn("object-cover transition-all duration-700", isImgLoading ? "blur-xl scale-110" : "blur-0 scale-100")}
            unoptimized={true}
            onLoadingComplete={() => setIsImgLoading(false)}
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
            <div className="flex items-center gap-1 text-primary">
                <MapPin className="h-3 w-3" />
                <span className="text-[10px] font-black">{branchName}</span>
            </div>
            <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-black text-foreground text-sm">{restaurant.rating.toFixed(1)}</span>
                <span className="text-[10px] text-muted-foreground font-bold mr-1">(أكثر من 100 تقييم)</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export const RestaurantCard = React.memo(RestaurantCardComponent);
