
"use client";

import { useState, useMemo } from 'react';
import { ProductCard } from "@/components/ProductCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';

export default function ProductsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const { products, isLoading: productsLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();


  if (productsLoading || categoriesLoading) {
    return <div>جار التحميل...</div>;
  }
  
  const filteredProducts = useMemo(() => {
      let prods = products;

      if(activeTab !== 'all') {
          prods = prods.filter(p => p.categoryId === activeTab);
      }

      if(searchTerm.trim() !== '') {
          prods = prods.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
      }
      
      return prods;
  }, [products, activeTab, searchTerm]);

  return (
    <div className="p-4">
      <header className="mb-6 space-y-4">
        <div>
          <h1 className="text-3xl font-bold">كل المنتجات</h1>
          <p className="text-muted-foreground">تصفح جميع المنتجات حسب القسم</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="ابحث عن منتج..."
            className="pl-4 pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      <Tabs defaultValue="all" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-6 h-auto flex-wrap">
          <TabsTrigger value="all">الكل</TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger key={category.id} value={category.id}>
              {category.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        <div className="mt-6">
           {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 gap-4">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-muted-foreground py-10">
                    لا توجد منتجات تطابق بحثك.
                </p>
            )}
        </div>
        
      </Tabs>
    </div>
  );
}
