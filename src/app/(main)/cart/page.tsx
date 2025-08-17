
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

export default function CartPage() {
  
  // Since auth is removed, the cart is always empty.
  return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center p-4">
          <ShoppingBag className="h-24 w-24 text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-bold">سلّتك فارغة!</h2>
          <p className="text-muted-foreground mt-2">تم تبسيط التطبيق. الطلب غير ممكن في الوقت الحالي.</p>
          <Button asChild className="mt-6">
              <Link href="/home">تصفح المنتجات</Link>
          </Button>
      </div>
  )
}
