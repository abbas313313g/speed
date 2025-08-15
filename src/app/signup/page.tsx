
"use client";

import { useState, useContext, FormEvent } from "react";
import Link from "next/link";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deliveryZones } from "@/lib/mock-data";
import type { DeliveryZone } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart } from "lucide-react";


export default function SignupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [zone, setZone] = useState<DeliveryZone | null>(null);
  const [loading, setLoading] = useState(false);
  const context = useContext(AppContext);
  const { toast } = useToast();

  const handleZoneChange = (zoneName: string) => {
    const selectedZone = deliveryZones.find(z => z.name === zoneName);
    setZone(selectedZone || null);
  };
  
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!context || !zone) {
        toast({
            title: "خطأ في الإدخال",
            description: "الرجاء تعبئة جميع الحقول واختيار منطقة.",
            variant: "destructive",
        });
        return;
    }
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
        context.signup({ name, phone, deliveryZone: zone });
        setLoading(false);
    }, 1000);
  };

  return (
     <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-md">
       <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <ShoppingCart className="h-12 w-12 mx-auto text-primary" />
          </Link>
          <h1 className="text-3xl font-bold text-primary mt-2">Speed Shop</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
            <CardDescription>
              املأ البيانات التالية للانضمام إلينا
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الثلاثي</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="مثال: علي محمد حسين"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="07..."
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zone">المنطقة</Label>
                 <Select onValueChange={handleZoneChange} required>
                    <SelectTrigger id="zone" className="w-full">
                        <SelectValue placeholder="اختر منطقتك" />
                    </SelectTrigger>
                    <SelectContent>
                        {deliveryZones.map((zone) => (
                        <SelectItem key={zone.name} value={zone.name}>
                            {zone.name}
                        </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                إنشاء حساب
              </Button>
               <p className="text-sm text-muted-foreground">
                لديك حساب بالفعل؟{" "}
                <Link href="/login" className="font-semibold text-primary hover:underline">
                  تسجيل الدخول
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
