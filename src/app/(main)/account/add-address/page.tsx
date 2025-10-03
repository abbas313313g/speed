
"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/contexts/AppContext";
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
import { MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Address } from "@/lib/types";

export default function AddAddressPage() {
  const context = useContext(AppContext);
  const router = useRouter();
  const { toast } = useToast();
  const [address, setAddress] = useState<Omit<Address, "id">>({
    name: "",
    phone: "",
    deliveryZone: "",
    details: "",
    latitude: 0,
    longitude: 0,
  });
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);

  if (!context) return null;
  const { addAddress, deliveryZones } = context;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setAddress({ ...address, [e.target.name]: e.target.value });
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
          toast({ title: "تم تحديد الموقع بنجاح!" });
          setIsFetchingLocation(false);
        },
        () => {
          toast({
            title: "فشل تحديد الموقع",
            description: "الرجاء التأكد من تفعيل خدمة تحديد المواقع.",
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
    if (!address.name || !address.phone || !address.deliveryZone) {
      toast({
        title: "بيانات غير مكتملة",
        description: "الرجاء ملء جميع الحقول المطلوبة.",
        variant: "destructive",
      });
      return;
    }
    addAddress(address);
    toast({ title: "تم حفظ العنوان بنجاح!" });
    router.push("/account");
  };

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">إضافة عنوان جديد</h1>
      </header>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">اسم العنوان (مثال: المنزل، العمل)</Label>
          <Input
            id="name"
            name="name"
            value={address.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">رقم الهاتف</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={address.phone}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <Label htmlFor="deliveryZone">منطقة التوصيل</Label>
          <Select onValueChange={handleZoneChange} required>
            <SelectTrigger id="deliveryZone">
              <SelectValue placeholder="اختر منطقة..." />
            </SelectTrigger>
            <SelectContent>
              {deliveryZones.map((zone) => (
                <SelectItem key={zone.id} value={zone.name}>
                  {zone.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>تحديد الموقع على الخريطة</Label>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleFetchLocation}
            disabled={isFetchingLocation}
          >
            <MapPin className="ml-2 h-4 w-4" />
            {isFetchingLocation
              ? "جارِ تحديد الموقع..."
              : "تحديد الموقع الحالي"}
          </Button>
          {address.latitude && (
            <p className="text-sm text-green-600 mt-2">
              تم تحديد الموقع بنجاح.
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="details">
            تفاصيل إضافية (اختياري - مثال: أقرب نقطة دالة، رقم الشقة)
          </Label>
          <Textarea
            id="details"
            name="details"
            value={address.details}
            onChange={handleChange}
          />
        </div>
        <Button type="submit" className="w-full">
          حفظ العنوان
        </Button>
      </form>
    </div>
  );
}
