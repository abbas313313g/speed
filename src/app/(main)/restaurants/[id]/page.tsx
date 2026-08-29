
"use client";

import { useMemo, useContext, useState, useEffect } from 'react';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { ArrowRight, Clock, Search, LayoutGrid, PackageOpen, Loader2 } from 'lucide-react';
import { useRestaurants } from '@/hooks/useRestaurants';
import { useProducts } from '@/hooks/useProducts';
import { Badge } from '@/components/ui/badge';
import { AppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RestaurantProductsPage() {
  const context = useContext(AppContext);
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSection, setActiveSection] = useState('all');

  if (!context) return null;
  const { selectedRestaurantId, setActiveTab } = context;

  // جلب منتجات هذا المتجر حصراً
  const { products, isLoading: productsLoading } = useProducts(undefined, selectedRestaurantId || undefined, 400);

  const restaurant = useMemo(() => restaurants.find(r => r.id === selectedRestaurantId), [selectedRestaurantId, restaurants]);
  
  const restaurantProducts = useMemo(() => {
      let list = products.filter(p => (p.status === 'approved' || !p.status) && p.isActive !== false && p.restaurantId === selectedRestaurantId);
      
      if (activeSection !== 'all') {
          list = list.filter(p => p.storeSectionId === activeSection);
      }
      
      if (searchTerm.trim() !== '') {
          list = list.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      
      return list;
  }, [products, activeSection, searchTerm, selectedRestaurantId]);
  
  // شرط التحميل "الصارم": ننتظر حتى وصول منتجات المتجر الصحيحة أو انتهاء التحميل بالكامل
  const isFullPageLoading = restaurantsLoading || (productsLoading && products.length === 0) || (products.length > 0 && products[0].restaurantId !== selectedRestaurantId);

  if (isFullPageLoading) {
    return (
        <div className="flex h-full w-full flex-col items-center justify-center bg-background p-10 text-center">
            <div className="p-8 rounded-[3rem] bg-primary/5 flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="relative">
                    <Search className="h-12 w-12 text-primary animate-bounce" />
                    <Loader2 className="h-12 w-12 animate-spin text-primary/20 absolute inset-0" />
                </div>
                <p className="font-black text-primary italic text-sm">جاري جلب منيو المتجر...</p>
            </div>
        </div>
    );
  }

  if (!restaurant) {
      return <div className="text-center py-20 font-bold">لم يتم اختيار متجر بعد.</div>
  }

  const imageUrl = restaurant.image && (restaurant.image.startsWith('http') || restaurant.image.startsWith('data:')) ? restaurant.image : 'https://placehold.co/100x100.png';

  return (
    <div className="p-4 space-y-6 bg-background h-full overflow-y-auto pb-32 text-right animate-in fade-in duration-500">
       <header className="flex items-center gap-4">
            <button 
                onClick={() => setActiveTab(1)} 
                className="p-3 bg-secondary rounded-2xl text-primary active:scale-75 transition-all shadow-sm"
            >
                <ArrowRight className="h-6 w-6"/>
            </button>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white truncate">{restaurant.name}</h1>
      </header>

      <div className="flex flex-col p-5 rounded-[2.5rem] bg-card dark:bg-slate-900 border-none shadow-md gap-4">
         <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 flex-shrink-0">
              <Image
                src={imageUrl}
                alt={restaurant.name}
                fill
                className="object-cover rounded-2xl"
                unoptimized={true}
              />
            </div>
            <div className="space-y-1 flex-grow">
                <Badge variant={restaurant.isStoreOpen ? 'secondary' : 'destructive'} className={`rounded-xl text-[10px] font-black ${restaurant.isStoreOpen ? "bg-green-100 text-green-800" : ""}`}>
                  {restaurant.isStoreOpen ? 'مفتوح الآن' : 'مغلق حاليًا'}
                </Badge>
                {restaurant.openTime && restaurant.closeTime && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground">
                        <Clock className="h-3 w-3 text-primary"/>
                        <span>{restaurant.openTime} - {restaurant.closeTime}</span>
                    </div>
                )}
            </div>
         </div>
      </div>

      <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input 
                placeholder={`ابحث في منيو ${restaurant.name}...`}
                className="pl-10 h-12 rounded-2xl border-2 font-bold shadow-sm bg-white dark:bg-slate-950"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {restaurant.menuSections && restaurant.menuSections.length > 0 && (
              <Tabs value={activeSection} onValueChange={setActiveSection} className="w-full">
                  <div className="overflow-x-auto scrollbar-hide">
                      <TabsList className="flex w-max h-auto bg-transparent gap-2 p-0">
                          <TabsTrigger 
                              value="all" 
                              className="h-10 px-5 rounded-xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted"
                          >
                              الكل
                          </TabsTrigger>
                          {restaurant.menuSections.map((section) => (
                              <TabsTrigger 
                                  key={section} 
                                  value={section}
                                  className="h-10 px-5 rounded-xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted"
                              >
                                  {section}
                              </TabsTrigger>
                          ))}
                      </TabsList>
                  </div>
              </Tabs>
          )}
      </div>

       <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
            {productsLoading && (
                <div className="flex items-center gap-2 text-primary animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-[10px] font-black">جاري التحديث...</span>
                </div>
            )}
            <h2 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                <LayoutGrid className="h-5 w-5 text-primary"/>
                قائمة الوجبات
            </h2>
        </div>
        
        {restaurantProducts && restaurantProducts.length > 0 ? (
             <div className="grid grid-cols-2 gap-4">
                {restaurantProducts.map((product, idx) => (
                    <div key={product.id} className="animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${idx * 40}ms` }}>
                        <ProductCard product={product} />
                    </div>
                ))}
             </div>
        ): !productsLoading && (
            <div className="text-center py-20 bg-muted/10 rounded-[2.5rem] border-2 border-dashed">
                <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground/20 mb-2" />
                <p className="text-muted-foreground font-black">لا توجد وجبات في هذا القسم حالياً.</p>
            </div>
        )}
      </div>

    </div>
  );
}
