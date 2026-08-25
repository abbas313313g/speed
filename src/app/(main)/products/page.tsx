"use client";

import { useState, useMemo, Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from "@/components/ProductCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, PackageOpen, Loader2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

const ITEMS_PER_PAGE = 10;

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(initialCategory);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [isAutoLoading, setIsAutoLoading] = useState(false);

  // تحسين: المنتجات لا يتم طلبها عالمياً، بل يتم استهلاك المتوفر في الـ Cache وسحب المزيد تدريجياً
  const { products } = useProducts();
  const { categories } = useCategories();
  const loaderRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
      let prods = products.filter(p => p.status === 'approved' && p.isActive !== false);
      if(activeTab !== 'all') prods = prods.filter(p => p.categoryId === activeTab);
      if(searchTerm.trim() !== '') prods = prods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return prods;
  }, [products, activeTab, searchTerm]);

  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeTab, searchTerm]);

  const pagedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const hasMore = visibleCount < filteredProducts.length;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isAutoLoading) {
          setIsAutoLoading(true);
          // تأخير بسيط لمحاكاة جلب البيانات التدريجي 10 بـ 10
          setTimeout(() => {
            setVisibleCount(prev => prev + ITEMS_PER_PAGE);
            setIsAutoLoading(false);
          }, 400);
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, isAutoLoading]);
  
  return (
    <div className="p-4 pb-40 animate-in fade-in duration-300">
      <header className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-black text-primary">كل الوجبات</h1>
          <p className="text-muted-foreground font-bold">تصفح المنيو واستمتع بأشهى الأطباق</p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن وجبتك المفضلة..."
            className="pr-10 h-12 rounded-2xl border-2 font-bold bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
        <div className="overflow-x-auto scrollbar-hide pb-2">
            <TabsList className="flex w-max h-auto bg-transparent gap-2 p-0">
                <TabsTrigger value="all" className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted">الكل</TabsTrigger>
                {categories.map((category) => (
                    <TabsTrigger key={category.id} value={category.id} className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted">{category.name}</TabsTrigger>
                ))}
            </TabsList>
        </div>
        
        <div className="mt-6">
           <div className="grid grid-cols-2 gap-4">
                {pagedProducts.map((product) => (
                    <div key={product.id} className="w-full animate-in fade-in zoom-in-95 duration-300">
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>

            {hasMore && (
                <div ref={loaderRef} className="py-12 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-7 w-7 animate-spin text-primary opacity-50" />
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">جارِ جلب المزيد...</p>
                </div>
            )}

            {filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-muted/5 rounded-[2.5rem] border-2 border-dashed">
                    <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground font-black">لا توجد نتائج حالياً.</p>
                </div>
            )}
        </div>
      </Tabs>
    </div>
  );
}

export default function ProductsPage() {
    return (
        <Suspense fallback={null}>
            <ProductsPageContent />
        </Suspense>
    );
}
