
"use client";

import { useMemo } from 'react';
import { useProducts } from '@/hooks/useProducts';
import { useRestaurants } from '@/hooks/useRestaurants';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { CheckCircle, XCircle, Clock, Store, Package } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';

export default function AdminApprovalsPage({ branchId }: { branchId: string }) {
  const { products, approveProduct, deleteProduct, isLoading: pLoading } = useProducts(branchId, undefined, 500, undefined, '', true);
  const { restaurants, isLoading: rLoading } = useRestaurants(branchId);

  const pendingProducts = useMemo(() => {
    return products.filter(p => p.status === 'pending' && p.branchId === branchId);
  }, [products, branchId]);

  const isLoading = pLoading || rLoading;

  if (isLoading) return <div className="p-20 text-center animate-pulse font-black text-primary">جارِ تدقيق الوجبات الجديدة...</div>;

  return (
    <div className="space-y-8 text-right" dir="rtl">
      <header>
        <h1 className="text-4xl font-black text-primary italic leading-none">مراجعة المنيو</h1>
        <p className="text-muted-foreground font-bold mt-1">طلبات التحديث الجديدة الخاصة بفرعك الحالي فقط.</p>
      </header>

      {pendingProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-40 opacity-40 space-y-4">
            <CheckCircle className="h-24 w-24 text-green-500" />
            <h2 className="text-2xl font-black">الكل موافق عليه ✅</h2>
            <p className="font-bold text-sm text-center">لا توجد طلبات معلقة من المتاجر لهذا الفرع.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {pendingProducts.map(p => {
                const store = restaurants.find(r => r.id === p.restaurantId);
                return (
                    <Card key={p.id} className="rounded-[2.5rem] overflow-hidden border-none shadow-xl bg-white hover:shadow-2xl transition-all">
                        <div className="relative aspect-video">
                             <Image src={p.image || 'https://placehold.co/600x400.png'} fill className="object-cover" alt={p.name} unoptimized={true} priority={true} loading="eager" />
                             <div className="absolute top-4 left-4 flex gap-2">
                                <Badge className="bg-orange-500 text-white font-black">بانتظار موافقتك</Badge>
                             </div>
                        </div>
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center flex-row-reverse">
                                <div className="flex items-center gap-2 text-primary bg-primary/5 px-3 py-1.5 rounded-xl">
                                    <span className="text-xs font-black truncate max-w-[120px]">{store?.name || 'متجر غير مسجل'}</span>
                                    <Store className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-1 text-muted-foreground text-[10px] font-bold">
                                    <span>#{p.id.substring(0,4)}</span>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-xl font-black truncate">{p.name}</h3>
                                <p className="text-xs text-muted-foreground font-bold mt-1 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                                    {p.description || 'هذه الوجبة تمت إضافتها حديثاً من قبل المتجر وبانتظار موافقة الإدارة للنشر.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 py-4 border-y border-dashed border-muted">
                                <div className="space-y-0.5">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase">سعر البيع</span>
                                    <p className="text-lg font-black text-primary">{formatCurrency(p.price)}</p>
                                </div>
                                <div className="space-y-0.5 text-left">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase text-left block">المخزن المتوفر</span>
                                    <p className="text-lg font-black flex items-center gap-2 justify-end">
                                        {p.stock}
                                        <Package className="h-4 w-4 text-slate-400"/>
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <Button 
                                    variant="outline" 
                                    className="rounded-2xl font-black text-destructive border-destructive/20 hover:bg-destructive/5 h-14 gap-2"
                                    onClick={() => deleteProduct(p.id)}
                                >
                                    <XCircle className="h-5 w-5" />
                                    رفض وحذف
                                </Button>
                                <Button 
                                    className="rounded-2xl font-black h-14 shadow-xl shadow-primary/20 gap-2 text-lg"
                                    onClick={() => approveProduct(p.id)}
                                >
                                    <CheckCircle className="h-6 w-6" />
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
