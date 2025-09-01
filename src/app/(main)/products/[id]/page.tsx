

"use client";

import { useContext, useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { AppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Minus, Plus, ShoppingCart, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { ProductSize } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const context = useContext(AppContext);
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(undefined);

  const product = useMemo(() => context?.products.find(p => p.id === id), [id, context?.products]);

  // Set default selected size when product loads
  useEffect(() => {
    if (product?.sizes && product.sizes.length > 0 && !selectedSize) {
      // Find the first available size
      const firstAvailableSize = product.sizes.find(s => s.stock > 0);
      setSelectedSize(firstAvailableSize);
    }
  }, [product, selectedSize]);


  const displayPrice = useMemo(() => {
    if (selectedSize) return selectedSize.price;
    return product?.discountPrice ?? product?.price ?? 0;
  }, [selectedSize, product]);

  const availableStock = useMemo(() => {
    if (selectedSize) return selectedSize.stock;
    return product?.stock ?? 0;
  }, [selectedSize, product]);

  const isOutOfStock = availableStock <= 0;

  if (!product || !context) {
    return (
        <div className="p-4 space-y-4">
            <Skeleton className="h-64 w-full rounded-lg" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
        </div>
    );
  }

  const handleAddToCart = () => {
    if (context) {
      if (isOutOfStock) return;
      if (product.sizes && product.sizes.length > 0 && !selectedSize) {
        toast({
          title: "الرجاء اختيار الحجم",
          description: "يجب اختيار حجم المنتج قبل إضافته للسلة.",
          variant: "destructive"
        });
        return;
      }
      context.addToCart(product, quantity, selectedSize);
       toast({
        title: "تمت الإضافة إلى السلة",
        description: `${quantity}x ${product.name}${selectedSize ? ` (${selectedSize.name})` : ''}`,
      });
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > availableStock) {
      setQuantity(availableStock);
    } else if (newQuantity < 1) {
      setQuantity(1);
    } else {
      setQuantity(newQuantity);
    }
  };


  const hasDiscount = !!product.discountPrice && !selectedSize;

  return (
    <div className="pb-4">
       <div className="absolute top-4 right-4 z-10">
          <Button variant="outline" size="icon" className="bg-white/80" onClick={() => router.back()}>
              <ArrowRight className="h-5 w-5"/>
          </Button>
       </div>
      <div className="relative h-64 w-full">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          data-ai-hint="food meal"
        />
        {hasDiscount && <Badge variant="destructive" className="absolute top-4 right-4 text-lg">خصم!</Badge>}
      </div>

      <div className="p-4 space-y-4">
        <div className="flex justify-between items-start">
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <Badge variant={isOutOfStock ? "destructive" : "secondary"}>
                {isOutOfStock ? "نفدت الكمية" : `المتوفر: ${availableStock}`}
            </Badge>
        </div>
        <p className="text-muted-foreground text-lg">{product.description}</p>
        
        <div className="flex items-baseline gap-2">
             {hasDiscount && (
                 <p className="text-2xl font-bold text-muted-foreground line-through">
                    {formatCurrency(product.price)}
                 </p>
             )}
             <p className="text-3xl font-bold text-primary">{formatCurrency(displayPrice)}</p>
        </div>
        
        {product.sizes && product.sizes.length > 0 && (
          <div className="space-y-2">
            <Label className="font-bold text-lg">اختر الحجم:</Label>
            <RadioGroup 
              value={selectedSize?.name} 
              onValueChange={(value) => setSelectedSize(product.sizes?.find(s => s.name === value))}
              className="flex gap-2 flex-wrap"
            >
              {product.sizes.map((size) => (
                <div key={size.name} className="flex items-center">
                   <RadioGroupItem 
                        value={size.name} 
                        id={size.name} 
                        className="peer sr-only"
                        disabled={size.stock <= 0}
                    />
                   <Label 
                        htmlFor={size.name} 
                        className={`flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-2 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary ${size.stock <= 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                        <span>{size.name}</span>
                        <span className="font-bold text-primary mt-1">{formatCurrency(size.price)}</span>
                        {size.stock <= 0 && <Badge variant="destructive" className="mt-1 text-xs">نفد</Badge>}
                   </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )}

        <div className="flex items-center gap-4">
            <p className="font-semibold">الكمية:</p>
            <div className="flex items-center gap-2 rounded-lg border p-1">
                <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(quantity - 1)} disabled={isOutOfStock}>
                    <Minus className="h-4 w-4"/>
                </Button>
                <span className="w-10 text-center font-bold text-lg">{isOutOfStock ? 0 : quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(quantity + 1)} disabled={isOutOfStock}>
                    <Plus className="h-4 w-4"/>
                </Button>
            </div>
        </div>
        
        <Button size="lg" className="w-full text-lg" onClick={handleAddToCart} disabled={isOutOfStock}>
          <ShoppingCart className="ml-2 h-5 w-5"/>
          {isOutOfStock ? "نفدت الكمية" : "إضافة إلى السلة"}
        </Button>
      </div>
    </div>
  );
}

    