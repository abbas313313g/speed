
"use client";

import { Home, ShoppingCart, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useContext, useMemo } from "react";
import { AppContext } from "@/contexts/AppContext";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { index: 0, label: "الرئيسية", icon: Home },
  { index: 2, label: "البحث", icon: Search },
  { index: 3, label: "السلة", icon: ShoppingCart },
];

function BottomNavComponent() {
  const context = useContext(AppContext);
  if (!context) return null;
  
  const { activeTab, setActiveTab, cart } = context;

  const cartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  return (
    <nav className="w-full bg-card border-t shadow-t-lg shrink-0 pb-safe">
      <div className="mx-auto grid h-20 max-w-screen-xl grid-cols-3 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.index;
          const isCart = item.index === 3;
          
          return (
            <button
              key={item.index}
              onClick={() => setActiveTab(item.index)}
              className={cn(
                "group relative flex flex-col items-center justify-center text-muted-foreground transition-all duration-300 active:scale-75",
                isActive && "text-primary"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all duration-300",
                isActive && "bg-primary/10"
              )}>
                <item.icon className={cn("h-7 w-7 transition-transform", isActive && "scale-110")} />
                {isCart && cartCount > 0 && (
                   <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] font-black bg-destructive animate-in zoom-in">
                      {cartCount}
                   </Badge>
                )}
              </div>
              <span className="mt-1 text-[10px] font-black">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const BottomNav = React.memo(BottomNavComponent);
