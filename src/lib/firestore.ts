import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  writeBatch,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';
import { Deuda, GastoFijo, Suscripcion } from '@/types';
import { deudasIniciales, gastosFijos, suscripciones, presupuestosPersonales, INGRESO_MENSUAL, VALES_DESPENSA, PRESUPUESTO_VARIABLE } from './data';

// Timeout wrapper to prevent Firebase from hanging
const DEFAULT_TIMEOUT = 10000; // 10 seconds

function withTimeout<T>(promise: Promise<T>, ms: number = DEFAULT_TIMEOUT): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Firebase operation timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

// Types for Firestore
export interface Gasto {
  id?: string;
  fecha: string;
  descripcion: string;
  monto: number;
  categoria: string;
  titular: 'alejandra' | 'ricardo' | 'compartido';
  esFijo?: boolean; // true = gasto fijo (renta, luz), false/undefined = variable
  conVales?: boolean; // true = se paga con vales de despensa (super, frutas)
  createdAt?: Timestamp;
}

export interface Pago {
  id?: string;
  deudaId: string;
  monto: number;
  fecha: string;
  nota?: string;
  createdAt?: Timestamp;
}

export interface ConfiguracionFinanciera {
  ingresoMensual: number;
  valesDespensa: number;
  presupuestoVariable: number;
  presupuestosPersonales: {
    alejandra: number;
    ricardo: number;
    compartido: number;
  };
}

// Collections
const DEUDAS_COLLECTION = 'deudas';
const GASTOS_COLLECTION = 'gastos';
const PAGOS_COLLECTION = 'pagos';
const CONFIG_COLLECTION = 'configuracion';
const GASTOS_FIJOS_COLLECTION = 'gastosFijos';
const SUSCRIPCIONES_COLLECTION = 'suscripciones';

// ============ DEUDAS ============

export async function getDeudas(): Promise<Deuda[]> {
  const querySnapshot = await withTimeout(
    getDocs(query(collection(db, DEUDAS_COLLECTION), orderBy('prioridad', 'asc')))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Deuda[];
}

export function subscribeToDeudas(callback: (deudas: Deuda[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db, DEUDAS_COLLECTION), orderBy('prioridad', 'asc')),
    (snapshot) => {
      const deudas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Deuda[];
      callback(deudas);
    },
    (error) => {
      console.error('Error subscribing to deudas:', error);
      if (onError) onError(error);
    }
  );
}

export async function updateDeuda(id: string, data: Partial<Deuda>) {
  const deudaRef = doc(db, DEUDAS_COLLECTION, id);
  await withTimeout(updateDoc(deudaRef, data));
}

export async function registrarPagoDeuda(deudaId: string, monto: number, nota?: string) {
  const deudaRef = doc(db, DEUDAS_COLLECTION, deudaId);

  // Use transaction to ensure atomic read-modify-write (with timeout)
  const nuevoSaldo = await withTimeout(
    runTransaction(db, async (transaction) => {
      const deudaSnap = await transaction.get(deudaRef);

      if (!deudaSnap.exists()) {
        throw new Error('Deuda no encontrada');
      }

      const deuda = deudaSnap.data() as Deuda;
      const saldoActualizado = Math.max(0, deuda.saldoActual - monto);

      // Update debt balance atomically
      transaction.update(deudaRef, {
        saldoActual: saldoActualizado,
        liquidada: saldoActualizado === 0
      });

      return saldoActualizado;
    }),
    15000 // 15 seconds for transactions
  );

  // Record payment (outside transaction - this is just a log entry)
  await withTimeout(
    addDoc(collection(db, PAGOS_COLLECTION), {
      deudaId,
      monto,
      fecha: new Date().toISOString().split('T')[0],
      nota,
      createdAt: Timestamp.now()
    })
  );

  return nuevoSaldo;
}

// ============ GASTOS ============

export async function getGastos(mes?: string): Promise<Gasto[]> {
  const q = query(collection(db, GASTOS_COLLECTION), orderBy('fecha', 'desc'));

  const querySnapshot = await withTimeout(getDocs(q));
  let gastos = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Gasto[];

  // Filter by month if provided
  if (mes) {
    gastos = gastos.filter(g => g.fecha.startsWith(mes));
  }

  return gastos;
}

export function subscribeToGastos(callback: (gastos: Gasto[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(
    query(collection(db, GASTOS_COLLECTION), orderBy('fecha', 'desc')),
    (snapshot) => {
      const gastos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Gasto[];
      callback(gastos);
    },
    (error) => {
      console.error('Error subscribing to gastos:', error);
      if (onError) onError(error);
    }
  );
}

export async function addGasto(gasto: Omit<Gasto, 'id' | 'createdAt'>) {
  const docRef = await withTimeout(
    addDoc(collection(db, GASTOS_COLLECTION), {
      ...gasto,
      createdAt: Timestamp.now()
    })
  );
  return docRef.id;
}

export async function deleteGasto(id: string) {
  await withTimeout(deleteDoc(doc(db, GASTOS_COLLECTION, id)));
}

export async function updateGasto(id: string, data: Partial<Omit<Gasto, 'id' | 'createdAt'>>) {
  const gastoRef = doc(db, GASTOS_COLLECTION, id);
  await withTimeout(updateDoc(gastoRef, data));
}

// ============ PAGOS ============

export async function getPagos(): Promise<Pago[]> {
  const querySnapshot = await withTimeout(
    getDocs(query(collection(db, PAGOS_COLLECTION), orderBy('fecha', 'desc')))
  );
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Pago[];
}

export function subscribeToPagos(callback: (pagos: Pago[]) => void) {
  return onSnapshot(
    query(collection(db, PAGOS_COLLECTION), orderBy('fecha', 'desc')),
    (snapshot) => {
      const pagos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Pago[];
      callback(pagos);
    }
  );
}

// ============ CONFIGURACIÓN ============

export async function getConfiguracion(): Promise<ConfiguracionFinanciera> {
  const docRef = doc(db, CONFIG_COLLECTION, 'principal');
  const docSnap = await withTimeout(getDoc(docRef));

  if (docSnap.exists()) {
    return docSnap.data() as ConfiguracionFinanciera;
  }

  // Return defaults if not configured
  return {
    ingresoMensual: INGRESO_MENSUAL,
    valesDespensa: VALES_DESPENSA,
    presupuestoVariable: PRESUPUESTO_VARIABLE,
    presupuestosPersonales
  };
}

export async function updateConfiguracion(config: Partial<ConfiguracionFinanciera>) {
  const docRef = doc(db, CONFIG_COLLECTION, 'principal');
  await withTimeout(setDoc(docRef, config, { merge: true }));
}

// ============ GASTOS FIJOS ============

export async function getGastosFijos(): Promise<GastoFijo[]> {
  const querySnapshot = await withTimeout(getDocs(collection(db, GASTOS_FIJOS_COLLECTION)));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as GastoFijo[];
}

// ============ SUSCRIPCIONES ============

export async function getSuscripciones(): Promise<Suscripcion[]> {
  const querySnapshot = await withTimeout(getDocs(collection(db, SUSCRIPCIONES_COLLECTION)));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Suscripcion[];
}

// ============ INICIALIZACIÓN ============

export async function initializeFirestoreData() {
  // Check if data already exists
  const deudasSnapshot = await withTimeout(getDocs(collection(db, DEUDAS_COLLECTION)));

  if (deudasSnapshot.empty) {
    // Inicializar datos en Firestore
    const batch = writeBatch(db);

    // Add deudas
    deudasIniciales.forEach((deuda) => {
      const docRef = doc(db, DEUDAS_COLLECTION, deuda.id);
      batch.set(docRef, deuda);
    });

    // Add gastos fijos
    gastosFijos.forEach((gasto) => {
      const docRef = doc(db, GASTOS_FIJOS_COLLECTION, gasto.id);
      batch.set(docRef, gasto);
    });

    // Add suscripciones
    suscripciones.forEach((sub) => {
      const docRef = doc(db, SUSCRIPCIONES_COLLECTION, sub.id);
      batch.set(docRef, sub);
    });

    // Add configuración
    const configRef = doc(db, CONFIG_COLLECTION, 'principal');
    batch.set(configRef, {
      ingresoMensual: INGRESO_MENSUAL,
      valesDespensa: VALES_DESPENSA,
      presupuestoVariable: PRESUPUESTO_VARIABLE,
      presupuestosPersonales
    });

    await withTimeout(batch.commit(), 20000); // 20 seconds for batch
    return true;
  }

  return false;
}

// ============ UTILIDADES ============

export function calcularTotalesFromDeudas(deudas: Deuda[]) {
  const deudaTotal = deudas.reduce((sum, d) => sum + d.saldoActual, 0);
  const deudaInicial = deudas.reduce((sum, d) => sum + d.saldoInicial, 0);
  const pagosMinimos = deudas.filter(d => !d.liquidada).reduce((sum, d) => sum + d.pagoMinimo, 0);
  const porcentajePagado = deudaInicial > 0 ? ((deudaInicial - deudaTotal) / deudaInicial) * 100 : 0;

  return {
    deudaTotal,
    deudaInicial,
    pagosMinimos,
    porcentajePagado,
    deudaPagada: deudaInicial - deudaTotal,
  };
}
