
"use client";

import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Wallet, Store } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export default function AdminWithdrawalsPage({ branchId }: { branchId: string }) {
    const { requests, isLoading, updateRequestStatus } = useWithdrawals(branchId);

    if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ جلب طلبات السحب...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-4xl font-black text-primary">طلبات سحب المتاجر</h1>
                <p className="text-muted-foreground font-bold">إدارة عمليات تسليم المبالغ النقدية لفرع: {branchId === 'main' ? 'المركزية' : branchId}</p>
            </header>

            <div className="bg-white rounded-[2rem] border-none shadow-xl overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="font-black">المتجر</TableHead>
                            <TableHead className="font-black">المبلغ المطلوب</TableHead>
                            <TableHead className="font-black">التاريخ</TableHead>
                            <TableHead className="font-black">الحالة</TableHead>
                            <TableHead className="font-black text-center">إجراء</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {requests.map((req) => (
                            <TableRow key={req.id} className="hover:bg-muted/20">
                                <TableCell className="font-bold flex items-center gap-2">
                                    <div className="p-2 bg-primary/10 rounded-lg"><Store className="h-4 w-4 text-primary"/></div>
                                    {req.restaurantName}
                                </TableCell>
                                <TableCell className="font-black text-lg text-primary">{formatCurrency(req.amount)}</TableCell>
                                <TableCell className="text-[10px] font-bold text-muted-foreground">{new Date(req.requestedAt).toLocaleString('ar-IQ')}</TableCell>
                                <TableCell>
                                    <Badge className={cn("rounded-lg font-black", 
                                        req.status === 'completed' ? "bg-green-50 text-green-600 border-none" : 
                                        req.status === 'rejected' ? "bg-red-50 text-red-600 border-none" : "bg-orange-50 text-orange-600 border-none"
                                    )}>
                                        {req.status === 'completed' ? 'تم التسليم' : req.status === 'rejected' ? 'مرفوض' : 'بانتظار الموافقة'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {req.status === 'pending' && (
                                        <div className="flex justify-center gap-2">
                                            <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 rounded-xl font-bold" onClick={() => updateRequestStatus(req.id, 'completed')}>
                                                <CheckCircle2 className="ml-1 h-4 w-4"/> تم الدفع
                                            </Button>
                                            <Button size="sm" variant="ghost" className="text-destructive h-9" onClick={() => updateRequestStatus(req.id, 'rejected')}>
                                                رفض
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                        {requests.length === 0 && <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground italic font-bold">لا توجد طلبات سحب حالياً.</TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
