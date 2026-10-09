
"use client";

import { useState, useMemo, useContext } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Minus, Plus, Trash2, Home, Loader2, MapPin, ReceiptText, Ticket, Store, ClipboardList, Percent, Wallet, CheckCircle2, Navigation, ArrowRight } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-8 bg-[#f8fafc] dark:bg-slate-950">
        <div className="p-16 bg-white dark:bg-slate-900 rounded-[4rem] shadow-2xl space-y-8 animate-in zoom-in duration-500">
            <div className="p-10 bg-primary/10 rounded-full w-fit mx-auto relative">
                <ShoppingBag className="h-24 w-24 text-primary" />
                <div className="absolute -top-2 -right-2 bg-red-500 text-white p-3 rounded-full animate-ping" />
            </div>
            <div>
                <h2 className="text-4xl font-black text-slate-800 dark:text-white leading-tight">سلتك بانتظار <br/> اختياراتك!</h2>
                <p className="text-muted-foreground font-bold mt-4">ابدأ بتصفح المتاجر الآن وأضف وجباتك المفضلة.</p>
            </div>
            <Button onClick={() => context?.setActiveTab(1)} className="w-full h-16 rounded-[1.8rem] text-xl font-black shadow-xl shadow-primary/20 transition-all active:scale-95">
                تصفح المتاجر الآن
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 pb-40 bg-[#f8fafc] dark:bg-slate-950 min-h-full text-right animate-in fade-in duration-500">
      <header className="flex justify-between items-center bg-white dark:bg-slate-900 p-5 rounded-[2.2rem] shadow-sm border border-slate-50 dark:border-slate-800">
        <Button onClick={() => context?.setActiveTab(4)} variant="outline" className="rounded-xl font-black gap-2 h-12 shadow-sm border-2"><ClipboardList className="h-5 w-5" /> طلباتي</Button>
        <div className="text-right">
            <h1 className="text-2xl font-black text-primary italic">سلة التسوق</h1>
            {cartRestaurant && <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 justify-end mt-1"><span className="text-xs font-bold">{cartRestaurant.name}</span><Store className="h-3.5 w-3.5 text-primary" /></div>}
        </div>
      </header>

      <div className="space-y-4">
        {cart.map(({ product, quantity, selectedSize }) => {
          const globalDiscount = cartRestaurant?.discountPercentage || 0;
          const getPrice = (p: number) => globalDiscount > 0 ? p * (1 - globalDiscount/100) : p;
          const itemPrice = selectedSize ? getPrice(selectedSize.price) : (product.discountPrice || getPrice(product.price));
          return (
            <div key={product.id + (selectedSize?.name || '')} className="flex items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-[2.5rem] border dark:border-slate-800 shadow-xl flex-row-reverse group transition-all hover:shadow-2xl">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl border-2 border-slate-50 shadow-inner"><Image src={product.image || 'https://placehold.co/100x100.png'} alt={product.name} fill className="object-cover group-hover:scale-110 transition-transform duration-500" unoptimized={true} /></div>
              <div className="flex-grow min-w-0 py-1 text-right">
                <h3 className="font-black text-slate-800 dark:text-white text-base line-clamp-1 leading-none">{product.name}</h3>
                <div className="flex items-center gap-2 justify-end mt-2">
                    <span className="text-primary font-black text-xl tracking-tighter">{formatCurrency(itemPrice)}</span>
                </div>
                <div className="flex items-center gap-3 mt-3 justify-end">
                  <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-1.5 rounded-2xl border-2 border-slate-100 dark:border-slate-700 shadow-inner">
                    <button className="h-9 w-9 rounded-xl bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary active:scale-75 transition-all" onClick={() => updateCartQuantity(product.id, quantity - 1, selectedSize?.name)}><Minus className="h-4 w-4" /></button>
                    <span className="font-black text-xl w-6 text-center dark:text-white">{quantity}</span>
                    <button className="h-9 w-9 rounded-xl bg-primary shadow-lg flex items-center justify-center text-white active:scale-75 transition-all" onClick={() => updateCartQuantity(product.id, quantity + 1, selectedSize?.name)}><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="text-destructive/20 hover:text-destructive hover:bg-destructive/5 rounded-full" onClick={() => removeFromCart(product.id, selectedSize?.name)}><Trash2 className="h-5 w-5" /></Button>
            </div>
          )
        })}
      </div>

      {context?.walletBalance && context.walletBalance > 0 ? (
          <div className={cn("p-6 rounded-[2.5rem] border-2 transition-all flex items-center justify-between flex-row-reverse shadow-xl", useWallet ? "border-primary bg-primary/5" : "border-white bg-white dark:bg-slate-900")}>
              <div className="flex items-center gap-4 flex-row-reverse">
                  <div className="p-4 bg-primary/10 rounded-[1.5rem]"><Wallet className="h-8 w-8 text-primary"/></div>
                  <div className="text-right">
                      <p className="font-black text-xs text-slate-400 uppercase tracking-widest">محفظتي الذكية</p>
                      <p className="text-primary font-black text-2xl tracking-tighter mt-1">{formatCurrency(context.walletBalance)}</p>
                  </div>
              </div>
              <button 
                onClick={() => setUseWallet(!useWallet)}
                className={cn("h-12 px-6 rounded-2xl font-black text-xs transition-all active:scale-90 shadow-md", useWallet ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}
              >
                  {useWallet ? "مفعل ✅" : "استخدم الرصيد"}
              </button>
          </div>
      ) : null}

       <div className="space-y-4">
          <h2 className="text-xl font-black flex items-center gap-2 px-1 text-slate-800 dark:text-white justify-end">موقع التوصيل <MapPin className="h-6 w-6 text-primary animate-pulse"/></h2>
          {addresses.length > 0 ? (
             <Select value={selectedAddressId} onValueChange={setSelectedAddressId}>
                <SelectTrigger className="w-full h-16 rounded-[1.8rem] border-2 border-white dark:border-slate-800 shadow-xl font-black bg-white dark:bg-slate-900 text-right text-lg" dir="rtl">
                    <SelectValue placeholder="اختر عنوان التوصيل..." />
                </SelectTrigger>
                <SelectContent className="rounded-[2rem] border-none shadow-2xl p-2">{addresses.map(address => (<SelectItem key={address.id} value={address.id} className="font-black py-4 text-right rounded-xl" dir="rtl"><div className="flex items-center gap-3 justify-end"><span>{address.name}</span><div className="p-2 bg-primary/10 rounded-xl"><Home className="h-4 w-4 text-primary"/></div></div></SelectItem>))}</SelectContent>
            </Select>
          ) : (
            <Button onClick={() => context?.setActiveTab(6)} className="w-full h-16 rounded-[1.8rem] text-xl font-black shadow-xl shadow-primary/20">
                إضافة عنوان جديد
            </Button>
          )}
       </div>

      <div className="space-y-6 bg-white dark:bg-slate-900 p-8 rounded-[3rem] shadow-2xl border border-white dark:border-slate-800 text-right relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12" />
        <h2 className="text-2xl font-black flex items-center gap-3 text-slate-800 dark:text-white justify-end relative z-10">ملخص الحساب <ReceiptText className="h-7 w-7 text-primary"/></h2>
        <div className="space-y-5 font-bold text-sm relative z-10">
            <div className="flex justify-between items-center text-slate-400"><span>{formatCurrency(cartTotal)}</span><span>مجموع الوجبات:</span></div>
            <div className="flex justify-between items-center text-slate-400"><span>{formatCurrency(deliveryFee)}</span><span>أجور التوصيل:</span></div>
            {distance !== null && <div className="flex justify-between items-center text-slate-300 text-[10px] italic"><span>{distance.toFixed(1)} كم</span><span>مسافة التوصيل:</span></div>}
            {appliedCoupon && <div className="flex justify-between items-center text-green-600 bg-green-50 dark:bg-green-950/20 p-2 rounded-xl"><span>-{formatCurrency(discountAmount)}</span><span>خصم الكود ({appliedCoupon.code}):</span></div>}
            {walletDiscount > 0 && <div className="flex justify-between items-center text-blue-600 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-xl"><span>-{formatCurrency(walletDiscount)}</span><span>مخصوم من المحفظة:</span></div>}
            
            <Separator className="my-2 border-dashed opacity-20" />
            
            <div className="flex justify-between items-end pt-2">
                <div className="flex flex-col items-start">
                    <span className="text-4xl font-black text-primary tracking-tighter leading-none">{formatCurrency(Math.max(0, cartTotal + deliveryFee - discountAmount - walletDiscount))}</span>
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">القيمة النهائية</span>
                </div>
                <span className="text-xl font-black text-slate-800 dark:text-white">المجموع كاش:</span>
            </div>
        </div>
        
        <div className="pt-4 relative z-10">
             <div className="flex gap-2">
                <Button onClick={handleApplyCoupon} disabled={isCheckingCoupon || !couponCode.trim() || !!appliedCoupon} className="h-14 px-8 rounded-2xl font-black shadow-lg">
                    {isCheckingCoupon ? <Loader2 className="h-6 w-6 animate-spin" /> : appliedCoupon ? "تم ✅" : "تطبيق"}
                </Button>
                <div className="relative flex-1">
                    <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-40" />
                    <Input 
                        placeholder="كود الخصم..." 
                        value={couponCode} 
                        onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); if(appliedCoupon) setAppliedCoupon(null); }} 
                        className="h-14 rounded-2xl text-center text-lg font-black bg-slate-50 dark:bg-slate-800 border-none shadow-inner"
                    />
                </div>
             </div>
        </div>
      </div>

      <div className="space-y-4">
        <Button 
            className="w-full h-20 rounded-[2.5rem] text-2xl font-black shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-4 group" 
            onClick={handlePlaceOrder} 
            disabled={isSubmitting || addresses.length === 0 || !selectedAddressId || isDistanceTooFar}
        >
            {isSubmitting ? <Loader2 className="h-8 w-8 animate-spin"/> : (
                <>
                    أكد الطلب الآن
                    <ArrowRight className="h-8 w-8 group-active:translate-x-2 transition-transform" />
                </>
            )}
        </Button>
        {isDistanceTooFar && (
            <p className="text-center text-xs font-black text-red-500 bg-red-50 dark:bg-red-950/20 p-4 rounded-[1.5rem] border-2 border-dashed border-red-100">
                عذراً، هذا العنوان بعيد جداً عن المتجر المحدد (أقصى مسافة {MAX_DELIVERY_DISTANCE}كم). يرجى اختيار متجر أقرب.
            </p>
        )}
      </div>
    </div>
  );
}
