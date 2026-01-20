'use client';

import { useState, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronUp, User, Users, Wallet } from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import { PRESUPUESTO_VARIABLE, presupuestosPersonales } from '@/lib/data';
import { formatMoney } from '@/lib/utils';

// Obtener inicio y fin de la semana actual (Lunes a Domingo)
function getWeekBounds(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo

  const monday = new Date(d.setDate(diff));
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return { monday, sunday };
}

function getDayName(date: Date) {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  return days[date.getDay()];
}

export default function WeeklyBudget() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const weekData = useMemo(() => {
    const today = new Date();
    const { monday, sunday } = getWeekBounds(today);

    // Número de semana en el mes (1-5)
    const weekOfMonth = Math.ceil(today.getDate() / 7);

    // Presupuesto semanal = mensual / 4 (aproximado, más fácil de entender)
    const presupuestoSemanal = Math.floor(PRESUPUESTO_VARIABLE / 4);
    const presupuestoSemanalPorPersona = {
      alejandra: Math.floor(presupuestosPersonales.alejandra / 4),
      ricardo: Math.floor(presupuestosPersonales.ricardo / 4),
      compartido: Math.floor(presupuestosPersonales.compartido / 4),
    };

    // Filtrar gastos de esta semana (solo variables, no fijos, no vales)
    const gastosSemanales = gastos.filter(g => {
      if (g.esFijo || g.conVales) return false;
      const fechaGasto = new Date(g.fecha + 'T12:00:00');
      return fechaGasto >= monday && fechaGasto <= sunday;
    });

    // Total gastado esta semana
    const totalGastadoSemana = gastosSemanales.reduce((sum, g) => sum + g.monto, 0);

    // Gastos por titular
    const gastosPorTitular = {
      alejandra: gastosSemanales.filter(g => g.titular === 'alejandra').reduce((sum, g) => sum + g.monto, 0),
      ricardo: gastosSemanales.filter(g => g.titular === 'ricardo').reduce((sum, g) => sum + g.monto, 0),
      compartido: gastosSemanales.filter(g => g.titular === 'compartido' || !g.titular).reduce((sum, g) => sum + g.monto, 0),
    };

    // Disponible por titular
    const disponiblePorTitular = {
      alejandra: presupuestoSemanalPorPersona.alejandra - gastosPorTitular.alejandra,
      ricardo: presupuestoSemanalPorPersona.ricardo - gastosPorTitular.ricardo,
      compartido: presupuestoSemanalPorPersona.compartido - gastosPorTitular.compartido,
    };

    // Días de la semana con gastos
    const diasSemana = [];
    for (let i = 0; i < 7; i++) {
      const dia = new Date(monday);
      dia.setDate(monday.getDate() + i);
      const fechaStr = dia.toISOString().split('T')[0];
      const gastosDelDia = gastosSemanales.filter(g => g.fecha === fechaStr);
      const totalDia = gastosDelDia.reduce((sum, g) => sum + g.monto, 0);
      const esHoy = fechaStr === today.toISOString().split('T')[0];
      const esPasado = dia < today && !esHoy;

      diasSemana.push({
        fecha: fechaStr,
        nombre: getDayName(dia),
        numero: dia.getDate(),
        total: totalDia,
        esHoy,
        esPasado,
        esFuturo: !esHoy && !esPasado,
      });
    }

    // Disponible total
    const disponibleSemana = presupuestoSemanal - totalGastadoSemana;

    // Porcentaje usado
    const porcentajeUsado = (totalGastadoSemana / presupuestoSemanal) * 100;

    // Estado (semáforo)
    const diasRestantesSemana = diasSemana.filter(d => d.esFuturo || d.esHoy).length;
    let status: 'green' | 'yellow' | 'red' = 'green';
    if (porcentajeUsado >= 100) status = 'red';
    else if (porcentajeUsado >= 70) status = 'yellow';

    return {
      weekOfMonth,
      presupuestoSemanal,
      presupuestoSemanalPorPersona,
      totalGastadoSemana,
      gastosPorTitular,
      disponiblePorTitular,
      disponibleSemana,
      porcentajeUsado,
      status,
      diasSemana,
      diasRestantesSemana,
      monday,
      sunday,
    };
  }, [gastos]);

  const statusConfig = {
    green: {
      bg: 'from-emerald-500/20 to-green-500/10',
      border: 'border-emerald-500/30',
      text: 'text-emerald-400',
      barColor: 'bg-emerald-500',
      label: 'Vas bien esta semana',
    },
    yellow: {
      bg: 'from-amber-500/20 to-orange-500/10',
      border: 'border-amber-500/30',
      text: 'text-amber-400',
      barColor: 'bg-amber-500',
      label: 'Cuidado, ya llevas mucho',
    },
    red: {
      bg: 'from-red-500/20 to-pink-500/10',
      border: 'border-red-500/30',
      text: 'text-red-400',
      barColor: 'bg-red-500',
      label: 'Te pasaste del presupuesto',
    },
  };

  const config = statusConfig[weekData.status];

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-48 bg-[#252931] rounded-xl" />
      </div>
    );
  }

  return (
    <div className={`glass-card bg-gradient-to-br ${config.bg} border ${config.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Semana {weekData.weekOfMonth}</h3>
            <p className="text-xs text-white/50">
              {weekData.monday.getDate()} - {weekData.sunday.getDate()} {weekData.sunday.toLocaleDateString('es-MX', { month: 'short' })}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text} border ${config.border}`}>
          {config.label}
        </div>
      </div>

      {/* Main number - Disponible esta semana */}
      <div className="text-center py-4">
        <p className="text-sm text-white/50 mb-1">Te queda esta semana</p>
        <p className={`text-5xl font-bold ${weekData.disponibleSemana >= 0 ? 'text-white' : 'text-red-400'}`}>
          {formatMoney(Math.max(0, weekData.disponibleSemana))}
        </p>
        {weekData.disponibleSemana < 0 && (
          <p className="text-red-400 text-sm mt-1">
            Te pasaste por {formatMoney(Math.abs(weekData.disponibleSemana))}
          </p>
        )}
        <p className="text-white/30 text-xs mt-2">
          de {formatMoney(weekData.presupuestoSemanal)} semanales
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${config.barColor}`}
            style={{ width: `${Math.min(weekData.porcentajeUsado, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-white/50">
          <span>Gastado: {formatMoney(weekData.totalGastadoSemana)}</span>
          <span>{weekData.diasRestantesSemana} días restantes</span>
        </div>
      </div>

      {/* Mini calendar - días de la semana */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {weekData.diasSemana.map((dia) => (
          <div
            key={dia.fecha}
            className={`text-center py-2 rounded-lg transition-all ${
              dia.esHoy
                ? 'bg-purple-500/30 border border-purple-500/50'
                : dia.esPasado
                ? 'bg-white/5'
                : 'bg-white/5 opacity-50'
            }`}
          >
            <p className={`text-[10px] ${dia.esHoy ? 'text-purple-300' : 'text-white/40'}`}>
              {dia.nombre}
            </p>
            <p className={`text-xs font-medium ${dia.esHoy ? 'text-white' : 'text-white/60'}`}>
              {dia.numero}
            </p>
            {dia.total > 0 && (
              <p className={`text-[10px] font-medium ${
                dia.total > weekData.presupuestoSemanal / 7 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                ${Math.round(dia.total / 1000)}k
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Toggle details */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full flex items-center justify-center gap-2 py-2 text-white/50 hover:text-white/70 transition-colors"
      >
        <span className="text-xs">Ver por persona</span>
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Desglose por persona */}
      {showDetails && (
        <div className="pt-4 border-t border-white/10 space-y-3 animate-in slide-in-from-top-2 duration-200">
          {/* Alejandra */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-pink-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Ale</p>
                <p className="text-xs text-white/40">
                  {formatMoney(weekData.gastosPorTitular.alejandra)} de {formatMoney(weekData.presupuestoSemanalPorPersona.alejandra)}
                </p>
              </div>
            </div>
            <p className={`text-lg font-bold ${weekData.disponiblePorTitular.alejandra >= 0 ? 'text-pink-400' : 'text-red-400'}`}>
              {formatMoney(weekData.disponiblePorTitular.alejandra)}
            </p>
          </div>

          {/* Ricardo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <User className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Ricardo</p>
                <p className="text-xs text-white/40">
                  {formatMoney(weekData.gastosPorTitular.ricardo)} de {formatMoney(weekData.presupuestoSemanalPorPersona.ricardo)}
                </p>
              </div>
            </div>
            <p className={`text-lg font-bold ${weekData.disponiblePorTitular.ricardo >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
              {formatMoney(weekData.disponiblePorTitular.ricardo)}
            </p>
          </div>

          {/* Compartido */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-white font-medium">Compartido</p>
                <p className="text-xs text-white/40">
                  {formatMoney(weekData.gastosPorTitular.compartido)} de {formatMoney(weekData.presupuestoSemanalPorPersona.compartido)}
                </p>
              </div>
            </div>
            <p className={`text-lg font-bold ${weekData.disponiblePorTitular.compartido >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatMoney(weekData.disponiblePorTitular.compartido)}
            </p>
          </div>

          {/* Tip */}
          <div className="mt-3 p-3 bg-white/5 rounded-lg">
            <p className="text-xs text-white/50 text-center">
              💡 Cada quien tiene ~{formatMoney(weekData.presupuestoSemanalPorPersona.alejandra)} por semana para gastar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
