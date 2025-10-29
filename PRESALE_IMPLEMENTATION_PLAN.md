# Pre-Sale System Implementation Plan

## Overview
A comprehensive pre-sale management system that allows tracking products from order through delivery with flexible payment options (full payment or installments).

---

## 1. Data Model Changes

### 1.1 Update Purchase Model
**File:** `backend/src/models/Purchase.ts` & `shared/types.ts`

```typescript
// Add these fields to Purchase interface:
isPresale?: boolean;              // Flag to mark this as a pre-sale purchase
preSaleScheduledDate?: Date;      // 'coming-soon' status - expected release date
preSaleStatus?: 'coming-soon' | 'purchased' | 'shipped' | 'received' | 'archived';
```

### 1.2 Create PreSaleItem Model
**File:** `backend/src/models/PreSaleItem.ts` & add to `shared/types.ts`

Aggregated view of products from pre-sale purchases.

```typescript
interface IPreSaleItem extends Document {
  carId: string;                          // Reference to HotWheelsCar
  hotWheelsCar?: HotWheelsCar;
  
  // Source tracking
  linkedPurchaseIds: ObjectId[];          // All purchases containing this item
  purchasedQuantity: number;              // Total quantity across all purchases
  
  // Quantity tracking
  totalQuantity: number;                  // Sum of all linked purchase items
  assignedQuantity: number;               // Quantity assigned to deliveries
  availableQuantity: number;              // totalQuantity - assignedQuantity
  
  // Status tracking
  preSaleStatus: 'coming-soon' | 'purchased' | 'shipped' | 'received' | 'archived';
  scheduledDate?: Date;                   // Release date if coming-soon
  purchasedDate: Date;
  shippedDate?: Date;
  receivedDate?: Date;                    // When it arrived in store
  archivedDate?: Date;
  
  // Pricing
  purchasePrice: number;                  // Average purchase price per unit
  baseSalePrice: number;                  // Before markup
  defaultMarkupPercentage: number;        // Default % to apply (e.g., 15%)
  suggestedSalePrice: number;             // purchasePrice * (1 + defaultMarkupPercentage)
  customSalePrice?: number;               // Override if user customizes
  finalSalePrice: number;                 // customSalePrice || suggestedSalePrice
  
  // Delivery tracking
  deliveryAssignments: {
    deliveryId: ObjectId;
    quantity: number;
    units: Array<{
      unitId: string;                     // Unique identifier for this unit
      status: 'assigned' | 'pending-delivery' | 'delivered';
    }>;
  }[];
  
  // Metadata
  brand?: string;
  pieceType?: 'basic' | 'premium' | 'rlc';
  condition: 'mint' | 'good' | 'fair' | 'poor';
  photos?: string[];
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 1.3 Create PreSalePaymentPlan Model
**File:** `backend/src/models/PreSalePaymentPlan.ts` & add to `shared/types.ts`

Tracks installment payments for pre-sale deliveries.

```typescript
interface IPreSalePaymentPlan extends Document {
  deliveryId: ObjectId;                   // Reference to delivery
  customerId: ObjectId;
  preSaleItemId: ObjectId;
  
  // Plan configuration
  totalAmount: number;                    // Total price for this delivery
  numberOfPayments: number;               // Total installments
  firstPaymentDate: Date;                 // When first payment is due
  limitDate: Date;                        // Deadline for 100% payment
  fixedPaymentAmount: number;             // Amount for each installment
  
  // Payment tracking
  paidAmount: number;                     // Total paid so far
  remainingBalance: number;               // totalAmount - paidAmount
  nextDueDate?: Date;                     // When next payment is due
  payments: PreSalePayment[];
  
  // Status
  status: 'active' | 'completed' | 'overdue' | 'cancelled';
  
  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PreSalePayment {
  _id?: ObjectId;
  amount: number;
  paymentDate: Date;
  paymentMethod: 'cash' | 'transfer' | 'card' | 'other';
  notes?: string;
  createdAt: Date;
}
```

### 1.4 Update Delivery Model
**File:** `backend/src/models/Delivery.ts` & `shared/types.ts`

```typescript
// Add to Delivery interface:
hasPresaleItems?: boolean;                // Flag if contains pre-sale items
preSalePaymentPlans?: ObjectId[];         // References to payment plans
preSaleStatus?: 'pending' | 'partial' | 'completed';  // For pre-sale portion
```

### 1.5 Update DeliveryItem
**File:** `backend/src/models/Delivery.ts` & `shared/types.ts`

```typescript
// Add to DeliveryItem interface:
isPresaleItem?: boolean;                  // Flag for pre-sale items
preSaleItemId?: ObjectId;                 // Reference to PreSaleItem
preSaleUnitIds?: string[];                // Which specific units assigned
paymentPlanId?: ObjectId;                 // If has installment plan
```

---

## 2. Backend API Endpoints

### 2.1 Pre-Sale Item Endpoints

#### GET `/api/presale-items`
- Returns: List of all pre-sale items with quantities and status
- Filters: status, archived (true/false), hasAvailable
- Sorting: by status, date, product name

#### GET `/api/presale-items/:id`
- Returns: Detailed pre-sale item with:
  - Product info
  - Quantity breakdown
  - All linked purchases
  - All linked deliveries
  - Payment plan details

#### POST `/api/presale-items`
- Triggered when: Purchase is marked as pre-sale and received
- Auto-creates/updates PreSaleItem with items from that purchase
- Body:
  ```json
  {
    "purchaseId": "...",
    "defaultMarkupPercentage": 15
  }
  ```

#### PATCH `/api/presale-items/:id/status`
- Updates pre-sale item status (coming-soon → purchased → shipped → received → archived)
- Body:
  ```json
  {
    "status": "received",
    "statusDate": "2025-10-28T..."
  }
  ```

#### PATCH `/api/presale-items/:id/pricing`
- Updates pricing
- Body:
  ```json
  {
    "defaultMarkupPercentage": 20,
    "customSalePrice": 25.99
  }
  ```

#### GET `/api/presale-items/:id/deliveries`
- Returns: All deliveries containing this item with payment info

### 2.2 Payment Plan Endpoints

#### POST `/api/presale-payments/plan`
- Creates payment plan when adding pre-sale item to delivery
- Body:
  ```json
  {
    "deliveryId": "...",
    "preSaleItemId": "...",
    "totalAmount": 99.99,
    "numberOfPayments": 3,
    "firstPaymentDate": "2025-11-05T...",
    "limitDate": "2025-12-05T..."
  }
  ```
- Returns: Created payment plan with calculated fixedPaymentAmount

#### GET `/api/presale-payments/plan/:id`
- Returns: Payment plan details with payment history

#### POST `/api/presale-payments/plan/:id/payment`
- Records a payment
- Body:
  ```json
  {
    "amount": 35.99,
    "paymentMethod": "transfer",
    "notes": "First installment"
  }
  ```
- Logic:
  - If amount < fixedPaymentAmount: subtract from remaining balance
  - If amount > fixedPaymentAmount: adjust next payment accordingly
  - If all paid early: mark status as completed
  - Auto-calculate next due date

#### PATCH `/api/presale-payments/plan/:id`
- Update payment plan (change number of payments, etc.)

### 2.3 Purchase Modification

#### PATCH `/api/purchases/:id`
- Add `isPresale` flag when updating/creating purchase
- When `isPresale: true` is set:
  - Trigger PreSaleItem creation if not exists
  - Update existing PreSaleItem if exists

---

## 3. Frontend Implementation

### 3.1 New Pages

#### Page: `/presale` - Pre-Sale Dashboard
Two-tab interface:

**Tab 1: Pre-Sale Purchases**
- Table showing:
  - Purchase ID
  - Supplier
  - Purchase Date
  - Scheduled Date (if coming-soon)
  - Total Items
  - Current Status (badge)
  - Actions button (View, Mark Received, Create Delivery, Archive)

- Features:
  - Filter by status
  - Sort by date
  - Quick status update badges

**Tab 2: Items to be Received (Pre-Sale Items)**
- Table showing:
  - Product image (thumbnail)
  - Product name (HotWheels car)
  - Brand / Type
  - Total Qty | Assigned Qty | Available Qty
  - Status (badge with date)
  - Sale Price / Markup %
  - Actions button (View Details, Assign to Delivery, Archive)

- Features:
  - Filter by status, availability
  - Sort by product, status, date
  - Bulk archive option
  - Show profit preview on hover

### 3.2 New Components

#### Component: `PreSaleItemDetails` Modal/Drawer
- Displays:
  - Product card (name, images, specs)
  - Quantity breakdown (visual/chart):
    - Total quantity (from purchase)
    - Assigned to deliveries (stacked bar)
    - Available (can be assigned)
  - Status timeline (visual):
    - coming-soon (with scheduled date)
    - purchased (with purchase date)
    - shipped (with tracking if available)
    - received (with received date)
    - archived (if applicable)
  - Pricing section:
    - Purchase price per unit
    - Suggested sale price (with markup % shown)
    - Custom sale price (override input)
    - Profit per unit
  - Deliveries list:
    - Shows all deliveries containing this item
    - Quantity assigned to each
    - Delivery date / customer
    - Payment status if applicable
    - Link to full delivery details
  - Actions:
    - Change status
    - Update pricing
    - Assign to new delivery
    - Archive

#### Component: `PaymentPlanForm`
- Used when adding pre-sale item to delivery
- Inputs:
  - Number of payments (selector/number)
  - First payment date (date picker)
  - Limit date (date picker)
  - Displays calculated:
    - Fixed payment amount per installment
    - Next due date (auto-calculated)
- Validation:
  - Limit date > First payment date
  - First payment date is not in the past

#### Component: `PaymentTracking` 
- Shows in delivery details for pre-sale items:
  - Payment plan summary
    - Total amount
    - Remaining balance
    - Paid amount (with progress bar)
    - Next due date
  - Payment history table:
    - Date, Amount, Method, Notes
  - Payment recording section:
    - Amount input
    - Payment method selector
    - Notes
    - Submit button
  - Status badge (On Track / Overdue / Completed)

#### Component: `PreSaleItemSelector`
- Multi-select component for delivery form
- Shows:
  - Pre-sale items (with available qty)
  - Normal inventory items
  - Different styling/section for each
- For pre-sale items:
  - Show available quantity
  - Allow selecting quantity (≤ available)
  - Quantity input with validation
  - "Show payment plan" checkbox (if selecting pre-sale)

### 3.3 Form Modifications

#### Purchase Form - Add Presale Section
- New checkbox: "Is Pre-Sale"
- If checked, show:
  - Scheduled release date picker
  - Default markup percentage input (with suggestion)
  - Notes field

#### Delivery Form - Modify Items Section
- Update item selector to use new `PreSaleItemSelector` component
- For each pre-sale item selected:
  - Show available quantity
  - Show unit allocation UI (visual)
  - If "Add Payment Plan" checked:
    - Show `PaymentPlanForm`
    - Calculate total for this item
  - If not checked:
    - Treat as regular delivery (no payment tracking)
- Validation:
  - Can't exceed available quantity per pre-sale item
  - Can't assign same units to multiple deliveries

---

## 4. Business Logic

### 4.1 Pre-Sale Item Aggregation Algorithm

**Trigger:** When purchase marked as `isPresale` and `isReceived: true`

```
For each item in purchase:
  1. Find/create PreSaleItem by carId
  2. Add purchaseId to linkedPurchaseIds
  3. Recalculate totals:
     - totalQuantity = sum of all linked purchases quantities
     - assignedQuantity = sum of all delivery assignments
     - availableQuantity = totalQuantity - assignedQuantity
  4. Recalculate pricing:
     - purchasePrice = weighted avg from all purchases
     - suggestedSalePrice = purchasePrice * (1 + defaultMarkupPercentage)
     - finalSalePrice = customSalePrice || suggestedSalePrice
  5. Set preSaleStatus based on purchases:
     - If any purchase in 'coming-soon' → status = 'coming-soon'
     - Else if any in 'shipped' → status = 'shipped'
     - Else if all 'received' → status = 'received'
```

### 4.2 Unit Assignment & Delivery Validation

**Constraint:** Same product can only be in max quantity deliveries

```
Example: 3 units of "Ferrari" pre-sale item
- Can assign 1 unit to Delivery A
- Can assign 1 unit to Delivery B  
- Can assign 1 unit to Delivery C
- Cannot assign unit to Delivery D (only 3 total)

Each delivery tracks which specific unitIds it has:
DeliveryItem.preSaleUnitIds = ['unit-1', 'unit-2']
```

### 4.3 Payment Plan Auto-Calculation

**When payment plan created:**
```
fixedPaymentAmount = totalAmount / numberOfPayments
nextDueDate = firstPaymentDate
status = 'active'
```

**When payment recorded:**
```
If payment.amount >= fixedPaymentAmount:
  1. Deduct from remaining balance
  2. Check if this clears multiple remaining payments
  3. If balance cleared: status = 'completed'
  4. Else: nextDueDate = add interval to current nextDueDate
  5. remainingBalance = totalAmount - paidAmount

If payment.amount < fixedPaymentAmount:
  1. Adjust nextPaymentAmount = fixedPaymentAmount - payment.amount
  2. Keep nextDueDate same

If today > limitDate AND paidAmount < totalAmount:
  status = 'overdue'
```

### 4.4 Dashboard Stats

**Add to existing dashboard:**
- Pre-sale items count (active)
- Pre-sale revenue (from completed deliveries)
- Pre-sale profit (finalSalePrice - purchasePrice) × quantity
- Payment status overview (on-track, overdue, completed)

---

## 5. Implementation Phases

### Phase 1: Backend Data Models & APIs (Week 1)
- [ ] Create PreSaleItem model
- [ ] Create PreSalePaymentPlan model
- [ ] Update Purchase model with isPresale flag
- [ ] Update Delivery & DeliveryItem models
- [ ] Implement all endpoints from Section 2
- [ ] Add validation & business logic

### Phase 2: Backend Integration (Week 1)
- [ ] Wire pre-sale item aggregation logic
- [ ] Add purchase form endpoint support for isPresale
- [ ] Add delivery endpoint to handle pre-sale items
- [ ] Implement payment tracking logic
- [ ] Create unit assignment logic

### Phase 3: Frontend - Pre-Sale Dashboard (Week 2)
- [ ] Create `/presale` page with tabs
- [ ] Build pre-sale purchases table
- [ ] Build pre-sale items table
- [ ] Add filtering & sorting
- [ ] Add status badge component

### Phase 4: Frontend - Pre-Sale Item Details (Week 2)
- [ ] Build PreSaleItemDetails modal
- [ ] Add quantity visualization
- [ ] Add status timeline
- [ ] Add pricing management UI
- [ ] Add deliveries list section

### Phase 5: Frontend - Payment Management (Week 2)
- [ ] Build PaymentPlanForm component
- [ ] Build PaymentTracking component
- [ ] Integrate into delivery details
- [ ] Add payment recording UI
- [ ] Add payment history view

### Phase 6: Frontend - Forms Integration (Week 3)
- [ ] Update purchase form with isPresale section
- [ ] Update delivery form with PreSaleItemSelector
- [ ] Add payment plan option to delivery
- [ ] Add unit assignment UI
- [ ] Add validation messages

### Phase 7: Testing & Polish (Week 3)
- [ ] Test full pre-sale workflow (purchase → delivery → payment)
- [ ] Test quantity constraints
- [ ] Test payment calculations
- [ ] Test status updates
- [ ] UI/UX refinements
- [ ] Dashboard stats verification

---

## 6. Data Flow Diagram

```
Purchase Form (isPresale: true)
    ↓
Purchase Created
    ↓
Mark as Received (isReceived: true)
    ↓
[Auto] Create/Update PreSaleItem
    (Aggregate by carId)
    ↓
Pre-Sale Dashboard
    (Two tabs: Purchases & Items)
    ↓
Create Delivery
    (Select pre-sale item + quantity)
    ↓
[If pre-sale] Add Payment Plan
    (Number of payments, dates, etc.)
    ↓
Delivery Created
    (Track assigned units)
    ↓
Payment Tracking
    (Record payments, auto-adjust dates)
    ↓
Delivery Completed
    (Mark as delivered)
    ↓
Payment Plan Completed
    (100% paid)
```

---

## 7. Key Differentiators from Regular Sales

| Feature | Regular Sale | Pre-Sale |
|---------|--------------|----------|
| Purchase Type | Normal order | Marked with `isPresale: true` |
| Aggregation | Individual items | Aggregated by product (PreSaleItem) |
| Status Tracking | Purchase status only | Detailed status timeline |
| Pricing | Fixed | Can apply markup % |
| Delivery | One-time | Multiple deliveries possible |
| Payment | Single or multiple | Flexible installments with tracking |
| Quantity | Per purchase | Across all purchases (pooled) |
| Dashboard | None specific | Dedicated pre-sale dashboard |

---

## 8. Configuration Notes

**Suggested Defaults (can be customized in settings):**
- Default markup percentage: 15%
- Payment plan durations: 3, 6, 12 months
- Installment reminders: 3 days before due date

