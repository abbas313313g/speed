
"use client";

import { useState, useMemo, useEffect, useContext } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { Minus, Plus, ShoppingCart, ArrowRight, Store, Maximize2, X } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import type { ProductSize } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { useProducts } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useRestaurants } from '@/hooks/useRestaurants';
import { AppContext } from '@/contexts/AppContext';

export default function ProductDetailPage() {
  const context = useContext(AppContext);
  if (!context) return null;
  const { selectedProductId, setActiveTab, activeTab, previousTab, setSelectedRestaurantId } = context;

  const { products, isLoading } = useProducts(undefined, undefined, 1, selectedProductId || undefined);
  const { restaurants } = useRestaurants();
  const { addToCart, cart } = useCart();
  const { toast } = useToast();
  
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(undefined);
  const [isZoomed, setIsZoomed] = useState(false);
  const [imgError, setImgError] = useState(false);

  const [zoomScale, setZoomScale] = useState(1);
  const [zoomOffset, setZoomOffset] = useState({ x: 0, y: 0 });
  const [initialDistance, setInitialDistance] = useState<number | null>(null);
  const [lastTouch, setLastTouch] = useState({ x: 0, y: 0 });

  const isCurrentlyVisible = activeTab === 9;

  const product = useMemo(() => products[0] || null, [products]);
  const restaurant = useMemo(() => product ? restaurants.find(r => r.id === product.restaurantId) : null, [product, restaurants]);

  const activeSizes = useMemo(() => {
      return product?.sizes?.filter(s => s.isActive !== false) || [];
  }, [product]);

  const hasSizes = activeSizes.length > 0;

  const priceDisplay = useMemo(() => {
    if (selectedSize) return formatCurrency(selectedSize.price);
    if (hasSizes) {
      const prices = activeSizes.map(s => s.price);
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      if (min === max) return formatCurrency(min);
      return `${formatCurrency(min)} - ${formatCurrency(max)}`;
    }
    const basePrice = product?.discountPrice || product?.price || 0;
    return formatCurrency(basePrice);
  }, [selectedSize, product, hasSizes, activeSizes]);

  const cartCount = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);

  useEffect(() => {
    if (isCurrentlyVisible) {
        setSelectedSize(undefined);
        setQuantity(1);
        setImgError(false);
        setIsZoomed(false);
        setZoomScale(1);
        setZoomOffset({ x: 0, y: 0 });
    }
  }, [selectedProductId, isCurrentlyVisible]);

  const availableStock = useMemo(() => {
    if (selectedSize) return selectedSize.stock;
    if (hasSizes) return 0; 
    return product?.stock ?? 0;
  }, [selectedSize, product, hasSizes]);

  const isOutOfStock = useMemo(() => {
      if (hasSizes) {
          if (!selectedSize) return false; 
          return !selectedSize.isUnlimited && selectedSize.stock <= 0;
      }
      return !product?.isUnlimitedStock && (product?.stock ?? 0) <= 0;
  }, [product, selectedSize, hasSizes]);

  if (!isCurrentlyVisible) return null;

  if (isLoading || !product) {
    return (
        <div className="p-4 space-y-4 h-full bg-background flex flex-col items-center justify-center">
            <Skeleton className="w-[90%] aspect-square rounded-[2.5rem]" />
            <div className="w-full px-6 space-y-4">
                <Skeleton className="h-10 w-3/4 mr-auto" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-14 w-1/2 mr-auto" />
            </div>
            <div className="text-primary font-black text-xs animate-pulse mt-10">جارِ جلب تفاصيل الوجبة...</div>
        </div>
    );
  }

  const handleAddToCart = () => {
      if (restaurant && !restaurant.isStoreOpen) {
        toast({ title: "المتجر مغلق حاليًا", variant: "destructive" });
        return;
      }
      if (hasSizes && !selectedSize) {
        toast({ title: "يرجى اختيار الحجم والنوع أولاً", variant: "destructive" });
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
            description: `${quantity}x ${product.name}`,
          });
      }
  };

  const handleVisitStore = () => {
      if (restaurant) {
          setSelectedRestaurantId(restaurant.id);
          setActiveTab(10);
      }
  };

  const handleQuantityChange = (newQuantity: number) => {
    const isUnlimited = selectedSize?.isUnlimited || product.isUnlimitedStock;
    if (!isUnlimited && newQuantity > availableStock) {
      setQuantity(availableStock);
      toast({ title: "وصلت للحد الأقصى المتوفر", variant: "destructive" });
    } else if (newQuantity < 1) {
      setQuantity(1);
    } else {
      setQuantity(newQuantity);
    }
  };

  const handleBack = () => {
      if (typeof previousTab === 'number' && previousTab !== 9) {
          setActiveTab(previousTab);
      } else {
          setActiveTab(0);
      }
  };

  const hasIndividualDiscount = !!product.discountPrice && !hasSizes;
  
  const imageUrl = imgError 
    ? 'https://placehold.co/600x600/00b358/white?text=Speed+Shop' 
    : (product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? product.image : 'https://placehold.co/600x600/00b358/white?text=Speed+Shop');

  const onTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          setInitialDistance(dist);
      } else if (e.touches.length === 1) {
          setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
  };

  const onTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && initialDistance) {
          const dist = Math.hypot(
              e.touches[0].clientX - e.touches[1].clientX,
              e.touches[0].clientY - e.touches[1].clientY
          );
          const delta = dist / initialDistance;
          setZoomScale(prev => Math.min(Math.max(prev * delta, 1), 4));
          setInitialDistance(dist);
      } else if (e.touches.length === 1 && zoomScale > 1) {
          const deltaX = e.touches[0].clientX - lastTouch.x;
          const deltaY = e.touches[0].clientY - lastTouch.y;
          setZoomOffset(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
          setLastTouch({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      }
  };

  const onTouchEnd = () => {
      setInitialDistance(null);
  };

  const toggleZoom = () => {
      if (isZoomed) {
          setZoomScale(1);
          setZoomOffset({ x: 0, y: 0 });
          setIsZoomed(false);
      } else {
          setIsZoomed(true);
      }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden text-right">
       <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center">
          <button 
            onClick={handleBack} 
            className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl text-primary active:scale-75 transition-all"
          >
              <ArrowRight className="h-6 w-6"/>
          </button>
          
          <button 
            onClick={() => setActiveTab(3)}
            className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl relative active:scale-75 transition-all"
          >
             <ShoppingCart className="h-6 w-6 text-primary"/>
             {cartCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-black bg-destructive border-2 border-white animate-in zoom-in">
                    {cartCount}
                </Badge>
             )}
          </button>
       </div>

      <div className="flex-1 overflow-y-auto">
          <div 
            className="relative w-full aspect-square overflow-hidden sm:rounded-b-[3.5rem] shadow-2xl cursor-zoom-in"
            onClick={toggleZoom}
          >
            <Image 
                src={imageUrl} 
                alt={product.name} 
                fill 
                className="object-cover" 
                unoptimized={true} 
                priority={true}
                loading="eager"
                onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-16 right-6 p-2 bg-black/30 backdrop-blur-md rounded-full">
                <Maximize2 className="h-5 w-5 text-white" />
            </div>
          </div>

          <div className="px-6 -mt-10 relative z-10 pb-10">
            <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl space-y-6">
                <div className="space-y-2 text-right">
                    <div className="flex justify-between items-start flex-row-reverse">
                        <div className="space-y-1">
                            <h1 className="text-2xl font-black text-slate-800 leading-tight">{product.name}</h1>
                            {restaurant && (
                                <button onClick={handleVisitStore} className="flex items-center gap-2 text-primary group active:scale-95 transition-all mt-1 justify-end">
                                    <span className="text-xs font-black border-b border-primary/20">زيارة المتجر: {restaurant.name}</span>
                                    <div className="p-1.5 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                        <Store className="h-3.5 w-3.5" />
                                    </div>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <p className="text-muted-foreground text-sm font-medium leading-relaxed bg-muted/20 p-4 rounded-2xl border-r-4 border-primary whitespace-pre-wrap text-right">
                    {product.description || "متاجر SPEED SHOP الاحترافية"}
                </p>

                <div className="flex items-end justify-between">
                    <div className="space-y-1 text-right">
                        <span className="text-[10px] font-black text-muted-foreground uppercase">السعر الحالي</span>
                        <div className="flex items-center gap-3 justify-end">
                             {hasIndividualDiscount && <p className="text-base font-bold text-muted-foreground line-through decoration-destructive/40">{formatCurrency(product.price)}</p>}
                             <p className={cn("font-black text-primary tracking-tighter", hasSizes && !selectedSize ? "text-xl" : "text-3xl")}>
                                {priceDisplay}
                             </p>
                        </div>
                    </div>
                    <Badge variant={isOutOfStock ? "destructive" : "secondary"} className="rounded-xl px-4 py-1 font-black">
                        {isOutOfStock ? "نفد" : 
                         (hasSizes && !selectedSize) ? "يرجى الاختيار" :
                         (selectedSize?.isUnlimited || product.isUnlimitedStock) ? "متوفر" : 
                         `باقي: ${availableStock}`}
                    </Badge>
                </div>

                {hasSizes && (
                  <div className="space-y-4">
                    <Label className="font-black text-lg">اختر الحجم والنوع:</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {activeSizes.map((size) => (
                        <button
                            key={size.name}
                            disabled={!size.isUnlimited && size.stock <= 0}
                            onClick={() => setSelectedSize(size)}
                            className={cn(
                                "flex flex-col items-center gap-1 p-4 rounded-[2rem] border-2 transition-all",
                                selectedSize?.name === size.name ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 bg-slate-50',
                                !size.isUnlimited && size.stock <= 0 && 'opacity-30 grayscale'
                            )}
                        >
                            <span className="font-black text-sm">{size.name}</span>
                            <span className="font-black text-xs opacity-80">{formatCurrency(size.price)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-[2rem] border-2">
                    <p className="font-black text-sm mr-4">الكمية</p>
                    <div className="flex items-center gap-4 bg-white p-1 rounded-[1.8rem] shadow-sm">
                        <button onClick={() => handleQuantityChange(quantity - 1)} className="p-3 bg-slate-100 rounded-2xl active:scale-75 transition-all"><Minus className="h-5 w-5"/></button>
                        <span className="w-8 text-center font-black text-xl">{isOutOfStock ? 0 : quantity}</span>
                        <button onClick={() => handleQuantityChange(quantity + 1)} className="p-3 bg-primary rounded-2xl text-white active:scale-75 transition-all"><Plus className="h-5 w-5"/></button>
                    </div>
                </div>
            </div>
          </div>
      </div>

      <div className="p-6 bg-white/80 backdrop-blur-xl border-t shrink-0 rounded-t-[2.5rem] shadow-t-xl">
          <Button 
                size="lg" 
                className={cn(
                    "w-full h-16 text-xl font-black rounded-3xl shadow-2xl transition-all",
                    (!selectedSize && hasSizes) ? "bg-slate-200 text-slate-400" : "bg-primary shadow-primary/20"
                )}
                onClick={handleAddToCart} 
                disabled={isOutOfStock || (restaurant && !restaurant.isStoreOpen)}
          >
              <ShoppingCart className="ml-3 h-7 w-7"/>
              {restaurant && !restaurant.isStoreOpen ? "المتجر مغلق" : "إضافة إلى السلة"}
          </Button>
      </div>

      {isZoomed && (
        <div 
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4 animate-in fade-in duration-300 touch-none"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
        >
            <button 
                className="absolute top-10 right-6 p-4 bg-white/10 rounded-full text-white z-[110]"
                onClick={toggleZoom}
            >
                <X className="h-8 w-8" />
            </button>
            <div 
                className="relative w-full aspect-square max-w-[500px] transition-transform duration-75 will-change-transform"
                style={{ 
                    transform: `scale(${zoomScale}) translate(${zoomOffset.x / zoomScale}px, ${zoomOffset.y / zoomScale}px)` 
                }}
            >
                <Image 
                    src={imageUrl} 
                    alt={product.name} 
                    fill 
                    className="object-contain" 
                    unoptimized={true} 
                    priority={true}
                    loading="eager"
                />
            </div>
            <div className="absolute bottom-10 left-0 right-0 text-center pointer-events-none">
                <p className="text-white font-black text-xl px-6 truncate">{product.name}</p>
                <p className="text-white/60 text-[10px] font-bold mt-1 uppercase tracking-widest">استخدم إصبعين للتكبير والسحب</p>
            </div>
        </div>
      )}
    </div>
  );
}
