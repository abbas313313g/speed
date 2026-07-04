
"use client";

import { useMemo, useContext } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { Star, ArrowRight, MapPin, Clock } from 'lucide-react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useProducts } from '@/hooks/useProducts';
import { Badge } from '@/components/ui/badge';
import { AppContext } from '@/contexts/AppContext';

export default function RestaurantProductsPage() {
  const context = useContext(AppContext);
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { products, isLoading: productsLoading } = useProducts();

  if (!context) return null;
  const { selectedRestaurantId, setActiveTab } = context;

  const restaurant = useMemo(() => restaurants.find(r => r.id === selectedRestaurantId), [selectedRestaurantId, restaurants]);
  const restaurantProducts = useMemo(() => products.filter(p => p.restaurantId === selectedRestaurantId), [selectedRestaurantId, products]);
  
  const isLoading = restaurantsLoading || productsLoading;

  if (isLoading) {
    return (
        <div className="p-4 space-y-4">
            <div className="flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-lg" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-6 w-24" />
                </div>
            </div>
        </div>
    );
  }

  if (!restaurant) {
      return <div className="text-center py-10 font-bold">لم يتم اختيار متجر بعد.</div>
  }

  const imageUrl = restaurant.image && (restaurant.image.startsWith('http') || restaurant.image.startsWith('data:')) ? restaurant.image : 'https://placehold.co/100x100.png';

  return (
    <div className="p-4 space-y-6 bg-background h-full overflow-y-auto pb-20">
       <header className="flex items-center gap-4">
            <button 
                onClick={() => setActiveTab(1)} 
                className="p-3 bg-secondary rounded-2xl text-primary active:scale-75 transition-all"
            >
                <ArrowRight className="h-6 w-6"/>
            </button>
            <h1 className="text-3xl font-black text-primary">{restaurant.name}</h1>
      </header>

      <div className="flex items-start gap-4 p-5 rounded-[2rem] bg-card border-none shadow-md">
         <div className="relative h-24 w-24 flex-shrink-0">
          <Image
            src={imageUrl}
            alt={restaurant.name}
            fill
            className="object-cover rounded-2xl"
            unoptimized={true}
          />
        </div>
        <div className="space-y-3 flex-grow">
            <Badge variant={restaurant.isStoreOpen ? 'secondary' : 'destructive'} className={`rounded-xl text-sm font-bold ${restaurant.isStoreOpen ? "bg-green-100 text-green-800" : ""}`}>
              {restaurant.isStoreOpen ? 'مفتوح الآن' : 'مغلق حاليًا'}
            </Badge>
            <div className="flex items-center gap-2 text-amber-500">
                <Star className="h-5 w-5 fill-current" />
                <span className="font-black text-foreground text-xl">{restaurant.rating.toFixed(1)}</span>
            </div>
            {restaurant.openTime && restaurant.closeTime && (
                <div className="flex items-center gap-2 text-base font-bold text-muted-foreground">
                    <Clock className="h-5 w-5 text-primary"/>
                    <span>{restaurant.openTime} - {restaurant.closeTime}</span>
                </div>
            )}
        </div>
      </div>

       <div className="space-y-6">
        <h2 className="text-2xl font-black text-primary">قائمة المنتجات</h2>
        {restaurantProducts && restaurantProducts.length > 0 ? (
             <div className="grid grid-cols-2 gap-4">
                {restaurantProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                ))}
             </div>
        ): (
            <div className="text-center py-12 bg-muted/10 rounded-[2rem] border-2 border-dashed">
                <p className="text-muted-foreground font-bold">لا توجد منتجات متوفرة حالياً في هذا المتجر.</p>
            </div>
        )}
      </div>

    </div>
  );
}
