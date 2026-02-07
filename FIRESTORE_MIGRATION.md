# Firestore Context Migration Guide

## Overview
All Firebase subscriptions have been centralized in `FirestoreContext` to eliminate duplicate subscription logic and improve performance.

## What Changed

### Before (Old Pattern)
```tsx
import { useState, useEffect } from 'react';
import { subscribeToGastos, subscribeToDeudas } from '@/lib/firestore';

function MyComponent() {
  const [gastos, setGastos] = useState([]);
  const [deudas, setDeudas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubGastos = subscribeToGastos((g) => {
      setGastos(g);
      setLoading(false);
    });
    const unsubDeudas = subscribeToDeudas(setDeudas);
    return () => {
      unsubGastos();
      unsubDeudas();
    };
  }, []);

  // ... rest of component
}
```

### After (New Pattern)
```tsx
import { useFirestore } from '@/contexts/FirestoreContext';

function MyComponent() {
  const { gastos, deudas, loadingGastos } = useFirestore();

  // ... rest of component - data is already subscribed!
}
```

## Migration Steps

1. **Remove imports**:
   - Remove `subscribeToGastos`, `subscribeToDeudas`, `subscribeToIngresos`, `subscribeToPagos`
   - Remove `useState` and `useEffect` if only used for subscriptions
   - Keep type imports like `Gasto`, `Deuda`, etc.

2. **Add context import**:
   ```tsx
   import { useFirestore } from '@/contexts/FirestoreContext';
   ```

3. **Replace state with context**:
   ```tsx
   // OLD
   const [gastos, setGastos] = useState([]);
   const [loading, setLoading] = useState(true);

   // NEW
   const { gastos, loadingGastos: loading } = useFirestore();
   ```

4. **Remove useEffect subscriptions**:
   Delete the entire `useEffect` block that manages subscriptions.

## Available Context Data

```tsx
const {
  // Data
  gastos,      // Gasto[]
  deudas,      // Deuda[]
  pagos,       // Pago[]
  ingresos,    // Ingreso[]

  // Loading states
  loadingGastos,
  loadingDeudas,
  loadingPagos,
  loadingIngresos,
  isInitialized,

  // Computed
  totalesDeudas, // Pre-calculated debt totals

  // Utils
  refetch,       // Manual refresh if needed
} = useFirestore();
```

## Migrated Components

✅ **Already migrated:**
- src/app/layout.tsx (added provider)
- src/contexts/FirestoreContext.tsx (new context)
- src/components/ProfessionalDashboard.tsx
- src/app/deudas/page.tsx
- src/components/DebtPaymentHistory.tsx
- src/app/gastos/page.tsx
- src/hooks/useIngresos.ts

## Remaining Components

The following components still use old subscription pattern and should be migrated:

- src/components/HeroMetric.tsx
- src/components/KeyMetrics.tsx
- src/app/analisis/page.tsx
- src/components/PaymentPlanExplainer.tsx
- src/components/CategoryBudgets.tsx
- src/components/AccountBalance.tsx
- src/components/MonthComparison.tsx
- src/components/ExportData.tsx
- src/components/DebtAdvisor.tsx
- src/components/SpendingFrictionModal.tsx
- src/components/GastoForm.tsx
- src/components/BudgetOverview.tsx
- src/components/BudgetAlertBanner.tsx
- src/app/registrar/page.tsx
- src/components/UnifiedAlerts.tsx
- src/components/FinancialAdvisor.tsx
- src/components/ResumenGlobal.tsx
- src/components/QuickAdd.tsx
- src/components/PresupuestosPersonales.tsx
- src/components/CoupleAlerts.tsx
- src/components/DailyBudgetCard.tsx
- src/components/EmergencyFund.tsx
- src/components/UnplannedExpenses.tsx
- src/components/UnrecognizedExpenses.tsx
- src/components/Navbar.tsx
- src/components/PreviousMonthSummary.tsx
- src/components/MonthSelector.tsx
- src/components/WeeklyBudget.tsx
- src/app/config/page.tsx
- src/components/FutureSelfCard.tsx
- src/components/ProgressHeroCard.tsx

## Benefits

1. **Single subscription per collection** - Better Firebase quota usage
2. **Centralized error handling** - Errors logged in one place
3. **Easier testing** - Mock the context instead of individual subscriptions
4. **Better performance** - No duplicate subscriptions
5. **Cleaner code** - Less boilerplate in components
6. **Automatic cleanup** - Context handles all unsubscribe logic

## Notes

- The `FirestoreContext` is wrapped at the root layout level
- All components automatically have access to real-time data
- No need to pass data as props through component trees
- Loading states are managed centrally
