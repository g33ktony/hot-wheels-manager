# Pre-Sale System - Complete Summary & Next Steps

## 📋 What You're Getting

I've created a comprehensive plan to implement a **Pre-Sale Management System** for your Hot Wheels manager application. Here are the 4 documentation files I've created:

### 1. **PRESALE_IMPLEMENTATION_PLAN.md** 
   - Complete technical specification
   - Data models (6 new/updated models)
   - API endpoints (15+ endpoints)
   - Business logic rules
   - 10-phase implementation roadmap
   - Configuration notes

### 2. **PRESALE_ARCHITECTURE.md**
   - Visual database schema
   - Entity relationships diagrams
   - Data flow examples
   - API request/response samples
   - Component hierarchy
   - Frontend routes

### 3. **PRESALE_CHECKLIST.md**
   - Implementation checklist by phase
   - File structure reference
   - 10 detailed implementation phases
   - Quick reference file tree
   - Phase dependencies

### 4. **PRESALE_CODE_EXAMPLES.md** (NEW)
   - Working code examples
   - Backend models implementation
   - Service layer code
   - API route examples
   - Frontend component starters

---

## 🎯 Key Features Implemented in This Plan

### ✅ Pre-Sale Purchase Management
- Flag purchases as pre-sale (`isPresale: true`)
- Track pre-sale status: coming-soon → purchased → shipped → received → archived
- Support scheduled release dates for future products
- Two-level view: Purchases list + Aggregated items list

### ✅ Pre-Sale Items Aggregation
- Automatic aggregation by product (carId)
- Quantity tracking: total | assigned | available
- Pool quantities across multiple purchases
- Unit-level tracking for delivery assignments
- Prevents over-allocation (max 3 units = max 3 deliveries)

### ✅ Flexible Payment Options
- Full payment (single transaction)
- Installment payments (2, 3, 6, 12 months)
- Fixed installment amounts
- Customer can pay more than required (next payment adjusted)
- Customer can pay fewer installments (plan adjusts)
- Auto-detection of overdue payments
- Payment date scheduling

### ✅ Pricing Management
- Inherit purchase price as base
- Apply default markup % (suggest 15%)
- Allow custom price override
- Track profit per unit
- Dashboard stats show total pre-sale profit

### ✅ Delivery Integration
- Mix pre-sale + normal items in same delivery
- Create delivery linked to pre-sale item
- Payment plan optional per item
- Track which units assigned to which delivery
- Prevent duplicate unit assignments
- Partial delivery support (some items pending)

### ✅ Dashboard Stats
- Active pre-sale items count
- Total pre-sale revenue
- Total pre-sale profit
- Payment status overview (on-track, overdue, completed)
- Profit by payment type breakdown

---

## 📊 System Flow Diagram

```
┌─ Purchase Creation ─────────────────────────────────┐
│ Supplier → Items → Mark isPresale: true             │
│ Optional: Scheduled date, Markup %                  │
└──────────────────────┬────────────────────────────────┘
                       ↓
        ┌─────── Mark as Received ──────┐
        ↓                                 ↓
   [Auto] Create/Update              Dashboard View:
   PreSaleItem                        1. Purchases List
   (Aggregate by carId)               2. Items to Receive
        │                                │
        │                                ↓
        ↓                          Select Item
   Pool Quantities:            Set for Delivery
   - Total                            │
   - Assigned                          ↓
   - Available               ┌─ Create Delivery ────┐
        │                   │ Mix items:          │
        │                   │ + Normal items      │
        │                   │ + Pre-sale items    │
        │                   └────────┬─────────────┘
        │                            ↓
        ├─────────────────→ [If Pre-Sale Item]
        │                  Create Payment Plan:
        │                  - # of payments
        │                  - First payment date
        │                  - Limit date (100% paid)
        │                  - Fixed amount calc
        │                            ↓
        │                  Payment Tracking:
        │                  - Record payments
        │                  - Auto-adjust dates
        │                  - Detect overdue
        │                  - Calculate profit
        │                            ↓
        └──────────────────→ Dashboard Stats:
                             - Pre-sale revenue
                             - Pre-sale profit
                             - Payment status
```

---

## 🚀 Quick Start Guide

### Phase 1: Backend Models (1-2 days)
```bash
1. Update Purchase.ts - Add isPresale fields
2. Create PreSaleItem.ts - New aggregation model
3. Create PreSalePaymentPlan.ts - Payment tracking
4. Update Delivery.ts - Add pre-sale fields
5. Update shared/types.ts - Export new types
```

### Phase 2: Backend Services & APIs (2-3 days)
```bash
1. Create PreSaleItemService.ts
2. Create PreSalePaymentService.ts
3. Create routes/presaleItems.ts
4. Create routes/presalePayments.ts
5. Update routes/purchases.ts
6. Update routes/deliveries.ts
7. Register routes in index.ts
```

### Phase 3: Frontend Dashboard (2-3 days)
```bash
1. Create pages/PreSale.tsx
2. Create components/PreSale/PreSaleDashboard.tsx
3. Create components/PreSale/PreSaleItemsTable.tsx
4. Create components/PreSale/PreSalePurchasesTable.tsx
5. Add route in App.tsx
6. Add navigation menu item
```

### Phase 4: Pre-Sale Item Details & Actions (2-3 days)
```bash
1. Create components/PreSale/PreSaleItemDetails.tsx
2. Create components/PreSale/QuantityVisualization.tsx
3. Create components/PreSale/StatusTimeline.tsx
4. Create components/PreSale/PricingCard.tsx
5. Wire up edit/archive/status actions
```

### Phase 5: Payment Management (2-3 days)
```bash
1. Create components/PreSale/PaymentPlanForm.tsx
2. Create components/PreSale/PaymentTracking.tsx
3. Create components/PreSale/PaymentHistoryTable.tsx
4. Create services/presalePaymentService.ts
5. Integrate with delivery details view
```

### Phase 6: Form Updates (1-2 days)
```bash
1. Update PurchaseForm.tsx - Add isPresale checkbox
2. Update DeliveryForm.tsx - Add PreSaleItemSelector
3. Create PreSaleItemSelector component
4. Add validation for quantities
```

### Phase 7: Testing & Polish (2-3 days)
```bash
1. Test full workflow (purchase → delivery → payment)
2. Test quantity constraints
3. Test payment calculations
4. Test edge cases (overpayment, early completion)
5. UI/UX refinements
```

**Total Estimated Time: 2-3 weeks** (depending on team size)

---

## 📁 Files You Need to Create/Modify

### Backend (7 new files, 2 modified)
- ✅ `backend/src/models/PreSaleItem.ts` (NEW)
- ✅ `backend/src/models/PreSalePaymentPlan.ts` (NEW)
- ✅ `backend/src/services/PreSaleItemService.ts` (NEW)
- ✅ `backend/src/services/PreSalePaymentService.ts` (NEW)
- ✅ `backend/src/routes/presaleItems.ts` (NEW)
- ✅ `backend/src/routes/presalePayments.ts` (NEW)
- ✅ `backend/src/utils/presaleCalculations.ts` (NEW)
- 🔄 `backend/src/models/Purchase.ts` (MODIFY)
- 🔄 `backend/src/models/Delivery.ts` (MODIFY)
- 🔄 `backend/src/routes/purchases.ts` (MODIFY)
- 🔄 `backend/src/routes/deliveries.ts` (MODIFY)

### Frontend (12 new files, 2 modified)
- ✅ `frontend/src/pages/PreSale.tsx` (NEW)
- ✅ `frontend/src/pages/PreSaleItems.tsx` (NEW)
- ✅ `frontend/src/pages/PreSalePurchases.tsx` (NEW)
- ✅ `frontend/src/components/PreSale/PreSaleDashboard.tsx` (NEW)
- ✅ `frontend/src/components/PreSale/PreSaleItemsTable.tsx` (NEW)
- ✅ `frontend/src/components/PreSale/PreSalePurchasesTable.tsx` (NEW)
- ✅ `frontend/src/components/PreSale/PreSaleItemDetails.tsx` (NEW)
- ✅ `frontend/src/components/PreSale/PaymentPlanForm.tsx` (NEW)
- ✅ `frontend/src/components/PreSale/PaymentTracking.tsx` (NEW)
- ✅ `frontend/src/components/PreSale/PaymentHistoryTable.tsx` (NEW)
- ✅ `frontend/src/components/PreSale/PreSaleItemSelector.tsx` (NEW)
- ✅ `frontend/src/services/presaleService.ts` (NEW)
- ✅ `frontend/src/services/presalePaymentService.ts` (NEW)
- 🔄 `frontend/src/components/PurchaseForm.tsx` (MODIFY)
- 🔄 `frontend/src/components/DeliveryForm.tsx` (MODIFY)

### Documentation (3 reference files)
- 📄 `PRESALE_IMPLEMENTATION_PLAN.md` (reference)
- 📄 `PRESALE_ARCHITECTURE.md` (reference)
- 📄 `PRESALE_CHECKLIST.md` (reference)
- 📄 `PRESALE_CODE_EXAMPLES.md` (reference)

---

## 🔄 Key Workflows

### Workflow 1: Create Pre-Sale Purchase
```
User → Purchase Form (isPresale checked)
     → Set scheduled date (optional)
     → Set markup % (default 15%)
     → Save
     → [System] Creates Purchase with isPresale: true
     → User marks as Received
     → [System] Auto-creates PreSaleItem with aggregated quantities
```

### Workflow 2: Create Pre-Sale Delivery
```
User → Go to Pre-Sale Dashboard
     → Click "Assign to Delivery"
     → Select quantity (≤ available)
     → Select payment type
     → If installments:
        - Set # of payments
        - Set first payment date
        - Set limit date
        - System calculates fixed amount
     → Create Delivery
     → [System] Creates delivery + payment plan
     → Updates PreSaleItem assignments
```

### Workflow 3: Record Payment
```
User → Go to Delivery Details
     → See Payment Plan section
     → Click "Record Payment"
     → Enter amount
     → Select payment method
     → Save
     → [System] Records payment
        - Updates remaining balance
        - Auto-calculates next due date
        - Checks if early/overdue
        - Updates status
        - Calculates profit
```

---

## 🎨 UI/UX Features

### Pre-Sale Dashboard
- Two-tab interface (Purchases & Items)
- Filter by status
- Sort by date, product, price
- Quick action buttons (View, Deliver, Archive)
- Bulk operations support

### Pre-Sale Item Details Modal
- Product card with images
- Quantity breakdown (visual bar)
- Status timeline (visual)
- Pricing with custom override
- Delivery assignments list
- Edit/Archive buttons

### Delivery Form Enhancement
- Pre-sale item selector (separate section)
- Quantity input with validation
- Payment plan optional checkbox
- Real-time price calculation
- Next due date preview

### Payment Tracking Card
- Progress bar (paid/remaining)
- Payment history table
- Record payment form
- Status badge (on-track/overdue/completed)
- Next due date highlight

---

## 💡 Smart Features

### Auto-Calculations
✅ Fixed installment amount = totalAmount / numberOfPayments
✅ Next due date calculated based on intervals
✅ Early payment: adjusts following payments
✅ Multi-payment detection: auto-completes if all paid
✅ Overdue detection: flag if past limit date
✅ Profit calculation: (salePrice - purchasePrice) × quantity

### Validation Rules
✅ Can't exceed available quantity per item
✅ Can't assign same unit to multiple deliveries
✅ Payment plan dates must be valid
✅ First payment date can't be in past
✅ Limit date must be after first payment
✅ Only positive payment amounts

### Status Management
✅ Purchase status (existing) + preSaleStatus (new)
✅ Unit status in each delivery
✅ Payment plan status (active/completed/overdue)
✅ Delivery items can be mixed (pre-sale + normal)

---

## 📊 Dashboard Stats

New widget shows:
- **Active Pre-Sale Items**: Count of non-archived items
- **Total Pre-Sale Revenue**: Sum of completed deliveries
- **Total Pre-Sale Profit**: Revenue - Cost
- **Profit by Payment Type**:
  - Full payment profit
  - Installment profit (higher due to markup)
- **Payment Status**:
  - % On Track
  - Count Overdue
  - Count Completed

---

## 🔐 Data Integrity

### Quantity Constraints
- Same product can only be in max quantity deliveries
- Example: 3 units of "Ferrari" → max 3 deliveries
- Units tracked individually to prevent duplicates

### Payment Integrity
- Each payment recorded immutably
- Payment history always available
- No payment deletion (audit trail)
- Status updates automatic based on payments

### Status Consistency
- Status transitions validated
- Delivery status tied to payment status
- Pre-sale item status reflects purchases
- Can't update if invalid state

---

## 🚨 Important Considerations

1. **Unit ID Generation**: Uses `preSaleItemId + timestamp + index` for uniqueness
2. **Pricing**: Weighted average if multiple purchases for same product
3. **Payment Intervals**: Currently linear (equal days between payments)
4. **Overdue Calculation**: Based on `limitDate`, not individual payment dates
5. **Profit Tracking**: Separate from regular sales, shown in dashboard

---

## 📞 Support Documents

All information needed is in these files:
- **Questions?** → Check PRESALE_ARCHITECTURE.md (detailed explanations)
- **How to code?** → Check PRESALE_CODE_EXAMPLES.md (working examples)
- **What to do?** → Check PRESALE_CHECKLIST.md (step-by-step checklist)
- **Overall plan?** → Check PRESALE_IMPLEMENTATION_PLAN.md (complete spec)

---

## ✅ Checklist to Get Started

- [ ] Review all 4 documentation files
- [ ] Understand the data flow (see diagram above)
- [ ] Identify your development team/timeline
- [ ] Create a branch: `git checkout -b feature/presale-system`
- [ ] Start Phase 1: Backend Models
- [ ] Begin with `Purchase.ts` modifications
- [ ] Test models before moving to services
- [ ] Deploy incrementally (models → services → APIs → UI)

---

## 🎉 Next Action

**I'm ready to help you implement this!**

Tell me:
1. Do you want to start with Phase 1 (models)?
2. Should I create template files for all the models?
3. Any clarifications on the design before we code?
4. Do you want me to implement specific phases first?

Let me know and I'll start building the actual code! 🚀

