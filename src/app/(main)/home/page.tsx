
"use client";

import { useRef, useContext, useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import { 
  ChevronLeft,
  Star,
  Flame,
  ShoppingBasket,
  MapPin,
  Plus,
  ChevronDown,
  Navigation2,
  Sparkles,
  Home as HomeIcon,
  PlusCircle,
  CheckCircle2
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { AppContext } from "@/contexts/AppContext";
import { useBanners } from "@/hooks/useBanners";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useCategories } from "@/hooks/useCategories";
import { useProducts } from "@/hooks/useProducts";
import { useAppSettings } from "@/hooks/useAppSettings";
import { useOrders } from "@/hooks/useOrders";
import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { calculateDistance, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const context = useContext(AppContext);
  const { banners, isLoading: bannersLoading } = useBanners();
  const { restaurants } = useRestaurants();
  const { categories } = useCategories();
  const { settings } = useAppSettings();
  const { allOrders } = useOrders();
  const { products: allProducts } = useProducts(undefined, undefined, 50);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAddressSheetOpen, setIsAddressSheetOpen] = useState(false);

  if (!context) return null;
  const { addresses, setActiveTab, setSelectedRestaurantId } = context;

  // اختيار أول عنوان تلقائياً إذا لم يتم الاختيار
  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  const activeAddress = useMemo(() => 
    addresses.find(a => a.id === selectedAddressId) || addresses[0], 
  [addresses, selectedAddressId]);

  // تصفية المتاجر القريبة بناءً على العنوان المختار (22 كم)
  const nearbyRestaurants = useMemo(() => {
    if (!activeAddress) return restaurants;
    return restaurants.filter(r => {
      if (!r.latitude || !r.longitude || !activeAddress.latitude || !activeAddress.longitude) return true;
      const dist = calculateDistance(activeAddress.latitude, activeAddress.longitude, r.latitude, r.longitude);
      return dist <= 22;
    });
  }, [restaurants, activeAddress]);

  const mostSoldProducts = useMemo(() => {
      if (!allOrders.length || !allProducts.length) return [];
      const counts: {[key: string]: number} = {};
      const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
      deliveredOrders.forEach(order => {
          order.items.forEach(item => {
              counts[item.product.id] = (counts[item.product.id] || 0) + item.quantity;
          });
      });
      return [...allProducts]
          .filter(p => counts[p.id] > 0)
          .sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
          .slice(0, 8);
  }, [allOrders, allProducts]);

  const plugin = useRef(Autoplay({ delay: 4000, stopOnInteraction: false }));
  
  const handleStoreClick = (id: string) => {
    setSelectedRestaurantId(id);
    setActiveTab(10);
  };

  const handleBannerClick = (banner: any) => {
      if (banner.linkType === 'restaurant' && banner.link) {
          handleStoreClick(banner.link);
      }
  };

  if (bannersLoading) return null;

  return (
    <div className="min-h-full bg-[#f8fafc] dark:bg-slate-950 pb-32 animate-in fade-in duration-700 text-right">
      
      {/* Header المطور مع نظام اختيار العناوين الجديد */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-4 py-4 rounded-b-[2.8rem] shadow-sm">
        <div className="flex justify-between items-center flex-row-reverse">
            <div className="flex items-center gap-3">
                <div className="text-right">
                    <h1 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">توصيل إلى</h1>
                    <Sheet open={isAddressSheetOpen} onOpenChange={setIsAddressSheetOpen}>
                        <SheetTrigger asChild>
                            <button className="flex items-center gap-1 group">
                                <span className="text-xl font-black text-slate-800 dark:text-white group-active:scale-95 transition-all">
                                    {activeAddress?.name || "أضف عنواناً"}
                                </span>
                                <ChevronDown className="h-5 w-5 text-primary animate-bounce" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="bottom" className="h-[65vh] rounded-t-[3.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden">
                            <div className="p-8 space-y-6 h-full flex flex-col text-right">
                                <SheetHeader className="text-right">
                                    <SheetTitle className="text-3xl font-black">عناويني المسجلة</SheetTitle>
                                    <p className="text-muted-foreground font-bold text-sm">اختر الموقع الذي تطلب منه الآن</p>
                                </SheetHeader>

                                <div className="space-y-4">
                                    <button 
                                        onClick={() => { setIsAddressSheetOpen(false); setActiveTab(6); }}
                                        className="w-full p-6 flex items-center justify-center gap-3 bg-primary/10 text-primary border-2 border-dashed border-primary/30 rounded-[2rem] font-black text-lg hover:bg-primary/20 transition-all active:scale-95"
                                    >
                                        <PlusCircle className="h-6 w-6" />
                                        إضافة عنوان جديد
                                    </button>
                                </div>

                                <ScrollArea className="flex-1 pr-2">
                                    <div className="space-y-3 pb-10">
                                        {addresses.map((address) => (
                                            <button 
                                                key={address.id}
                                                onClick={() => { setSelectedAddressId(address.id); setIsAddressSheetOpen(false); }}
                                                className={cn(
                                                    "w-full p-5 rounded-[2rem] border-2 transition-all active:scale-95 flex items-center gap-4 text-right",
                                                    selectedAddressId === address.id ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 bg-white dark:bg-slate-900"
                                                )}
                                            >
                                                <div className={cn("p-4 rounded-2xl", selectedAddressId === address.id ? "bg-primary text-white" : "bg-slate-50 text-slate-400")}>
                                                    <HomeIcon className="h-6 w-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 justify-end">
                                                        {selectedAddressId === address.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                                                        <p className="font-black text-lg">{address.name}</p>
                                                    </div>
                                                    <p className="text-xs font-bold text-muted-foreground truncate">{address.deliveryZone} - {address.phone}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
                <div className="p-3.5 bg-primary/10 rounded-2xl border-2 border-primary/5">
                    <MapPin className="h-7 w-7 text-primary" />
                </div>
            </div>
            
            <button 
                onClick={() => setIsAddressSheetOpen(true)}
                className="h-12 w-12 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 shadow-sm flex items-center justify-center text-primary active:scale-75 transition-all"
            >
                <Plus className="h-6 w-6" />
            </button>
        </div>
      </header>

      <div className="p-4 space-y-8 mt-2">
        {/* البنرات العصرية */}
        <section className="relative">
            <Carousel className="w-full" opts={{ loop: true, direction: 'rtl' }} plugins={[plugin.current]}>
                <CarouselContent>
                    {banners.map((banner, index) => (
                        <CarouselItem key={banner.id} className="basis-full cursor-pointer px-1" onClick={() => handleBannerClick(banner)}>
                            <div className="relative aspect-[21/10] w-full overflow-hidden rounded-[2.8rem] shadow-2xl border-4 border-white dark:border-slate-800 transition-transform active:scale-95">
                                <Image src={banner.image} fill alt="" className="object-cover" unoptimized={true} priority={index === 0} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>

        {/* الأقسام بتصميم حديث */}
        <section>
            <div className="flex items-center justify-between mb-5 px-1 flex-row-reverse">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">استكشف القائمة</h2>
                <button onClick={() => setActiveTab(1)} className="text-primary font-black text-xs bg-primary/5 px-4 py-2 rounded-full">الكل</button>
            </div>
            <div className="grid grid-cols-4 gap-4">
                {categories.slice(0, 4).map((category) => {
                    const Icon = category.icon || ShoppingBasket;
                    return (
                        <button key={category.id} onClick={() => { setActiveTab(1); }} className="flex flex-col items-center gap-2 group">
                            <div className="w-full aspect-square rounded-[2.5rem] flex items-center justify-center shadow-lg bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-800 text-primary group-active:scale-90 transition-all">
                                <Icon className="h-9 w-9" />
                            </div>
                            <span className="text-[10px] font-black text-slate-600 dark:text-slate-400">{category.name}</span>
                        </button>
                    )
                })}
            </div>
        </section>

        {/* المتاجر المتميزة بتصميم Premium */}
        <section>
            <div className="flex items-center justify-between mb-5 px-1 flex-row-reverse">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                    أشهر المتاجر <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
                </h2>
                <button onClick={() => setActiveTab(1)} className="text-primary font-black text-xs">تصفح</button>
            </div>
            <ScrollArea className="w-full whitespace-nowrap" dir="rtl">
                <div className="flex w-max space-x-5 space-x-reverse pb-6 px-1">
                    {nearbyRestaurants.map((store) => (
                        <div 
                            key={store.id} 
                            onClick={() => handleStoreClick(store.id)}
                            className="w-[300px] shrink-0 bg-white dark:bg-slate-900 rounded-[3rem] p-5 shadow-2xl border border-white dark:border-slate-800 relative group active:scale-95 transition-all"
                        >
                            <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[2.5rem] mb-4 bg-muted/10">
                                <Image src={store.image} alt={store.name} fill className="object-cover transition-transform group-hover:scale-110 duration-700" unoptimized={true} />
                                <div className="absolute top-4 right-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-[1.2rem] flex items-center gap-1.5 shadow-xl">
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    <span className="text-sm font-black">{store.rating}</span>
                                </div>
                            </div>
                            <div className="px-1 flex justify-between items-center flex-row-reverse">
                                <div className="text-right">
                                    <h3 className="font-black text-xl text-slate-800 dark:text-white truncate max-w-[180px]">{store.name}</h3>
                                    <p className="text-xs text-muted-foreground font-bold flex items-center gap-1 justify-end mt-1">
                                        توصيل سريع وخدمة ممتازة <Navigation2 className="h-3 w-3 text-primary" />
                                    </p>
                                </div>
                                <div className="p-4 bg-primary/10 rounded-[1.5rem] group-hover:bg-primary group-hover:text-white transition-colors">
                                    <ChevronLeft className="h-6 w-6 text-primary group-hover:text-white" />
                                </div>
                            </div>
                        </div>
                    ))}
                    {nearbyRestaurants.length === 0 && (
                        <div className="p-10 text-center w-[300px] border-4 border-dashed rounded-[3rem] opacity-30">
                            لا توجد متاجر قريبة من هذا العنوان حالياً.
                        </div>
                    )}
                </div>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </section>

        {/* الأكثر مبيعاً */}
        {mostSoldProducts.length > 0 && (
            <section className="space-y-5">
                <div className="flex items-center justify-between px-1 flex-row-reverse">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        الأكثر طلباً <Flame className="h-6 w-6 text-orange-600 animate-pulse" />
                    </h2>
                    <button onClick={() => setActiveTab(2)} className="text-primary font-black text-xs">قائمة الوجبات</button>
                </div>
                <div className="grid grid-cols-2 gap-5">
                    {mostSoldProducts.map((product) => (
                        <div key={`sold-prod-${product.id}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </section>
        )}
      </div>

      {/* واجهة تعليمية لأول دخول */}
      {addresses.length === 0 && (
          <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-500">
              <div className="w-full max-w-sm rounded-[3.5rem] p-10 text-center space-y-8 border-none shadow-2xl bg-white animate-in zoom-in-95 duration-300">
                  <div className="w-28 h-28 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <MapPin className="h-14 w-14 text-primary animate-bounce" />
                  </div>
                  <div className="space-y-3">
                      <h2 className="text-4xl font-black text-slate-800">أهلاً بك في سبيد!</h2>
                      <p className="text-muted-foreground font-bold leading-relaxed">
                          لكي تستمتع بأسرع خدمة توصيل في جنوب بابل، يرجى إضافة عنوانك الأول أولاً.
                      </p>
                  </div>
                  <Button 
                    onClick={() => setActiveTab(6)}
                    className="w-full h-20 rounded-[1.8rem] text-2xl font-black shadow-2xl shadow-primary/20 transition-all active:scale-95"
                  >
                      ابدأ بإضافة عنوانك
                  </Button>
              </div>
          </div>
      )}
    </div>
  );
}
