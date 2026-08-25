
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HardHat, Loader2, Save, AlertCircle, FileCode, Download, Zap, ShieldCheck } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { compressImage } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

const SECRET_PIN = "abbas31344313";

export default function AdminSettingsPage() {
    const { settings, setSettings, isLoading, isSaving } = useAppSettings();
    const { toast } = useToast();
    const [msg, setMsg] = useState('');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [showPinDialog, setShowPinDialog] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [pendingAction, setPendingAction] = useState<'export' | 'optimize' | null>(null);

    useEffect(() => {
        if (settings?.maintenanceMessage) {
            setMsg(settings.maintenanceMessage);
        }
    }, [settings]);

    const handleActionWithPin = (action: 'export' | 'optimize') => {
        setPendingAction(action);
        setShowPinDialog(true);
    };

    const confirmAction = async () => {
        if (pinInput !== SECRET_PIN) {
            toast({ title: "الرمز غير صحيح", variant: "destructive" });
            return;
        }
        setShowPinDialog(false);
        setPinInput("");

        if (pendingAction === 'export') await handleExportData();
        if (pendingAction === 'optimize') await handleOptimizeExistingImages();
    };

    const handleExportData = async () => {
        toast({ title: "جارِ استخراج كافة البيانات..." });
        try {
            const collections = ['categories', 'restaurants', 'products', 'banners', 'deliveryZones', 'coupons', 'deliveryWorkers', 'branches', 'settings'];
            const allData: any = {};

            for (const colName of collections) {
                const snap = await getDocs(collection(db, colName));
                allData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }

            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SpeedShop_Backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            toast({ title: "تم تحميل النسخة الاحتياطية بنجاح ✅" });
        } catch (e) {
            toast({ title: "فشل استخراج البيانات", variant: "destructive" });
        }
    };

    const handleOptimizeExistingImages = async () => {
        setIsOptimizing(true);
        toast({ title: "بدء عملية ضغط كافة الصور لتوفير مساحة Firestore..." });
        
        try {
            const collectionsToOptimize = ['products', 'restaurants', 'banners'];
            let count = 0;

            for (const colName of collectionsToOptimize) {
                const snap = await getDocs(collection(db, colName));
                for (const d of snap.docs) {
                    const data = d.data();
                    if (data.image && data.image.startsWith('data:image')) {
                        const compressed = await compressImage(data.image);
                        if (compressed.length < data.image.length) {
                            await updateDoc(doc(db, colName, d.id), { image: compressed });
                            count++;
                        }
                    }
                }
            }
            toast({ title: `اكتملت العملية! تم ضغط ${count} صورة بنجاح ✅` });
        } catch (e) {
            toast({ title: "حدث خطأ أثناء الضغط", variant: "destructive" });
        } finally {
            setIsOptimizing(false);
        }
    };

    if (isLoading) {
        return <div className="p-8"><Skeleton className="h-40 w-full" /></div>;
    }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-primary">إعدادات النظام المتقدمة</h1>
        <p className="text-muted-foreground font-bold">إدارة المساحة، النسخ الاحتياطي، وحالة الخدمة.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
          {/* قسم الصيانة */}
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-xl font-black flex items-center gap-2"><HardHat className="text-primary"/> وضع الصيانة</CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                 <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                    <Label className="font-bold">تفعيل التوقف المؤقت</Label>
                    <Switch checked={settings?.isMaintenanceMode || false} onCheckedChange={(v) => setSettings({ isMaintenanceMode: v })} />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold pr-1">رسالة التوقف</Label>
                    <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="rounded-xl min-h-[100px]" />
                    <Button onClick={() => setSettings({ ...settings, maintenanceMessage: msg })} disabled={isSaving} className="w-full rounded-xl">حفظ الرسالة</Button>
                 </div>
              </CardContent>
          </Card>

          {/* قسم الأدوات الذكية والمساحة */}
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-slate-900 text-white">
              <CardHeader className="bg-white/5">
                <CardTitle className="text-xl font-black flex items-center gap-2"><Zap className="text-yellow-400"/> أدوات توفير المساحة (Firestore)</CardTitle>
                <CardDescription className="text-white/60 font-bold">حلول ذكية للبقاء على الخطة المجانية.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                  <div className="space-y-4">
                      <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-xs font-bold leading-relaxed">
                              ⚠️ ضغط الصور يقلل حجم البيانات بنسبة 80% مع الحفاظ على الجودة. يمنحك مساحة أكبر لآلاف المنتجات.
                          </p>
                      </div>
                      <Button 
                        variant="secondary" 
                        className="w-full h-12 rounded-xl font-black gap-2"
                        onClick={() => handleActionWithPin('optimize')}
                        disabled={isOptimizing}
                      >
                         {isOptimizing ? <Loader2 className="animate-spin h-5 w-5" /> : <Zap className="h-5 w-5" />}
                         ضغط كافة صور المنتجات الحالية
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full h-12 rounded-xl font-black gap-2 border-white/20 text-white hover:bg-white/10"
                        onClick={() => handleActionWithPin('export')}
                      >
                         <Download className="h-5 w-5" /> تصدير نسخة احتياطية (JSON)
                      </Button>
                  </div>
              </CardContent>
          </Card>
      </div>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-center">تحقق من الهوية</DialogTitle>
                </DialogHeader>
                <div className="py-6 space-y-4">
                    <div className="flex justify-center mb-2"><ShieldCheck className="h-16 w-16 text-primary animate-bounce"/></div>
                    <p className="text-center font-bold text-muted-foreground">أدخل الرمز السري الخاص بالمدير لتنفيذ هذا الإجراء الحساس.</p>
                    <Input 
                        type="password" 
                        placeholder="••••••••" 
                        value={pinInput} 
                        onChange={(e)=>setPinInput(e.target.value)} 
                        className="h-14 rounded-2xl text-center text-3xl font-black"
                        onKeyDown={(e)=>e.key === 'Enter' && confirmAction()}
                    />
                </div>
                <DialogFooter>
                    <Button onClick={confirmAction} className="w-full h-14 rounded-2xl text-xl font-black shadow-xl">تأكيد الدخول</Button>
                </DialogFooter>
            </DialogContent>
      </Dialog>
    </div>
  );
}
