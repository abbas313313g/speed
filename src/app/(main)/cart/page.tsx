
"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Minus, Plus, Trash2, Home, Loader2, MapPin, AlertCircle, ReceiptText, Ticket, Store, CheckCircle2 } from "lucide-react";
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
import { useCoupons } from "@/hooks/useCoupons";
import { query, collection, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";

const MAX_DELIVERY_DISTANCE = 25; // 25 km

export default function CartPage() {
  const { toast } = useToast();
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);

  const { cart, updateCartQuantity, removeFromCart, clearCart, cartTotal, placeOrder } = useCart();
  const { addresses } = useAddresses();
  const { restaurants } = useRestaurants();
  const { coupons } = useCoupons();

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

  const handleApplyCoupon = async () => {
      if (!couponCode.trim()) return;
      setIsCheckingCoupon(true);
      
      const coupon = coupons.find(c => c.code === couponCode.trim().toUpperCase());
      
      if (!coupon) {
          toast({ title: "كود غير صحيح", variant: "destructive" });
          setAppliedCoupon(null);
          setIsCheckingCoupon(false);
          return;
      }

      if (coupon.usedCount >= coupon.maxUses) {
          toast({ title: "هذا الكود انتهى استخدامه", variant: "destructive" });
          setAppliedCoupon(null);
          setIsCheckingCoupon(false);
          return;
      }

      // التحقق من شرط الطلب الأول (فحص سريع)
      const userId = localStorage.getItem('speedShopUserId');
      if (coupon.isFirstOrderOnly && userId) {
          const qOrders = query(collection(db, "orders"), where("userId", "==", userId), limit(1));
          const orderSnap = await getDocs(qOrders);
          if (!orderSnap.empty) {
              toast({ title: "عذراً، هذا الكود للزبائن الجدد فقط", variant: "destructive" });
              setAppliedCoupon(null);
              setIsCheckingCoupon(false);
              return;
          }
      }

      setAppliedCoupon(coupon);
      toast({ title: "تم تطبيق الكود بنجاح ✅" });
      setIsCheckingCoupon(false);
  };

  const discountAmount = useMemo(() => {
      if (!appliedCoupon) return 0;
      
      if (appliedCoupon.discountTarget === 'delivery') {
          if (appliedCoupon.isFullDiscount) return deliveryFee;
          return Math.min(deliveryFee, appliedCoupon.discountValue);
      } else {
          if (appliedCoupon.isFullDiscount) return cartTotal;
          return Math.min(cartTotal, appliedCoupon.discountValue);
      }
  }, [appliedCoupon, cartTotal, deliveryFee]);

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
        setAppliedCoupon(null);
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
    return Math.max(0, cartTotal + deliveryFee - discountAmount);
  }, [cartTotal, deliveryFee, discountAmount]);

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
        <div className="p-10 bg-primary/5 rounded-full mb-6">
            <ShoppingBag className="h-24 w-24 text-primary/40" />
        </div>
        <h2 className="text-3xl font-black text-slate-800 dark:text-white">سلّتك تنتظرك!</h2>
        <p className="text-muted-foreground font-bold mt-2 px-10">
          ابدأ بإضافة وجباتك المفضلة وسنقوم بتوصيلها لك في أسرع وقت.
        </p>
        <Button asChild className="mt-8 h-14 px-10 rounded-2xl text-lg font-black shadow-xl">
          <Link href="/home">اكتشف القائمة الآن</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-40">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-primary">سلة التسوق</h1>
        {cartRestaurant && (
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <Store className="h-4 w-4" />
                <span className="font-bold">الطلب من: {cartRestaurant.name}</span>
            </div>
        )}
      </header>

      <div className="space-y-3">
        {cart.map(({ product, quantity, selectedSize }) => {
          const itemPrice = selectedSize?.price || product.discountPrice || product.price || 0;
          const imageUrl = product.image && (product.image.startsWith('http') || product.image.startsWith('data:')) ? product.image : 'https://placehold.co/80x80.png';
          return (
            <div key={product.id + (selectedSize?.name || '')} className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border dark:border-slate-800 bg-muted/20">
                <Image
                  src={imageUrl}
                  alt={product.name}
                  fill
                  className="object-cover"
                  unoptimized={true}
                />
              </div>
              <div className="flex-grow min-w-0 py-1">
                <h3 className="font-black text-sm text-slate-800 dark:text-white line-clamp-1">{product.name}</h3>
                {selectedSize && <Badge variant="secondary" className="text-[9px] font-black h-5 px-2 mt-1">{selectedSize.name}</Badge>}
                <p className="text-primary font-black text-lg mt-1 tracking-tighter">
                  {formatCurrency(itemPrice)}
                </p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                        className="h-8 w-8 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm active:scale-75 transition-all text-slate-600 dark:text-slate-200"
                        onClick={() => updateCartQuantity(product.id, quantity - 1, selectedSize?.name)}
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-black text-lg w-4 text-center text-slate-800 dark:text-white">{quantity}</span>
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
                className="text-destructive/40 hover:text-destructive rounded-xl hover:bg-destructive/5 shrink-0"
                onClick={() => removeFromCart(product.id, selectedSize?.name)}
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          )
        })}
      </div>
      
       <div className="space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2 px-1 text-slate-800 dark:text-white"><MapPin className="h-5 w-5 text-primary"/> اختر عنوان التوصيل</h2>
          {addresses.length > 0 ? (
             <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                <SelectTrigger className="w-full h-14 rounded-2xl border-2 dark:border-slate-800 font-bold bg-white dark:bg-slate-900 shadow-sm ring-offset-background text-slate-900 dark:text-white">
                    <SelectValue placeholder="اختر من عناوينك المحفوظة..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl shadow-2xl border-none bg-white dark:bg-slate-900">
                    {addresses.map(address => (
                        <SelectItem key={address.id} value={address.id} className="font-bold py-3">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Home className="h-4 w-4 text-primary"/>
                                </div>
                                <span className="text-slate-900 dark:text-white">{address.name}</span>
                            </div>
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
          ) : (
              <div className="text-center p-8 border-4 border-dashed rounded-[2.5rem] space-y-4 bg-muted/20 dark:bg-slate-900 dark:border-slate-800">
                <p className="font-bold text-muted-foreground">عذراً، يجب إضافة عنوان أولاً لتتمكن من إتمام الطلب.</p>
                 <Button asChild className="rounded-xl h-12 px-6">
                    <Link href="/account/add-address">إضافة عنوان جديد الآن</Link>
                </Button>
              </div>
          )}
       </div>

      <div className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />
        <h2 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-white relative z-10"><ReceiptText className="h-6 w-6 text-primary"/> ملخص الحساب</h2>
        
        <div className="space-y-4 font-bold text-sm relative z-10">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <span className="font-bold">مجموع المنتجات:</span>
                <span className="text-slate-800 dark:text-white font-black">{formatCurrency(cartTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                <div className="flex flex-col text-right">
                    <span className="font-bold">أجور التوصيل:</span>
                    {displayDistance && <span className="text-[10px] flex items-center gap-1 justify-end font-black text-primary"><MapPin className="h-3 w-3"/>يبعد عنك {displayDistance}</span>}
                </div>
                <span className={cn("text-slate-800 dark:text-white font-black", isDistanceTooFar && "text-destructive")}>{formatCurrency(deliveryFee)}</span>
            </div>

            {appliedCoupon && discountAmount > 0 && (
                <div className="flex justify-between items-center text-green-600 dark:text-green-400 animate-in slide-in-from-right-2">
                    <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span className="font-bold">خصم الكود ({appliedCoupon.code}):</span>
                    </div>
                    <span className="font-black">-{formatCurrency(discountAmount)}</span>
                </div>
            )}
            
            <Separator className="my-2 border-dashed dark:border-slate-800" />
            
            <div className="flex justify-between items-end pt-2">
                <div className="flex flex-col">
                    <span className="text-lg font-black text-slate-800 dark:text-white">المجموع الكلي:</span>
                    <p className="text-[10px] text-muted-foreground font-bold italic">شامل الضريبة والتوصيل</p>
                </div>
                <div className="text-right">
                    <span className="text-4xl font-black text-primary tracking-tighter drop-shadow-sm">{formatCurrency(finalTotalAmount)}</span>
                </div>
            </div>
        </div>

        <div className="pt-2 relative z-10">
             <Label className="text-[10px] font-black pr-1 mb-1.5 block text-slate-500 dark:text-slate-400 uppercase tracking-widest">هل لديك كود خصم؟</Label>
             <div className="flex gap-2">
                <div className="relative flex-1">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="اكتب الكود هنا..." 
                        value={couponCode} 
                        onChange={(e) => {
                            setCouponCode(e.target.value.toUpperCase());
                            if(appliedCoupon) setAppliedCoupon(null); // ريست الكوبون عند التعديل
                        }}
                        className="h-14 rounded-2xl text-center font-black bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 shadow-inner pl-10 text-slate-900 dark:text-white"
                    />
                </div>
                <Button 
                    onClick={handleApplyCoupon} 
                    disabled={isCheckingCoupon || !couponCode.trim() || appliedCoupon}
                    className="h-14 px-6 rounded-2xl font-black shadow-lg transition-all active:scale-90"
                >
                    {isCheckingCoupon ? <Loader2 className="h-5 w-5 animate-spin" /> : appliedCoupon ? "تم ✅" : "تطبيق"}
                </Button>
             </div>
             {appliedCoupon && (
                 <p className="text-[10px] text-green-600 font-bold mt-2 text-center">
                     {appliedCoupon.discountTarget === 'delivery' ? 'تم تفعيل خصم على التوصيل' : 'تم تفعيل خصم على الوجبات'}
                 </p>
             )}
        </div>
      </div>

       {isDistanceTooFar && (
        <Alert variant="destructive" className="rounded-[2rem] border-2 bg-destructive/5 animate-in shake-1 duration-500">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="font-black">عذراً، المسافة بعيدة جداً!</AlertTitle>
          <AlertDescription className="font-bold opacity-90">
            هذا المتجر يبعد أكثر من {MAX_DELIVERY_DISTANCE} كم عن موقعك الحالي. يرجى اختيار متجر أقرب لضمان جودة وسرعة التوصيل.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <Button 
            className="w-full h-16 rounded-[1.8rem] text-2xl font-black shadow-2xl shadow-primary/30 transition-all active:scale-95 bg-primary hover:bg-primary/95 text-white" 
            onClick={handlePlaceOrder} 
            disabled={isSubmitting || addresses.length === 0 || !selectedAddressId || isDistanceTooFar}>
            {isSubmitting ? <><Loader2 className="ml-2 h-6 w-6 animate-spin"/> جارِ تأكيد الطلب...</> : "تأكيد الطلب كاش"}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" className="w-full h-12 rounded-xl font-bold text-destructive/60 hover:text-destructive hover:bg-destructive/5 transition-all">
              <Trash2 className="ml-2 h-4 w-4" />
              إفراغ كافة محتويات السلة
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl bg-white dark:bg-slate-900">
            <AlertDialogHeader className="text-right">
              <AlertDialogTitle className="text-2xl font-black text-slate-800 dark:text-white">هل أنت متأكد فعلاً؟</AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-slate-500 dark:text-slate-400">
                سيتم حذف كافة المنتجات التي قمت باختيارها وستعود السلة فارغة تماماً.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row gap-3 mt-4">
              <AlertDialogCancel className="flex-1 h-12 rounded-xl font-bold border-2 dark:border-slate-800 dark:text-white">تراجع</AlertDialogCancel>
              <AlertDialogAction onClick={() => { clearCart(); setCouponCode(""); setAppliedCoupon(null); }} className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90 font-bold shadow-lg shadow-destructive/20 text-white">نعم، إفراغ الآن</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      <p className="text-center text-[10px] font-bold text-muted-foreground italic px-6 leading-relaxed">من خلال الضغط على تأكيد الطلب، فأنت تقر بموافقتك الكاملة على سياسة التوصيل المتبعة في منصة سبيد شوب.</p>
    </div>
  );
}
