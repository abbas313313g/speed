
"use client";

import React, { useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";

interface ProductCardProps {
  product: Product;
}

function ProductCardComponent({ product }: ProductCardProps) {
  const { toast } = useToast();
  const { addToCart } = useCart();

  const isOutOfStock = useMemo(() => {
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes.every(size => size.stock <= 0);
    }
    return product.stock <= 0;
  }, [product]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOutOfStock) {
        toast({ title: "نفدت الكمية", description: `منتج "${product.name}" غير متوفر حالياً.`, variant: "destructive" });
        return;
    }
    if (product.sizes && product.sizes.length > 0) {
        toast({
            title: "الرجاء اختيار الحجم",
            description: `لمنتج "${product.name}" أحجام متعددة. الرجاء الدخول لصفحة المنتج لاختيار الحجم.`,
            variant: "default",
        })
        return;
    }
    const wasAdded = addToCart(product, 1);
    if (wasAdded) {
        toast({
            title: "تمت الإضافة إلى السلة",
            description: `تمت إضافة ${product.name} إلى سلتك.`,
        });
    }
  };

  const hasDiscount = !!product.discountPrice;
  const displayPrice = product.discountPrice || product.price;
  const imageUrl = product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? product.image : 'https://placehold.co/600x400.png';

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <Card className={`overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isOutOfStock ? 'opacity-60' : ''}`}>
        <CardContent className="p-0">
          <div className="relative h-40 w-full">
            <Image
              src={imageUrl}
              alt={product.name}
              fill
              className="object-cover"
              data-ai-hint="product item"
              unoptimized={true}
            />
            {isOutOfStock && <Badge variant="destructive" className="absolute top-2 left-2 text-sm">نفدت الكمية</Badge>}
            {hasDiscount && <Badge variant="destructive" className="absolute top-2 right-2">خصم</Badge>}
          </div>
          <div className="p-4">
            <h3 className="truncate font-semibold text-lg">{product.name}</h3>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex flex-col items-start">
                  {hasDiscount && (
                     <p className="text-sm text-muted-foreground line-through">
                        {formatCurrency(product.price)}
                     </p>
                  )}
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(displayPrice)}
                  </p>
              </div>
              <Button size="icon" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10" onClick={handleAddToCart} disabled={isOutOfStock}>
                <PlusCircle className="h-6 w-6" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export const ProductCard = React.memo(ProductCardComponent);
