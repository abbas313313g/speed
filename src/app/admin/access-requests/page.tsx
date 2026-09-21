
"use client";

import { useAdminAccess } from '@/hooks/useAdminAccess';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Trash2, Laptop, ShieldCheck, Clock, Fingerprint } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function AdminAccessPage({ branchId }: { branchId: string }) {
  const { accessList, isLoading, approveAccess, removeAccess } = useAdminAccess(branchId);

  if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary text-xl">جارِ جلب سجلات الوصول...</div>;

  // عرض طلبات هذا الفرع فقط
  const branchList = accessList.filter(a => a.branchId === branchId);
  const pending = branchList.filter(a => a.status === 'pending');
  const approved = branchList.filter(a => a.status === 'approved');

  return (
    <div className="space-y-8 text-right">
      <header>
        <h1 className="text-4xl font-black text-primary italic">تراخيص الأجهزة (IP)</h1>
        <p className="text-muted-foreground font-bold">إدارة الأجهزة المسموح لها بالدخول للوحة التحكم بدون قيود.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-black flex items-center gap-2 px-1 text-orange-500 justify-end">
            طلبات بانتظار الموافقة ({pending.length})
            <Clock className="h-5 w-5"/>
        </h2>
        <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="font-black text-right">ID الجهاز</TableHead>
                        <TableHead className="font-black text-right">معلومات الجهاز</TableHead>
                        <TableHead className="font-black text-right">تاريخ الطلب</TableHead>
                        <TableHead className="font-black text-center">إجراء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pending.map((req) => (
                        <TableRow key={req.id}>
                            <TableCell>
                                <Badge variant="outline" className="font-black text-primary text-sm px-3 bg-primary/5">
                                    <Fingerprint className="h-3 w-3 ml-1"/> {req.shortId || '---'}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-bold text-slate-700">
                                <div className="flex items-center gap-2 justify-end">
                                    <span>{req.deviceName}</span>
                                    <Laptop className="h-4 w-4 text-muted-foreground"/>
                                </div>
                            </TableCell>
                            <TableCell className="text-[10px] font-bold text-muted-foreground">{new Date(req.requestedAt).toLocaleString('ar-IQ')}</TableCell>
                            <TableCell>
                                <div className="flex justify-center gap-2">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 h-9 rounded-xl font-black px-4" onClick={() => approveAccess(req.id)}>
                                        <CheckCircle2 className="ml-1 h-4 w-4"/> موافقة
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-destructive h-9 font-bold" onClick={() => removeAccess(req.id)}>
                                        رفض
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {pending.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground italic font-bold">لا توجد طلبات معلقة لهذا الفرع.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black flex items-center gap-2 px-1 text-primary justify-end">
            الأجهزة الموثوقة والمصرحة ({approved.length})
            <ShieldCheck className="h-5 w-5"/>
        </h2>
        <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="font-black text-right">ID الجهاز</TableHead>
                        <TableHead className="font-black text-right">الجهاز</TableHead>
                        <TableHead className="font-black text-right">تاريخ الاعتماد</TableHead>
                        <TableHead className="font-black text-center">إجراء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {approved.map((req) => (
                        <TableRow key={req.id}>
                            <TableCell>
                                <Badge className="bg-primary text-white font-black px-4">{req.shortId}</Badge>
                            </TableCell>
                            <TableCell className="text-xs font-bold">{req.deviceName}</TableCell>
                            <TableCell className="text-[10px] font-bold">{req.approvedAt ? new Date(req.approvedAt).toLocaleString('ar-IQ') : '-'}</TableCell>
                            <TableCell>
                                <div className="flex justify-center">
                                    <Button size="icon" variant="ghost" className="text-destructive h-10 w-10 rounded-xl bg-destructive/5" onClick={() => removeAccess(req.id)}>
                                        <Trash2 className="h-4 w-4"/>
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {approved.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground font-bold italic">لا توجد أجهزة مرخصة حالياً.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </Card>
      </section>
    </div>
  );
}
