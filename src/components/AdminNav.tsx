
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
  TicketPercent,
  UserCog,
  Settings,
  CheckCircle,
  Fingerprint,
  GitBranch,
  Banknote,
  LayoutDashboard,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { useSupportTickets } from "@/hooks/useSupportTickets";
import { useProducts } from "@/hooks/useProducts";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { useWithdrawals } from "@/hooks/useWithdrawals";
import { useSearchParams } from 'next/navigation';


const navItems = [
  { index: 0, label: "الرئيسية", icon: Home },
  { index: 1, label: "الطلبات", icon: ShoppingCart },
  { index: 2, label: "المنتجات", icon: Package },
  { index: 14, label: "المراجعات", icon: CheckCircle, notificationKey: 'pendingProducts' },
  { index: 18, label: "سحب الأرصدة", icon: Banknote, notificationKey: 'pendingWithdraws' },
  { index: 19, label: "الخصومات اليدوية", icon: ShieldAlert },
  { index: 17, label: "تخصيص الواجهة", icon: LayoutDashboard, mainOnly: true },
  { index: 10, label: "أرباح الشركة", icon: AreaChart },
  { index: 15, label: "تراخيص الأجهزة", icon: Fingerprint, notificationKey: 'pendingAccess' },
  { index: 16, label: "إدارة الفروع", icon: GitBranch, mainOnly: true },
  { index: 3, label: "الأقسام", icon: LayoutGrid, mainOnly: true },
  { index: 4, label: "المتاجر", icon: Store },
  { index: 5, label: "البنرات", icon: GalleryHorizontal, mainOnly: true },
  { index: 6, label: "المناطق", icon: Map, mainOnly: true },
  { index: 7, label: "أكواد الخصم", icon: TicketPercent, mainOnly: true },
  { index: 8, label: "المناديب", icon: Users },
  { index: 9, label: "تصفية العمال", icon: UserCog },
  { index: 11, label: "الدعم الفني", icon: MessageSquareWarning, notificationKey: 'openTickets' },
  { index: 13, label: "الإعدادات", icon: Settings, mainOnly: true },
];

export function AdminNav({ isSheet = false, onTabChange, activeTab, isBranch = false }: { isSheet?: boolean, onTabChange: (idx: number) => void, activeTab: number, isBranch?: boolean }) {
  const searchParams = useSearchParams();
  const currentBranchId = searchParams.get('branch') || 'main';

  const { supportTickets } = useSupportTickets();
  const { products } = useProducts();
  const { accessList } = useAdminAccess();
  const { requests } = useWithdrawals();
  
  const filteredItems = useMemo(() => {
      if (!isBranch) return navItems;
      return navItems.filter(item => !item.mainOnly);
  }, [isBranch]);

  const counts = useMemo(() => ({
      openTickets: supportTickets.filter(t => !t.isResolved && t.branchId === currentBranchId).length,
      pendingProducts: products.filter(p => p.status === 'pending' && p.branchId === currentBranchId).length,
      pendingAccess: accessList.filter(a => a.status === 'pending' && a.branchId === currentBranchId).length,
      pendingWithdraws: requests.filter(r => r.status === 'pending' && r.branchId === currentBranchId).length
  }), [supportTickets, products, accessList, requests, currentBranchId]);

  const navContent = (
    <nav className={cn("flex flex-col items-center gap-4 px-2 py-5", isSheet && "items-stretch text-lg font-medium px-4")}>
      <div className="group flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground mb-4">
        <Shield className="h-6 w-6" />
      </div>
      {filteredItems.map((item) => {
        const isActive = activeTab === item.index;
        let count = 0;
        if (item.notificationKey === 'openTickets') count = counts.openTickets;
        if (item.notificationKey === 'pendingProducts') count = counts.pendingProducts;
        if (item.notificationKey === 'pendingAccess') count = counts.pendingAccess;
        if (item.notificationKey === 'pendingWithdraws') count = counts.pendingWithdraws;
        
        const hasNotification = count > 0;
        
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
              {hasNotification && <Badge variant="destructive" className="mr-auto">{count}</Badge>}
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
                  <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-bounce">{count}</Badge>
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
