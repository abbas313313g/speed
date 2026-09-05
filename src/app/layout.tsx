"use client";

import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AppProvider } from '@/contexts/AppContext';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet" />
        <meta httpEquiv="Cache-Control" content="max-age=31536000, public" />
        
        <script dangerouslySetInnerHTML={{ __html: `
          window.onerror = function() { return true; };
          window.onunhandledrejection = function() { return true; };
          
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(registrations) {
              for(let registration of registrations) {
                registration.unregister();
              }
            });
          }
          
          try {
            var test = 'test';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
          } catch(e) {
            Object.defineProperty(window, 'localStorage', {
              value: (function() {
                var store = {};
                return {
                  getItem: function(key) { return store[key] || null; },
                  setItem: function(key, value) { store[key] = value.toString(); },
                  removeItem: function(key) { delete store[key]; },
                  clear: function() { store = {}; }
                };
              })()
            });
          }
        `}} />
      </head>
      <body className={cn("font-body antialiased", process.env.NODE_ENV === "development" ? "debug-screens" : "")}>
          <AppProvider>
            {children}
          </AppProvider>
          <Toaster />
      </body>
    </html>
  );
}
