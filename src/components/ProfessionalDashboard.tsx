'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  TrendingDown,
  Wallet,
  Flame,
  Target,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  ArrowRight,
  X,
  ShoppingCart,
  Coffee,
  Car,
  Heart,
  Shirt,
  Film,
  MoreHorizontal,
  Pencil,
  Trash2,
  Check,
  ChevronDown,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { subscribeToGastos, Gasto, subscribeToDeudas, calcularTotalesFromDeudas, initializeFirestoreData, updateGasto, deleteGasto } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE, deudasIniciales, presupuestosPersonales, VALES_DESPENSA, categoriaLabels, categorias } from '@/lib/data';
import { Deuda } from '@/types';
import Link from 'next/link';
import PaymentReminders from './PaymentReminders';
import PWAWidget from './PWAWidget';

// ============ HELPERS ============
function formatMoney(amount: number, decimals = 0) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

function formatCompactMoney(amount: number) {
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return formatMoney(amount);
}

// Traffic light status
type StatusType = 'green' | 'yellow' | 'red';

const statusColors: Record<StatusType, { bg: string; border: string; text: string; dot: string; label: string }> = {
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', dot: 'bg-emerald-500', label: 'En buen camino' },
  yellow: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', dot: 'bg-amber-500', label: 'Ten cuidado' },
  red: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', dot: 'bg-red-500', label: 'Te pasaste' },
};

const CHART_COLORS = ['#8B5CF6', '#6EE7B7', '#60A5FA', '#F472B6', '#FBBF24'];

// Iconos por categoría
const categoriaIconos: Record<string, React.ReactNode> = {
  super: <ShoppingCart className="w-4 h-4" />,
  frutas_verduras: <ShoppingCart className="w-4 h-4" />,
  restaurantes: <Coffee className="w-4 h-4" />,
  cafe_snacks: <Coffee className="w-4 h-4" />,
  transporte: <Car className="w-4 h-4" />,
  gasolina: <Car className="w-4 h-4" />,
  salud: <Heart className="w-4 h-4" />,
  ropa: <Shirt className="w-4 h-4" />,
  entretenimiento: <Film className="w-4 h-4" />,
};

// ============ MINI SPARKLINE ============
function MiniSparkline({ data, color, height = 40 }: { data: number[]; color: string; height?: number }) {
  const points = useMemo(() => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    return data.map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');
  }, [data]);

  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <polygon points={`0,100 ${points} 100,100`} fill={`url(#gradient-${color})`} />
    </svg>
  );
}

// ============ SKELETON COMPONENTS ============
function MetricCardSkeleton() {
  return <div className="metric-card h-44 animate-pulse bg-[var(--bg-card)]" />;
}

function ChartCardSkeleton() {
  return <div className="glass-card h-80 animate-pulse bg-[var(--bg-card)]" />;
}

// ============ MAIN COMPONENT ============
export default function ProfessionalDashboard() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales); // Start with local data
  const [loadingGastos, setLoadingGastos] = useState(true);
  const [loadingDeudas, setLoadingDeudas] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const [selectedTitular, setSelectedTitular] = useState<'alejandra' | 'ricardo' | 'compartido' | null>(null);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [editForm, setEditForm] = useState<{ categoria: string; titular: string; monto: string; descripcion: string }>({ categoria: '', titular: '', monto: '', descripcion: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Establecer mounted después del primer render para evitar errores de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // Initialize Firebase data if empty, then load charts
  useEffect(() => {
    initializeFirestoreData().then(() => {
      setChartsReady(true);
    }).catch(console.error);
  }, []);

  // Subscribe to Firebase data
  useEffect(() => {
    const unsubGastos = subscribeToGastos((g) => {
      setGastos(g);
      setLoadingGastos(false);
    });
    const unsubDeudas = subscribeToDeudas((d) => {
      // Only update if Firebase has data, otherwise keep local data
      if (d && d.length > 0) {
        setDeudas(d);
      }
      setLoadingDeudas(false);
    });

    return () => {
      unsubGastos();
      unsubDeudas();
    };
  }, []);

  // ============ MEMOIZED CALCULATIONS ============
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const dayOfMonth = today.getDate();
  const daysRemaining = daysInMonth - dayOfMonth + 1;
  const mesActual = today.toISOString().slice(0, 7);
  const hoy = today.toISOString().split('T')[0];

  const calculations = useMemo(() => {
    // Todos los gastos del mes (para mostrar en distribución)
    const gastosDelMes = gastos.filter((g) => g.fecha.startsWith(mesActual));

    // Solo gastos VARIABLES (no fijos, no vales) afectan el presupuesto de $15,000
    const gastosVariablesDelMes = gastosDelMes.filter((g) => !g.esFijo && !g.conVales);
    const totalGastadoMes = gastosVariablesDelMes.reduce((sum, g) => sum + g.monto, 0);

    // Gastos con vales del mes
    const gastosValesDelMes = gastosDelMes.filter((g) => g.conVales && !g.esFijo);
    const totalGastadoVales = gastosValesDelMes.reduce((sum, g) => sum + g.monto, 0);

    // Gastos por titular (solo variables, no fijos, no vales)
    const gastosAlejandra = gastosVariablesDelMes.filter((g) => g.titular === 'alejandra');
    const gastosRicardo = gastosVariablesDelMes.filter((g) => g.titular === 'ricardo');
    const gastosCompartido = gastosVariablesDelMes.filter((g) => g.titular === 'compartido' || !g.titular);

    const gastosPorTitular = {
      alejandra: gastosAlejandra.reduce((sum, g) => sum + g.monto, 0),
      ricardo: gastosRicardo.reduce((sum, g) => sum + g.monto, 0),
      compartido: gastosCompartido.reduce((sum, g) => sum + g.monto, 0),
    };

    // Lista de gastos por titular (para el modal)
    const gastosListaPorTitular = {
      alejandra: gastosAlejandra.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
      ricardo: gastosRicardo.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
      compartido: gastosCompartido.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
    };

    // Gastos agrupados por categoría por titular
    const agruparPorCategoria = (listaGastos: Gasto[]) => {
      const agrupados: Record<string, { total: number; count: number }> = {};
      listaGastos.forEach(g => {
        if (!agrupados[g.categoria]) {
          agrupados[g.categoria] = { total: 0, count: 0 };
        }
        agrupados[g.categoria].total += g.monto;
        agrupados[g.categoria].count += 1;
      });
      return Object.entries(agrupados)
        .map(([categoria, data]) => ({ categoria, ...data }))
        .sort((a, b) => b.total - a.total);
    };

    const gastosPorCategoriaPorTitular = {
      alejandra: agruparPorCategoria(gastosAlejandra),
      ricardo: agruparPorCategoria(gastosRicardo),
      compartido: agruparPorCategoria(gastosCompartido),
    };

    // Disponible por titular
    const disponiblePorTitular = {
      alejandra: presupuestosPersonales.alejandra - gastosPorTitular.alejandra,
      ricardo: presupuestosPersonales.ricardo - gastosPorTitular.ricardo,
      compartido: presupuestosPersonales.compartido - gastosPorTitular.compartido,
    };

    // Porcentaje usado por titular
    const porcentajePorTitular = {
      alejandra: (gastosPorTitular.alejandra / presupuestosPersonales.alejandra) * 100,
      ricardo: (gastosPorTitular.ricardo / presupuestosPersonales.ricardo) * 100,
      compartido: (gastosPorTitular.compartido / presupuestosPersonales.compartido) * 100,
    };

    const presupuestoRestante = PRESUPUESTO_VARIABLE - totalGastadoMes;
    const disponibleVales = VALES_DESPENSA - totalGastadoVales;

    return {
      gastosDelMes,
      gastosVariablesDelMes,
      totalGastadoMes,
      presupuestoRestante,
      totalGastadoVales,
      disponibleVales,
      gastosPorTitular,
      disponiblePorTitular,
      porcentajePorTitular,
      gastosListaPorTitular,
      gastosPorCategoriaPorTitular,
    };
  }, [gastos, mesActual]);

  const deudaCalculations = useMemo(() => {
    const totalesDeuda = calcularTotalesFromDeudas(deudas);
    const deudaInicial = deudasIniciales.reduce((sum, d) => sum + d.saldoInicial, 0);
    const deudaPagada = deudaInicial - totalesDeuda.deudaTotal;
    const porcentajePagado = deudaInicial > 0 ? (deudaPagada / deudaInicial) * 100 : 0;
    return { totalesDeuda, deudaInicial, deudaPagada, porcentajePagado };
  }, [deudas]);

  // Streak calculation - días consecutivos sin exceder el promedio diario ideal
  const racha = useMemo(() => {
    const presupuestoDiarioIdeal = PRESUPUESTO_VARIABLE / daysInMonth;
    let count = 0;
    for (let i = 0; i < dayOfMonth; i++) {
      const fecha = new Date(today.getFullYear(), today.getMonth(), dayOfMonth - i);
      const fechaStr = fecha.toISOString().split('T')[0];
      // Solo contar gastos variables (no fijos, no vales)
      const gastosDia = gastos.filter((g) => g.fecha === fechaStr && !g.esFijo && !g.conVales);
      const totalDia = gastosDia.reduce((sum, g) => sum + g.monto, 0);
      if (totalDia <= presupuestoDiarioIdeal) count++;
      else break;
    }
    return count;
  }, [gastos, dayOfMonth, daysInMonth, today]);

  // Chart data - memoized (solo gastos variables para el progreso)
  const progressChartData = useMemo(() => {
    const data = [];
    let acumulado = 0;
    const presupuestoDiarioIdeal = PRESUPUESTO_VARIABLE / daysInMonth;
    for (let dia = 1; dia <= dayOfMonth; dia++) {
      const fecha = new Date(today.getFullYear(), today.getMonth(), dia).toISOString().split('T')[0];
      // Solo gastos variables (no fijos, no vales)
      const gastosDia = calculations.gastosVariablesDelMes.filter((g) => g.fecha === fecha);
      acumulado += gastosDia.reduce((sum, g) => sum + g.monto, 0);
      data.push({ dia, gastado: acumulado, presupuesto: presupuestoDiarioIdeal * dia });
    }
    return data;
  }, [calculations.gastosVariablesDelMes, dayOfMonth, daysInMonth, today]);

  const distribucionData = useMemo(() => {
    const porCategoria: Record<string, number> = {};
    calculations.gastosDelMes.forEach((g) => {
      porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
    });
    const labels: Record<string, string> = {
      super: 'Super', restaurantes: 'Restaurantes', transporte: 'Transporte',
      entretenimiento: 'Entretenimiento', salud: 'Salud', cafe_snacks: 'Café/Snacks',
    };
    return Object.entries(porCategoria)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, monto], i) => ({ name: labels[cat] || cat, value: monto, color: CHART_COLORS[i % CHART_COLORS.length] }));
  }, [calculations.gastosDelMes]);

  const deudasOrdenadas = useMemo(() =>
    [...deudas].filter((d) => !d.liquidada).sort((a, b) => a.prioridad - b.prioridad).slice(0, 5),
    [deudas]
  );

  // Últimos gastos para mostrar en el dashboard
  const ultimosGastos = useMemo(() => {
    return [...calculations.gastosDelMes]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, 5);
  }, [calculations.gastosDelMes]);

  // Timeline inicia en febrero 2026 (enero es mes de prueba)
  const timelineMilestones = [
    { mes: 'Feb', meta: 'Rappi', completado: deudas.find(d => d.nombre === 'Rappi')?.liquidada || false },
    { mes: 'Mar', meta: 'Nu (Ale)', completado: deudas.find(d => d.nombre === 'Nu' && d.titular === 'alejandra')?.liquidada || false },
    { mes: 'May', meta: 'HEB', completado: deudas.find(d => d.nombre === 'HEB Afirme')?.liquidada || false },
    { mes: 'Jul', meta: 'Amex Gold', completado: deudas.find(d => d.nombre === 'Amex Gold')?.liquidada || false },
    { mes: 'Sep', meta: 'Santander', completado: deudas.find(d => d.nombre === 'Santander LikeU')?.liquidada || false },
    { mes: 'Nov', meta: 'Crédito', completado: deudas.find(d => d.nombre === 'Crédito Personal')?.liquidada || false },
    { mes: 'Ene 27', meta: 'LIBERTAD', completado: deudaCalculations.totalesDeuda.deudaTotal === 0 },
  ];

  // Sparkline data
  const deudaSparklineData = [
    deudaCalculations.deudaInicial,
    deudaCalculations.deudaInicial * 0.95,
    deudaCalculations.deudaInicial * 0.88,
    deudaCalculations.deudaInicial * 0.80,
    deudaCalculations.deudaInicial * 0.72,
    deudaCalculations.totalesDeuda.deudaTotal,
  ];

  const disponibleSparklineData = [
    PRESUPUESTO_VARIABLE,
    PRESUPUESTO_VARIABLE * 0.85,
    PRESUPUESTO_VARIABLE * 0.70,
    PRESUPUESTO_VARIABLE * 0.55,
    calculations.presupuestoRestante + calculations.totalGastadoMes * 0.3,
    calculations.presupuestoRestante,
  ];

  const rachaRecord = 15;

  // Funciones para editar gastos
  const startEditGasto = (gasto: Gasto) => {
    setEditingGasto(gasto);
    setEditForm({
      categoria: gasto.categoria,
      titular: gasto.titular || 'compartido',
      monto: gasto.monto.toString(),
      descripcion: gasto.descripcion || '',
    });
  };

  const cancelEdit = () => {
    setEditingGasto(null);
    setEditForm({ categoria: '', titular: '', monto: '', descripcion: '' });
  };

  const saveEdit = async () => {
    if (!editingGasto?.id) return;
    setSavingEdit(true);
    try {
      await updateGasto(editingGasto.id, {
        categoria: editForm.categoria,
        titular: editForm.titular as 'alejandra' | 'ricardo' | 'compartido',
        monto: parseFloat(editForm.monto) || editingGasto.monto,
        descripcion: editForm.descripcion,
      });
      cancelEdit();
    } catch (error) {
      console.error('Error al guardar:', error);
    }
    setSavingEdit(false);
  };

  const handleDeleteGasto = async (gastoId: string) => {
    if (!gastoId) return;
    try {
      await deleteGasto(gastoId);
    } catch (error) {
      console.error('Error al borrar:', error);
    }
  };

  // Helper para obtener status de cada persona
  const getStatusConfig = (porcentaje: number) => {
    if (porcentaje <= 70) return statusColors.green;
    if (porcentaje <= 100) return statusColors.yellow;
    return statusColors.red;
  };

  // Mostrar skeleton mientras se monta para evitar errores de hidratación
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <MetricCardSkeleton />
          <MetricCardSkeleton />
          <MetricCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ============ ROW 1: DEUDA + VALES ============ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Deuda Total */}
        <div className="metric-card hover-lift">
          <div className="metric-card-header">
            <div className="metric-card-title">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Deuda Total</span>
              <span className="separator">|</span>
              <span className="text-[var(--text-tertiary)]">MXN</span>
            </div>
            <TrendingDown className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="metric-card-subtitle">{deudas.filter(d => !d.liquidada).length} cuentas activas</div>
          <div className="metric-card-value">
            {loadingDeudas ? <span className="animate-pulse">...</span> : formatCompactMoney(deudaCalculations.totalesDeuda.deudaTotal)}
          </div>
          <div className="mt-3 h-10">
            <MiniSparkline data={deudaSparklineData} color="#F87171" />
          </div>
          <div className="metric-card-change">
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">-{formatCompactMoney(deudaCalculations.deudaPagada)} pagado</span>
          </div>
        </div>

        {/* Card 2: Vales de Despensa */}
        <div className="metric-card hover-lift">
          <div className="metric-card-header">
            <div className="metric-card-title">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Vales</span>
              <span className="separator">|</span>
              <span className="text-[var(--text-tertiary)]">Despensa</span>
            </div>
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="metric-card-subtitle">De {formatMoney(VALES_DESPENSA)} mensuales</div>
          <div className={`metric-card-value ${calculations.disponibleVales < 0 ? 'text-red-400' : 'text-blue-400'}`}>
            {loadingGastos ? <span className="animate-pulse">...</span> : formatMoney(calculations.disponibleVales)}
          </div>
          <div className="mt-4">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill bg-gradient-to-r from-blue-500 to-cyan-400"
                style={{ width: `${Math.min((calculations.totalGastadoVales / VALES_DESPENSA) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-[var(--text-tertiary)]">
              <span>{formatMoney(calculations.totalGastadoVales)} usado</span>
              <span>{daysRemaining} días</span>
            </div>
          </div>
        </div>

        {/* Card 3: Racha */}
        <div className="metric-card hover-lift">
          <div className="metric-card-header">
            <div className="metric-card-title">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Racha</span>
            </div>
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div className="metric-card-subtitle">Récord: {rachaRecord} días</div>
          <div className="text-4xl font-black tracking-tight text-orange-400">
            {racha} <span className="text-lg font-medium text-[var(--text-tertiary)]">días</span>
          </div>
          <div className="mt-4 flex gap-1">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className={`flex-1 h-2 rounded-full ${i < Math.min(racha, 7) ? 'bg-gradient-to-r from-orange-500 to-amber-400' : 'bg-[var(--bg-hover)]'}`} />
            ))}
          </div>
          <div className="mt-3 text-sm text-[var(--text-tertiary)]">{racha > 0 ? 'Sigue así!' : 'Comienza hoy'}</div>
        </div>

        {/* Card 4: Días Restantes */}
        <div className="metric-card hover-lift">
          <div className="metric-card-header">
            <div className="metric-card-title">
              <div className="w-2 h-2 rounded-full bg-purple-500" />
              <span>Mes</span>
            </div>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="metric-card-subtitle">{today.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}</div>
          <div className="text-4xl font-black tracking-tight text-purple-400">
            {daysRemaining} <span className="text-lg font-medium text-[var(--text-tertiary)]">días</span>
          </div>
          <div className="mt-4">
            <div className="progress-bar-bg">
              <div
                className="progress-bar-fill bg-gradient-to-r from-purple-500 to-pink-400"
                style={{ width: `${(dayOfMonth / daysInMonth) * 100}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-[var(--text-tertiary)]">
              <span>Día {dayOfMonth}</span>
              <span>de {daysInMonth}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 2: PRESUPUESTOS POR PERSONA ============ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Alejandra */}
        {(() => {
          const status = getStatusConfig(calculations.porcentajePorTitular.alejandra);
          return (
            <button
              onClick={() => setSelectedTitular('alejandra')}
              className={`metric-card hover-lift relative overflow-hidden ${status.bg} ${status.border} border text-left w-full cursor-pointer transition-transform hover:scale-[1.02]`}
            >
              <div className="metric-card-header">
                <div className="metric-card-title">
                  <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                  <span className={status.text}>Alejandra</span>
                </div>
                <div className={`badge ${calculations.porcentajePorTitular.alejandra <= 70 ? 'badge-success' : calculations.porcentajePorTitular.alejandra <= 100 ? 'badge-warning' : 'badge-danger'}`}>
                  {status.label}
                </div>
              </div>
              <div className="metric-card-subtitle">
                Gastado: {formatMoney(calculations.gastosPorTitular.alejandra)} de {formatMoney(presupuestosPersonales.alejandra)}
              </div>
              <div className={`text-4xl font-black tracking-tight ${calculations.disponiblePorTitular.alejandra >= 0 ? 'text-white' : 'text-red-400'}`}>
                {loadingGastos ? <span className="animate-pulse">...</span> : formatMoney(calculations.disponiblePorTitular.alejandra)}
              </div>
              <div className="mt-4">
                <div className="progress-bar-bg">
                  <div
                    className={`progress-bar-fill ${calculations.porcentajePorTitular.alejandra <= 70 ? 'progress-green' : calculations.porcentajePorTitular.alejandra <= 100 ? 'progress-purple' : 'progress-red'}`}
                    style={{ width: `${Math.min(calculations.porcentajePorTitular.alejandra, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-[var(--text-tertiary)]">
                  <span>{Math.round(calculations.porcentajePorTitular.alejandra)}% usado</span>
                  <span className="flex items-center gap-1">Ver desglose <ArrowRight className="w-3 h-3" /></span>
                </div>
              </div>
            </button>
          );
        })()}

        {/* Ricardo */}
        {(() => {
          const status = getStatusConfig(calculations.porcentajePorTitular.ricardo);
          return (
            <button
              onClick={() => setSelectedTitular('ricardo')}
              className={`metric-card hover-lift relative overflow-hidden ${status.bg} ${status.border} border text-left w-full cursor-pointer transition-transform hover:scale-[1.02]`}
            >
              <div className="metric-card-header">
                <div className="metric-card-title">
                  <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                  <span className={status.text}>Ricardo</span>
                </div>
                <div className={`badge ${calculations.porcentajePorTitular.ricardo <= 70 ? 'badge-success' : calculations.porcentajePorTitular.ricardo <= 100 ? 'badge-warning' : 'badge-danger'}`}>
                  {status.label}
                </div>
              </div>
              <div className="metric-card-subtitle">
                Gastado: {formatMoney(calculations.gastosPorTitular.ricardo)} de {formatMoney(presupuestosPersonales.ricardo)}
              </div>
              <div className={`text-4xl font-black tracking-tight ${calculations.disponiblePorTitular.ricardo >= 0 ? 'text-white' : 'text-red-400'}`}>
                {loadingGastos ? <span className="animate-pulse">...</span> : formatMoney(calculations.disponiblePorTitular.ricardo)}
              </div>
              <div className="mt-4">
                <div className="progress-bar-bg">
                  <div
                    className={`progress-bar-fill ${calculations.porcentajePorTitular.ricardo <= 70 ? 'progress-green' : calculations.porcentajePorTitular.ricardo <= 100 ? 'progress-purple' : 'progress-red'}`}
                    style={{ width: `${Math.min(calculations.porcentajePorTitular.ricardo, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-[var(--text-tertiary)]">
                  <span>{Math.round(calculations.porcentajePorTitular.ricardo)}% usado</span>
                  <span className="flex items-center gap-1">Ver desglose <ArrowRight className="w-3 h-3" /></span>
                </div>
              </div>
            </button>
          );
        })()}

        {/* Compartido */}
        {(() => {
          const status = getStatusConfig(calculations.porcentajePorTitular.compartido);
          return (
            <button
              onClick={() => setSelectedTitular('compartido')}
              className={`metric-card hover-lift relative overflow-hidden ${status.bg} ${status.border} border text-left w-full cursor-pointer transition-transform hover:scale-[1.02]`}
            >
              <div className="metric-card-header">
                <div className="metric-card-title">
                  <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                  <span className={status.text}>Compartido</span>
                </div>
                <div className={`badge ${calculations.porcentajePorTitular.compartido <= 70 ? 'badge-success' : calculations.porcentajePorTitular.compartido <= 100 ? 'badge-warning' : 'badge-danger'}`}>
                  {status.label}
                </div>
              </div>
              <div className="metric-card-subtitle">
                Gastado: {formatMoney(calculations.gastosPorTitular.compartido)} de {formatMoney(presupuestosPersonales.compartido)}
              </div>
              <div className={`text-4xl font-black tracking-tight ${calculations.disponiblePorTitular.compartido >= 0 ? 'text-white' : 'text-red-400'}`}>
                {loadingGastos ? <span className="animate-pulse">...</span> : formatMoney(calculations.disponiblePorTitular.compartido)}
              </div>
              <div className="mt-4">
                <div className="progress-bar-bg">
                  <div
                    className={`progress-bar-fill ${calculations.porcentajePorTitular.compartido <= 70 ? 'progress-green' : calculations.porcentajePorTitular.compartido <= 100 ? 'progress-purple' : 'progress-red'}`}
                    style={{ width: `${Math.min(calculations.porcentajePorTitular.compartido, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between mt-2 text-xs text-[var(--text-tertiary)]">
                  <span>{Math.round(calculations.porcentajePorTitular.compartido)}% usado</span>
                  <span className="flex items-center gap-1">Ver desglose <ArrowRight className="w-3 h-3" /></span>
                </div>
              </div>
            </button>
          );
        })()}
      </div>

      {/* ============ MODAL: DESGLOSE DE GASTOS ============ */}
      {selectedTitular && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4" onClick={() => setSelectedTitular(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90vh] sm:max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-white capitalize">
                  Gastos de {selectedTitular === 'compartido' ? 'Compartidos' : selectedTitular}
                </h3>
                <p className="text-sm text-white/50">
                  {formatMoney(calculations.gastosPorTitular[selectedTitular])} de {formatMoney(presupuestosPersonales[selectedTitular])}
                </p>
              </div>
              <button
                onClick={() => setSelectedTitular(null)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* Por categoría */}
              {calculations.gastosPorCategoriaPorTitular[selectedTitular].length > 0 ? (
                <>
                  <h4 className="text-sm font-medium text-white/70 mb-3">Por categoría</h4>
                  <div className="space-y-2 mb-6">
                    {calculations.gastosPorCategoriaPorTitular[selectedTitular].map((cat, idx) => (
                      <div key={cat.categoria} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                            {categoriaIconos[cat.categoria] || <MoreHorizontal className="w-4 h-4" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{categoriaLabels[cat.categoria] || cat.categoria}</p>
                            <p className="text-xs text-white/50">{cat.count} gasto(s)</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-white">{formatMoney(cat.total)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Lista de gastos */}
                  <h4 className="text-sm font-medium text-white/70 mb-3">Detalle de gastos</h4>
                  <div className="space-y-2">
                    {calculations.gastosListaPorTitular[selectedTitular].map((gasto, idx) => (
                      <div key={gasto.id || idx} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{gasto.descripcion || categoriaLabels[gasto.categoria] || gasto.categoria}</p>
                          <p className="text-xs text-white/50">
                            {new Date(gasto.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} • {categoriaLabels[gasto.categoria] || gasto.categoria}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <span className="text-sm font-medium text-white mr-1">{formatMoney(gasto.monto)}</span>
                          <button
                            onClick={() => startEditGasto(gasto)}
                            className="p-2 hover:bg-purple-500/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4 text-purple-400" />
                          </button>
                          <button
                            onClick={() => gasto.id && handleDeleteGasto(gasto.id)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Borrar"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <Wallet className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/50">No hay gastos registrados</p>
                  <p className="text-white/30 text-sm mt-1">
                    Usa el chat para registrar: "Gasté $200 en café"
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex justify-between items-center">
              <span className="text-sm text-white/50">
                Disponible: <span className={calculations.disponiblePorTitular[selectedTitular] >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {formatMoney(calculations.disponiblePorTitular[selectedTitular])}
                </span>
              </span>
              <button
                onClick={() => setSelectedTitular(null)}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-white text-sm font-medium transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL: EDITAR GASTO ============ */}
      {editingGasto && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-2 sm:p-4" onClick={cancelEdit}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl w-full max-w-[calc(100vw-1rem)] sm:max-w-md p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Editar Gasto</h3>
              <button onClick={cancelEdit} className="p-1.5 hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-white/60" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Descripción */}
              <div>
                <label className="text-sm text-white/50 block mb-1">Descripción</label>
                <input
                  type="text"
                  value={editForm.descripcion}
                  onChange={(e) => setEditForm({ ...editForm, descripcion: e.target.value })}
                  placeholder="Descripción del gasto"
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Monto */}
              <div>
                <label className="text-sm text-white/50 block mb-1">Monto</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
                  <input
                    type="number"
                    value={editForm.monto}
                    onChange={(e) => setEditForm({ ...editForm, monto: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg pl-8 pr-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="text-sm text-white/50 block mb-1">Categoría</label>
                <div className="relative">
                  <select
                    value={editForm.categoria}
                    onChange={(e) => setEditForm({ ...editForm, categoria: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                  >
                    {categorias.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#1a1a2e] text-white">
                        {categoriaLabels[cat] || cat}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                </div>
              </div>

              {/* Titular */}
              <div>
                <label className="text-sm text-white/50 block mb-1">Titular</label>
                <div className="relative">
                  <select
                    value={editForm.titular}
                    onChange={(e) => setEditForm({ ...editForm, titular: e.target.value })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
                  >
                    <option value="alejandra" className="bg-[#1a1a2e] text-white">Alejandra</option>
                    <option value="ricardo" className="bg-[#1a1a2e] text-white">Ricardo</option>
                    <option value="compartido" className="bg-[#1a1a2e] text-white">Compartido</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={cancelEdit}
                className="flex-1 py-2.5 text-white/70 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={savingEdit}
                className="flex-1 py-2.5 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                {savingEdit ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ ROW 2: CHART CARDS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progreso del Mes - Area Chart */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-title">
              <div className="dot bg-purple-500" />
              <span>Progreso del Mes</span>
            </div>
            <span className="text-sm text-[var(--text-tertiary)]">{today.toLocaleDateString('es-MX', { month: 'long' })}</span>
          </div>
          <div className="h-64">
            {chartsReady && !loadingGastos ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={progressChartData}>
                  <defs>
                    <linearGradient id="colorGastado" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPresupuesto" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6EE7B7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6EE7B7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dia" stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#6B7280" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: '#1C2128', border: '1px solid #30363D', borderRadius: '8px' }} labelStyle={{ color: '#9CA3AF' }} formatter={(value: number) => [formatMoney(value), '']} />
                  <Area type="monotone" dataKey="presupuesto" stroke="#6EE7B7" strokeWidth={2} strokeDasharray="5 5" fill="url(#colorPresupuesto)" name="Meta" />
                  <Area type="monotone" dataKey="gastado" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorGastado)" name="Gastado" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500" /><span className="text-sm text-[var(--text-secondary)]">Gastado</span></div>
            <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400 opacity-50" /><span className="text-sm text-[var(--text-secondary)]">Meta</span></div>
          </div>
        </div>

        {/* Distribución - Donut Chart */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-title">
              <div className="dot bg-pink-500" />
              <span>Distribución</span>
            </div>
            <span className="text-sm text-[var(--text-tertiary)]">Por categoría</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center">
            <div className="w-full sm:w-1/2 h-48 sm:h-64 relative">
              {chartsReady && !loadingGastos && distribucionData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={distribucionData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                      {distribucionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#1C2128', border: '1px solid #30363D', borderRadius: '8px' }} formatter={(value: number) => formatMoney(value)} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center">
                  {loadingGastos ? (
                    <div className="w-8 h-8 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <p className="text-[var(--text-tertiary)] text-sm">Sin gastos</p>
                  )}
                </div>
              )}
              {distribucionData.length > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{formatCompactMoney(calculations.totalGastadoMes)}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">Total</p>
                  </div>
                </div>
              )}
            </div>
            <div className="w-full sm:w-1/2 space-y-2 sm:space-y-3 pt-4 sm:pt-0 sm:pl-4">
              {distribucionData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-[var(--text-secondary)] truncate">{item.name}</span>
                  </div>
                  <span className="text-sm font-medium text-white flex-shrink-0">{formatMoney(item.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ============ ROW 3: DATA TABLES ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deudas por Prioridad */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-title">
              <div className="dot bg-red-500" />
              <span>Deudas por Prioridad</span>
            </div>
            <Link href="/deudas" className="text-sm text-purple-400 hover:text-purple-300">Ver todas</Link>
          </div>
          <div className="data-table">
            <div className="data-table-header grid-cols-[1fr_auto_auto]">
              <span>Deuda</span>
              <span className="text-right">Saldo</span>
              <span className="text-right">CAT</span>
            </div>
            {deudasOrdenadas.map((deuda, index) => (
              <div key={deuda.id} className="data-table-row grid-cols-[1fr_auto_auto]">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-red-500/20 text-red-400' : index === 1 ? 'bg-orange-500/20 text-orange-400' : 'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'}`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-white">{deuda.nombre}</p>
                    <p className="text-xs text-[var(--text-tertiary)] capitalize">{deuda.titular}</p>
                  </div>
                </div>
                <div className="text-right"><p className="font-medium text-white">{formatMoney(deuda.saldoActual)}</p></div>
                <div className="text-right">
                  <span className={`badge ${deuda.cat > 100 ? 'badge-danger' : deuda.cat > 50 ? 'badge-warning' : 'badge-info'}`}>{deuda.cat}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Últimos Gastos */}
        <div className="glass-card">
          <div className="card-header">
            <div className="card-header-title">
              <div className="dot bg-emerald-500" />
              <span>Últimos Gastos</span>
            </div>
            <Link href="/registrar" className="btn-primary text-sm py-2 px-4">+ Registrar</Link>
          </div>
          <div className="space-y-2">
            {ultimosGastos.length === 0 ? (
              <div className="text-center py-8 text-[var(--text-tertiary)]">
                No hay gastos este mes
              </div>
            ) : (
              ultimosGastos.map((gasto, index) => (
                <div key={gasto.id || index} className="flex items-center justify-between p-3 bg-[var(--bg-elevated)] rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
                      {categoriaIconos[gasto.categoria] || <MoreHorizontal className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{gasto.descripcion || categoriaLabels[gasto.categoria] || gasto.categoria}</p>
                      <p className="text-xs text-[var(--text-tertiary)] capitalize">{gasto.titular || 'compartido'} • {new Date(gasto.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-white">{formatMoney(gasto.monto)}</span>
                </div>
              ))
            )}
          </div>
          {ultimosGastos.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <Link href="/gastos" className="text-sm text-purple-400 hover:text-purple-300">
                Ver todos los gastos →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* ============ ROW 4: PAYMENT REMINDERS & PWA ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PaymentReminders />
        <PWAWidget />
      </div>

      {/* ============ ROW 5: TIMELINE 2026 ============ */}
      <div className="glass-card">
        <div className="card-header">
          <div className="card-header-title">
            <div className="dot bg-purple-500" />
            <span>Camino a la Libertad (Feb 2026 - Ene 2027)</span>
          </div>
          <div className="badge badge-purple">{deudaCalculations.porcentajePagado.toFixed(1)}% completado</div>
        </div>
        <div className="relative mt-6">
          <div className="absolute top-4 left-0 right-0 h-1 bg-[var(--bg-hover)] rounded-full">
            <div className="h-full bg-gradient-to-r from-purple-500 to-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${deudaCalculations.porcentajePagado}%` }} />
          </div>
          <div className="relative flex justify-between">
            {timelineMilestones.map((milestone, index) => (
              <div key={index} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all ${
                  milestone.completado ? 'bg-emerald-500 text-white' :
                  index === timelineMilestones.findIndex(m => !m.completado) ? 'bg-purple-500 text-white animate-pulse' :
                  'bg-[var(--bg-hover)] text-[var(--text-tertiary)]'
                }`}>
                  {milestone.completado ? <CheckCircle2 className="w-4 h-4" /> : index === timelineMilestones.length - 1 ? <Target className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <span className={`mt-2 text-xs font-medium ${milestone.completado ? 'text-emerald-400' : 'text-[var(--text-tertiary)]'}`}>{milestone.mes}</span>
                <span className={`text-xs ${milestone.completado ? 'text-[var(--text-secondary)]' : 'text-[var(--text-tertiary)]'}`}>{milestone.meta}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
          <p className="text-purple-300">Cada peso que no gastas hoy te acerca a la libertad financiera</p>
        </div>
      </div>
    </div>
  );
}
