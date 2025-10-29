# Pre-Sale System - Visual Summary & One-Page Overview

## 🎯 One-Page System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    PRE-SALE MANAGEMENT SYSTEM                           │
│                     For Hot Wheels Manager App                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─ WORKFLOW FLOW ────────────────────────────────────────────────────────┐
│                                                                          │
│ 1. CREATE PURCHASE                                                       │
│    ├─ Check "Is Pre-Sale" ✓                                             │
│    ├─ Set scheduled date (optional)                                     │
│    ├─ Set markup % (default 15%)                                        │
│    └─ Save                                                               │
│         │                                                                │
│         ↓                                                                │
│ 2. MARK AS RECEIVED                                                      │
│    └─ [System Auto-Creates PreSaleItem]                                 │
│         │ Aggregates by product (carId)                                 │
│         │ Pools quantities                                              │
│         │ Calculates pricing with markup                                │
│         │                                                                │
│         ↓                                                                │
│ 3. VIEW PRE-SALE DASHBOARD                                              │
│    ├─ Tab 1: Pre-Sale Purchases (filter by status)                      │
│    └─ Tab 2: Items to Receive (track quantities)                        │
│         │ Total Qty | Assigned | Available                              │
│         │                                                                │
│         ↓                                                                │
│ 4. CREATE DELIVERY                                                       │
│    ├─ Select customer                                                    │
│    ├─ Add pre-sale items (select quantity)                              │
│    ├─ Select payment type:                                              │
│    │  ├─ Full Payment (one-time)                                        │
│    │  └─ Installments (3, 6, 12 months) ← Optional payment plan         │
│    └─ Save Delivery                                                      │
│         │ [System creates PaymentPlan if installments selected]          │
│         │                                                                │
│         ↓                                                                │
│ 5. RECORD PAYMENTS                                                       │
│    ├─ Customer pays amount                                              │
│    ├─ System auto-calculates:                                           │
│    │  ├─ Remaining balance                                              │
│    │  ├─ Next due date                                                  │
│    │  └─ Status (active/completed/overdue)                              │
│    └─ If all paid → Delivery ready                                      │
│         │                                                                │
│         ↓                                                                │
│ 6. DASHBOARD STATS                                                       │
│    ├─ Total pre-sale revenue                                            │
│    ├─ Total pre-sale profit                                             │
│    ├─ Payment status (on-track/overdue/completed)                       │
│    └─ Profit by payment type                                            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘

┌─ KEY DIFFERENTIATORS ─────────────────────────────────────────────────┐
│                                                                         │
│ Pre-Sale Purchase          Regular Purchase                            │
│ ───────────────────────────────────────────────────────────────────    │
│ • Marked with isPresale    • Normal order                              │
│ • Aggregated by product    • Per-purchase basis                        │
│ • Multiple deliveries      • Typically single delivery                 │
│ • Payment plans possible   • Single payment usually                    │
│ • Markup % applied         • As-is pricing                             │
│ • Tracked separately       • General stats only                        │
│ • Unit-level tracking      • Batch tracking                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─ QUANTITY EXAMPLE ────────────────────────────────────────────────────┐
│                                                                         │
│ Purchase 1: Ferrari x2 + Other items                                  │
│ Purchase 2: Ferrari x1 + Other items                                  │
│                                                                         │
│ → PreSaleItem Created:                                                 │
│   ├─ totalQuantity = 3                                                 │
│   ├─ availableQuantity = 3                                             │
│   └─ units = ['ferrari-1', 'ferrari-2', 'ferrari-3']                  │
│                                                                         │
│ Delivery A (to Customer A): Ferrari x2                                │
│ → assignedQuantity = 2, availableQuantity = 1                         │
│                                                                         │
│ Delivery B (to Customer B): Ferrari x1                                │
│ → assignedQuantity = 3, availableQuantity = 0                         │
│                                                                         │
│ Delivery C (to Customer C): Ferrari x1 ❌ ERROR!                      │
│ → Only 3 total exist - cannot over-allocate                           │
│                                                                         │
└──────────────────────────────────────────────────────────────────────────┘

┌─ PAYMENT PLAN EXAMPLE ────────────────────────────────────────────────┐
│                                                                         │
│ Delivery: 2x Ferrari @ $6.89 = $13.78                                 │
│ Payment Plan: 3 installments                                           │
│ First Payment: Nov 5, 2025                                             │
│ Limit Date: Dec 5, 2025                                               │
│                                                                         │
│ Calculated: $13.78 ÷ 3 = $4.59 per month                              │
│                                                                         │
│ SCENARIO 1: Exact Payments                                            │
│ ├─ Nov 5: Pay $4.59 → Balance: $9.19, Next: Dec 5                   │
│ ├─ Dec 5: Pay $4.59 → Balance: $4.60, Next: Jan 5                   │
│ └─ Jan 5: Pay $4.59 → Balance: $0.01 → Status: COMPLETED ✓           │
│                                                                         │
│ SCENARIO 2: Early Payment (pays $10 on Nov 15)                        │
│ ├─ Nov 15: Pay $10 → Covers 2.17 payments                            │
│ ├─ Recalculates next due date                                         │
│ ├─ Balance: $3.78                                                      │
│ └─ Awaiting final $3.78                                                │
│                                                                         │
│ SCENARIO 3: Overdue                                                    │
│ ├─ Today: Dec 10 (after limit date)                                   │
│ ├─ Balance: $13.78 (unpaid)                                           │
│ └─ Status: OVERDUE ⚠️ (shows in dashboard)                            │
│                                                                         │
└──────────────────────────────────────────────────────────────────────────┘
```

## 📊 Data Model Relationship Diagram

```
                    ┌─────────────┐
                    │  Purchase   │
                    │(MODIFIED)   │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              v            v            v
         PurchaseItems  isPresale  preSaleStatus
                        (flag)     (new field)
              │            │            │
              └────────────┼────────────┘
                           │
                    Mark as Received
                           │
                           v
              ┌─────────────────────────┐
              │ PreSaleItem (NEW)       │
              │ ─────────────────────── │
              │ • carId (product)       │
              │ • totalQuantity         │
              │ • assignedQuantity      │
              │ • availableQuantity     │
              │ • purchasePrice         │
              │ • finalSalePrice        │
              │ • markup%               │
              │ • preSaleStatus         │
              │ • deliveryAssignments[] │
              │ • profit tracking       │
              └────────────┬────────────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
              v            v            v
        Delivery    PaymentPlan    Dashboard
        (modified)    (NEW)         Stats


Delivery (MODIFIED)
├─ DeliveryItem[] (can be normal or pre-sale)
│  ├─ isPresaleItem: boolean
│  ├─ preSaleItemId: ref
│  └─ preSaleUnitIds: []
└─ preSalePaymentPlans: ref[]
   └─ PreSalePaymentPlan (NEW)
      ├─ totalAmount
      ├─ numberOfPayments
      ├─ firstPaymentDate
      ├─ limitDate
      ├─ fixedPaymentAmount
      ├─ payments: PreSalePayment[]
      └─ status (active|completed|overdue)
```

## 🎨 Frontend Component Tree

```
App
├─ Routes
│  ├─ /presale → PreSaleDashboard
│  │            ├─ Tabs
│  │            │  ├─ PreSalePurchasesTable
│  │            │  │  ├─ Filters & Sort
│  │            │  │  └─ PurchaseRow[] (with quick actions)
│  │            │  │
│  │            │  └─ PreSaleItemsTable
│  │            │     ├─ Filters & Sort
│  │            │     └─ ItemRow[]
│  │            │        ├─ Product Image
│  │            │        ├─ QuantityBadges
│  │            │        └─ Quick Actions
│  │            │
│  │            └─ PreSaleItemDetails (Modal)
│  │               ├─ ProductCard
│  │               ├─ QuantityVisualization (bar chart)
│  │               ├─ StatusTimeline
│  │               ├─ PricingCard (with edit)
│  │               ├─ DeliveriesList
│  │               └─ ActionButtons
│  │
│  ├─ /purchases/new → PurchaseForm (MODIFIED)
│  │                   ├─ ... existing fields
│  │                   ├─ isPresale checkbox (NEW)
│  │                   ├─ scheduledDate picker (NEW)
│  │                   ├─ markupPercentage input (NEW)
│  │                   └─ ... rest of form
│  │
│  ├─ /deliveries/new → DeliveryForm (MODIFIED)
│  │                    ├─ Customer selector
│  │                    ├─ PreSaleItemSelector (NEW)
│  │                    │  ├─ Normal items section
│  │                    │  └─ Pre-sale items section
│  │                    ├─ For each pre-sale item:
│  │                    │  ├─ Quantity input
│  │                    │  ├─ Payment plan checkbox (NEW)
│  │                    │  └─ PaymentPlanForm (if checked)
│  │                    │     ├─ numberOfPayments selector
│  │                    │     ├─ firstPaymentDate picker
│  │                    │     ├─ limitDate picker
│  │                    │     └─ Summary display
│  │                    └─ Submit
│  │
│  ├─ /deliveries/:id → DeliveryDetails
│  │                    ├─ ... existing sections
│  │                    ├─ [if hasPresaleItems]
│  │                    │  ├─ PreSaleItems section
│  │                    │  │  └─ PreSaleDeliveryItem[] (NEW)
│  │                    │  │     └─ PaymentTracking (NEW)
│  │                    │  │        ├─ Progress bar
│  │                    │  │        ├─ PaymentHistoryTable (NEW)
│  │                    │  │        └─ RecordPaymentForm (NEW)
│  │                    │  └─ [if mixed items] Warning badge
│  │                    └─ ... rest of details
│  │
│  └─ /dashboard → Dashboard (MODIFIED)
│                  ├─ ... existing widgets
│                  ├─ PreSaleWidget (NEW)
│                  │  ├─ Active items count
│                  │  ├─ Total revenue
│                  │  ├─ Total profit
│                  │  ├─ Payment status breakdown
│                  │  └─ Link to Pre-Sale Dashboard
│                  └─ ... rest of dashboard
```

## 📋 Implementation Phases at a Glance

```
PHASE 1 (1-2 days)        PHASE 2 (2-3 days)       PHASE 3 (2-3 days)
─────────────────         ──────────────────       ──────────────────
Backend Models            Backend Services         Frontend Dashboard
├─ Purchase.ts            ├─ PreSaleItemService    ├─ /presale page
├─ PreSaleItem.ts         ├─ PreSalePaymentService ├─ 2 tabs
├─ PreSalePaymentPlan.ts  ├─ Routes                ├─ Tables
├─ Delivery.ts            ├─ Controllers           ├─ Filters/Sort
└─ types.ts               └─ Integration           └─ Quick actions


PHASE 4 (2-3 days)        PHASE 5 (2-3 days)       PHASE 6 (1-2 days)
──────────────────        ──────────────────       ──────────────────
Item Details              Payment Management       Form Updates
├─ Modal component        ├─ PaymentPlanForm       ├─ PurchaseForm
├─ Product card           ├─ PaymentTracking       ├─ DeliveryForm
├─ Quantity viz           ├─ Payment history       ├─ Selectors
├─ Status timeline        ├─ Record payment        ├─ Validation
├─ Pricing UI             └─ Services/Hooks        └─ Integration
└─ Deliveries list


PHASE 7 (2-3 days)
──────────────────
Testing & Launch
├─ Unit tests
├─ Integration tests
├─ E2E tests
├─ Performance check
├─ Security audit
├─ Deployment prep
└─ Launch!
```

## ✨ Feature Highlights

```
┌─ SMART CALCULATIONS ─────────────────────────────────────────┐
│ • Fixed payment = totalAmount / numberOfPayments             │
│ • Next due date = auto-calculated from interval               │
│ • Early payment = adjusts remaining payments                  │
│ • Overdue detection = automatic warning                       │
│ • Profit = (salePrice - costPrice) × quantity                │
│ • Suggested price = purchasePrice × (1 + markupPercent)      │
└──────────────────────────────────────────────────────────────┘

┌─ VALIDATION RULES ───────────────────────────────────────────┐
│ ✓ Cannot exceed available quantity per item                  │
│ ✓ Cannot assign same unit to multiple deliveries             │
│ ✓ Payment plan dates must be valid                           │
│ ✓ Limit date > first payment date                            │
│ ✓ Only positive payment amounts                              │
│ ✓ Mix pre-sale + normal items allowed                        │
└──────────────────────────────────────────────────────────────┘

┌─ AUTO-FEATURES ──────────────────────────────────────────────┐
│ → Auto-create PreSaleItem when purchase received             │
│ → Auto-aggregate quantities by product                       │
│ → Auto-calculate payment amounts & dates                     │
│ → Auto-detect early/partial/overdue payments                 │
│ → Auto-update delivery status                                │
│ → Auto-calculate profit & stats                              │
└──────────────────────────────────────────────────────────────┘
```

## 📖 Documentation Quick Links

```
Need Help?                          Find It In:
─────────────────────────────────────────────────────────────
What's the big picture?             PRESALE_SUMMARY.md ⭐
Quick concept lookup?               PRESALE_QUICK_REFERENCE.md
How does it work?                   PRESALE_ARCHITECTURE.md
What's my checklist?                PRESALE_CHECKLIST.md
Show me code!                       PRESALE_CODE_EXAMPLES.md
Step-by-step spec?                  PRESALE_IMPLEMENTATION_PLAN.md
How do I deploy?                    PRESALE_DEPLOYMENT.md
Where am I in docs?                 PRESALE_MASTER_INDEX.md
This visual summary                 PRESALE_VISUAL_SUMMARY.md
```

## 🚀 Ready to Start?

1. ✅ Read PRESALE_SUMMARY.md (10 min)
2. ✅ Review this visual guide (5 min)
3. ✅ Check PRESALE_QUICK_REFERENCE.md (5 min)
4. ✅ Pick Phase 1 from checklist
5. ✅ Start coding! 💪

You've got everything you need. Let's build! 🎉

