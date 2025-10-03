
"use client";

import { useState, useContext } from 'react';
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
import { formatCurrency } from '@/lib/utils';
import { AppContext } from '@/contexts/AppContext';

const EMPTY_ZONE: Omit<DeliveryZone, 'id'> = {
    name: '',
    fee: 0,
};

export default function AdminDeliveryZonesPage() {
  const context = useContext(AppContext);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentZone, setCurrentZone] = useState<Partial<DeliveryZone>>({ ...EMPTY_ZONE });
  const [isSaving, setIsSaving] = useState(false);

  if (!context || context.isLoading) return <div>جار التحميل...</div>;

  const { deliveryZones, addDeliveryZone, updateDeliveryZone, deleteDeliveryZone } = context;

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
    if (currentZone.name && typeof currentZone.fee === 'number') {
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
            <h1 className="text-3xl font-bold">إدارة مناطق التوصيل</h1>
            <p className="text-muted-foreground">إضافة، تعديل، وحذف مناطق التوصيل وأسعارها.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>إضافة منطقة جديدة</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'تعديل المنطقة' : 'إضافة منطقة جديدة'}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">اسم المنطقة</Label>
                        <Input id="name" value={currentZone.name} onChange={(e) => setCurrentZone({...currentZone, name: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="fee" className="text-right">سعر التوصيل</Label>
                        <Input id="fee" type="number" value={currentZone.fee || ''} onChange={(e) => setCurrentZone({...currentZone, fee: e.target.value === '' ? 0 : parseFloat(e.target.value)})} className="col-span-3" />
                    </div>
                </div>
                <DialogFooter>
                    <Button type="submit" onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                        حفظ
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المنطقة</TableHead>
            <TableHead>سعر التوصيل</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {deliveryZones.map((zone) => (
            <TableRow key={zone.id}>
              <TableCell className="font-medium">{zone.name}</TableCell>
              <TableCell>{formatCurrency(zone.fee)}</TableCell>
              <TableCell>
                  <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleOpenDialog(zone)}>
                          <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                    هذا الإجراء سيقوم بحذف منطقة "{zone.name}" بشكل نهائي.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteDeliveryZone(zone.id)}>حذف</AlertDialogAction>
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
  );
}

    