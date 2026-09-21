
"use client";

import { useState, useMemo, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Minus, Plus, Trash2, Home, Loader2, MapPin, ReceiptText, Ticket, Store, ClipboardList, Percent, Wallet, CheckCircle2, Navigation } from "lucide-react";
import { formatCurrency, calculateDistance, calculateDeliveryFee, cn } from "@/lib/utils";
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
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";
import { useAddresses } from "@/hooks/useAddresses";
import { useRestaurants } from "@/hooks/useRestaurants";
import { useCoupons } from "@/hooks/useCoupons";
import { AppContext } from "@/contexts/AppContext";

const MAX_DELIVERY_DISTANCE = 25; 

export default function CartPage() {
  const { toast } = useToast();
  const context = useContext(AppContext);
  const [selectedAddressId, setSelectedAddressId] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [useWallet, setUseWallet] = useState(false);

  const { cart, updateCartQuantity, removeFromCart, cartTotal, placeOrder } = useCart();
  const { addresses } = useAddresses();
  const { restaurants } = useRestaurants();
  const { coupons } = useCoupons();

  const cartRestaurant = useMemo(() => {
    if (cart.length === 0) return null;
    const firstItemRestaurantId = cart[0].product.restaurantId;
    return restaurants.find(r => r.id === firstItemRestaurantId);
  }, [cart, restaurants]);

  const { deliveryFee, distance, isDistanceTooFar } = useMemo(() => {
    if (!selectedAddressId || !cartRestaurant) return { deliveryFee: 0, distance: null, isDistanceTooFar: false };
    const address = addresses.find(a => a.id === selectedAddressId);
    if (!address || !address.latitude || !address.longitude || !cartRestaurant.latitude || !cartRestaurant.longitude) return { deliveryFee: 1000, distance: null, isDistanceTooFar: false };
    const dist = calculateDistance(address.latitude, address.longitude, cartRestaurant.latitude, cartRestaurant.longitude);
    return { deliveryFee: calculateDeliveryFee(dist), distance: dist, isDistanceTooFar: dist > MAX_DELIVERY_DISTANCE };
  }, [selectedAddressId, addresses, cartRestaurant]);

  const handleApplyCoupon = async () => {
      if (!couponCode.trim()) return;
      setIsCheckingCoupon(true);
      const coupon = coupons.find(c => c.code === couponCode.trim().toUpperCase());
      if (!coupon || coupon.usedCount >= coupon.maxUses) {
          toast({ title: "كود غير صحيح أو منتهي", variant: "destructive" });
          setAppliedCoupon(null);
      } else {
          setAppliedCoupon(coupon);
          toast({ title: "تم تطبيق الكود بنجاح ✅" });
      }
      setIsCheckingCoupon(false);
  };

  const discountAmount = useMemo(() => {
      if (!appliedCoupon) return 0;
      if (appliedCoupon.discountTarget === 'delivery') return appliedCoupon.isFullDiscount ? deliveryFee : Math.min(deliveryFee, appliedCoupon.discountValue);
      return appliedCoupon.isFullDiscount ? cartTotal : Math.min(cartTotal, appliedCoupon.discountValue);
  }, [appliedCoupon, cartTotal, deliveryFee]);

  const walletDiscount = useMemo(() => {
      if (!useWallet || !context?.walletBalance) return 0;
      const subTotal = cartTotal + deliveryFee - discountAmount;
      return Math.min(subTotal, context.walletBalance);
  }, [useWallet, context?.walletBalance, cartTotal, deliveryFee, discountAmount]);

  const handlePlaceOrder = async () => {
    if (!selectedAddressId || isDistanceTooFar) return;
    const selectedAddress = addresses.find(a => a.id === selectedAddressId);
    if (!selectedAddress) return;
    setIsSubmitting(true);
    const orderId = await placeOrder(selectedAddress, deliveryFee, couponCode, walletDiscount);
    if (orderId) {
        toast({ title: "تم استلام طلبك بنجاح!" });
        setCouponCode(""); setAppliedCoupon(null); setUseWallet(false);
        context?.setActiveTab(4); 
    }
    setIsSubmitting(false);
  };

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
        <div className="p-6 w-full flex justify-end"><Button onClick={() => context?.setActiveTab(4)} variant="outline" className="rounded-xl font-black gap-2 text-primary border-primary/20"><ClipboardList className="h-5 w-5" /> متابعة طلباتي</Button></div>
        <div className="flex-1 flex flex-col items-center justify-center">
            <div className="p-10 bg-primary/5 rounded-full mb-6"><ShoppingBag className="h-24 w-24 text-primary/40" /></div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white">سلّتك فارغة!</h2>
            <Button asChild className="mt-8 h-14 px-10 rounded-2xl text-lg font-black shadow-xl"><Link href="/home">اكتشف القائمة الآن</Link></Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-40">
      <header className="flex justify-between items-start">
        <div className="flex flex-col gap-1 text-right">
            <h1 className="text-3xl font-black text-primary">سلة التسوق</h1>
            {cartRestaurant && <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 justify-end"><span className="font-bold">{cartRestaurant.name}</span><Store className="h-4 w-4" /></div>}
        </div>
        <Button onClick={() => context?.setActiveTab(4)} variant="outline" className="rounded-xl font-black gap-2 h-12 shadow-sm"><ClipboardList className="h-5 w-5" /> طلباتي</Button>
      </header>

      <div className="space-y-3">
        {cart.map(({ product, quantity, selectedSize }) => {
          const globalDiscount = cartRestaurant?.discountPercentage || 0;
          const getPrice = (p: number) => globalDiscount > 0 ? p * (1 - globalDiscount/100) : p;
          const itemPrice = selectedSize ? getPrice(selectedSize.price) : (product.discountPrice || getPrice(product.price));
          return (
            <div key={product.id + (selectedSize?.name || '')} className="flex items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-2xl border dark:border-slate-800 shadow-sm flex-row-reverse">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl"><Image src={product.image || 'https://placehold.co/80x80.png'} alt={product.name} fill className="object-cover" unoptimized={true} /></div>
              <div className="flex-grow min-w-0 py-1 text-right">
                <h3 className="font-black text-sm line-clamp-1">{product.name}</h3>
                <p className="text-primary font-black text-lg mt-1">{formatCurrency(itemPrice)}</p>
                <div className="flex items-center gap-3 mt-2 justify-end">
                  <div className="flex items-center gap-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button className="h-8 w-8 rounded-lg bg-white dark:bg-slate-700" onClick={() => updateCartQuantity(product.id, quantity - 1, selectedSize?.name)}><Minus className="h-4 w-4 mx-auto" /></button>
                    <span className="font-black text-lg w-4 text-center">{quantity}</span>
                    <button className="h-8 w-8 rounded-lg bg-primary text-white" onClick={() => updateCartQuantity(product.id, quantity + 1, selectedSize?.name)}><Plus className="h-4 w-4 mx-auto" /></button>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive/40" onClick={() => removeFromCart(product.id, selectedSize?.name)}><Trash2 className="h-5 w-5" /></Button>
            </div>
          )
        })}
      </div>

      {context?.walletBalance && context.walletBalance > 0 ? (
          <div className={cn("p-5 rounded-3xl border-2 transition-all flex items-center justify-between flex-row-reverse", useWallet ? "border-primary bg-primary/5" : "border-slate-100 bg-white")}>
              <div className="flex items-center gap-3 flex-row-reverse">
                  <div className="p-3 bg-primary/10 rounded-2xl"><Wallet className="h-6 w-6 text-primary"/></div>
                  <div className="text-right">
                      <p className="font-black text-sm">محفظتي الذكية</p>
                      <p className="text-primary font-black text-lg tracking-tighter">{formatCurrency(context.walletBalance)}</p>
                  </div>
              </div>
              <Button variant={useWallet ? "default" : "outline"} className="rounded-xl font-black px-6" onClick={() => setUseWallet(!useWallet)}>
                  {useWallet ? "مفعل ✅" : "استخدام الرصيد"}
              </Button>
          </div>
      ) : null}

       <div className="space-y-4">
          <h2 className="text-lg font-black flex items-center gap-2 px-1 text-slate-800 dark:text-white justify-end">موقع التوصيل <MapPin className="h-5 w-5 text-primary"/></h2>
          {addresses.length > 0 ? (
             <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                <SelectTrigger className="w-full h-14 rounded-2xl border-2 font-bold bg-white text-right" dir="rtl"><SelectValue placeholder="اختر العنوان..." /></SelectTrigger>
                <SelectContent className="rounded-2xl">{addresses.map(address => (<SelectItem key={address.id} value={address.id} className="font-bold py-3 text-right" dir="rtl"><div className="flex items-center gap-2 justify-end"><span>{address.name}</span><div className="p-2 bg-primary/10 rounded-lg"><Home className="h-4 w-4 text-primary"/></div></div></SelectItem>))}</SelectContent>
            </Select>
          ) : <Button asChild className="w-full h-14 rounded-2xl"><Link href="/account/add-address">إضافة عنوان جديد</Link></Button>}
       </div>

      <div className="space-y-6 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl border text-right">
        <h2 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-white justify-end">ملخص الحساب <ReceiptText className="h-6 w-6 text-primary"/></h2>
        <div className="space-y-4 font-bold text-sm">
            <div className="flex justify-between items-center text-slate-500"><span>{formatCurrency(cartTotal)}</span><span>مجموع الوجبات:</span></div>
            <div className="flex justify-between items-center text-slate-500"><span>{formatCurrency(deliveryFee)}</span><span>أجور التوصيل:</span></div>
            {distance !== null && <div className="flex justify-between items-center text-slate-400 text-[10px] italic"><span>{distance.toFixed(1)} كم</span><span>مسافة التوصيل:</span></div>}
            {appliedCoupon && <div className="flex justify-between items-center text-green-600"><span>-{formatCurrency(discountAmount)}</span><span>خصم الكود ({appliedCoupon.code}):</span></div>}
            {walletDiscount > 0 && <div className="flex justify-between items-center text-primary"><span>-{formatCurrency(walletDiscount)}</span><span>مخصوم من المحفظة:</span></div>}
            <Separator className="my-2 border-dashed" />
            <div className="flex justify-between items-end pt-2">
                <span className="text-4xl font-black text-primary tracking-tighter">{formatCurrency(Math.max(0, cartTotal + deliveryFee - discountAmount - walletDiscount))}</span>
                <span className="text-lg font-black">المجموع كاش:</span>
            </div>
        </div>
        <div className="pt-2">
             <div className="flex gap-2">
                <Button onClick={handleApplyCoupon} disabled={isCheckingCoupon || !couponCode.trim() || !!appliedCoupon} className="h-14 px-6 rounded-2xl font-black">{isCheckingCoupon ? <Loader2 className="h-5 w-5 animate-spin" /> : appliedCoupon ? "تم ✅" : "تطبيق"}</Button>
                <div className="relative flex-1"><Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="كود الخصم..." value={couponCode} onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if(appliedCoupon) setAppliedCoupon(null); }} className="h-14 rounded-2xl text-center font-black bg-slate-50 border-2"/></div>
             </div>
        </div>
      </div>

      <Button className="w-full h-16 rounded-[1.8rem] text-2xl font-black shadow-2xl shadow-primary/30" onClick={handlePlaceOrder} disabled={isSubmitting || addresses.length === 0 || !selectedAddressId || isDistanceTooFar}>
          {isSubmitting ? <Loader2 className="ml-2 h-6 w-6 animate-spin"/> : "تأكيد الطلب كاش"}
      </Button>
    </div>
  );
}
