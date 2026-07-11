
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import type { DeliveryZone } from '@/lib/types';
import { useDeliveryZones } from '@/hooks/useDeliveryZones';

const EMPTY_ZONE: Omit<DeliveryZone, 'id'> = {
    name: '',
};

export default function AdminDeliveryZonesPage() {
  const { deliveryZones, isLoading, addDeliveryZone, updateDeliveryZone, deleteDeliveryZone } = useDeliveryZones();
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentZone, setCurrentZone] = useState<Partial<DeliveryZone>>({ ...EMPTY_ZONE });
  const [isSaving, setIsSaving] = useState(false);

  if (isLoading) return <div className="p-8 text-center animate-pulse">جار التحميل...</div>;

  const handleOpenDialog = (zone?: DeliveryZone) => {
    if (zone) {
        setIsEditing(true);
        setCurrentZone(zone);
    } else {
        setIsEditing(false);
        setCurrentZone({ ...EMPTY_ZONE });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (currentZone.name) {
        setIsSaving(true);
        if (isEditing && currentZone.id) {
            await updateDeliveryZone(currentZone as DeliveryZone);
        } else {
            await addDeliveryZone(currentZone as Omit<DeliveryZone, 'id'>);
        }
        setIsSaving(false);
        setOpen(false);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-primary">إدارة مناطق التوصيل</h1>
            <p className="text-muted-foreground font-bold">إضافة أسماء المناطق لتسهيل اختيار العناوين.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="rounded-xl">إضافة منطقة جديدة</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black">{isEditing ? 'تعديل المنطقة' : 'إضافة منطقة جديدة'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right font-bold">اسم المنطقة</Label>
                        <Input id="name" value={currentZone.name ?? ''} onChange={(e) => setCurrentZone({...currentZone, name: e.target.value})} className="col-span-3 rounded-xl h-12" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={isSaving} className="w-full h-14 rounded-2xl text-lg font-black">
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                        حفظ المنطقة
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50">
            <TableRow>
                <TableHead className="font-black">اسم المنطقة</TableHead>
                <TableHead className="font-black">إجراءات</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {deliveryZones.map((zone) => (
                <TableRow key={zone.id}>
                <TableCell className="font-bold">{zone.name}</TableCell>
                <TableCell>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleOpenDialog(zone)} className="rounded-lg">
                            <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive">
                                    <Trash2 className="h-4 w-4" />
                            </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2rem]">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-right">هل أنت متأكد؟</AlertDialogTitle>
                                    <AlertDialogDescription className="text-right font-bold">
                                        هذا الإجراء سيقوم بحذف منطقة "{zone.name}" بشكل نهائي.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-2">
                                    <AlertDialogCancel className="flex-1 rounded-xl">إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteDeliveryZone(zone.id)} className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl">حذف</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </TableCell>
                </TableRow>
            ))}
            </TableBody>
        </Table>
      </div>
    </div>
  );
}
