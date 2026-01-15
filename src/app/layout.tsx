import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import FloatingChat from '@/components/FloatingChat';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finanzas Ale & Ricardo 2026',
  description: 'Dashboard financiero para control de gastos y pago de deudas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen bg-[#0f0f1a]">
          <Navbar />
          <main className="pt-20 lg:pt-24 pb-24 lg:pb-8 px-4 lg:px-8 max-w-[1600px] mx-auto">
            {children}
          </main>
          <FloatingChat />
        </div>
      </body>
    </html>
  );
}
