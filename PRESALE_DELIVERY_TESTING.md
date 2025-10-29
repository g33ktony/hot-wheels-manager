# Testing Presale Items in Deliveries - Step by Step

## Prerequisites
- Backend running on localhost:3000
- Frontend running on localhost:5173
- MongoDB with sample data
- At least one presale item created in the system

## Test Scenario 1: Add Presale Item to Delivery

### Steps:
1. Navigate to **Entregas** (Deliveries) page
2. Click **"Nueva Entrega"** button
3. Select a customer
4. In the **"Items Presale"** section, click the presale items input field
5. Search for a presale item (e.g., "RLC Exclusive Ford GT40 mkii")
6. Click on the presale item to select it

### Expected Results:
✅ Item appears in the delivery items list
✅ Item has **purple background** (to distinguish from regular inventory)
✅ Item shows **"Vendido como parte de serie"** badge
✅ **Quantity** field is **disabled** (read-only)
✅ **Precio Unitario** field is **disabled** (read-only)
✅ Price displays as the presale final price
✅ Item shows presale icon/indicator

### Screenshots:
Look for:
- Purple styling on presale items
- "Vendido como parte de serie" badge
- Disabled quantity/price fields

---

## Test Scenario 2: Create Delivery with Presale Item

### Steps:
1. With presale item added (from Scenario 1)
2. Enter location (e.g., "Store A")
3. Click **"Crear Entrega"** button

### Expected Results:
❌ **NO error dialog** should appear (this was the bug!)
✅ Delivery is created successfully
✅ Confirmation message appears
✅ Modal closes
✅ Delivery appears in the deliveries list
✅ Status shows "scheduled"

### Error to NOT See:
```
"Error al crear la entrega. Los items seleccionados pueden ya no estar disponibles."
```

---

## Test Scenario 3: Mixed Items (Presale + Inventory)

### Steps:
1. Create a new delivery
2. Select a customer
3. Add a **presale item** (purple)
4. Add a **regular inventory item** (normal styling)
5. Enter location
6. Click **"Crear Entrega"**

### Expected Results:
✅ Both presale and inventory items saved
✅ Presale item shows purple styling
✅ Inventory item shows normal styling
✅ Different styling clearly distinguishes them
✅ No error on creation
✅ Both items appear in delivery

---

## Test Scenario 4: Edit Delivery with Presale Item

### Steps:
1. Create a delivery with a presale item (from Scenario 2)
2. Click on the delivery in the list
3. Click **"Editar"** button
4. Modify location or other fields
5. Click **"Guardar Cambios"**

### Expected Results:
✅ Presale item remains with purple styling
✅ Presale item fields remain disabled
✅ Changes saved successfully
✅ No error on update

---

## Test Scenario 5: Complete Delivery with Presale Item

### Steps:
1. Create a delivery with presale item (from Scenario 2)
2. Click on the delivery
3. Change status to **"Prepared"**
4. Change status to **"Completed"**

### Expected Results:
✅ Status changes successfully
✅ Presale item remains in delivery
✅ No error messages
✅ Delivery shows as completed

### Note:
- Presale items should NOT create sales records (they're managed by PreSalePaymentPlan)
- Only regular inventory items create sales

---

## Test Scenario 6: Remove Presale Item from Delivery

### Steps:
1. Create delivery with presale item
2. Click the **"X"** or delete button on the presale item row
3. Click **"Guardar Cambios"**

### Expected Results:
✅ Presale item removed from delivery
✅ Delivery updates successfully
✅ If it was the only item, an error should appear asking to add items
✅ If other items remain, delivery updates

---

## Test Scenario 7: Presale Item with TODAY's Date

### Steps:
1. Create a presale item with expected date = TODAY
2. In PreSale Alert section on Dashboard, verify it shows scaled/highlighted
3. In Entregas page, add this presale item to delivery

### Expected Results:
✅ In dashboard: Item shown with larger/highlighted appearance
✅ In presale autocomplete: Shows "TODAY" badge/indicator
✅ Can be added to delivery normally
✅ No errors on creation

---

## Test Scenario 8: Database Validation

After successful tests, verify MongoDB:

```bash
# Connect to MongoDB and run:
db.deliveries.findOne({ 
  "items.inventoryItemId": /^presale_/
})
```

### Expected Results:
✅ Presale items stored with `inventoryItemId` = "presale_507f1f77bcf86cd799439011" format
✅ Item has `isSoldAsSeries: true` field
✅ Item has correct `carName`, `quantity`, `unitPrice`
✅ Real inventory items still use ObjectId format

---

## Test Scenario 9: API Endpoint Testing

### Create Delivery with Presale Item

```bash
curl -X POST http://localhost:3000/api/deliveries \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "customer_id_here",
    "items": [
      {
        "inventoryItemId": "presale_507f1f77bcf86cd799439011",
        "carId": "RLC Exclusive Ford GT40 mkii",
        "carName": "RLC Exclusive Ford GT40 mkii",
        "quantity": 1,
        "unitPrice": 1350.00,
        "isSoldAsSeries": true
      }
    ],
    "location": "Store A",
    "scheduledDate": "2024-10-29"
  }'
```

### Expected Response:
```json
{
  "success": true,
  "data": {
    "_id": "delivery_id",
    "customerId": "customer_id_here",
    "items": [
      {
        "inventoryItemId": "presale_507f1f77bcf86cd799439011",
        "carName": "RLC Exclusive Ford GT40 mkii",
        "quantity": 1,
        "unitPrice": 1350.00
      }
    ],
    "status": "scheduled",
    "totalAmount": 1350.00
  },
  "message": "Entrega creada exitosamente"
}
```

### Expected Behavior:
✅ Status 201 (Created)
✅ success: true
✅ No validation errors
✅ Delivery saved with presale item

---

## Debugging

### If you get validation error:
1. Check that presale item ID starts with "presale_"
2. Verify `isSoldAsSeries: true` is set on presale items
3. Check backend logs for specific error message

### Backend Logs to Look For:
```
✅ Should NOT see: "Pieza no encontrada: presale_xxx"
✅ Should see: Normal save operation
✅ Check for any database errors
```

### Frontend Console:
```javascript
// Should show successful mutation
console.log("createDeliveryMutation:", response)
// Should NOT show validation errors about presale items
```

---

## Success Indicators

✅ All tests pass without validation errors
✅ Presale items create deliveries successfully
✅ Purple styling differentiates presale from inventory
✅ Presale item fields properly disabled
✅ Mixed presale + inventory deliveries work
✅ Database stores presale items correctly
✅ No "Los items seleccionados pueden ya no estar disponibles" errors

---

## Quick Reference

| Test | Status | Notes |
|------|--------|-------|
| Add presale to delivery | ⬜ | Watch for purple styling |
| Create delivery | ⬜ | Should have NO error |
| Mixed items | ⬜ | Both types should work |
| Edit delivery | ⬜ | Presale stays disabled |
| Complete delivery | ⬜ | Presale not in sales |
| Remove presale item | ⬜ | Item deleted cleanly |
| TODAY highlighting | ⬜ | Special presale visual |
| Database check | ⬜ | Verify presale_ prefix |
| API endpoint test | ⬜ | Status 201 success |

---

**Date:** October 29, 2024
**Build:** After presale delivery fix
**Ready for:** User testing and deployment verification
