
"use client";

import { useState, useMemo, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from "@/components/ProductCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, PackageOpen, Loader2 } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 10;

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(initialCategory);
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

  const { products } = useProducts();
  const { categories } = useCategories();

  const filteredProducts = useMemo(() => {
      let prods = products.filter(p => p.status === 'approved' && p.isActive !== false);
      if(activeTab !== 'all') prods = prods.filter(p => p.categoryId === activeTab);
      if(searchTerm.trim() !== '') prods = prods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return prods;
  }, [products, activeTab, searchTerm]);

  // تصفير العد عند تغيير الفلتر لضمان السرعة
  useEffect(() => {
    setVisibleCount(ITEMS_PER_PAGE);
  }, [activeTab, searchTerm]);

  const pagedProducts = useMemo(() => {
    return filteredProducts.slice(0, visibleCount);
  }, [filteredProducts, visibleCount]);

  const hasMore = visibleCount < filteredProducts.length;

  const loadMore = () => {
    setVisibleCount(prev => prev + ITEMS_PER_PAGE);
  };
  
  return (
    <div className="p-4 pb-40 animate-in fade-in duration-300">
      <header className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-black text-primary">كل المنتجات</h1>
          <p className="text-muted-foreground font-bold">تصفح الوجبات (تحميل تدريجي 10x10)</p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن منتج..."
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
                {categories.map((category) => (
                    <TabsTrigger key={category.id} value={category.id} className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted">{category.name}</TabsTrigger>
                ))}
            </TabsList>
        </div>
        
        <div className="mt-6">
           <div className="grid grid-cols-2 gap-4">
                {pagedProducts.map((product) => (
                    <div key={product.id} className="w-full">
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>

            {hasMore && (
                <div className="py-10 flex justify-center">
                    <Button 
                        variant="outline" 
                        onClick={loadMore}
                        className="rounded-2xl h-14 px-10 font-black border-primary text-primary hover:bg-primary/5 gap-2"
                    >
                        تحميل المزيد من الوجبات
                        <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                    </Button>
                </div>
            )}

            {filteredProducts.length === 0 && (
                <div className="text-center py-20 bg-muted/5 rounded-[2.5rem] border-2 border-dashed">
                    <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground font-black">لا توجد منتجات مطابقة للبحث.</p>
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
