
"use client";

import { useContext, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Star } from 'lucide-react';

export default function RestaurantProductsPage() {
  const { id } = useParams();
  const context = useContext(AppContext);

  const restaurant = useMemo(() => context?.restaurants.find(r => r.id === id), [id, context?.restaurants]);
  const restaurantProducts = useMemo(() => context?.products.filter(p => p.restaurantId === id), [id, context?.products]);
  
  if (!context || context.isLoading) {
    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-24" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  if (!restaurant) {
      return <div className="text-center py-10">لم يتم العثور على المتجر.</div>
  }

  return (
    <div className="p-4 space-y-6">
      <header className="flex items-center gap-4">
         <div className="relative h-24 w-24 flex-shrink-0">
          <Image
            src={restaurant.image}
            alt={restaurant.name}
            fill
            className="object-cover rounded-lg"
            data-ai-hint="store logo"
          />
        </div>
        <div>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
            <div className="mt-2 flex items-center gap-1 text-amber-500">
                <Star className="h-5 w-5 fill-current" />
                <span className="font-semibold text-foreground">{restaurant.rating.toFixed(1)}</span>
            </div>
        </div>
      </header>

       <div>
        <h2 className="text-xl font-bold mb-4">منتجات المتجر</h2>
        {restaurantProducts && restaurantProducts.length > 0 ? (
             <div className="grid grid-cols-2 gap-4">
                {restaurantProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
             </div>
        ): (
            <p className="text-muted-foreground text-center py-8">لا توجد منتجات في هذا المتجر حالياً.</p>
        )}
      </div>

    </div>
  );
}

