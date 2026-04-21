'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  PlusCircle,
  Receipt,
  Settings,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import MonthSelector from './MonthSelector';

const navItems = [
  { href: '/', label: 'Hoy', icon: LayoutDashboard },
  { href: '/registrar', label: 'Registrar', icon: PlusCircle },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/analisis', label: 'Análisis', icon: Sparkles },
  { href: '/config', label: 'Ajustes', icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop header */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 h-16 bg-app/85 backdrop-blur-md border-b border-ink-100 z-50 px-6">
        <div className="flex items-center justify-between w-full max-w-[1600px] mx-auto">
          <div className="flex items-center gap-10">
            <Link href="/" className="flex items-baseline gap-2">
              <span className="text-[22px] font-serif text-ink-900 leading-none">Finanzas</span>
              <span className="text-[11px] text-ink-400 tracking-wide">2026</span>
            </Link>

            <nav className="nav-pill">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-pill-item ${isActive ? 'active' : ''}`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <MonthSelector compact />
            <div className="flex items-center gap-2 pl-4 border-l border-ink-100">
              <div className="w-8 h-8 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-[13px] font-medium">
                A
              </div>
              <span className="text-[13px] text-ink-500">Ale &amp; Ricardo</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-app/95 backdrop-blur-md border-b border-ink-100 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-[20px] font-serif text-ink-900 leading-none">Finanzas</span>
            <span className="text-[11px] text-ink-400 tracking-wide">2026</span>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="btn-icon"
            aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {isOpen ? <X className="w-4 h-4 text-ink-700" /> : <Menu className="w-4 h-4 text-ink-700" />}
          </button>
        </div>

        {/* Mobile overlay menu */}
        {isOpen && (
          <nav className="border-t border-ink-100 bg-surface p-4">
            <div className="flex justify-center mb-4 pb-4 border-b border-ink-100">
              <MonthSelector compact />
            </div>
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sage-50 text-sage-700'
                        : 'text-ink-500 hover:bg-subtle hover:text-ink-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-app/95 backdrop-blur-md border-t border-ink-100 z-50">
        <div className="flex justify-around py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-0.5 px-3 py-2"
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-sage-600' : 'text-ink-400'}`} />
                <span className={`text-[10px] ${isActive ? 'text-sage-700 font-medium' : 'text-ink-400'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
