
"use client";

import { useContext, useMemo, useState, useRef } from 'react';
import { RestaurantContext } from '@/contexts/RestaurantContext';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { ArrowRight, Plus, Search, Trash2, Loader2, Edit3, Upload, X, PlusCircle, Infinity } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

const EMPTY_P = { 
    id: '', name: '', description: '', price: 0, image: '', categoryId: '', 
    storeSectionId: '', stock: 10, isActive: true, isUnlimitedStock: false, sizes: [] as ProductSize[]
};

export default function RestaurantProductsPage({ onBack }: { onBack: () => void }) {
    const context = useContext(RestaurantContext);
    const { toast } = useToast();
    
    const { products, addProduct, updateProduct, deleteProduct, isLoading: pLoading } = useProducts(undefined, context?.restaurant?.id, 1000, undefined, '', true);

    const [isDialogOpen, setIsAdding] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [isCompressing, setIsCompressing] = useState(false);
    const [currentP, setCurrentP] = useState({ ...EMPTY_P });
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

    const handleSizeChange = (index: number, field: keyof ProductSize, value: any) => {
        const newSizes = [...(currentP.sizes || [])];
        newSizes[index] = { ...newSizes[index], [field]: value };
        setCurrentP({ ...currentP, sizes: newSizes });
    };

    const addSize = () => {
        setCurrentP({ 
            ...currentP, 
            sizes: [...(currentP.sizes || []), { name: '', price: 0, stock: 10, isUnlimited: false }] 
        });
    };

    const removeSize = (index: number) => {
        const newSizes = [...(currentP.sizes || [])];
        newSizes.splice(index, 1);
        setCurrentP({ ...currentP, sizes: newSizes });
    };

    const handleSave = async () => {
        const hasValidSizes = currentP.sizes && currentP.sizes.length > 0;
        const isBasePriceValid = (currentP.price || 0) > 0;

        if (!currentP.name || !currentP.image || (!isBasePriceValid && !hasValidSizes)) {
            toast({ title: "بيانات ناقصة", description: "الرجاء إكمال الاسم والصورة وتحديد سعر أو إضافة أنواع.", variant: "destructive" });
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
                <Button onClick={() => { setIsEditing(false); setCurrentP({...EMPTY_P}); setIsAdding(true); }} className="mr-auto rounded-xl h-10 px-4 font-black">إضافة وجبة</Button>
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
                                {p.status === 'pending' && <Badge className="absolute top-2 right-2 bg-orange-500 text-[8px] h-4 py-0">قيد المراجعة</Badge>}
                            </div>
                            <div className="p-3 text-right space-y-2">
                                <h3 className="font-black text-xs truncate">{p.name}</h3>
                                <div className="font-black text-primary text-[10px]">{p.sizes && p.sizes.length > 0 ? "متعدد الأحجام" : formatCurrency(p.price)}</div>
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
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-[2.5rem]">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="text-2xl font-black text-right">{isEditing ? 'تعديل الوجبة' : 'إضافة وجبة جديدة'}</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-6 p-4 text-right">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1 col-span-2">
                                <Label className="font-bold">اسم الوجبة</Label>
                                <Input value={currentP.name} onChange={(e)=>setCurrentP({...currentP, name: e.target.value})} className="h-12 rounded-xl font-bold" />
                            </div>
                            
                            <div className="space-y-1">
                                <Label className="font-bold">السعر الأساسي</Label>
                                <Input type="number" value={currentP.price || ''} onChange={(e)=>setCurrentP({...currentP, price: parseFloat(e.target.value) || 0})} className="h-12 rounded-xl font-black text-primary" />
                            </div>

                            <div className="space-y-1">
                                <Label className="font-bold">قسم المنيو</Label>
                                <Select value={currentP.storeSectionId} onValueChange={(val) => setCurrentP({...currentP, storeSectionId: val})}>
                                    <SelectTrigger className="h-12 rounded-xl">
                                        <SelectValue placeholder="اختر قسم..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {context?.restaurant?.menuSections?.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        {(!context?.restaurant?.menuSections || context.restaurant.menuSections.length === 0) && <SelectItem value="none" disabled>لا يوجد أقسام</SelectItem>}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-muted/20 rounded-2xl border-2 border-dashed">
                            <div className="space-y-0.5">
                                <Label className="font-black">كمية غير محدودة</Label>
                                <p className="text-[10px] text-muted-foreground font-bold">لن ينقص المخزن عند كل طلب.</p>
                            </div>
                            <Switch checked={currentP.isUnlimitedStock} onCheckedChange={(v) => setCurrentP({...currentP, isUnlimitedStock: v})} />
                        </div>

                        <Separator className="border-dashed" />

                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="font-black text-lg">الأحجام والأنواع (اختياري)</Label>
                                <Button type="button" variant="outline" size="sm" onClick={addSize} className="rounded-lg font-bold gap-1"><PlusCircle className="h-4 w-4"/> إضافة خيار</Button>
                            </div>
                            <div className="space-y-3">
                                {currentP.sizes?.map((size, index) => (
                                    <div key={index} className="flex flex-col bg-slate-50 p-4 rounded-2xl border gap-3">
                                        <div className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-4"><Input placeholder="الاسم (كبير)" value={size.name} onChange={(e)=>handleSizeChange(index, 'name', e.target.value)} className="h-10 rounded-lg text-xs" /></div>
                                            <div className="col-span-3"><Input type="number" placeholder="السعر" value={size.price || ''} onChange={(e)=>handleSizeChange(index, 'price', parseFloat(e.target.value))} className="h-10 rounded-lg text-xs font-black text-primary" /></div>
                                            <div className="col-span-3"><Input type="number" disabled={size.isUnlimited} placeholder="المخزن" value={size.stock || ''} onChange={(e)=>handleSizeChange(index, 'stock', parseInt(e.target.value))} className="h-10 rounded-lg text-xs font-bold" /></div>
                                            <div className="col-span-2 flex justify-end"><Button variant="ghost" size="icon" onClick={()=>removeSize(index)} className="text-destructive"><X className="h-4 w-4"/></Button></div>
                                        </div>
                                        <div className="flex items-center justify-between px-1">
                                            <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1"><Infinity className="h-3 w-3"/> كمية مفتوحة</span>
                                            <Switch checked={size.isUnlimited} onCheckedChange={(v) => handleSizeChange(index, 'isUnlimited', v)} className="scale-75" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold">صورة الوجبة (ضغط تلقائي ⚡)</Label>
                            <Button type="button" variant="outline" className="w-full h-14 rounded-xl border-dashed border-2" onClick={() => fileRef.current?.click()} disabled={isCompressing}>
                                {isCompressing ? <Loader2 className="animate-spin h-5 w-5 ml-2"/> : <Upload className="ml-2 h-4 w-4" />}
                                {isCompressing ? "جاري تحسين الصورة..." : "اختيار صورة"}
                            </Button>
                            <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleImg} />
                            {currentP.image && (
                                <div className="relative w-full aspect-video rounded-3xl overflow-hidden border border-muted mt-2 shadow-inner">
                                    <Image src={currentP.image} fill className="object-cover" alt="preview" unoptimized={true} />
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="p-4 bg-slate-50 border-t sticky bottom-0">
                        <Button onClick={handleSave} disabled={isProcessing || isCompressing} className="w-full h-16 rounded-2xl text-xl font-black shadow-2xl">
                            {isProcessing ? <Loader2 className="animate-spin h-6 w-6"/> : (isEditing ? "حفظ التعديلات" : "إرسال للنشر")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
