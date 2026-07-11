"use client";

import { useContext, useMemo, useState, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus, Search, Trash2, PackageOpen, Loader2, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatCurrency, cn } from '@/lib/utils';
import Image from 'next/image';

export default function RestaurantProductsPage({ onBack }: { onBack: () => void }) {
    const context = useContext(RestaurantContext);
    const { products, addProduct, deleteProduct, isLoading: pLoading } = useProducts();

    const [isAdding, setIsAdding] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [newP, setNewP] = useState({ name: '', description: '', price: 0, image: '', categoryId: 'cat1', stock: 10 });
    const fileRef = useRef<HTMLInputElement>(null);

    const myProducts = useMemo(() => {
        if (!context?.restaurant || !products) return [];
        return products.filter(p => p.restaurantId === context.restaurant?.id);
    }, [context?.restaurant, products]);

    const filteredMyProducts = myProducts.filter(p => (p.name || '').includes(searchTerm));

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

    if (!context?.restaurant || pLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="flex flex-col min-h-screen bg-background pb-40">
            <header className="p-4 bg-white border-b shadow-sm flex items-center gap-4 sticky top-0 z-50">
                <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl h-10 w-10">
                    <ArrowRight className="h-5 w-5"/>
                </Button>
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary leading-none">منيو المتجر</h1>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">إضافة وتعديل المنتجات</p>
                </div>
                <Button onClick={()=>setIsAdding(true)} className="mr-auto rounded-xl h-10 px-4 font-black">
                    <Plus className="ml-1 h-4 w-4"/> إضافة منتج
                </Button>
            </header>

            <main className="p-4 space-y-6">
                <div className="bg-primary/5 p-4 rounded-2xl flex items-start gap-3 border border-primary/10">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-primary leading-relaxed">
                        ملاحظة: أي منتج جديد أو تعديل ستقوم به سيظهر بوضع "معلق" حتى يقوم الأدمن بالموافقة عليه لضمان الجودة.
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="بحث سريع في المنيو..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="pr-10 h-11 rounded-xl bg-white border-2 border-muted" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {filteredMyProducts.map(p => (
                        <Card key={p.id} className="rounded-2xl border-none shadow-md overflow-hidden bg-white group active:scale-95 transition-all">
                            <div className="relative aspect-video">
                                <Image src={p.image || 'https://placehold.co/100x60.png'} fill className="object-cover" alt={p.name} unoptimized={true} />
                                <Badge className={cn("absolute top-1 left-1 rounded-lg text-[8px] px-1.5 py-0", p.status === 'approved' ? "bg-green-500" : "bg-orange-500")}>
                                    {p.status === 'approved' ? 'نشط' : 'معلق'}
                                </Badge>
                            </div>
                            <div className="p-2 text-right space-y-1">
                                <h3 className="font-black text-[11px] truncate leading-none">{p.name}</h3>
                                <div className="font-black text-primary text-[10px]">{formatCurrency(p.price)}</div>
                                <div className="flex justify-between items-center pt-1 border-t border-muted">
                                    <button className="p-1.5 text-destructive bg-destructive/5 rounded-lg" onClick={()=>deleteProduct(p.id)}>
                                        <Trash2 className="h-3.5 w-3.5"/>
                                    </button>
                                    <span className="text-[8px] font-black text-muted-foreground">المخزن: {p.stock}</span>
                                </div>
                            </div>
                        </Card>
                    ))}
                    {filteredMyProducts.length === 0 && (
                        <div className="col-span-2 text-center py-20 opacity-40">
                             <PackageOpen className="h-16 w-16 mx-auto mb-2" />
                             <p className="font-black">لا يوجد منتجات</p>
                        </div>
                    )}
                </div>
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
                                <Button variant="outline" className="w-full h-11 rounded-xl border-dashed font-bold" onClick={()=>fileRef.current?.click()}>ارفع صورة المنتج</Button>
                                <input type="file" ref={fileRef} className="hidden" onChange={handleImg} accept="image/*" />
                            </div>
                            {newP.image && <div className="relative h-20 w-20 mx-auto mt-2"><Image src={newP.image} fill className="object-cover rounded-xl" alt="preview" unoptimized={true}/></div>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSave} className="w-full h-14 rounded-2xl text-lg font-black shadow-lg">إرسال للموافقة والنشـر</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}