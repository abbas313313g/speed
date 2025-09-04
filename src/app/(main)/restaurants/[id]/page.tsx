
"use client";

import { useContext, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Star, ArrowRight, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function RestaurantProductsPage() {
  const { id } = useParams();
  const context = useContext(AppContext);
  const router = useRouter();

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

  const imageUrl = restaurant.image && (restaurant.image.startsWith('http') || restaurant.image.startsWith('data:')) ? restaurant.image : 'https://placehold.co/100x100.png';

  return (
    <div className="p-4 space-y-6">
       <header className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.back()}>
                <ArrowRight className="h-5 w-5"/>
            </Button>
            <h1 className="text-3xl font-bold">{restaurant.name}</h1>
      </header>

      <div className="flex items-center gap-4 p-4 rounded-lg bg-card">
         <div className="relative h-24 w-24 flex-shrink-0">
          <Image
            src={imageUrl}
            alt={restaurant.name}
            fill
            className="object-cover rounded-lg"
            data-ai-hint="store logo"
            unoptimized={true}
          />
        </div>
        <div className="space-y-2">
             <div className="flex items-center gap-1 text-amber-500">
                <Star className="h-5 w-5 fill-current" />
                <span className="font-semibold text-foreground text-lg">{restaurant.rating.toFixed(1)}</span>
            </div>
             {restaurant.latitude && restaurant.longitude && (
                 <a href={`https://www.google.com/maps?q=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm">
                        <MapPin className="ml-2 h-4 w-4" />
                        عرض على الخريطة
                    </Button>
                </a>
            )}
        </div>
      </div>

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
