
"use client";

import { BottomNav } from '@/components/BottomNav';

// This layout is for the main application pages.
// It no longer protects routes, allowing guests to browse.
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  // App content is shown to everyone, guests and logged-in users.
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
