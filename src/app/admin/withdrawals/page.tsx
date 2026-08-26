
"use client";

import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Store, Banknote, Receipt, Landmark } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export default function AdminWithdrawalsPage({ branchId }: { branchId: string }) {
    const { requests, isLoading, updateRequestStatus } = useWithdrawals(branchId);

    if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ جلب طلبات السحب...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-right">
            <header>
                <h1 className="text-4xl font-black text-primary italic">طلبات سحب الأرصدة</h1>
                <p className="text-muted-foreground font-bold">مراجعة وتأكيد عمليات تسليم المبالغ النقدية للمتاجر.</p>
            </header>

            <div className="bg-white rounded-[2rem] border-none shadow-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-black">المتجر والفرع</TableHead>
                            <TableHead className="font-black">تفصيل المبلغ</TableHead>
                            <TableHead className="font-black">الصافي للدفع</TableHead>
                            <TableHead className="font-black text-center">الإجراء</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map((req) => (
                            <TableRow key={req.id} className="hover:bg-muted/20">
                                <TableCell className="font-bold">
                                    <div className="flex items-center gap-2 justify-end">
                                        <div className="text-right">
                                            <div>{req.restaurantName}</div>
                                            <div className="text-[10px] text-muted-foreground">{new Date(req.requestedAt).toLocaleString('ar-IQ')}</div>
                                        </div>
                                        <div className="p-2 bg-primary/10 rounded-lg"><Store className="h-4 w-4 text-primary"/></div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="space-y-1 text-xs font-bold text-muted-foreground">
                                        <div className="flex justify-between"><span>{formatCurrency(req.amount)}</span><span>إجمالي المبيعات:</span></div>
                                        <div className="flex justify-between text-destructive"><span>{formatCurrency(req.commissionAmount || 0)}</span><span>عمولة الشركة:</span></div>
                                    </div>
                                </TableCell>
                                <TableCell className="font-black text-xl text-primary text-left">
                                    {formatCurrency(req.netAmount || req.amount)}
                                </TableCell>
                                <TableCell>
                                    <div className="flex justify-center gap-2">
                                        {req.status === 'pending' ? (
                                            <>
                                                <Button size="sm" className="bg-green-600 hover:bg-green-700 h-10 rounded-xl font-black" onClick={() => updateRequestStatus(req.id, 'completed')}>
                                                    <CheckCircle2 className="ml-1 h-4 w-4"/> تم تسليم الكاش
                                                </Button>
                                                <Button size="sm" variant="ghost" className="text-destructive h-10 font-bold" onClick={() => updateRequestStatus(req.id, 'rejected')}>
                                                    رفض
                                                </Button>
                                            </>
                                        ) : (
                                            <Badge className={cn("rounded-lg font-black h-8 px-4", req.status === 'completed' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600")}>
                                                {req.status === 'completed' ? 'مكتمل' : 'مرفوض'}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {requests.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic font-bold">لا توجد طلبات سحب حالياً.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
