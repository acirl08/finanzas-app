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
  { href: '/',          label: 'Hoy',       icon: LayoutDashboard },
  { href: '/registrar', label: 'Registrar', icon: PlusCircle },
  { href: '/gastos',    label: 'Gastos',    icon: Receipt },
  { href: '/analisis',  label: 'Análisis',  icon: Sparkles },
  { href: '/config',    label: 'Ajustes',   icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[240px] bg-app border-r border-ink-100 z-40 flex-col">
        {/* Brand */}
        <div className="px-6 pt-7 pb-6">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-[20px] font-semibold tracking-tight text-ink-900 leading-none">
              Finanzas
            </span>
            <span className="text-[11px] text-ink-400 tracking-wide">2026</span>
          </Link>
        </div>

        {/* Month selector */}
        <div className="px-4 pb-4 border-b border-ink-100">
          <MonthSelector compact />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-[14px] transition-colors ${
                  isActive
                    ? 'bg-sage-50 text-sage-700'
                    : 'text-ink-500 hover:bg-subtle hover:text-ink-900'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.75} />
                <span className={isActive ? 'font-medium' : ''}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer — user */}
        <div className="px-4 py-4 border-t border-ink-100">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-sage-100 text-sage-700 flex items-center justify-center text-[13px] font-medium">
              A
            </div>
            <div className="min-w-0">
              <p className="text-[13px] text-ink-900 leading-tight truncate">Ale &amp; Ricardo</p>
              <p className="text-[11px] text-ink-400 leading-tight">Personal</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-app/95 backdrop-blur-md border-b border-ink-100 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-baseline gap-2">
            <span className="text-[18px] font-semibold tracking-tight text-ink-900 leading-none">
              Finanzas
            </span>
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
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

      {/* Spacer for mobile header */}
      <div className="lg:hidden h-14" />
    </>
  );
}
