
"use client";

import { useContext, useState, FormEvent, useEffect } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShoppingCart, KeyRound, Phone, User, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deliveryZones } from "@/lib/mock-data";
import type { Address, DeliveryZone } from "@/lib/types";

export default function LoginPage() {
  const [loginPhone, setLoginPhone] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [deliveryZoneName, setDeliveryZoneName] = useState("");
  const [address, setAddress] = useState<Omit<Address, 'id' | 'name'> | null>(null);
  
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [isSubmittingSignup, setIsSubmittingSignup] = useState(false);

  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  
  const context = useContext(AppContext);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // If the user is already logged in, redirect them from the login page.
    if (!context?.isAuthLoading && context?.firebaseUser) {
        router.replace('/home');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router]);


  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!context) return;
    setIsSubmittingLogin(true);
    try {
        await context.loginWithPhone(loginPhone, loginPassword);
        // On success, the useEffect above will redirect to /home when the user state is updated.
    } catch (error) {
        // Error toast is handled inside the context
    } finally {
        setIsSubmittingLogin(false);
    }
  }

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

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (!context) return;
    
    const selectedZone = deliveryZones.find(z => z.name === deliveryZoneName);
    if (!selectedZone || !address) {
      toast({ title: "خطأ", description: "الرجاء تعبئة جميع الحقول وتحديد الموقع.", variant: "destructive" });
      return;
    }
    
    setIsSubmittingSignup(true);
    try {
        await context.signupWithPhone(signupPhone, signupPassword, signupName, selectedZone, address);
        // On success, the onAuthStateChanged listener will update the user state,
        // and the useEffect will redirect to /home.
    } catch (error) {
        // Error is handled in the context function
    } finally {
        setIsSubmittingSignup(false);
    }
  }

  const isSignupDisabled = isSubmittingSignup || locationStatus !== 'success' || !signupName || !deliveryZoneName || !signupPhone || !signupPassword;

  // Show a loading screen only while actively submitting, not while waiting for auth state.
  if (context?.isAuthLoading && !isSubmittingLogin && !isSubmittingSignup) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
            <ShoppingCart className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-3xl font-bold text-primary mt-2">Speed Shop</h1>
        </div>
        <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">تسجيل الدخول</TabsTrigger>
                <TabsTrigger value="signup">إنشاء حساب</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">مرحباً بعودتك</CardTitle>
                        <CardDescription>أدخل رقم هاتفك وكلمة المرور للمتابعة.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleLogin} className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="login-phone">رقم الهاتف</Label>
                                <div className="relative">
                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="login-phone" type="tel" placeholder="07xxxxxxxxx" required value={loginPhone} onChange={(e) => setLoginPhone(e.target.value)} className="pr-10" dir="ltr"/>
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="login-password">كلمة المرور</Label>
                                <div className="relative">
                                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="pr-10" dir="ltr"/>
                                </div>
                            </div>
                            <Button type="submit" className="w-full h-11 text-lg" disabled={isSubmittingLogin}>
                                {isSubmittingLogin ? <Loader2 className="h-6 w-6 animate-spin" /> : 'تسجيل الدخول'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>
            <TabsContent value="signup">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
                        <CardDescription>أدخل بياناتك للانضمام إلينا.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <form onSubmit={handleSignup} className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="signup-name">الاسم الكامل</Label>
                                <div className="relative">
                                    <User className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="signup-name" type="text" placeholder="مثال: علي محمد" required value={signupName} onChange={(e) => setSignupName(e.target.value)} className="pr-10" />
                                </div>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="signup-phone">رقم الهاتف</Label>
                                <div className="relative">
                                    <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="signup-phone" type="tel" placeholder="07xxxxxxxxx" required value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)} className="pr-10" dir="ltr"/>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="signup-password">كلمة المرور</Label>
                                <div className="relative">
                                    <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                    <Input id="signup-password" type="password" required value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} className="pr-10" dir="ltr"/>
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
                            <Button type="submit" className="w-full h-11 text-lg" disabled={isSignupDisabled}>
                                {isSubmittingSignup ? <Loader2 className="h-6 w-6 animate-spin" /> : 'إنشاء حساب'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
