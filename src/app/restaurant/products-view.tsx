
"use client";

import { useContext, useMemo, useState, useRef, useEffect } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus, Search, Trash2, PackageOpen, Loader2, Info, Edit3, Eye, EyeOff, X, Upload, Tag } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
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
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 800000) {
                toast({ title: "الصورة كبيرة", description: "يرجى اختيار صورة أصغر من 800 كيلوبايت.", variant: "destructive" });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => setCurrentP({ ...currentP, image: reader.result as string });
            reader.readAsDataURL(file);
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
            sizes: (product.sizes || []).map((s: any) => ({ ...s, isActive: s.isActive ?? true, isUnlimited: s.isUnlimited ?? false }))
        });
        setIsAdding(true);
    };

    const handleSave = async () => {
        if (!currentP.name || !currentP.image) {
            toast({ title: "بيانات ناقصة", variant: "destructive" });
            return;
        }

        const dataToSave = {
            ...currentP,
            price: Number(currentP.price),
            stock: currentP.isUnlimitedStock ? 999999 : Number(currentP.stock),
            sizes: currentP.sizes.map(s => ({ ...s, price: Number(s.price), stock: s.isUnlimited ? 999999 : Number(s.stock) }))
        };

        if (isEditing) {
            await updateProduct(dataToSave as any, false);
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
                <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl h-10 w-10"><ArrowRight className="h-5 w-5"/></Button>
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary leading-none">منيو المتجر</h1>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">رفع الصور مباشرة للجهاز</p>
                </div>
                <Button onClick={() => { setIsEditing(false); setCurrentP({...currentP, sizes: []}); setIsAdding(true); }} className="mr-auto rounded-xl h-10 px-4 font-black">إضافة وجبة</Button>
            </header>

            <main className="p-4 space-y-6 container mx-auto max-w-6xl">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="بحث سريع..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="pr-10 h-11 rounded-xl bg-white border-2 border-muted" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {filteredMyProducts.map(p => (
                        <Card key={p.id} className={cn("rounded-2xl border-none shadow-md overflow-hidden bg-white transition-all hover:shadow-lg", !(p.isActive ?? true) && "grayscale opacity-70")}>
                            <div className="relative aspect-video">
                                <Image src={p.image} fill className="object-cover" alt="" unoptimized={true} />
                            </div>
                            <div className="p-3 text-right space-y-2">
                                <h3 className="font-black text-sm truncate">{p.name}</h3>
                                <div className="font-black text-primary text-xs">{formatCurrency(p.price)}</div>
                                <div className="flex justify-between items-center pt-2 border-t border-muted">
                                    <div className="flex gap-1">
                                        <button className="p-2 text-primary bg-primary/5 rounded-lg" onClick={() => handleOpenEdit(p)}><Edit3 className="h-4 w-4"/></button>
                                        <button className="p-2 text-destructive bg-destructive/5 rounded-lg" onClick={() => deleteProduct(p.id)}><Trash2 className="h-4 w-4"/></button>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </main>

            <Dialog open={isDialogOpen} onOpenChange={setIsAdding}>
                <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden">
                    <DialogHeader className="p-6 border-b bg-card shrink-0">
                        <DialogTitle className="text-2xl font-black text-right text-primary">{isEditing ? 'تعديل الوجبة' : 'إضافة وجبة جديدة'}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="flex-1 overflow-y-auto p-6 text-right space-y-6 pb-20">
                        <div className="space-y-1">
                            <Label className="font-bold">اسم الوجبة</Label>
                            <Input value={currentP.name} onChange={(e)=>setCurrentP({...currentP, name: e.target.value})} className="h-11 rounded-xl" />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold">صورة الوجبة (رفع من الجهاز)</Label>
                            <Button type="button" variant="outline" className="w-full h-14 rounded-xl font-black gap-2 border-primary/40 text-primary" onClick={()=>fileRef.current?.click()}>
                                <Upload className="h-5 w-5" /> اختر الصورة
                            </Button>
                            <input type="file" ref={fileRef} className="hidden" onChange={handleImg} accept="image/*" />
                            {currentP.image && (
                                <div className="relative w-full aspect-video rounded-3xl overflow-hidden border-2 border-muted bg-muted/10 mt-4">
                                    <Image src={currentP.image} fill className="object-contain" alt="preview" unoptimized={true}/>
                                </div>
                            )}
                        </div>

                        <div className="space-y-1">
                            <Label className="font-bold">السعر (IQD)</Label>
                            <Input type="number" value={currentP.price || ''} onChange={(e)=>setCurrentP({...currentP, price: parseFloat(e.target.value) || 0})} className="h-11 rounded-xl font-black text-primary" />
                        </div>
                         
                        <div className="space-y-1">
                            <Label className="font-bold">الوصف</Label>
                            <Textarea value={currentP.description} onChange={(e)=>setCurrentP({...currentP, description: e.target.value})} className="h-24 rounded-xl" />
                        </div>
                    </div>

                    <DialogFooter className="p-6 bg-card border-t shrink-0">
                        <Button onClick={handleSave} className="w-full h-16 rounded-[1.8rem] text-xl font-black shadow-xl">
                            {isEditing ? 'حفظ التعديلات' : 'إرسال للمراجعة'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
