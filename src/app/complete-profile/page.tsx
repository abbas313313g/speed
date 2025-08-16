"use client";

import { useState, useContext, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, MapPin } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deliveryZones } from "@/lib/mock-data";
import type { Address } from "@/lib/types";

export default function CompleteProfilePage() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();

  const [name, setName] = useState("");
  const [deliveryZoneName, setDeliveryZoneName] = useState("");
  const [address, setAddress] = useState<Omit<Address, 'id' | 'name'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');


  useEffect(() => {
    if (context && !context.isLoading) {
        if (!context.user) {
            router.replace('/login');
        } else {
             if (context.user.isProfileComplete) {
                router.replace('/home');
             } else {
                 // Pre-fill name if available from login
                setName(context.user.name);
             }
        }
    }
  }, [context, router]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
        toast({ title: "المتصفح لا يدعم تحديد الموقع", variant: "destructive" });
        setLocationStatus('error');
        return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            setAddress({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude
            });
            setLocationStatus('success');
            toast({ title: "تم تحديد موقعك بنجاح!" });
        },
        () => {
            toast({ title: "تم رفض صلاحية الوصول للموقع", description: "الرجاء السماح بالوصول للموقع لإكمال التسجيل.", variant: "destructive" });
            setLocationStatus('error');
        },
        { enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!context || !context.user) return;
    
    const selectedZone = deliveryZones.find(z => z.name === deliveryZoneName);
    if (!selectedZone) {
      toast({ title: "خطأ", description: "الرجاء اختيار منطقة التوصيل.", variant: "destructive" });
      return;
    }

    if (!address) {
        toast({ title: "خطأ", description: "الرجاء تحديد موقعك أولاً.", variant: "destructive" });
        return;
    }
    
    setLoading(true);
    const firstAddress: Address = {
        ...address,
        id: `address-${Date.now()}`,
        name: 'العنوان الأساسي'
    }

    try {
      await context.completeUserProfile({
        name: name || context.user.name,
        deliveryZone: selectedZone,
        addresses: [firstAddress],
      });
      // Redirect is handled by the context change in the main layout
    } catch (error: any) {
      toast({ title: "حدث خطأ", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
    <Card className="w-full max-w-md">
        <CardHeader>
        <CardTitle className="text-2xl">إكمال ملفك الشخصي</CardTitle>
        <CardDescription>
            مرحباً بك في Speed Shop! نحتاج بعض المعلومات الإضافية.
        </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <div className="relative">
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                    id="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pr-10"
                    />
                </div>
            </div>
            
            <div className="space-y-2">
                <Label htmlFor="deliveryZone">منطقة التوصيل</Label>
                <div className="relative">
                    <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Select onValueChange={setDeliveryZoneName} value={deliveryZoneName} required>
                        <SelectTrigger className="pr-10">
                            <SelectValue placeholder="اختر منطقتك" />
                        </SelectTrigger>
                        <SelectContent>
                            {deliveryZones.map(zone => (
                                <SelectItem key={zone.name} value={zone.name}>
                                    {zone.name} - {zone.fee} د.ع
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
             <div className="space-y-2">
                <Label>الموقع الجغرافي</Label>
                <Button type="button" variant="outline" className="w-full" onClick={handleGetLocation} disabled={locationStatus === 'loading'}>
                   {locationStatus === 'loading' && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                   {locationStatus === 'success' ? 'تم تحديد الموقع بنجاح' : 'تحديد الموقع على الخريطة (مطلوب)'}
                </Button>
                {locationStatus === 'error' && <p className="text-sm text-destructive">مشاركة موقعك مطلوب لإكمال التسجيل.</p>}
            </div>
        </CardContent>
        <CardContent>
            <Button type="submit" className="w-full" disabled={loading || locationStatus !== 'success' || !name || !deliveryZoneName}>
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            حفظ وبدء التسوق
            </Button>
        </CardContent>
        </form>
    </Card>
    </div>
  );
}
