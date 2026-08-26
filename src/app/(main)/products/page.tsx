
"use client";

import { useState, useMemo, Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from "@/components/ProductCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, PackageOpen, Loader2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(initialCategory);
  const [currentLimit, setCurrentLimit] = useState(10);
  
  // نظام الظهور المتسلسل الذكي (واحد تلو الآخر)
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]);
  const queueRef = useRef<any[]>([]);
  const isProcessingQueue = useRef(false);

  // جلب البيانات: محدد بـ 10 في البداية، مع دعم البحث الشامل
  const { products, isLoading, hasMore } = useProducts(
      undefined, 
      undefined, 
      currentLimit, 
      undefined, 
      searchTerm
  );
  
  const { categories } = useCategories();

  // فلترة الأقسام محلياً
  const filteredProducts = useMemo(() => {
      let prods = products.filter(p => p.isActive !== false);
      if (activeTab !== 'all') prods = prods.filter(p => p.categoryId === activeTab);
      return prods;
  }, [products, activeTab]);

  // محرك التحميل اللحظي: يضيف الوجبات بتتابع زمني تدريجي فردي (واحد واحد)
  useEffect(() => {
    // تحديد المنتجات الجديدة التي لم تظهر بعد في القائمة المعروضة
    const newItems = filteredProducts.filter(p => !displayedProducts.some(dp => dp.id === p.id));
    
    if (newItems.length > 0) {
        queueRef.current = [...queueRef.current, ...newItems];
        
        if (!isProcessingQueue.current) {
            isProcessingQueue.current = true;
            const interval = setInterval(() => {
                if (queueRef.current.length > 0) {
                    const itemToAdd = queueRef.current.shift();
                    if (itemToAdd) {
                        setDisplayedProducts(prev => {
                            // فحص أمان إضافي لمنع تكرار الـ ID في الحالة
                            if (prev.some(p => p.id === itemToAdd.id)) return prev;
                            return [...prev, itemToAdd];
                        });
                    }
                } else {
                    isProcessingQueue.current = false;
                    clearInterval(interval);
                }
            }, 70); // سرعة الظهور (70 ملي ثانية) لكل وجبة
        }
    }
  }, [filteredProducts, displayedProducts.length]);

  // تصفير القائمة عند البحث أو تغيير القسم لبدء "واحد واحد" من جديد
  useEffect(() => {
      setDisplayedProducts([]);
      queueRef.current = [];
      if (searchTerm) setCurrentLimit(10);
  }, [searchTerm, activeTab]);

  // مستشعر الوصول لنهاية الصفحة (Infinite Scroll)
  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !searchTerm) {
          // جلب الدفعة التالية (10 وجبات)
          setCurrentLimit(prev => prev + 10);
        }
      },
      { threshold: 1.0 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, searchTerm]);
  
  return (
    <div className="p-4 pb-40 animate-in fade-in duration-500 text-right">
      <header className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-black text-primary italic">قائمة الوجبات</h1>
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-tighter opacity-80">تصفح وجباتك المفضلة بسرعة فائقة</p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن أي وجبة في كل المتاجر..."
            className="pr-10 h-12 rounded-2xl border-2 font-bold bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-hide pb-2">
            <TabsList className="flex w-max h-auto bg-transparent gap-2 p-0">
                <TabsTrigger value="all" className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted shadow-sm">الكل</TabsTrigger>
                {categories.map((cat) => (
                    <TabsTrigger key={cat.id} value={cat.id} className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted shadow-sm">{cat.name}</TabsTrigger>
                ))}
            </TabsList>
        </div>
        
        <div className="mt-6">
           <div className="grid grid-cols-2 gap-4">
                {displayedProducts.map((product) => (
                    <div 
                        key={`grid-${product.id}`} 
                        className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
                    >
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>

            {/* نقطة الاستشعار لتحميل المزيد مع علامة التحميل */}
            <div ref={observerTarget} className="h-24 flex items-center justify-center w-full mt-6">
                {(isLoading || isProcessingQueue.current) ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                        <p className="text-[10px] font-black text-primary animate-pulse">
                            {searchTerm ? 'جاري البحث...' : 'جاري تحضير الوجبات التالية...'}
                        </p>
                    </div>
                ) : !hasMore && displayedProducts.length > 0 && !searchTerm ? (
                    <p className="text-[10px] font-black text-muted-foreground/40">وصلت إلى نهاية القائمة ✨</p>
                ) : null}
            </div>

            {!isLoading && filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-muted/5 rounded-[3rem] border-2 border-dashed">
                    <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground font-black">عذراً، لم نجد نتائج لما تبحث عنه.</p>
                </div>
            )}
        </div>
      </Tabs>
    </div>
  );
}

export default function ProductsPage() {
    return <Suspense fallback={null}><ProductsPageContent /></Suspense>;
}
