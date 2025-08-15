
"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Restaurant } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: Restaurant;
}

export function RestaurantCard({ restaurant }: RestaurantCardProps) {
  return (
    <Link href="#" className="group block">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 flex items-center gap-4 p-4">
        <div className="relative h-20 w-20 flex-shrink-0">
          <Image
            src={restaurant.image}
            alt={restaurant.name}
            fill
            className="object-cover rounded-md"
            data-ai-hint="restaurant logo"
          />
        </div>
        <div className="flex-grow">
          <CardTitle className="text-lg">{restaurant.name}</CardTitle>
          <div className="mt-2 flex items-center gap-1 text-amber-500">
            <Star className="h-5 w-5 fill-current" />
            <span className="font-semibold text-foreground">{restaurant.rating}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
