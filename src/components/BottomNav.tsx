
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

  const handleTabClick = (index: number) => {
    if (activeTab > 5 && index === 5) {
        setActiveTab(5);
    } else {
        setActiveTab(index);
    }
  };

  return (
    <nav className="fixed bottom-0 right-0 z-50 w-full border-t bg-card/80 backdrop-blur-lg shadow-t-lg">
      <div className="mx-auto grid h-20 max-w-screen-xl grid-cols-6 items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = (item.index === 5 && activeTab >= 5) || (activeTab === item.index);
          
          return (
            <button
              key={item.index}
              onClick={() => handleTabClick(item.index)}
              className={cn(
                "group flex flex-col items-center justify-center text-muted-foreground transition-all duration-300 active:scale-75",
                isActive && "text-primary"
              )}
            >
              <div className={cn(
                "p-2 rounded-2xl transition-all duration-300",
                isActive && "bg-primary/10"
              )}>
                <item.icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
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
