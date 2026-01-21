'use client';

import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, Calendar, Loader2, Check } from 'lucide-react';
import { subscribeToGastos, Gasto, subscribeToDeudas } from '@/lib/firestore';
import { deudasIniciales, categoriaLabels, presupuestosPersonales, PRESUPUESTO_VARIABLE } from '@/lib/data';
import { formatMoney } from '@/lib/utils';
import { Deuda } from '@/types';

interface ExportDataProps {
  className?: string;
}

function formatDate(dateStr: string) {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function ExportData({ className = '' }: ExportDataProps) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'pdf' | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    return new Date().toISOString().slice(0, 7);
  });
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsubGastos = subscribeToGastos((g) => {
      setGastos(g);
      setLoading(false);
    });
    const unsubDeudas = subscribeToDeudas((d) => {
      if (d && d.length > 0) setDeudas(d);
    });
    return () => {
      unsubGastos();
      unsubDeudas();
    };
  }, []);

  // Generar lista de meses disponibles
  const availableMonths = Array.from(
    new Set(gastos.map(g => g.fecha.slice(0, 7)))
  ).sort().reverse();

  // Filtrar datos del mes seleccionado
  const gastosDelMes = gastos.filter(g => g.fecha.startsWith(selectedMonth));

  // Exportar a CSV
  const exportToCSV = () => {
    setExporting('csv');

    try {
      // Headers
      const headers = ['Fecha', 'Descripción', 'Categoría', 'Titular', 'Monto', 'Es Fijo', 'Con Vales'];

      // Rows
      const rows = gastosDelMes.map(g => [
        formatDate(g.fecha),
        g.descripcion || categoriaLabels[g.categoria] || g.categoria,
        categoriaLabels[g.categoria] || g.categoria,
        g.titular || 'compartido',
        g.monto.toString(),
        g.esFijo ? 'Sí' : 'No',
        g.conVales ? 'Sí' : 'No',
      ]);

      // Totales
      const totalMes = gastosDelMes.reduce((sum, g) => sum + g.monto, 0);
      const totalFijos = gastosDelMes.filter(g => g.esFijo).reduce((sum, g) => sum + g.monto, 0);
      const totalVariables = gastosDelMes.filter(g => !g.esFijo && !g.conVales && g.categoria !== 'imprevistos').reduce((sum, g) => sum + g.monto, 0);
      const totalVales = gastosDelMes.filter(g => g.conVales).reduce((sum, g) => sum + g.monto, 0);
      const totalImprevistos = gastosDelMes.filter(g => g.categoria === 'imprevistos').reduce((sum, g) => sum + g.monto, 0);

      // Add summary rows
      rows.push([]);
      rows.push(['RESUMEN DEL MES']);
      rows.push(['Total gastos', '', '', '', totalMes.toString()]);
      rows.push(['Total fijos', '', '', '', totalFijos.toString()]);
      rows.push(['Total variables', '', '', '', totalVariables.toString()]);
      rows.push(['Total vales', '', '', '', totalVales.toString()]);
      rows.push(['Total imprevistos', '', '', '', totalImprevistos.toString()]);
      rows.push([]);
      rows.push(['POR TITULAR (sin imprevistos)']);
      rows.push(['Alejandra', '', '', '', gastosDelMes.filter(g => g.titular === 'alejandra' && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos').reduce((sum, g) => sum + g.monto, 0).toString()]);
      rows.push(['Ricardo', '', '', '', gastosDelMes.filter(g => g.titular === 'ricardo' && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos').reduce((sum, g) => sum + g.monto, 0).toString()]);
      rows.push(['Compartido', '', '', '', gastosDelMes.filter(g => (g.titular === 'compartido' || !g.titular) && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos').reduce((sum, g) => sum + g.monto, 0).toString()]);

      // Create CSV content
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // Add BOM for Excel to recognize UTF-8
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

      // Download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `gastos_${selectedMonth}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess('csv');
      setTimeout(() => setExportSuccess(null), 2000);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }

    setExporting(null);
  };

  // Exportar a TXT (formato simple tipo reporte)
  const exportToReport = () => {
    setExporting('pdf');

    try {
      const mesNombre = new Date(selectedMonth + '-01').toLocaleDateString('es-MX', {
        month: 'long',
        year: 'numeric',
      });

      // Calcular totales
      const totalMes = gastosDelMes.reduce((sum, g) => sum + g.monto, 0);
      const totalFijos = gastosDelMes.filter(g => g.esFijo).reduce((sum, g) => sum + g.monto, 0);
      const totalVariables = gastosDelMes.filter(g => !g.esFijo && !g.conVales && g.categoria !== 'imprevistos').reduce((sum, g) => sum + g.monto, 0);
      const totalVales = gastosDelMes.filter(g => g.conVales).reduce((sum, g) => sum + g.monto, 0);
      const totalImprevistos = gastosDelMes.filter(g => g.categoria === 'imprevistos').reduce((sum, g) => sum + g.monto, 0);

      // Por categoría
      const porCategoria: Record<string, number> = {};
      gastosDelMes.forEach(g => {
        const cat = categoriaLabels[g.categoria] || g.categoria;
        porCategoria[cat] = (porCategoria[cat] || 0) + g.monto;
      });

      // Por titular (sin imprevistos)
      const porTitular = {
        alejandra: gastosDelMes.filter(g => g.titular === 'alejandra' && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos').reduce((sum, g) => sum + g.monto, 0),
        ricardo: gastosDelMes.filter(g => g.titular === 'ricardo' && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos').reduce((sum, g) => sum + g.monto, 0),
        compartido: gastosDelMes.filter(g => (g.titular === 'compartido' || !g.titular) && !g.esFijo && !g.conVales && g.categoria !== 'imprevistos').reduce((sum, g) => sum + g.monto, 0),
      };

      // Estado de deudas
      const deudaTotal = deudas.reduce((sum, d) => sum + d.saldoActual, 0);
      const deudasLiquidadas = deudas.filter(d => d.liquidada).length;

      // Generar reporte
      let report = `
╔════════════════════════════════════════════════════════════════╗
║          REPORTE FINANCIERO - ${mesNombre.toUpperCase().padEnd(20)}          ║
║                   Ale & Ricardo                                ║
╚════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════
                        RESUMEN GENERAL
═══════════════════════════════════════════════════════════════

  Total gastos del mes:     ${formatMoney(totalMes).padStart(15)}
  ├─ Gastos fijos:          ${formatMoney(totalFijos).padStart(15)}
  ├─ Gastos variables:      ${formatMoney(totalVariables).padStart(15)}
  └─ Gastos con vales:      ${formatMoney(totalVales).padStart(15)}

  Presupuesto variable:     ${formatMoney(PRESUPUESTO_VARIABLE).padStart(15)}
  Diferencia:               ${formatMoney(PRESUPUESTO_VARIABLE - totalVariables).padStart(15)} ${totalVariables <= PRESUPUESTO_VARIABLE ? '✓' : '⚠️'}


═══════════════════════════════════════════════════════════════
                      GASTOS POR PERSONA
═══════════════════════════════════════════════════════════════

  Alejandra
  ├─ Gastado:               ${formatMoney(porTitular.alejandra).padStart(15)}
  ├─ Presupuesto:           ${formatMoney(presupuestosPersonales.alejandra).padStart(15)}
  └─ Disponible:            ${formatMoney(presupuestosPersonales.alejandra - porTitular.alejandra).padStart(15)} ${porTitular.alejandra <= presupuestosPersonales.alejandra ? '✓' : '⚠️'}

  Ricardo
  ├─ Gastado:               ${formatMoney(porTitular.ricardo).padStart(15)}
  ├─ Presupuesto:           ${formatMoney(presupuestosPersonales.ricardo).padStart(15)}
  └─ Disponible:            ${formatMoney(presupuestosPersonales.ricardo - porTitular.ricardo).padStart(15)} ${porTitular.ricardo <= presupuestosPersonales.ricardo ? '✓' : '⚠️'}

  Compartido
  ├─ Gastado:               ${formatMoney(porTitular.compartido).padStart(15)}
  ├─ Presupuesto:           ${formatMoney(presupuestosPersonales.compartido).padStart(15)}
  └─ Disponible:            ${formatMoney(presupuestosPersonales.compartido - porTitular.compartido).padStart(15)} ${porTitular.compartido <= presupuestosPersonales.compartido ? '✓' : '⚠️'}


═══════════════════════════════════════════════════════════════
                     GASTOS POR CATEGORÍA
═══════════════════════════════════════════════════════════════

${Object.entries(porCategoria)
  .sort((a, b) => b[1] - a[1])
  .map(([cat, monto]) => `  ${cat.padEnd(25)} ${formatMoney(monto).padStart(15)}`)
  .join('\n')}


═══════════════════════════════════════════════════════════════
                       ESTADO DE DEUDAS
═══════════════════════════════════════════════════════════════

  Deuda total actual:       ${formatMoney(deudaTotal).padStart(15)}
  Deudas liquidadas:        ${`${deudasLiquidadas}/${deudas.length}`.padStart(15)}

  Detalle:
${deudas
  .sort((a, b) => a.prioridad - b.prioridad)
  .map(d => `  ${d.liquidada ? '✓' : '○'} ${d.nombre.padEnd(20)} ${formatMoney(d.saldoActual).padStart(15)} ${d.liquidada ? '(Liquidada)' : ''}`)
  .join('\n')}


═══════════════════════════════════════════════════════════════
                      DETALLE DE GASTOS
═══════════════════════════════════════════════════════════════

${gastosDelMes
  .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  .map(g => `  ${formatDate(g.fecha)}  ${(g.descripcion || categoriaLabels[g.categoria] || g.categoria).substring(0, 25).padEnd(25)}  ${formatMoney(g.monto).padStart(12)}  ${(g.titular || 'compartido').padEnd(10)}`)
  .join('\n')}


═══════════════════════════════════════════════════════════════
            Generado el ${new Date().toLocaleDateString('es-MX', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
═══════════════════════════════════════════════════════════════
`;

      // Download as TXT
      const blob = new Blob([report], { type: 'text/plain;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `reporte_${selectedMonth}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setExportSuccess('pdf');
      setTimeout(() => setExportSuccess(null), 2000);
    } catch (error) {
      console.error('Error exporting report:', error);
    }

    setExporting(null);
  };

  if (loading) {
    return <div className={`glass-card animate-pulse h-40 ${className}`} />;
  }

  return (
    <div className={`glass-card ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">Exportar Datos</h3>
          <p className="text-xs text-white/50">Descarga tus reportes mensuales</p>
        </div>
      </div>

      {/* Month Selector */}
      <div className="mb-4">
        <label className="text-sm text-white/60 mb-2 block">Seleccionar mes</label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-purple-500 appearance-none cursor-pointer"
          >
            {availableMonths.map(month => (
              <option key={month} value={month} className="bg-[#1a1a2e] text-white">
                {new Date(month + '-01').toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-white/40 mt-1">
          {gastosDelMes.length} gasto(s) en este mes
        </p>
      </div>

      {/* Export Buttons */}
      <div className="grid grid-cols-2 gap-3">
        {/* CSV/Excel */}
        <button
          onClick={exportToCSV}
          disabled={exporting !== null || gastosDelMes.length === 0}
          className="flex items-center justify-center gap-2 p-3 bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-xl text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'csv' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : exportSuccess === 'csv' ? (
            <Check className="w-5 h-5" />
          ) : (
            <FileSpreadsheet className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">
            {exportSuccess === 'csv' ? 'Descargado!' : 'Excel/CSV'}
          </span>
        </button>

        {/* Report TXT */}
        <button
          onClick={exportToReport}
          disabled={exporting !== null || gastosDelMes.length === 0}
          className="flex items-center justify-center gap-2 p-3 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-xl text-purple-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {exporting === 'pdf' ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : exportSuccess === 'pdf' ? (
            <Check className="w-5 h-5" />
          ) : (
            <FileText className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">
            {exportSuccess === 'pdf' ? 'Descargado!' : 'Reporte'}
          </span>
        </button>
      </div>

      {/* Info */}
      <p className="text-xs text-white/40 text-center mt-4">
        CSV para Excel/Google Sheets • Reporte incluye resumen completo
      </p>
    </div>
  );
}
