'use client';

import { useState, useEffect, useRef } from 'react';
import { Deuda, Suscripcion } from '@/types';
import { calcularGastosFijos, INGRESO_MENSUAL, suscripciones as defaultSuscripciones } from '@/lib/data';
import { subscribeToDeudas, calcularTotalesFromDeudas, initializeFirestoreData } from '@/lib/firestore';
import {
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  ChevronRight,
  Target,
  Calendar,
  MoreHorizontal,
  Info,
  Pin,
  Maximize2
} from 'lucide-react';
import { PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, LineChart, Line, ReferenceLine } from 'recharts';
import PresupuestosPersonales from './PresupuestosPersonales';
import DailyBudgetCard from './DailyBudgetCard';
import ProgressHeroCard from './ProgressHeroCard';
import FreedomCountdown from './FreedomCountdown';
import BudgetAlertBanner from './BudgetAlertBanner';
import FutureSelfCard from './FutureSelfCard';
import CelebrationModal from './CelebrationModal';
import PaymentPlanExplainer from './PaymentPlanExplainer';
import BudgetOverview from './BudgetOverview';

function formatMoney(amount: number) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Animated number component with counting effect
function AnimatedNumber({ value, duration = 1500, prefix = '', suffix = '', className = '' }: {
  value: number,
  duration?: number,
  prefix?: string,
  suffix?: string,
  className?: string
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const startTime = Date.now();
          const startValue = 0;

          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(startValue + (value - startValue) * easeOutQuart);
            setDisplayValue(current);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  return (
    <span ref={ref} className={className}>
      {prefix}{formatMoney(displayValue).replace('$', '')}{suffix}
    </span>
  );
}

// Animated progress bar component
function AnimatedProgress({ value, color, delay = 0 }: { value: number, color: string, delay?: number }) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setWidth(value);
          }, delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [value, delay]);

  return (
    <div ref={ref} className="h-full rounded-full overflow-hidden bg-[#252931]">
      <div
        className={`h-full rounded-full transition-all duration-1000 ease-out ${color}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

// Skeleton loader component
function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-[#252931] rounded ${className}`} />
  );
}

// Skeleton card for loading state
function SkeletonCard() {
  return (
    <div className="glass-card">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-2 h-2 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-3 w-24 mb-4" />
      <Skeleton className="h-8 w-40 mb-2" />
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

// Sparkline component for mini trend charts
function Sparkline({ data, color, height = 30 }: { data: number[], color: string, height?: number }) {
  const chartData = data.map((value, index) => ({ value, index }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Change indicator component
function ChangeIndicator({ value, isPositive, suffix = '' }: { value: string, isPositive: boolean, suffix?: string }) {
  return (
    <div className={`flex items-center gap-1 text-sm font-medium ${isPositive ? 'text-[#6EE7B7]' : 'text-[#F87171]'}`}>
      {isPositive ? (
        <ArrowUpRight className="w-4 h-4" />
      ) : (
        <ArrowDownRight className="w-4 h-4" />
      )}
      <span>{value}{suffix}</span>
    </div>
  );
}

// Action icons component for card headers
function CardActions({ showPin = true, showExpand = true, showMore = true }: { showPin?: boolean, showExpand?: boolean, showMore?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      {showPin && (
        <button className="p-1.5 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#252931] transition-all" title="Fijar">
          <Pin className="w-3.5 h-3.5" />
        </button>
      )}
      {showExpand && (
        <button className="p-1.5 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#252931] transition-all" title="Expandir">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      )}
      {showMore && (
        <button className="p-1.5 rounded-lg text-[#6B7280] hover:text-white hover:bg-[#252931] transition-all" title="Más opciones">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// Educational tooltip component
function EducationalTooltip({ title, content }: { title: string, content: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 text-[#6B7280] hover:text-[#9CA3AF] transition-colors text-xs"
      >
        <Info className="w-3.5 h-3.5" />
        <span>¿Qué es esto?</span>
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute z-50 left-0 top-6 w-72 p-4 bg-[#1C2128] border border-[#30363D] rounded-xl shadow-xl">
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-white text-sm">{title}</h4>
              <button onClick={() => setIsOpen(false)} className="text-[#6B7280] hover:text-white">
                <span className="text-lg leading-none">&times;</span>
              </button>
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">{content}</p>
          </div>
        </>
      )}
    </div>
  );
}

// Data for charts - Updated colors to match new palette
// Datos del gráfico de progreso - Enero 2026, apenas empezando
// pagado = lo que realmente se ha pagado (acumulado)
// proyectado = la proyección de pagos si se sigue el plan
const monthlyData = [
  { name: 'Ene', pagado: 0, deuda: 491442, proyectado: 38450 },
  { name: 'Feb', pagado: null, deuda: null, proyectado: 76900 },
  { name: 'Mar', pagado: null, deuda: null, proyectado: 115350 },
  { name: 'Abr', pagado: null, deuda: null, proyectado: 153800 },
  { name: 'May', pagado: null, deuda: null, proyectado: 192250 },
  { name: 'Jun', pagado: null, deuda: null, proyectado: 230700 },
  { name: 'Jul', pagado: null, deuda: null, proyectado: 269150 },
  { name: 'Ago', pagado: null, deuda: null, proyectado: 307600 },
  { name: 'Sep', pagado: null, deuda: null, proyectado: 346050 },
  { name: 'Oct', pagado: null, deuda: null, proyectado: 384500 },
  { name: 'Nov', pagado: null, deuda: null, proyectado: 422950 },
  { name: 'Dic', pagado: null, deuda: null, proyectado: 491442 },
];

// Sparkline data - Como es enero, mostramos solo la deuda inicial
const deudaSparkline = [491442, 491442, 491442, 491442, 491442, 491442];
const ingresoSparkline = [109000, 109000, 109000, 109000, 109000, 109000];
const gastosSparkline = [64550, 64550, 64550, 64550, 64550, 64550];
const disponibleSparkline = [38450, 38450, 38450, 38450, 38450, 38450];

const expenseData = [
  { name: 'Deudas', value: 32099, color: '#F87171' },
  { name: 'Renta', value: 12700, color: '#8B5CF6' },
  { name: 'Carro', value: 13000, color: '#60A5FA' },
  { name: 'Servicios', value: 3200, color: '#FBBF24' },
  { name: 'Subs', value: 3551, color: '#6EE7B7' },
];

export default function Dashboard() {
  const [deudas, setDeudas] = useState<Deuda[]>([]);
  const [loading, setLoading] = useState(true);
  const [suscripciones] = useState<Suscripcion[]>(defaultSuscripciones);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationType, setCelebrationType] = useState<'under_budget' | 'debt_paid' | 'streak' | 'milestone'>('milestone');
  const [celebrationData, setCelebrationData] = useState<any>({});

  // Subscribe to real-time updates from Firebase
  useEffect(() => {
    // Subscribe to real-time updates
    const unsubscribe = subscribeToDeudas((deudasActualizadas) => {
      // If no data in Firebase, initialize it once
      if (deudasActualizadas.length === 0) {
        initializeFirestoreData().catch(console.error);
      } else {
        setDeudas(deudasActualizadas);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const totales = calcularTotalesFromDeudas(deudas);
  const gastosFijosTotal = calcularGastosFijos();
  const disponible = INGRESO_MENSUAL - gastosFijosTotal - totales.pagosMinimos;

  const deudasActivas = deudas.filter(d => !d.liquidada).sort((a, b) => a.prioridad - b.prioridad);

  // Show loading skeleton while fetching data
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <SkeletonCard />
          <div className="space-y-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Celebration Modal */}
      <CelebrationModal
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        type={celebrationType}
        data={celebrationData}
      />

      {/* Budget Alert Banner - Shows when approaching or over budget */}
      <BudgetAlertBanner />

      {/* Hero Section - Progress Focus + Daily Budget */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Hero Card - Main focus on progress, not debt */}
        <div className="lg:col-span-2">
          <ProgressHeroCard />
        </div>

        {/* Daily Budget Card - One simple number */}
        <div className="lg:col-span-1">
          <DailyBudgetCard />
        </div>
      </div>

      {/* Freedom Countdown */}
      <FreedomCountdown />

      {/* Budget Overview - Vales, Esenciales, Gustos */}
      <BudgetOverview />

      {/* Payment Plan Explainer - Responde la pregunta "¿Cómo funciona?" */}
      <PaymentPlanExplainer />

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Total Balance Card */}
        <div className="balance-card lg:col-span-1 hover-lift">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-white/60" />
            <p className="text-white/80 text-sm font-medium">Deuda Total</p>
            <span className="text-white/50 text-sm">/ $</span>
          </div>
          <p className="text-xs text-white/60 mb-3">Suma de todas las deudas activas</p>
          <h2 className="text-4xl font-bold text-white mb-1 tracking-tight">
            <AnimatedNumber value={totales.deudaTotal} duration={2000} className="" />
            <span className="text-2xl ml-1">$</span>
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="flex items-center gap-1 text-white/80 text-sm">
              <TrendingDown className="w-4 h-4" />
              <span>{formatMoney(totales.deudaPagada)} pagados</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-white/50">
              Los datos se actualizan automáticamente desde Firebase
            </p>
          </div>
        </div>

        {/* Income & Expense Cards */}
        <div className="space-y-4">
          <div className="glass-card hover-lift">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#6EE7B7]" />
                <span className="text-sm text-[#9CA3AF]">Ingreso Mensual</span>
                <span className="text-[#6B7280] text-sm">/ $</span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-[#6B7280] cursor-pointer hover:text-white transition-colors" />
            </div>
            <p className="text-xs text-[#6B7280] mb-2">Combinado Ale + Ricardo</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-[#6EE7B7] tracking-tight">
                  +{formatMoney(INGRESO_MENSUAL)}
                </p>
                <ChangeIndicator value="Estable" isPositive={true} />
              </div>
              <div className="w-20 h-8">
                <Sparkline data={ingresoSparkline} color="#6EE7B7" />
              </div>
            </div>
          </div>

          <div className="glass-card hover-lift">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#F87171]" />
                <span className="text-sm text-[#9CA3AF]">Gastos Fijos</span>
                <span className="text-[#6B7280] text-sm">/ $</span>
              </div>
              <MoreHorizontal className="w-4 h-4 text-[#6B7280] cursor-pointer hover:text-white transition-colors" />
            </div>
            <p className="text-xs text-[#6B7280] mb-2">Renta, carro, servicios, subs</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold text-[#F87171] tracking-tight">
                  -{formatMoney(gastosFijosTotal)}
                </p>
                <ChangeIndicator value="Primer mes" isPositive={true} suffix="" />
              </div>
              <div className="w-20 h-8">
                <Sparkline data={gastosSparkline} color="#F87171" />
              </div>
            </div>
          </div>
        </div>

        {/* Available for Debt */}
        <div className="glass-card hover-lift">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              <span className="text-sm text-[#9CA3AF]">Disponible para Deudas</span>
              <span className="text-[#6B7280] text-sm">/ $</span>
            </div>
            <span className="text-xs text-[#6EE7B7]">En camino</span>
          </div>
          <p className="text-xs text-[#6B7280] mb-3">Cada mes para atacar deudas</p>

          <div className="flex items-end justify-between mb-4">
            <div>
              <p className="text-3xl font-bold text-white tracking-tight">
                {formatMoney(disponible)}
              </p>
              <ChangeIndicator value="Primer mes" isPositive={true} suffix="" />
            </div>
            <div className="w-24 h-10">
              <Sparkline data={disponibleSparkline} color="#8B5CF6" />
            </div>
          </div>

          <div className="progress-bar-bg h-2">
            <AnimatedProgress value={totales.porcentajePagado} color="bg-gradient-to-r from-[#7C3AED] to-[#8B5CF6]" delay={500} />
          </div>
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-[#6B7280]">{totales.porcentajePagado.toFixed(1)}% de la meta anual</p>
            <p className="text-xs text-[#8B5CF6]">Meta: $461,400</p>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Flow Chart - Enhanced with projections */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#6EE7B7]" />
              <span className="font-semibold text-white">Progreso de Pago</span>
              <span className="text-[#6B7280] text-sm">/ $</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="nav-pill">
                <span className="nav-pill-item active">2026</span>
                <span className="nav-pill-item">Detalle</span>
              </div>
              <CardActions showPin={false} />
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mb-2">Pagos acumulados vs proyección anual</p>

          {/* Summary metrics above chart */}
          <div className="flex gap-6 mb-4">
            <div>
              <p className="text-xs text-[#6B7280]">Pagado YTD</p>
              <p className="text-lg font-bold text-[#6EE7B7]">{formatMoney(totales.deudaPagada)}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">Meta Dic 2026</p>
              <p className="text-lg font-bold text-white">{formatMoney(totales.deudaInicial)}</p>
            </div>
            <div>
              <p className="text-xs text-[#6B7280]">% Completado</p>
              <p className="text-lg font-bold text-[#8B5CF6]">{totales.porcentajePagado.toFixed(1)}%</p>
            </div>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorPagado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6EE7B7" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6EE7B7" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorProyectado" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: '#161B22',
                    border: '1px solid #30363D',
                    borderRadius: '12px',
                    color: 'white',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                  }}
                  labelStyle={{ color: '#9CA3AF', marginBottom: '4px' }}
                  formatter={(value, name) => {
                    if (value === null || value === undefined) return ['—', name === 'pagado' ? 'Pagado' : 'Proyectado'];
                    return [formatMoney(Number(value)), name === 'pagado' ? 'Pagado' : 'Proyectado'];
                  }}
                />
                {/* Projected area (full year) */}
                <Area
                  type="monotone"
                  dataKey="proyectado"
                  stroke="#8B5CF6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  fillOpacity={1}
                  fill="url(#colorProyectado)"
                />
                {/* Actual payments area */}
                <Area
                  type="monotone"
                  dataKey="pagado"
                  stroke="#6EE7B7"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorPagado)"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex gap-6 mt-4 pt-4 border-t border-[#30363D]">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#6EE7B7]" />
              <span className="text-xs text-[#9CA3AF]">Pagado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#8B5CF6]" style={{ borderStyle: 'dashed', borderWidth: '1px', borderColor: '#8B5CF6', background: 'transparent' }} />
              <span className="text-xs text-[#9CA3AF]">Proyectado</span>
            </div>
            <div className="ml-auto">
              <span className="text-xs text-[#6B7280]">Actualizado: Ene 2026</span>
            </div>
          </div>
        </div>

        {/* Expense Split - Enhanced with tooltip and amounts */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              <span className="font-semibold text-white">Distribución de Gastos</span>
              <span className="text-[#6B7280] text-sm">/ %</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[#6B7280] text-sm">Ene 2026</span>
              <CardActions showPin={false} showExpand={false} />
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">Desglose mensual de gastos fijos</p>

          <div className="flex items-center gap-6">
            <div className="relative w-44 h-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expenseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {expenseData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        className="transition-all duration-200 hover:opacity-80"
                        style={{ cursor: 'pointer' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#161B22',
                      border: '1px solid #30363D',
                      borderRadius: '12px',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                    }}
                    formatter={(value: number, name: string) => [formatMoney(value), name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="donut-center">
                <p className="text-xs text-[#6B7280]">Total</p>
                <p className="text-xl font-bold text-white">$64.5k</p>
              </div>
            </div>

            <div className="flex-1 space-y-2">
              {expenseData.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-[#1C2128] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full transition-transform group-hover:scale-110" style={{ background: item.color }} />
                    <span className="text-sm text-[#9CA3AF] group-hover:text-white transition-colors">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-white">
                      {formatMoney(item.value)}
                    </span>
                    <span className="text-xs text-[#6B7280] ml-2">
                      {Math.round((item.value / 64550) * 100)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row - Debts & Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deudas Priority Table - Redesigned */}
        <div className="lg:col-span-2 glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F87171]" />
              <span className="font-semibold text-white">Deudas por Prioridad</span>
              <span className="text-[#6B7280] text-sm">/ {deudasActivas.length}</span>
            </div>
            <div className="flex items-center gap-4">
              <EducationalTooltip
                title="Método Avalancha"
                content="Pagar primero la deuda con mayor CAT (tasa de interés) mientras pagas el mínimo en las demás. Matemáticamente, esto minimiza el total de intereses pagados y te libera de deudas más rápido."
              />
              <button className="flex items-center gap-1 text-[#8B5CF6] text-sm hover:text-[#A78BFA] transition-colors">
                Ver todas <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">Ordenadas por CAT (método avalancha) - ataca primero la de mayor interés</p>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-[#0D1117] rounded-lg mb-2 text-xs font-medium text-[#6B7280] uppercase tracking-wider">
            <div className="col-span-1">#</div>
            <div className="col-span-4">Deuda</div>
            <div className="col-span-2 text-center">CAT</div>
            <div className="col-span-3 text-right">Saldo</div>
            <div className="col-span-2 text-right">Mínimo</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-2">
            {deudasActivas.slice(0, 6).map((deuda, index) => {
              const isFirst = index === 0;
              const isHighCAT = deuda.cat > 100;
              const isMediumCAT = deuda.cat > 50 && deuda.cat <= 100;
              // Loss aversion: Calculate monthly interest being "lost"
              const monthlyInterestLoss = Math.round((deuda.saldoActual * (deuda.cat / 100)) / 12);

              return (
                <div
                  key={deuda.id}
                  className={`rounded-xl transition-all cursor-pointer group ${
                    isFirst
                      ? 'bg-gradient-to-r from-[#F87171]/20 to-[#FBBF24]/10 border border-[#F87171]/30 hover:border-[#F87171]/50'
                      : 'bg-[#1C2128] hover:bg-[#252931] border border-transparent hover:border-[#30363D]'
                  }`}
                >
                  <div className="grid grid-cols-12 gap-2 px-4 py-3">
                    {/* Priority Number */}
                    <div className="col-span-1 flex items-center">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-white ${
                        isHighCAT ? 'bg-[#F87171]' :
                        isMediumCAT ? 'bg-[#FBBF24]' : 'bg-[#6EE7B7]'
                      }`}>
                        {deuda.prioridad}
                      </div>
                    </div>

                    {/* Debt Name & Owner */}
                    <div className="col-span-4 flex flex-col justify-center">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white group-hover:text-[#8B5CF6] transition-colors">
                          {deuda.nombre}
                        </span>
                        {isFirst && (
                          <span className="px-2 py-0.5 bg-[#F87171]/20 text-[#F87171] text-xs rounded-full font-medium">
                            Atacar
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#6B7280] capitalize">{deuda.titular}</span>
                    </div>

                    {/* CAT */}
                    <div className="col-span-2 flex items-center justify-center">
                      <span className={`px-2 py-1 rounded-lg text-sm font-semibold ${
                        isHighCAT ? 'bg-[#F87171]/20 text-[#F87171]' :
                        isMediumCAT ? 'bg-[#FBBF24]/20 text-[#FBBF24]' :
                        'bg-[#6EE7B7]/20 text-[#6EE7B7]'
                      }`}>
                        {deuda.cat}%
                      </span>
                    </div>

                    {/* Balance */}
                    <div className="col-span-3 flex items-center justify-end">
                      <span className="font-semibold text-white">{formatMoney(deuda.saldoActual)}</span>
                    </div>

                    {/* Minimum Payment */}
                    <div className="col-span-2 flex items-center justify-end">
                      <span className="text-[#9CA3AF]">{formatMoney(deuda.pagoMinimo)}</span>
                    </div>
                  </div>

                  {/* Loss Aversion Message - Shows on hover or always for first debt */}
                  {(isFirst || isHighCAT) && monthlyInterestLoss > 500 && (
                    <div className={`px-4 pb-3 ${isFirst ? 'block' : 'hidden group-hover:block'}`}>
                      <div className="flex items-center gap-2 p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                        <span className="text-red-400 text-xs">
                          💸 Cada mes sin pagar esto pierdes ~{formatMoney(monthlyInterestLoss)} en intereses
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary Footer */}
          <div className="mt-4 pt-4 border-t border-[#30363D] flex justify-between items-center">
            <div className="text-xs text-[#6B7280]">
              Total pagos mínimos: <span className="text-white font-semibold">{formatMoney(totales.pagosMinimos)}</span>
            </div>
            <div className="text-xs text-[#6B7280]">
              Interés ahorrado con avalancha: <span className="text-[#6EE7B7] font-semibold">~$156,320</span>
            </div>
          </div>
        </div>

        {/* Subscriptions */}
        <div className="glass-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F472B6]" />
              <span className="font-semibold text-white">Suscripciones</span>
              <span className="text-[#6B7280] text-sm">/ {suscripciones.length}</span>
            </div>
            <button className="text-[#6B7280] text-sm hover:text-white transition-colors">Manage</button>
          </div>
          <p className="text-xs text-[#6B7280] mb-4">Gastos recurrentes mensuales</p>

          {/* Subscription icons row */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {['🎵', '🎬', '🎮', '📺', '☁️', '🛒'].map((icon, i) => (
              <div key={i} className="w-10 h-10 rounded-xl bg-[#1C2128] border border-[#30363D] flex items-center justify-center text-lg hover:border-[#484F58] transition-colors">
                {icon}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {suscripciones.slice(0, 4).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-[#1C2128] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#8B5CF6]/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-[#8B5CF6]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{sub.nombre}</p>
                    <p className="text-xs text-[#6B7280]">Próximo: 15 Feb</p>
                  </div>
                </div>
                <p className="font-semibold text-white">{formatMoney(sub.monto)}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-[#30363D]">
            <div className="flex justify-between items-center">
              <span className="text-[#9CA3AF]">Total mensual</span>
              <span className="text-xl font-bold text-white">
                {formatMoney(suscripciones.reduce((sum, s) => sum + s.monto, 0))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Presupuestos Personales */}
      <PresupuestosPersonales />

      {/* Future Self Visualization */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Timeline 2026 will go here */}
        </div>
        <div className="lg:col-span-1">
          <FutureSelfCard />
        </div>
      </div>

      {/* Timeline 2026 - Enhanced with area chart */}
      <div className="glass-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
            <Calendar className="w-5 h-5 text-[#8B5CF6]" />
            <span className="font-semibold text-white">Timeline 2026</span>
            <span className="text-[#6B7280] text-sm hidden sm:inline">/ Libertad Financiera</span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <div className="text-center sm:text-right">
              <p className="text-xs text-[#6B7280]">Meta</p>
              <p className="text-sm font-bold text-[#6EE7B7]">Dic 2026</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs text-[#6B7280]">Meses</p>
              <p className="text-sm font-bold text-white">11</p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-xs text-[#6B7280]">Ahorro</p>
              <p className="text-sm font-bold text-[#6EE7B7]">~$156k</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-[#6B7280] mb-4">Tu camino hacia la libertad financiera - deuda decreciente mes a mes</p>

        {/* Debt decline area chart */}
        <div className="h-32 mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { mes: 'Ene', deuda: 491442, pagado: 0 },
              { mes: 'Feb', deuda: 452992, pagado: 38450 },
              { mes: 'Mar', deuda: 414542, pagado: 76900 },
              { mes: 'Abr', deuda: 376092, pagado: 115350 },
              { mes: 'May', deuda: 337642, pagado: 153800 },
              { mes: 'Jun', deuda: 299192, pagado: 192250 },
              { mes: 'Jul', deuda: 260742, pagado: 230700 },
              { mes: 'Ago', deuda: 222292, pagado: 269150 },
              { mes: 'Sep', deuda: 183842, pagado: 307600 },
              { mes: 'Oct', deuda: 145392, pagado: 346050 },
              { mes: 'Nov', deuda: 106942, pagado: 384500 },
              { mes: 'Dic', deuda: 0, pagado: 491442 },
            ]}>
              <defs>
                <linearGradient id="deudaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F87171" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F87171" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 10 }} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: '#161B22',
                  border: '1px solid #30363D',
                  borderRadius: '12px',
                  color: 'white'
                }}
                formatter={(value: number) => [formatMoney(value), 'Deuda restante']}
              />
              <Area
                type="monotone"
                dataKey="deuda"
                stroke="#F87171"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#deudaGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Milestone cards */}
        <div className="flex gap-3 overflow-x-auto pb-2">
          {[
            { mes: 'Ene', deudas: ['Rappi', 'Nu Ale', 'Amex Plat'], status: 'current', monto: 21518 },
            { mes: 'Feb', deudas: ['HEB', 'Nu Ricardo'], status: 'pending', monto: 49751 },
            { mes: 'Abr', deudas: ['Santander LikeU'], status: 'pending', monto: 66138 },
            { mes: 'Jun', deudas: ['Amex Gold'], status: 'pending', monto: 91622 },
            { mes: 'Ago', deudas: ['Banorte/Invex'], status: 'pending', monto: 49060 },
            { mes: 'Oct', deudas: ['Crédito Personal'], status: 'pending', monto: 91767 },
            { mes: 'Nov', deudas: ['BBVA'], status: 'pending', monto: 121586 },
            { mes: 'Dic', deudas: ['LIBRE!'], status: 'goal', monto: 0 },
          ].map((item, i) => (
            <div
              key={i}
              className={`flex-shrink-0 w-36 p-3 rounded-xl transition-all hover-lift ${
                item.status === 'current'
                  ? 'bg-gradient-to-br from-[#8B5CF6]/30 to-[#F472B6]/20 border-2 border-[#8B5CF6]'
                  : item.status === 'goal'
                  ? 'bg-gradient-to-br from-[#6EE7B7]/30 to-[#34d399]/20 border-2 border-[#6EE7B7]'
                  : 'bg-[#1C2128] border border-[#30363D] hover:border-[#484F58]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-lg font-bold ${
                  item.status === 'current' ? 'text-[#8B5CF6]' :
                  item.status === 'goal' ? 'text-[#6EE7B7]' : 'text-white'
                }`}>{item.mes}</span>
                {item.status === 'current' && (
                  <span className="w-2 h-2 rounded-full bg-[#8B5CF6] animate-pulse" />
                )}
                {item.status === 'goal' && (
                  <Target className="w-4 h-4 text-[#6EE7B7]" />
                )}
              </div>
              <div className="space-y-1">
                {item.deudas.map((deuda, j) => (
                  <p key={j} className="text-xs text-[#9CA3AF] truncate">{deuda}</p>
                ))}
              </div>
              {item.monto > 0 && (
                <p className="text-xs text-[#F87171] mt-2 font-medium">
                  -{formatMoney(item.monto)}
                </p>
              )}
              {item.status === 'current' && (
                <div className="mt-2">
                  <span className="text-xs bg-[#8B5CF6] px-2 py-0.5 rounded-full text-white">Ahora</span>
                </div>
              )}
              {item.status === 'goal' && (
                <div className="mt-2">
                  <span className="text-xs bg-[#6EE7B7] px-2 py-0.5 rounded-full text-[#0D1117] font-semibold">Meta</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4 border-t border-[#30363D]">
          <div className="flex justify-between text-xs text-[#6B7280] mb-2">
            <span>Progreso hacia libertad financiera</span>
            <span className="text-[#8B5CF6] font-medium">{totales.porcentajePagado.toFixed(1)}% completado</span>
          </div>
          <div className="h-2 bg-[#1C2128] rounded-full overflow-hidden">
            <AnimatedProgress value={totales.porcentajePagado} color="bg-gradient-to-r from-[#8B5CF6] to-[#6EE7B7]" delay={800} />
          </div>
        </div>
      </div>
    </div>
  );
}
