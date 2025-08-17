
"use client";

// This layout is for the auth pages (like /login, /signup)
// All authentication checks have been removed as per user request.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
