
'use client';

import { RestaurantProvider } from '@/contexts/RestaurantContext';

export default function RestaurantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RestaurantProvider>
        <div className="mx-auto flex min-h-screen max-w-4xl flex-col bg-card shadow-lg">
            <main className="flex-1">{children}</main>
        </div>
    </RestaurantProvider>
  );
}
