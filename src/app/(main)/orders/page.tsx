
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';


export default function OrdersPage() {

    return (
        <div className="p-4 space-y-8">
            <header>
                <h1 className="text-3xl font-bold">متابعة طلباتك</h1>
                <p className="text-muted-foreground">تتبع طلباتك الحالية واطلع على طلباتك السابقة.</p>
            </header>
            
            <div className="text-center py-8 text-muted-foreground">
                <ShoppingBag className="h-16 w-16 mx-auto mb-2" />
                <p>تم تبسيط التطبيق. ميزات الطلبات معطلة حالياً.</p>
                <Button asChild className="mt-4">
                    <Link href="/home">
                        العودة للرئيسية
                    </Link>
                </Button>
            </div>
        </div>
    );
}
