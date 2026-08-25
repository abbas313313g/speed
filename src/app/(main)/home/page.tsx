
"use client";

import { useRef, useContext } from "react";
import Image from "next/image";
import Autoplay from "embla-carousel-autoplay";
import { 
  ShoppingBasket, 
  Stethoscope, 
  UtensilsCrossed, 
  Gift, 
  Store, 
  ChevronLeft,
  Star,
  Flame
} from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AppContext } from "@/contexts/AppContext";
import { cn, formatCurrency } from "@/lib/utils";

// --- بيانات ثابتة مدمجة في الكود لضمان سرعة الإقلاع الفوري ---
// ملاحظة: يتم تحديث هذه المصفوفة يدوياً أو عبر طلب من الأدمن لتغيير الواجهة
const STATIC_BANNERS = [
  { id: 'b1', image: 'https://picsum.photos/seed/speed1/800/400', link: '#' },
  { id: 'b2', image: 'https://picsum.photos/seed/speed2/800/400', link: '#' },
];

const STATIC_CATEGORIES = [
  { id: 'cat1', name: 'مطاعم', icon: UtensilsCrossed, color: 'bg-orange-100 text-orange-600' },
  { id: 'cat2', name: 'ماركت', icon: ShoppingBasket, color: 'bg-green-100 text-green-600' },
  { id: 'cat3', name: 'صيدلية', icon: Stethoscope, color: 'bg-blue-100 text-blue-600' },
  { id: 'cat4', name: 'هدايا', icon: Gift, color: 'bg-pink-100 text-pink-600' },
];

const STATIC_STORES = [
  { id: 's1', name: 'مطعم القلعة', image: 'https://picsum.photos/seed/st1/400/300', rating: 4.8 },
  { id: 's2', name: 'ماركت العائلة', image: 'https://picsum.photos/seed/st2/400/300', rating: 4.5 },
  { id: 's3', name: 'صيدلية الشفاء', image: 'https://picsum.photos/seed/st3/400/300', rating: 4.9 },
  { id: 's4', name: 'حلويات الربيع', image: 'https://picsum.photos/seed/st4/400/300', rating: 4.7 },
  { id: 's5', name: 'برجر تايم', image: 'https://picsum.photos/seed/st5/400/300', rating: 4.6 },
  { id: 's6', name: 'اسواق مكة', image: 'https://picsum.photos/seed/st6/400/300', rating: 4.4 },
  { id: 's7', name: 'بيتزا هت', image: 'https://picsum.photos/seed/st7/400/300', rating: 4.8 },
  { id: 's8', name: 'عصائر الطبيعة', image: 'https://picsum.photos/seed/st8/400/300', rating: 4.5 },
];

export default function HomePage() {
  const context = useContext(AppContext);
  const plugin = useRef(Autoplay({ delay: 3000, stopOnInteraction: false }));
  
  const setActiveTab = context?.setActiveTab || (() => {});
  const setSelectedRestaurantId = context?.setSelectedRestaurantId || (() => {});
  const { filteredProducts } = context || { filteredProducts: [] };

  const handleStoreClick = (id: string) => {
    setSelectedRestaurantId(id);
    setActiveTab(10);
  };

  // جلب آخر 8 منتجات تم بيعها (اختياري حسب توفر البيانات)
  const topSellers = filteredProducts.slice(0, 8);

  return (
    <div className="space-y-8 p-4 pb-24 animate-in fade-in duration-300">
      <header className="flex justify-between items-center py-2">
        <div>
            <h1 className="text-3xl font-black text-primary leading-tight italic tracking-tighter">SPEED SHOP</h1>
            <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">أسرع توصيل في منطقتك</p>
        </div>
      </header>

      {/* قسم البانر الإعلاني - ثابت فورياً */}
      <section className="relative">
        <Carousel className="w-full" opts={{ loop: true, direction: 'rtl' }} plugins={[plugin.current]}>
            <CarouselContent>
                {STATIC_BANNERS.map((banner) => (
                    <CarouselItem key={banner.id} className="basis-full">
                        <div className="relative aspect-[21/9] w-full overflow-hidden rounded-[2rem] shadow-lg border-4 border-white">
                            <Image 
                                src={banner.image} 
                                fill 
                                alt="Promotion" 
                                className="object-cover" 
                                unoptimized={true}
                                priority={true}
                            />
                        </div>
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
      </section>

      {/* قسم الأقسام - ثابت فورياً */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-black text-slate-800">اكتشف الأقسام</h2>
            <button onClick={() => setActiveTab(1)} className="text-primary font-black text-xs">عرض الكل</button>
        </div>
        <div className="grid grid-cols-4 gap-3">
            {STATIC_CATEGORIES.map((category) => (
                <button 
                  key={category.id} 
                  onClick={() => setActiveTab(1)} 
                  className="flex flex-col items-center gap-2 group"
                >
                    <div className={cn("w-full aspect-square rounded-[1.5rem] flex items-center justify-center shadow-sm transition-all group-active:scale-90", category.color)}>
                        <category.icon className="h-8 w-8" />
                    </div>
                    <span className="text-[10px] font-black">{category.name}</span>
                </button>
            ))}
        </div>
      </section>

      {/* قسم أشهر المتاجر الـ 8 - ثابت فورياً */}
      <section>
         <div className="flex items-center justify-between mb-4 px-1">
            <h2 className="text-xl font-black text-slate-800">أشهر المتاجر</h2>
             <button onClick={() => setActiveTab(1)} className="text-primary font-black text-xs">تصفح المتاجر</button>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex w-max space-x-4 space-x-reverse pb-6 px-1">
                {STATIC_STORES.map((store) => (
                    <div 
                      key={store.id} 
                      onClick={() => handleStoreClick(store.id)}
                      className="w-[260px] shrink-0 bg-white rounded-[2.5rem] p-3 shadow-md border border-slate-50 relative group active:scale-95 transition-all"
                    >
                        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-[1.8rem] mb-3 bg-muted/10">
                            <Image 
                                src={store.image} 
                                alt={store.name} 
                                fill 
                                className="object-cover" 
                                unoptimized={true}
                                priority={true}
                            />
                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                <span className="text-[10px] font-black">{store.rating}</span>
                            </div>
                        </div>
                        <div className="px-2 flex justify-between items-center">
                            <div>
                                <h3 className="font-black text-sm text-slate-800">{store.name}</h3>
                                <p className="text-[9px] text-muted-foreground font-bold italic">أسرع توصيل في منطقتك</p>
                            </div>
                            <div className="p-2 bg-primary/10 rounded-xl">
                                <ChevronLeft className="h-4 w-4 text-primary" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </section>

      {/* قسم الأكثر مبيعاً - 8 منتجات فقط تدريجياً */}
      {topSellers.length > 0 && (
          <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                  <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                    <Flame className="h-5 w-5 text-red-500 animate-pulse" />
                    الأكثر طلباً الآن
                  </h2>
                  <button onClick={() => setActiveTab(2)} className="text-primary font-black text-xs">عرض المنيو</button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                  {topSellers.map((product) => (
                      <div 
                        key={product.id} 
                        onClick={() => { context?.setSelectedProductId(product.id); setActiveTab(9); }}
                        className="bg-white rounded-[2rem] p-2 shadow-sm border border-slate-50 flex flex-col gap-2"
                      >
                          <div className="relative aspect-square rounded-[1.5rem] overflow-hidden">
                              <Image src={product.image} fill alt={product.name} className="object-cover" unoptimized={true} loading="lazy" />
                          </div>
                          <div className="px-1 py-1">
                              <h3 className="font-black text-xs text-slate-800 truncate">{product.name}</h3>
                              <p className="text-primary font-black text-[10px] mt-1">{formatCurrency(product.price)}</p>
                          </div>
                      </div>
                  ))}
              </div>
          </section>
      )}

      <section className="bg-primary/5 p-8 rounded-[3rem] border-4 border-white shadow-inner text-center space-y-3">
            <h3 className="text-xl font-black text-primary italic">هل أنت صاحب متجر؟</h3>
            <p className="text-xs font-bold text-muted-foreground leading-relaxed">انضم إلينا الآن وزد مبيعاتك مع أسرع خدمة توصيل في المحافظة.</p>
            <button onClick={() => setActiveTab(7)} className="h-12 px-8 bg-primary text-white rounded-2xl font-black text-sm shadow-xl shadow-primary/20 active:scale-95 transition-all">تواصل معنا للتسجيل</button>
      </section>
    </div>
  );
}
