
"use client";

import { useState, useMemo, Suspense, useEffect } from 'react';
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
  
  // نظام الظهور المتسلسل (واحدة تلو الأخرى) مع منع التكرار
  const [displayedProducts, setDisplayedProducts] = useState<any[]>([]);

  // جلب البيانات معزول تماماً عن بقية التطبيق لضمان السرعة
  const { products, isLoading } = useProducts(undefined, undefined, 100);
  const { categories } = useCategories();

  const filteredProducts = useMemo(() => {
      let prods = products.filter(p => p.status === 'approved' && p.isActive !== false);
      if(activeTab !== 'all') prods = prods.filter(p => p.categoryId === activeTab);
      if(searchTerm.trim() !== '') prods = prods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return prods;
  }, [products, activeTab, searchTerm]);

  // منطق "واحد تلو الآخر": يضيف الوجبات بتتابع زمني ويمنع تكرار المفاتيح
  useEffect(() => {
    setDisplayedProducts([]);
    if (filteredProducts.length > 0) {
        let index = 0;
        const interval = setInterval(() => {
            if (index < filteredProducts.length) {
                setDisplayedProducts(prev => {
                    const nextItem = filteredProducts[index];
                    // منع تكرار الوجبة في القائمة المعروضة
                    if (prev.some(p => p.id === nextItem.id)) return prev;
                    return [...prev, nextItem];
                });
                index++;
            } else {
                clearInterval(interval);
            }
        }, 60); // سرعة الظهور (60 ملي ثانية لكل وجبة)
        return () => clearInterval(interval);
    }
  }, [filteredProducts]);
  
  return (
    <div className="p-4 pb-40 animate-in fade-in duration-500 text-right">
      <header className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-black text-primary italic">قائمة الوجبات</h1>
          <p className="text-muted-foreground font-bold text-xs">تصفح وجباتك المفضلة واحد تلو الآخر</p>
        </div>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن وجبة محددة..."
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
                        key={`prod-${product.id}`} 
                        className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
                    >
                        <ProductCard product={product} />
                    </div>
                ))}
            </div>

            {isLoading && displayedProducts.length === 0 && (
                <div className="py-20 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-primary opacity-40" />
                    <p className="text-[10px] font-black text-muted-foreground">جاري تحضير القائمة لك...</p>
                </div>
            )}

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
