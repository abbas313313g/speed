
import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { AppProvider } from '@/contexts/AppContext';

export const metadata: Metadata = {
  title: 'سبيد شوب | أسرع توصيل',
  description: 'منصة سبيد شوب للتوصيل السريع في المدحتية والهاشمية والقاسم',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Speed Shop',
  },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%2300b358%22/><text y=%22.65em%22 x=%2250%25%22 text-anchor=%22middle%22 font-size=%2265%22 fill=%22white%22 font-family=%22Arial%22 font-weight=%22bold%22>S</text></svg>',
    apple: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2245%22 fill=%22%2300b358%22/><text y=%22.65em%22 x=%2250%25%22 text-anchor=%22middle%22 font-size=%2265%22 fill=%22white%22 font-family=%22Arial%22 font-weight=%22bold%22>S</text></svg>',
  }
};

export const viewport: Viewport = {
  themeColor: '#00b358',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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
        <meta http-equiv="Cache-Control" content="max-age=31536000, public" />
        {/* سكربت حماية WebView: تجاهل الأخطاء ومنع انهيار التطبيق */}
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
