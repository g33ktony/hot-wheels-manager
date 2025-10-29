# Pre-Sale System - Architecture & Entity Relationships

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PURCHASE PROCESS                             │
└─────────────────────────────────────────────────────────────────────┘

[Purchase]
├── _id
├── items: PurchaseItem[]
├── isPresale: boolean ◄── NEW FLAG
├── preSaleScheduledDate: Date (if coming-soon)
├── preSaleStatus: enum (coming-soon|purchased|shipped|received|archived)
├── supplierId → [Supplier]
├── status: enum (pending|paid|shipped|received)
├── isReceived: boolean
└── receivedDate: Date

       ↓
       │ (if isPresale: true && isReceived: true)
       │ [Aggregation Logic Triggered]
       ↓

[PreSaleItem] ◄── NEW MODEL (Aggregates products from pre-sale purchases)
├── _id
├── carId → [HotWheelsCar]
├── linkedPurchaseIds: ObjectId[] (all purchases containing this product)
├── totalQuantity: number (sum across purchases)
├── assignedQuantity: number (sum of delivery assignments)
├── availableQuantity: number (calculated)
├── preSaleStatus: enum
├── purchasePrice: number (weighted avg)
├── defaultMarkupPercentage: number (default 15%)
├── suggestedSalePrice: number (calculated)
├── customSalePrice: number (optional override)
├── finalSalePrice: number (custom or suggested)
├── deliveryAssignments: {
│   ├── deliveryId
│   ├── quantity
│   └── units: [{unitId, status}]
│ }[]
└── metadata: {brand, pieceType, condition, photos, etc.}


┌─────────────────────────────────────────────────────────────────────┐
│                         DELIVERY PROCESS                             │
└─────────────────────────────────────────────────────────────────────┘

[Delivery]
├── _id
├── customerId → [Customer]
├── items: DeliveryItem[] (can be mix of normal + presale)
├── hasPresaleItems: boolean ◄── NEW
├── preSalePaymentPlans: ObjectId[] ◄── NEW (links to payment plans)
├── scheduledDate: Date
├── location: string
├── totalAmount: number
├── status: enum
└── paidAmount: number

       ├──→ [DeliveryItem] ◄── UPDATED
       │    ├── _id
       │    ├── carId
       │    ├── quantity
       │    ├── unitPrice
       │    ├── isPresaleItem: boolean ◄── NEW
       │    ├── preSaleItemId: ObjectId ◄── NEW
       │    ├── preSaleUnitIds: string[] ◄── NEW (tracks which units)
       │    └── paymentPlanId: ObjectId ◄── NEW (if has installments)
       │
       └──→ [PreSalePaymentPlan] ◄── NEW MODEL
            ├── _id
            ├── deliveryId
            ├── customerId
            ├── preSaleItemId
            ├── totalAmount
            ├── numberOfPayments (installments)
            ├── firstPaymentDate
            ├── limitDate (deadline for 100% paid)
            ├── fixedPaymentAmount (calculated: total/payments)
            ├── paidAmount
            ├── remainingBalance
            ├── nextDueDate
            ├── status: enum (active|completed|overdue|cancelled)
            └── payments: [PreSalePayment]
                 ├── amount
                 ├── paymentDate
                 ├── paymentMethod
                 └── notes


┌─────────────────────────────────────────────────────────────────────┐
│                      QUANTITY TRACKING LOGIC                         │
└─────────────────────────────────────────────────────────────────────┘

Example: User orders 3x "Ferrari" hot wheels as pre-sale

Purchase 1: Ferrari x2 + Other items
Purchase 2: Ferrari x1 + Other items
    ↓
PreSaleItem created for Ferrari:
    totalQuantity = 3
    assignedQuantity = 0
    availableQuantity = 3
    
    units generated: ['ferrari-1', 'ferrari-2', 'ferrari-3']

Delivery 1 (to Customer A): Ferrari x2
    assignedQuantity = 2
    availableQuantity = 1
    preSaleUnitIds = ['ferrari-1', 'ferrari-2']

Delivery 2 (to Customer B): Ferrari x1
    totalAssigned = 3
    availableQuantity = 0
    preSaleUnitIds = ['ferrari-3']

Delivery 3 (to Customer C): Ferrari x1 ◄── ERROR! Only 3 units exist


┌─────────────────────────────────────────────────────────────────────┐
│                    PAYMENT PLAN AUTO-CALCULATION                    │
└─────────────────────────────────────────────────────────────────────┘

User wants to deliver Ferrari (sale price: $30) with 3 installments
    ↓
PaymentPlan created:
    totalAmount = $30
    numberOfPayments = 3
    firstPaymentDate = Nov 5, 2025
    limitDate = Dec 5, 2025
    fixedPaymentAmount = $30 / 3 = $10 per payment
    nextDueDate = Nov 5, 2025

SCENARIO 1: Customer pays exact amounts
    Payment 1: Nov 5 - $10 → nextDueDate = Dec 5, remainingBalance = $20
    Payment 2: Dec 5 - $10 → nextDueDate = Jan 5, remainingBalance = $10
    Payment 3: Jan 5 - $10 → status = COMPLETED, remainingBalance = $0

SCENARIO 2: Customer pays more than fixed amount
    Payment 1: Nov 10 - $15 → covers 1.5 payments
    nextDueDate = calculated (not Dec 5)
    nextPaymentAmount = $15 (remaining from 2 payments)
    remainingBalance = $15

SCENARIO 3: Customer pays early in fewer installments
    Payment 1: Nov 5 - $20 → covers 2 payments
    Payment 2: Nov 10 - $10 → status = COMPLETED
    Plan auto-adjusts, displays "Paid early"

SCENARIO 4: Overdue
    Today = Dec 10, limitDate = Dec 5, paidAmount < $30
    → status = OVERDUE (shown in dashboard with warning)


┌─────────────────────────────────────────────────────────────────────┐
│                       STATUS TRANSITIONS                             │
└─────────────────────────────────────────────────────────────────────┘

Purchase Status (existing):
pending → paid → shipped → received → [archived manually]

PreSaleItem Status (new):
coming-soon ──→ purchased ──→ shipped ──→ received ──→ archived
    ↑                                            ↑
    │                                            └─ Mark as received
    │                                               (in store, ready)
    └─ Set with scheduled date
       (expected release)

Delivery Item Status (for pre-sale items):
assigned → pending-delivery → delivered

Payment Plan Status:
active → completed (or overdue → completed)


┌─────────────────────────────────────────────────────────────────────┐
│                    PROFIT TRACKING & DASHBOARD                      │
└─────────────────────────────────────────────────────────────────────┘

For each completed PreSaleItem delivery:

Purchase Cost = purchasePrice × quantity
Sale Revenue = finalSalePrice × quantity
Profit = Sale Revenue - Purchase Cost
Profit Margin = (Profit / Sale Revenue) × 100%

Dashboard shows:
- Total Pre-Sale Items (active)
- Total Pre-Sale Revenue (from completed deliveries)
- Total Pre-Sale Profit
- Profit Breakdown:
  ├── From full payments
  └── From installments (≈ higher profit due to markup)
- Payment Status Overview:
  ├── On Track (% customers)
  ├── Overdue (count)
  └── Completed (count)

```

---

## API Request/Response Examples

### Example 1: Create Pre-Sale Purchase

**Request:** POST `/api/purchases`
```json
{
  "items": [
    {
      "carId": "HW001",
      "quantity": 2,
      "unitPrice": 5.99,
      "condition": "mint"
    },
    {
      "carId": "HW002",
      "quantity": 1,
      "unitPrice": 7.99,
      "condition": "mint"
    }
  ],
  "supplierId": "SUP123",
  "totalCost": 19.97,
  "isPresale": true,
  "preSaleScheduledDate": "2025-11-15T00:00:00Z",
  "purchaseDate": "2025-10-28T00:00:00Z"
}
```

**Response:** 201 Created
```json
{
  "_id": "PUR456",
  "items": [...],
  "isPresale": true,
  "preSaleStatus": "coming-soon",
  "status": "pending",
  "preSaleScheduledDate": "2025-11-15T..."
}
```

---

### Example 2: Create Pre-Sale Items (Auto-triggered after purchase received)

**Request:** POST `/api/presale-items`
```json
{
  "purchaseId": "PUR456",
  "defaultMarkupPercentage": 15
}
```

**Response:** 201 Created
```json
{
  "_id": "PSI001",
  "carId": "HW001",
  "linkedPurchaseIds": ["PUR456"],
  "totalQuantity": 2,
  "assignedQuantity": 0,
  "availableQuantity": 2,
  "preSaleStatus": "coming-soon",
  "purchasePrice": 5.99,
  "defaultMarkupPercentage": 15,
  "suggestedSalePrice": 6.89,
  "finalSalePrice": 6.89,
  "deliveryAssignments": [],
  "createdAt": "2025-10-28T..."
}
```

---

### Example 3: Create Delivery with Pre-Sale Item & Payment Plan

**Request:** POST `/api/deliveries`
```json
{
  "customerId": "CUST123",
  "items": [
    {
      "isPresaleItem": true,
      "preSaleItemId": "PSI001",
      "quantity": 2,
      "unitPrice": 6.89,
      "paymentPlanId": null  // Will be created below
    }
  ],
  "scheduledDate": "2025-11-20T00:00:00Z",
  "location": "Customer Address",
  "totalAmount": 13.78,
  "paymentPlans": [
    {
      "preSaleItemId": "PSI001",
      "totalAmount": 13.78,
      "numberOfPayments": 3,
      "firstPaymentDate": "2025-11-20T00:00:00Z",
      "limitDate": "2025-12-20T00:00:00Z"
    }
  ]
}
```

**Response:** 201 Created
```json
{
  "_id": "DEL789",
  "customerId": "CUST123",
  "items": [
    {
      "isPresaleItem": true,
      "preSaleItemId": "PSI001",
      "quantity": 2,
      "unitPrice": 6.89,
      "preSaleUnitIds": ["hW001-unit-1", "HW001-unit-2"],
      "paymentPlanId": "PPP001"
    }
  ],
  "hasPresaleItems": true,
  "preSalePaymentPlans": ["PPP001"],
  "totalAmount": 13.78,
  "scheduledDate": "2025-11-20T..."
}
```

---

### Example 4: Record Payment

**Request:** POST `/api/presale-payments/plan/PPP001/payment`
```json
{
  "amount": 4.59,
  "paymentMethod": "transfer",
  "notes": "First installment via bank transfer"
}
```

**Response:** 200 OK
```json
{
  "_id": "PPP001",
  "totalAmount": 13.78,
  "numberOfPayments": 3,
  "fixedPaymentAmount": 4.59,
  "paidAmount": 4.59,
  "remainingBalance": 9.19,
  "status": "active",
  "nextDueDate": "2025-12-20T00:00:00Z",
  "payments": [
    {
      "_id": "PAY001",
      "amount": 4.59,
      "paymentDate": "2025-11-20T10:30:00Z",
      "paymentMethod": "transfer",
      "notes": "First installment via bank transfer"
    }
  ]
}
```

---

## Frontend Routes

```
/presale                          Main pre-sale dashboard
├── /presale/purchases            Tab 1: Pre-sale purchases list
├── /presale/items                Tab 2: Pre-sale items to receive
├── /presale/items/:id            Pre-sale item details modal/page
├── /presale/items/:id/deliveries Deliveries for specific item

/deliveries                        Existing deliveries page
├── /deliveries/:id               Delivery details
│   └── Include pre-sale sections & payment tracking

/purchases                         Existing purchases page
├── /purchases/new                Updated form with isPresale checkbox
├── /purchases/:id                Updated detail view

/dashboard                         Existing dashboard
└── Add pre-sale stats widget
```

---

## Component Hierarchy

```
/presale
├── PreSaleDashboard (main page, 2 tabs)
│   ├── Tab1: PreSalePurchasesTab
│   │   └── PreSalePurchasesTable
│   │       ├── PurchaseRow
│   │       │   └── QuickActionButton
│   │       │       └── ContextMenu (View, Received, Deliver, Archive)
│   │       └── FilterBar
│   │
│   └── Tab2: PreSaleItemsTab
│       └── PreSaleItemsTable
│           ├── ItemRow
│           │   ├── ProductImage
│           │   ├── QuantityBadges (Total|Assigned|Available)
│           │   └── QuickActionButton
│           │       └── ContextMenu (Details, Assign, Archive)
│           └── FilterBar
│
├── PreSaleItemDetails (modal/drawer)
│   ├── ProductCard
│   ├── QuantityVisualization (bar chart)
│   ├── StatusTimeline
│   ├── PricingSection
│   ├── DeliveriesList
│   └── ActionButtons
│
├── PaymentPlanForm
│   ├── NumberOfPaymentsSelector
│   ├── FirstPaymentDatePicker
│   ├── LimitDatePicker
│   └── SummaryDisplay
│
└── PaymentTracking
    ├── ProgressBar
    ├── NextDueDate
    ├── PaymentHistoryTable
    └── RecordPaymentForm

/deliveries/:id (modified)
├── DeliveryDetails
│   ├── ... existing sections ...
│   ├── [if hasPresaleItems]
│   │   ├── PreSaleItemsSection
│   │   │   └── PreSaleDeliveryItem[]
│   │   │       └── PaymentTracking
│   │   └── MixedItemsWarning
│   └── ... existing footer ...
```

