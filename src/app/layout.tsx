import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Finanzas Ale & Ricardo',
  description: 'App para controlar gastos y pagar deudas',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <div className="min-h-screen">
          <Navbar />
          <main className="lg:ml-64 pt-16 lg:pt-0 pb-20 lg:pb-0 px-4 lg:px-8 py-6">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
