
"use client";

import { useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useRestaurants } from '@/hooks/useRestaurants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, Store } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

export default function AdminApprovalsPage({ branchId }: { branchId: string }) {
  const { products, approveProduct, deleteProduct, isLoading: pLoading } = useProducts(branchId);
  const { restaurants, isLoading: rLoading } = useRestaurants(branchId);

  const pendingProducts = useMemo(() => {
    return products.filter(p => p.status === 'pending');
  }, [products]);

  const isLoading = pLoading || rLoading;

  if (isLoading) return <div className="p-8 text-center animate-pulse font-bold text-primary">جارِ تحميل طلبات الموافقة...</div>;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black text-primary">موافقات المنتجات</h1>
        <p className="text-muted-foreground font-bold">مراجعة التعديلات الخاصة بفرع "{branchId === 'main' ? 'الرئيسية' : branchId}" فقط.</p>
      </header>

      {pendingProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 opacity-40 space-y-4">
            <CheckCircle className="h-20 w-20 text-green-500" />
            <h2 className="text-2xl font-black">لا توجد طلبات معلقة</h2>
            <p className="font-bold text-sm text-center">تمت مراجعة كافة إضافات وتعديلات المتاجر في هذا الفرع.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingProducts.map(p => {
                const store = restaurants.find(r => r.id === p.restaurantId);
                return (
                    <Card key={p.id} className="rounded-[2rem] overflow-hidden border-none shadow-xl bg-white hover:shadow-2xl transition-all">
                        <div className="relative aspect-video">
                             <Image src={p.image || 'https://placehold.co/600x400.png'} fill className="object-cover" alt={p.name} unoptimized={true} priority={true} loading="eager" />
                             <Badge className="absolute top-4 right-4 bg-orange-500 text-white font-black">بانتظار المراجعة</Badge>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-center gap-2 text-primary">
                                <Store className="h-4 w-4" />
                                <span className="text-xs font-black">{store?.name || 'متجر غير معروف'}</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-black truncate">{p.name}</h3>
                                <p className="text-xs text-muted-foreground font-bold mt-1 line-clamp-2 min-h-[2.5rem]">{p.description || 'متاجر SPEED SHOP'}</p>
                            </div>
                            <div className="flex justify-between items-center py-3 border-y border-dashed border-muted">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-muted-foreground">السعر المطلوب</span>
                                    <span className="text-lg font-black text-primary">{formatCurrency(p.price)}</span>
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-bold text-muted-foreground text-left">المخزن</span>
                                    <span className="text-lg font-black">{p.stock}</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button 
                                    variant="outline" 
                                    className="rounded-xl font-black text-destructive border-destructive/20 hover:bg-destructive/5 h-12"
                                    onClick={() => deleteProduct(p.id)}
                                >
                                    <XCircle className="ml-2 h-5 w-5" />
                                    رفض
                                </Button>
                                <Button 
                                    className="rounded-xl font-black h-12 shadow-lg shadow-primary/20"
                                    onClick={() => approveProduct(p.id)}
                                >
                                    <CheckCircle className="ml-2 h-5 w-5" />
                                    قبول ونشر
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )
            })}
        </div>
      )}
    </div>
  );
}
