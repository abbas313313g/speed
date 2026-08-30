"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HardHat, Loader2, Download, Zap, ShieldCheck, DatabaseZap, Trash2 } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { collection, getDocs, doc, updateDoc, writeBatch } from 'firebase/firestore';
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
import { Progress } from '@/components/ui/progress';

const SECRET_PIN = "abbas31344313";

export default function AdminSettingsPage() {
    const { settings, setSettings, isLoading, isSaving } = useAppSettings();
    const { toast } = useToast();
    const [msg, setMsg] = useState('');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optimizeProgress, setOptimizeProgress] = useState(0);
    const [optimizeStatus, setOptimizeStatus] = useState('');
    
    const [showPinDialog, setShowPinDialog] = useState(false);
    const [pinInput, setPinInput] = useState("");
    const [pendingAction, setPendingAction] = useState<'export' | 'optimize' | 'cleanup' | null>(null);

    useEffect(() => {
        if (settings?.maintenanceMessage) setMsg(settings.maintenanceMessage);
    }, [settings]);

    const handleActionWithPin = (action: 'export' | 'optimize' | 'cleanup') => {
        setPendingAction(action);
        setShowPinDialog(true);
    };

    const confirmAction = async () => {
        if (pinInput !== SECRET_PIN) {
            toast({ title: "الرمز السري غير صحيح", variant: "destructive" });
            return;
        }
        setShowPinDialog(false);
        setPinInput("");
        if (pendingAction === 'export') await handleExportData();
        if (pendingAction === 'optimize') await handleOptimizeExistingImages();
        if (pendingAction === 'cleanup') await handleClearOldOrders();
    };

    const handleExportData = async () => {
        toast({ title: "جارِ تجهيز الملف الاحتياطي..." });
        try {
            const collections = ['categories', 'restaurants', 'products', 'banners', 'deliveryZones', 'coupons', 'deliveryWorkers', 'branches', 'settings'];
            const allData: any = {};
            for (const colName of collections) {
                setOptimizeStatus(`جلب: ${colName}...`);
                const snap = await getDocs(collection(db, colName));
                allData[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            }
            const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `SpeedShop_FullBackup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            setOptimizeStatus('اكتمل بنجاح ✅');
            toast({ title: "تم تصدير نسخة شاملة بنجاح" });
        } catch (e) {
            toast({ title: "حدث خطأ أثناء التصدير", variant: "destructive" });
        }
    };

    const handleOptimizeExistingImages = async () => {
        setIsOptimizing(true);
        setOptimizeProgress(0);
        let processedCount = 0;
        try {
            const collectionsToOptimize = ['products', 'restaurants', 'banners'];
            for (const colName of collectionsToOptimize) {
                setOptimizeStatus(`تحسين قاعدة بيانات: ${colName}...`);
                const snap = await getDocs(collection(db, colName));
                const totalDocs = snap.docs.length;
                
                for (let i = 0; i < totalDocs; i++) {
                    const d = snap.docs[i];
                    const data = d.data();
                    // إذا كانت الصورة تستهلك مساحة كبيرة (أكبر من 40 كيلو بايت) نقوم بضغطها
                    if (data.image && data.image.startsWith('data:image') && data.image.length > 40000) {
                        try {
                            const compressed = await compressImage(data.image, 500, 0.35); // ضغط عدواني للقديم
                            await updateDoc(doc(db, colName, d.id), { image: compressed });
                            processedCount++;
                        } catch (err) {}
                    }
                    setOptimizeProgress(Math.round(((i + 1) / totalDocs) * 100));
                }
            }
            setOptimizeStatus(`تم بنجاح! تم ضغط ${processedCount} وثيقة كبيرة.`);
            toast({ title: `تم توفير مساحة هائلة في الفايرستور بنجاح ✅` });
        } catch (e) {
            toast({ title: "فشل محرك التحسين", variant: "destructive" });
        } finally {
            setIsOptimizing(false);
        }
    };

    const handleClearOldOrders = async () => {
        setIsOptimizing(true);
        setOptimizeStatus('جاري تنظيف الطلبات القديمة جداً...');
        try {
            const snap = await getDocs(collection(db, "orders"));
            const batch = writeBatch(db);
            let deletedCount = 0;
            const threshold = new Date();
            threshold.setMonth(threshold.getMonth() - 2); // حذف الطلبات الأقدم من شهرين فقط

            snap.docs.forEach(d => {
                const data = d.data();
                if (new Date(data.date) < threshold) {
                    batch.delete(doc(db, "orders", d.id));
                    deletedCount++;
                }
            });

            if (deletedCount > 0) {
                await batch.commit();
                toast({ title: `تم حذف ${deletedCount} طلب قديم لتوفير مساحة.` });
            } else {
                toast({ title: "لا توجد طلبات قديمة تحتاج للحذف." });
            }
        } catch (e) {
            toast({ title: "فشل تنظيف الطلبات", variant: "destructive" });
        } finally {
            setIsOptimizing(false);
            setOptimizeStatus('');
        }
    };

    if (isLoading) return <div className="p-8"><Skeleton className="h-40 w-full rounded-3xl" /></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-right">
      <header>
        <h1 className="text-4xl font-black text-primary italic">إدارة النظام والتحسين</h1>
        <p className="text-muted-foreground font-bold">أدوات ضغط المكونات وتوفير مساحة الفايرستور.</p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-slate-900 text-white">
              <CardHeader className="bg-white/5">
                <CardTitle className="text-xl font-black flex items-center gap-2 justify-end">محرك الضغط السحابي <DatabaseZap className="text-yellow-400 h-5 w-5"/></CardTitle>
                <CardDescription className="text-white/60 font-bold text-right">يقوم هذا المحرك بضغط كافة المكونات (الصور والبيانات) في السيرفر لتوفير مساحة تكفي لشهور قادمة.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                  {isOptimizing && (
                      <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold">
                              <span>{optimizeStatus}</span>
                              <span>{optimizeProgress}%</span>
                          </div>
                          <Progress value={optimizeProgress} className="h-2 bg-white/10" />
                      </div>
                  )}
                  <div className="space-y-4">
                      <Button variant="secondary" className="w-full h-14 rounded-2xl font-black gap-2" onClick={() => handleActionWithPin('optimize')} disabled={isOptimizing}>
                         {isOptimizing ? <Loader2 className="animate-spin h-5 w-5" /> : <Zap className="h-5 w-5" />}
                         تفعيل ضغط كافة المكونات (يوفر مساحة 70%)
                      </Button>
                      <Button variant="outline" className="w-full h-12 rounded-xl font-black gap-2 border-white/20 text-white hover:bg-white/10" onClick={() => handleActionWithPin('cleanup')} disabled={isOptimizing}>
                         <Trash2 className="h-5 w-5" /> حذف الطلبات القديمة (أكثر من شهرين)
                      </Button>
                      <Button variant="ghost" className="w-full h-12 rounded-xl font-bold gap-2 text-white/40 hover:text-white" onClick={() => handleActionWithPin('export')} disabled={isOptimizing}>
                         <Download className="h-5 w-5" /> تصدير نسخة احتياطية شاملة
                      </Button>
                  </div>
              </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white">
              <CardHeader className="bg-primary/5">
                <CardTitle className="text-xl font-black flex items-center gap-2 justify-end">وضع التوقف المؤقت <HardHat className="text-primary h-5 w-5"/></CardTitle>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                 <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl">
                    <Label className="font-bold">تفعيل إغلاق التطبيق</Label>
                    <Switch checked={settings?.isMaintenanceMode || false} onCheckedChange={(v) => setSettings({ isMaintenanceMode: v })} />
                 </div>
                 <div className="space-y-2">
                    <Label className="text-xs font-bold pr-1">رسالة تظهر للزبائن عند الإغلاق</Label>
                    <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} className="rounded-xl min-h-[100px] text-right font-bold" placeholder="مثال: نحن في صيانة حالياً، سنعود قريباً..." />
                    <Button onClick={() => setSettings({ ...settings, maintenanceMessage: msg })} disabled={isSaving} className="w-full h-12 rounded-xl font-black">حفظ الرسالة</Button>
                 </div>
              </CardContent>
          </Card>
      </div>

      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
            <DialogContent className="sm:max-w-md rounded-[2.5rem]">
                <DialogHeader><DialogTitle className="text-2xl font-black text-center italic">تحقق الأمان</DialogTitle></DialogHeader>
                <div className="py-6 space-y-4 text-center">
                    <ShieldCheck className="h-16 w-16 text-primary mx-auto animate-bounce"/>
                    <p className="font-bold text-muted-foreground">يرجى إدخال الرمز السري لتنفيذ هذه العملية الحساسة التي ستعدل على كافة مكونات النظام.</p>
                    <Input type="password" placeholder="••••••••" value={pinInput} onChange={(e)=>setPinInput(e.target.value)} className="h-14 rounded-2xl text-center text-3xl font-black" onKeyDown={(e)=>e.key === 'Enter' && confirmAction()} dir="ltr"/>
                </div>
                <DialogFooter><Button onClick={confirmAction} className="w-full h-14 rounded-2xl text-xl font-black">تأكيد الرمز</Button></DialogFooter>
            </DialogContent>
      </Dialog>
    </div>
  );
}