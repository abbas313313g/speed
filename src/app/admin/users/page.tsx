
"use client";

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
import { Trash2 } from 'lucide-react';
import { useDeliveryWorkers } from '@/hooks/useDeliveryWorkers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminUsersPage() {
  const { deliveryWorkers, isLoading: workersLoading, deleteAllWorkers, deleteWorker } = useDeliveryWorkers();

  if (workersLoading) return <div>جار التحميل...</div>;
  
  return (
    <div className="space-y-8">
      <header className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">إدارة المستخدمين والعمال</h1>
          <p className="text-muted-foreground">عرض حسابات عمال التوصيل المسجلين وإدارتها.</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="ml-2 h-4 w-4" />
              حذف جميع العمال
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>هل أنت متأكد تمامًا؟</AlertDialogTitle>
              <AlertDialogDescription>
                هذا الإجراء سيقوم بحذف **جميع** حسابات عمال التوصيل بشكل نهائي من قاعدة البيانات. لا يمكن التراجع عن هذا الإجراء. سيحتاج جميع العمال إلى التسجيل مرة أخرى.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={deleteAllWorkers} className="bg-destructive hover:bg-destructive/90">نعم، قم بالحذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </header>

      <Card>
        <CardHeader>
            <CardTitle>سجلات عمال التوصيل</CardTitle>
            <CardDescription>قائمة بجميع عمال التوصيل المسجلين في النظام.</CardDescription>
        </CardHeader>
        <CardContent>
            {deliveryWorkers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">لا يوجد عمال توصيل مسجلون في النظام حاليًا.</p>
            ) : (
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>اسم العامل</TableHead>
                        <TableHead>رقم الهاتف (المعرف)</TableHead>
                        <TableHead>حالة الاتصال</TableHead>
                        <TableHead>إجراءات</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {deliveryWorkers.map((worker) => (
                        <TableRow key={worker.id}>
                        <TableCell className="font-medium">{worker.name}</TableCell>
                        <TableCell dir="ltr">{worker.id}</TableCell>
                        <TableCell>{worker.isOnline ? 'متصل' : 'غير متصل'}</TableCell>
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
                                            سيتم حذف العامل "{worker.name}" بشكل نهائي. لا يمكن التراجع عن هذا الإجراء.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => deleteWorker(worker.id)}>حذف</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </TableCell>
                        </TableRow>
                    ))}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
