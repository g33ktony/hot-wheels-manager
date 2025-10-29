# Phase 5 - Payment Management Quick Reference

**Date:** October 28, 2025  
**Status:** ✅ COMPLETE (Build: 2719 modules, 2.92s, 0 errors)

---

## 🎯 What's New

| Component | Purpose | Key Features |
|-----------|---------|--------------|
| **PaymentStats** | Display metrics | 4 stat cards with gradients & percentages |
| **PaymentPlanTracker** | Manage plans | Expandable tracker with payment form |
| **OverduePaymentsAlert** | Alert system | Smart alert with >30 day warning |
| **PaymentHistoryTable** | Transaction log | Sortable by date/amount with expand details |
| **PaymentAnalytics** | Performance | On-time %, overdue rate, averages |

---

## 🔗 Routes & Navigation

**URL:** `https://localhost:5173/presale/payments`

**Sidebar Link:** "Pagos Pre-Venta" (after "Panel Pre-Ventas")

**Icon:** DollarSign (Lucide React)

---

## 💾 Data Flow

```
API Call (usePaymentPlans)
    ↓
OverduePaymentsAlert displays list
    ↓
User clicks "Registrar Pago"
    ↓
PaymentManagementPage selected payment
    ↓
PaymentPlanTracker shows form
    ↓
useRecordPayment mutation
    ↓
Queries invalidated & data refreshes
    ↓
PaymentHistoryTable updates
```

---

## 📊 Component Hierarchy

```
PaymentManagementPage
├── OverduePaymentsAlert (top)
├── PaymentStats (when plan selected)
├── Tabs (Resumen/Planes/Análisis)
│   ├── Tab 1: Resumen
│   │   ├── PaymentPlanTracker
│   │   └── PaymentHistoryTable
│   ├── Tab 2: Planes de Pago
│   │   └── Payment plan list
│   └── Tab 3: Análisis
│       └── PaymentAnalytics
```

---

## 🎨 Component Props

### PaymentStats
```typescript
<PaymentStats
  totalAmount={plan.totalAmount}
  totalPaid={plan.totalPaid}
  remainingAmount={plan.remainingAmount}
  overdueAmount={selectedPlan?.hasOverduePayments ? remainingAmount : 0}
/>
```

### PaymentPlanTracker
```typescript
<PaymentPlanTracker
  paymentPlan={{
    _id: plan._id || '',
    totalAmount: plan.totalAmount,
    numberOfPayments: plan.numberOfPayments,
    amountPerPayment: plan.amountPerPayment,
    paymentFrequency: plan.paymentFrequency,
    totalPaid: plan.totalPaid,
    remainingAmount: plan.remainingAmount,
    paymentsCompleted: plan.paymentsCompleted,
    hasOverduePayments: plan.hasOverduePayments,
  }}
  schedule={schedule.map(item => ({
    dueDate: new Date(item.dueDate),
    amount: item.amount,
    paid: item.paid,
    paidDate: item.paidDate ? new Date(item.paidDate) : undefined,
    isOverdue: item.isOverdue,
    notes: item.notes,
  }))}
  isLoading={recordingPayment}
  onRecordPayment={handleRecordPayment}
/>
```

### OverduePaymentsAlert
```typescript
<OverduePaymentsAlert
  overduePayments={overduePayments.map(p => ({
    _id: p._id,
    deliveryId: p.deliveryId,
    deliveryNumber: p.deliveryNumber || 'N/A',
    customerName: p.customerName || 'Cliente desconocido',
    dueDate: new Date(p.dueDate),
    amount: p.totalAmount,
    overdueAmount: p.remainingAmount,
    daysPastDue: Math.floor((new Date().getTime() - new Date(p.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
    notes: p.notes,
  }))}
  isLoading={overdueLoading}
  onPaymentClick={setSelectedPaymentId}
/>
```

---

## 🎣 Hooks Quick Reference

```typescript
import { 
  usePaymentPlans,
  usePaymentPlanById,
  usePaymentSchedule,
  usePaymentAnalytics,
  useRecordPayment,
  useOverduePayments,
  useCheckOverdue
} from '@/hooks/usePayments'

// Fetch all payment plans
const { data: plans, isLoading } = usePaymentPlans()

// Fetch single plan
const { data: plan } = usePaymentPlanById('plan-id')

// Fetch schedule
const { data: schedule } = usePaymentSchedule('plan-id')

// Fetch analytics
const { data: analytics } = usePaymentAnalytics('plan-id')

// Record payment (mutation)
const { mutate: recordPayment } = useRecordPayment()
recordPayment({ 
  paymentPlanId: 'id', 
  amount: 1000, 
  paymentDate: new Date(),
  notes: 'Efectivo'
})

// Get overdue payments
const { data: overdue } = useOverduePayments()

// Check overdue status
const { mutate: checkOverdue } = useCheckOverdue()
```

---

## 🔴 Overdue Alert Rules

- **Green**: No overdue payments
- **Red**: Overdue payments exist
- **Critical Warning**: Payments >30 days past due
- **Auto-expanded**: When overdue payments exist

---

## 💡 Key Features

✅ **Real-time payment tracking**  
✅ **Overdue payment alerts with critical warnings**  
✅ **Payment recording with date & notes**  
✅ **Transaction history with sorting**  
✅ **Payment analytics with performance metrics**  
✅ **Responsive design for all devices**  
✅ **Auto-refetch every 5 minutes**  
✅ **Type-safe with full TypeScript**

---

## 📁 File Locations

```
frontend/src/
├── components/PaymentManagement/
│   ├── PaymentStats.tsx
│   ├── PaymentPlanTracker.tsx
│   ├── OverduePaymentsAlert.tsx
│   ├── PaymentHistoryTable.tsx
│   └── PaymentAnalytics.tsx
├── hooks/
│   └── usePayments.ts
└── pages/
    └── PaymentManagementPage.tsx
```

---

## 🚀 Next Phase (Phase 6)

**Delivery Integration (3-4 days)**

Will add:
- Support for pre-sale items in deliveries
- Unit-level inventory tracking
- Automatic payment plan creation
- Mixed delivery support

---

**Build Status:** ✅ Passing  
**TypeScript Errors:** 0  
**Ready for:** Phase 6 Delivery Integration
