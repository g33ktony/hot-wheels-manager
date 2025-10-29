# Pre-Sale System - Quick Reference & Visual Guide

## 📚 Documentation Map

```
START HERE → PRESALE_SUMMARY.md (this file's overview)
    │
    ├─→ Need detailed spec? → PRESALE_IMPLEMENTATION_PLAN.md
    │   └─ 8 sections covering: models, APIs, forms, logic, phases
    │
    ├─→ Need architecture view? → PRESALE_ARCHITECTURE.md
    │   └─ Database diagrams, data flows, examples
    │
    ├─→ Need implementation steps? → PRESALE_CHECKLIST.md
    │   └─ Step-by-step checklist, file structure, dependencies
    │
    └─→ Need code examples? → PRESALE_CODE_EXAMPLES.md
        └─ Working TypeScript code for models, services, APIs, components
```

---

## 🔄 Core Concepts at a Glance

### 1. Pre-Sale Purchase
```
Regular Purchase + isPresale: true + Optional scheduled date
                                                          │
                                                          ↓
                            Mark as Received (when items arrive)
                                                          │
                                                          ↓
                    [Auto] Create PreSaleItem (aggregated by product)
```

### 2. PreSaleItem (The Hub)
```
Aggregates all products from pre-sale purchases
    │
    ├─ Tracks quantities: total | assigned | available
    │
    ├─ Tracks status: coming-soon → purchased → shipped → received → archived
    │
    ├─ Tracks pricing: purchasePrice + markup % = salePrice
    │
    ├─ Tracks units: 3 units can only go to max 3 deliveries
    │
    └─ Tracks profit: (salePrice - purchasePrice) × quantity
```

### 3. Delivery with Pre-Sale Item
```
Regular Delivery + Pre-Sale Items + Payment Plan (optional)
                                                          │
                                                          ├─ Full Payment (one-time)
                                                          │
                                                          └─ Installments:
                                                             - # of payments
                                                             - Payment dates
                                                             - Fixed amount
                                                             - Payment tracking
```

### 4. Payment Plan
```
totalAmount: $100
numberOfPayments: 3
firstPaymentDate: Nov 5
limitDate: Dec 5

Calculated:
fixedPaymentAmount = $100 / 3 = $33.33 per month
nextDueDate = Nov 5, Dec 5, Jan 5

Smart Logic:
- Customer pays $40 → $33 applied to next payment
- Customer pays $100 early → status = COMPLETED
- Today > Dec 5 && paid < $100 → status = OVERDUE
```

---

## 📊 Database Schema Quick View

### Models Overview
```
┌────────────────┐
│   Purchase     │ ← Updated with isPresale + status fields
└────────────────┘
         │
         ├─ One-to-Many → PurchaseItems
         │
         └─ One-to-Many → PreSaleItems (if isPresale=true)
                            │
                            ├─ One-to-Many → DeliveryAssignments
                            │                    │
                            │                    └─ Units tracking
                            │
                            └─ One-to-Many → PreSalePaymentPlan
                                                │
                                                └─ Many → Payments


┌────────────────┐
│   Delivery     │ ← Updated with preSaleItems + paymentPlans
└────────────────┘
         │
         ├─ One-to-Many → DeliveryItems (can be normal or pre-sale)
         │
         └─ One-to-Many → PreSalePaymentPlan (if has pre-sale items)
                            │
                            └─ Many → Payments
```

---

## 🎯 User Workflows at a Glance

### Workflow A: Create & Manage Pre-Sale
```
1. Create Purchase Form
   ├─ Mark "Is Pre-Sale" ✓
   ├─ Set scheduled date (Nov 15)
   ├─ Set markup % (15% default)
   └─ Save

2. Mark as Received
   └─ [Auto] PreSaleItem created
       ├─ totalQty = 3 Ferrari
       ├─ availableQty = 3
       ├─ salePrice = $6.89 (5.99 × 1.15)
       └─ status = coming-soon

3. Pre-Sale Dashboard
   ├─ View tab: Items to Receive
   ├─ See Ferrari (3 | 0 assigned | 3 available)
   └─ Click "View Details" → modal shows all info
```

### Workflow B: Create Pre-Sale Delivery
```
1. Create Delivery Form
   ├─ Select customer
   ├─ Add Pre-Sale Item: Ferrari x2
   ├─ Quantity: 2 (≤ 3 available)
   ├─ Add Payment Plan checkbox ✓
   └─ Continue

2. Payment Plan Form (Appears)
   ├─ # Payments: 3
   ├─ First Payment: Nov 20
   ├─ Limit Date: Dec 20
   ├─ Shows: Fixed $4.59/month
   └─ Continue

3. Save Delivery
   [System does:]
   ├─ Create Delivery
   ├─ Assign Ferrari to delivery (track units)
   ├─ Create PaymentPlan
   ├─ Update PreSaleItem:
   │  └─ assignedQty = 2, availableQty = 1
   └─ Confirm

4. Payment Tracking (in Delivery View)
   ├─ Show progress bar (0/100%)
   ├─ Next due: Nov 20
   ├─ Record Payment button
   └─ Payment history
```

### Workflow C: Record Payment
```
1. Customer pays first $4.59
   ├─ User clicks "Record Payment"
   ├─ Amount: $4.59
   ├─ Method: Transfer
   ├─ Save
   └─ [System]:
       ├─ paidAmount = 4.59
       ├─ remainingBalance = 9.18
       ├─ nextDueDate = Dec 20
       ├─ status = "active"
       └─ Progress = 33%

2. Customer pays $10 early (before Dec 20)
   ├─ Amount: $10
   ├─ [System]:
       ├─ covers payment 1 ($4.59) + partial payment 2 ($5.41)
       ├─ remaining for payment 2 = $4.59 - $5.41 = paid!
       ├─ remaining for payment 3 = $4.59
       ├─ nextDueDate = auto-adjusted
       └─ Progress = 91%

3. Customer pays final $4.59
   ├─ Total paid = 4.59 + 10 + 4.59 = 19.77 ≈ 19.77 ✓
   ├─ [System]:
       ├─ status = "COMPLETED"
       ├─ remainingBalance = 0
       ├─ Progress = 100%
       └─ Marks delivery ready (customer has paid all)
```

---

## 🔑 Key Differences: Normal vs Pre-Sale

| Aspect | Normal Purchase | Pre-Sale Purchase |
|--------|-----------------|-------------------|
| **Creation** | One-time order | Marked with `isPresale: true` |
| **Status** | pending → paid → shipped → received | + `preSaleStatus` lifecycle |
| **Aggregation** | None | Grouped by product (PreSaleItem) |
| **Quantities** | Per purchase | Pooled across purchases |
| **Delivery** | Single typically | Multiple deliveries possible |
| **Payment** | Usually once | Can be installments |
| **Pricing** | As-is | With markup % applied |
| **Profit Tracking** | Included in general | Separate tracking |
| **Dashboard** | General stats | Dedicated pre-sale widget |

---

## 💰 Pricing Examples

### Example 1: Single Item
```
Purchase 2x Ferrari @ $5.99 each
    ├─ baseSalePrice = $5.99
    ├─ defaultMarkup = 15%
    ├─ suggestedSalePrice = 5.99 × 1.15 = $6.89
    │
    └─ Delivery (2 units):
        ├─ 2 × $6.89 = $13.78 (revenue)
        ├─ 2 × $5.99 = $11.98 (cost)
        └─ Profit = $1.80 per delivery (12.7% margin)
```

### Example 2: With Custom Price
```
Same as above but customer overrides:
    ├─ customSalePrice = $7.49
    ├─ finalSalePrice = $7.49 (uses custom)
    │
    └─ Delivery (2 units):
        ├─ 2 × $7.49 = $14.98 (revenue)
        ├─ 2 × $5.99 = $11.98 (cost)
        └─ Profit = $3.00 (20% margin)
```

### Example 3: Installment Markup
```
Same product, installment payment option:
    ├─ fullPaymentPrice = $6.89
    ├─ installmentMarkup = +15% extra
    ├─ installmentPrice = 6.89 × 1.15 = $7.92
    │
    └─ Profit difference:
        ├─ Full payment: $0.90 per unit
        ├─ Installment: $1.93 per unit
        └─ Extra profit: +$1.03/unit (114% more!)
```

---

## 📈 Dashboard Stat Calculations

```
Total Pre-Sale Revenue
= Sum(finalSalePrice × deliveredQuantity) for all completed deliveries

Total Pre-Sale Profit
= Sum((finalSalePrice - purchasePrice) × deliveredQuantity)
  for all completed deliveries

Profit by Payment Type
├─ Full Payment Profit
│  = Sum((price - cost) × qty) where paymentType = "full"
│
└─ Installment Profit
   = Sum((price - cost) × qty) where paymentType = "installment"
     ÷ Includes installment markup!

Payment Status Overview
├─ On Track: (nextDueDate > today) && (paymentPlans where status = "active")
├─ Overdue: (nextDueDate ≤ today) && (paymentPlans where status = "overdue")
└─ Completed: (paymentPlans where status = "completed")
```

---

## 🚀 Quick Start Commands

### Step 1: Get Ready
```bash
# Read documentation
cat PRESALE_SUMMARY.md              # Overview (5 min)
cat PRESALE_IMPLEMENTATION_PLAN.md  # Spec (15 min)
cat PRESALE_ARCHITECTURE.md         # Diagrams (10 min)
cat PRESALE_CHECKLIST.md            # Checklist (10 min)
cat PRESALE_CODE_EXAMPLES.md        # Examples (15 min)

# Create branch
git checkout -b feature/presale-system
git push -u origin feature/presale-system
```

### Step 2: Create Models
```bash
# Create backend/src/models/PreSaleItem.ts
# Create backend/src/models/PreSalePaymentPlan.ts
# Update backend/src/models/Purchase.ts
# Update backend/src/models/Delivery.ts
# Update shared/types.ts
```

### Step 3: Create Services
```bash
# Create backend/src/services/PreSaleItemService.ts
# Create backend/src/services/PreSalePaymentService.ts
```

### Step 4: Create APIs
```bash
# Create backend/src/routes/presaleItems.ts
# Create backend/src/routes/presalePayments.ts
# Update backend/src/index.ts to register routes
```

### Step 5: Test Backend
```bash
npm test                    # Run tests
curl http://localhost:3000/api/presale-items  # Test endpoint
```

### Step 6: Create Frontend
```bash
# Create frontend/src/pages/PreSale.tsx
# Create frontend/src/components/PreSale/*.tsx
# Update frontend/src/App.tsx for routes
```

---

## ❓ Common Questions

### Q: What if I want to change the markup percentage?
**A:** Two options:
1. When creating pre-sale purchase: set in form
2. After creation: go to PreSaleItemDetails → Pricing section → edit

### Q: Can I delete a payment?
**A:** No. Payments are immutable for audit trail. You can:
- Record a refund (negative payment)
- Cancel the payment plan
- Re-create the plan

### Q: What if customer pays all installments early?
**A:** System auto-detects and:
- Sets status = "COMPLETED"
- Shows remaining payments as paid
- Marks delivery ready for pickup

### Q: Can one product go to multiple deliveries?
**A:** Yes! But only up to available quantity:
- 3 Ferrari units exist
- Can go to: Delivery A (2 units) + Delivery B (1 unit)
- Cannot go to: Delivery C (exceeds 3 total)

### Q: How do I track profit by payment type?
**A:** Dashboard widget shows:
- Full payment profit (single transaction)
- Installment profit (higher due to markup %)

### Q: Can I mix pre-sale + normal items in one delivery?
**A:** Yes! Completely supported:
- Add normal inventory items normally
- Add pre-sale items with optional payment plan
- Payment plan only applies to pre-sale items

---

## 📞 File References

| Need | File |
|------|------|
| Complete tech spec | PRESALE_IMPLEMENTATION_PLAN.md |
| Architecture diagrams | PRESALE_ARCHITECTURE.md |
| Step-by-step checklist | PRESALE_CHECKLIST.md |
| Working code examples | PRESALE_CODE_EXAMPLES.md |
| This overview | PRESALE_SUMMARY.md |

---

## ✨ You're Ready!

This plan covers:
✅ Database design (complete)
✅ API endpoints (complete)
✅ Business logic (complete)
✅ Frontend components (complete)
✅ Payment calculations (complete)
✅ Validation rules (complete)
✅ Dashboard stats (complete)
✅ Code examples (complete)

**Next: Pick Phase 1 from the checklist and start coding! 🎯**

Questions? The documentation has all the answers! 📚

