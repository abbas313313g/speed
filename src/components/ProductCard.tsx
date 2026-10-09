
"use client";

import React, { useMemo, useContext } from "react";
import Image from "next/image";
import { PlusCircle, ListChecks, Store, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useRestaurants } from "@/hooks/useRestaurants";
import { AppContext } from "@/contexts/AppContext";

interface ProductCardProps {
  product: Product;
}

function ProductCardComponent({ product }: ProductCardProps) {
  const { toast } = useToast();
  const { addToCart } = useCart();
  const { restaurants } = useRestaurants();
  const context = useContext(AppContext);
  
  const restaurant = useMemo(() => restaurants.find(r => r.id === product.restaurantId), [product, restaurants]);

  const activeSizes = useMemo(() => {
    return product.sizes?.filter(s => s.isActive !== false) || [];
  }, [product.sizes]);

  const hasSizes = activeSizes.length > 0;

  const finalPrices = useMemo(() => {
    const globalDiscount = restaurant?.discountPercentage || 0;
    const calculateNewPrice = (base: number, individualDiscount?: number) => {
        if (individualDiscount && individualDiscount > 0) return individualDiscount;
        if (globalDiscount > 0) return base * (1 - globalDiscount / 100);
        return base;
    };
    if (hasSizes) return activeSizes.map(s => ({ ...s, displayPrice: calculateNewPrice(s.price) }));
    return { original: product.price, display: calculateNewPrice(product.price, product.discountPrice) };
  }, [product, restaurant, hasSizes, activeSizes]);

  const discountPercentage = useMemo(() => {
      if (hasSizes) return 0;
      const data = finalPrices as { original: number, display: number };
      if (data.display >= data.original) return 0;
      return Math.round(((data.original - data.display) / data.original) * 100);
  }, [finalPrices, hasSizes]);

  const isOutOfStock = useMemo(() => {
    if (product.isUnlimitedStock) return false;
    if (hasSizes) return activeSizes.every(size => !size.isUnlimited && size.stock <= 0);
    return (product.stock ?? 0) <= 0;
  }, [product, hasSizes, activeSizes]);

  const handleOpenProduct = () => {
    if (context) {
        context.setSelectedProductId(product.id);
        context.setActiveTab(9); 
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (restaurant && !restaurant.isStoreOpen) {
        toast({ title: "المتجر مغلق حاليًا", variant: "destructive" });
        return;
    }
    if (isOutOfStock) {
        toast({ title: "نفدت الكمية", variant: "destructive" });
        return;
    }
    if (hasSizes) { handleOpenProduct(); return; }
    const wasAdded = addToCart(product, 1);
    if (wasAdded) {
        toast({ title: "تمت الإضافة", description: `تمت إضافة ${product.name} إلى سلتك.` });
    }
  };

  const priceDisplay = useMemo(() => {
    if (hasSizes) {
      const prices = (finalPrices as any[]).map(s => s.displayPrice).filter(p => p > 0);
      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        if (min === max) return formatCurrency(min);
        return `تبدأ من ${formatCurrency(min)}`;
      }
    }
    const data = finalPrices as { display: number };
    return formatCurrency(data.display);
  }, [finalPrices, hasSizes]);

  const hasAnyDiscount = useMemo(() => {
      if (hasSizes) return false;
      const data = finalPrices as { original: number, display: number };
      return data.display < data.original;
  }, [finalPrices, hasSizes]);

  return (
    <div 
        onClick={handleOpenProduct}
        className={cn(
            "group cursor-pointer transition-all duration-500 relative shrink-0", 
            "w-full sm:max-w-none min-w-[160px]",
            (isOutOfStock || !restaurant?.isStoreOpen) && "opacity-60 grayscale"
        )}
    >
      <Card className="overflow-hidden border-none shadow-xl rounded-[2.2rem] bg-white dark:bg-slate-900 w-full h-full hover:shadow-2xl transition-all hover:-translate-y-2">
        <CardContent className="p-0 flex flex-col h-full relative">
          <div className="relative w-full aspect-square overflow-hidden bg-slate-50 dark:bg-slate-800">
            {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-700"
                  unoptimized={true}
                />
            ) : <div className="w-full h-full animate-pulse bg-muted/20" />}
            
            {hasAnyDiscount && !hasSizes && (
                <div className="absolute top-3 left-3 z-10 bg-red-600 text-white font-black text-[10px] px-3 py-1 rounded-xl shadow-lg flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    <span>-{discountPercentage}%</span>
                </div>
            )}

            {hasSizes && (
                <div className="absolute top-3 right-3 z-10 bg-primary/90 backdrop-blur-md text-white text-[9px] font-black px-3 py-1 rounded-xl shadow-lg">
                    خيارات متعددة
                </div>
            )}
            
            {isOutOfStock && <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20"><span className="text-white font-black text-lg bg-red-600 px-6 py-2 rounded-full rotate-12">نفد</span></div>}
          </div>
          
          <div className="p-4 text-right flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
                <h3 className="line-clamp-2 h-10 font-black text-sm text-slate-800 dark:text-white leading-tight">{product.name}</h3>
                {restaurant && (
                    <div className="flex items-center gap-1 justify-end text-primary opacity-60">
                        <span className="text-[9px] font-black truncate">{restaurant.name}</span>
                        <Store className="h-3 w-3" />
                    </div>
                )}
            </div>
            
            <div className="mt-4 flex items-center justify-between flex-row-reverse">
              <div className="flex flex-col text-right">
                  {hasAnyDiscount && !hasSizes && <p className="text-[9px] text-muted-foreground line-through decoration-red-500/50 font-bold leading-none mb-1">{formatCurrency(product.price)}</p>}
                  <p className={cn("font-black text-primary tracking-tighter leading-none", hasSizes ? "text-[11px]" : "text-lg")}>{priceDisplay}</p>
              </div>
              <button 
                onClick={handleAddToCart} 
                disabled={isOutOfStock || (restaurant && !restaurant.isStoreOpen)}
                className={cn(
                    "h-11 w-11 rounded-2xl flex items-center justify-center shadow-lg active:scale-75 transition-all",
                    hasSizes ? "bg-slate-100 text-primary dark:bg-slate-800" : "bg-primary text-white shadow-primary/20"
                )}
              >
                {hasSizes ? <ListChecks className="h-6 w-6" /> : <PlusCircle className="h-6 w-6" />}
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const ProductCard = React.memo(ProductCardComponent);
