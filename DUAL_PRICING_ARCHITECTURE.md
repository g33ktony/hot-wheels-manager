# Dual Pricing System - Architecture Diagram

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER INTERFACE (React)                        │
│                   PreSalePurchaseForm.tsx                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────┐      ┌──────────────────────────┐   │
│  │   Unit Price Input    │      │  Supplier Selection      │   │
│  │    (e.g. $5.00)       │      │  & Car Selection         │   │
│  └───────────┬───────────┘      └──────────────────────────┘   │
│              │                                                   │
│   ┌──────────▼──────────┐        ┌──────────────────────────┐   │
│   │  Markup % Field     │        │  Quantity Input          │   │
│   │ (Default: 15%)      │        │  (with +/- buttons)      │   │
│   │  (EDITABLE)         │        │                          │   │
│   └──────────┬──────────┘        └──────────────────────────┘   │
│              │                                                   │
│              │ onChange                                          │
│              │                                                   │
│              ▼                                                   │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Calculate: finalPrice = unitPrice × (1 + markup/100)   │  │
│   │  Example: $5.00 × 1.15 = $5.75                          │  │
│   └──────────┬───────────────────────────────────────────────┘  │
│              │                                                   │
│              ▼                                                   │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Final Price Per Unit Field                              │   │
│   │ (Shows calculated value OR custom value)                │   │
│   │ (EDITABLE - User can override)                          │   │
│   │ Example displays: $5.75                                 │   │
│   └─────────────┬───────────────────────────────────────────┘   │
│                 │                                                │
│        ┌────────┴────────┐                                       │
│        │                 │                                       │
│        ▼                 ▼                                       │
│   User Edits?        User Submits                                │
│   Custom Price?      Form?                                       │
│        │                 │                                       │
│        │ YES              │ YES                                  │
│        │                 │                                       │
│   finalPrice = custom  Collect Data:                             │
│   value                - supplierId                              │
│   e.g. $6.50           - carId                                   │
│        │                - quantity                               │
│        │                - unitPrice                              │
│        │                - markupPercentage                       │
│        │                - finalPrice (custom or 0)               │
│        │                │                                        │
│        └────────┬───────┘                                       │
│                 │                                                │
│                 ▼                                                │
│    ┌──────────────────────────────────────────────┐             │
│    │   Form Submission                            │             │
│    │   POST /api/presale/items                    │             │
│    │   {                                          │             │
│    │     purchaseId: "presale-123...",            │             │
│    │     carId: "HW2023-001",                     │             │
│    │     quantity: 10,                            │             │
│    │     unitPrice: 5.00,                         │             │
│    │     markupPercentage: 15,                    │             │
│    │     finalPrice: 0 or 6.50                    │             │
│    │   }                                          │             │
│    └──────────────────┬───────────────────────────┘             │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ HTTP POST
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                 BACKEND API (Express.js)                         │
│               presaleItemsRoutes.ts                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  POST /api/presale/items                                         │
│  └─ Extract: finalPrice, unitPrice, markupPercentage            │
│                                                                   │
│     ┌──────────────────────────────────────────────────┐         │
│     │   Decision Logic                                 │         │
│     │                                                  │         │
│     │   IF finalPrice > 0:                             │         │
│     │      Use: finalPrice (custom value)              │         │
│     │      Recalc: markup = (final-unit)/unit × 100    │         │
│     │   ELSE:                                          │         │
│     │      Use: markupPercentage                       │         │
│     │      Calc: finalPrice = unit × (1 + markup/100) │         │
│     │                                                  │         │
│     └──────────────────┬───────────────────────────────┘         │
│                        │                                         │
│                        ▼                                         │
│     ┌──────────────────────────────────────────────────┐         │
│     │  PreSaleItemService.createOrUpdatePreSaleItem()  │         │
│     │                                                  │         │
│     │  - Check if item exists for this car             │         │
│     │  - If exists: Add to quantity                    │         │
│     │  - If new: Create with calculated/custom price  │         │
│     │  - Calculate:                                    │         │
│     │    * totalSaleAmount = finalPrice × quantity     │         │
│     │    * totalCostAmount = unitPrice × quantity      │         │
│     │    * totalProfit = saleAmount - costAmount       │         │
│     │                                                  │         │
│     └──────────────────┬───────────────────────────────┘         │
│                        │                                         │
│                        ▼                                         │
│     ┌──────────────────────────────────────────────────┐         │
│     │  Save to MongoDB                                 │         │
│     │  PreSaleItem {                                   │         │
│     │    carId: "HW2023-001",                          │         │
│     │    basePricePerUnit: 5.00,                       │         │
│     │    markupPercentage: 15 or 30,                   │         │
│     │    finalPricePerUnit: 5.75 or 6.50,             │         │
│     │    totalQuantity: 10,                            │         │
│     │    totalSaleAmount: 57.50 or 65.00,             │         │
│     │    totalCostAmount: 50.00,                       │         │
│     │    totalProfit: 7.50 or 15.00                    │         │
│     │  }                                               │         │
│     │                                                  │         │
│     └──────────────────┬───────────────────────────────┘         │
│                        │                                         │
│                        ▼                                         │
│     Return HTTP 201: { success: true, data: item }               │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │ HTTP Response
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND - Display Results                     │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐         │
│  │  Show Success Toast:                                │         │
│  │  "Pre-sale registrada exitosamente"                 │         │
│  │                                                     │         │
│  │  Reset Form Fields                                  │         │
│  │  Call: onSuccess() callback                         │         │
│  │                                                     │         │
│  │  React Query: Invalidate queries                    │         │
│  │  - presaleItems (list)                              │         │
│  │  - presaleActiveSummary                             │         │
│  │                                                     │         │
│  └─────────────────────────────────────────────────────┘         │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Pricing Decision Tree

```
                    ┌──────────────────┐
                    │  Form Submitted  │
                    └────────┬─────────┘
                             │
                    ┌────────▼──────────┐
                    │ finalPrice = ?    │
                    └──────┬────────┬──┘
                           │        │
                    ┌──────▼──┐   ┌─▼────────┐
                    │ finalPrice > 0 │ finalPrice = 0 │
                    │ (Custom)       │ (Auto-calc)    │
                    └────┬───────┘   └──┬────────────┘
                         │                 │
           ┌─────────────▼────┐    ┌───────▼──────────────┐
           │ Use Custom Value  │    │ Calculate from      │
           │ finalPrice=$6.50  │    │ markup %            │
           │                  │    │ final = $5 × 1.15   │
           └────────┬─────────┘    │ final = $5.75       │
                    │              └──────────┬──────────┘
                    │                         │
           ┌────────▼──────────┐    ┌────────▼────────┐
           │ Recalc Markup%:   │    │ Use provided    │
           │ (6.50-5)/5×100    │    │ markup: 15%     │
           │ = 30%             │    │                 │
           │                   │    │                 │
           └────────┬──────────┘    └────────┬────────┘
                    │                         │
                    └──────────┬──────────────┘
                               │
                    ┌──────────▼─────────┐
                    │  Store in DB:      │
                    │  basePricePerUnit   │
                    │  markupPercentage   │
                    │  finalPricePerUnit  │
                    │  Calculate Profit   │
                    └────────────────────┘
```

---

## State Management Flow

```
FormData State:
├─ unitPrice: 5.00
├─ markupPercentage: 15
└─ finalPrice: 0 (or 6.50 if custom)

Computed Values:
├─ finalPricePerUnit:
│  IF finalPrice > 0: return finalPrice
│  ELSE: return unitPrice × (1 + markup/100)
│
├─ totalCost:
│  finalPricePerUnit × quantity
│
└─ profit:
   (finalPricePerUnit - unitPrice) × quantity

Display:
├─ Markup % input: shows formData.markupPercentage
├─ Final Price input: shows finalPricePerUnit
├─ Total Cost: show totalCost
└─ Total Profit: show profit
```

---

## API Contract

### Request Path 1: Markup-Based (Default)
```
POST /api/presale/items
{
  purchaseId: "presale-123",
  carId: "HW2023-001",
  quantity: 10,
  unitPrice: 5.00,
  markupPercentage: 15,
  finalPrice: 0
}

↓ Backend Decision ↓

Backend calculates:
finalPrice = 5.00 × (1 + 15/100) = 5.75

Saves to DB:
{
  basePricePerUnit: 5.00,
  markupPercentage: 15,
  finalPricePerUnit: 5.75,
  totalSaleAmount: 57.50,
  totalProfit: 7.50
}
```

### Request Path 2: Custom Price
```
POST /api/presale/items
{
  purchaseId: "presale-123",
  carId: "HW2023-001",
  quantity: 10,
  unitPrice: 5.00,
  markupPercentage: 15,
  finalPrice: 6.50
}

↓ Backend Decision ↓

Backend uses custom:
finalPrice = 6.50 (provided value)
markup = (6.50 - 5.00) / 5.00 × 100 = 30%

Saves to DB:
{
  basePricePerUnit: 5.00,
  markupPercentage: 30,
  finalPricePerUnit: 6.50,
  totalSaleAmount: 65.00,
  totalProfit: 15.00
}
```

### Update Final Price
```
PUT /api/presale/items/:id/final-price
{
  finalPrice: 7.00
}

↓ Backend Updates ↓

Backend calculates:
markup = (7.00 - 5.00) / 5.00 × 100 = 40%

Updates in DB:
{
  markupPercentage: 40,
  finalPricePerUnit: 7.00,
  totalSaleAmount: 70.00,
  totalProfit: 20.00
}
```

---

## Component Hierarchy

```
PreSalePurchaseForm (Container)
├── formData State
│   ├── unitPrice
│   ├── markupPercentage
│   ├── finalPrice
│   └── quantity
│
├── Calculated Values
│   ├── finalPricePerUnit
│   ├── totalCost
│   └── profit
│
├── Form Sections
│   ├── Supplier Selection
│   ├── Car Selection
│   ├── Quantity & Pricing Grid
│   │   ├── Quantity Input
│   │   ├── Unit Price Input
│   │   └── Markup Percentage Input
│   ├── Final Price Input (NEW)
│   ├── Summary Display
│   │   ├── Total Cost
│   │   └── Total Profit
│   └── Submit Button
│
└── Event Handlers
    ├── handleSubmit (sends to API)
    ├── onChange handlers (update form state)
    └── Form validation
```

---

## Data Flow Summary

```
INPUT (User) → VALIDATION → CALCULATION → API REQUEST
                   ↓
                Valid Data        Invalid Data
                   │                   │
                   ↓                   ▼
              SEND TO API      SHOW ERROR MESSAGE
                   │
                   ↓
         BACKEND RECEIVES
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼                     ▼
    VALIDATE            APPLY LOGIC
        │                     │
        │                ┌────┴────┐
        │                │         │
        │          Use    Use Custom
        │          Markup  Price
        │          %       Value
        │          │       │
        │          └───┬───┘
        │              │
        ▼              ▼
    SAVE TO DB    RECALC MARKUP
        │              │
        └──────┬───────┘
               │
               ▼
        RETURN TO CLIENT
               │
               ▼
        UPDATE UI / DISPLAY
```

---

## Technology Stack

```
Frontend Layer:
├─ React Hook Form
├─ React Query (for mutations)
├─ TypeScript
└─ Vite Build

State Management:
├─ Local Component State (formData)
├─ React Query Cache (server state)
└─ Toast Notifications (feedback)

Backend Layer:
├─ Express.js Router
├─ TypeScript
├─ MongoDB + Mongoose
└─ Service Layer Pattern

Database:
└─ MongoDB Collection: presaleitems
   ├─ basePricePerUnit (Number)
   ├─ markupPercentage (Number)
   ├─ finalPricePerUnit (Number)
   ├─ totalQuantity (Number)
   └─ ... other fields ...
```

---

This architecture diagram shows:
1. **User Input** → Form fields collect data
2. **Smart Calculation** → System chooses calculation method
3. **API Submission** → Data sent to backend
4. **Backend Processing** → Decision tree applies logic
5. **Database Storage** → Both values stored for reference
6. **Response** → Results sent back to frontend
7. **Display** → UI updates with success/error feedback
