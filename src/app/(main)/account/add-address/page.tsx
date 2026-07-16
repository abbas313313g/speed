
"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@/lib/types";
import { useAddresses } from "@/hooks/useAddresses";
import { useDeliveryZones } from "@/hooks/useDeliveryZones";
import { useBranches } from "@/hooks/useBranches";
import { Separator } from "@/components/ui/separator";

export default function AddAddressPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { addAddress } = useAddresses();
  const { deliveryZones } = useDeliveryZones();
  const { branches } = useBranches();
  
  const [address, setAddress] = useState<Omit<Address, "id">>({
    name: "",
    phone: "",
    deliveryZone: "",
    details: "",
    latitude: 0,
    longitude: 0,
    branchId: ""
  });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  // تصفية المناطق بناءً على الفرع المختار لضمان دقة الاختيار
  const filteredZones = useMemo(() => {
    if (!address.branchId) return [];
    return deliveryZones.filter(z => z.branchId === address.branchId);
  }, [address.branchId, deliveryZones]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
  };

  const handleBranchChange = (value: string) => {
    setAddress({ ...address, branchId: value, deliveryZone: "" });
  };

  const handleZoneChange = (value: string) => {
    setAddress({ ...address, deliveryZone: value });
  };

  const handleFetchLocation = () => {
    setIsFetchingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAddress({
            ...address,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          toast({ title: "تم تحديد إحداثياتك بدقة 🛰️" });
          setIsFetchingLocation(false);
        },
        () => {
          toast({
            title: "فشل تحديد الموقع",
            description: "الرجاء التأكد من تفعيل خدمة تحديد المواقع في هاتفك.",
            variant: "destructive",
          });
          setIsFetchingLocation(false);
        }
      );
    } else {
      toast({
        title: "غير مدعوم",
        description: "متصفحك لا يدعم خدمة تحديد المواقع.",
        variant: "destructive",
      });
      setIsFetchingLocation(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.name || !address.phone || !address.branchId || !address.deliveryZone) {
      toast({
        title: "بيانات غير مكتملة",
        description: "الرجاء ملء جميع الحقول المطلوبة.",
        variant: "destructive",
      });
      return;
    }
    addAddress(address);
    toast({ title: "تم حفظ العنوان بنجاح!" });
    router.back();
  };

  return (
    <div className="p-6 space-y-8 bg-background h-full overflow-y-auto pb-32 text-right">
      <header className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-2xl bg-secondary text-primary">
            <ArrowRight className="h-6 w-6" />
        </Button>
        <div className="text-right">
            <h1 className="text-3xl font-black text-primary">إضافة عنوان جديد</h1>
            <p className="text-muted-foreground font-bold text-xs">أدخل تفاصيل التوصيل بدقة لضمان وصول طلبك.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="name" className="font-black text-[10px] uppercase text-muted-foreground mr-1">اسم العنوان</Label>
                <Input
                    id="name"
                    name="name"
                    placeholder="مثلاً: المنزل"
                    value={address.name}
                    onChange={handleChange}
                    className="h-12 rounded-xl font-bold shadow-sm"
                    required
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="phone" className="font-black text-[10px] uppercase text-muted-foreground mr-1">رقم الهاتف</Label>
                <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    dir="ltr"
                    placeholder="07XXXXXXXX"
                    value={address.phone}
                    onChange={handleChange}
                    className="h-12 rounded-xl font-bold shadow-sm"
                    required
                />
            </div>
        </div>

        <Separator />

        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="font-black text-primary pr-1">1. اختر المدينة (الفرع)</Label>
                <Select value={address.branchId} onValueChange={handleBranchChange} required>
                    <SelectTrigger className="h-14 rounded-2xl text-lg font-black border-2 border-primary/20 bg-primary/5">
                        <SelectValue placeholder="اختر مدينتك..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                        <SelectItem value="main" className="font-bold">الإدارة الرئيسية (بابل)</SelectItem>
                        {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id} className="font-bold">
                                {branch.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {address.branchId && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <Label className="font-black text-primary pr-1">2. اختر منطقتك / الحي</Label>
                    <Select value={address.deliveryZone} onValueChange={handleZoneChange} required>
                        <SelectTrigger className="h-14 rounded-2xl text-lg font-black border-2 border-primary/20">
                            <SelectValue placeholder="اختر الحي السكني..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            {filteredZones.map((zone) => (
                                <SelectItem key={zone.id} value={zone.name} className="font-bold">
                                    {zone.name}
                                </SelectItem>
                            ))}
                            {filteredZones.length === 0 && <div className="p-4 text-center text-xs font-bold italic">لا توجد مناطق مضافة لهذا الفرع حالياً.</div>}
                        </SelectContent>
                    </Select>
                </div>
            )}
        </div>

        <div className="pt-2">
            <button
                type="button"
                className={`w-full py-6 flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-[2.5rem] transition-all ${address.latitude !== 0 ? 'border-green-500 bg-green-50 shadow-inner' : 'border-primary/40 bg-card hover:bg-primary/5'}`}
                onClick={handleFetchLocation}
                disabled={isFetchingLocation}
            >
                {isFetchingLocation ? (
                    <><Loader2 className="animate-spin h-8 w-8 text-primary" /> <span className="font-black text-primary text-sm">جارِ الاتصال بالأقمار الصناعية...</span></>
                ) : address.latitude !== 0 ? (
                    <><CheckCircle2 className="h-8 w-8 text-green-500" /> <span className="font-black text-green-600 text-sm">تم تحديد موقعك الجغرافي بنجاح ✅</span></>
                ) : (
                    <><MapPin className="h-8 w-8 text-primary" /> <span className="font-black text-primary text-sm">اضغط لتأكيد موقعك الحالي على الخريطة</span></>
                )}
            </button>
        </div>

        <div className="space-y-2">
            <Label htmlFor="details" className="font-black text-[10px] uppercase text-muted-foreground mr-1">تفاصيل إضافية (اختياري)</Label>
            <Textarea
                id="details"
                name="details"
                placeholder="أقرب نقطة دالة، رقم الشقة، أو أي تعليمات أخرى..."
                value={address.details}
                onChange={handleChange}
                className="rounded-2xl min-h-[100px] font-bold shadow-sm"
            />
        </div>

        <Button type="submit" className="w-full h-16 rounded-[2rem] text-xl font-black shadow-xl shadow-primary/20 transition-all active:scale-95" disabled={!address.deliveryZone}>
          حفظ العنوان والبدء بالتسوق
        </Button>
      </form>
    </div>
  );
}
