
"use client";

import { useContext, useState } from "react";
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
import { Home, PlusCircle, Trash2 } from "lucide-react";
import type { Address } from "@/lib/types";

export default function AccountPage() {
  const context = useContext(AppContext);

  if (!context) {
    return <div>جار التحميل...</div>;
  }

  const { addresses, deleteAddress } = context;

  return (
    <div className="p-4 space-y-6">
      <header>
        <h1 className="text-3xl font-bold">عناويني</h1>
        <p className="text-muted-foreground">
          إدارة عناوين التوصيل الخاصة بك.
        </p>
      </header>

      <Button asChild className="w-full">
        <Link href="/account/add-address">
          <PlusCircle className="ml-2 h-5 w-5" />
          إضافة عنوان جديد
        </Link>
      </Button>

      <div className="space-y-4">
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
