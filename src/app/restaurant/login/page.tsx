
"use client";

import { useState, FormEvent, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { KeyRound, Loader2, Store } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useRestaurants } from '@/hooks/useRestaurants';


export default function RestaurantLoginPage() {
    const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
    const [loginCode, setLoginCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const router = useRouter();
    const { toast } = useToast();
    const { login } = useContext(RestaurantContext)!;
    const { restaurants } = useRestaurants();

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        if (!selectedRestaurantId || !loginCode) {
            toast({ title: "الرجاء اختيار المطعم وإدخال الرمز", variant: "destructive" });
            return;
        }
        setIsLoading(true);
        const success = await login(selectedRestaurantId, loginCode);
        if (success) {
            toast({ title: "تم تسجيل الدخول بنجاح" });
            router.push('/restaurant');
        } else {
            toast({ title: "الرمز غير صحيح", variant: "destructive" });
        }
        setIsLoading(false);
    };

    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-muted/40 p-4">
            <Card className="w-full max-w-sm">
                <form onSubmit={handleLogin}>
                    <CardHeader className="text-center">
                        <Store className="h-12 w-12 mx-auto text-primary" />
                        <CardTitle className="mt-4">بوابة المطاعم</CardTitle>
                        <CardDescription>الرجاء اختيار مطعمك وإدخال الرمز للدخول.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Select value={selectedRestaurantId} onValueChange={setSelectedRestaurantId} required>
                            <SelectTrigger>
                                <SelectValue placeholder="اختر مطعمك..." />
                            </SelectTrigger>
                            <SelectContent>
                                {restaurants.map(r => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                         <div className="relative">
                            <KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                            <Input 
                                type="password" 
                                placeholder="رمز الدخول" 
                                value={loginCode}
                                onChange={(e) => setLoginCode(e.target.value)}
                                className="pr-10"
                                dir="ltr"
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading || !selectedRestaurantId}>
                            {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                            دخول
                        </Button>
                    </CardContent>
                </form>
            </Card>
        </div>
    )
}
