'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  User,
  Users,
  Home,
  Car,
  CreditCard,
  Fuel,
  Zap,
  Flame,
  Tv,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Receipt
} from 'lucide-react';
import { subscribeToGastos, Gasto } from '@/lib/firestore';
import {
  gastosFijos,
  suscripciones,
  deudasIniciales,
  PRESUPUESTO_IMPREVISTOS,
  presupuestosPersonales
} from '@/lib/data';
import { formatMoney } from '@/lib/utils';

// Asignar titular a gastos fijos (Alejandra paga todo pero es responsable de gestionar)
const gastosFijosConTitular = [
  { ...gastosFijos[0], titular: 'alejandra', icono: Home }, // Renta
  { ...gastosFijos[1], titular: 'alejandra', icono: Car }, // Pago de carro
  { ...gastosFijos[2], titular: 'alejandra', icono: CreditCard }, // Crédito personal
  { ...gastosFijos[3], titular: 'alejandra', icono: Fuel }, // Gasolina
  { ...gastosFijos[4], titular: 'compartido', icono: Zap }, // Luz
  { ...gastosFijos[5], titular: 'compartido', icono: Flame }, // Gas
];

export default function ResumenGlobal() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>('alejandra');

  useEffect(() => {
    const unsubscribe = subscribeToGastos((gastosActualizados) => {
      setGastos(gastosActualizados);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const resumen = useMemo(() => {
    const today = new Date();
    const mesActual = today.toISOString().slice(0, 7);
    const gastosDelMes = gastos.filter(g => g.fecha.startsWith(mesActual));

    // Gastos variables por titular (sin imprevistos)
    const gastosVariables = gastosDelMes.filter(g => !g.esFijo && !g.conVales && g.categoria !== 'imprevistos');

    // Imprevistos del mes
    const gastosImprevistos = gastosDelMes.filter(g => g.categoria === 'imprevistos');
    const totalImprevistos = gastosImprevistos.reduce((sum, g) => sum + g.monto, 0);

    // Calcular por persona
    const calcularPorPersona = (titular: 'alejandra' | 'ricardo') => {
      // Gastos fijos que paga esta persona
      const fijosPagados = gastosFijosConTitular
        .filter(gf => gf.titular === titular)
        .reduce((sum, gf) => {
          const montoMensual = gf.frecuencia === 'bimestral' ? gf.monto / 2 : gf.monto;
          return sum + montoMensual;
        }, 0);

      // Suscripciones que paga esta persona
      const subsPagadas = suscripciones
        .filter(s => s.titular === titular)
        .reduce((sum, s) => sum + s.monto, 0);

      // Deudas (pagos mínimos) de esta persona
      const deudasPagadas = deudasIniciales
        .filter(d => d.titular === titular && !d.liquidada)
        .reduce((sum, d) => sum + d.pagoMinimo, 0);

      // Gastos variables de esta persona
      const variablesPagados = gastosVariables
        .filter(g => g.titular === titular)
        .reduce((sum, g) => sum + g.monto, 0);

      return {
        fijos: fijosPagados,
        suscripciones: subsPagadas,
        deudas: deudasPagadas,
        variables: variablesPagados,
        total: fijosPagados + subsPagadas + deudasPagadas + variablesPagados,
      };
    };

    // Gastos compartidos
    const fijosCompartidos = gastosFijosConTitular
      .filter(gf => gf.titular === 'compartido')
      .reduce((sum, gf) => {
        const montoMensual = gf.frecuencia === 'bimestral' ? gf.monto / 2 : gf.monto;
        return sum + montoMensual;
      }, 0);

    const variablesCompartidos = gastosVariables
      .filter(g => g.titular === 'compartido' || !g.titular)
      .reduce((sum, g) => sum + g.monto, 0);

    return {
      alejandra: calcularPorPersona('alejandra'),
      ricardo: calcularPorPersona('ricardo'),
      compartido: {
        fijos: fijosCompartidos,
        variables: variablesCompartidos,
        imprevistos: totalImprevistos,
        total: fijosCompartidos + variablesCompartidos + totalImprevistos,
      },
      imprevistos: {
        gastado: totalImprevistos,
        presupuesto: PRESUPUESTO_IMPREVISTOS,
        disponible: PRESUPUESTO_IMPREVISTOS - totalImprevistos,
        detalle: gastosImprevistos,
      },
    };
  }, [gastos]);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (loading) {
    return (
      <div className="glass-card animate-pulse">
        <div className="h-8 bg-white/5 rounded w-1/3 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const personas = [
    {
      id: 'alejandra',
      nombre: 'Alejandra',
      color: 'pink',
      data: resumen.alejandra,
      presupuestoVariable: presupuestosPersonales.alejandra,
    },
    {
      id: 'ricardo',
      nombre: 'Ricardo',
      color: 'blue',
      data: resumen.ricardo,
      presupuestoVariable: presupuestosPersonales.ricardo,
    },
  ];

  return (
    <div className="glass-card">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Resumen Global de Pagos</h3>
            <p className="text-xs text-white/50">Quién paga qué este mes</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {/* Alejandra y Ricardo */}
        {personas.map((persona) => (
          <div key={persona.id} className="bg-white/5 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleSection(persona.id)}
              className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  persona.color === 'pink' ? 'bg-pink-500/20' : 'bg-blue-500/20'
                }`}>
                  <User className={`w-5 h-5 ${
                    persona.color === 'pink' ? 'text-pink-400' : 'text-blue-400'
                  }`} />
                </div>
                <div className="text-left">
                  <p className="font-medium text-white">{persona.nombre}</p>
                  <p className="text-xs text-white/50">
                    {persona.data.total > 0 ? `Total: ${formatMoney(persona.data.total)}` : 'Sin gastos'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-white">{formatMoney(persona.data.total)}</span>
                {expandedSection === persona.id ? (
                  <ChevronUp className="w-5 h-5 text-white/40" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-white/40" />
                )}
              </div>
            </button>

            {expandedSection === persona.id && (
              <div className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
                {persona.data.fijos > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Gastos fijos</span>
                    <span className="text-white">{formatMoney(persona.data.fijos)}</span>
                  </div>
                )}
                {persona.data.deudas > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Pagos de deudas</span>
                    <span className="text-white">{formatMoney(persona.data.deudas)}</span>
                  </div>
                )}
                {persona.data.suscripciones > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">Suscripciones</span>
                    <span className="text-white">{formatMoney(persona.data.suscripciones)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Gastos variables</span>
                  <span className="text-white">
                    {formatMoney(persona.data.variables)} / {formatMoney(persona.presupuestoVariable)}
                  </span>
                </div>

                {/* Desglose de gastos fijos */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-white/40 mb-2">Responsable de pagar:</p>
                  <div className="space-y-1">
                    {gastosFijosConTitular
                      .filter(gf => gf.titular === persona.id)
                      .map((gf, idx) => {
                        const Icono = gf.icono;
                        const montoMensual = gf.frecuencia === 'bimestral' ? gf.monto / 2 : gf.monto;
                        return (
                          <div key={idx} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Icono className="w-3 h-3 text-white/40" />
                              <span className="text-white/60">{gf.nombre}</span>
                            </div>
                            <span className="text-white/80">{formatMoney(montoMensual)}</span>
                          </div>
                        );
                      })}
                    {suscripciones
                      .filter(s => s.titular === persona.id)
                      .map((sub, idx) => (
                        <div key={`sub-${idx}`} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Tv className="w-3 h-3 text-white/40" />
                            <span className="text-white/60">{sub.nombre}</span>
                          </div>
                          <span className="text-white/80">{formatMoney(sub.monto)}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Compartido */}
        <div className="bg-white/5 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('compartido')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-green-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Compartido</p>
                <p className="text-xs text-white/50">Gastos entre ambos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white">{formatMoney(resumen.compartido.total)}</span>
              {expandedSection === 'compartido' ? (
                <ChevronUp className="w-5 h-5 text-white/40" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/40" />
              )}
            </div>
          </button>

          {expandedSection === 'compartido' && (
            <div className="px-4 pb-4 space-y-2 border-t border-white/10 pt-3">
              {resumen.compartido.fijos > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Servicios (Luz, Gas)</span>
                  <span className="text-white">{formatMoney(resumen.compartido.fijos)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-white/60">Gastos variables</span>
                <span className="text-white">
                  {formatMoney(resumen.compartido.variables)} / {formatMoney(presupuestosPersonales.compartido)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Fondo de Imprevistos */}
        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-xl overflow-hidden">
          <button
            onClick={() => toggleSection('imprevistos')}
            className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-red-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-white">Fondo de Imprevistos</p>
                <p className="text-xs text-white/50">
                  {formatMoney(resumen.imprevistos.disponible)} disponible de {formatMoney(PRESUPUESTO_IMPREVISTOS)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-lg font-bold ${resumen.imprevistos.disponible >= 0 ? 'text-white' : 'text-red-400'}`}>
                {formatMoney(resumen.imprevistos.gastado)}
              </span>
              {expandedSection === 'imprevistos' ? (
                <ChevronUp className="w-5 h-5 text-white/40" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white/40" />
              )}
            </div>
          </button>

          {expandedSection === 'imprevistos' && (
            <div className="px-4 pb-4 border-t border-white/10 pt-3">
              {/* Barra de progreso */}
              <div className="mb-3">
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      resumen.imprevistos.gastado > PRESUPUESTO_IMPREVISTOS ? 'bg-red-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${Math.min((resumen.imprevistos.gastado / PRESUPUESTO_IMPREVISTOS) * 100, 100)}%` }}
                  />
                </div>
              </div>

              {/* Lista de imprevistos */}
              {resumen.imprevistos.detalle.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs text-white/40">Gastos de este mes:</p>
                  {resumen.imprevistos.detalle.map((g, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-white/60">{g.descripcion || 'Imprevisto'}</span>
                      <span className="text-white">{formatMoney(g.monto)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/50 text-center py-2">
                  Sin imprevistos este mes
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Total global */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex justify-between items-center">
          <span className="text-white/60">Total comprometido este mes</span>
          <span className="text-xl font-bold text-white">
            {formatMoney(resumen.alejandra.total + resumen.ricardo.total + resumen.compartido.total)}
          </span>
        </div>
      </div>
    </div>
  );
}
