
"use client";

import React, { useMemo, useContext } from "react";
import Image from "next/image";
import { PlusCircle, ListChecks, Store } from "lucide-react";
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
      const prices = activeSizes.map(s => s.price).filter(p => p > 0);
      if (prices.length > 0) {
        const min = Math.min(...prices);
        const max = Math.max(...prices);
        if (min === max) return formatCurrency(min);
        return `تبدأ من ${formatCurrency(min)}`;
      }
    }
    const finalPrice = product.discountPrice || product.price || 0;
    return formatCurrency(finalPrice);
  }, [product, hasSizes, activeSizes]);

  const hasDiscount = !!product.discountPrice && !hasSizes;

  return (
    <div 
        onClick={handleOpenProduct}
        className={cn(
            "group cursor-pointer transition-all duration-300 relative shrink-0", 
            "w-full sm:max-w-none min-w-[160px]",
            (isOutOfStock || !restaurant?.isStoreOpen) && "opacity-60"
        )}
    >
      <Card className="overflow-hidden border-none shadow-md rounded-[1.5rem] bg-card w-full h-full">
        <CardContent className="p-0 flex flex-col h-full">
          <div className="relative w-full aspect-square overflow-hidden bg-muted/10">
            {product.image ? (
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized={true}
                  loading="lazy"
                  decoding="async"
                />
            ) : <div className="w-full h-full animate-pulse bg-muted/20" />}
            {isOutOfStock && <Badge variant="destructive" className="absolute top-2 left-2 z-10 text-[10px] font-black">نفد</Badge>}
            {hasSizes && <Badge className="absolute top-2 right-2 bg-primary/80 backdrop-blur-md text-[9px] font-black z-10">خيارات</Badge>}
            {hasDiscount && <div className="absolute top-2 right-2 bg-red-600 text-white text-[8px] font-black px-2 py-1 rounded-lg shadow-lg z-10">خصم %</div>}
          </div>
          <div className="p-3 text-right flex-1 flex flex-col justify-between bg-white">
            <div>
                <h3 className="line-clamp-2 h-10 font-black text-sm text-slate-800 leading-tight mb-1">{product.name}</h3>
                {restaurant && (
                    <div className="flex items-center gap-1 mt-0.5 text-primary">
                        <Store className="h-3 w-3" />
                        <span className="text-[9px] font-bold truncate">{restaurant.name}</span>
                    </div>
                )}
            </div>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex flex-col text-right">
                  {!hasSizes && hasDiscount && <p className="text-[9px] text-muted-foreground line-through decoration-destructive/50 font-bold">{formatCurrency(product.price)}</p>}
                  <p className={cn("font-black text-primary leading-none", hasSizes ? "text-[10px]" : "text-sm")}>{priceDisplay}</p>
              </div>
              <Button size="icon" variant="ghost" className={cn("h-9 w-9 rounded-xl shadow-sm active:scale-75", hasSizes ? "bg-secondary text-primary" : "bg-primary text-white")} onClick={handleAddToCart} disabled={isOutOfStock || (restaurant && !restaurant.isStoreOpen)}>
                {hasSizes ? <ListChecks className="h-5 w-5" /> : <PlusCircle className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const ProductCard = React.memo(ProductCardComponent);
