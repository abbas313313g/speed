
"use client";

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProductCard } from "@/components/ProductCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search, PackageOpen } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

function ProductsPageContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState(initialCategory);

  const { products } = useProducts();
  const { categories } = useCategories();

  const filteredProducts = useMemo(() => {
      let prods = products.filter(p => p.status === 'approved' && p.isActive !== false);

      if(activeTab !== 'all') {
          prods = prods.filter(p => p.categoryId === activeTab);
      }

      if(searchTerm.trim() !== '') {
          prods = prods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      
      return prods;
  }, [products, activeTab, searchTerm]);
  
  return (
    <div className="p-4 pb-40">
      <header className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-black text-primary">كل المنتجات</h1>
          <p className="text-muted-foreground font-bold">تصفح جميع المنتجات حسب القسم</p>
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
                <TabsTrigger 
                    value="all" 
                    className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted"
                >
                    الكل
                </TabsTrigger>
                {categories.map((category) => (
                    <TabsTrigger 
                        key={category.id} 
                        value={category.id}
                        className="h-11 px-6 rounded-2xl font-black data-[state=active]:bg-primary data-[state=active]:text-white border-2 border-muted"
                    >
                        {category.name}
                    </TabsTrigger>
                ))}
            </TabsList>
        </div>
        
        <div className="mt-6">
           {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-muted/5 rounded-[2.5rem] border-2 border-dashed">
                    <PackageOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground font-black">لا توجد منتجات حالياً.</p>
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
