
"use client";

import React, { useContext, useState } from "react";
import Image from "next/image";
import { Star } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import type { Restaurant } from "@/lib/types";
import { Badge } from "./ui/badge";
import { AppContext } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

function RestaurantCardComponent({ restaurant }: RestaurantCardProps) {
  const context = useContext(AppContext);
  const [isImgLoading, setIsImgLoading] = useState(true);
  const imageUrl = restaurant.image && (restaurant.image.startsWith('http') || restaurant.image.startsWith('data:')) ? restaurant.image : 'https://picsum.photos/seed/speedr/400/400';
  
  const handleOpenRestaurant = () => {
    if (context) {
        context.setSelectedRestaurantId(restaurant.id);
        context.setActiveTab(10); 
    }
  };

  return (
    <div onClick={handleOpenRestaurant} className="group cursor-pointer">
      <Card className="overflow-hidden border-none shadow-md rounded-[1.5rem] bg-card p-3 flex items-center gap-4 transition-all active:scale-95">
        <div className={cn("relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl", isImgLoading && "animate-pulse bg-muted")}>
          <Image
            src={imageUrl}
            alt={restaurant.name}
            fill
            className={cn("object-cover transition-all duration-700", isImgLoading ? "blur-xl scale-110" : "blur-0 scale-100")}
            unoptimized={true}
            onLoadingComplete={() => setIsImgLoading(false)}
          />
        </div>
        <div className="flex-grow">
          <CardTitle className="text-lg font-black">{restaurant.name}</CardTitle>
          <div className="mt-1 flex items-center gap-1 text-amber-500">
            <Star className="h-4 w-4 fill-current" />
            <span className="font-bold text-foreground text-sm">{restaurant.rating.toFixed(1)}</span>
          </div>
        </div>
         <Badge variant={restaurant.isStoreOpen ? 'secondary' : 'destructive'} className={`rounded-xl ${restaurant.isStoreOpen ? "bg-green-100 text-green-700" : ""}`}>
              {restaurant.isStoreOpen ? 'مفتوح' : 'مغلق'}
          </Badge>
      </Card>
    </div>
  );
}

export const RestaurantCard = React.memo(RestaurantCardComponent);
