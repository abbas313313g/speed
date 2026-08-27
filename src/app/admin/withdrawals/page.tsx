
"use client";

import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Store, Banknote, AlertCircle } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export default function AdminWithdrawalsPage({ branchId }: { branchId: string }) {
    const { requests, isLoading, updateRequestStatus } = useWithdrawals(branchId);

    if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary text-xl">جاري جلب طلبات تسوية الحسابات...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-right">
            <header>
                <h1 className="text-4xl font-black text-primary italic">سحب أرصدة المتاجر</h1>
                <p className="text-muted-foreground font-bold">إدارة عمليات تسوية المستحقات النقدية للمتاجر المتعاقدة في فرعك.</p>
            </header>

            <div className="grid gap-6">
                {requests.length > 0 ? (
                    <Card className="rounded-[2rem] border-none shadow-2xl overflow-hidden bg-white">
                        <Table>
                            <TableHeader className="bg-muted/50 h-16">
                                <TableRow>
                                    <TableHead className="font-black text-lg">المتجر</TableHead>
                                    <TableHead className="font-black text-lg">التفاصيل المالية</TableHead>
                                    <TableHead className="font-black text-lg">الصافي للدفع</TableHead>
                                    <TableHead className="font-black text-lg text-center">الإجراء</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests.map((req) => (
                                    <TableRow key={req.id} className="hover:bg-primary/5 transition-colors h-24 border-b border-slate-50">
                                        <TableCell className="font-bold">
                                            <div className="flex items-center gap-3 justify-end">
                                                <div className="text-right">
                                                    <div className="font-black text-lg text-slate-800">{req.restaurantName}</div>
                                                    <div className="text-[10px] text-muted-foreground font-bold italic">{new Date(req.requestedAt).toLocaleString('ar-IQ')}</div>
                                                </div>
                                                <div className="p-3 bg-primary/10 rounded-2xl"><Store className="h-6 w-6 text-primary"/></div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1.5 text-xs font-bold text-slate-600">
                                                <div className="flex justify-between gap-4"><span>{formatCurrency(req.amount)}</span><span>إجمالي المبيعات:</span></div>
                                                <div className="flex justify-between gap-4 text-destructive/70"><span>{formatCurrency(req.commissionAmount || 0)}</span><span>عمولة المنصة:</span></div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-black text-2xl text-primary text-left">
                                            {formatCurrency(req.netAmount || req.amount)}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-center gap-3">
                                                {req.status === 'pending' ? (
                                                    <>
                                                        <Button size="lg" className="bg-green-600 hover:bg-green-700 h-12 rounded-2xl font-black px-6 shadow-lg shadow-green-100" onClick={() => updateRequestStatus(req.id, 'completed')}>
                                                            <CheckCircle2 className="ml-2 h-5 w-5"/> تأكيد التسليم
                                                        </Button>
                                                        <Button size="lg" variant="ghost" className="text-destructive h-12 rounded-2xl font-bold px-4 border border-destructive/10" onClick={() => updateRequestStatus(req.id, 'rejected')}>
                                                            رفض
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <Badge className={cn("rounded-xl font-black text-sm h-10 px-6", req.status === 'completed' ? "bg-green-100 text-green-700 border-none" : "bg-red-100 text-red-700 border-none")}>
                                                        {req.status === 'completed' ? 'تمت التسوية ✅' : 'مرفوض ❌'}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                ) : (
                    <div className="p-24 text-center space-y-4 bg-white rounded-[3rem] border-4 border-dashed border-muted">
                        <Banknote className="h-20 w-20 mx-auto text-muted-foreground/30 animate-pulse" />
                        <h2 className="text-2xl font-black text-slate-400 italic">لا توجد طلبات سحب حالياً</h2>
                        <p className="text-muted-foreground font-bold">عندما يطلب متجر سحب أرباحه، سيظهر هنا فوراً.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
