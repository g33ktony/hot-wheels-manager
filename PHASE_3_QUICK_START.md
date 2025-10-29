# Phase 3: Pre-Sale Purchase Form - Quick Start Guide

**Status**: Ready to Begin  
**Estimated Duration**: 3-4 days  
**Prerequisites**: Phase 2 Backend (✅ DONE)

---

## 📋 What to Build

A React form component to register new pre-sale purchases with the following workflow:

1. **Select or Create Supplier** - Link to existing supplier or create new
2. **Input Car Details** - Select HotWheels car and condition
3. **Input Quantity & Pricing** - Quantity and cost per unit
4. **Configure Pre-Sale** - Scheduled date and status
5. **Optional Markup** - Override default 15% markup
6. **Submit** - POST to `/api/presale/items`

---

## 🏗️ File Structure to Create

```
frontend/src/
├── components/
│   ├── forms/
│   │   └── PreSalePurchaseForm.tsx      ← Main form component
│   └── presale/
│       ├── SupplierSelect.tsx            ← Reusable supplier selector
│       └── CarSelector.tsx               ← HotWheels car picker
├── pages/
│   └── PreSalePurchase.tsx               ← Page wrapper
├── hooks/
│   └── usePreSaleForm.ts                 ← Form state management
└── services/
    └── presaleService.ts                 ← API calls
```

---

## 📝 Component Specifications

### 1. PreSalePurchaseForm Component

**Location**: `frontend/src/components/forms/PreSalePurchaseForm.tsx`

**Props:**
```typescript
interface PreSalePurchaseFormProps {
  onSuccess?: (item: any) => void;
  onError?: (error: string) => void;
  initialData?: Partial<PreSaleFormData>;
}
```

**Form Fields:**
```typescript
interface PreSaleFormData {
  supplierId: string;           // Select from dropdown or "new"
  supplierName?: string;        // If creating new
  carId: string;                // HotWheels car ID
  quantity: number;             // Must be >= 1
  unitPrice: number;            // Cost per unit
  condition: 'mint' | 'good' | 'fair' | 'poor';
  purchaseDate: Date;           // When items were purchased
  preSaleScheduledDate?: Date;  // When pre-sale collection ends
  markupPercentage?: number;    // Default: 15%
  notes?: string;
}
```

**Features:**
- Real-time form validation
- Price calculation preview (shows final price with markup)
- Loading spinner during submission
- Error messages with recovery suggestions
- Success toast notification
- Navigation to pre-sale dashboard after success

**UI Elements:**
- Supplier selector dropdown with "Create New" option
- HotWheels car search/select
- Quantity stepper (1, +, -)
- Unit price input with currency formatting
- Condition radio buttons
- Date pickers for dates
- Markup percentage slider (optional)
- Notes textarea
- Submit button with loading state
- Cancel button

---

### 2. SupplierSelect Component

**Location**: `frontend/src/components/presale/SupplierSelect.tsx`

**Purpose**: Reusable supplier selector with inline creation

**Features:**
- Dropdown list of existing suppliers
- Search/filter suppliers
- "Create New Supplier" option
- Modal form for creating new supplier
- Fetch suppliers from `/api/suppliers`

---

### 3. CarSelector Component

**Location**: `frontend/src/components/presale/CarSelector.tsx`

**Purpose**: Search and select HotWheels cars

**Features:**
- Searchable autocomplete
- Shows car image if available
- Display: "[toy_num] - [model] - [series]"
- Fetch from `/api/hotwheels/search?q=...`
- Cache results

---

### 4. API Service

**Location**: `frontend/src/services/presaleService.ts`

```typescript
class PreSaleService {
  // Create new pre-sale item
  async createPreSaleItem(data: PreSaleFormData): Promise<any>
  
  // Get pre-sale items
  async getPreSaleItems(filters?: any): Promise<any[]>
  
  // Get pre-sale item by ID
  async getPreSaleItem(id: string): Promise<any>
}
```

---

## 🔄 API Integration

### Backend Endpoint Used

**POST** `/api/presale/items`

**Request Body:**
```json
{
  "purchaseId": "string",           // required
  "carId": "string",                // required
  "quantity": 50,                   // required
  "unitPrice": 2.50,                // required
  "markupPercentage": 15            // optional, default 15
}
```

**Response:**
```json
{
  "success": true,
  "message": "Pre-sale item created/updated successfully",
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "carId": "1-1995",
    "totalQuantity": 50,
    "assignedQuantity": 0,
    "availableQuantity": 50,
    "finalPricePerUnit": 2.875,
    "totalProfit": 43.75,
    "status": "active"
  }
}
```

**Note:** The form needs to handle creating a Purchase first, then a PreSaleItem. OR combine both in a single backend endpoint. See PRESALE_IMPLEMENTATION_PLAN.md for details.

---

## 🎨 Design Reference

**Layout Pattern**: Use existing form patterns from:
- `frontend/src/components/forms/PurchaseForm.tsx` - Existing purchase form
- `frontend/src/pages/Purchases.tsx` - Page structure

**Styling**: Use Tailwind CSS classes consistent with app theme

**Color Scheme**:
- Primary actions: Blue
- Warnings: Orange (overdue dates)
- Success: Green
- Errors: Red

---

## ✅ Implementation Checklist

- [ ] Create PreSalePurchaseForm component
- [ ] Create SupplierSelect sub-component
- [ ] Create CarSelector sub-component
- [ ] Create presaleService.ts
- [ ] Create usePreSaleForm custom hook
- [ ] Create PreSalePurchase page
- [ ] Add route `/presale/purchase` to router
- [ ] Add navigation link to sidebar
- [ ] Test form submission
- [ ] Test error handling
- [ ] Test success notification
- [ ] Test navigation after success

---

## 📚 Reference Documentation

- **API Spec**: PRESALE_IMPLEMENTATION_PLAN.md - Section 9 (Frontend)
- **Code Examples**: PRESALE_CODE_EXAMPLES.md - React components section
- **Existing Forms**: Study PurchaseForm.tsx pattern
- **Services Pattern**: Check existing services in frontend/src/services/

---

## 🚀 Getting Started

1. **Review existing forms:**
   ```bash
   cat frontend/src/components/forms/PurchaseForm.tsx
   cat frontend/src/services/*.ts
   ```

2. **Check API availability:**
   ```bash
   curl http://localhost:3001/api/presale/items \
     -H "Authorization: Bearer <token>"
   ```

3. **Start with component shell:**
   - Create empty component with props interface
   - Add TypeScript interfaces
   - Implement form fields one by one
   - Test each field binding

4. **Connect to API:**
   - Implement presaleService.ts
   - Add error handling
   - Add loading states
   - Test with real backend

5. **Polish UI:**
   - Add validation messages
   - Improve error display
   - Add success notifications
   - Test form flows

---

## 💡 Tips & Tricks

1. **Reuse Components**: Copy PurchaseForm structure as template
2. **Handle Suppliers**: Pre-sales may need new suppliers, handle creation flow
3. **Quantity Validation**: Ensure quantity >= 1
4. **Price Preview**: Show final price calculation in real-time
5. **Error Recovery**: Allow users to fix and resubmit form
6. **Auto-populate**: If editing, populate form with existing data

---

## 📞 Questions to Consider

- Should we create Purchase + PreSaleItem in one API call or two?
- Should suppliers be created inline or separately?
- What validations are most important?
- Should there be a review/confirmation step?
- How to handle bulk pre-sale imports?

---

## 🎯 Success Criteria

✅ Form submits and creates pre-sale item successfully  
✅ Form validates input and shows clear errors  
✅ User can navigate to dashboard after success  
✅ Form resets after successful submission  
✅ All fields display proper type formatting (currency, dates)  
✅ Responsive design works on mobile  
✅ Loading states display during API calls  

---

**Ready?** Start with creating the component shell and gradually add features.  
**Questions?** Refer to PRESALE_IMPLEMENTATION_PLAN.md or existing code patterns.

Good luck! 🚀
