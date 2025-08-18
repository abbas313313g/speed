
"use client";

import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { RestaurantCard } from '@/components/RestaurantCard';

export default function RestaurantsPage() {
  const context = useContext(AppContext);

  if (!context || context.isLoading) {
    return <div>جار التحميل...</div>;
  }
  
  const { restaurants } = context;

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">المتاجر</h1>
        <p className="text-muted-foreground">تصفح جميع المتاجر المتاحة.</p>
      </header>

      {restaurants.length > 0 ? (
         <div className="space-y-4">
            {restaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
            ))}
        </div>
      ) : (
          <p className="text-center text-muted-foreground py-10">لا توجد متاجر متاحة حالياً.</p>
      )}

    </div>
  );
}

