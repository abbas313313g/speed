
"use client";

import { User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AccountPage() {
  // Since auth is removed, this page is not functional for a regular user.
  // It will now just show a simple message.
  // The full functionality can be restored if user authentication is re-enabled.

    return (
      <div className="flex h-[calc(100vh-8rem)] w-full flex-col items-center justify-center p-4 text-center">
        <User className="h-20 w-20 text-muted-foreground/50" />
        <h2 className="mt-4 text-xl font-bold">صفحة حسابي</h2>
        <p className="mt-2 text-muted-foreground">
          تم تبسيط التطبيق. ميزات الحساب معطلة حالياً.
        </p>
         <Button asChild className="mt-4">
          <Link href="/home">
            العودة للرئيسية
          </Link>
        </Button>
      </div>
    );
}
