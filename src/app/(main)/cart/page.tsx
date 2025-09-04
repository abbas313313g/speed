
"use client";

import { useContext, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Minus, Plus, Trash2, Home, TicketPercent, Loader2, MapPin } from "lucide-react";
import { formatCurrency, calculateDistance, calculateDeliveryFee } from "@/lib/utils";
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
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import type { Restaurant } from "@/lib/types";

export default function CartPage() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [isCouponLoading, setIsCouponLoading] = useState(false);

  if (!context) {
    return <div>جار التحميل...</div>;
  }

  const { cart, updateCartQuantity, removeFromCart, clearCart, cartTotal, addresses, placeOrder, restaurants, validateAndApplyCoupon } = context;

  const cartRestaurant = useMemo(() => {
    if (cart.length === 0) return null;
    const firstItemRestaurantId = cart[0].product.restaurantId;
    return restaurants.find(r => r.id === firstItemRestaurantId);
  }, [cart, restaurants]);


  const { deliveryFee, distance, finalTotal } = useMemo(() => {
    const subTotalWithDiscount = cartTotal - couponDiscount;
    if (!selectedAddressId || !cartRestaurant) {
        return { deliveryFee: 0, distance: null, finalTotal: subTotalWithDiscount };
    }
    
    const address = addresses.find(a => a.id === selectedAddressId);
    if (!address || !address.latitude || !address.longitude || !cartRestaurant.latitude || !cartRestaurant.longitude) {
       return { deliveryFee: 0, distance: null, finalTotal: subTotalWithDiscount };
    }

    const dist = calculateDistance(address.latitude, address.longitude, cartRestaurant.latitude, cartRestaurant.longitude);
    const fee = calculateDeliveryFee(dist);
    
    return { deliveryFee: fee, distance: dist, finalTotal: subTotalWithDiscount + fee };
  }, [selectedAddressId, cartTotal, addresses, couponDiscount, cartRestaurant]);


  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    setIsCouponLoading(true);
    const result = await validateAndApplyCoupon(couponCode);
    if (result.success) {
        setCouponDiscount(result.discount);
        toast({ title: "تم تطبيق الكود", description: result.message});
    } else {
        setCouponDiscount(0);
        toast({ title: "خطأ في الكود", description: result.message, variant: "destructive"});
    }
    setIsCouponLoading(false);
  }

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
      await placeOrder(selectedAddress, couponDiscount > 0 ? couponCode : undefined);
      toast({
        title: "تم استلام طلبك بنجاح!",
        description: "يمكنك متابعة حالة طلبك من صفحة الطلبات.",
      });
      setCouponCode("");
      setCouponDiscount(0);

    } catch (error: any) {
       toast({
        title: "حدث خطأ أثناء إرسال الطلب",
        description: error.message || "لم نتمكن من إرسال طلبك. الرجاء المحاولة مرة أخرى.",
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  const displayDistance = useMemo(() => {
    if (distance === null) return null;
    if (distance < 1) {
      return `~${Math.round(distance * 1000)} متر`;
    }
    return `~${distance.toFixed(1)} كم`;
  }, [distance]);

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
        {cartRestaurant && <p className="text-muted-foreground">الطلب من متجر: {cartRestaurant.name}</p>}
      </header>

      <div className="space-y-4">
        {cart.map(({ product, quantity, selectedSize }) => {
          const itemPrice = selectedSize?.price ?? product.discountPrice ?? product.price;
          const imageUrl = product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? product.image : 'https://placehold.co/80x80.png';
          return (
            <div key={product.id + (selectedSize?.name || '')} className="flex items-center gap-4">
              <Image
                src={imageUrl}
                alt={product.name}
                width={80}
                height={80}
                className="rounded-lg object-cover"
                unoptimized={true}
              />
              <div className="flex-grow">
                <h3 className="font-semibold">{product.name}</h3>
                {selectedSize && <p className="text-sm text-muted-foreground">{selectedSize.name}</p>}
                <p className="text-primary font-bold">
                  {formatCurrency(itemPrice)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateCartQuantity(product.id, quantity - 1, selectedSize?.name)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span>{quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateCartQuantity(product.id, quantity + 1, selectedSize?.name)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeFromCart(product.id, selectedSize?.name)}
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </div>
          )
        })}
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

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">كود الخصم</h2>
        <div className="flex gap-2">
            <Input 
                placeholder="أدخل كود الخصم" 
                value={couponCode} 
                onChange={(e) => setCouponCode(e.target.value)}
                disabled={couponDiscount > 0}
            />
            <Button onClick={handleApplyCoupon} disabled={!couponCode || isCouponLoading || couponDiscount > 0}>
                {isCouponLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <TicketPercent />}
            </Button>
        </div>
      </div>

      <div className="border-t pt-4 space-y-2">
        <div className="flex justify-between">
          <span>المجموع الفرعي:</span>
          <span>{formatCurrency(cartTotal)}</span>
        </div>
        {couponDiscount > 0 && (
           <div className="flex justify-between text-green-600">
             <span>الخصم:</span>
             <span>-{formatCurrency(couponDiscount)}</span>
           </div>
        )}
         <div className="flex justify-between">
          <span>سعر التوصيل:</span>
          <div className="flex flex-col items-end">
            <span>{formatCurrency(deliveryFee)}</span>
            {displayDistance && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3"/>{displayDistance}</span>}
          </div>
        </div>
        <Separator className="my-2"/>
        <div className="flex justify-between font-bold text-lg">
          <span>المجموع الكلي:</span>
          <span>{formatCurrency(finalTotal)}</span>
        </div>
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
              <AlertDialogAction onClick={() => {
                  clearCart();
                  setCouponDiscount(0);
                  setCouponCode("");
              }}>
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
