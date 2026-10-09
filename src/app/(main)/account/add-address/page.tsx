
"use client";

import { useState, useContext } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Loader2, CheckCircle2, ArrowRight, User, Phone, FileText, Navigation, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@/lib/types";
import { useAddresses } from "@/hooks/useAddresses";
import { Separator } from "@/components/ui/separator";
import { AppContext } from "@/contexts/AppContext";
import Link from "next/link";

export default function AddAddressPage() {
  const router = useRouter();
  const { toast } = useToast();
  const context = useContext(AppContext);
  const { addAddress } = useAddresses();
  
  const [address, setAddress] = useState<Omit<Address, "id" | "userId">>({
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
                toast({ title: "تم تحديد موقعك بدقة عالية 🛰️" });
                setIsFetchingLocation(false);
            },
            (error) => {
                toast({ title: "يرجى تفعيل الموقع في إعدادات هاتفك بدقة عالية.", variant: "destructive" });
                setIsFetchingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    } else {
        toast({ title: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
        setIsFetchingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const phoneRegex = /^07[78]\d{8}$/;
    if (!phoneRegex.test(address.phone)) {
        toast({ 
            title: "رقم هاتف غير صحيح", 
            description: "يجب أن يبدأ الرقم بـ 077 أو 078 ويتكون من 11 رقماً.", 
            variant: "destructive" 
        });
        return;
    }

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
        await addAddress(address as any);
        if (context) context.setActiveTab(0);
        toast({ title: "تمت إضافة العنوان بنجاح! 🎉" });
    } catch (e) {
        toast({ title: "فشل الحفظ السحابي", variant: "destructive" });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-8 bg-[#f8fafc] dark:bg-slate-950 h-full overflow-y-auto pb-40 text-right animate-in fade-in slide-in-from-left-4 duration-500">
      <header className="flex items-center gap-4 flex-row-reverse">
        <Button variant="outline" size="icon" onClick={() => context?.setActiveTab(0)} className="rounded-2xl h-12 w-12 border-2 text-primary shadow-sm active:scale-75 transition-all">
            <ArrowRight className="h-6 w-6" />
        </Button>
        <div className="text-right flex-1">
            <h1 className="text-3xl font-black text-slate-800 dark:text-white leading-none tracking-tight">إضافة عنوان جديد</h1>
            <p className="text-muted-foreground font-bold text-[10px] mt-2 uppercase tracking-widest opacity-60">المزامنة مع الخريطة مفعلة</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-800 space-y-6">
            <div className="space-y-4">
                <h3 className="text-xs font-black text-primary flex items-center gap-2 px-1 justify-end">
                    ١. معلوماتك الشخصية <User className="h-4 w-4" />
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black pr-1 text-muted-foreground uppercase tracking-widest">اسم الموقع (مثل: منزل، عمل)</Label>
                        <Input
                            name="name"
                            placeholder="المنزل، العمل..."
                            value={address.name}
                            onChange={handleChange}
                            className="h-14 rounded-2xl font-bold bg-slate-50 dark:bg-slate-800 border-none shadow-inner text-right"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black pr-1 text-muted-foreground uppercase tracking-widest">رقم هاتف التواصل</Label>
                        <Input
                            name="phone"
                            type="tel"
                            dir="ltr"
                            placeholder="07XXXXXXXX"
                            value={address.phone}
                            onChange={handleChange}
                            className="h-14 rounded-2xl font-black bg-slate-50 dark:bg-slate-800 border-none shadow-inner text-center text-xl tracking-[0.2em]"
                            required
                        />
                        <p className="text-[9px] font-bold text-orange-600 text-center italic">* نقبل أرقام آسيا سيل أو زين فقط</p>
                    </div>
                </div>
            </div>

            <Separator className="opacity-10" />

            <div className="space-y-4">
                <h3 className="text-xs font-black text-primary flex items-center gap-2 px-1 justify-end">
                    ٢. تحديد الموقع الدقيق <Navigation className="h-4 w-4" />
                </h3>
                <button
                    type="button"
                    className={`w-full py-10 flex flex-col items-center justify-center gap-3 border-4 border-dashed rounded-[2.8rem] transition-all active:scale-95 ${address.latitude !== 0 ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'border-primary/20 bg-slate-50 dark:bg-slate-800 hover:bg-primary/5'}`}
                    onClick={handleFetchLocation}
                    disabled={isFetchingLocation}
                >
                    {isFetchingLocation ? (
                        <><Loader2 className="animate-spin h-12 w-12 text-primary" /> <span className="font-black text-primary text-sm">جارِ التقاط الإحداثيات...</span></>
                    ) : address.latitude !== 0 ? (
                        <><CheckCircle2 className="h-12 w-12 text-green-500 animate-in zoom-in" /> <span className="font-black text-green-600 text-sm">تم تثبيت الموقع بنجاح ✅</span></>
                    ) : (
                        <><MapPin className="h-12 w-12 text-primary" /> <span className="font-black text-slate-700 dark:text-slate-300 text-sm">اضغط لتحديد موقعك الحالي</span></>
                    )}
                </button>
            </div>

            <div className="space-y-4">
                <h3 className="text-xs font-black text-primary flex items-center gap-2 px-1 justify-end">
                    ٣. ملاحظات التوصيل <FileText className="h-4 w-4" />
                </h3>
                <Textarea
                    name="details"
                    placeholder="مثال: رقم الزقاق، أقرب نقطة دالة، أو أي تفاصيل تساعد السائق..."
                    value={address.details}
                    onChange={handleChange}
                    className="rounded-[1.8rem] min-h-[120px] font-bold shadow-inner bg-slate-50 dark:bg-slate-800 border-none p-5 focus-visible:ring-primary/30 text-right"
                />
            </div>
        </div>

        <div className="space-y-4 text-center">
            <div className="flex items-center justify-center gap-2 text-[10px] font-bold text-muted-foreground px-10 leading-relaxed">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <p>بمجرد الحفظ، أنت توافق على <button type="button" onClick={() => context?.setActiveTab(8)} className="text-primary border-b border-primary/20">سياسة الخصوصية</button> الخاصة بنا.</p>
            </div>
            
            <Button type="submit" className="w-full h-20 rounded-[2.5rem] text-2xl font-black shadow-2xl shadow-primary/30 transition-all active:scale-95" disabled={address.latitude === 0 || isSaving}>
            {isSaving ? <Loader2 className="animate-spin h-7 w-7 mr-2" /> : "حفظ العنوان والبدء"}
            </Button>
        </div>
      </form>
    </div>
  );
}
