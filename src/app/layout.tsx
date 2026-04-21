import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import FloatingChat from '@/components/FloatingChat';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Toaster } from 'sonner';
import { MonthProvider } from '@/contexts/MonthContext';
import { FirestoreProvider } from '@/contexts/FirestoreContext';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FAFAF7',
};

export const metadata: Metadata = {
  title: 'Finanzas Ale & Ricardo 2026',
  description: 'Dashboard financiero para control de gastos y pago de deudas',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Finanzas',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="font-sans antialiased">
        <FirestoreProvider>
          <MonthProvider>
            <div className="min-h-screen bg-app text-ink-900">
              <Navbar />
              <main className="lg:pl-[240px]">
                <div className="pt-4 lg:pt-10 pb-24 lg:pb-10 px-4 lg:px-10 max-w-[1320px] mx-auto">
                  <ErrorBoundary>{children}</ErrorBoundary>
                </div>
              </main>
              <FloatingChat />
              <Toaster
                position="top-right"
                toastOptions={{
                  style: {
                    background: '#FFFFFF',
                    border: '1px solid #E0DDD3',
                    color: '#1A1A1A',
                  },
                }}
                richColors
              />
            </div>
          </MonthProvider>
        </FirestoreProvider>
      </body>
    </html>
  );
}
