
"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  Shield,
  LayoutGrid,
  Store,
  GalleryHorizontal,
  Map,
  AreaChart,
  MessageSquareWarning,
  Bike,
  TicketPercent,
  UserCog,
  Send,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useSupportTickets } from "@/hooks/useSupportTickets";


const navItems = [
  { index: 0, label: "لوحة التحكم", icon: Home },
  { index: 1, label: "الطلبات", icon: ShoppingCart },
  { index: 2, label: "المنتجات", icon: Package },
  { index: 3, label: "الأقسام", icon: LayoutGrid },
  { index: 4, label: "المتاجر", icon: Store },
  { index: 5, label: "البنرات", icon: GalleryHorizontal },
  { index: 6, label: "مناطق التوصيل", icon: Map },
  { index: 7, label: "أكواد الخصم", icon: TicketPercent },
  { index: 8, label: "المستخدمين والعمال", icon: Users },
  { index: 9, label: "تسوية حسابات العمال", icon: UserCog },
  { index: 10, label: "تسوية حسابات المتاجر", icon: AreaChart },
  { index: 11, label: "تذاكر الدعم", icon: MessageSquareWarning, notificationKey: 'openTickets' },
  { index: 12, label: "إشعارات تليجرام", icon: Send },
  { index: 13, label: "الإعدادات", icon: Settings },
];

export function AdminNav({ isSheet = false, onTabChange, activeTab }: { isSheet?: boolean, onTabChange: (idx: number) => void, activeTab: number }) {
  const { supportTickets } = useSupportTickets();
  
  const openTicketsCount = useMemo(() => {
    return supportTickets.filter(t => !t.isResolved).length;
  }, [supportTickets]);

  const navContent = (
    <nav className={cn("flex flex-col items-center gap-4 px-2 py-5", isSheet && "items-stretch text-lg font-medium px-4")}>
      <div className="group flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground mb-4">
        <Shield className="h-6 w-6" />
      </div>
      {navItems.map((item) => {
        const isActive = activeTab === item.index;
        const hasNotification = item.notificationKey === 'openTickets' && openTicketsCount > 0;
        
        if (isSheet) {
          return (
             <button
              key={item.index}
              onClick={() => onTabChange(item.index)}
              className={cn(
                "flex items-center justify-between gap-4 rounded-xl px-4 py-3 text-right text-muted-foreground transition-all active:scale-95",
                isActive && "bg-primary text-primary-foreground font-bold shadow-lg"
              )}
            >
              <div className="flex items-center gap-4 text-right">
                <item.icon className="h-5 w-5" />
                {item.label}
              </div>
              {hasNotification && <Badge variant="destructive" className="mr-auto">{openTicketsCount}</Badge>}
            </button>
          )
        }
        return (
          <Tooltip key={item.index}>
            <TooltipTrigger asChild>
              <button
                onClick={() => onTabChange(item.index)}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-90",
                  isActive && "bg-primary text-primary-foreground shadow-lg"
                )}
              >
                <item.icon className="h-6 w-6" />
                {hasNotification && (
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-bounce">{openTicketsCount}</Badge>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );

  return (
    <TooltipProvider>
      <ScrollArea className="h-screen w-full">
        <div className="flex flex-col items-center pb-20">
          {navContent}
        </div>
      </ScrollArea>
    </TooltipProvider>
  );
}
