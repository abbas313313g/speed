
"use client";

import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Store, Banknote, Bike, Trash2, Loader2, XCircle } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { db } from '@/lib/firebase';
import { writeBatch, doc, increment, collection, query, where, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import type { WithdrawRequest } from '@/lib/types';

export default function AdminWithdrawalsPage({ branchId }: { branchId: string }) {
    const { requests, isLoading, updateRequestStatus, deleteWithdrawalRequest } = useWithdrawals(branchId);
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary text-xl">جاري جلب طلبات السحب السحابية...</div>;

    const handleCompleteSettlement = async (req: WithdrawRequest) => {
        setIsProcessing(req.id);
        try {
            const batch = writeBatch(db);
            const now = new Date().toISOString();
            
            // 1. تحديث حالة الطلب السحابي
            batch.update(doc(db, "withdrawals", req.id), { status: 'completed' });

            // 2. الخصم الحقيقي من الخزنة السحابية وتحديث وسم الطلبات
            if (req.type === 'restaurant') {
                batch.update(doc(db, "restaurants", req.targetId), { 
                    walletBalance: increment(-(req.amount || 0)),
                    lastSettleAt: now
                });
                
                // وسم الطلبات كمدفوعة
                const q = query(collection(db, "orders"), where("restaurant.id", "==", req.targetId), where("status", "==", "delivered"), where("isPaid", "==", false));
                const snap = await getDocs(q);
                snap.forEach(d => batch.update(doc(db, "orders", d.id), { isPaid: true }));
                
            } else {
                batch.update(doc(db, "deliveryWorkers", req.targetId), { 
                    walletBalance: increment(-(req.amount || 0)),
                    lastProfitSettleAt: now
                });

                // وسم الطلبات كمدفوعة أرباح
                const q = query(collection(db, "orders"), where("deliveryWorkerId", "==", req.targetId), where("status", "==", "delivered"), where("isFeePaid", "==", false));
                const snap = await getDocs(q);
                snap.forEach(d => batch.update(doc(db, "orders", d.id), { isFeePaid: true }));
            }

            await batch.commit();
            toast({ title: "تم تسليم المبلغ وخصمه من المحفظة السحابية ✅" });
        } catch (e) {
            console.error("Settlement Error:", e);
            toast({ title: "فشل إكمال التسوية", variant: "destructive" });
        } finally {
            setIsProcessing(null);
        }
    };

    const handleRejectSettlement = async (id: string) => {
        setIsProcessing(id);
        try {
            await updateRequestStatus(id, 'rejected');
            toast({ title: "تم رفض طلب السحب." });
        } catch (e) {} finally {
            setIsProcessing(null);
        }
    }

    const storeRequests = requests.filter(r => r.type === 'restaurant');
    const workerRequests = requests.filter(r => r.type === 'delivery');

    const renderTable = (list: typeof requests) => (
        <Table>
            <TableHeader className="bg-muted/50 h-16">
                <TableRow>
                    <TableHead className="font-black text-lg text-right">الجهة</TableHead>
                    <TableHead className="font-black text-lg text-left">المبلغ المطلوب</TableHead>
                    <TableHead className="font-black text-center">إجراء</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {list.map((req) => (
                    <TableRow key={req.id} className="hover:bg-primary/5 transition-colors h-24 border-b border-slate-50">
                        <TableCell className="font-bold">
                            <div className="flex items-center gap-3 justify-end">
                                <div className="text-right">
                                    <div className="font-black text-lg text-slate-800">{req.targetName}</div>
                                    <div className="text-[10px] text-muted-foreground font-bold italic">{new Date(req.requestedAt).toLocaleString('ar-IQ')}</div>
                                </div>
                                <div className={cn("p-3 rounded-2xl", req.type === 'restaurant' ? "bg-primary/10" : "bg-blue-100")}>
                                    {req.type === 'restaurant' ? <Store className="h-6 w-6 text-primary"/> : <Bike className="h-6 w-6 text-blue-600"/>}
                                </div>
                            </div>
                        </TableCell>
                        <TableCell className="font-black text-2xl text-primary text-left">
                            {formatCurrency(req.amount)}
                        </TableCell>
                        <TableCell>
                            <div className="flex justify-center gap-3">
                                {req.status === 'pending' ? (
                                    <>
                                        <Button 
                                            size="lg" 
                                            className="bg-green-600 hover:bg-green-700 h-12 rounded-2xl font-black px-6 shadow-lg shadow-green-100" 
                                            onClick={() => handleCompleteSettlement(req)}
                                            disabled={isProcessing === req.id}
                                        >
                                            {isProcessing === req.id ? <Loader2 className="animate-spin h-5 w-5 ml-2"/> : <CheckCircle2 className="ml-2 h-5 w-5"/>}
                                            تأكيد التسليم
                                        </Button>
                                        <Button size="lg" variant="ghost" className="text-destructive h-12 rounded-2xl font-bold px-4" onClick={() => handleRejectSettlement(req.id)} disabled={isProcessing === req.id}>
                                            <XCircle className="ml-1 h-4 w-4"/> رفض
                                        </Button>
                                    </>
                                ) : (
                                    <div className="flex items-center gap-3">
                                        <Badge className={cn("rounded-xl font-black text-sm h-10 px-6", req.status === 'completed' ? "bg-green-100 text-green-700 border-none" : "bg-red-100 text-red-700 border-none")}>
                                            {req.status === 'completed' ? 'تم الدفع ✅' : 'مرفوض ❌'}
                                        </Badge>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="text-destructive h-10 w-10 rounded-xl bg-destructive/5 hover:bg-destructive/10">
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent className="rounded-[2rem]">
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle className="text-right font-black">حذف سجل السحب؟</AlertDialogTitle>
                                                    <AlertDialogDescription className="text-right font-bold text-muted-foreground">
                                                        سيتم مسح هذا السجل نهائياً.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter className="flex-row gap-3">
                                                    <AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => deleteWithdrawalRequest(req.id)} className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl">نعم، حذف السجل</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                )}
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-right h-full overflow-y-auto p-4">
            <header>
                <h1 className="text-4xl font-black text-primary italic">طلبات تسوية الحسابات</h1>
                <p className="text-muted-foreground font-bold">الخصم يتم من المحفظة السحابية الدائمة فور التأكيد.</p>
            </header>

            <Tabs defaultValue="stores" className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-16 rounded-2xl bg-muted/40 p-2">
                    <TabsTrigger value="stores" className="rounded-xl font-black text-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-white">
                        <Store className="h-5 w-5"/> طلبات المتاجر ({storeRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="workers" className="rounded-xl font-black text-lg gap-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Bike className="h-5 w-5"/> طلبات المناديب ({workerRequests.length})
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="stores" className="mt-6">
                    {storeRequests.length > 0 ? (
                        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">{renderTable(storeRequests)}</Card>
                    ) : (
                        <div className="p-24 text-center space-y-4 bg-white rounded-[3rem] border-4 border-dashed">
                            <h2 className="text-2xl font-black text-slate-400">لا توجد طلبات سحب معلقة</h2>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="workers" className="mt-6">
                    {workerRequests.length > 0 ? (
                        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">{renderTable(workerRequests)}</Card>
                    ) : (
                        <div className="p-24 text-center space-y-4 bg-white rounded-[3rem] border-4 border-dashed">
                            <h2 className="text-2xl font-black text-slate-400">لا توجد طلبات سحب معلقة</h2>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
