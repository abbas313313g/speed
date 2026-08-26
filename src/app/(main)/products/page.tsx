
"use client";

import { useState, useMemo, Suspense, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from "@/components/ProductCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, PackageOpen, Loader2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

const ITEMS_PER_PAGE = 8;

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(initialCategory);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  // جلب البيانات بشكل تدريجي ومعزول
  const { products, isLoading } = useProducts(undefined, undefined, 200);
  const { categories } = useCategories();
  const loaderRef = useRef<HTMLDivElement>(null);

  const filteredProducts = useMemo(() => {
      let prods = products.filter(p => p.status === 'approved' && p.isActive !== false);
      if(activeTab !== 'all') prods = prods.filter(p => p.categoryId === activeTab);
      if(searchTerm.trim() !== '') prods = prods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return prods;
  }, [products, activeTab, searchTerm]);

  useEffect(() => { setVisibleCount(ITEMS_PER_PAGE); }, [activeTab, searchTerm]);

  const pagedProducts = useMemo(() => filteredProducts.slice(0, visibleCount), [filteredProducts, visibleCount]);
  const hasMore = visibleCount < filteredProducts.length;

  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          setTimeout(() => setVisibleCount(p => p + ITEMS_PER_PAGE), 50);
        }
    }, { threshold: 0.1 });
    if (loaderRef.current) obs.observe(loaderRef.current);
    return () => obs.disconnect();
  }, [hasMore]);
  
  return (
    <div className="p-4 pb-40 animate-in fade-in duration-500 text-right">
      <header className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-black text-primary italic">كل الوجبات</h1>
          <p className="text-muted-foreground font-bold text-xs">اكتشف أشهى الأطباق من حولك</p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن وجبتك المفضلة..."
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
                {pagedProducts.map((product, idx) => (
                    <div 
                        key={product.id} 
                        className="animate-in fade-in zoom-in-95 duration-500" 
                        style={{ animationDelay: `${idx * 100}ms` }} // تأثير الظهور واحد تلو الآخر
                    >
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>

            {hasMore && (
                <div ref={loaderRef} className="py-10 flex flex-col items-center justify-center gap-2 opacity-50">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            )}

            {!isLoading && filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-muted/5 rounded-[3rem] border-2 border-dashed">
                    <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground font-black">لا توجد نتائج مطابقة لبحثك.</p>
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
