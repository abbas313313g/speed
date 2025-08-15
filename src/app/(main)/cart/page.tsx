
"use client";

import { useContext } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export default function CartPage() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();

  if (!context) return null;

  const { cart, updateQuantity, totalCartPrice, deliveryFee, clearCart } = context;

  const handleCheckout = () => {
    toast({
        title: "تم استلام طلبك بنجاح!",
        description: "سيتم تحضير طلبك وتوصيله في أقرب وقت ممكن.",
    });
    clearCart();
    router.push('/orders');
  }

  if (cart.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
            <ShoppingBag className="h-24 w-24 text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-bold">سلّتك فارغة!</h2>
            <p className="text-muted-foreground mt-2">أضف بعض المنتجات اللذيذة لتبدأ الطلب.</p>
            <Button asChild className="mt-6">
                <Link href="/home">تصفح المنتجات</Link>
            </Button>
        </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">سلة التسوق</h1>
      </header>

      <div className="space-y-4">
        {cart.map(item => (
          <Card key={item.product.id} className="overflow-hidden flex items-center">
            <div className="relative h-24 w-24 flex-shrink-0">
                <Image src={item.product.image} alt={item.product.name} fill className="object-cover" />
            </div>
            <CardContent className="p-4 flex-grow space-y-2">
              <h3 className="font-semibold">{item.product.name}</h3>
              <p className="font-bold text-primary">{formatCurrency(item.product.price)}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 rounded-lg border">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                        <Minus className="h-4 w-4"/>
                    </Button>
                    <span className="w-8 text-center font-bold">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                        <Plus className="h-4 w-4"/>
                    </Button>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => updateQuantity(item.product.id, 0)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ملخص الطلب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>المجموع الفرعي</span>
            <span className="font-semibold">{formatCurrency(totalCartPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span>رسوم التوصيل</span>
            <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-xl font-bold">
            <span>المجموع الكلي</span>
            <span>{formatCurrency(totalCartPrice + deliveryFee)}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button size="lg" className="w-full text-lg" onClick={handleCheckout}>
            تأكيد الطلب
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
