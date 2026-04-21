import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
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

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-serif',
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
    <html lang="es" className={`${inter.variable} ${instrumentSerif.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="font-sans antialiased">
        <FirestoreProvider>
          <MonthProvider>
            <div className="min-h-screen bg-app text-ink-900">
              <Navbar />
              <main className="pt-20 lg:pt-24 pb-24 lg:pb-8 px-4 lg:px-8 max-w-[1600px] mx-auto">
                <ErrorBoundary>
                  {children}
                </ErrorBoundary>
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
