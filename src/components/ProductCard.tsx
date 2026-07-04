
"use client";

import React, { useMemo, useContext } from "react";
import Image from "next/image";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
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

  const isOutOfStock = useMemo(() => {
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes.every(size => size.stock <= 0);
    }
    return product.stock <= 0;
  }, [product]);

  const handleOpenProduct = () => {
    if (context) {
        context.setSelectedProductId(product.id);
        context.setActiveTab(9); // 9 is ProductDetailPage in the stack
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (restaurant && !restaurant.isStoreOpen) {
        toast({ title: "المتجر مغلق حاليًا", description: `لا يمكنك الطلب من "${restaurant.name}" في هذا الوقت.`, variant: "destructive" });
        return;
    }

    if (isOutOfStock) {
        toast({ title: "نفدت الكمية", description: `عذراً، منتج "${product.name}" غير متوفر حالياً.`, variant: "destructive" });
        return;
    }

    const wasAdded = addToCart(product, 1);
    if (wasAdded) {
        toast({
            title: "تمت الإضافة",
            description: `تمت إضافة ${product.name} إلى سلتك بنجاح.`,
        });
    }
  };

  const hasDiscount = !!product.discountPrice;
  const displayPrice = product.discountPrice || product.price;
  const imageUrl = product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? product.image : 'https://placehold.co/600x400.png';

  return (
    <div 
        onClick={handleOpenProduct}
        className={`group cursor-pointer transition-all active:scale-95 ${isOutOfStock || !restaurant?.isStoreOpen ? 'opacity-60' : ''}`}
    >
      <Card className="overflow-hidden border-none shadow-md rounded-[1.5rem] bg-card">
        <CardContent className="p-0">
          <div className="relative w-full aspect-square">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              unoptimized={true}
            />
            {isOutOfStock && <Badge variant="destructive" className="absolute top-2 left-2">نفد</Badge>}
            {!restaurant?.isStoreOpen && <Badge variant="destructive" className="absolute top-2 left-2">مغلق</Badge>}
            {hasDiscount && <Badge className="absolute top-2 right-2 bg-red-500">خصم</Badge>}
          </div>
          <div className="p-3">
            <h3 className="truncate font-bold text-base">{product.name}</h3>
            <div className="mt-1 flex items-center justify-between">
              <div className="flex flex-col">
                  {hasDiscount && (
                     <p className="text-[10px] text-muted-foreground line-through">
                        {formatCurrency(product.price)}
                     </p>
                  )}
                  <p className="text-base font-black text-primary">
                    {formatCurrency(displayPrice)}
                  </p>
              </div>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-primary bg-primary/10 rounded-xl" onClick={handleAddToCart} disabled={isOutOfStock || !restaurant?.isStoreOpen}>
                <PlusCircle className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const ProductCard = React.memo(ProductCardComponent);
