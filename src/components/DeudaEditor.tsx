'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import { Deuda } from '@/types';
import { formatMoney } from '@/lib/utils';
import { toast } from 'sonner';

interface DeudaEditorProps {
  deudas: Deuda[];
  onUpdate?: () => void;
}

interface DeudaFormData {
  nombre: string;
  saldoInicial: string;
  saldoActual: string;
  pagoMinimo: string;
  cat: string;
  titular: 'alejandra' | 'ricardo' | 'compartido';
  prioridad: number;
}

const emptyFormData: DeudaFormData = {
  nombre: '',
  saldoInicial: '',
  saldoActual: '',
  pagoMinimo: '',
  cat: '',
  titular: 'compartido',
  prioridad: 1,
};

export default function DeudaEditor({ deudas, onUpdate }: DeudaEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<DeudaFormData>(emptyFormData);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleInputChange = (field: keyof DeudaFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData(emptyFormData);
    setIsAdding(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formData.nombre || !formData.saldoActual || !formData.pagoMinimo) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const newDeuda = {
        nombre: formData.nombre.trim(),
        saldoInicial: Number(formData.saldoInicial) || Number(formData.saldoActual),
        saldoActual: Number(formData.saldoActual),
        pagoMinimo: Number(formData.pagoMinimo),
        cat: Number(formData.cat) || 0,
        titular: formData.titular,
        prioridad: formData.prioridad,
        liquidada: false,
        createdAt: Timestamp.now()
      };

      await addDoc(collection(db, 'deudas'), newDeuda);
      toast.success(`Deuda "${formData.nombre}" agregada`);
      resetForm();
      onUpdate?.();
    } catch (error) {
      console.error('Error agregando deuda:', error);
      toast.error('No se pudo agregar la deuda');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!editingId || !formData.nombre || !formData.saldoActual) {
      toast.error('Completa los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        nombre: formData.nombre.trim(),
        saldoInicial: Number(formData.saldoInicial),
        saldoActual: Number(formData.saldoActual),
        pagoMinimo: Number(formData.pagoMinimo),
        cat: Number(formData.cat),
        titular: formData.titular,
        prioridad: formData.prioridad,
        liquidada: Number(formData.saldoActual) === 0
      };

      await updateDoc(doc(db, 'deudas', editingId), updateData);
      toast.success(`Deuda "${formData.nombre}" actualizada`);
      resetForm();
      onUpdate?.();
    } catch (error) {
      console.error('Error actualizando deuda:', error);
      toast.error('No se pudo actualizar la deuda');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (deudaId: string, nombre: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'deudas', deudaId));
      toast.success(`Deuda "${nombre}" eliminada`);
      setConfirmDelete(null);
      onUpdate?.();
    } catch (error) {
      console.error('Error eliminando deuda:', error);
      toast.error('No se pudo eliminar la deuda');
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (deuda: Deuda) => {
    setFormData({
      nombre: deuda.nombre,
      saldoInicial: deuda.saldoInicial.toString(),
      saldoActual: deuda.saldoActual.toString(),
      pagoMinimo: deuda.pagoMinimo.toString(),
      cat: deuda.cat.toString(),
      titular: deuda.titular as 'alejandra' | 'ricardo' | 'compartido',
      prioridad: deuda.prioridad,
    });
    setEditingId(deuda.id);
    setIsAdding(false);
  };

  const startAdding = () => {
    resetForm();
    setIsAdding(true);
    setEditingId(null);
    // Calcular siguiente prioridad
    const maxPrioridad = Math.max(...deudas.map(d => d.prioridad), 0);
    setFormData(prev => ({ ...prev, prioridad: maxPrioridad + 1 }));
  };

  return (
    <div className="glass-card">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
            <Edit2 className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Administrar Deudas</h3>
            <p className="text-xs text-white/50">Agregar, editar o eliminar deudas</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-white/50" />
        ) : (
          <ChevronDown className="w-5 h-5 text-white/50" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {/* Add Button */}
          {!isAdding && !editingId && (
            <button
              onClick={startAdding}
              className="w-full py-3 px-4 border-2 border-dashed border-white/20 rounded-xl text-white/60 hover:border-purple-500/50 hover:text-purple-400 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Agregar nueva deuda
            </button>
          )}

          {/* Add/Edit Form */}
          {(isAdding || editingId) && (
            <div className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-white">
                  {isAdding ? 'Nueva Deuda' : 'Editar Deuda'}
                </h4>
                <button onClick={resetForm} className="p-1 hover:bg-white/10 rounded">
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="md:col-span-2">
                  <label className="block text-xs text-white/50 mb-1">Nombre de la deuda *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleInputChange('nombre', e.target.value)}
                    placeholder="Ej: Tarjeta BBVA, Préstamo personal..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* Saldo Actual */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">Saldo actual *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">$</span>
                    <input
                      type="number"
                      value={formData.saldoActual}
                      onChange={(e) => handleInputChange('saldoActual', e.target.value)}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* Saldo Inicial */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">Saldo inicial</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">$</span>
                    <input
                      type="number"
                      value={formData.saldoInicial}
                      onChange={(e) => handleInputChange('saldoInicial', e.target.value)}
                      placeholder={formData.saldoActual || '0'}
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* Pago Mínimo */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">Pago mínimo mensual *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30">$</span>
                    <input
                      type="number"
                      value={formData.pagoMinimo}
                      onChange={(e) => handleInputChange('pagoMinimo', e.target.value)}
                      placeholder="0"
                      className="w-full pl-7 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                </div>

                {/* CAT */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">CAT (tasa anual %)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.cat}
                      onChange={(e) => handleInputChange('cat', e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30">%</span>
                  </div>
                </div>

                {/* Titular */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">Titular</label>
                  <select
                    value={formData.titular}
                    onChange={(e) => handleInputChange('titular', e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50 appearance-none cursor-pointer"
                  >
                    <option value="alejandra" className="bg-[#1a1a2e]">Alejandra</option>
                    <option value="ricardo" className="bg-[#1a1a2e]">Ricardo</option>
                    <option value="compartido" className="bg-[#1a1a2e]">Compartido</option>
                  </select>
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-xs text-white/50 mb-1">Prioridad</label>
                  <input
                    type="number"
                    value={formData.prioridad}
                    onChange={(e) => handleInputChange('prioridad', Number(e.target.value))}
                    min="1"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                  <p className="text-xs text-white/30 mt-1">Menor = más prioritario</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={resetForm}
                  className="flex-1 py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-white/70 transition-colors"
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  onClick={isAdding ? handleAdd : handleEdit}
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-purple-500 hover:bg-purple-600 rounded-lg text-white font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      {isAdding ? 'Agregar' : 'Guardar'}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Existing Debts List */}
          <div className="space-y-2">
            {deudas.map((deuda) => (
              <div
                key={deuda.id}
                className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                  editingId === deuda.id
                    ? 'bg-purple-500/20 border border-purple-500/30'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                    deuda.liquidada
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : deuda.cat > 100
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                  }`}>
                    {deuda.prioridad}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{deuda.nombre}</p>
                    <p className="text-xs text-white/50">
                      {formatMoney(deuda.saldoActual)} · CAT {deuda.cat}% · {deuda.titular}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {confirmDelete === deuda.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(deuda.id, deuda.nombre)}
                        disabled={loading}
                        className="p-2 bg-red-500 hover:bg-red-600 rounded-lg text-white text-xs"
                      >
                        Confirmar
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 text-xs"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(deuda)}
                        className="p-2 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(deuda.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-white/50 hover:text-red-400 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {deudas.length === 0 && (
            <div className="text-center py-8 text-white/40">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
              <p>No hay deudas registradas</p>
              <p className="text-sm">Agrega tu primera deuda para empezar a trackear</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
