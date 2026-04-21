'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  RotateCcw,
  Check,
  DollarSign,
  CreditCard,
  Repeat,
  type LucideIcon,
} from 'lucide-react';
import {
  deudasIniciales,
  suscripciones,
  INGRESO_MENSUAL,
  VALES_DESPENSA,
} from '@/lib/data';
import { updateDeuda, updateConfiguracion, getConfiguracion } from '@/lib/firestore';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';
import { Deuda } from '@/types';
import { useFirestore } from '@/contexts/FirestoreContext';

type Tab = 'general' | 'deudas' | 'suscripciones';

const TAB_LABELS: Record<Tab, { label: string; icon: LucideIcon }> = {
  general: { label: 'General', icon: DollarSign },
  deudas: { label: 'Deudas', icon: CreditCard },
  suscripciones: { label: 'Suscripciones', icon: Repeat },
};

export default function ConfigPage() {
  const [tab, setTab] = useState<Tab>('general');
  const { deudas } = useFirestore();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-display text-ink-900">Ajustes</h1>
        <p className="text-ink-500 mt-1 text-[14px]">
          Configura ingresos, saldos y suscripciones.
        </p>
      </header>

      {/* Tabs */}
      <nav className="inline-flex bg-subtle rounded-lg p-1 gap-1">
        {(Object.keys(TAB_LABELS) as Tab[]).map((t) => {
          const Icon = TAB_LABELS[t].icon;
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-[14px] font-medium transition-colors ${
                active ? 'bg-surface text-ink-900 shadow-card' : 'text-ink-500 hover:text-ink-900'
              }`}
            >
              <Icon className="w-4 h-4" strokeWidth={1.75} />
              {TAB_LABELS[t].label}
            </button>
          );
        })}
      </nav>

      {tab === 'general' && <GeneralTab />}
      {tab === 'deudas' && <DeudasTab deudas={deudas.length > 0 ? deudas : deudasIniciales} />}
      {tab === 'suscripciones' && <SuscripcionesTab />}
    </div>
  );
}

/* ============================================================
   TAB · General
   ============================================================ */
function GeneralTab() {
  const [form, setForm] = useState({
    ingresoMensual: INGRESO_MENSUAL,
    valesDespensa: VALES_DESPENSA,
    renta: 12700,
    pagoCarro: 13000,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    getConfiguracion().then((config) => {
      setForm((prev) => ({
        ...prev,
        ingresoMensual: config.ingresoMensual,
        valesDespensa: config.valesDespensa,
      }));
    });
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (form.ingresoMensual <= 0) errs.ingresoMensual = 'Debe ser mayor a 0';
    if (form.valesDespensa < 0) errs.valesDespensa = 'No puede ser negativo';
    if (form.renta < 0) errs.renta = 'No puede ser negativo';
    if (form.pagoCarro < 0) errs.pagoCarro = 'No puede ser negativo';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast.error('Corrige los errores antes de guardar');
      return;
    }
    setSaving(true);
    try {
      await updateConfiguracion({
        ingresoMensual: form.ingresoMensual,
        valesDespensa: form.valesDespensa,
      });
      toast.success('Configuración guardada', {
        description: 'Los cambios se aplicarán en el dashboard',
      });
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="surface p-6 sm:p-8">
      <h2 className="text-[15px] text-ink-900 font-medium">Información general</h2>
      <p className="text-[13px] text-ink-500 mt-0.5 mb-6">
        Estos valores alimentan tu dashboard y análisis.
      </p>

      <div className="space-y-5 max-w-xl">
        <MoneyField
          label="Ingreso mensual combinado"
          value={form.ingresoMensual}
          error={errors.ingresoMensual}
          onChange={(v) => setForm({ ...form, ingresoMensual: v })}
        />
        <MoneyField
          label="Vales de despensa"
          value={form.valesDespensa}
          error={errors.valesDespensa}
          onChange={(v) => setForm({ ...form, valesDespensa: v })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <MoneyField
            label="Renta mensual"
            value={form.renta}
            error={errors.renta}
            onChange={(v) => setForm({ ...form, renta: v })}
          />
          <MoneyField
            label="Pago de carro"
            value={form.pagoCarro}
            error={errors.pagoCarro}
            onChange={(v) => setForm({ ...form, pagoCarro: v })}
          />
        </div>

        <button onClick={handleSave} disabled={saving} className="btn btn-primary">
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" strokeWidth={2} />
              Guardar cambios
            </>
          )}
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   TAB · Deudas (editor)
   ============================================================ */
function DeudasTab({ deudas }: { deudas: Deuda[] }) {
  const [forms, setForms] = useState<Record<string, { saldoActual: number; pagoMinimo: number }>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next: Record<string, { saldoActual: number; pagoMinimo: number }> = {};
    deudas.forEach((d) => {
      next[d.id] = { saldoActual: d.saldoActual, pagoMinimo: d.pagoMinimo };
    });
    setForms(next);
  }, [deudas]);

  const handleChange = (id: string, field: 'saldoActual' | 'pagoMinimo', value: number) => {
    setForms((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  };

  const handleReset = (d: Deuda) => {
    setForms((prev) => ({
      ...prev,
      [d.id]: { saldoActual: d.saldoActual, pagoMinimo: d.pagoMinimo },
    }));
    toast.info('Valores restaurados');
  };

  const handleSaveAll = async () => {
    setSaving(true);
    const loading = toast.loading('Guardando saldos…');
    try {
      for (const deuda of deudas) {
        const f = forms[deuda.id];
        if (!f) continue;
        if (f.saldoActual < 0 || f.pagoMinimo < 0) continue;
        await updateDeuda(deuda.id, {
          saldoActual: f.saldoActual,
          pagoMinimo: f.pagoMinimo,
          liquidada: f.saldoActual === 0,
        });
      }
      toast.dismiss(loading);
      toast.success('Saldos actualizados', {
        description: `${deudas.length} ${deudas.length === 1 ? 'deuda actualizada' : 'deudas actualizadas'}`,
      });
    } catch (e) {
      toast.dismiss(loading);
      console.error(e);
      toast.error('Error al guardar los saldos');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="surface p-6 sm:p-8">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-[15px] text-ink-900 font-medium">Actualizar saldos</h2>
        <span className="pill pill-honey">Al recibir estado de cuenta</span>
      </div>
      <p className="text-[13px] text-ink-500 mb-6">
        Captura el saldo vigente y el pago mínimo de cada tarjeta.
      </p>

      <div className="space-y-3">
        {deudas.map((deuda) => {
          const form = forms[deuda.id] || { saldoActual: deuda.saldoActual, pagoMinimo: deuda.pagoMinimo };
          const changed =
            form.saldoActual !== deuda.saldoActual || form.pagoMinimo !== deuda.pagoMinimo;
          const catPill =
            deuda.cat >= 100 ? 'pill-clay' : deuda.cat >= 60 ? 'pill-honey' : 'pill-ink';

          return (
            <div
              key={deuda.id}
              className={`p-4 rounded-lg border transition-colors ${
                changed
                  ? 'bg-sage-50 border-sage-100'
                  : 'bg-surface border-ink-100'
              }`}
            >
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-[14px] font-medium text-ink-900 truncate">{deuda.nombre}</p>
                  <span className="text-[12px] text-ink-400 capitalize">· {deuda.titular}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {changed && (
                    <button
                      onClick={() => handleReset(deuda)}
                      className="p-1.5 rounded-md text-ink-400 hover:text-ink-900 hover:bg-subtle transition-colors"
                      title="Restaurar"
                    >
                      <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </button>
                  )}
                  <span className={`pill ${catPill}`}>CAT {deuda.cat}%</span>
                  {changed && (
                    <span className="pill pill-sage">
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                      Modificado
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MoneyField
                  label="Saldo actual"
                  value={form.saldoActual}
                  onChange={(v) => handleChange(deuda.id, 'saldoActual', v)}
                  compact
                />
                <MoneyField
                  label="Pago mínimo"
                  value={form.pagoMinimo}
                  onChange={(v) => handleChange(deuda.id, 'pagoMinimo', v)}
                  compact
                />
              </div>
            </div>
          );
        })}

        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="btn btn-primary w-full mt-2"
        >
          {saving ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Guardando…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" strokeWidth={2} />
              Guardar todos los saldos
            </>
          )}
        </button>
      </div>
    </section>
  );
}

/* ============================================================
   TAB · Suscripciones
   ============================================================ */
function SuscripcionesTab() {
  const total = suscripciones.reduce((sum, s) => sum + s.monto, 0);

  return (
    <section className="surface p-6 sm:p-8">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h2 className="text-[15px] text-ink-900 font-medium">Suscripciones mensuales</h2>
          <p className="text-[13px] text-ink-500 mt-0.5">
            {suscripciones.length} activas · {formatMoney(total)} al mes
          </p>
        </div>
        <p className="text-label tabular-nums">{formatMoney(total)}</p>
      </div>

      <ul className="divide-y divide-ink-100">
        {suscripciones.map((sub) => (
          <li key={sub.id} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div>
                <p className="text-[14px] text-ink-900">{sub.nombre}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-[12px] text-ink-400 capitalize">{sub.titular}</p>
                  {sub.esencial && <span className="pill pill-sage">Trabajo</span>}
                </div>
              </div>
            </div>
            <p className="text-[14px] text-ink-900 font-medium tabular-nums">
              {formatMoney(sub.monto)}
            </p>
          </li>
        ))}
      </ul>

      <div className="mt-6 p-4 rounded-md bg-honey-50 border border-honey-100">
        <p className="text-[13px] text-honey-600 leading-relaxed">
          <span className="font-medium">Tip:</span> Revisa cada mes si todas siguen siendo necesarias. Cancelar las que ya no usas es dinero directo al bolsillo.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   Shared · MoneyField
   ============================================================ */
function MoneyField({
  label,
  value,
  onChange,
  error,
  compact = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  error?: string;
  compact?: boolean;
}) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 text-[15px]">$</span>
        <input
          type="number"
          value={value}
          min={0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={`field pl-8 tabular-nums ${compact ? '' : 'field-lg'} ${error ? 'border-clay-500 focus:border-clay-500' : ''}`}
        />
      </div>
      {error && <p className="mt-1 text-[12px] text-clay-500">{error}</p>}
    </div>
  );
}
