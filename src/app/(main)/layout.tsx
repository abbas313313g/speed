
"use client";

import { BottomNav } from '@/components/BottomNav';

// This layout is for the main application pages.
// All authentication checks have been removed as per user request.
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-card shadow-lg">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
