"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Loader2, CheckCircle2, ArrowRight, User, Phone, FileText, Navigation } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@/lib/types";
import { useAddresses } from "@/hooks/useAddresses";
import { Separator } from "@/components/ui/separator";
import { AppContext } from "@/contexts/AppContext";

export default function AddAddressPage() {
  const router = useRouter();
  const { toast } = useToast();
  const context = useContext(AppContext);
  const { addAddress } = useAddresses();
  
  const [address, setAddress] = useState<Omit<Address, "id">>({
    name: "",
    phone: "",
    deliveryZone: "عام",
    details: "",
    latitude: 0,
    longitude: 0,
    branchId: "main"
  });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const handleFetchLocation = () => {
    setIsFetchingLocation(true);
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setAddress(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }));
                toast({ title: "تم تحديد موقعك بدقة 🛰️" });
                setIsFetchingLocation(false);
            },
            (error) => {
                toast({ title: "يرجى تفعيل الموقع في إعدادات هاتفك.", variant: "destructive" });
                setIsFetchingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        toast({ title: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
        setIsFetchingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.name || !address.phone) {
      toast({ title: "بيانات غير مكتملة", variant: "destructive" });
      return;
    }
    if (address.latitude === 0) {
        toast({ title: "تحديد الموقع مطلوب", variant: "destructive" });
        return;
    }
    
    setIsSaving(true);
    try {
        await addAddress(address);
        router.back();
    } catch (e) {
        toast({ title: "فشل الحفظ السحابي", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-background h-full overflow-y-auto pb-40 text-right animate-in fade-in slide-in-from-left-4 duration-500">
      <header className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()} className="rounded-[1.2rem] h-12 w-12 border-2 text-primary shadow-sm active:scale-75 transition-all">
            <ArrowRight className="h-6 w-6" />
        </Button>
        <div className="text-right">
            <h1 className="text-2xl font-black text-slate-800 leading-none">إضافة عنوان جديد</h1>
            <p className="text-muted-foreground font-bold text-[10px] mt-1 uppercase tracking-widest">المزامنة سحابياً مفعلة</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
            <h3 className="text-xs font-black text-primary flex items-center gap-2 px-1">
                <User className="h-4 w-4" /> 1. معلوماتك الشخصية
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black pr-1 text-muted-foreground">اسم العنوان (مثل: المنزل)</Label>
                    <Input
                        name="name"
                        placeholder="المنزل، العمل..."
                        value={address.name}
                        onChange={handleChange}
                        className="h-14 rounded-2xl font-bold bg-muted/20 border-none shadow-inner"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black pr-1 text-muted-foreground">رقم الهاتف للتواصل</Label>
                    <Input
                        name="phone"
                        type="tel"
                        dir="ltr"
                        placeholder="07XXXXXXXX"
                        value={address.phone}
                        onChange={handleChange}
                        className="h-14 rounded-2xl font-bold bg-muted/20 border-none shadow-inner"
                        required
                    />
                </div>
            </div>
        </div>

        <Separator className="opacity-50" />

        <div className="space-y-4">
            <h3 className="text-xs font-black text-primary flex items-center gap-2 px-1">
                <Navigation className="h-4 w-4" /> 2. الموقع الدقيق (GPS)
            </h3>
            <button
                type="button"
                className={`w-full py-8 flex flex-col items-center justify-center gap-2 border-4 border-dashed rounded-[3rem] transition-all active:scale-95 ${address.latitude !== 0 ? 'border-green-500 bg-green-50 shadow-inner' : 'border-primary/30 bg-card hover:bg-primary/5 shadow-sm'}`}
                onClick={handleFetchLocation}
                disabled={isFetchingLocation}
            >
                {isFetchingLocation ? (
                    <><Loader2 className="animate-spin h-10 w-10 text-primary" /> <span className="font-black text-primary text-base">جارِ المزامنة مع القمر الصناعي...</span></>
                ) : address.latitude !== 0 ? (
                    <><CheckCircle2 className="h-10 w-10 text-green-500 animate-in zoom-in" /> <span className="font-black text-green-600 text-base">تم تثبيت موقعك بنجاح ✅</span></>
                ) : (
                    <><MapPin className="h-10 w-10 text-primary" /> <span className="font-black text-slate-700 text-base">اضغط لتحديد الموقع الجغرافي</span></>
                )}
            </button>
        </div>

        <div className="space-y-4">
            <h3 className="text-xs font-black text-primary flex items-center gap-2 px-1">
                <FileText className="h-4 w-4" /> 3. ملاحظات إضافية
            </h3>
            <Textarea
                name="details"
                placeholder="أقرب نقطة دالة، رقم الزقاق، أو أي تفاصيل تساعد السائق..."
                value={address.details}
                onChange={handleChange}
                className="rounded-[1.8rem] min-h-[120px] font-bold shadow-inner bg-muted/20 border-none p-5 focus-visible:ring-primary/50"
            />
        </div>

        <Button type="submit" className="w-full h-20 rounded-[2.5rem] text-2xl font-black shadow-2xl shadow-primary/30 transition-all active:scale-95" disabled={address.latitude === 0 || isSaving}>
          {isSaving ? <Loader2 className="animate-spin h-6 w-6 mr-2" /> : "حفظ البيانات سحابياً"}
        </Button>
      </form>
    </div>
  );
}