
"use client";

import { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus, Search, Trash2, PackageOpen, Loader2, Info, Edit3, Eye, EyeOff, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, cn } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import type { ProductSize } from '@/lib/types';

export default function RestaurantProductsPage({ onBack }: { onBack: () => void }) {
    const context = useContext(RestaurantContext);
    const { products, addProduct, updateProduct, deleteProduct, isLoading: pLoading } = useProducts();
    const { toast } = useToast();

    const [isDialogOpen, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentP, setCurrentP] = useState({ 
        id: '', 
        name: '', 
        description: '', 
        price: 0, 
        image: '', 
        categoryId: 'cat1', 
        stock: 10, 
        isActive: true, 
        isUnlimitedStock: false,
        sizes: [] as ProductSize[]
    });
    const fileRef = useRef<HTMLInputElement>(null);

    const myProducts = useMemo(() => {
        if (!context?.restaurant || !products) return [];
        return products.filter(p => p.restaurantId === context.restaurant?.id);
    }, [context?.restaurant, products]);

    const filteredMyProducts = myProducts.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));

    const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            const r = new FileReader();
            r.onloadend = () => setCurrentP({ ...currentP, image: r.result as string });
            r.readAsDataURL(f);
        }
    };

    const handleOpenEdit = (product: any) => {
        setIsEditing(true);
        setCurrentP({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: product.price || 0,
            image: product.image,
            categoryId: product.categoryId,
            stock: product.stock || 0,
            isActive: product.isActive ?? true,
            isUnlimitedStock: product.isUnlimitedStock ?? false,
            sizes: product.sizes || []
        });
        setIsAdding(true);
    };

    const handleAddSize = () => {
        const sizes = [...currentP.sizes];
        sizes.push({ name: '', price: 0, stock: 0 });
        setCurrentP({ ...currentP, sizes });
    }

    const handleRemoveSize = (idx: number) => {
        const sizes = [...currentP.sizes];
        sizes.splice(idx, 1);
        setCurrentP({ ...currentP, sizes });
    }

    const handleSizeChange = (idx: number, field: keyof ProductSize, val: any) => {
        const sizes = [...currentP.sizes];
        sizes[idx] = { ...sizes[idx], [field]: val };
        setCurrentP({ ...currentP, sizes });
    }

    const handleToggleVisibility = async (product: any) => {
        try {
            await updateProduct({ ...product, isActive: !product.isActive }, false);
            toast({ title: product.isActive ? "تم إخفاء المنتج" : "تم تفعيل عرض المنتج" });
        } catch (e) {}
    };

    const handleSave = async () => {
        if (!currentP.name || !currentP.image) {
            toast({ title: "بيانات ناقصة", variant: "destructive" });
            return;
        }

        const hasSizes = currentP.sizes.length > 0;
        if (!hasSizes && !currentP.price) {
             toast({ title: "السعر مطلوب", variant: "destructive" });
             return;
        }

        const dataToSave = {
            ...currentP,
            price: Number(currentP.price),
            stock: currentP.isUnlimitedStock ? 999999 : Number(currentP.stock),
            sizes: currentP.sizes.map(s => ({ ...s, price: Number(s.price), stock: Number(s.stock) }))
        };

        if (isEditing) {
            await updateProduct(dataToSave as any, true);
        } else {
            await addProduct({ ...dataToSave, restaurantId: context!.restaurant!.id, status: 'pending' } as any, true);
        }

        setIsAdding(false);
        setIsEditing(false);
        setCurrentP({ id: '', name: '', description: '', price: 0, image: '', categoryId: 'cat1', stock: 10, isActive: true, isUnlimitedStock: false, sizes: [] });
    };

    if (!context?.restaurant || pLoading) return <div className="flex h-screen w-full items-center justify-center"><Loader2 className="animate-spin h-10 w-10 text-primary" /></div>;

    return (
        <div className="flex flex-col min-h-full bg-background pb-40 text-right">
            <header className="p-4 bg-white border-b shadow-sm flex items-center gap-4 sticky top-0 z-50">
                <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl h-10 w-10">
                    <ArrowRight className="h-5 w-5"/>
                </Button>
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary leading-none">منيو المتجر</h1>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">إدارة العناصر</p>
                </div>
                <Button onClick={() => { setIsEditing(false); setCurrentP({...currentP, sizes: []}); setIsAdding(true); }} className="mr-auto rounded-xl h-10 px-4 font-black">
                    <Plus className="ml-1 h-4 w-4"/> إضافة
                </Button>
            </header>

            <main className="p-4 space-y-6 container mx-auto max-w-6xl">
                <div className="bg-primary/5 p-4 rounded-2xl flex items-start gap-3 border border-primary/10">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] font-bold text-primary leading-relaxed">
                        يمكنك الآن إضافة أحجام مختلفة لكل منتج (مثلاً: ربع، نصف، كامل) بأسعار وكميات مخزن مستقلة.
                    </p>
                </div>

                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="بحث سريع في المنتجات..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="pr-10 h-11 rounded-xl bg-white border-2 border-muted" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredMyProducts.map(p => (
                        <Card key={p.id} className={cn("rounded-2xl border-none shadow-md overflow-hidden bg-white transition-all hover:shadow-lg", !(p.isActive ?? true) && "grayscale opacity-70")}>
                            <div className="relative aspect-video">
                                <Image src={p.image || 'https://placehold.co/100x60.png'} fill className="object-cover" alt={p.name} unoptimized={true} />
                                <div className="absolute top-1 left-1 flex flex-col gap-1">
                                    <Badge className={cn("rounded-lg text-[8px] px-1.5 py-0", p.status === 'approved' ? "bg-green-500" : "bg-orange-500")}>
                                        {p.status === 'approved' ? 'نشط' : 'معلق'}
                                    </Badge>
                                    {!(p.isActive ?? true) && <Badge className="bg-destructive rounded-lg text-[8px] px-1.5 py-0">مخفي</Badge>}
                                </div>
                            </div>
                            <div className="p-3 text-right space-y-2">
                                <h3 className="font-black text-sm truncate leading-none">{p.name}</h3>
                                <div className="font-black text-primary text-xs">
                                     {p.sizes && p.sizes.length > 0 ? (
                                         <span>تبدأ من {formatCurrency(Math.min(...p.sizes.map((s:any)=>s.price)))}</span>
                                     ) : formatCurrency(p.price)}
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-muted">
                                    <div className="flex gap-1">
                                        <button className="p-2 text-primary bg-primary/5 rounded-lg" onClick={() => handleOpenEdit(p)}>
                                            <Edit3 className="h-4 w-4"/>
                                        </button>
                                        <button className={cn("p-2 rounded-lg", (p.isActive ?? true) ? "text-orange-500 bg-orange-50" : "text-green-500 bg-green-50")} onClick={() => handleToggleVisibility(p)}>
                                            {(p.isActive ?? true) ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                                        </button>
                                        <button className="p-2 text-destructive bg-destructive/5 rounded-lg" onClick={() => deleteProduct(p.id)}>
                                            <Trash2 className="h-4 w-4"/>
                                        </button>
                                    </div>
                                    <span className="text-[8px] font-black text-muted-foreground">
                                        {p.sizes?.length > 0 ? `${p.sizes.length} أحجام` : `المخزن: ${p.stock}`}
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </main>

            <Dialog open={isDialogOpen} onOpenChange={setIsAdding}>
                <DialogContent className="sm:max-w-md rounded-[2.5rem] max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle className="text-2xl font-black text-right">{isEditing ? 'تعديل المنتج' : 'إضافة منتج جديد'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 py-4 text-right">
                        <div className="space-y-1">
                            <Label className="font-bold">اسم المنتج</Label>
                            <Input value={currentP.name} onChange={(e)=>setCurrentP({...currentP, name: e.target.value})} className="h-11 rounded-xl" />
                        </div>

                         <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border">
                            <div className="flex justify-between items-center">
                                 <Label className="font-black">الأحجام والأسعار</Label>
                                 <Button variant="outline" size="sm" onClick={handleAddSize} className="rounded-lg h-8 text-xs font-bold gap-1">
                                     <Plus className="h-3 w-3"/> إضافة حجم
                                 </Button>
                            </div>
                            {currentP.sizes.length > 0 ? (
                                <div className="space-y-2">
                                    {currentP.sizes.map((s, i) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <Input placeholder="الاسم" value={s.name} onChange={(e)=>handleSizeChange(i, 'name', e.target.value)} className="h-9 text-xs rounded-lg flex-1" />
                                            <Input type="number" placeholder="السعر" value={s.price || ''} onChange={(e)=>handleSizeChange(i, 'price', e.target.value)} className="h-9 text-xs rounded-lg w-20" />
                                            <Input type="number" placeholder="مخزن" value={s.stock || ''} onChange={(e)=>handleSizeChange(i, 'stock', e.target.value)} className="h-9 text-xs rounded-lg w-16" />
                                            <Button variant="ghost" size="icon" onClick={()=>handleRemoveSize(i)} className="text-destructive h-8 w-8"><X className="h-4 w-4"/></Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold">السعر الفردي</Label>
                                        <Input type="number" value={currentP.price || ''} onChange={(e)=>setCurrentP({...currentP, price: parseFloat(e.target.value) || 0})} className="h-11 rounded-xl" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[10px] font-bold">الكمية</Label>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="number" 
                                                disabled={currentP.isUnlimitedStock} 
                                                value={currentP.isUnlimitedStock ? '' : (currentP.stock || '')} 
                                                onChange={(e)=>setCurrentP({...currentP, stock: parseInt(e.target.value) || 0})} 
                                                className="h-11 rounded-xl" 
                                            />
                                            <Switch checked={currentP.isUnlimitedStock} onCheckedChange={(v)=>setCurrentP({...currentP, isUnlimitedStock: v})} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label className="font-bold">وصف قصير</Label>
                            <Input value={currentP.description} onChange={(e)=>setCurrentP({...currentP, description: e.target.value})} className="h-11 rounded-xl" />
                        </div>
                        <div className="space-y-1">
                            <Label className="font-bold">الصورة</Label>
                            <Button variant="outline" className="w-full h-11 rounded-xl border-dashed font-bold" onClick={()=>fileRef.current?.click()}>تغيير الصورة</Button>
                            <input type="file" ref={fileRef} className="hidden" onChange={handleImg} accept="image/*" />
                            {currentP.image && <div className="relative h-24 w-full mx-auto mt-2"><Image src={currentP.image} fill className="object-contain rounded-xl border" alt="preview" unoptimized={true}/></div>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleSave} className="w-full h-14 rounded-2xl text-lg font-black shadow-lg">
                            {isEditing ? 'حفظ التعديلات' : 'إرسال للموافقة'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
