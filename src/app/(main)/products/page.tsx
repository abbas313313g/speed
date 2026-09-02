
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
  const [currentLimit, setCurrentLimit] = useState(20);
  
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]);
  const queueRef = useRef<any[]>([]);
  const isProcessingQueue = useRef(false);

  // جلب البيانات الأولية (تحميل دفعة كبيرة للبحث المحلي)
  const { products, isLoading, hasMore } = useProducts(
      undefined, 
      undefined, 
      searchTerm ? 200 : currentLimit, 
      undefined, 
      '' // البحث محلي الآن للأداء
  );
  
  const { categories } = useCategories();

  // فلترة الأقسام والبحث محلياً لضمان السرعة القصوى وعدم تعليق الجهاز
  const filteredProducts = useMemo(() => {
      let prods = products.filter(p => p.isActive !== false);
      if (activeTab !== 'all') prods = prods.filter(p => p.categoryId === activeTab);
      if (searchTerm.trim() !== '') {
          prods = prods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      return prods;
  }, [products, activeTab, searchTerm]);

  const displayedIdsRef = useRef(new Set<string>());

  useEffect(() => {
    const newItems = filteredProducts.filter(p => !displayedIdsRef.current.has(p.id));   
    if (newItems.length > 0) {
      newItems.forEach(item => {
        if (!queueRef.current.some(q => q.id === item.id)) {
            queueRef.current.push(item);
        }
    });
        
        if (!isProcessingQueue.current) {
            isProcessingQueue.current = true;
            const interval = setInterval(() => {
                if (queueRef.current.length > 0) {
                    const itemToAdd = queueRef.current.shift();
                    if (itemToAdd && !displayedIdsRef.current.has(itemToAdd.id)) {
                      displayedIdsRef.current.add(itemToAdd.id);
                      setDisplayedProducts(prev => [...prev, itemToAdd]);
                    }
                } else {
                    isProcessingQueue.current = false;
                    clearInterval(interval);
                }
            }, 15);
        }
    }
  }, [filteredProducts]);

  useEffect(() => {
      setDisplayedProducts([]);
      displayedIdsRef.current.clear();
      queueRef.current = [];
  }, [searchTerm, activeTab]);

  const observerTarget = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading && !searchTerm) {
          setCurrentLimit(prev => prev + 20);
        }
      },
      { threshold: 0.1 }
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
          <p className="text-muted-foreground font-bold text-[10px] uppercase tracking-tighter opacity-80">تصفح وجباتك المفضلة من كل المتاجر</p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث هنا (جارِ البحث ⚡)..."
            className="pr-10 h-12 rounded-2xl border-2 font-bold bg-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-hide pb-2">
            <TabsList className="flex w-max h-auto bg-transparent gap-2 p-0">
                <TabsTrigger value="all" className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted">الكل</TabsTrigger>
                {categories.map((cat) => (
                    <TabsTrigger key={cat.id} value={cat.id} className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted">{cat.name}</TabsTrigger>
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

            <div ref={observerTarget} className="h-24 flex items-center justify-center w-full mt-6">
                {(isLoading || isProcessingQueue.current) ? (
                    <div className="flex flex-col items-center gap-2">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                        <p className="text-[10px] font-black text-primary animate-pulse">جارِ البحث...</p>
                    </div>
                ) : !hasMore && displayedProducts.length > 0 && !searchTerm ? (
                    <p className="text-[10px] font-black text-muted-foreground/40">وصلت إلى نهاية القائمة ✨</p>
                ) : null}
            </div>

            {!isLoading && filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-muted/5 rounded-[3rem] border-2 border-dashed">
                    <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground font-black">لم نجد وجبات تطابق بحثك حالياً.</p>
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
