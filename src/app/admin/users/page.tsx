
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
import { Trash2, PlusCircle, Loader2, Phone, User, KeyRound, Edit } from 'lucide-react';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminUsersPage({ branchId }: { branchId: string }) {
  const { deliveryWorkers, isLoading, addDeliveryWorker, updateWorkerDetails, deleteWorker } = useDeliveryWorkers(branchId);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentWorker, setCurrentWorker] = useState({ id: '', name: '', password: '' });
  const [isSaving, setIsSaving] = useState(false);

  const handleOpen = (worker?: any) => {
      if (worker) {
          setIsEditing(true);
          setCurrentWorker({ id: worker.id, name: worker.name, password: worker.password || '' });
      } else {
          setIsEditing(false);
          setCurrentWorker({ id: '', name: '', password: '' });
      }
      setOpen(true);
  }

  const handleSave = async () => {
      if (!currentWorker.id || !currentWorker.name) return;
      setIsSaving(true);
      if (isEditing) {
          await updateWorkerDetails(currentWorker.id, { name: currentWorker.name, password: currentWorker.password });
          setOpen(false);
      } else {
          const success = await addDeliveryWorker({ ...currentWorker });
          if (success) setOpen(false);
      }
      setIsSaving(false);
  }

  if (isLoading) return <div className="p-8 text-center animate-pulse">جار تحميل بيانات المناديب...</div>;
  
  return (
    <div className="space-y-8 text-right">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-primary">إدارة المناديب</h1>
          <p className="text-muted-foreground font-bold">التحكم في حسابات كباتن فرع: {branchId === 'main' ? 'المركزية' : branchId}</p>
        </div>
        <Button onClick={() => handleOpen()} className="rounded-xl h-12 px-6 font-bold shadow-lg">
          <PlusCircle className="ml-2 h-5 w-5" /> إضافة كابتن
        </Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem]">
            <DialogHeader><DialogTitle className="text-2xl font-black text-right">{isEditing ? 'تعديل بيانات الكابتن' : 'إنشاء حساب كابتن'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4 text-right">
                <div className="space-y-1">
                    <Label className="font-bold">الاسم الكامل</Label>
                    <div className="relative"><User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={currentWorker.name} onChange={(e)=>setCurrentWorker({...currentWorker, name: e.target.value})} className="pr-10 h-12 rounded-xl font-bold"/></div>
                </div>
                <div className="space-y-1">
                    <Label className="font-bold">رقم الهاتف (للدخول)</Label>
                    <div className="relative"><Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input value={currentWorker.id} onChange={(e)=>setCurrentWorker({...currentWorker, id: e.target.value})} className="pr-10 h-12 rounded-xl font-bold" disabled={isEditing} placeholder="07XXXXXXXX"/></div>
                </div>
                <div className="space-y-1">
                    <Label className="font-bold">كلمة المرور</Label>
                    <div className="relative"><KeyRound className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input type="text" value={currentWorker.password} onChange={(e)=>setCurrentWorker({...currentWorker, password: e.target.value})} className="pr-10 h-12 rounded-xl font-bold text-center"/></div>
                </div>
            </div>
            <DialogFooter>
                <Button onClick={handleSave} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl" disabled={isSaving}>
                    {isSaving ? <Loader2 className="animate-spin h-5 w-5"/> : "حفظ الحساب"}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-[1.5rem] overflow-hidden border-none shadow-xl bg-white">
        <Table>
            <TableHeader className="bg-muted/50">
                <TableRow>
                    <TableHead className="font-black">الكابتن</TableHead>
                    <TableHead className="font-black">الهاتف</TableHead>
                    <TableHead className="font-black">الحالة</TableHead>
                    <TableHead className="font-black text-center">إجراءات</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
            {deliveryWorkers.map((worker) => (
                <TableRow key={worker.id}>
                    <TableCell className="font-bold">{worker.name}</TableCell>
                    <TableCell dir="ltr">{worker.id}</TableCell>
                    <TableCell>
                        <Badge variant="outline" className={cn("gap-1 font-black", worker.isOnline ? "text-green-600" : "text-gray-400")}>
                            <div className={cn("h-2 w-2 rounded-full", worker.isOnline ? "bg-green-500" : "bg-gray-400")} />
                            {worker.isOnline ? 'نشط' : 'أوفلاين'}
                        </Badge>
                    </TableCell>
                    <TableCell>
                        <div className="flex justify-center gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => handleOpen(worker)}><Edit className="h-4 w-4"/></Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="text-destructive h-8 w-8"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2rem]">
                                    <AlertDialogHeader><AlertDialogTitle className="text-right">حذف الكابتن؟</AlertDialogTitle><AlertDialogDescription className="text-right">سيتم مسح سجلاته المالية وحسابه نهائياً.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter className="flex-row gap-2"><AlertDialogCancel className="flex-1 rounded-xl">تراجع</AlertDialogCancel><AlertDialogAction onClick={()=>deleteWorker(worker.id)} className="flex-1 bg-destructive rounded-xl">حذف</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
        {deliveryWorkers.length === 0 && <div className="p-20 text-center text-muted-foreground italic font-bold">لا يوجد مناديب في هذا الفرع.</div>}
      </Card>
    </div>
  );
}
