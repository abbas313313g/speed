
"use client";

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Trash2, PlusCircle, Loader2, Phone, User, KeyRound } from 'lucide-react';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminUsersPage({ branchId }: { branchId: string }) {
  const { deliveryWorkers, isLoading, addDeliveryWorker, deleteWorker } = useDeliveryWorkers(branchId);
  const [open, setOpen] = useState(false);
  const [newWorker, setNewWorker] = useState({ id: '', name: '', password: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleAdd = async () => {
      if (!newWorker.id || !newWorker.name || !newWorker.password) return;
      setIsSaving(true);
      const success = await addDeliveryWorker({ ...newWorker });
      if (success) { setOpen(false); setNewWorker({ id: '', name: '', password: '' }); }
      setIsSaving(false);
  }

  if (isLoading) return <div className="p-8 text-center animate-pulse">جار تحميل بيانات المناديب...</div>;
  
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-primary">إدارة المناديب</h1>
          <p className="text-muted-foreground font-bold">عرض مناديب الفرع الحالي فقط.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="rounded-xl h-12 px-6 font-bold">
          <PlusCircle className="ml-2 h-5 w-5" />
          إضافة كابتن جديد
        </Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-[2rem]">
            <DialogHeader>
                <DialogTitle className="text-2xl font-black">إنشاء حساب كابتن للفرع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-1">
                    <Label className="font-bold">الاسم الكامل</Label>
                    <div className="relative"><User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={newWorker.name} onChange={(e)=>setNewWorker({...newWorker, name: e.target.value})} className="pr-10 h-12 rounded-xl font-bold"/></div>
                </div>
                <div className="space-y-1">
                    <Label className="font-bold">رقم الهاتف (للدخول)</Label>
                    <div className="relative"><Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={newWorker.id} onChange={(e)=>setNewWorker({...newWorker, id: e.target.value})} className="pr-10 h-12 rounded-xl font-bold" placeholder="07XXXXXXXX"/></div>
                </div>
                <div className="space-y-1">
                    <Label className="font-bold">كلمة المرور</Label>
                    <div className="relative"><KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input type="password" value={newWorker.password} onChange={(e)=>setNewWorker({...newWorker, password: e.target.value})} className="pr-10 h-12 rounded-xl font-bold text-center"/></div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleAdd} className="w-full h-14 rounded-2xl text-lg font-black" disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin h-5 w-5"/> : "إنشاء الحساب الآن"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-[1.5rem] overflow-hidden border-none shadow-xl">
        <CardContent className="p-0">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow>
                        <TableHead className="font-black">اسم الكابتن</TableHead>
                        <TableHead className="font-black">رقم الهاتف</TableHead>
                        <TableHead className="font-black">الحالة</TableHead>
                        <TableHead className="font-black text-center">إجراء</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                {deliveryWorkers.map((worker) => (
                    <TableRow key={worker.id}>
                        <TableCell className="font-bold">{worker.name}</TableCell>
                        <TableCell dir="ltr">{worker.id}</TableCell>
                        <TableCell>
                            <div className="flex items-center gap-2">
                                <div className={`h-2 w-2 rounded-full ${worker.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                                <span className="text-xs font-bold">{worker.isOnline ? 'متصل' : 'أوفلاين'}</span>
                            </div>
                        </TableCell>
                        <TableCell className="text-center">
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-5 w-5" /></Button></AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2rem]">
                                    <AlertDialogHeader><AlertDialogTitle>حذف الكابتن؟</AlertDialogTitle></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel className="rounded-xl">تراجع</AlertDialogCancel><AlertDialogAction onClick={()=>deleteWorker(worker.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl">حذف</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            {deliveryWorkers.length === 0 && <div className="p-20 text-center text-muted-foreground italic font-bold">لا يوجد مناديب مسجلين في هذا الفرع.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
