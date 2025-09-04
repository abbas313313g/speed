
"use client";

import { useContext } from "react";
import Link from "next/link";
import { AppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Home, PlusCircle, Trash2, MessageSquareHeart } from "lucide-react";

export default function AccountPage() {
  const context = useContext(AppContext);

  if (!context) {
    return <div>جار التحميل...</div>;
  }

  const { addresses, deleteAddress } = context;

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">حسابي</h1>
        <p className="text-muted-foreground">
          إدارة عناوينك والتواصل مع الدعم.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Button asChild>
            <Link href="/account/add-address">
            <PlusCircle className="ml-2 h-5 w-5" />
            إضافة عنوان
            </Link>
        </Button>
         <Button asChild variant="outline">
            <Link href="/support">
            <MessageSquareHeart className="ml-2 h-5 w-5" />
            الدعم الفني
            </Link>
        </Button>
      </div>
      

      <div className="space-y-4">
        <h2 className="text-2xl font-bold">عناويني</h2>
        {addresses.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            لم تقم بإضافة أي عناوين بعد.
          </p>
        ) : (
          addresses.map((address) => (
            <Card key={address.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5" /> {address.name}
                        </CardTitle>
                        <CardDescription>{address.phone}</CardDescription>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteAddress(address.id)}>
                        <Trash2 className="h-4 w-4 text-destructive"/>
                    </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p>المنطقة: {address.deliveryZone}</p>
                {address.details && <p>تفاصيل إضافية: {address.details}</p>}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
