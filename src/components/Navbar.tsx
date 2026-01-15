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
  Search,
  Bell,
  ChevronDown,
  Sparkles
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/analisis', label: 'Análisis', icon: Sparkles },
  { href: '/gastos', label: 'Gastos', icon: Receipt },
  { href: '/registrar', label: 'Registrar', icon: PlusCircle },
  { href: '/config', label: 'Config', icon: Settings },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Desktop Top Navbar */}
      <header className="hidden lg:flex fixed top-0 left-0 right-0 h-16 bg-[#0f0f1a]/80 backdrop-blur-xl border-b border-white/5 z-50 px-6">
        <div className="flex items-center justify-between w-full max-w-[1600px] mx-auto">
          {/* Logo & Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-white font-bold text-sm">F</span>
              </div>
              <span className="font-bold text-white">Finanzas</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                2026
              </span>
            </Link>

            {/* Navigation Pills */}
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

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Buscar..."
                className="w-48 pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <Bell className="w-5 h-5 text-white/60" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>

            {/* Profile */}
            <button className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center">
                <span className="text-white font-semibold text-sm">A</span>
              </div>
              <span className="text-sm text-white/80">Ale & Ricardo</span>
              <ChevronDown className="w-4 h-4 text-white/40" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 bg-[#0f0f1a]/95 backdrop-blur-xl border-b border-white/5 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">F</span>
            </div>
            <span className="font-bold text-white">Finanzas</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl bg-white/5">
              <Bell className="w-5 h-5 text-white/60" />
            </button>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-xl bg-white/5"
            >
              {isOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <nav className="border-t border-white/5 bg-[#0f0f1a] p-4">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-400'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
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

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#0f0f1a]/95 backdrop-blur-xl border-t border-white/5 z-50">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                  isActive ? 'text-purple-400' : 'text-white/40'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
