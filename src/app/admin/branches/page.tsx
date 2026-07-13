
"use client";

import { useState } from 'react';
import { useBranches } from '@/hooks/useBranches';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, PlusCircle, MapPin, Building2, Loader2, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function AdminBranchesPage() {
    const { branches, isLoading, addBranch, deleteBranch } = useBranches();
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    const handleAdd = async () => {
        if (!name || !location) return;
        setIsSaving(true);
        await addBranch(name, location);
        setName("");
        setLocation("");
        setIsSaving(false);
    }

    const enterBranch = (id: string) => {
        // نفتح رابط الفرع في نافذة جديدة أو نغير الفرع في اللوحة الحالية
        window.location.href = `/admin?branch=${id}`;
        toast({ title: "جاري الانتقال للفرع..." });
    }

    if (isLoading) return <div className="p-8 text-center animate-pulse font-black text-primary">جارِ تحميل الفروع...</div>;

    return (
        <div className="space-y-8">
            <header>
                <h1 className="text-4xl font-black text-primary">إدارة الفروع</h1>
                <p className="text-muted-foreground font-bold">إنشاء فروع جديدة وتخصيص مناطق عملها.</p>
            </header>

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1 rounded-[2rem] border-none shadow-xl bg-white p-6">
                    <CardHeader className="p-0 mb-6">
                        <CardTitle className="text-xl font-black flex items-center gap-2"><PlusCircle className="text-primary"/> إضافة فرع جديد</CardTitle>
                    </CardHeader>
                    <div className="space-y-4">
                        <div className="space-y-1">
                            <Label className="font-bold text-xs">اسم الفرع</Label>
                            <Input value={name} onChange={(e)=>setName(e.target.value)} placeholder="مثال: فرع القاسم" className="h-12 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold text-xs">المنطقة الجغرافية</Label>
                            <div className="relative">
                                <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                                <Input value={location} onChange={(e)=>setLocation(e.target.value)} placeholder="اسم المدينة" className="pr-10 h-12 rounded-xl" />
                            </div>
                        </div>
                        <Button onClick={handleAdd} className="w-full h-14 rounded-2xl text-lg font-black" disabled={isSaving}>
                            {isSaving ? <Loader2 className="animate-spin h-5 w-5"/> : "تأسيس الفرع"}
                        </Button>
                    </div>
                </Card>

                <Card className="md:col-span-2 rounded-[2rem] border-none shadow-xl overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="font-black">اسم الفرع</TableHead>
                                <TableHead className="font-black">الموقع</TableHead>
                                <TableHead className="font-black text-center">إجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {branches.map((b) => (
                                <TableRow key={b.id}>
                                    <TableCell className="font-bold flex items-center gap-2">
                                        <div className="p-2 bg-primary/5 rounded-lg"><Building2 className="h-4 w-4 text-primary"/></div>
                                        {b.name}
                                    </TableCell>
                                    <TableCell className="font-bold text-muted-foreground">{b.locationName}</TableCell>
                                    <TableCell>
                                        <div className="flex justify-center gap-2">
                                            <Button variant="outline" size="sm" className="rounded-xl font-bold gap-2" onClick={() => enterBranch(b.id)}>
                                                <ExternalLink className="h-4 w-4"/> دخول اللوحة
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-destructive" onClick={() => deleteBranch(b.id)}>
                                                <Trash2 className="h-4 w-4"/>
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </div>
    );
}
