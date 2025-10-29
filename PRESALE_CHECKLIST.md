# Pre-Sale System - Implementation Checklist & File Structure

## Phase 1: Backend Data Models & Setup

### Step 1.1: Update Existing Models

- [ ] **File:** `backend/src/models/Purchase.ts`
  - Add fields to interface:
    - `isPresale?: boolean`
    - `preSaleScheduledDate?: Date`
    - `preSaleStatus?: 'coming-soon' | 'purchased' | 'shipped' | 'received' | 'archived'`
  - Add schema fields with same names
  - Add validation for preSaleStatus if isPresale is true

- [ ] **File:** `shared/types.ts` - Update Purchase interface
  - Add same fields as above to TypeScript interface

- [ ] **File:** `backend/src/models/Delivery.ts`
  - Add to DeliveryItem interface:
    - `isPresaleItem?: boolean`
    - `preSaleItemId?: ObjectId`
    - `preSaleUnitIds?: string[]`
    - `paymentPlanId?: ObjectId`
  - Add to Delivery interface:
    - `hasPresaleItems?: boolean`
    - `preSalePaymentPlans?: ObjectId[]`
    - `preSaleStatus?: 'pending' | 'partial' | 'completed'`
  - Update DeliveryItemSchema accordingly

- [ ] **File:** `shared/types.ts` - Update Delivery & DeliveryItem interfaces
  - Mirror changes from Delivery.ts models

### Step 1.2: Create New Models

- [ ] **File:** `backend/src/models/PreSaleItem.ts` (NEW)
  - Create schema for PreSaleItem with all fields defined in PRESALE_ARCHITECTURE.md
  - Add indexes:
    - On `carId` (frequently queried)
    - On `preSaleStatus` (filtering)
    - On `linkedPurchaseIds` (lookups)
  - Add methods:
    - `calculateAvailableQuantity()` - getter
    - `recalculatePricing(markupPercentage)`
    - `addDeliveryAssignment(deliveryId, quantity)`
    - `removeDeliveryAssignment(deliveryId)`

- [ ] **File:** `backend/src/models/PreSalePaymentPlan.ts` (NEW)
  - Create schema for payment plans
  - Add indexes:
    - On `deliveryId`
    - On `status`
  - Add methods:
    - `recordPayment(amount, method)` - handles payment logic
    - `calculateNextDueDate()`
    - `checkIfOverdue()`
    - `getPaymentSummary()`
    - `adjustForEarlyPayment()`

- [ ] **File:** `shared/types.ts` - Add new interfaces
  - Export `IPreSaleItem` interface
  - Export `IPreSalePaymentPlan` interface
  - Export `PreSalePayment` interface

---

## Phase 2: Backend API Endpoints & Services

### Step 2.1: Create Services

- [ ] **File:** `backend/src/services/PreSaleItemService.ts` (NEW)
  - `createOrUpdatePreSaleItem(purchaseId, markupPercentage)` - aggregation logic
  - `getPreSaleItem(id)` - with populated data
  - `listPreSaleItems(filters, sort)` - with pagination
  - `updatePreSaleItemStatus(id, newStatus)`
  - `updatePreSaleItemPricing(id, markupPercentage, customPrice)`
  - `assignToDelivery(preSaleItemId, deliveryId, quantity)` - with validation
  - `removeDeliveryAssignment(preSaleItemId, deliveryId)`
  - `archivePreSaleItem(id)`

- [ ] **File:** `backend/src/services/PreSalePaymentService.ts` (NEW)
  - `createPaymentPlan(deliveryId, preSaleItemId, totalAmount, installments, dates)` - calculations
  - `getPaymentPlan(id)` - with full details
  - `recordPayment(paymentPlanId, amount, method, notes)` - core payment logic
  - `updatePaymentPlan(id, updates)`
  - `getPaymentHistory(paymentPlanId)`
  - `calculateInstallmentAmounts(totalAmount, numberOfPayments)`
  - `checkPaymentStatus()` - for detecting overdue

### Step 2.2: Create API Routes

- [ ] **File:** `backend/src/routes/presaleItems.ts` (NEW)
  - GET `/api/presale-items` - list all
  - GET `/api/presale-items/:id` - get single with details
  - POST `/api/presale-items` - create (triggered by purchase)
  - PATCH `/api/presale-items/:id/status` - update status
  - PATCH `/api/presale-items/:id/pricing` - update pricing
  - GET `/api/presale-items/:id/deliveries` - get deliveries
  - POST `/api/presale-items/:id/archive` - archive item
  - DELETE `/api/presale-items/:id` - soft delete

- [ ] **File:** `backend/src/routes/presalePayments.ts` (NEW)
  - POST `/api/presale-payments/plan` - create payment plan
  - GET `/api/presale-payments/plan/:id` - get plan details
  - POST `/api/presale-payments/plan/:id/payment` - record payment
  - PATCH `/api/presale-payments/plan/:id` - update plan
  - GET `/api/presale-payments/plan/:id/history` - payment history
  - GET `/api/presale-payments/plans/delivery/:deliveryId` - get plans for delivery

### Step 2.3: Update Existing Routes

- [ ] **File:** `backend/src/routes/purchases.ts`
  - Modify POST `/api/purchases` to handle `isPresale` flag
  - On purchase creation with isPresale + received: trigger PreSaleItemService.createOrUpdatePreSaleItem
  - Modify PATCH `/api/purchases/:id` for status updates
  - When marking as received: auto-create/update PreSaleItem

- [ ] **File:** `backend/src/routes/deliveries.ts`
  - Modify POST `/api/deliveries` to:
    - Accept `paymentPlans` array in body
    - Validate pre-sale item quantities (don't exceed available)
    - Check for duplicate unit assignments
    - Create PreSalePaymentPlan for each pre-sale item
    - Update PreSaleItem with delivery assignment
  - Modify PATCH `/api/deliveries/:id` to handle pre-sale status updates
  - When completing delivery: update pre-sale item unit statuses

### Step 2.4: Update Controllers

- [ ] **File:** `backend/src/controllers/purchaseController.ts`
  - Update to call PreSaleItemService when needed

- [ ] **File:** `backend/src/controllers/deliveryController.ts`
  - Update to handle payment plans
  - Call PreSalePaymentService.recordPayment from payment endpoint

---

## Phase 3: Database Seeding & Utilities

- [ ] **File:** `backend/src/scripts/migrateToPresale.ts` (NEW, optional)
  - Script to migrate existing data if needed
  - Can help identify which purchases should be marked as pre-sale

- [ ] **File:** `backend/src/utils/presaleCalculations.ts` (NEW)
  - `calculateSuggestedPrice(purchasePrice, markupPercentage)`
  - `calculateFinalPrice(purchasePrice, customMarkup, customPrice)`
  - `calculateInstallmentAmount(totalAmount, numberOfPayments)`
  - `calculateProfit(purchasePrice, salePrice, quantity)`
  - `generateUnitIds(preSaleItemId, quantity)` - for unit tracking

---

## Phase 4: Frontend - Pages & Layouts

### Step 4.1: Create Pre-Sale Pages

- [ ] **File:** `frontend/src/pages/PreSale.tsx` (NEW)
  - Main dashboard page with 2 tabs
  - Tab state management
  - Layout structure

- [ ] **File:** `frontend/src/pages/PreSaleItems.tsx` (NEW - Tab 2)
  - Pre-sale items table view
  - Filtering by status, availability
  - Sorting options
  - Bulk actions (archive)

- [ ] **File:** `frontend/src/pages/PreSalePurchases.tsx` (NEW - Tab 1)
  - Pre-sale purchases table view
  - Filtering by status
  - Status update quick actions

### Step 4.2: Create Pre-Sale Components

- [ ] **File:** `frontend/src/components/PreSale/PreSaleDashboard.tsx` (NEW)
  - Main component with tab routing
  - Shared state management

- [ ] **File:** `frontend/src/components/PreSale/PreSaleItemsTable.tsx` (NEW)
  - Table for displaying pre-sale items
  - Columns: Image, Name, Brand, Qty|Assigned|Available, Status, Price, Actions
  - Row click handlers

- [ ] **File:** `frontend/src/components/PreSale/PreSalePurchasesTable.tsx` (NEW)
  - Table for displaying pre-sale purchases
  - Columns: ID, Supplier, Date, Scheduled, Status, Items, Actions

- [ ] **File:** `frontend/src/components/PreSale/PreSaleItemDetails.tsx` (NEW)
  - Modal/Drawer showing full item details
  - Product card section
  - Quantity visualization (bar chart/breakdown)
  - Status timeline
  - Pricing management UI
  - Associated deliveries list
  - Action buttons

- [ ] **File:** `frontend/src/components/PreSale/QuantityVisualization.tsx` (NEW)
  - Stacked bar chart showing:
    - Total quantity (green)
    - Assigned quantity (yellow)
    - Available quantity (grey)
  - Tooltip with breakdown

- [ ] **File:** `frontend/src/components/PreSale/StatusTimeline.tsx` (NEW)
  - Visual timeline showing:
    - coming-soon (scheduled date)
    - purchased (purchase date)
    - shipped (shipping date if applicable)
    - received (received date)
    - archived (archive date)
  - Each step with icon, label, date

- [ ] **File:** `frontend/src/components/PreSale/PricingCard.tsx` (NEW)
  - Shows purchase price, suggested price with markup %
  - Custom price override input
  - Calculates profit display
  - Editable section

---

## Phase 5: Frontend - Forms & Components

### Step 5.1: Payment Management Components

- [ ] **File:** `frontend/src/components/PreSale/PaymentPlanForm.tsx` (NEW)
  - Number of payments input (selector)
  - First payment date picker
  - Limit date picker
  - Real-time calculation display:
    - Fixed payment amount per installment
    - Next due date auto-calculation
    - Payment schedule preview
  - Validation messages

- [ ] **File:** `frontend/src/components/PreSale/PaymentTracking.tsx` (NEW)
  - Payment plan summary card:
    - Total amount
    - Paid amount
    - Remaining balance
    - Progress bar
    - Next due date
    - Status badge (On Track / Overdue / Completed)
  - Payment history table:
    - Date, Amount, Method, Notes
  - Record payment form:
    - Amount input
    - Payment method selector
    - Notes input
    - Submit button
  - Payment history expandable section

- [ ] **File:** `frontend/src/components/PreSale/PaymentHistoryTable.tsx` (NEW)
  - Table showing all payments made
  - Columns: Date, Amount, Method, Notes, CreatedAt

### Step 5.2: Pre-Sale Item Selector

- [ ] **File:** `frontend/src/components/PreSale/PreSaleItemSelector.tsx` (NEW)
  - Multi-select component for delivery form
  - Two sections:
    1. Pre-sale items (with available qty badges)
    2. Normal inventory items
  - For each pre-sale item:
    - Show available quantity
    - Quantity input with max validation
    - "Has Payment Plan" checkbox
    - If checked: show PaymentPlanForm inline
  - For each normal item:
    - Standard selector

- [ ] **File:** `frontend/src/components/PreSale/UnitAssignmentUI.tsx` (NEW)
  - Visual representation of unit assignment
  - Shows which units are assigned to which deliveries
  - Prevent duplicate assignments
  - Show allocation progress

---

## Phase 6: Update Existing Forms

### Step 6.1: Purchase Form Modifications

- [ ] **File:** `frontend/src/components/PurchaseForm.tsx` (MODIFY)
  - Add checkbox: "Is Pre-Sale"
  - If checked, show:
    - Scheduled release date picker (optional)
    - Default markup percentage input (default 15)
    - Pre-sale notes field
  - Update form validation

### Step 6.2: Delivery Form Modifications

- [ ] **File:** `frontend/src/components/DeliveryForm.tsx` (MODIFY)
  - Replace item selector with `PreSaleItemSelector`
  - For each pre-sale item:
    - Show available quantity warning
    - Show "Add Payment Plan" checkbox
    - If checked: embed `PaymentPlanForm`
  - Update form validation:
    - Ensure total doesn't exceed available qty
    - Ensure payment plan dates are valid
  - Update submit handler to create payment plans

---

## Phase 7: Services & Hooks

### Step 7.1: Frontend Services

- [ ] **File:** `frontend/src/services/presaleService.ts` (NEW)
  - `getPreSaleItems(filters, sort)` - fetch list
  - `getPreSaleItem(id)` - fetch single
  - `createPreSaleItem(data)` - create (mostly for testing)
  - `updatePreSaleItemStatus(id, status)`
  - `updatePreSaleItemPricing(id, pricing)`
  - `archivePreSaleItem(id)`
  - `getDeliveriesForItem(itemId)`

- [ ] **File:** `frontend/src/services/presalePaymentService.ts` (NEW)
  - `createPaymentPlan(data)` - create plan
  - `getPaymentPlan(id)` - fetch plan
  - `recordPayment(planId, amount, method, notes)` - record payment
  - `updatePaymentPlan(id, updates)`
  - `getPaymentHistory(planId)`

### Step 7.2: Custom Hooks

- [ ] **File:** `frontend/src/hooks/usePreSaleItems.ts` (NEW)
  - `usePreSaleItems(filters)` - query hook
  - `usePreSaleItem(id)` - single item hook
  - `useUpdatePreSaleItem()` - mutation hook

- [ ] **File:** `frontend/src/hooks/usePaymentPlans.ts` (NEW)
  - `usePaymentPlan(id)` - query hook
  - `useRecordPayment()` - mutation hook
  - `useCreatePaymentPlan()` - mutation hook

---

## Phase 8: Routing & Navigation

- [ ] **File:** `frontend/src/App.tsx` (MODIFY)
  - Add route `/presale` → PreSaleDashboard
  - Add route `/presale/items/:id` → PreSaleItemDetails

- [ ] **File:** Update navigation/sidebar component
  - Add "Pre-Sale" menu item
  - Link to `/presale`
  - Show badge with active pre-sale items count

---

## Phase 9: Dashboard & Stats

- [ ] **File:** `frontend/src/pages/Dashboard.tsx` (MODIFY)
  - Add Pre-Sale widget showing:
    - Total pre-sale items (active)
    - Total pre-sale revenue
    - Total pre-sale profit
    - Payment status summary (on-track, overdue, completed)
  - Add quick links to pre-sale page

- [ ] **File:** Create new stats component if needed

---

## Phase 10: Testing & Validation

### Step 10.1: Backend Tests

- [ ] Test PreSaleItem aggregation logic
- [ ] Test quantity constraint validation
- [ ] Test payment plan calculations
- [ ] Test payment recording logic (exact, over, early payment scenarios)
- [ ] Test delivery with mixed items (normal + pre-sale)

### Step 10.2: Frontend Tests

- [ ] Test pre-sale dashboard data loading
- [ ] Test quantity visualization accuracy
- [ ] Test payment plan form validation
- [ ] Test delivery form with pre-sale items
- [ ] Test payment tracking UI updates

### Step 10.3: E2E Workflow Tests

- [ ] Create purchase with isPresale=true
- [ ] Verify PreSaleItem created on receive
- [ ] Create delivery with pre-sale item
- [ ] Create payment plan
- [ ] Record payments and verify calculations
- [ ] Test partial/early payment scenarios

---

## Quick Reference: File Tree Structure

```
backend/
├── src/
│   ├── models/
│   │   ├── Purchase.ts (MODIFY)
│   │   ├── Delivery.ts (MODIFY)
│   │   ├── PreSaleItem.ts (NEW)
│   │   ├── PreSalePaymentPlan.ts (NEW)
│   │   └── ...
│   ├── services/
│   │   ├── PreSaleItemService.ts (NEW)
│   │   ├── PreSalePaymentService.ts (NEW)
│   │   └── ...
│   ├── routes/
│   │   ├── presaleItems.ts (NEW)
│   │   ├── presalePayments.ts (NEW)
│   │   ├── purchases.ts (MODIFY)
│   │   ├── deliveries.ts (MODIFY)
│   │   └── ...
│   ├── controllers/
│   │   ├── purchaseController.ts (MODIFY)
│   │   ├── deliveryController.ts (MODIFY)
│   │   └── ...
│   ├── utils/
│   │   ├── presaleCalculations.ts (NEW)
│   │   └── ...
│   └── scripts/
│       ├── migrateToPresale.ts (NEW, optional)
│       └── ...
├── index.ts (MODIFY - register new routes)
└── ...

frontend/
├── src/
│   ├── pages/
│   │   ├── PreSale.tsx (NEW)
│   │   ├── PreSaleItems.tsx (NEW)
│   │   ├── PreSalePurchases.tsx (NEW)
│   │   ├── Dashboard.tsx (MODIFY)
│   │   └── ...
│   ├── components/
│   │   ├── PreSale/
│   │   │   ├── PreSaleDashboard.tsx (NEW)
│   │   │   ├── PreSaleItemsTable.tsx (NEW)
│   │   │   ├── PreSalePurchasesTable.tsx (NEW)
│   │   │   ├── PreSaleItemDetails.tsx (NEW)
│   │   │   ├── QuantityVisualization.tsx (NEW)
│   │   │   ├── StatusTimeline.tsx (NEW)
│   │   │   ├── PricingCard.tsx (NEW)
│   │   │   ├── PaymentPlanForm.tsx (NEW)
│   │   │   ├── PaymentTracking.tsx (NEW)
│   │   │   ├── PaymentHistoryTable.tsx (NEW)
│   │   │   ├── PreSaleItemSelector.tsx (NEW)
│   │   │   └── UnitAssignmentUI.tsx (NEW)
│   │   ├── PurchaseForm.tsx (MODIFY)
│   │   ├── DeliveryForm.tsx (MODIFY)
│   │   └── ...
│   ├── services/
│   │   ├── presaleService.ts (NEW)
│   │   ├── presalePaymentService.ts (NEW)
│   │   └── ...
│   ├── hooks/
│   │   ├── usePreSaleItems.ts (NEW)
│   │   ├── usePaymentPlans.ts (NEW)
│   │   └── ...
│   ├── App.tsx (MODIFY)
│   └── ...

shared/
├── types.ts (MODIFY - add new interfaces)
└── ...

Documentation/
├── PRESALE_IMPLEMENTATION_PLAN.md (reference)
└── PRESALE_ARCHITECTURE.md (reference)
```

---

## Next Steps

1. **Start with Phase 1**: Create the data models and database schema
2. **Then Phase 2**: Implement backend services and APIs
3. **Then Phase 4-6**: Build frontend pages and forms
4. **Finally Phase 10**: Comprehensive testing

Each phase can be worked on independently after models are in place.

