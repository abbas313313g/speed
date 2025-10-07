
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { HardHat, Loader2 } from 'lucide-react';
import { useAppSettings } from '@/hooks/useAppSettings';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminSettingsPage() {
    const { settings, setSettings, isLoading, isSaving } = useAppSettings();

    if (isLoading) {
        return (
            <div className="space-y-8">
                <header>
                    <h1 className="text-3xl font-bold">الإعدادات العامة</h1>
                    <p className="text-muted-foreground">التحكم في إعدادات التطبيق الرئيسية.</p>
                </header>
                <Card>
                    <CardHeader>
                        <CardTitle><Skeleton className="h-6 w-48" /></CardTitle>
                        <CardDescription><Skeleton className="h-4 w-64" /></CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Skeleton className="h-8 w-24" />
                    </CardContent>
                    <CardFooter>
                         <Skeleton className="h-10 w-28" />
                    </CardFooter>
                </Card>
            </div>
        )
    }

    const toggleMaintenanceMode = () => {
        setSettings({ isMaintenanceMode: !settings?.isMaintenanceMode });
    };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold">الإعدادات العامة</h1>
        <p className="text-muted-foreground">التحكم في إعدادات التطبيق الرئيسية.</p>
      </header>

      <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><HardHat className="text-primary"/>وضع الصيانة</CardTitle>
            <CardDescription>
                عند تفعيله، سيتم عرض شاشة صيانة للمستخدمين ولن يتمكنوا من استخدام التطبيق.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <div className="flex items-center space-x-2 space-x-reverse">
                <Switch 
                    id="maintenance-mode" 
                    checked={settings?.isMaintenanceMode || false}
                    onCheckedChange={toggleMaintenanceMode}
                />
                <Label htmlFor="maintenance-mode">
                    {settings?.isMaintenanceMode ? "وضع الصيانة مفعل" : "وضع الصيانة غير مفعل"}
                </Label>
             </div>
          </CardContent>
          <CardFooter>
             <Button disabled={isSaving}>
                {isSaving && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                حفظ التغييرات
             </Button>
          </CardFooter>
      </Card>

    </div>
  );
}
