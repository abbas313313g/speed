
"use client";

import { useState, useMemo } from 'react';
import { RestaurantCard } from '@/components/RestaurantCard';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useCategories } from '@/hooks/useCategories';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, Store, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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
    <div className="p-4 space-y-6 pb-40">
      <header className="space-y-4">
        <div>
          <h1 className="text-3xl font-black text-primary">المتاجر</h1>
          <p className="text-muted-foreground font-bold">تصفح المتاجر حسب الفئة</p>
        </div>
        
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن متجر..."
            className="pr-10 h-12 rounded-2xl border-2 font-bold bg-white"
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
        
        <div className="mt-6">
           {searchTerm.trim() !== '' ? (
                <div className="space-y-5">
                    {filteredRestaurants.length > 0 ? (
                        filteredRestaurants.map((restaurant) => (
                            <RestaurantCard key={restaurant.id} restaurant={restaurant} large={true} />
                        ))
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed">
                            <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-muted-foreground font-black">لا توجد متاجر تطابق بحثك.</p>
                        </div>
                    )}
                </div>
           ) : activeTab === 'all' ? (
                <div className="space-y-10">
                    {categories.map((category) => {
                        const catStores = restaurants.filter(r => r.categoryId === category.id);
                        if (catStores.length === 0) return null;
                        
                        return (
                            <div key={category.id} className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <h2 className="text-2xl font-black flex items-center gap-2">
                                        <category.icon className="h-6 w-6 text-primary" />
                                        {category.name}
                                    </h2>
                                    <button onClick={() => setActiveTab(category.id)} className="text-xs font-bold text-primary">عرض الكل</button>
                                </div>
                                <ScrollArea className="w-full whitespace-nowrap">
                                    <div className="flex w-max space-x-4 space-x-reverse pb-6 px-1">
                                        {catStores.map((store) => (
                                            <RestaurantCard key={store.id} restaurant={store} compact={true} />
                                        ))}
                                    </div>
                                    <ScrollBar orientation="horizontal" />
                                </ScrollArea>
                            </div>
                        );
                    })}
                </div>
           ) : (
                <div className="space-y-5">
                    {filteredRestaurants.length > 0 ? (
                        filteredRestaurants.map((restaurant) => (
                            <RestaurantCard key={restaurant.id} restaurant={restaurant} large={true} />
                        ))
                    ) : (
                        <div className="text-center py-20 bg-muted/20 rounded-[2.5rem] border-2 border-dashed">
                            <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-muted-foreground font-black">لا توجد متاجر في هذا القسم حالياً.</p>
                        </div>
                    )}
                </div>
           )}
        </div>
        
        <div className="mt-12 py-10 flex flex-col items-center gap-2 opacity-30">
            <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-black">جارِ تحميل المتاجر والمنيو...</span>
            </div>
            <p className="text-[10px] font-bold">نحن نجلب لك أفضل العروض الحية</p>
        </div>
      </Tabs>
    </div>
  );
}
