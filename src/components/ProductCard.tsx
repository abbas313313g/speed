
"use client";

import React, { useMemo, useContext, useState } from "react";
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
  const [isImgLoading, setIsImgLoading] = useState(true);
  const [imgError, setImgError] = useState(false);

  const restaurant = useMemo(() => restaurants.find(r => r.id === product.restaurantId), [product, restaurants]);

  const activeSizes = useMemo(() => {
    return product.sizes?.filter(s => s.isActive !== false) || [];
  }, [product.sizes]);

  const hasSizes = activeSizes.length > 0;

  const isOutOfStock = useMemo(() => {
    if (product.isUnlimitedStock) return false;
    if (hasSizes) {
      return activeSizes.every(size => !size.isUnlimited && size.stock <= 0);
    }
    return product.stock <= 0;
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

    if (hasSizes) {
        handleOpenProduct();
        return;
    }

    const wasAdded = addToCart(product, 1);
    if (wasAdded) {
        toast({
            title: "تمت الإضافة",
            description: `تمت إضافة ${product.name} إلى سلتك.`,
        });
    }
  };

  const displayPrice = useMemo(() => {
      if (hasSizes) {
          const prices = activeSizes.map(s => s.price);
          return Math.min(...prices);
      }
      return product.discountPrice || product.price;
  }, [product, hasSizes, activeSizes]);

  const hasDiscount = !!product.discountPrice && !hasSizes;

  if (imgError) return null;
  if (!product.image) return null;

  return (
    <div 
        onClick={handleOpenProduct}
        className={cn(
            "group cursor-pointer transition-all active:scale-95 duration-500", 
            (isOutOfStock || !restaurant?.isStoreOpen) && "opacity-60",
            isImgLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
        )}
    >
      <Card className="overflow-hidden border-none shadow-md rounded-[1.5rem] bg-card">
        <CardContent className="p-0">
          <div className="relative w-full aspect-square overflow-hidden bg-muted/20">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized={true}
              onLoadingComplete={() => setIsImgLoading(false)}
              onError={() => setImgError(true)}
            />
            {isOutOfStock && <Badge variant="destructive" className="absolute top-2 left-2">نفد</Badge>}
            {!restaurant?.isStoreOpen && <Badge variant="destructive" className="absolute top-2 left-2 text-[10px]">مغلق</Badge>}
            {hasSizes && <Badge className="absolute top-2 right-2 bg-primary/80 backdrop-blur-md text-[10px] font-black">أنواع</Badge>}
            {hasDiscount && (
                <div className="absolute top-2 right-2 bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-lg shadow-lg">خصم %</div>
            )}
          </div>
          <div className="p-3 text-right">
            <h3 className="line-clamp-2 h-10 font-black text-sm text-slate-800 leading-tight mb-1">{product.name}</h3>
            {restaurant && (
                <div className="flex items-center gap-1 mt-0.5 text-primary">
                    <Store className="h-3 w-3" />
                    <span className="text-[9px] font-bold truncate">{restaurant.name}</span>
                </div>
            )}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex flex-col text-right">
                  {hasSizes ? (
                      <p className="text-[8px] text-muted-foreground font-black">يبدأ من:</p>
                  ) : hasDiscount ? (
                     <p className="text-[9px] text-muted-foreground line-through decoration-destructive/50 font-bold">
                        {formatCurrency(product.price)}
                     </p>
                  ) : null}
                  <p className="text-sm font-black text-primary leading-none">
                    {formatCurrency(displayPrice)}
                  </p>
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                className={cn("h-9 w-9 rounded-xl shadow-sm active:scale-75 transition-all", hasSizes ? "bg-secondary text-primary" : "bg-primary text-white hover:bg-primary/90")} 
                onClick={handleAddToCart} 
                disabled={isOutOfStock || !restaurant?.isStoreOpen}
              >
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
