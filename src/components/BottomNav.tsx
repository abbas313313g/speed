
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, User, ShoppingCart, ClipboardList, MessageSquareHeart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useContext } from "react";
import { AppContext } from "@/contexts/AppContext";
import { Badge } from "@/components/ui/badge";
import React from "react";

const navItems = [
  { href: "/home", label: "الرئيسية", icon: Home },
  { href: "/orders", label: "الطلبات", icon: ClipboardList },
  { href: "/cart", label: "السلة", icon: ShoppingCart, isCart: true },
  { href: "/support", label: "الدعم", icon: MessageSquareHeart },
  { href: "/account", label: "حسابي", icon: User },
];

function BottomNavComponent() {
  const pathname = usePathname();
  const context = useContext(AppContext);
  const cartCount = context?.cart.reduce((count, item) => count + item.quantity, 0) ?? 0;

  return (
    <nav className="fixed bottom-0 right-0 z-50 w-full border-t bg-card shadow-t-lg">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex flex-col items-center justify-center text-muted-foreground transition-colors duration-200 hover:text-primary",
                isActive && "text-primary"
              )}
            >
              <div className="relative">
                <item.icon className="h-6 w-6" />
                {item.isCart && cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-3 h-5 w-5 justify-center p-0">{cartCount}</Badge>
                )}
              </div>
              <span className="mt-1 text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export const BottomNav = React.memo(BottomNavComponent);
