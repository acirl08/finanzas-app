/**
 * Script para cargar los gastos de Ricardo del 14-31 de enero 2026
 * Ejecutar con: npx ts-node scripts/cargar-gastos-ricardo-enero.ts
 * O desde la app: npm run load-gastos
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, Timestamp, doc, updateDoc, runTransaction } from 'firebase/firestore';

// Firebase config - usar las mismas variables de entorno
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ============================================
// GASTOS DE RICARDO (14-31 ENERO 2026)
// ============================================
const gastosRicardo = [
  // 17 enero
  { fecha: '2026-01-17', monto: 842.26, categoria: 'personal', descripcion: 'Amazon Mexico', titular: 'ricardo' },
  { fecha: '2026-01-17', monto: 849.00, categoria: 'personal', descripcion: 'Amazon Mexico', titular: 'ricardo' },
  { fecha: '2026-01-17', monto: 431.49, categoria: 'personal', descripcion: 'Stripe Amazon', titular: 'ricardo' },
  { fecha: '2026-01-17', monto: 251.54, categoria: 'personal', descripcion: 'Stripe Amazon', titular: 'ricardo' },

  // 20 enero
  { fecha: '2026-01-20', monto: 17.69, categoria: 'personal', descripcion: 'Themultiverse School', titular: 'ricardo' },

  // 23 enero
  { fecha: '2026-01-23', monto: 85.00, categoria: 'cafe_snacks', descripcion: 'Cafe Cacao', titular: 'ricardo' },

  // 24 enero
  { fecha: '2026-01-24', monto: 445.90, categoria: 'super', descripcion: 'HEB Tec', titular: 'ricardo' },
  { fecha: '2026-01-24', monto: 693.00, categoria: 'super', descripcion: 'City Market', titular: 'ricardo' },
  { fecha: '2026-01-24', monto: 79.00, categoria: 'super', descripcion: 'City Market', titular: 'ricardo' },
  { fecha: '2026-01-24', monto: 1089.00, categoria: 'restaurantes', descripcion: 'Restaurant Blackmamba', titular: 'ricardo' },
  { fecha: '2026-01-24', monto: 529.00, categoria: 'hogar', descripcion: 'Petco MX (mascota)', titular: 'ricardo' },

  // 25 enero
  { fecha: '2026-01-25', monto: 3700.14, categoria: 'super', descripcion: 'Costco Monterrey', titular: 'ricardo' },
  { fecha: '2026-01-25', monto: 534.56, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },

  // 26 enero
  { fecha: '2026-01-26', monto: 70.00, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },

  // 28 enero
  { fecha: '2026-01-28', monto: 219.94, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },

  // 29 enero
  { fecha: '2026-01-29', monto: 1267.21, categoria: 'personal', descripcion: 'Maedupart (Mercado Libre)', titular: 'ricardo' },

  // 30 enero
  { fecha: '2026-01-30', monto: 1895.00, categoria: 'salud', descripcion: 'Farmacias del Ahorro', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 638.13, categoria: 'entretenimiento', descripcion: 'PlayStation Store', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 162.00, categoria: 'personal', descripcion: 'Mercado Pago Matthew', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 201.31, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 50.00, categoria: 'restaurantes', descripcion: 'Rest Food (Payclip)', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 200.45, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 2719.75, categoria: 'restaurantes', descripcion: 'Restaurant Ume', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 101.38, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },
  { fecha: '2026-01-30', monto: 115.59, categoria: 'transporte', descripcion: 'Uber', titular: 'ricardo' },

  // 31 enero
  { fecha: '2026-01-31', monto: 175.00, categoria: 'cafe_snacks', descripcion: 'Kaelum Coffee', titular: 'ricardo' },
];

// ============================================
// PAGO A DEUDA BBVA
// ============================================
const pagoDeuda = {
  deudaId: '9', // BBVA de Ricardo
  monto: 30346.73, // Total pagado en enero
  fecha: '2026-01-30',
  nota: 'Pago primera quincena enero - incluye pago mínimo + extra'
};

async function cargarGastos() {
  console.log('🚀 Iniciando carga de gastos de Ricardo (enero 2026)...\n');

  let gastosRegistrados = 0;
  let totalGastado = 0;

  for (const gasto of gastosRicardo) {
    try {
      await addDoc(collection(db, 'gastos'), {
        ...gasto,
        esFijo: false,
        conVales: false,
        createdAt: Timestamp.now()
      });

      gastosRegistrados++;
      totalGastado += gasto.monto;
      console.log(`✅ ${gasto.fecha} - ${gasto.descripcion}: $${gasto.monto.toLocaleString()}`);
    } catch (error) {
      console.error(`❌ Error en ${gasto.descripcion}:`, error);
    }
  }

  console.log(`\n📊 Resumen de gastos:`);
  console.log(`   Gastos registrados: ${gastosRegistrados}/${gastosRicardo.length}`);
  console.log(`   Total gastado: $${totalGastado.toLocaleString()}`);

  return { gastosRegistrados, totalGastado };
}

async function registrarPagoDeuda() {
  console.log('\n💳 Registrando pago a BBVA...');

  try {
    const deudaRef = doc(db, 'deudas', pagoDeuda.deudaId);

    // Actualizar saldo de la deuda usando transaction
    await runTransaction(db, async (transaction) => {
      const deudaSnap = await transaction.get(deudaRef);

      if (!deudaSnap.exists()) {
        throw new Error('Deuda BBVA no encontrada');
      }

      const deuda = deudaSnap.data();
      // El nuevo saldo después del pago es lo que queda por pagar del estado de cuenta
      // Saldo total: $121,586.09 - ya estaba registrado
      // El pago de $30,346.73 reduce el saldo revolvente pero no el de MSI
      // Para simplificar, dejamos el saldo como está ya que los MSI se pagan automáticamente

      console.log(`   Saldo anterior: $${deuda.saldoActual?.toLocaleString()}`);
      console.log(`   Pago realizado: $${pagoDeuda.monto.toLocaleString()}`);
    });

    // Registrar el pago en el historial
    await addDoc(collection(db, 'pagos'), {
      deudaId: pagoDeuda.deudaId,
      deudaNombre: 'BBVA',
      monto: pagoDeuda.monto,
      fecha: pagoDeuda.fecha,
      nota: pagoDeuda.nota,
      titular: 'ricardo',
      createdAt: Timestamp.now()
    });

    console.log(`✅ Pago de $${pagoDeuda.monto.toLocaleString()} registrado en historial`);

  } catch (error) {
    console.error('❌ Error registrando pago:', error);
  }
}

async function main() {
  console.log('═'.repeat(50));
  console.log('  CARGA DE DATOS FINANCIEROS - RICARDO ENERO 2026');
  console.log('═'.repeat(50));

  await cargarGastos();
  await registrarPagoDeuda();

  console.log('\n═'.repeat(50));
  console.log('  ✅ PROCESO COMPLETADO');
  console.log('═'.repeat(50));

  // Resumen por categoría
  const porCategoria: Record<string, number> = {};
  gastosRicardo.forEach(g => {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.monto;
  });

  console.log('\n📊 Resumen por categoría:');
  Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, total]) => {
      console.log(`   ${cat}: $${total.toLocaleString()}`);
    });

  const totalGeneral = gastosRicardo.reduce((sum, g) => sum + g.monto, 0);
  console.log(`\n💰 TOTAL GASTADO: $${totalGeneral.toLocaleString()}`);
  console.log(`💳 PAGO A BBVA: $${pagoDeuda.monto.toLocaleString()}`);
  console.log(`📅 Falta pagar antes del 3 feb: $2,840`);

  process.exit(0);
}

main().catch(console.error);
