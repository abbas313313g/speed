
"use client";

import { useState, useMemo } from 'react';
import { RestaurantCard } from '@/components/RestaurantCard';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCategories } from '@/hooks/useCategories';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, Store } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function RestaurantsPage() {
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  const { categories, isLoading: categoriesLoading } = useCategories();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const isLoading = restaurantsLoading || categoriesLoading;

  const filteredRestaurants = useMemo(() => {
      let list = restaurants;

      if(activeTab !== 'all') {
          list = list.filter(r => r.categoryId === activeTab);
      }

      if(searchTerm.trim() !== '') {
          list = list.filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      
      return list;
  }, [restaurants, activeTab, searchTerm]);

  if (isLoading) {
    return (
        <div className="p-4 space-y-6">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-12 w-full" />
            <div className="space-y-4">
                <Skeleton className="h-48 w-full rounded-[2.5rem]" />
                <Skeleton className="h-48 w-full rounded-[2.5rem]" />
            </div>
        </div>
    );
  }
  
  return (
    <div className="p-4 space-y-6 pb-20">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-black text-primary">المتاجر</h1>
          <p className="text-muted-foreground font-bold">تصفح المتاجر حسب الفئة</p>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن متجر..."
            className="pl-10 h-12 rounded-2xl border-2 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-hide pb-2">
            <TabsList className="flex w-max h-auto bg-transparent gap-2 p-0">
                <TabsTrigger 
                    value="all" 
                    className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted"
                >
                    الكل
                </TabsTrigger>
                {categories.map((category) => (
                    <TabsTrigger 
                        key={category.id} 
                        value={category.id}
                        className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted gap-2"
                    >
                        <category.icon className="h-4 w-4" />
                        {category.name}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
        
        <div className="mt-6 space-y-5">
           {filteredRestaurants.length > 0 ? (
                filteredRestaurants.map((restaurant) => (
                    <RestaurantCard key={restaurant.id} restaurant={restaurant} large={true} />
                ))
            ) : (
                <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed">
                    <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground font-black">
                        لا توجد متاجر تطابق بحثك حالياً.
                    </p>
                </div>
            )}
        </div>
      </Tabs>
    </div>
  );
}
