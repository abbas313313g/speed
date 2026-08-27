
"use client";

import { useWithdrawals } from '@/hooks/useWithdrawals';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Store, Banknote, Bike, UserCog, Landmark, Trash2 } from 'lucide-react';
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

export default function AdminWithdrawalsPage({ branchId }: { branchId: string }) {
    const { requests, isLoading, updateRequestStatus, deleteWithdrawalRequest } = useWithdrawals(branchId);

    if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary text-xl">جاري جلب طلبات تسوية الحسابات...</div>;

    const storeRequests = requests.filter(r => r.type === 'restaurant');
    const workerRequests = requests.filter(r => r.type === 'delivery');

    const renderTable = (list: typeof requests) => (
        <Table>
            <TableHeader className="bg-muted/50 h-16">
                <TableRow>
                    <TableHead className="font-black text-lg text-right">الجهة</TableHead>
                    <TableHead className="font-black text-lg text-right">التفاصيل المالية</TableHead>
                    <TableHead className="font-black text-lg text-left">الصافي للدفع</TableHead>
                    <TableHead className="font-black text-lg text-center">الإجراء</TableHead>
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
                        <TableCell>
                            <div className="space-y-1.5 text-xs font-bold text-slate-600">
                                {req.type === 'restaurant' ? (
                                    <>
                                        <div className="flex justify-between gap-4"><span>{formatCurrency(req.amount)}</span><span>إجمالي المبيعات:</span></div>
                                        <div className="flex justify-between gap-4 text-destructive/70"><span>{formatCurrency(req.commissionAmount || 0)}</span><span>عمولة المنصة:</span></div>
                                    </>
                                ) : (
                                    <div className="flex justify-between gap-4"><span>{formatCurrency(req.amount)}</span><span>أجور التوصيل الصافية:</span></div>
                                )}
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
                                    <div className="flex items-center gap-3">
                                        <Badge className={cn("rounded-xl font-black text-sm h-10 px-6", req.status === 'completed' ? "bg-green-100 text-green-700 border-none" : "bg-red-100 text-red-700 border-none")}>
                                            {req.status === 'completed' ? 'تمت التسوية ✅' : 'مرفوض ❌'}
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
                                                        سيتم مسح هذا السجل نهائياً من قاعدة البيانات. تأكد من أنك قمت بإنهاء الإجراء المالي.
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
        <div className="space-y-8 animate-in fade-in duration-500 text-right">
            <header>
                <h1 className="text-4xl font-black text-primary italic">طلبات تسوية الحسابات</h1>
                <p className="text-muted-foreground font-bold">إدارة عمليات دفع المستحقات النقدية للمتاجر والمناديب في فرعك.</p>
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
                        <div className="p-24 text-center space-y-4 bg-white rounded-[3rem] border-4 border-dashed border-muted">
                            <Landmark className="h-20 w-20 mx-auto text-muted-foreground/30" />
                            <h2 className="text-2xl font-black text-slate-400">لا توجد طلبات متاجر</h2>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="workers" className="mt-6">
                    {workerRequests.length > 0 ? (
                        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">{renderTable(workerRequests)}</Card>
                    ) : (
                        <div className="p-24 text-center space-y-4 bg-white rounded-[3rem] border-4 border-dashed border-muted">
                            <UserCog className="h-20 w-20 mx-auto text-muted-foreground/30" />
                            <h2 className="text-2xl font-black text-slate-400">لا توجد طلبات مناديب</h2>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
