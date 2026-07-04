
"use client";

import { useState, useMemo, useEffect, useContext } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Minus, Plus, ShoppingCart, ArrowRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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
    if (product?.sizes && product.sizes.length > 0) {
      const firstAvailableSize = product.sizes.find(s => s.stock > 0);
      setSelectedSize(firstAvailableSize);
    } else {
        setSelectedSize(undefined);
    }
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

  const isOutOfStock = availableStock <= 0;

  if (isLoading || !product) {
    return (
        <div className="p-4 space-y-4">
            <Skeleton className="w-full aspect-square rounded-lg" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-12 w-full" />
        </div>
    );
  }

  const handleAddToCart = () => {
      if (restaurant && !restaurant.isStoreOpen) {
        toast({ title: "المتجر مغلق حاليًا", description: "لا يمكنك إضافة منتجات من هذا المتجر الآن.", variant: "destructive" });
        return;
      }
      if (isOutOfStock) return;
      
      const wasAdded = addToCart(product, quantity, selectedSize);
      if (wasAdded) {
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
  const imageUrl = product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? product.image : 'https://placehold.co/600x400.png';

  return (
    <div className="pb-10 relative bg-background h-full overflow-y-auto">
       <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={() => setActiveTab(0)} 
            className="p-3 bg-white/90 rounded-full shadow-lg text-primary active:scale-75 transition-all"
          >
              <ArrowRight className="h-6 w-6"/>
          </button>
       </div>
      <div className="relative w-full aspect-square">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover"
          sizes="100vw"
          priority
          unoptimized={true}
        />
        {hasDiscount && <Badge variant="destructive" className="absolute top-4 left-4 text-lg rounded-xl">خصم!</Badge>}
      </div>

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-start">
            <h1 className="text-3xl font-black text-primary">{product.name}</h1>
            <Badge variant={isOutOfStock ? "destructive" : "secondary"} className="rounded-xl">
                {isOutOfStock ? "نفدت الكمية" : `المتوفر: ${availableStock}`}
            </Badge>
        </div>
        <p className="text-muted-foreground text-lg leading-relaxed">{product.description}</p>
        
        <div className="flex items-center gap-3">
             {hasDiscount && (
                 <p className="text-2xl font-bold text-muted-foreground line-through">
                    {formatCurrency(product.price)}
                 </p>
             )}
             <p className="text-4xl font-black text-primary">{formatCurrency(displayPrice)}</p>
        </div>
        
        {product.sizes && product.sizes.length > 0 && (
          <div className="space-y-4">
            <Label className="font-black text-xl">اختر الحجم:</Label>
            <div className="grid grid-cols-2 gap-3">
              {product.sizes.map((size) => (
                <button
                    key={size.name}
                    disabled={size.stock <= 0}
                    onClick={() => setSelectedSize(size)}
                    className={`flex flex-col items-center gap-1 p-4 rounded-3xl border-2 transition-all active:scale-95 ${
                        selectedSize?.name === size.name 
                        ? 'border-primary bg-primary/5 text-primary' 
                        : 'border-muted bg-card text-muted-foreground'
                    } ${size.stock <= 0 ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                    <span className="font-bold">{size.name}</span>
                    <span className="font-black">{formatCurrency(size.price)}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-[2rem] border-2 border-dashed">
            <p className="font-bold text-lg">الكمية المطلوبة:</p>
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => handleQuantityChange(quantity - 1)} 
                    className="p-3 bg-secondary rounded-2xl text-primary font-black text-2xl active:scale-75 transition-all"
                >
                    <Minus className="h-6 w-6"/>
                </button>
                <span className="w-8 text-center font-black text-2xl">{isOutOfStock ? 0 : quantity}</span>
                <button 
                    onClick={() => handleQuantityChange(quantity + 1)} 
                    className="p-3 bg-primary rounded-2xl text-white font-black text-2xl active:scale-75 transition-all"
                >
                    <Plus className="h-6 w-6"/>
                </button>
            </div>
        </div>
        
        <Button 
            size="lg" 
            className="w-full h-16 text-2xl font-black rounded-[2rem] shadow-xl shadow-primary/20" 
            onClick={handleAddToCart} 
            disabled={isOutOfStock || (restaurant && !restaurant.isStoreOpen)}
        >
          <ShoppingCart className="ml-3 h-8 w-8"/>
          {restaurant && !restaurant.isStoreOpen ? "المتجر مغلق" : (isOutOfStock ? "نفدت الكمية" : "إضافة إلى السلة")}
        </Button>
      </div>
      
       {relatedProducts.length > 0 && (
         <div className="pt-8 border-t px-6">
            <h2 className="text-2xl font-black mb-6">منتجات أخرى قد تعجبك</h2>
            <div className="grid grid-cols-2 gap-4 pb-12">
                {relatedProducts.map(p => <ProductCard key={p.id} product={p}/>)}
            </div>
         </div>
       )}
    </div>
  );
}
