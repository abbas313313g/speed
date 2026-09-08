
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
import { Trash2, Loader2, User, UserCog, BellRing, ShieldCheck, GitBranch } from 'lucide-react';
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
import { useBranches } from '@/hooks/useBranches';


const EMPTY_CONFIG: Omit<TelegramConfig, 'id'> = {
    name: '',
    chatId: '',
    type: 'admin_orders',
    targetBranchId: 'all'
};

export default function AdminTelegramPage() {
  const { toast } = useToast();
  const { telegramConfigs, isLoading: configsLoading, addTelegramConfig, deleteTelegramConfig } = useTelegramConfigs();
  const { deliveryWorkers } = useDeliveryWorkers();
  const { restaurants } = useRestaurants();
  const { branches } = useBranches();
  
  const [open, setOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<Omit<TelegramConfig, 'id'>>({ ...EMPTY_CONFIG });
  const [isSaving, setIsSaving] = useState(false);

  if (configsLoading) return <div className="p-20 text-center animate-pulse font-black text-primary">جارِ فتح سجلات تليجرام...</div>;
  
  const handleSave = async () => {
    if (!currentConfig.name || !currentConfig.chatId) {
        toast({ title: "بيانات غير صحيحة", description: "الرجاء إدخال الاسم و Chat ID.", variant: "destructive"});
        return;
    }
    
    setIsSaving(true);
    await addTelegramConfig(currentConfig as any);
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
      if (config.type === 'admin_orders') {
          if (config.targetBranchId === 'all') return 'كافة الفروع';
          if (config.targetBranchId === 'main') return 'المركز الرئيسي';
          return branches.find(b => b.id === config.targetBranchId)?.name || 'فرع محدد';
      }
      return '-';
  }

  return (
    <div className="space-y-8 text-right">
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-black text-primary italic">إدارة إشعارات تليجرام</h1>
            <p className="text-muted-foreground font-bold mt-1">توجيه إشعارات الطلبات للإدارة، المناديب، أو المطاعم.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="h-12 rounded-xl px-6 font-black shadow-lg">إضافة ايدي جديد</Button>
      </header>

      <div className="bg-white rounded-[1.5rem] border shadow-xl overflow-hidden">
        <Table>
            <TableHeader className="bg-muted/50">
            <TableRow>
                <TableHead className="font-black text-right">الاسم</TableHead>
                <TableHead className="font-black text-right">Chat ID</TableHead>
                <TableHead className="font-black text-right">النوع</TableHead>
                <TableHead className="font-black text-right">النطاق / الربط</TableHead>
                <TableHead className="font-black text-center">إجراء</TableHead>
            </TableRow>
            </TableHeader>
            <TableBody>
            {telegramConfigs.map((config) => (
                <TableRow key={config.id}>
                <TableCell className="font-black">{config.name}</TableCell>
                <TableCell dir="ltr" className="font-mono text-xs">{config.chatId}</TableCell>
                <TableCell>
                    <Badge variant={config.type === 'admin_orders' ? 'default' : 'secondary'} className="font-black gap-1">
                    {config.type === 'admin_orders' && <ShieldCheck className="h-3 w-3"/>}
                    {config.type === 'owner' && <User className="h-3 w-3"/>}
                    {config.type === 'worker' && <UserCog className="h-3 w-3"/>}
                    {
                        {
                            'admin_orders': 'إشعارات الإدارة',
                            'owner': 'مالك',
                            'worker': 'كابتن',
                            'restaurant': 'مطعم'
                        }[config.type]
                    }
                    </Badge>
                </TableCell>
                <TableCell className="font-bold text-slate-600">{getAssociatedName(config)}</TableCell>
                <TableCell>
                    <div className="flex justify-center">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-[2.5rem]">
                                <AlertDialogHeader><AlertDialogTitle className="text-right font-black">حذف المعرف؟</AlertDialogTitle></AlertDialogHeader>
                                <AlertDialogFooter className="flex-row gap-3">
                                    <AlertDialogCancel className="flex-1 rounded-xl">إلغاء</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteTelegramConfig(config.id)} className="flex-1 bg-destructive hover:bg-destructive/90 rounded-xl">نعم، حذف</AlertDialogAction>
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

      <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-right">إضافة اشتراك إشعارات جديد</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 text-right">
                    <div className="space-y-1">
                        <Label className="font-bold">اسم توضيحي (مثال: تليجرام المدير)</Label>
                        <Input value={currentConfig.name} onChange={(e) => setCurrentConfig({...currentConfig, name: e.target.value})} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">Chat ID</Label>
                        <Input value={currentConfig.chatId} onChange={(e) => setCurrentConfig({...currentConfig, chatId: e.target.value})} className="h-12 rounded-xl text-center font-mono" placeholder="12345678" />
                    </div>
                    <div className="space-y-1">
                        <Label className="font-bold">نوع الاشتراك</Label>
                        <Select value={currentConfig.type} onValueChange={(value: any) => setCurrentConfig({...currentConfig, type: value, workerId: undefined, restaurantId: undefined, targetBranchId: 'all' })}>
                            <SelectTrigger className="h-12 rounded-xl font-bold">
                                <SelectValue placeholder="اختر النوع" />
                            </SelectTrigger>
                            <SelectContent>
                               <SelectItem value="admin_orders">إدارة: تنبيهات الطلبات الجديدة</SelectItem>
                               <SelectItem value="worker">كابتن: تنبيهات مهامه فقط</SelectItem>
                               <SelectItem value="restaurant">مطعم: تنبيهات وجباته فقط</SelectItem>
                               <SelectItem value="owner">تنبيهات عامة (كل شيء)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {currentConfig.type === 'admin_orders' && (
                        <div className="space-y-1 p-4 bg-primary/5 rounded-2xl border-2 border-dashed border-primary/20">
                            <Label className="font-black text-primary flex items-center gap-1 justify-end">تحديد نطاق الإشعارات <GitBranch className="h-3.5 w-3.5"/></Label>
                            <Select value={currentConfig.targetBranchId} onValueChange={(val) => setCurrentConfig({...currentConfig, targetBranchId: val})}>
                                <SelectTrigger className="h-11 rounded-xl bg-white">
                                    <SelectValue placeholder="اختر الفرع..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">كافة الفروع (الكل)</SelectItem>
                                    <SelectItem value="main">فرع المدحتية (الرئيسي)</SelectItem>
                                    {branches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {currentConfig.type === 'worker' && (
                        <div className="space-y-1">
                            <Label className="font-bold">اختيار الكابتن</Label>
                            <Select value={currentConfig.workerId} onValueChange={(value) => setCurrentConfig({...currentConfig, workerId: value})}>
                                <SelectTrigger className="h-11 rounded-xl">
                                    <SelectValue placeholder="اختر المندوب..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {deliveryWorkers.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                     {currentConfig.type === 'restaurant' && (
                        <div className="space-y-1">
                            <Label className="font-bold">اختيار المطعم</Label>
                            <Select value={currentConfig.restaurantId} onValueChange={(value) => setCurrentConfig({...currentConfig, restaurantId: value})}>
                                <SelectTrigger className="h-11 rounded-xl">
                                    <SelectValue placeholder="اختر المطعم..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {restaurants.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={handleSave} disabled={isSaving} className="w-full h-14 rounded-2xl text-xl font-black shadow-xl">
                        {isSaving ? <Loader2 className="ml-2 h-4 w-4 animate-spin"/> : "حفظ الاشتراك الآن"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
