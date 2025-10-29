# Presale System - End-to-End Testing Checklist

## Overview
Complete workflow testing for the presale system covering all 6 implemented features.

---

## Test Suite 1: Presale Item Creation

### ✓ Test 1.1: Create with Markup Percentage
- [ ] Navigate to PreSale Dashboard
- [ ] Click "Crear Pre-Venta"
- [ ] Select Purchase (e.g., "Box A - 10 units @$5")
- [ ] Enter Car ID: "HW001"
- [ ] Enter Quantity: 8
- [ ] Enter Unit Price: 5.00
- [ ] Enter Markup %: 50
- [ ] Leave Final Price empty
- [ ] Click "Crear"
- **Expected:**
  - [ ] Item appears on dashboard
  - [ ] Final Price calculated: $7.50 (5 × 1.5)
  - [ ] Total Sale: $60.00 (8 × 7.50)
  - [ ] Total Cost: $40.00 (8 × 5.00)
  - [ ] Total Profit: $20.00
  - [ ] Status badge: Blue "Activo"
  - [ ] Toast: "Pre-sale registrada exitosamente"

### ✓ Test 1.2: Create with Custom Final Price
- [ ] Repeat Test 1.1 steps but:
- [ ] Leave Markup % blank
- [ ] Enter Final Price: 9.00
- [ ] Click "Crear"
- **Expected:**
  - [ ] Final Price shows: $9.00 (custom value)
  - [ ] Markup % auto-calculated: 80%
  - [ ] Total Sale: $72.00 (8 × 9.00)
  - [ ] Total Profit: $32.00

### ✓ Test 1.3: Validation - Empty Fields
- [ ] Try submitting form with:
  - [ ] Empty Quantity → Form prevents submission
  - [ ] Empty Unit Price → Form prevents submission
  - [ ] Both Markup % and Final Price empty → Form shows error
- **Expected:**
  - [ ] Error messages display
  - [ ] Submit button disabled

---

## Test Suite 2: Presale Item Display & Metrics

### ✓ Test 2.1: Card Display All Information
- [ ] Navigate to dashboard with presale item
- **Verify card shows:**
  - [ ] Car model and ID prominently
  - [ ] Status badge with correct color
  - [ ] Quantity section:
    - [ ] Total: 8
    - [ ] Assigned: 0
    - [ ] Available: 8
  - [ ] Pricing section:
    - [ ] Base Price/U: $5.00
    - [ ] Markup: 50.0%
    - [ ] Final Price/U: $7.50
  - [ ] Profit section:
    - [ ] Cost Total: $40.00
    - [ ] Sale Total: $60.00
    - [ ] Profit Total: $20.00
  - [ ] Timeline section with dates
  - [ ] All action buttons visible

### ✓ Test 2.2: Dashboard Statistics Aggregation
- [ ] Create 3 presale items:
  - [ ] Item A: Active, 10 units, $100 profit
  - [ ] Item B: Active, 5 units, $50 profit
  - [ ] Item C: Completed, 8 units, $80 profit
- [ ] Check stats panel shows:
  - [ ] Active: 2
  - [ ] Completed: 1
  - [ ] Paused: 0
  - [ ] Cancelled: 0
  - [ ] Available Quantity: 15 (10+5)
  - [ ] Total Profit: $230 (100+50+80)
  - [ ] Summary bar shows correct totals

---

## Test Suite 3: Unit Assignment

### ✓ Test 3.1: Assign Units to Delivery
- [ ] On presale item card, click "Asignar"
- [ ] Modal opens showing available quantity
- [ ] Select a Delivery
- [ ] Enter Quantity: 5
- [ ] Click "Asignar"
- **Expected:**
  - [ ] Modal closes
  - [ ] Card updates immediately:
    - [ ] Assigned: 5
    - [ ] Available: 3
  - [ ] Toast: "5 unidades asignadas exitosamente"
  - [ ] Delivery.hasPresaleItems = true

### ✓ Test 3.2: Validate Assignment Constraints
- [ ] Click "Asignar" on item with 8 available
- [ ] Try to enter Quantity: 10
- **Expected:**
  - [ ] Form shows error: "Cannot exceed available (8)"
  - [ ] Submit button disabled

### ✓ Test 3.3: Multiple Assignments
- [ ] Item A: 10 available
- [ ] Assign 4 units to Delivery 1
- [ ] Assign 3 units to Delivery 2
- [ ] Assign 2 units to Delivery 3
- **Expected:**
  - [ ] Assigned: 9
  - [ ] Available: 1
  - [ ] All 3 deliveries linked
  - [ ] Card reflects changes in real-time

---

## Test Suite 4: Status Management

### ✓ Test 4.1: Change Status via Dropdown
- [ ] Click status badge on Active item
- [ ] Dropdown menu appears with: Active, Completed, Paused, Cancelled
- [ ] Select "Paused"
- **Expected:**
  - [ ] Badge changes to yellow "En Pausa"
  - [ ] Card background changes to yellow-50
  - [ ] Toast: "Estado actualizado exitosamente"
  - [ ] Database updated

### ✓ Test 4.2: All Status Transitions
- [ ] Create item (starts Active)
- [ ] Change to: Active → Paused (yellow) ✓
- [ ] Change to: Paused → Completed (green) ✓
- [ ] Change to: Completed → Cancelled (red) ✓
- [ ] Verify all color/label changes work correctly

### ✓ Test 4.3: Same Status No-Op
- [ ] Click status on Active item
- [ ] Try selecting "Active" (current status)
- **Expected:**
  - [ ] Button appears disabled/highlighted
  - [ ] No toast notification

---

## Test Suite 5: Pricing Updates

### ✓ Test 5.1: Update Markup Percentage
- [ ] Go to item detail view
- [ ] Current markup: 50%
- [ ] Change markup to: 75%
- [ ] Save
- **Expected:**
  - [ ] Final Price recalculated: $8.75 (5 × 1.75)
  - [ ] Total Sale updated: $70.00
  - [ ] Total Profit updated: $30.00
  - [ ] Card reflects changes
  - [ ] Toast: "Markup actualizado exitosamente"

### ✓ Test 5.2: Update Final Price Override
- [ ] Go to item detail view
- [ ] Change Final Price to: 12.00
- [ ] Save
- **Expected:**
  - [ ] Markup % recalculated: 140%
  - [ ] Total Sale updated: $96.00 (8 × 12)
  - [ ] Total Profit updated: $56.00 (96 - 40)
  - [ ] All metrics propagate correctly

### ✓ Test 5.3: Invalid Price Updates
- [ ] Try setting Markup to: -50%
- [ ] Try setting Final Price to: 0
- [ ] Try setting Final Price to: -10
- **Expected:**
  - [ ] Form validation prevents submission
  - [ ] Error messages shown

---

## Test Suite 6: Payment Plan Management

### ✓ Test 6.1: Create Payment Plan
- [ ] On presale item with assigned units, click "Pagos"
- [ ] Select Delivery
- [ ] Tab switches to "Crear Plan" (no existing plan)
- [ ] Fill form:
  - [ ] Número de Pagos: 4
  - [ ] Frecuencia: Weekly
  - [ ] Fecha de Inicio: 2025-11-15
  - [ ] Bono: 5 (%)
- [ ] Click "Crear Plan"
- **Expected:**
  - [ ] Modal closes
  - [ ] Toast: "Plan de pago creado exitosamente"
  - [ ] Payment plan created in database
  - [ ] Delivery linked via preSalePaymentPlanId

### ✓ Test 6.2: View Payment Plan
- [ ] Click "Pagos" on same presale item
- [ ] Select same Delivery
- [ ] "Ver Plan" tab shows:
  - [ ] Monto Total: $60.00 (or correct amount)
  - [ ] Pagado: $0.00
  - [ ] Restante: $60.00
  - [ ] Estado: "pending"
  - [ ] Progress bar: 0%
  - [ ] Payment schedule: 4 payments
    - [ ] Each: $15.00 (60 ÷ 4)
    - [ ] Dates: 7 days apart
    - [ ] All pending (calendar icon)

### ✓ Test 6.3: Record Payment
- [ ] Click "Pagos"
- [ ] Select Delivery
- [ ] Tab switches to "Registrar Pago"
- [ ] Enter:
  - [ ] Monto: 15.00
  - [ ] Fecha del Pago: 2025-11-15
  - [ ] Notas: "Bank transfer ref #ABC123"
- [ ] Click "Registrar Pago"
- **Expected:**
  - [ ] Modal closes
  - [ ] Toast: "Pago registrado exitosamente"
  - [ ] Reopen modal shows:
    - [ ] Pagado: $15.00
    - [ ] Restante: $45.00
    - [ ] Progress: 25% (green bar)
    - [ ] First payment marked with checkmark
    - [ ] Notes visible

### ✓ Test 6.4: Complete Payment Sequence
- [ ] Record 4 payments of $15.00 each
- [ ] After last payment:
  - [ ] Pagado: $60.00
  - [ ] Restante: $0.00
  - [ ] Status: "completed" (green)
  - [ ] Progress: 100% (green)
  - [ ] All payments show checkmarks
  - [ ] "Registrar Pago" tab removed

### ✓ Test 6.5: Payment Amount Validation
- [ ] Create plan with $60 remaining
- [ ] Try recording payment of $61
- [ ] Try recording payment of -10
- [ ] Try recording payment of 0
- **Expected:**
  - [ ] All rejected with error message
  - [ ] Submit button disabled

### ✓ Test 6.6: Early Bonus Eligibility
- [ ] Create plan with 5% early bonus
- [ ] After all 4 payments recorded
- [ ] Check bonus applied:
  - [ ] bonusApplied: true
  - [ ] bonusAmount: $3.00 (5% of 60)
  - [ ] UI shows bonus applied

---

## Test Suite 7: Database Consistency

### ✓ Test 7.1: PreSaleItem Collection
- [ ] Query created item:
  - [ ] _id populated
  - [ ] carId matches input
  - [ ] totalQuantity: 8
  - [ ] basePricePerUnit: 5.00
  - [ ] markupPercentage: 50
  - [ ] finalPricePerUnit: 7.50
  - [ ] totalSaleAmount: 60.00
  - [ ] totalCostAmount: 40.00
  - [ ] totalProfit: 20.00
  - [ ] status: 'active'

### ✓ Test 7.2: Delivery Collection Updates
- [ ] After assigning units, query Delivery:
  - [ ] hasPresaleItems: true
  - [ ] preSalePaymentPlanId populated (if payments created)
  - [ ] preSaleStatus matches payment plan status
  - [ ] items array includes presale reference

### ✓ Test 7.3: PreSalePaymentPlan Collection
- [ ] Query created plan:
  - [ ] deliveryId matches
  - [ ] totalAmount: 60.00
  - [ ] numberOfPayments: 4
  - [ ] payments array: 4 records
  - [ ] totalPaid matches sum of recorded payments
  - [ ] remainingAmount correct
  - [ ] status matches current state

### ✓ Test 7.4: Relational Integrity
- [ ] Verify no orphaned records:
  - [ ] Every presale payment plan has valid deliveryId
  - [ ] Every delivery with presale has valid preSalePaymentPlanId
  - [ ] Payment records match totalPaid sum

---

## Test Suite 8: API & Error Handling

### ✓ Test 8.1: No 404 Errors
- [ ] Open browser DevTools → Console
- [ ] Perform full workflow:
  - [ ] Create presale item
  - [ ] Assign units
  - [ ] Change pricing
  - [ ] Update status
  - [ ] Create payment plan
  - [ ] Record payments
- [ ] Monitor console:
  - [ ] No 404 errors
  - [ ] No 500 errors
  - [ ] All requests return success (2xx)
  - [ ] No unhandled promise rejections

### ✓ Test 8.2: Network Tab Analysis
- [ ] Record network activity
- [ ] Verify all API calls:
  - [ ] POST /presale/items (create)
  - [ ] PUT /presale/items/:id/status (update status)
  - [ ] PUT /presale/items/:id/markup (update markup)
  - [ ] PUT /presale/items/:id/final-price (update price)
  - [ ] POST /presale/items/:id/assign (assign units)
  - [ ] POST /presale/payments (create plan)
  - [ ] POST /presale/payments/:id/record (record payment)
- [ ] All return correct status codes

### ✓ Test 8.3: Concurrent Operations
- [ ] Open presale page in 2 browser tabs
- [ ] Assign units in Tab 1
- [ ] Refresh Tab 2
- [ ] Verify Tab 2 shows updated quantities
- [ ] Record payment in Tab 1
- [ ] Refresh Tab 2
- [ ] Verify Tab 2 shows updated payment status

---

## Test Suite 9: User Experience

### ✓ Test 9.1: Toast Notifications
- [ ] Verify correct toasts for:
  - [ ] "Pre-sale registrada exitosamente" ✓
  - [ ] "Estado actualizado exitosamente" ✓
  - [ ] "Markup actualizado exitosamente" ✓
  - [ ] "5 unidades asignadas exitosamente" ✓
  - [ ] "Plan de pago creado exitosamente" ✓
  - [ ] "Pago registrado exitosamente" ✓

### ✓ Test 9.2: Loading States
- [ ] Verify buttons show loading state:
  - [ ] "Crear" → "Creando..." when submitting form
  - [ ] "Registrar Pago" → "Guardando..." when recording
- [ ] Submit buttons disabled during loading

### ✓ Test 9.3: Modal Interactions
- [ ] Assignment modal:
  - [ ] Opens/closes smoothly
  - [ ] Shows available quantity
  - [ ] Cancel button works
- [ ] Payment modal:
  - [ ] Opens/closes smoothly
  - [ ] Tab switching works
  - [ ] X button closes
  - [ ] Escape key closes

### ✓ Test 9.4: Responsive Design
- [ ] Desktop (1920px):
  - [ ] Cards display in grid
  - [ ] All buttons visible
- [ ] Tablet (768px):
  - [ ] Cards stack appropriately
  - [ ] Buttons wrap as needed
  - [ ] Modals fit screen
- [ ] Mobile (375px):
  - [ ] Single column
  - [ ] Buttons stacked/shrink
  - [ ] Modals full-width with padding
  - [ ] All interactive elements accessible

---

## Test Suite 10: Data Validation

### ✓ Test 10.1: Form Validation - Presale Creation
- [ ] Quantity: Cannot be empty, must be > 0
- [ ] Unit Price: Cannot be empty, must be > 0
- [ ] Car ID: Cannot be empty
- [ ] Either Markup % or Final Price required

### ✓ Test 10.2: Form Validation - Unit Assignment
- [ ] Quantity: Cannot exceed available
- [ ] Delivery: Must be selected
- [ ] Quantity: Must be > 0

### ✓ Test 10.3: Form Validation - Payment Plan
- [ ] Number of Payments: Must be > 0
- [ ] Total Amount: Pre-filled and disabled (read-only)

### ✓ Test 10.4: Form Validation - Record Payment
- [ ] Amount: Must be > 0
- [ ] Amount: Cannot exceed remaining
- [ ] Cannot submit with empty amount

---

## Performance Testing

### ✓ Test 11.1: Load Time
- [ ] Presale Dashboard loads in < 2 seconds
- [ ] First presale card renders immediately
- [ ] All stats calculated without delay

### ✓ Test 11.2: Operation Speed
- [ ] Create presale: < 500ms
- [ ] Update status: < 300ms
- [ ] Assign units: < 400ms
- [ ] Record payment: < 500ms

### ✓ Test 11.3: Large Data Set (50+ items)
- [ ] Dashboard still loads < 3 seconds
- [ ] Stats calculation still responsive
- [ ] Scrolling smooth
- [ ] No layout shift

---

## Regression Testing

### ✓ Test 12.1: Previous Features Still Work
- [ ] Dashboard still loads
- [ ] Deliveries still function
- [ ] Purchases still function
- [ ] Sales still function
- [ ] No breaking changes

### ✓ Test 12.2: No 404 Errors on Main Routes
- [ ] / loads without errors
- [ ] /dashboard loads without errors
- [ ] /deliveries loads without errors
- [ ] /presale loads without errors

---

## Sign-Off Checklist

- [ ] All test suites completed
- [ ] All tests passed (or documented failures)
- [ ] No 404 errors found
- [ ] No console errors
- [ ] No performance issues
- [ ] Database integrity verified
- [ ] Responsive design confirmed
- [ ] Toasts all correct
- [ ] Modals working

**Tester Name:** ________________________  
**Date:** ________________________  
**Result:** ⭐ All Passed / ⚠️ Issues Found  
**Issues Document:** ________________________  

---

## Known Issues & Future Work

### Won't Fix (Out of Scope)
- [ ] Credit card payment integration (Future Phase)
- [ ] Automated payment reminders (Future Phase)
- [ ] PDF invoice generation (Future Phase)
- [ ] Multiple payment methods (Future Phase)

### Nice to Have
- [ ] Batch payment recording
- [ ] Payment schedule adjustment
- [ ] Customer payment history dashboard
- [ ] Export payment reports

---

## Rollback Instructions

If critical bug found:
```bash
git checkout feature/presale-basic
npm install
npm run build
```

Then document issue and create bug fix branch.

---

## Test Execution Notes

Use this space to record test execution details:

```
Test Date: __________
Tester: __________
Environment: __________
Build Version: __________
Database: __________

Issues Found:
1. ________________
2. ________________
3. ________________

Observations:
- ________________
- ________________

Recommendation: [ ] Ready for Production [ ] Needs More Testing

```
