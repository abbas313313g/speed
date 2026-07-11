
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
import { CheckCircle2, Trash2, Laptop, ShieldCheck, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function AdminAccessPage() {
  const { accessList, isLoading, approveAccess, removeAccess } = useAdminAccess();

  if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ جلب سجلات الوصول...</div>;

  const pending = accessList.filter(a => a.status === 'pending');
  const approved = accessList.filter(a => a.status === 'approved');

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-4xl font-black text-primary">تراخيص الأجهزة (IP)</h1>
        <p className="text-muted-foreground font-bold">إدارة الأجهزة المسموح لها بالدخول للوحة التحكم بدون قيود.</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-black flex items-center gap-2 px-1 text-orange-500">
            <Clock className="h-5 w-5"/>
            طلبات بانتظار الموافقة ({pending.length})
        </h2>
        <Card className="rounded-[1.5rem] border-none shadow-xl overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="font-black">العنوان (IP)</TableHead>
                        <TableHead className="font-black">الجهاز</TableHead>
                        <TableHead className="font-black">التاريخ</TableHead>
                        <TableHead className="font-black">إجراء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {pending.map((req) => (
                        <TableRow key={req.id}>
                            <TableCell className="font-bold font-mono">{req.ip}</TableCell>
                            <TableCell className="text-xs font-bold flex items-center gap-2">
                                <Laptop className="h-4 w-4 text-muted-foreground"/> {req.deviceName}
                            </TableCell>
                            <TableCell className="text-[10px] font-bold">{new Date(req.requestedAt).toLocaleString('ar-IQ')}</TableCell>
                            <TableCell>
                                <div className="flex gap-2">
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 h-8 rounded-lg" onClick={() => approveAccess(req.id)}>
                                        <CheckCircle2 className="ml-1 h-4 w-4"/> موافقة
                                    </Button>
                                    <Button size="sm" variant="ghost" className="text-destructive h-8" onClick={() => removeAccess(req.id)}>
                                        رفض
                                    </Button>
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {pending.length === 0 && <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic font-bold">لا توجد طلبات معلقة.</TableCell></TableRow>}
                </TableBody>
            </Table>
        </Card>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-black flex items-center gap-2 px-1 text-primary">
            <ShieldCheck className="h-5 w-5"/>
            الأجهزة الموثوقة ({approved.length})
        </h2>
        <Card className="rounded-[1.5rem] border-none shadow-xl overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="font-black">العنوان (IP)</TableHead>
                        <TableHead className="font-black">الجهاز</TableHead>
                        <TableHead className="font-black">تاريخ الاعتماد</TableHead>
                        <TableHead className="font-black">الحالة</TableHead>
                        <TableHead className="font-black">إجراء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {approved.map((req) => (
                        <TableRow key={req.id}>
                            <TableCell className="font-bold font-mono">{req.ip}</TableCell>
                            <TableCell className="text-xs font-bold">{req.deviceName}</TableCell>
                            <TableCell className="text-[10px] font-bold">{req.approvedAt ? new Date(req.approvedAt).toLocaleString('ar-IQ') : '-'}</TableCell>
                            <TableCell><Badge className="bg-primary/10 text-primary border-none">موثوق</Badge></TableCell>
                            <TableCell>
                                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeAccess(req.id)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Card>
      </section>
    </div>
  );
}
