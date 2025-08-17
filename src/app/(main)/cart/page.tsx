
"use client";

import { useContext, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Minus, Plus, Trash2, Home } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@/lib/types";

export default function CartPage() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!context) {
    return <div>جار التحميل...</div>;
  }

  const { cart, updateCartQuantity, removeFromCart, clearCart, cartTotal, addresses, placeOrder } = context;

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast({
        title: "الرجاء اختيار عنوان",
        description: "يجب اختيار عنوان توصيل لإكمال الطلب.",
        variant: "destructive",
      });
      return;
    }
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) return;

    setIsSubmitting(true);
    try {
      await placeOrder(selectedAddress);
      toast({
        title: "تم استلام طلبك بنجاح!",
        description: "يمكنك متابعة حالة طلبك من صفحة الطلبات.",
      });
    } catch (error) {
       toast({
        title: "حدث خطأ",
        description: "لم نتمكن من إرسال طلبك. الرجاء المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
        <ShoppingBag className="h-24 w-24 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-bold">سلّتك فارغة!</h2>
        <p className="text-muted-foreground mt-2">
          أضف بعض المنتجات لتبدأ التسوق.
        </p>
        <Button asChild className="mt-6">
          <Link href="/home">تصفح المنتجات</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-24">
      <header>
        <h1 className="text-3xl font-bold">سلة التسوق</h1>
      </header>

      <div className="space-y-4">
        {cart.map(({ product, quantity }) => (
          <div key={product.id} className="flex items-center gap-4">
            <Image
              src={product.image}
              alt={product.name}
              width={80}
              height={80}
              className="rounded-lg object-cover"
            />
            <div className="flex-grow">
              <h3 className="font-semibold">{product.name}</h3>
              <p className="text-primary font-bold">
                {formatCurrency(product.price)}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateCartQuantity(product.id, quantity - 1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span>{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => updateCartQuantity(product.id, quantity + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeFromCart(product.id)}
            >
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between font-bold text-lg">
          <span>المجموع:</span>
          <span>{formatCurrency(cartTotal)}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          سيتم إضافة رسوم التوصيل بناءً على المنطقة.
        </p>
      </div>

       <div className="space-y-4">
          <h2 className="text-xl font-semibold">اختر عنوان التوصيل</h2>
          {addresses.length > 0 ? (
             <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                <SelectTrigger className="w-full">
                    <SelectValue placeholder="اختر عنوانًا..." />
                </SelectTrigger>
                <SelectContent>
                    {addresses.map(address => (
                        <SelectItem key={address.id} value={address.id}>
                            <div className="flex items-center gap-2">
                                <Home className="h-4 w-4"/>
                                <span>{address.name} ({address.deliveryZone})</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          ) : (
              <div className="text-center p-4 border rounded-lg space-y-2">
                <p>يجب إضافة عنوان لتتمكن من الطلب.</p>
                 <Button asChild>
                    <Link href="/account/add-address">إضافة عنوان جديد</Link>
                </Button>
              </div>
          )}
       </div>

      <div className="flex gap-2">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="flex-1">
              <Trash2 className="ml-2 h-4 w-4" />
              إفراغ السلة
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
              <AlertDialogDescription>
                سيتم حذف جميع المنتجات من سلة التسوق الخاصة بك.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={clearCart}>
                نعم، قم بالحذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button 
            className="flex-1" 
            onClick={handlePlaceOrder} 
            disabled={isSubmitting || addresses.length === 0 || !selectedAddressId}>
          {isSubmitting ? "جارِ إرسال الطلب..." : "إكمال الطلب"}
        </Button>
      </div>
    </div>
  );
}
