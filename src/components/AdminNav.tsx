
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  LogOut,
  Shield,
  LayoutGrid,
  Store,
  GalleryHorizontal,
  Map,
  AreaChart,
  MessageSquareWarning,
  Bike,
  TicketPercent,
  UserCog
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";


const navItems = [
  { href: "/admin", label: "لوحة التحكم", icon: Home },
  { href: "/admin/orders", label: "الطلبات", icon: ShoppingCart },
  { href: "/admin/products", label: "المنتجات", icon: Package },
  { href: "/admin/categories", label: "الأقسام", icon: LayoutGrid },
  { href: "/admin/stores", label: "المتاجر", icon: Store },
  { href: "/admin/banners", label: "البنرات", icon: GalleryHorizontal },
  { href: "/admin/delivery-zones", label: "مناطق التوصيل", icon: Map },
  { href: "/admin/reports", label: "تقارير المتاجر", icon: AreaChart },
  { href: "/admin/coupons", label: "أكواد الخصم", icon: TicketPercent },
  { href: "/admin/delivery-workers", label: "عمال التوصيل", icon: UserCog },
  { href: "/admin/support-tickets", label: "تذاكر الدعم", icon: MessageSquareWarning },
];

export function AdminNav({ isSheet = false }: { isSheet?: boolean }) {
  const pathname = usePathname();

  const navContent = (
    <nav className={cn("flex flex-col items-center gap-4 px-2 sm:py-5", isSheet && "items-stretch text-lg font-medium px-4")}>
      <Link
        href="/admin"
        className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
      >
        <Shield className="h-4 w-4 transition-all group-hover:scale-110" />
        <span className="sr-only">Speed Shop Admin</span>
      </Link>
      {navItems.map((item) => {
        const isActive = item.href === '/admin' ? pathname === item.href : pathname.startsWith(item.href);
        if (isSheet) {
          return (
             <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground",
                isActive && "bg-accent text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          )
        }
        return (
          <Tooltip key={item.href}>
            <TooltipTrigger asChild>
              <Link
                href={item.href}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8",
                  isActive && "bg-accent text-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="sr-only">{item.label}</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{item.label}</TooltipContent>
          </Tooltip>
        );
      })}
    </nav>
  );

  const bottomNavContent = (
     <nav className={cn("mt-auto flex flex-col items-center gap-4 px-2 sm:py-5", isSheet && "items-stretch text-lg font-medium px-4")}>
        {isSheet ? (
          <>
             <Link href="/delivery" className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground">
                <Bike className="h-5 w-5" />
                بوابة التوصيل
              </Link>
              <Link href="/home" className="flex items-center gap-4 rounded-xl px-3 py-2 text-muted-foreground hover:text-foreground">
                <Home className="h-5 w-5" />
                العودة للتطبيق
            </Link>
          </>
        ) : (
          <>
            <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/delivery"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <Bike className="h-5 w-5" />
                    <span className="sr-only">بوابة التوصيل</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">بوابة التوصيل</TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/home"
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:h-8 md:w-8"
                  >
                    <Home className="h-5 w-5" />
                    <span className="sr-only">العودة للتطبيق</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">العودة للتطبيق</TooltipContent>
            </Tooltip>
          </>
        )}
      </nav>
  )

  if (isSheet) {
    return (
      <ScrollArea className="h-full w-full">
        <div className="flex flex-col h-full py-4">
          {navContent}
          <div className="flex-grow"/>
          {bottomNavContent}
        </div>
      </ScrollArea>
    )
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex">
      <TooltipProvider>
        <ScrollArea className="h-full w-full">
            <div className="flex flex-col h-full">
              {navContent}
              <div className="flex-grow"/>
              {bottomNavContent}
            </div>
        </ScrollArea>
      </TooltipProvider>
    </aside>
  );
}
