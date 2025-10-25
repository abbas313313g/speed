
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
import { Trash2, Loader2, User, UserCog } from 'lucide-react';
import type { TelegramConfig } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTelegramConfigs } from '@/hooks/useTelegramConfigs';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { useRestaurants } from '@/hooks/useRestaurants';


const EMPTY_CONFIG: Omit<TelegramConfig, 'id'> = {
    name: '',
    chatId: '',
    type: 'owner',
};

export default function AdminTelegramPage() {
  const { toast } = useToast();
  const { telegramConfigs, isLoading: configsLoading, addTelegramConfig, deleteTelegramConfig } = useTelegramConfigs();
  const { deliveryWorkers, isLoading: workersLoading } = useDeliveryWorkers();
  const { restaurants, isLoading: restaurantsLoading } = useRestaurants();
  
  const [open, setOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Omit<TelegramConfig, 'id'>>({ ...EMPTY_CONFIG });
  const [isSaving, setIsSaving] = useState(false);

  const isLoading = configsLoading || workersLoading || restaurantsLoading;
  if (isLoading) return <div>جار التحميل...</div>;
  
  const handleSave = async () => {
    if (!currentConfig.name || !currentConfig.chatId) {
        toast({ title: "بيانات غير صحيحة", description: "الرجاء إدخال الاسم و Chat ID.", variant: "destructive"});
        return;
    }
     if (currentConfig.type === 'worker' && !currentConfig.workerId) {
        toast({ title: "بيانات غير صحيحة", description: "الرجاء اختيار عامل توصيل.", variant: "destructive"});
        return;
    }
     if (currentConfig.type === 'restaurant' && !currentConfig.restaurantId) {
        toast({ title: "بيانات غير صحيحة", description: "الرجاء اختيار مطعم.", variant: "destructive"});
        return;
    }
    setIsSaving(true);
    await addTelegramConfig(currentConfig);
    setIsSaving(false);
    setOpen(false);
    setCurrentConfig({...EMPTY_CONFIG});
  };

  const getAssociatedName = (config: TelegramConfig) => {
      if (config.type === 'worker' && config.workerId) {
          return deliveryWorkers.find(w => w.id === config.workerId)?.name || 'غير معروف';
      }
      if (config.type === 'restaurant' && config.restaurantId) {
          return restaurants.find(r => r.id === config.restaurantId)?.name || 'غير معروف';
      }
      return '-';
  }

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold">إدارة إشعارات تليجرام</h1>
            <p className="text-muted-foreground">إضافة وحذف معرفات تليجرام لاستلام إشعارات الطلبات.</p>
        </div>
        <Button onClick={() => setOpen(true)}>إضافة معرف جديد</Button>
      </header>

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>إضافة معرف تليجرام جديد</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">الاسم (للتوضيح)</Label>
                        <Input id="name" value={currentConfig.name} onChange={(e) => setCurrentConfig({...currentConfig, name: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="chatId" className="text-right">Chat ID</Label>
                        <Input id="chatId" value={currentConfig.chatId} onChange={(e) => setCurrentConfig({...currentConfig, chatId: e.target.value})} className="col-span-3" />
                    </div>
                     <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">النوع</Label>
                         <Select value={currentConfig.type} onValueChange={(value: 'owner' | 'worker' | 'restaurant') => setCurrentConfig({...currentConfig, type: value, workerId: undefined, restaurantId: undefined })}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="owner">مالك (كل الطلبات)</SelectItem>
                               <SelectItem value="worker">عامل توصيل (طلباته فقط)</SelectItem>
                               <SelectItem value="restaurant">مطعم</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {currentConfig.type === 'worker' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="workerId" className="text-right">العامل</Label>
                            <Select value={currentConfig.workerId} onValueChange={(value) => setCurrentConfig({...currentConfig, workerId: value})}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="اختر العامل" />
                                </SelectTrigger>
                                <SelectContent>
                                    {deliveryWorkers.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     {currentConfig.type === 'restaurant' && (
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="restaurantId" className="text-right">المطعم</Label>
                            <Select value={currentConfig.restaurantId} onValueChange={(value) => setCurrentConfig({...currentConfig, restaurantId: value})}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="اختر المطعم" />
                                </SelectTrigger>
                                <SelectContent>
                                    {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
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
            <TableHead>الاسم</TableHead>
            <TableHead>Chat ID</TableHead>
            <TableHead>النوع</TableHead>
            <TableHead>الاسم المرتبط</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {telegramConfigs.map((config) => (
            <TableRow key={config.id}>
              <TableCell className="font-medium">{config.name}</TableCell>
              <TableCell dir="ltr">{config.chatId}</TableCell>
              <TableCell>
                <Badge variant={config.type === 'owner' ? 'default' : 'secondary'}>
                  <div className="flex items-center gap-1">
                      {config.type === 'owner' && <User className="h-3 w-3"/>}
                      {config.type === 'worker' && <UserCog className="h-3 w-3"/>}
                      {config.type === 'restaurant' && <UserCog className="h-3 w-3"/>}
                      {
                        {
                            'owner': 'مالك',
                            'worker': 'عامل',
                            'restaurant': 'مطعم'
                        }[config.type]
                      }
                  </div>
                </Badge>
              </TableCell>
              <TableCell>{getAssociatedName(config)}</TableCell>
              <TableCell>
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
                                هذا الإجراء سيقوم بحذف المعرف "{config.name}" بشكل نهائي.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteTelegramConfig(config.id)}>حذف</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
