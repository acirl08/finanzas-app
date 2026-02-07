'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  subscribeToGastos,
  subscribeToDeudas,
  subscribeToPagos,
  subscribeToIngresos,
  calcularTotalesFromDeudas,
  initializeFirestoreData,
  Gasto,
  Pago,
  Ingreso,
} from '@/lib/firestore';
import { Deuda } from '@/types';
import { deudasIniciales } from '@/lib/data';

/**
 * Centralized Firestore Context
 *
 * This context manages all Firebase real-time subscriptions in one place,
 * providing a single source of truth for all components.
 *
 * Benefits:
 * - Eliminates duplicate subscription logic across components
 * - Centralized loading and error states
 * - Automatic cleanup on unmount
 * - Better performance (single subscription per collection)
 */

interface FirestoreContextValue {
  // Data
  gastos: Gasto[];
  deudas: Deuda[];
  pagos: Pago[];
  ingresos: Ingreso[];

  // Loading states
  loadingGastos: boolean;
  loadingDeudas: boolean;
  loadingPagos: boolean;
  loadingIngresos: boolean;
  isInitialized: boolean;

  // Computed values
  totalesDeudas: ReturnType<typeof calcularTotalesFromDeudas>;

  // Utility functions
  refetch: () => void;
}

const FirestoreContext = createContext<FirestoreContextValue | undefined>(undefined);

export function FirestoreProvider({ children }: { children: ReactNode }) {
  // State
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [deudas, setDeudas] = useState<Deuda[]>(deudasIniciales); // Start with local data
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);

  const [loadingGastos, setLoadingGastos] = useState(true);
  const [loadingDeudas, setLoadingDeudas] = useState(true);
  const [loadingPagos, setLoadingPagos] = useState(true);
  const [loadingIngresos, setLoadingIngresos] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Firebase data on mount
  useEffect(() => {
    initializeFirestoreData()
      .then(() => {
        setIsInitialized(true);
      })
      .catch((error) => {
        console.error('Failed to initialize Firestore:', error);
        setIsInitialized(true); // Continue anyway with local data
      });
  }, []);

  // Subscribe to gastos
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = subscribeToGastos(
      (newGastos) => {
        setGastos(newGastos);
        setLoadingGastos(false);
      },
      (error) => {
        console.error('Error subscribing to gastos:', error);
        setLoadingGastos(false);
      }
    );

    return () => unsubscribe();
  }, [isInitialized]);

  // Subscribe to deudas
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = subscribeToDeudas(
      (newDeudas) => {
        // Only update if Firebase has data, otherwise keep local data
        if (newDeudas && newDeudas.length > 0) {
          setDeudas(newDeudas);
        }
        setLoadingDeudas(false);
      },
      (error) => {
        console.error('Error subscribing to deudas:', error);
        setLoadingDeudas(false);
      }
    );

    return () => unsubscribe();
  }, [isInitialized]);

  // Subscribe to pagos
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = subscribeToPagos(
      (newPagos) => {
        setPagos(newPagos);
        setLoadingPagos(false);
      },
      (error) => {
        console.error('Error subscribing to pagos:', error);
        setLoadingPagos(false);
      }
    );

    return () => unsubscribe();
  }, [isInitialized]);

  // Subscribe to ingresos
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = subscribeToIngresos(
      (newIngresos) => {
        setIngresos(newIngresos);
        setLoadingIngresos(false);
      },
      (error) => {
        console.error('Error subscribing to ingresos:', error);
        setLoadingIngresos(false);
      }
    );

    return () => unsubscribe();
  }, [isInitialized]);

  // Computed values
  const totalesDeudas = calcularTotalesFromDeudas(deudas);

  // Refetch function (for manual refresh if needed)
  const refetch = () => {
    setLoadingGastos(true);
    setLoadingDeudas(true);
    setLoadingPagos(true);
    setLoadingIngresos(true);
  };

  const value: FirestoreContextValue = {
    gastos,
    deudas,
    pagos,
    ingresos,
    loadingGastos,
    loadingDeudas,
    loadingPagos,
    loadingIngresos,
    isInitialized,
    totalesDeudas,
    refetch,
  };

  return (
    <FirestoreContext.Provider value={value}>
      {children}
    </FirestoreContext.Provider>
  );
}

/**
 * Hook to access Firestore data from any component
 *
 * @example
 * const { gastos, deudas, loadingGastos } = useFirestore();
 */
export function useFirestore() {
  const context = useContext(FirestoreContext);
  if (context === undefined) {
    throw new Error('useFirestore must be used within a FirestoreProvider');
  }
  return context;
}
