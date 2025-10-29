# Dual Pricing System - Quick Reference Guide

## Component Overview

### Pricing Fields in PreSalePurchaseForm

```typescript
// Both fields are editable
- Markup % (editable)      // Default: 15%
- Final Price Per Unit     // Auto-calculated or custom
```

## Form Behavior

### User Actions

1. **Enter Unit Price**: $5.00
2. **Enter Markup %**: 20
   - Auto-calculates Final Price: $6.00
3. **(Optional) Edit Final Price**: $6.50
   - Overrides the calculated value
4. **Submit**: Sends both values to backend

### Form State
```typescript
{
  unitPrice: 5.00,
  markupPercentage: 20,
  finalPrice: 6.50,  // 0 = use calculated, > 0 = custom
  quantity: 1,
  // ... other fields
}
```

## Backend Logic

### Create New Item
```typescript
const item = await PreSaleItemService.createOrUpdatePreSaleItem(
  purchaseId,
  carId,
  quantity,
  unitPrice,
  markupPercentage,
  finalPrice  // Optional - takes precedence if > 0
)
```

### Calculation Logic
```
IF finalPrice > 0:
  Use finalPrice as-is
  Recalculate markup% = (finalPrice - unitPrice) / unitPrice × 100
ELSE:
  Calculate finalPrice = unitPrice × (1 + markupPercentage / 100)
  Use provided markupPercentage
```

### Update Final Price
```typescript
const item = await PreSaleItemService.updateFinalPrice(id, finalPrice)
// Automatically recalculates markup percentage
```

## API Endpoints

### POST /api/presale/items
Creates new pre-sale item with optional custom final price.

**Request:**
```json
{
  "purchaseId": "presale-1234567890",
  "carId": "HW2023-001",
  "quantity": 10,
  "unitPrice": 5.00,
  "markupPercentage": 15,
  "finalPrice": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "basePricePerUnit": 5.00,
    "markupPercentage": 15,
    "finalPricePerUnit": 5.75,
    "totalSaleAmount": 57.50,
    "totalCostAmount": 50.00,
    "totalProfit": 7.50,
    ...
  }
}
```

### PUT /api/presale/items/:id/final-price
Updates final price on existing pre-sale item.

**Request:**
```json
{
  "finalPrice": 6.50
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "basePricePerUnit": 5.00,
    "markupPercentage": 30,
    "finalPricePerUnit": 6.50,
    "totalSaleAmount": 65.00,
    "totalCostAmount": 50.00,
    "totalProfit": 15.00,
    ...
  }
}
```

## React Hooks

### Create Pre-Sale Item
```typescript
const createPreSaleItem = useCreatePreSaleItem()

await createPreSaleItem.mutateAsync({
  purchaseId: "presale-123",
  carId: "HW2023-001",
  quantity: 10,
  unitPrice: 5.00,
  markupPercentage: 15,
  finalPrice: 0
})
```

### Update Final Price
```typescript
const updateFinalPrice = useUpdatePreSaleFinalPrice()

await updateFinalPrice.mutateAsync({
  id: itemId,
  finalPrice: 6.50
})
```

### Update Markup
```typescript
const updateMarkup = useUpdatePreSaleMarkup()

await updateMarkup.mutateAsync({
  id: itemId,
  markupPercentage: 25
})
```

## Validation Rules

### Frontend
```typescript
- Quantity: >= 1
- Unit Price: >= 0
- Markup %: 0-100
- Final Price: Auto-calculated OR > 0
```

### Backend
```typescript
- Final Price >= Unit Price (must not result in loss)
- Markup %: 0-100
- Quantity: > 0
```

## Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Final price cannot be less than base price" | finalPrice < unitPrice | Enter higher final price |
| "Markup must be between 0 and 100" | markupPercentage out of range | Enter 0-100 |
| "Quantity must be at least 1" | quantity < 1 | Enter valid quantity |
| "Unit price cannot be negative" | unitPrice < 0 | Enter positive price |
| "Car is required" | carId not selected | Select a car |
| "Supplier is required" | supplierId not provided | Select supplier |

## Profit Calculation

```
Total Profit = (Final Price Per Unit - Unit Price) × Quantity

Example:
  Unit Price: $5.00
  Final Price: $6.50
  Quantity: 10
  Profit: (6.50 - 5.00) × 10 = $15.00
```

## Summary Display

The form shows key metrics:
- **Markup %**: How much markup applied
- **Total Cost**: Unit Price × Quantity
- **Total Sale Amount**: Final Price × Quantity
- **Total Profit**: Sale Amount - Cost

Example:
```
Unit Price: $5.00
Final Price: $6.50
Quantity: 10
Markup %: 30%

Total Cost: $50.00
Total Sale: $65.00
Total Profit: $15.00
```

## Common Workflows

### Workflow 1: Standard Pricing
1. Enter Unit Price: $5.00
2. Leave Markup at 15%
3. Final Price auto-calculates to $5.75
4. Submit

### Workflow 2: Market-Based Pricing
1. Enter Unit Price: $5.00
2. Research market price: $6.99
3. Change Final Price to $6.99
4. Markup auto-calculates to 39.8%
5. Submit

### Workflow 3: Promotion Pricing
1. Original Final Price: $6.00
2. Need to reduce: $5.50
3. Update Final Price to $5.50
4. Markup changes to 10%
5. System validates: OK (still above cost)

## Database Fields

| Field | Type | Example | Notes |
|-------|------|---------|-------|
| basePricePerUnit | Number | 5.00 | Cost price |
| markupPercentage | Number | 15 | 0-100 |
| finalPricePerUnit | Number | 5.75 | Selling price |
| totalSaleAmount | Number | 57.50 | finalPrice × quantity |
| totalCostAmount | Number | 50.00 | basePrice × quantity |
| totalProfit | Number | 7.50 | Sale - Cost |

## Testing Checklist

- [ ] Create item with markup only (final price = 0)
- [ ] Create item with custom final price
- [ ] Verify calculations are correct
- [ ] Update markup on existing item
- [ ] Update final price on existing item
- [ ] Test validation errors
- [ ] Test edge cases (very high/low prices)
- [ ] Verify profit calculations
- [ ] Test UI displays correct values
- [ ] Test success/error toasts
