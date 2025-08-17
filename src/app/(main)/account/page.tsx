
"use client";

import { useContext, useState, useEffect } from "react";
import Link from "next/link";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, Phone, MapPin, LogOut, KeyRound, PlusCircle, Home, Mail, Loader2, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Address } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const context = useContext(AppContext);
  const { toast } = useToast();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [newAddressName, setNewAddressName] = useState("");
  const [newAddressLocation, setNewAddressLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  // Show loader while auth state is resolving OR if we have a user but their data hasn't loaded yet.
  if (context?.isAuthLoading || (context?.firebaseUser && !context?.user)) {
    return (
       <div className="flex h-[calc(100vh-8rem)] w-full flex-col items-center justify-center p-4">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <p className="mt-2 text-muted-foreground">جارِ جلب بيانات الحساب...</p>
       </div>
    );
  }

  // This should only be reachable if context.user is available.
  const { user, logout, addAddress } = context;
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : '?';

  const handleGetLocation = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
        (position) => {
            setNewAddressLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            });
            setIsLocating(false);
            toast({ title: "تم تحديد الموقع" });
        },
        () => {
            setIsLocating(false);
            toast({ title: "فشل تحديد الموقع", variant: "destructive" });
        },
        { enableHighAccuracy: true }
    );
  };
  
  const handleAddAddress = () => {
      if(newAddressName && newAddressLocation && addAddress){
          addAddress({
              name: newAddressName,
              ...newAddressLocation
          });
          setOpen(false);
          setNewAddressName("");
          setNewAddressLocation(null);
      } else {
          toast({ title: "الرجاء إدخال اسم الموقع وتحديده على الخريطة", variant: "destructive" });
      }
  }

  return (
    <div className="p-4 space-y-8">
      <header className="flex flex-col items-center space-y-4">
        <Avatar className="h-24 w-24 text-3xl">
            <AvatarFallback className="bg-primary text-primary-foreground">{userInitial}</AvatarFallback>
        </Avatar>
        <h1 className="text-2xl font-bold">{user.name}</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الحساب</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-lg">
           <div className="flex items-center gap-4">
                <User className="h-6 w-6 text-primary" />
                <span>{user.name}</span>
           </div>
            <div className="flex items-center gap-4">
                <Mail className="h-6 w-6 text-primary" />
                <span>{user.email}</span>
           </div>
           <div className="flex items-center gap-4">
                <Phone className="h-6 w-6 text-primary" />
                <span dir="ltr" className="text-left w-full">{user.phone}</span>
           </div>
           <div className="flex items-center gap-4">
                <MapPin className="h-6 w-6 text-primary" />
                <span>{user.deliveryZone.name}</span>
           </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <CardTitle>عناويني</CardTitle>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon"><PlusCircle className="h-5 w-5" /></Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>إضافة عنوان جديد</DialogTitle></DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="addressName">اسم العنوان (مثال: المنزل، العمل)</Label>
                        <Input id="addressName" value={newAddressName} onChange={e => setNewAddressName(e.target.value)} />
                    </div>
                    <div>
                        <Button onClick={handleGetLocation} disabled={isLocating} className="w-full">
                            {isLocating && <Loader2 className="ml-2 h-4 w-4 animate-spin"/>}
                            {newAddressLocation ? 'تم تحديد الموقع' : 'تحديد الموقع الحالي'}
                        </Button>
                    </div>
                </div>
                <DialogFooter>
                    <Button onClick={handleAddAddress}>إضافة</Button>
                </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-2">
            {user.addresses?.map(address => (
                <div key={address.id} className="flex items-center gap-4 p-2 rounded-md border">
                    <Home className="h-6 w-6 text-primary" />
                    <div className="flex-grow">
                        <p className="font-semibold">{address.name}</p>
                        <p className="text-sm text-muted-foreground">Lat: {address.latitude.toFixed(4)}, Lng: {address.longitude.toFixed(4)}</p>
                    </div>
                </div>
            ))}
            {(!user.addresses || user.addresses.length === 0) && (
                <p className="text-muted-foreground text-center py-4">لم تقم بإضافة أي عناوين.</p>
            )}
        </CardContent>
      </Card>

      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 sm:space-x-reverse w-full">
        <Button variant="destructive" size="lg" className="flex-1 text-lg" onClick={logout}>
            <LogOut className="ml-2 h-5 w-5" />
            تسجيل الخروج
        </Button>
      </div>
    </div>
  );
}
