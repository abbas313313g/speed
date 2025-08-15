
"use client";

import { useState, useContext, FormEvent, useEffect } from "react";
import Link from "next/link";
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
import { Loader2, User, Phone, MapPin, KeyRound, ShoppingCart } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deliveryZones } from "@/lib/mock-data";
import type { Address } from "@/lib/types";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [deliveryZoneName, setDeliveryZoneName] = useState("");
  const [address, setAddress] = useState<Omit<Address, 'id' | 'name'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const context = useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (context && !context.isLoading && context.user) {
      router.replace('/home');
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
    if (!context) return;
    setLoading(true);

    const selectedZone = deliveryZones.find(z => z.name === deliveryZoneName);
    if (!selectedZone) {
      toast({ title: "خطأ", description: "الرجاء اختيار منطقة التوصيل.", variant: "destructive" });
      setLoading(false);
      return;
    }

    if (!address) {
        toast({ title: "خطأ", description: "الرجاء تحديد موقعك أولاً.", variant: "destructive" });
        setLoading(false);
        return;
    }

    const firstAddress: Address = {
        ...address,
        id: `address-${Date.now()}`,
        name: 'العنوان الأساسي'
    }

    try {
      await context.signup({
        name,
        phone,
        password,
        deliveryZone: selectedZone,
        addresses: [firstAddress],
      });
      
      toast({
          title: "تم إنشاء الحساب بنجاح!",
          description: "يمكنك الآن تسجيل الدخول.",
      });
      router.push('/login');
    } catch (error: any) {
      setLoading(false);
    }
  };

  if (context?.isLoading && !context.user) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
            <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
    <Card className="w-full max-w-md">
        <CardHeader>
        <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
        <CardDescription>
            لديك حساب بالفعل؟{" "}
            <Link href="/login" className="text-primary hover:underline">
            تسجيل الدخول
            </Link>
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
            <Label htmlFor="phone">رقم الهاتف</Label>
            <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    id="phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    dir="ltr"
                    className="text-left pr-10"
                />
            </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    dir="ltr"
                    className="text-left pr-10"
                />
                </div>
            </div>
            <div className="space-y-2">
            <Label htmlFor="deliveryZone">منطقة التوصيل</Label>
            <div className="relative">
                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Select onValueChange={setDeliveryZoneName} value={deliveryZoneName}>
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
                   {locationStatus === 'success' ? 'تم تحديد الموقع بنجاح' : 'تحديد الموقع على الخريطة'}
                </Button>
                {locationStatus === 'error' && <p className="text-sm text-destructive">مشاركة موقعك مطلوب لإكمال التسجيل.</p>}
            </div>
        </CardContent>
        <CardContent>
            <Button type="submit" className="w-full" disabled={loading || locationStatus !== 'success'}>
            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
            إنشاء حساب
            </Button>
        </CardContent>
        </form>
    </Card>
    </div>
  );
}
