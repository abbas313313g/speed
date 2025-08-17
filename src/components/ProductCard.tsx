
"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import type { Product } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface ProductCardProps {
  product: Product;
}

function ProductCardComponent({ product }: ProductCardProps) {
  const { toast } = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    toast({
        title: "الميزة غير متاحة حالياً",
        description: "تم تبسيط التطبيق. الطلب غير ممكن في الوقت الحالي.",
        variant: "destructive",
    });
  };

  return (
    <Link href={`/products/${product.id}`} className="group block">
      <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <CardContent className="p-0">
          <div className="relative h-40 w-full">
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
              data-ai-hint="product item"
            />
          </div>
          <div className="p-4">
            <h3 className="truncate font-semibold text-lg">{product.name}</h3>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xl font-bold text-primary">
                {formatCurrency(product.price)}
              </p>
              <Button size="icon" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10" onClick={handleAddToCart}>
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
