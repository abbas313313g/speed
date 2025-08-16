
"use client";

import { useContext, useEffect, useState, useRef } from "react";
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
import { Loader2, ShoppingCart, KeyRound, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '@/lib/firebase';

declare global {
    interface Window {
        recaptchaVerifier?: RecaptchaVerifier;
        confirmationResult?: ConfirmationResult;
    }
}

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isSigningIn, setIsSigningIn] = useState(false);
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
    // Render only once
    if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
    }
    
    window.recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainerRef.current, {
        'size': 'invisible',
        'callback': () => {
           // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
    });
  }

  const onSendOtp = async () => {
      if (!phone.match(/^07[0-9]{9}$/)) {
          toast({ title: "رقم الهاتف غير صحيح", description: "الرجاء إدخال رقم هاتف عراقي صالح يبدأ بـ 07.", variant: "destructive" });
          return;
      }
      
      setIsSigningIn(true);
      try {
          setupRecaptcha();
          const appVerifier = window.recaptchaVerifier!;
          const cleanedPhone = phone.startsWith('0') ? phone.substring(1) : phone;
          const fullPhoneNumber = `+964${cleanedPhone}`;
          
          const confirmationResult = await signInWithPhoneNumber(auth, fullPhoneNumber, appVerifier);
          window.confirmationResult = confirmationResult;
          setStep('otp');
          toast({ title: "تم إرسال الرمز", description: "الرجاء إدخال الرمز الذي وصلك عبر رسالة SMS." });

      } catch (error: any) {
          console.error("OTP Send Error:", error);
          toast({ title: "فشل إرسال الرمز", description: "حدث خطأ ما. الرجاء التأكد من أنك قمت بتفعيل الفوترة في مشروع Firebase.", variant: "destructive" });
          if(window.recaptchaVerifier) {
            window.recaptchaVerifier.render().then((widgetId) => {
              // @ts-ignore
              window.grecaptcha.reset(widgetId);
            });
          }
      } finally {
          setIsSigningIn(false);
      }
  };
  
  const onVerifyOtp = async () => {
    if (otp.length !== 6) {
        toast({ title: "رمز التحقق غير صحيح", description: "الرجاء إدخال الرمز المكون من 6 أرقام.", variant: "destructive" });
        return;
    }
    
    setIsSigningIn(true);
    try {
        await window.confirmationResult?.confirm(otp);
        // onAuthStateChanged will handle the redirect
        toast({ title: "تم التحقق بنجاح!" });
    } catch (error) {
        console.error("OTP Verify Error:", error);
        toast({ title: "فشل التحقق", description: "الرمز الذي أدخلته غير صحيح أو انتهت صلاحيته.", variant: "destructive" });
    } finally {
        setIsSigningIn(false);
    }
  }


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
                    {step === 'phone' ? 'تسجيل الدخول أو إنشاء حساب' : 'أدخل رمز التحقق'}
                </CardTitle>
                <CardDescription>
                   {step === 'phone' 
                    ? 'أدخل رقم هاتفك للمتابعة. سيتم إرسال رمز تحقق عبر رسالة SMS.'
                    : `تم إرسال رمز إلى الرقم ${phone}. الرجاء إدخاله أدناه.`
                   }
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {step === 'phone' ? (
                     <div className="space-y-2">
                        <Label htmlFor="phone">رقم الهاتف</Label>
                        <div className="relative">
                            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="phone"
                                type="tel"
                                placeholder="07xxxxxxxxx"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                dir="ltr"
                                className="text-left pr-10 tracking-widest"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label htmlFor="otp">رمز التحقق (OTP)</Label>
                         <div className="relative">
                            <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input
                                id="otp"
                                type="text"
                                placeholder="xxxxxx"
                                required
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                dir="ltr"
                                className="text-center tracking-[0.5em] pr-10 font-mono"
                                maxLength={6}
                            />
                        </div>
                    </div>
                )}
               
                <Button 
                    variant="default" 
                    className="w-full h-11 text-lg" 
                    onClick={step === 'phone' ? onSendOtp : onVerifyOtp} 
                    disabled={isSigningIn}
                >
                    {isSigningIn ? (
                        <Loader2 className="ml-2 h-6 w-6 animate-spin" />
                    ) : (
                       <span>{step === 'phone' ? 'إرسال رمز التحقق' : 'تحقق من الرمز'}</span>
                    )}
                </Button>
                
                 {step === 'otp' && (
                    <Button variant="link" onClick={() => setStep('phone')}>
                        تغيير رقم الهاتف
                    </Button>
                 )}
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
