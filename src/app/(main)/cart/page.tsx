"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Minus, Plus, Trash2, Home, Loader2, MapPin, AlertCircle, ReceiptText } from "lucide-react";
import { formatCurrency, calculateDistance, calculateDeliveryFee, cn } from "@/lib/utils";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCart } from "@/hooks/useCart";
import { useAddresses } from "@/hooks/useAddresses";
import { useRestaurants } from "@/hooks/useRestaurants";

const MAX_DELIVERY_DISTANCE = 25; // 25 km

export default function CartPage() {
  const { toast } = useToast();
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");

  const { cart, updateCartQuantity, removeFromCart, clearCart, cartTotal, placeOrder } = useCart();
  const { addresses } = useAddresses();
  const { restaurants } = useRestaurants();


  const cartRestaurant = useMemo(() => {
    if (cart.length === 0) return null;
    const firstItemRestaurantId = cart[0].product.restaurantId;
    return restaurants.find(r => r.id === firstItemRestaurantId);
  }, [cart, restaurants]);


  const { deliveryFee, distance, isDistanceTooFar } = useMemo(() => {
    if (!selectedAddressId || !cartRestaurant) {
        return { deliveryFee: 0, distance: null, isDistanceTooFar: false };
    }
    
    const address = addresses.find(a => a.id === selectedAddressId);
    if (!address || !address.latitude || !address.longitude || !cartRestaurant.latitude || !cartRestaurant.longitude) {
       return { deliveryFee: 1000, distance: null, isDistanceTooFar: false };
    }

    const dist = calculateDistance(address.latitude, address.longitude, cartRestaurant.latitude, cartRestaurant.longitude);
    const fee = calculateDeliveryFee(dist);
    const tooFar = dist > MAX_DELIVERY_DISTANCE;
    
    return { deliveryFee: fee, distance: dist, isDistanceTooFar: tooFar };
  }, [selectedAddressId, addresses, cartRestaurant]);


  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast({
        title: "الرجاء اختيار عنوان",
        description: "يجب اختيار عنوان توصيل لإكمال الطلب.",
        variant: "destructive",
      });
      return;
    }
     if (isDistanceTooFar) {
      toast({
        title: "مسافة بعيدة جداً",
        description: `لا يمكن توصيل الطلب لأن المسافة تزيد عن ${MAX_DELIVERY_DISTANCE} كم.`,
        variant: "destructive",
      });
      return;
    }
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) return;

    setIsSubmitting(true);
    
    const orderId = await placeOrder(selectedAddress, deliveryFee, couponCode);

    if (orderId) {
        toast({
            title: "تم استلام طلبك بنجاح!",
            description: "يمكنك متابعة حالة طلبك من صفحة الطلبات.",
            duration: 5000,
        });
        setCouponCode("");
    }
    
    setIsSubmitting(false);
  };

  const displayDistance = useMemo(() => {
    if (distance === null) return null;
    if (distance < 1) {
      return `~${Math.round(distance * 1000)} متر`;
    }
    return `~${distance.toFixed(1)} كم`;
  }, [distance]);

  const finalTotalAmount = useMemo(() => {
    return cartTotal + deliveryFee;
  }, [cartTotal, deliveryFee]);

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
    <div className="p-4 space-y-6 pb-32">
      <header>
        <h1 className="text-3xl font-black text-primary">سلة التسوق</h1>
        {cartRestaurant && <p className="text-muted-foreground font-bold">الطلب من متجر: {cartRestaurant.name}</p>}
      </header>

      <div className="space-y-4">
        {cart.map(({ product, quantity, selectedSize }) => {
          const itemPrice = selectedSize?.price || product.discountPrice || product.price || 0;
          const imageUrl = product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? product.image : 'https://placehold.co/80x80.png';
          return (
            <div key={product.id + (selectedSize?.name || '')} className="flex items-center gap-4 bg-white p-3 rounded-2xl border shadow-sm">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="font-black text-sm truncate">{product.name}</h3>
                {selectedSize && <Badge variant="secondary" className="text-[10px] font-black">{selectedSize.name}</Badge>}
                <p className="text-primary font-black text-lg mt-1">
                  {formatCurrency(itemPrice)}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-4 bg-muted/50 p-1 rounded-xl">
                    <button
                        className="h-8 w-8 rounded-lg bg-white flex items-center justify-center shadow-sm active:scale-75 transition-all"
                        onClick={() => updateCartQuantity(product.id, quantity - 1, selectedSize?.name)}
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-black text-lg w-4 text-center">{quantity}</span>
                    <button
                        className="h-8 w-8 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm active:scale-75 transition-all"
                        onClick={() => updateCartQuantity(product.id, quantity + 1, selectedSize?.name)}
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive rounded-xl hover:bg-destructive/5"
                onClick={() => removeFromCart(product.id, selectedSize?.name)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          )
        })}
      </div>
      
       <div className="space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2 px-1"><MapPin className="h-5 w-5 text-primary"/> اختر عنوان التوصيل</h2>
          {addresses.length > 0 ? (
             <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                <SelectTrigger className="w-full h-14 rounded-2xl border-2 font-bold bg-white">
                    <SelectValue placeholder="اختر عنوانًا..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                    {addresses.map(address => (
                        <SelectItem key={address.id} value={address.id} className="font-bold">
                            <div className="flex items-center gap-2">
                                <Home className="h-4 w-4 text-primary"/>
                                <span>{address.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          ) : (
              <div className="text-center p-6 border-2 border-dashed rounded-[2rem] space-y-4 bg-muted/20">
                <p className="font-bold text-muted-foreground">يجب إضافة عنوان لتتمكن من الطلب.</p>
                 <Button asChild className="rounded-xl h-12">
                    <Link href="/account/add-address">إضافة عنوان جديد</Link>
                </Button>
              </div>
          )}
       </div>

      <div className="space-y-4 bg-white p-6 rounded-[2.5rem] shadow-xl border border-primary/5">
        <h2 className="text-lg font-black flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary"/> ملخص الحساب</h2>
        
        <div className="space-y-3 font-bold text-sm">
            <div className="flex justify-between items-center text-muted-foreground">
                <span>مجموع المنتجات:</span>
                <span className="text-foreground">{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-muted-foreground">
                <div className="flex flex-col">
                    <span>أجور التوصيل:</span>
                    {displayDistance && <span className="text-[10px] flex items-center gap-1"><MapPin className="h-3 w-3"/>{displayDistance}</span>}
                </div>
                <span className={cn("text-foreground", isDistanceTooFar && "text-destructive")}>{formatCurrency(deliveryFee)}</span>
            </div>
            
            <Separator className="my-2 border-dashed" />
            
            <div className="flex justify-between items-center pt-2">
                <span className="text-lg font-black">المجموع الكلي:</span>
                <div className="text-right">
                    <span className="text-3xl font-black text-primary tracking-tighter">{formatCurrency(finalTotalAmount)}</span>
                    <p className="text-[9px] text-muted-foreground">تشمل المنتجات + التوصيل</p>
                </div>
            </div>
        </div>

        <div className="pt-4">
             <Label className="text-[10px] font-black pr-1 mb-1 block">كود الخصم (اختياري)</Label>
             <Input 
                placeholder="أدخل الكود هنا..." 
                value={couponCode} 
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                className="h-12 rounded-xl text-center font-black bg-muted/20 border-none shadow-inner"
            />
        </div>
      </div>

       {isDistanceTooFar && (
        <Alert variant="destructive" className="rounded-2xl border-2">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-black">مسافة التوصيل بعيدة جداً</AlertTitle>
          <AlertDescription className="font-bold">
            عذراً، هذا المتجر يبعد أكثر من {MAX_DELIVERY_DISTANCE} كم عن موقعك. لا يمكننا توصيل الطلب حالياً.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-bold border-2 text-muted-foreground">
              <Trash2 className="ml-2 h-4 w-4" />
              إفراغ السلة
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2.5rem]">
            <AlertDialogHeader className="text-right">
              <AlertDialogTitle className="text-xl font-black">هل أنت متأكد؟</AlertDialogTitle>
              <AlertDialogDescription className="font-bold">
                سيتم حذف جميع المنتجات والبدء من جديد.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3">
              <AlertDialogCancel className="flex-1 rounded-xl font-bold">إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={() => { clearCart(); setCouponCode(""); }} className="flex-1 rounded-xl bg-destructive hover:bg-destructive/90 font-bold">نعم، إفراغ</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button 
            className="flex-[2] h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 transition-all active:scale-95" 
            onClick={handlePlaceOrder} 
            disabled={isSubmitting || addresses.length === 0 || !selectedAddressId || isDistanceTooFar}>
            {isSubmitting ? <><Loader2 className="ml-2 h-5 w-5 animate-spin"/> جارِ الإرسال...</> : "تأكيد الطلب كاش"}
        </Button>
      </div>
      <p className="text-center text-[10px] font-bold text-muted-foreground italic px-4">بالضغط على تأكيد الطلب، فإنك توافق على سياسة التوصيل المتبعة في سبيد شوب.</p>
    </div>
  );
}