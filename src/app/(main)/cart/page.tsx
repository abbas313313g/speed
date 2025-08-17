
"use client";

import { useContext, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Minus, Plus, Trash2, ShoppingBag, Tag, Home, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import type { Address } from '@/lib/types';

export default function CartPage() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();
  const [coupon, setCoupon] = useState('');
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);

  useEffect(() => {
    // If auth is loading, we wait. If it's done and there's no user, redirect.
    if (!context?.isAuthLoading && !context?.firebaseUser) {
      router.replace('/login');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router]);

  useEffect(() => {
    // Set default address when component loads or user addresses change
    if(context?.user?.addresses && context.user.addresses.length > 0 && !selectedAddressId){
        setSelectedAddressId(context.user.addresses[0].id);
    }
  }, [context?.user?.addresses, selectedAddressId]);


  if (context?.isAuthLoading || !context?.firebaseUser) {
    return (
       <div className="flex h-[calc(100vh-8rem)] w-full flex-col items-center justify-center p-4">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="mt-2 text-muted-foreground">الرجاء الانتظار...</p>
       </div>
    );
  }

  const { cart, updateQuantity, totalCartPrice, deliveryFee, placeOrder, applyCoupon, discount, user } = context;

  const handleCheckout = () => {
    if (!selectedAddressId) {
        toast({ title: "الرجاء اختيار عنوان التوصيل", variant: "destructive" });
        return;
    }
    const selectedAddress = user?.addresses?.find(a => a.id === selectedAddressId);
    if (placeOrder && selectedAddress) {
      placeOrder(selectedAddress);
      toast({
          title: "تم استلام طلبك بنجاح!",
          description: "سيتم تحضير طلبك وتوصيله للعنوان المسجل.",
      });
      router.push('/orders');
    }
  }

  const handleApplyCoupon = () => {
    applyCoupon(coupon);
  }

  const finalTotal = totalCartPrice - discount + deliveryFee;

  if (cart.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
            <ShoppingBag className="h-24 w-24 text-muted-foreground/50 mb-4" />
            <h2 className="text-2xl font-bold">سلّتك فارغة!</h2>
            <p className="text-muted-foreground mt-2">أضف بعض المنتجات لتبدأ الطلب.</p>
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
            <CardTitle className="flex items-center gap-2"><Tag/> كوبون الخصم</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="flex gap-2">
                <Input placeholder="أدخل كود الخصم" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                <Button onClick={handleApplyCoupon}>تطبيق</Button>
            </div>
          </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>اختر عنوان التوصيل</CardTitle>
        </CardHeader>
        <CardContent>
            {user?.addresses && user.addresses.length > 0 ? (
                <RadioGroup value={selectedAddressId} onValueChange={setSelectedAddressId}>
                    {user.addresses.map(address => (
                        <Label key={address.id} htmlFor={address.id} className="flex items-center gap-4 p-3 rounded-md border cursor-pointer">
                           <RadioGroupItem value={address.id} id={address.id} />
                           <Home className="h-5 w-5 text-muted-foreground" />
                           <span>{address.name}</span>
                        </Label>
                    ))}
                </RadioGroup>
            ) : (
                <div className="text-center text-muted-foreground py-4">
                    <p>لا يوجد عنوان توصيل. الرجاء إضافة عنوان من صفحة حسابك.</p>
                    <Button asChild variant="link">
                        <Link href="/account">الذهاب لصفحة الحساب</Link>
                    </Button>
                </div>
            )}
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>ملخص الطلب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span>المجموع الفرعي</span>
            <span className="font-semibold">{formatCurrency(totalCartPrice)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
                <span>الخصم</span>
                <span className="font-semibold">{formatCurrency(-discount)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>رسوم التوصيل</span>
            <span className="font-semibold">{formatCurrency(deliveryFee)}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-xl font-bold">
            <span>المجموع الكلي</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button size="lg" className="w-full text-lg" onClick={handleCheckout} disabled={!selectedAddressId}>
            تأكيد الطلب
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
