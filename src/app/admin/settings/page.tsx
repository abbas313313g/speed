
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { HardHat, Loader2, Save, AlertCircle, FileCode } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminSettingsPage() {
    const { settings, setSettings, isLoading, isSaving } = useAppSettings();
    const [msg, setMsg] = useState('');

    useEffect(() => {
        if (settings?.maintenanceMessage) {
            setMsg(settings.maintenanceMessage);
        }
    }, [settings]);

    if (isLoading) {
        return (
            <div className="space-y-8">
                <header><h1 className="text-3xl font-bold">الإعدادات العامة</h1></header>
                <Card className="rounded-[2rem]"><CardContent className="p-8"><Skeleton className="h-40 w-full" /></CardContent></Card>
            </div>
        )
    }

    const handleSave = async () => {
        await setSettings({ 
            isMaintenanceMode: settings?.isMaintenanceMode || false,
            maintenanceMessage: msg 
        });
    };

    const toggleMaintenance = async (val: boolean) => {
        await setSettings({ isMaintenanceMode: val });
    };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-4xl font-black text-primary">إعدادات النظام</h1>
        <p className="text-muted-foreground font-bold text-xs">تحكم في حالة الخدمة والبيانات الثابتة.</p>
      </header>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white border-b-8 border-b-primary">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl"><HardHat className="h-6 w-6 text-primary"/></div>
                <div>
                    <CardTitle className="text-2xl font-black">مفتاح الصيانة (Kill Switch)</CardTitle>
                    <CardDescription className="font-bold">عند تفعيله، سيتوقف التطبيق فوراً ويظهر شاشة توقف.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
             <div className="flex items-center justify-between p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/20">
                <div className="space-y-1">
                    <Label htmlFor="maintenance-mode" className="text-lg font-black block">الحالة الحالية</Label>
                    <p className="text-xs font-bold text-muted-foreground">
                        {settings?.isMaintenanceMode ? "⚠️ التطبيق متوقف الآن." : "✅ التطبيق يعمل بشكل طبيعي."}
                    </p>
                </div>
                <Switch 
                    id="maintenance-mode" 
                    checked={settings?.isMaintenanceMode || false}
                    onCheckedChange={toggleMaintenance}
                    className="scale-150 ml-4"
                />
             </div>

             <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary pr-1">
                    <AlertCircle className="h-5 w-5" />
                    <Label className="text-sm font-black">رسالة التوقف للزبائن</Label>
                </div>
                <Textarea 
                    placeholder="اكتب سبب التوقف هنا..."
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    className="min-h-[120px] rounded-[2rem] p-6 font-bold border-2 shadow-inner bg-slate-50"
                />
             </div>
          </CardContent>
          <CardFooter className="bg-muted/10 p-6 border-t flex flex-col gap-4">
             <Button onClick={handleSave} disabled={isSaving} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl shadow-primary/20">
                {isSaving ? <Loader2 className="animate-spin h-5 w-5"/> : <Save className="ml-2 h-5 w-5" />}
                حفظ الإعدادات وتحديث الحالة
             </Button>
          </CardFooter>
      </Card>

      <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-slate-800 text-white">
          <CardHeader>
              <div className="flex items-center gap-3">
                  <FileCode className="h-6 w-6 text-primary" />
                  <div>
                      <CardTitle className="text-xl font-black italic">نظام البيانات الثابتة (Static Mode)</CardTitle>
                      <CardDescription className="text-white/60 font-bold">البيانات في الصفحة الرئيسية أصبحت "ثابتة بالكود" لتكون صاروخية.</CardDescription>
                  </div>
              </div>
          </CardHeader>
          <CardContent className="space-y-4">
              <p className="text-xs font-bold leading-relaxed bg-white/5 p-4 rounded-xl border border-white/10">
                  ⚠️ لتحديث "البنرات" أو "المتاجر الـ 8" أو "الأقسام"، يرجى التواصل مع المبرمج لتحديث مصفوفة الكود المصدري لضمان عدم وجود أي لودنك أو تأخير للزبائن.
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-widest text-center">
                  <div className="p-3 bg-white/10 rounded-lg">البنرات: ثابتة ✅</div>
                  <div className="p-3 bg-white/10 rounded-lg">الأقسام: ثابتة ✅</div>
                  <div className="p-3 bg-white/10 rounded-lg">المتاجر: 8 ثابتة ✅</div>
                  <div className="p-3 bg-white/10 rounded-lg">التحميل: 0 ثانية 🚀</div>
              </div>
          </CardContent>
      </Card>

    </div>
  );
}
