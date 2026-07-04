
"use client";

import { Home, User, ShoppingCart, ClipboardList, Store, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useContext } from "react";
import { AppContext } from "@/contexts/AppContext";

const navItems = [
  { index: 0, label: "الرئيسية", icon: Home },
  { index: 1, label: "المتاجر", icon: Store },
  { index: 2, label: "البحث", icon: Search },
  { index: 3, label: "السلة", icon: ShoppingCart },
  { index: 4, label: "الطلبات", icon: ClipboardList },
  { index: 5, label: "حسابي", icon: User },
];

function BottomNavComponent() {
  const context = useContext(AppContext);
  if (!context) return null;
  
  const { activeTab, setActiveTab } = context;

  return (
    <nav className="fixed bottom-0 right-0 z-50 w-full border-t bg-card shadow-t-lg">
      <div className="mx-auto grid h-16 max-w-md grid-cols-6 items-center justify-around">
        {navItems.map((item) => {
          const isActive = activeTab === item.index;
          return (
            <button
              key={item.index}
              onClick={() => setActiveTab(item.index)}
              className={cn(
                "group flex flex-col items-center justify-center text-muted-foreground transition-all duration-200 hover:text-primary active:scale-90",
                isActive && "text-primary"
              )}
            >
              <item.icon className={cn("h-5 w-5 transition-transform", isActive && "scale-110")} />
              <span className="mt-1 text-[10px] font-bold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export const BottomNav = React.memo(BottomNavComponent);
