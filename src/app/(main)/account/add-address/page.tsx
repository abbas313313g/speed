
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
import { MapPin, Loader2, CheckCircle2, ArrowRight, Building2 } from "lucide-react";
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

  // تصفية المناطق بناءً على الفرع المختار حصراً
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
          toast({ title: "تم تحديد إحداثياتك بنجاح 🛰️" });
          setIsFetchingLocation(false);
        },
        () => {
          toast({
            title: "فشل تحديد الموقع",
            description: "يرجى تفعيل الـ GPS وإعطاء الإذن للمتصفح.",
            variant: "destructive",
          });
          setIsFetchingLocation(false);
        }
      );
    } else {
      setIsFetchingLocation(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.name || !address.phone || !address.branchId || !address.deliveryZone) {
      toast({
        title: "بيانات غير مكتملة",
        description: "يرجى اختيار المدينة والمنطقة أولاً.",
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
            <h1 className="text-2xl font-black text-primary leading-none">إضافة عنوان جديد</h1>
            <p className="text-muted-foreground font-bold text-[10px] mt-1">يرجى تحديد المدينة أولاً ثم الحي.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
                <Label className="text-[10px] font-black pr-1 uppercase text-muted-foreground">اسم العنوان</Label>
                <Input
                    name="name"
                    placeholder="المنزل، العمل..."
                    value={address.name}
                    onChange={handleChange}
                    className="h-12 rounded-xl font-bold shadow-sm"
                    required
                />
            </div>
            <div className="space-y-1">
                <Label className="text-[10px] font-black pr-1 uppercase text-muted-foreground">رقم الهاتف</Label>
                <Input
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

        <Separator className="opacity-50" />

        <div className="space-y-4 bg-primary/5 p-4 rounded-[2rem] border-2 border-dashed border-primary/20">
            <div className="space-y-1">
                <Label className="text-[10px] font-black text-primary pr-1">1. اختر المدينة (الفرع المسؤل)</Label>
                <Select value={address.branchId} onValueChange={handleBranchChange} required>
                    <SelectTrigger className="h-14 rounded-2xl text-lg font-black border-2 border-primary/20 bg-white">
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
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                    <Label className="text-[10px] font-black text-primary pr-1">2. اختر منطقتك / الحي</Label>
                    <Select value={address.deliveryZone} onValueChange={handleZoneChange} required>
                        <SelectTrigger className="h-14 rounded-2xl text-lg font-black border-2 border-primary/20 bg-white">
                            <SelectValue placeholder="اختر الحي السكني..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            {filteredZones.map((zone) => (
                                <SelectItem key={zone.id} value={zone.name} className="font-bold">
                                    {zone.name}
                                </SelectItem>
                            ))}
                            {filteredZones.length === 0 && <div className="p-4 text-center text-[10px] font-bold italic">لا توجد مناطق مضافة لهذا الفرع.</div>}
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
                    <><Loader2 className="animate-spin h-8 w-8 text-primary" /> <span className="font-black text-primary text-sm">جارِ تحديد الموقع...</span></>
                ) : address.latitude !== 0 ? (
                    <><CheckCircle2 className="h-8 w-8 text-green-500" /> <span className="font-black text-green-600 text-sm">تم تحديد الموقع بنجاح ✅</span></>
                ) : (
                    <><MapPin className="h-8 w-8 text-primary" /> <span className="font-black text-primary text-sm">اضغط لتحديد موقعك على الخريطة</span></>
                )}
            </button>
        </div>

        <div className="space-y-1">
            <Label className="text-[10px] font-black pr-1 uppercase text-muted-foreground">تفاصيل إضافية (اختياري)</Label>
            <Textarea
                name="details"
                placeholder="أقرب نقطة دالة، رقم الزقاق..."
                value={address.details}
                onChange={handleChange}
                className="rounded-2xl min-h-[100px] font-bold shadow-sm"
            />
        </div>

        <Button type="submit" className="w-full h-16 rounded-[2rem] text-xl font-black shadow-xl shadow-primary/20 transition-all active:scale-95" disabled={!address.deliveryZone || address.latitude === 0}>
          حفظ العنوان والبدء بالتسوق
        </Button>
      </form>
    </div>
  );
}
