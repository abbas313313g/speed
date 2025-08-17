
"use client";

import { useContext, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { AppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { Minus, Plus, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export default function ProductDetailPage() {
  const { id } = useParams();
  const context = useContext(AppContext);
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);

  const product = useMemo(() => context?.products.find(p => p.id === id), [id, context?.products]);

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
      context.addToCart(product, quantity);
       toast({
        title: "تمت الإضافة إلى السلة",
        description: `${quantity}x ${product.name}`,
      });
    }
  };

  return (
    <div className="pb-4">
      <div className="relative h-64 w-full">
        <Image
          src={product.image}
          alt={product.name}
          fill
          className="object-cover"
          data-ai-hint="food meal"
        />
      </div>

      <div className="p-4 space-y-4">
        <h1 className="text-3xl font-bold">{product.name}</h1>
        <p className="text-muted-foreground text-lg">{product.description}</p>
        <p className="text-3xl font-bold text-primary">{formatCurrency(product.price)}</p>
        
        <div className="flex items-center gap-4">
            <p className="font-semibold">الكمية:</p>
            <div className="flex items-center gap-2 rounded-lg border p-1">
                <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q-1))}>
                    <Minus className="h-4 w-4"/>
                </Button>
                <span className="w-10 text-center font-bold text-lg">{quantity}</span>
                <Button variant="ghost" size="icon" onClick={() => setQuantity(q => q + 1)}>
                    <Plus className="h-4 w-4"/>
                </Button>
            </div>
        </div>
        
        <Button size="lg" className="w-full text-lg" onClick={handleAddToCart}>
          <ShoppingCart className="ml-2 h-5 w-5"/>
          إضافة إلى السلة
        </Button>
      </div>
    </div>
  );
}
