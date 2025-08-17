
"use client";

import { useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppContext } from '@/contexts/AppContext';

// This layout is for the auth pages (like /login, /signup)
// It redirects authenticated users to the home page.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const context = useContext(AppContext);
  const router = useRouter();

  // If auth is not loading and a user exists, redirect them away from auth pages.
  useEffect(() => {
    if (!context?.isAuthLoading && context?.firebaseUser) {
      router.replace('/home');
    }
  }, [context?.isAuthLoading, context?.firebaseUser, router]);
  
  // Prevent rendering login page if user is found and redirecting
  if (context?.firebaseUser) {
    return null; // Return null to prevent rendering children during redirect
  }
  
  // If user is not authenticated (and not loading), show the auth page (login/signup form).
  return <>{children}</>;
}
