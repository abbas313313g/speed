
"use client";

import { useContext, useMemo, useState, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus, Search, Trash2, Loader2, Edit3, Upload, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, cn, compressImage } from '@/lib/utils';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import type { ProductSize } from '@/lib/types';

export default function RestaurantProductsPage({ onBack }: { onBack: () => void }) {
    const context = useContext(RestaurantContext);
    const { toast } = useToast();
    
    const { products, addProduct, updateProduct, deleteProduct, isLoading: pLoading } = useProducts(undefined, context?.restaurant?.id);

    const [isDialogOpen, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [currentP, setCurrentP] = useState({ 
        id: '', name: '', description: '', price: 0, image: '', categoryId: '', 
        storeSectionId: '', stock: 10, isActive: true, isUnlimitedStock: false, sizes: [] as ProductSize[]
    });
    const fileRef = useRef<HTMLInputElement>(null);

    const filteredMyProducts = useMemo(() => {
        return products.filter(p => (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    }, [products, searchTerm]);

    const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setIsCompressing(true);
            const reader = new FileReader();
            reader.onloadend = async () => {
                const compressed = await compressImage(reader.result as string);
                setCurrentP({ ...currentP, image: compressed });
                setIsCompressing(false);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!currentP.name || !currentP.image) {
            toast({ title: "بيانات ناقصة", description: "الرجاء إكمال الاسم والصورة", variant: "destructive" });
            return;
        }
        
        setIsProcessing(true);
        try {
            if (isEditing) {
                await updateProduct(currentP as any);
            } else {
                await addProduct({ 
                    ...currentP, 
                    restaurantId: context!.restaurant!.id,
                    categoryId: context!.restaurant!.categoryId,
                    branchId: context!.restaurant!.branchId
                } as any, true);
            }
            setIsAdding(false);
        } catch (e) {} finally {
            setIsProcessing(false);
        }
    };

    if (!context?.restaurant || pLoading) return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
    );

    return (
        <div className="flex flex-col min-h-full bg-background pb-40 text-right">
            <header className="p-4 bg-white border-b shadow-sm flex items-center gap-4 sticky top-0 z-50">
                <Button variant="outline" size="icon" onClick={onBack} className="rounded-xl h-10 w-10"><ArrowRight className="h-5 w-5"/></Button>
                <div className="text-right">
                    <h1 className="text-xl font-black text-primary leading-none">منيو المتجر</h1>
                    <p className="text-[10px] font-bold text-muted-foreground mt-1">إدارة وجباتك المتاحة للزبائن</p>
                </div>
                <Button onClick={() => { setIsEditing(false); setCurrentP({...currentP, id: '', sizes: []}); setIsAdding(true); }} className="mr-auto rounded-xl h-10 px-4 font-black">إضافة وجبة</Button>
            </header>

            <main className="p-4 space-y-6">
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="بحث في المنيو..." value={searchTerm} onChange={(e)=>setSearchTerm(e.target.value)} className="pr-10 h-11 rounded-xl bg-white border-2" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {filteredMyProducts.length > 0 ? filteredMyProducts.map(p => (
                        <Card key={p.id} className={cn("rounded-2xl border-none shadow-md overflow-hidden bg-white", !(p.isActive ?? true) && "opacity-50 grayscale")}>
                            <div className="relative aspect-video bg-muted/10">
                                <Image src={p.image} fill className="object-cover" alt="" unoptimized={true} decoding="async" />
                            </div>
                            <div className="p-3 text-right space-y-2">
                                <h3 className="font-black text-xs truncate">{p.name}</h3>
                                <div className="font-black text-primary text-[10px]">{formatCurrency(p.price)}</div>
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <div className="flex gap-1">
                                        <button className="p-2 text-primary bg-primary/5 rounded-lg" onClick={() => { setIsEditing(true); setCurrentP(p as any); setIsAdding(true); }}><Edit3 className="h-3.5 w-3.5"/></button>
                                        <button className="p-2 text-destructive bg-destructive/5 rounded-lg" onClick={() => deleteProduct(p.id)}><Trash2 className="h-3.5 w-3.5"/></button>
                                    </div>
                                    <Switch checked={p.isActive ?? true} onCheckedChange={(v) => updateProduct({ id: p.id, isActive: v } as any)} className="scale-75" />
                                </div>
                            </div>
                        </Card>
                    )) : (
                        <div className="col-span-2 py-20 text-center text-muted-foreground font-bold italic">لا توجد منتجات مضافة حالياً.</div>
                    )}
                </div>
            </main>

            <Dialog open={isDialogOpen} onOpenChange={setIsAdding}>
                <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
                    <DialogHeader className="p-4"><DialogTitle className="text-2xl font-black text-right">{isEditing ? 'تعديل الوجبة' : 'إضافة وجبة'}</DialogTitle></DialogHeader>
                    <div className="space-y-4 p-4 text-right">
                        <div className="space-y-1"><Label>اسم الوجبة</Label><Input value={currentP.name} onChange={(e)=>setCurrentP({...currentP, name: e.target.value})} className="h-11 rounded-xl" /></div>
                        <div className="space-y-2">
                            <Label>صورة الوجبة (ضغط تلقائي ⚡)</Label>
                            <Button type="button" variant="outline" className="w-full h-12 rounded-xl" onClick={()=>fileRef.current?.click()} disabled={isCompressing}>
                                {isCompressing ? <Loader2 className="animate-spin h-4 w-4 ml-2"/> : <Upload className="h-4 w-4 ml-2"/>}
                                {isCompressing ? "جاري ضغط الصورة..." : "ارفع صورة"}
                            </Button>
                            <input type="file" ref={fileRef} className="hidden" onChange={handleImg} accept="image/*" />
                            {currentP.image && <div className="relative aspect-video rounded-xl overflow-hidden mt-2 border"><Image src={currentP.image} fill className="object-cover" alt="preview" unoptimized={true}/></div>}
                        </div>
                        <div className="space-y-1"><Label>السعر</Label><Input type="number" value={currentP.price || ''} onChange={(e)=>setCurrentP({...currentP, price: parseFloat(e.target.value)})} className="h-11 rounded-xl" /></div>
                    </div>
                    <DialogFooter className="p-4">
                        <Button onClick={handleSave} disabled={isProcessing || isCompressing} className="w-full h-14 rounded-2xl text-lg font-black shadow-xl">
                            {isProcessing ? <Loader2 className="animate-spin h-5 w-5" /> : (isEditing ? 'حفظ التعديلات' : 'نشر الوجبة')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
