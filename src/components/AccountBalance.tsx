'use client';

import { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Building2, CreditCard, Plus, ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';
import { subscribeToGastos, subscribeToIngresos, Gasto, Ingreso } from '@/lib/firestore';
import { cuentasBanco } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { useMonth } from '@/contexts/MonthContext';

interface SaldoCuenta {
  id: string;
  nombre: string;
  tipo: 'debito' | 'credito' | 'sin_asignar';
  titular: 'alejandra' | 'ricardo' | 'compartido';
  ingresos: number;
  egresos: number;
  balance: number;
}

export default function AccountBalance() {
  const { selectedMonth } = useMonth();
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [expanded, setExpanded] = useState(true);
  const [showAddIngreso, setShowAddIngreso] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const unsubGastos = subscribeToGastos(
      (g) => { if (isMounted) setGastos(g); },
      (error) => console.error('AccountBalance gastos error:', error)
    );
    const unsubIngresos = subscribeToIngresos(
      (i) => { if (isMounted) setIngresos(i); },
      (error) => console.error('AccountBalance ingresos error:', error)
    );

    return () => {
      isMounted = false;
      unsubGastos();
      unsubIngresos();
    };
  }, []);

  // Calcular balance por cuenta del mes seleccionado
  const balancesPorCuenta = useMemo(() => {
    const gastosDelMes = gastos.filter(g => g.fecha.startsWith(selectedMonth));
    const ingresosDelMes = ingresos.filter(i => i.fecha.startsWith(selectedMonth));

    // IDs de cuentas conocidas
    const cuentasIds = cuentasBanco.map(c => c.id);

    const balances: SaldoCuenta[] = cuentasBanco.map(cuenta => {
      const egresosTotal = gastosDelMes
        .filter(g => g.metodoPago === cuenta.id)
        .reduce((sum, g) => sum + g.monto, 0);

      const ingresosTotal = ingresosDelMes
        .filter(i => i.cuenta === cuenta.id)
        .reduce((sum, i) => sum + i.monto, 0);

      return {
        id: cuenta.id,
        nombre: cuenta.nombre,
        tipo: cuenta.tipo,
        titular: cuenta.titular,
        ingresos: ingresosTotal,
        egresos: egresosTotal,
        balance: ingresosTotal - egresosTotal,
      };
    });

    // Agregar gastos sin método de pago asignado
    const gastosSinMetodo = gastosDelMes.filter(g => !g.metodoPago || !cuentasIds.includes(g.metodoPago));
    const egresosSinMetodo = gastosSinMetodo.reduce((sum, g) => sum + g.monto, 0);

    if (egresosSinMetodo > 0) {
      balances.push({
        id: 'sin_asignar',
        nombre: 'Sin método asignado',
        tipo: 'sin_asignar',
        titular: 'compartido',
        ingresos: 0,
        egresos: egresosSinMetodo,
        balance: -egresosSinMetodo,
      });
    }

    return balances;
  }, [gastos, ingresos, selectedMonth]);

  // Totales generales
  const totales = useMemo(() => {
    const ingresosDelMes = ingresos.filter(i => i.fecha.startsWith(selectedMonth));
    const gastosDelMes = gastos.filter(g => g.fecha.startsWith(selectedMonth));

    const totalIngresos = ingresosDelMes.reduce((sum, i) => sum + i.monto, 0);
    const totalEgresos = gastosDelMes.reduce((sum, g) => sum + g.monto, 0);

    return {
      ingresos: totalIngresos,
      egresos: totalEgresos,
      balance: totalIngresos - totalEgresos,
    };
  }, [gastos, ingresos, selectedMonth]);

  // Separar por titular
  const balancesPorTitular = useMemo(() => {
    return {
      alejandra: balancesPorCuenta.filter(b => b.titular === 'alejandra'),
      ricardo: balancesPorCuenta.filter(b => b.titular === 'ricardo'),
      sinAsignar: balancesPorCuenta.filter(b => b.id === 'sin_asignar'),
    };
  }, [balancesPorCuenta]);

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-lg font-semibold text-white">Balance por Cuenta</h3>
            <p className="text-xs text-white/50">Ingresos vs Egresos del mes</p>
          </div>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddIngreso(!showAddIngreso)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Ingreso
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4 text-white/50" /> : <ChevronDown className="w-4 h-4 text-white/50" />}
          </button>
        </div>
      </div>

      {expanded && (
        <>
          {/* Resumen General */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
              <p className="text-xs text-white/50">Ingresos</p>
              <p className="text-lg font-bold text-emerald-400">{formatMoney(totales.ingresos)}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-center">
              <TrendingDown className="w-5 h-5 text-red-400 mx-auto mb-1" />
              <p className="text-xs text-white/50">Egresos</p>
              <p className="text-lg font-bold text-red-400">{formatMoney(totales.egresos)}</p>
            </div>
            <div className={`${totales.balance >= 0 ? 'bg-blue-500/10 border-blue-500/20' : 'bg-amber-500/10 border-amber-500/20'} border rounded-xl p-3 text-center`}>
              <Wallet className={`w-5 h-5 ${totales.balance >= 0 ? 'text-blue-400' : 'text-amber-400'} mx-auto mb-1`} />
              <p className="text-xs text-white/50">Balance</p>
              <p className={`text-lg font-bold ${totales.balance >= 0 ? 'text-blue-400' : 'text-amber-400'}`}>
                {formatMoney(totales.balance)}
              </p>
            </div>
          </div>

          {/* Formulario de Ingreso */}
          {showAddIngreso && (
            <AddIngresoForm onClose={() => setShowAddIngreso(false)} />
          )}

          {/* Balances por Titular */}
          <div className="space-y-4">
            {/* Alejandra */}
            <div>
              <h4 className="text-sm font-medium text-purple-400 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                Alejandra
              </h4>
              <div className="space-y-2">
                {balancesPorTitular.alejandra.map(cuenta => (
                  <CuentaRow key={cuenta.id} cuenta={cuenta} />
                ))}
              </div>
            </div>

            {/* Ricardo */}
            <div>
              <h4 className="text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                Ricardo
              </h4>
              <div className="space-y-2">
                {balancesPorTitular.ricardo.map(cuenta => (
                  <CuentaRow key={cuenta.id} cuenta={cuenta} />
                ))}
              </div>
            </div>

            {/* Sin asignar */}
            {balancesPorTitular.sinAsignar.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
                  Sin método de pago
                </h4>
                <div className="space-y-2">
                  {balancesPorTitular.sinAsignar.map(cuenta => (
                    <CuentaRow key={cuenta.id} cuenta={cuenta} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CuentaRow({ cuenta }: { cuenta: SaldoCuenta }) {
  const tieneMovimientos = cuenta.ingresos > 0 || cuenta.egresos > 0;

  return (
    <div className={`flex items-center justify-between p-3 rounded-xl ${tieneMovimientos ? 'bg-white/5' : 'bg-white/[0.02]'}`}>
      <div className="flex items-center gap-3">
        {cuenta.tipo === 'debito' ? (
          <Building2 className="w-4 h-4 text-green-400" />
        ) : cuenta.tipo === 'credito' ? (
          <CreditCard className="w-4 h-4 text-orange-400" />
        ) : (
          <HelpCircle className="w-4 h-4 text-amber-400" />
        )}
        <div>
          <p className="text-sm font-medium text-white">{cuenta.nombre}</p>
          <p className="text-xs text-white/40">
            {cuenta.tipo === 'debito' ? 'Débito' : cuenta.tipo === 'credito' ? 'Crédito' : 'Gastos sin tarjeta asignada'}
          </p>
        </div>
      </div>
      <div className="text-right">
        {tieneMovimientos ? (
          <>
            <div className="flex items-center gap-2 text-xs">
              {cuenta.ingresos > 0 && (
                <span className="text-emerald-400">+{formatMoney(cuenta.ingresos)}</span>
              )}
              {cuenta.egresos > 0 && (
                <span className="text-red-400">-{formatMoney(cuenta.egresos)}</span>
              )}
            </div>
            <p className={`text-sm font-medium ${cuenta.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {cuenta.balance >= 0 ? '+' : ''}{formatMoney(cuenta.balance)}
            </p>
          </>
        ) : (
          <p className="text-xs text-white/30">Sin movimientos</p>
        )}
      </div>
    </div>
  );
}

function AddIngresoForm({ onClose }: { onClose: () => void }) {
  const [monto, setMonto] = useState('');
  const [cuenta, setCuenta] = useState('santander');
  const [tipo, setTipo] = useState<'nomina' | 'transferencia' | 'cashback' | 'reembolso' | 'otro'>('nomina');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monto || parseFloat(monto) <= 0) return;

    setLoading(true);
    try {
      // Inferir titular de la cuenta seleccionada
      const cuentaInfo = cuentasBanco.find(c => c.id === cuenta);
      const titular = cuentaInfo?.titular || 'alejandra';

      const response = await fetch('/api/ingresos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto: parseFloat(monto),
          cuenta,
          tipo,
          descripcion: descripcion || tipo,
          titular,
        }),
      });

      if (response.ok) {
        onClose();
      }
    } catch (error) {
      console.error('Error al registrar ingreso:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
      <h4 className="text-sm font-medium text-white mb-3">Registrar Ingreso</h4>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Monto</label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
            required
          />
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Cuenta</label>
          <select
            value={cuenta}
            onChange={(e) => setCuenta(e.target.value)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
          >
            {cuentasBanco.map(c => (
              <option key={c.id} value={c.id} className="bg-gray-800">{c.nombre}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-white/50 mb-1 block">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as any)}
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
          >
            <option value="nomina" className="bg-gray-800">Nómina</option>
            <option value="transferencia" className="bg-gray-800">Transferencia</option>
            <option value="cashback" className="bg-gray-800">Cashback</option>
            <option value="reembolso" className="bg-gray-800">Reembolso</option>
            <option value="otro" className="bg-gray-800">Otro</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-white/50 mb-1 block">Descripción</label>
          <input
            type="text"
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Opcional"
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar'}
        </button>
      </div>
    </form>
  );
}
