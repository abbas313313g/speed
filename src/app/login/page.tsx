
"use client";

import { useState, useContext, useEffect, useRef } from "react";
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
import { Loader2, ShoppingCart, Phone, KeyRound } from "lucide-react";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";

// Define a type for the window object to include recaptchaVerifier
declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  
  const context = useContext(AppContext);
  const router = useRouter();
  const { toast } = useToast();

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (context && !context.isLoading && context.user) {
        if(context.user.isProfileComplete) {
            router.replace('/home');
        } else {
            router.replace('/complete-profile');
        }
    }
  }, [context?.isLoading, context?.user, router]);
  
  const setupRecaptcha = () => {
    if (!recaptchaContainerRef.current) return;
    
    // Ensure it's only created once
    if (window.recaptchaVerifier) {
       window.recaptchaVerifier.clear();
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
      'size': 'invisible',
      'callback': (response: any) => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
        // This callback is for invisible reCAPTCHA
      },
      'expired-callback': () => {
        // Response expired. Ask user to solve reCAPTCHA again.
        toast({ title: "انتهت صلاحية التحقق، الرجاء المحاولة مرة أخرى", variant: "destructive" });
        setLoading(false);
      }
    });
  }
  
  const onSendOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading) return;
      setLoading(true);
      
      try {
          setupRecaptcha();
          const appVerifier = window.recaptchaVerifier!;
          // Clean the phone number by removing all non-digit characters
          const cleanedPhone = phone.replace(/\D/g, '');
          const fullPhoneNumber = `+964${cleanedPhone.replace(/^0/, '')}`;
          
          const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
          window.confirmationResult = confirmationResult;
          setStep('otp');
          toast({ title: "تم إرسال الرمز", description: "الرجاء إدخال الرمز الذي وصلك عبر رسالة SMS." });
      } catch (error: any) {
          console.error("OTP Send Error:", error);
          toast({ title: "فشل إرسال الرمز", description: `حدث خطأ ما. ${error.message}`, variant: "destructive" });
      } finally {
          setLoading(false);
      }
  };

  const onVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      if (loading || !window.confirmationResult) return;
      setLoading(true);

      try {
        await window.confirmationResult.confirm(otp);
        // onAuthStateChanged will handle the rest
        // It will detect the signed-in user and AppContext will redirect
      } catch (error: any) {
          console.error("OTP Verify Error:", error);
          toast({ title: "الرمز غير صحيح", description: "الرجاء التأكد من الرمز والمحاولة مرة أخرى.", variant: "destructive" });
          setLoading(false);
      }
  };


  if (context?.isLoading || context?.user) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
        <ShoppingCart className="h-16 w-16 animate-pulse text-primary" />
        <Loader2 className="mt-4 h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
            <ShoppingCart className="h-12 w-12 mx-auto text-primary" />
            <h1 className="text-3xl font-bold text-primary mt-2">Speed Shop</h1>
        </div>
        <Card>
            <CardHeader>
                <CardTitle className="text-2xl">
                    {step === 'phone' ? 'تسجيل الدخول أو إنشاء حساب' : 'تأكيد الرمز'}
                </CardTitle>
                <CardDescription>
                    {step === 'phone' 
                        ? 'أدخل رقم هاتفك للمتابعة. سيتم إرسال رمز تحقق.' 
                        : `تم إرسال رمز إلى رقمك ${phone}.`}
                </CardDescription>
            </CardHeader>
            {step === 'phone' && (
                 <form onSubmit={onSendOtp}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="phone">رقم الهاتف</Label>
                            <div className="relative">
                                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                id="phone"
                                type="tel"
                                placeholder="7xxxxxxxxx"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                dir="ltr"
                                className="text-left pr-10 tracking-widest"
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardContent>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            إرسال رمز التحقق
                        </Button>
                    </CardContent>
                </form>
            )}
            {step === 'otp' && (
                 <form onSubmit={onVerifyOtp}>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="otp">رمز التحقق</Label>
                            <div className="relative">
                                <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                                <Input
                                id="otp"
                                type="text"
                                placeholder="ادخل الرمز المكون من 6 أرقام"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                dir="ltr"
                                className="text-left pr-10 tracking-[0.5em]"
                                maxLength={6}
                                />
                            </div>
                        </div>
                    </CardContent>
                    <CardContent className="flex flex-col gap-4">
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            تأكيد ودخول
                        </Button>
                        <Button variant="link" onClick={() => setStep('phone')}>
                            تغيير رقم الهاتف
                        </Button>
                    </CardContent>
                </form>
            )}
        </Card>
      </div>
    </div>
  );
}
