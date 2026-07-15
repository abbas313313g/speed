
"use client";

import { useState, useMemo, useEffect, useContext } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { Minus, Plus, ShoppingCart, ArrowRight, Star, Clock, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import type { ProductSize } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { ProductCard } from '@/components/ProductCard';
import { useRestaurants } from '@/hooks/useRestaurants';
import { AppContext } from '@/contexts/AppContext';

export default function ProductDetailPage() {
  const context = useContext(AppContext);
  const { products, isLoading } = useProducts();
  const { restaurants } = useRestaurants();
  const { addToCart } = useCart();
  const { toast } = useToast();
  
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(undefined);

  if (!context) return null;
  const { selectedProductId, setActiveTab } = context;

  const product = useMemo(() => products.find(p => p.id === selectedProductId), [selectedProductId, products]);
  const restaurant = useMemo(() => product ? restaurants.find(r => r.id === product.restaurantId) : null, [product, restaurants]);
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products.filter(p => p.restaurantId === product.restaurantId && p.id !== product.id).slice(0, 4);
  }, [product, products]);

  useEffect(() => {
    setSelectedSize(undefined);
    setQuantity(1);
  }, [product]);

  const displayPrice = useMemo(() => {
    if (selectedSize) return selectedSize.price;
    return product?.discountPrice ?? product?.price ?? 0;
  }, [selectedSize, product]);

  const availableStock = useMemo(() => {
    if (selectedSize) return selectedSize.stock;
    return product?.stock ?? 0;
  }, [selectedSize, product]);

  const isOutOfStock = useMemo(() => {
      if (product?.sizes && product.sizes.length > 0) {
          if (!selectedSize) return false;
          return selectedSize.stock <= 0;
      }
      return (product?.stock ?? 0) <= 0;
  }, [product, selectedSize]);

  if (isLoading || !product) {
    return (
        <div className="p-4 space-y-4">
            <Skeleton className="w-full aspect-square rounded-[2rem]" />
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
    );
  }

  const handleAddToCart = () => {
      if (restaurant && !restaurant.isStoreOpen) {
        toast({ title: "المتجر مغلق حاليًا", variant: "destructive" });
        return;
      }
      if (product.sizes && product.sizes.length > 0 && !selectedSize) {
        toast({ title: "يرجى اختيار الحجم أولاً", description: "يجب اختيار أحد الخيارات المتاحة للمتابعة.", variant: "destructive" });
        return;
      }
      if (isOutOfStock) {
        toast({ title: "عذراً، هذا الخيار نفد", variant: "destructive" });
        return;
      }
      
      const wasAdded = addToCart(product, quantity, selectedSize);
      if (wasAdded) {
          toast({
            title: "تمت الإضافة إلى السلة",
            description: `${quantity}x ${product.name}${selectedSize ? ` (${selectedSize.name})` : ''}`,
          });
      }
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > availableStock && !product.isUnlimitedStock) {
      setQuantity(availableStock);
    } else if (newQuantity < 1) {
      setQuantity(1);
    } else {
      setQuantity(newQuantity);
    }
  };

  const hasDiscount = !!product.discountPrice && !selectedSize;
  const imageUrl = product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? product.image : 'https://placehold.co/600x400.png';

  return (
    <div className="relative bg-background h-full overflow-y-auto pb-40">
       {/* Top Navigation */}
       <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
          <button 
            onClick={() => setActiveTab(0)} 
            className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl text-primary active:scale-75 transition-all"
          >
              <ArrowRight className="h-6 w-6"/>
          </button>
          <div className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl">
             <ShoppingCart className="h-6 w-6 text-primary" onClick={() => setActiveTab(3)}/>
          </div>
       </div>

      {/* Product Image */}
      <div className="relative w-full aspect-square overflow-hidden sm:rounded-b-[3.5rem] shadow-2xl">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          unoptimized={true}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-6 right-6">
            {hasDiscount && (
                <div className="bg-red-500 text-white px-4 py-1 rounded-full text-sm font-black shadow-lg animate-pulse">
                    خصم خاص!
                </div>
            )}
        </div>
      </div>

      <div className="px-6 -mt-10 relative z-10">
        <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-6">
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-black text-slate-800 leading-tight">{product.name}</h1>
                    <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-3 py-1 rounded-full">
                        <Star className="h-4 w-4 fill-current"/>
                        <span className="text-xs font-black">4.9</span>
                    </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                    <div className="flex items-center gap-1"><Clock className="h-3 w-3 text-primary"/> <span>25-40 دقيقة</span></div>
                    <div className="flex items-center gap-1"><Info className="h-3 w-3 text-primary"/> <span>{restaurant?.name}</span></div>
                </div>
            </div>

            <p className="text-muted-foreground text-sm font-medium leading-relaxed bg-muted/20 p-4 rounded-2xl border-r-4 border-primary">
                {product.description || "استمتع بمذاق لا يقاوم مع هذا المنتج المميز المحضر بعناية فائقة."}
            </p>

            <div className="flex items-end justify-between">
                <div className="space-y-1">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">السعر الحالي</span>
                    <div className="flex items-center gap-3">
                         {hasDiscount && (
                             <p className="text-lg font-bold text-muted-foreground line-through opacity-60">
                                {formatCurrency(product.price)}
                             </p>
                         )}
                         <p className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(displayPrice)}</p>
                    </div>
                </div>
                <Badge variant={isOutOfStock ? "destructive" : "secondary"} className="rounded-xl px-4 py-1 font-black">
                    {isOutOfStock ? "نفد من المخزن" : product.isUnlimitedStock ? "متوفر دائمًا" : `متوفر: ${availableStock}`}
                </Badge>
            </div>

            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-4">
                <Label className="font-black text-lg text-slate-800">اختر الحجم المفضل:</Label>
                <div className="grid grid-cols-2 gap-3">
                  {product.sizes.map((size) => (
                    <button
                        key={size.name}
                        disabled={size.stock <= 0}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                            "flex flex-col items-center gap-1 p-4 rounded-[2rem] border-2 transition-all active:scale-95",
                            selectedSize?.name === size.name 
                                ? 'border-primary bg-primary/5 text-primary shadow-inner scale-[1.02]' 
                                : 'border-slate-100 bg-slate-50 text-slate-500',
                            size.stock <= 0 && 'opacity-30 grayscale cursor-not-allowed'
                        )}
                    >
                        <span className="font-black text-sm">{size.name}</span>
                        <span className="font-black text-xs opacity-80">{formatCurrency(size.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-2 bg-slate-50 rounded-[2rem] border-2 border-slate-100">
                <p className="font-black text-sm mr-4">الكمية المطلوبة</p>
                <div className="flex items-center gap-4 bg-white p-1 rounded-[1.8rem] shadow-sm">
                    <button 
                        onClick={() => handleQuantityChange(quantity - 1)} 
                        className="p-3 bg-slate-100 rounded-2xl text-slate-600 font-black active:scale-75 transition-all"
                    >
                        <Minus className="h-5 w-5"/>
                    </button>
                    <span className="w-8 text-center font-black text-xl">{isOutOfStock ? 0 : quantity}</span>
                    <button 
                        onClick={() => handleQuantityChange(quantity + 1)} 
                        className="p-3 bg-primary rounded-2xl text-white font-black active:scale-75 transition-all shadow-lg shadow-primary/20"
                    >
                        <Plus className="h-5 w-5"/>
                    </button>
                </div>
            </div>
        </div>

        {relatedProducts.length > 0 && (
         <div className="mt-8 space-y-4">
            <h2 className="text-2xl font-black text-slate-800 pr-2">قد يعجبك أيضاً</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                {relatedProducts.map(p => (
                    <div key={p.id} className="w-48 shrink-0">
                        <ProductCard product={p}/>
                    </div>
                ))}
            </div>
         </div>
       )}
      </div>

      {/* Sticky Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-0 p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-50 rounded-t-[3rem]">
          <Button 
                size="lg" 
                className={cn(
                    "w-full h-16 text-xl font-black rounded-3xl shadow-2xl transition-all active:scale-95",
                    (!selectedSize && product.sizes && product.sizes.length > 0) ? "bg-slate-200 text-slate-400 grayscale" : "bg-primary shadow-primary/20"
                )}
                onClick={handleAddToCart} 
                disabled={isOutOfStock || (restaurant && !restaurant.isStoreOpen)}
            >
              <ShoppingCart className="ml-3 h-7 w-7"/>
              {restaurant && !restaurant.isStoreOpen ? "المتجر مغلق حالياً" : 
               (product.sizes && product.sizes.length > 0 && !selectedSize) ? "اختر الحجم أولاً" :
               isOutOfStock ? "نفدت الكمية تماماً" : "إضافة إلى السلة الآن"}
          </Button>
      </div>
    </div>
  );
}
