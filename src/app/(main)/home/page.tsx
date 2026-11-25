
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
  CheckCircle2,
  User,
  Wallet,
  LogOut,
  Moon,
  Sun,
  Bike,
  Info
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
import { calculateDistance, calculateDeliveryFee, formatCurrency, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export default function HomePage() {
  const context = useContext(AppContext);
  const { banners, isLoading: bannersLoading } = useBanners();
  const { restaurants } = useRestaurants();
  const { categories } = useCategories();
  const { allOrders } = useOrders();
  const { products: allProducts } = useProducts(undefined, undefined, 50);

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);

  if (!context) return null;
  const { addresses, setActiveTab, setSelectedRestaurantId, user, logout, walletBalance, isDarkMode, toggleDarkMode } = context;

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      setSelectedAddressId(addresses[0].id);
    }
  }, [addresses, selectedAddressId]);

  const activeAddress = useMemo(() => 
    addresses.find(a => a.id === selectedAddressId) || addresses[0], 
  [addresses, selectedAddressId]);

  // ريلز المتاجر مع حساب المسافة والفيز
  const restaurantReels = useMemo(() => {
    return restaurants.map(r => {
      let distance = 0;
      let fee = 1000;
      if (activeAddress && activeAddress.latitude && r.latitude) {
        distance = calculateDistance(activeAddress.latitude, activeAddress.longitude!, r.latitude, r.longitude!);
        fee = calculateDeliveryFee(distance);
      }
      return { ...r, distance, fee };
    }).sort((a, b) => (a.isStoreOpen ? -1 : 1));
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

  if (bannersLoading) return null;

  return (
    <div className="min-h-full bg-[#f8fafc] dark:bg-slate-950 pb-32 animate-in fade-in duration-700 text-right overflow-x-hidden">
      
      {/* Header الاحترافي الموحد */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-4 py-4 rounded-b-[2.8rem] shadow-sm">
        <div className="flex justify-between items-center flex-row-reverse">
            {/* زر الحساب والعناوين الموحد */}
            <Sheet open={isAccountSheetOpen} onOpenChange={setIsAccountSheetOpen}>
                <SheetTrigger asChild>
                    <button className="flex items-center gap-3 group active:scale-95 transition-all">
                        <div className="text-right">
                            <h1 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">توصيل إلى</h1>
                            <div className="flex items-center gap-1">
                                <span className="text-lg font-black text-slate-800 dark:text-white">
                                    {activeAddress?.name || "أضف عنواناً"}
                                </span>
                                <ChevronDown className="h-4 w-4 text-primary animate-bounce" />
                            </div>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-2xl border-2 border-primary/5 shadow-inner">
                            <User className="h-6 w-6 text-primary" />
                        </div>
                    </button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[85vh] rounded-t-[3.5rem] p-0 border-none shadow-2xl bg-background overflow-hidden">
                    <div className="p-8 space-y-8 h-full flex flex-col text-right overflow-y-auto pb-20">
                        <SheetHeader className="text-right flex flex-row-reverse items-center justify-between space-y-0">
                            <div>
                                <SheetTitle className="text-3xl font-black italic">لوحة التحكم</SheetTitle>
                                <p className="text-muted-foreground font-bold text-sm">أهلاً بك، {user?.name || 'زبون سبيد'}</p>
                            </div>
                            <Button variant="outline" size="icon" onClick={toggleDarkMode} className="h-12 w-12 rounded-2xl">
                                {isDarkMode ? <Sun className="h-6 w-6 text-yellow-500" /> : <Moon className="h-6 w-6" />}
                            </Button>
                        </SheetHeader>

                        {/* المحفظة */}
                        <div className="bg-primary p-6 rounded-[2.5rem] text-white flex justify-between items-center flex-row-reverse relative overflow-hidden shadow-2xl">
                            <div className="absolute left-[-20px] top-[-20px] opacity-10"><Wallet className="h-32 w-32" /></div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1">رصيد محفظتي</p>
                                <div className="text-4xl font-black tracking-tighter">{formatCurrency(walletBalance)}</div>
                            </div>
                            <div className="p-4 bg-white/20 rounded-[1.5rem] backdrop-blur-md relative z-10"><Wallet className="h-8 w-8" /></div>
                        </div>

                        {/* إدارة العناوين */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-row-reverse">
                                <h3 className="text-xl font-black">عناويني المسجلة</h3>
                                <button onClick={() => { setIsAccountSheetOpen(false); setActiveTab(6); }} className="text-primary font-black text-xs flex items-center gap-1"><Plus className="h-4 w-4"/> إضافة جديد</button>
                            </div>
                            <ScrollArea className="max-h-[300px] pr-2">
                                <div className="space-y-3">
                                    {addresses.map((address) => (
                                        <button 
                                            key={address.id}
                                            onClick={() => { setSelectedAddressId(address.id); setIsAccountSheetOpen(false); }}
                                            className={cn(
                                                "w-full p-5 rounded-[2rem] border-2 transition-all flex items-center gap-4 text-right",
                                                selectedAddressId === address.id ? "border-primary bg-primary/5 shadow-md" : "border-slate-100 bg-white dark:bg-slate-900"
                                            )}
                                        >
                                            <div className={cn("p-4 rounded-2xl", selectedAddressId === address.id ? "bg-primary text-white" : "bg-slate-50 text-slate-400")}>
                                                <HomeIcon className="h-6 w-6" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-lg flex items-center gap-2 justify-end">
                                                    {selectedAddressId === address.id && <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in" />}
                                                    {address.name}
                                                </p>
                                                <p className="text-[10px] font-bold text-muted-foreground truncate">{address.deliveryZone} - {address.phone}</p>
                                            </div>
                                        </button>
                                    ))}
                                    {addresses.length === 0 && <p className="text-center py-10 text-muted-foreground font-bold italic">لا توجد عناوين مسجلة حالياً.</p>}
                                </div>
                            </ScrollArea>
                        </div>

                        <Separator className="opacity-10" />

                        <div className="grid grid-cols-2 gap-3">
                            <Button variant="outline" className="h-14 rounded-2xl font-black gap-2" onClick={() => { setIsAccountSheetOpen(false); setActiveTab(7); }}><Info className="h-5 w-5" /> الدعم الفني</Button>
                            <Button variant="ghost" className="h-14 rounded-2xl font-black gap-2 text-destructive hover:bg-destructive/5" onClick={logout}><LogOut className="h-5 w-5" /> تسجيل خروج</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
            
            <div className="stamp-effect px-6 py-2 rounded-full transform -rotate-2">
                <h1 className="text-2xl font-black text-white italic tracking-tighter">SPEED</h1>
            </div>
        </div>
      </header>

      <div className="p-4 space-y-10 mt-2">
        {/* البنرات العصرية */}
        <section>
            <Carousel className="w-full" opts={{ loop: true, direction: 'rtl' }} plugins={[plugin.current]}>
                <CarouselContent>
                    {banners.map((banner, index) => (
                        <CarouselItem key={banner.id} className="basis-full px-1">
                            <div className="relative aspect-[21/10] w-full overflow-hidden rounded-[2.8rem] shadow-2xl border-4 border-white dark:border-slate-800">
                                <Image src={banner.image} fill alt="" className="object-cover" unoptimized={true} priority={index === 0} />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>
        </section>

        {/* الأقسام */}
        <section>
            <div className="flex items-center justify-between mb-5 px-1 flex-row-reverse">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">التصنيفات</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1">
                {categories.map((category) => {
                    const Icon = category.icon || ShoppingBasket;
                    return (
                        <button key={category.id} onClick={() => setActiveTab(2)} className="flex flex-col items-center gap-3 shrink-0 group">
                            <div className="h-20 w-20 rounded-[2.2rem] flex items-center justify-center shadow-xl bg-white dark:bg-slate-900 border-2 border-white dark:border-slate-800 text-primary group-active:scale-90 transition-all">
                                <Icon className="h-10 w-10" />
                            </div>
                            <span className="text-[11px] font-black text-slate-600 dark:text-slate-400">{category.name}</span>
                        </button>
                    )
                })}
            </div>
        </section>

        {/* ريلز المتاجر - الابتكار الجديد */}
        <section className="space-y-6">
            <div className="flex items-center justify-between px-1 flex-row-reverse">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
                    المتاجر القريبة <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500" />
                </h2>
                <Badge className="bg-primary/10 text-primary border-none font-black text-[10px]">تحديث لحظي 🛰️</Badge>
            </div>
            
            <div className="space-y-6">
                {restaurantReels.map((store) => (
                    <div 
                        key={store.id} 
                        onClick={() => handleStoreClick(store.id)}
                        className="w-full bg-white dark:bg-slate-900 rounded-[3.5rem] p-6 shadow-2xl border-2 border-white dark:border-slate-800 relative group active:scale-[0.98] transition-all overflow-hidden"
                    >
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[3rem] mb-6 shadow-inner">
                            <Image src={store.image} alt={store.name} fill className="object-cover transition-transform group-hover:scale-105 duration-1000" unoptimized={true} />
                            
                            {/* بطاقة السعر والمسافة العائمة */}
                            <div className="absolute bottom-4 right-4 left-4 flex justify-between items-center gap-3 flex-row-reverse">
                                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-6 py-3 rounded-3xl flex items-center gap-2 shadow-2xl border border-primary/10">
                                    <Bike className="h-5 w-5 text-primary animate-bounce" />
                                    <div className="flex flex-col text-right">
                                        <span className="text-[8px] font-black text-slate-400 uppercase leading-none">أجرة التوصيل</span>
                                        <span className="text-lg font-black text-primary leading-none mt-1">{formatCurrency(store.fee)}</span>
                                    </div>
                                </div>
                                <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2 shadow-xl border border-white/10">
                                    <Navigation2 className="h-4 w-4 text-white fill-white" />
                                    <span className="text-xs font-black text-white">{store.distance.toFixed(1)} كم</span>
                                </div>
                            </div>

                            {!store.isStoreOpen && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex items-center justify-center">
                                    <Badge variant="destructive" className="text-2xl font-black px-10 py-3 rounded-full rotate-[-5deg] shadow-2xl border-4 border-white">مغلق الآن</Badge>
                                </div>
                            )}
                        </div>

                        <div className="px-2 flex justify-between items-center flex-row-reverse">
                            <div className="text-right">
                                <h3 className="font-black text-2xl text-slate-800 dark:text-white leading-tight">{store.name}</h3>
                                <div className="flex items-center gap-2 justify-end mt-1">
                                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    <span className="text-sm font-black dark:text-slate-300">{store.rating}</span>
                                    <span className="text-[10px] text-muted-foreground font-bold mr-2">توصيل فائق السرعة ⚡</span>
                                </div>
                            </div>
                            <div className="h-14 w-14 bg-primary/10 rounded-[1.8rem] flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-lg">
                                <ChevronLeft className="h-8 w-8" />
                            </div>
                        </div>
                    </div>
                ))}
                {restaurantReels.length === 0 && (
                    <div className="p-20 text-center border-4 border-dashed rounded-[3.5rem] bg-muted/10 opacity-40">
                        <p className="font-black">لا توجد متاجر قريبة جداً حالياً.</p>
                    </div>
                )}
            </div>
        </section>

        {/* الأكثر مبيعاً */}
        {mostSoldProducts.length > 0 && (
            <section className="space-y-6">
                <div className="flex items-center justify-between px-1 flex-row-reverse">
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                        الأكثر طلباً <Flame className="h-6 w-6 text-orange-600 animate-pulse" />
                    </h2>
                    <button onClick={() => setActiveTab(2)} className="text-primary font-black text-xs">قائمة الوجبات</button>
                </div>
                <div className="grid grid-cols-2 gap-5 px-1">
                    {mostSoldProducts.map((product) => (
                        <div key={`sold-prod-${product.id}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ProductCard product={product} />
                        </div>
                    ))}
                </div>
            </section>
        )}
      </div>
    </div>
  );
}
