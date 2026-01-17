import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import FloatingChat from '@/components/FloatingChat';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#8b5cf6',
};

export const metadata: Metadata = {
  title: 'Finanzas Ale & Ricardo 2026',
  description: 'Dashboard financiero para control de gastos y pago de deudas',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Finanzas',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon.svg" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className={inter.className}>
        <div className="min-h-screen bg-[#0f0f1a]">
          <Navbar />
          <main className="pt-20 lg:pt-24 pb-24 lg:pb-8 px-4 lg:px-8 max-w-[1600px] mx-auto">
            {children}
          </main>
          <FloatingChat />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#161B22',
                border: '1px solid #30363D',
                color: '#FFFFFF',
              },
            }}
            richColors
          />
        </div>
      </body>
    </html>
  );
}
