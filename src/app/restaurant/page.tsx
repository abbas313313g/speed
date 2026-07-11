
"use client";

import { useContext, useMemo, useState, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useOrders } from '@/hooks/useOrders';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { LogOut, Loader2, PackageOpen, Plus, Search, Trash2, BellRing } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

export default function RestaurantDashboardPage({ onNavigate }: { onNavigate: (tab: number) => void }) {
    const context = useContext(RestaurantContext);
    const { allOrders, isLoading: oLoading } = useOrders();
    const { products, addProduct, deleteProduct, isLoading: pLoading } = useProducts();
    const { toast } = useToast();

    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [notifEnabled, setNotifEnabled] = useState(false);
    const [newP, setNewP] = useState({ name: '', description: '', price: 0, image: '', categoryId: 'cat1', stock: 10 });
    const fileRef = useRef<HTMLInputElement>(null);

    const myOrders = useMemo(() => {
        if (!context?.restaurant || !allOrders) return [];
        return allOrders.filter(o => o.restaurant?.id === context.restaurant?.id);
    }, [context?.restaurant, allOrders]);

    const myProducts = useMemo(() => {
        if (!context?.restaurant || !products) return [];
        return products.filter(p => p.restaurantId === context.restaurant?.id);
    }, [context?.restaurant, products]);

    const filteredMyProducts = myProducts.filter(p => p.name.includes(searchTerm));

    const totalWallet = useMemo(() => {
        const delivered = myOrders.filter(o => o.status === 'delivered' && !o.isPaid);
        const total = delivered.reduce((acc, o) => acc + (o.total - o.deliveryFee), 0);
        const commission = (total * (context?.restaurant?.commissionRate || 0)) / 100;
        return total - commission;
    }, [myOrders, context?.restaurant]);

    const requestNotif = async () => {
        if (!("Notification" in window)) {
            toast({ title: "المتصفح لا يدعم التنبيهات", variant: "destructive" });
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            setNotifEnabled(true);
            new Notification("سبيد شوب", { body: "تم تفعيل التنبيهات الخارجية بنجاح!" });
            toast({ title: "تم تفعيل التنبيهات بنجاح" });
        }
    };

    const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            const r = new FileReader();
            r.onloadend = () => setNewP({ ...newP, image: r.result as string });
            r.readAsDataURL(f);
        }
    };

    const handleSave = async () => {
        if (!newP.name || !newP.price || !newP.image) return;
        await addProduct({ ...newP, restaurantId: context!.restaurant!.id, status: 'pending' }, true);
        setIsAdding(false);
        setNewP({ name: '', description: '', price: 0, image: '', categoryId: 'cat1', stock: 10 });
    };

    if (!context?.restaurant || oLoading || pLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="flex flex-col min-h-screen bg-muted/10 pb-40">
            <header className="p-4 bg-white border-b shadow-sm flex justify-between items-center sticky top-0 z-50">
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary">{context.restaurant.name}</h1>
                    <p className="text-[10px] font-bold text-muted-foreground">محفظتك: {formatCurrency(totalWallet)}</p>
                </div>
                <div className="flex gap-2">
                    <Button 
                        variant={notifEnabled ? "secondary" : "outline"} 
                        size="icon" 
                        className={cn("rounded-xl h-10 w-10", notifEnabled && "bg-green-100 text-green-600")} 
                        onClick={requestNotif}
                    >
                        <BellRing className="h-5 w-5"/>
                    </Button>
                    <Button variant="outline" size="sm" className="rounded-xl h-10 font-bold" onClick={()=>onNavigate(2)}>السجل</Button>
                    <Button variant="ghost" size="icon" onClick={context.logout} className="text-destructive"><LogOut className="h-5 w-5"/></Button>
                </div>
            </header>

            <main className="p-4 space-y-8">
                <section className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-xl font-black flex items-center gap-2"><PackageOpen className="text-primary"/> منيو المتجر</h2>
                        <Button onClick={()=>setIsAdding(true)} className="rounded-xl h-11"><Plus className="ml-1 h-5 w-5"/> إضافة</Button>
                    </div>
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="بحث في منتجاتك..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="pr-10 h-11 rounded-xl bg-white border-none shadow-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {filteredMyProducts.map(p => (
                            <Card key={p.id} className="rounded-2xl border-none shadow-md overflow-hidden bg-white">
                                <div className="relative aspect-square">
                                    <Image src={p.image} fill className="object-cover" alt={p.name} unoptimized={true} />
                                    <Badge className={cn("absolute top-2 left-2 rounded-lg", p.status === 'approved' ? "bg-green-500" : "bg-orange-500")}>
                                        {p.status === 'approved' ? 'نشط' : 'معلق'}
                                    </Badge>
                                </div>
                                <div className="p-3 text-right">
                                    <h3 className="font-bold text-sm truncate">{p.name}</h3>
                                    <div className="font-black text-primary text-xs mt-1">{formatCurrency(p.price)}</div>
                                    <div className="flex justify-between items-center mt-2 pt-2 border-t">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={()=>deleteProduct(p.id)}><Trash2 className="h-4 w-4"/></Button>
                                        <span className="text-[10px] font-bold text-muted-foreground">المخزن: {p.stock}</span>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </section>
            </main>

            <Dialog open={isAdding} onOpenChange={setIsAdding}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem]">
                    <DialogHeader><DialogTitle className="text-2xl font-black">إضافة منتج جديد</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4 text-right">
                        <div className="space-y-1">
                            <Label className="font-bold">اسم المنتج</Label>
                            <Input value={newP.name} onChange={(e)=>setNewP({...newP, name: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">السعر</Label>
                            <Input type="number" value={newP.price || ''} onChange={(e)=>setNewP({...newP, price: parseFloat(e.target.value) || 0})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">الكمية المتوفرة</Label>
                            <Input type="number" value={newP.stock || ''} onChange={(e)=>setNewP({...newP, stock: parseInt(e.target.value) || 0})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">صورة المنتج</Label>
                            <div className="flex gap-2">
                                <Button variant="outline" className="w-full h-11 rounded-xl border-dashed" onClick={()=>fileRef.current?.click()}>ارفع صورة المنتج</Button>
                                <input type="file" ref={fileRef} className="hidden" onChange={handleImg} accept="image/*" />
                            </div>
                            {newP.image && <div className="relative h-20 w-20 mx-auto mt-2"><Image src={newP.image} fill className="object-cover rounded-xl" alt="preview" unoptimized={true}/></div>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSave} className="w-full h-14 rounded-2xl text-lg font-black shadow-lg">إرسال للموافقة</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
