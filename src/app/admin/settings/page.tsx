
"use client";

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { HardHat, Loader2, Save, AlertCircle } from 'lucide-react';
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
                <header>
                    <h1 className="text-3xl font-bold">الإعدادات العامة</h1>
                    <p className="text-muted-foreground">التحكم في إعدادات التطبيق الرئيسية.</p>
                </header>
                <Card className="rounded-[2rem]">
                    <CardContent className="p-8"><Skeleton className="h-40 w-full" /></CardContent>
                </Card>
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
        <p className="text-muted-foreground font-bold">هذه الصفحة متاحة فقط للإدارة الرئيسية للتحكم في حالة الخدمة.</p>
      </header>

      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white">
          <CardHeader className="bg-primary/5 pb-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-2xl"><HardHat className="h-6 w-6 text-primary"/></div>
                <div>
                    <CardTitle className="text-2xl font-black">مفتاح إيقاف التطبيق (Kill Switch)</CardTitle>
                    <CardDescription className="font-bold">عند تفعيل وضع الصيانة، سيتوقف التطبيق عن العمل لدى جميع الزبائن.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 space-y-8">
             <div className="flex items-center justify-between p-6 bg-muted/20 rounded-[2rem] border-2 border-dashed border-primary/20">
                <div className="space-y-1">
                    <Label htmlFor="maintenance-mode" className="text-lg font-black block">حالة العمل الآن</Label>
                    <p className="text-xs font-bold text-muted-foreground">
                        {settings?.isMaintenanceMode ? "التطبيق متوقف حالياً ويظهر شاشة الصيانة." : "التطبيق يعمل بشكل طبيعي لدى الجميع."}
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
                    <Label className="text-sm font-black">رسالة التنبيه للزبائن</Label>
                </div>
                <Textarea 
                    placeholder="اكتب سبب التوقف هنا... مثال: نحن في صيانة دورية، سنعود خلال ساعة."
                    value={msg}
                    onChange={(e) => setMsg(e.target.value)}
                    className="min-h-[150px] rounded-[2rem] p-6 font-bold text-lg border-2 focus-visible:ring-primary shadow-inner bg-slate-50"
                />
                <p className="text-[10px] text-muted-foreground font-bold italic mr-2">هذه الرسالة ستظهر في منتصف الشاشة للزبون عند محاولة فتح التطبيق.</p>
             </div>
          </CardContent>
          <CardFooter className="bg-muted/10 p-6 border-t">
             <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full h-16 rounded-2xl text-xl font-black shadow-xl shadow-primary/20 gap-2"
             >
                {isSaving ? <Loader2 className="animate-spin h-6 w-6"/> : <Save className="h-6 w-6" />}
                حفظ نص الرسالة وتحديث الحالة
             </Button>
          </CardFooter>
      </Card>

    </div>
  );
}
