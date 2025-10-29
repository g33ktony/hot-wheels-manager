# Pre-Sale System - Environment Setup & Deployment Guide

## 🛠️ Environment Configuration

### Backend Environment Variables

Add these to your `.env` file (or configure in your deployment platform):

```env
# Database - existing settings
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database

# Pre-Sale Configuration
PRESALE_DEFAULT_MARKUP_PERCENTAGE=15
PRESALE_PAYMENT_REMINDER_DAYS=3
PRESALE_ARCHIVE_AFTER_DAYS=90

# Features
ENABLE_PRESALE_SYSTEM=true
```

### Frontend Environment Variables

Add to `.env.local`:

```env
# API endpoints
VITE_API_BASE_URL=http://localhost:3000/api

# Feature flags
VITE_ENABLE_PRESALE=true
VITE_PRESALE_DEFAULT_MARKUP=15
```

---

## 📦 Dependencies

### No New Backend Dependencies Required!
✅ Uses existing: mongoose, express, typescript

### No New Frontend Dependencies Required!
✅ Uses existing: react, react-router, axios/fetch

### Optional Enhancements (if desired)
```bash
# For charts (quantity visualization)
npm install recharts

# For date handling (already likely present)
npm install date-fns

# For form validation (already likely present)
npm install react-hook-form zod
```

---

## 🔄 Migration Path (if adapting existing purchases)

### Option 1: Mark Future Purchases Only (Recommended)
- New purchases from this point forward can be marked as pre-sale
- Existing purchases remain as-is
- No data migration needed

### Option 2: Convert Existing Purchases (Optional)
```bash
# Create migration script: backend/src/scripts/migrateToPresale.ts

# Run manually if needed:
npm run migrate:presale

# Script would:
# 1. Identify eligible purchases (received items, specific suppliers, etc.)
# 2. Mark as isPresale: true
# 3. Create corresponding PreSaleItems
# 4. Preserve existing delivery data
```

---

## 🚀 Deployment Checklist

### Pre-Deployment Testing
- [ ] Backend unit tests passing
- [ ] Frontend components rendering correctly
- [ ] Full workflow tested locally:
  - [ ] Create purchase with isPresale=true
  - [ ] Mark as received → PreSaleItem created
  - [ ] Create delivery with pre-sale item
  - [ ] Create payment plan
  - [ ] Record payments
  - [ ] Verify dashboard stats
- [ ] Payment calculations verified
- [ ] Quantity constraints tested
- [ ] Edge cases tested (overpayment, early completion, overdue)

### Database Migration (First Deployment)
```javascript
// MongoDB - run once before deploying new code
// Creates indexes for performance

db.presaleitems.createIndex({ "carId": 1 })
db.presaleitems.createIndex({ "preSaleStatus": 1 })
db.presaleitems.createIndex({ "linkedPurchaseIds": 1 })

db.presaleypaymentplans.createIndex({ "deliveryId": 1 })
db.presaleypaymentplans.createIndex({ "status": 1 })
db.presaleypaymentplans.createIndex({ "customerId": 1 })

// Update existing Purchase collection
db.purchases.updateMany(
  { isPresale: { $exists: false } },
  { $set: { isPresale: false } }
)

// Update existing Delivery collection
db.deliveries.updateMany(
  { hasPresaleItems: { $exists: false } },
  { $set: { hasPresaleItems: false } }
)
```

### Vercel Deployment (Frontend)
```bash
# Your existing deployment flow continues
# No special configuration needed
git push origin feature/presale-system
# Vercel auto-deploys on push

# Or manual:
vercel --prod
```

### Backend Deployment (Railway/Custom)
```bash
# Build as usual
npm run build

# Run migrations if first deployment
npm run migrate:presale

# Start server
npm start

# Verify health check
curl https://your-api.com/api/presale-items
```

---

## 🧪 Testing Strategy

### Unit Tests

```typescript
// backend/src/tests/PreSaleItem.test.ts
describe('PreSaleItemService', () => {
  it('should create presale item on purchase receipt', async () => {
    // Test aggregation logic
  })

  it('should calculate correct available quantity', () => {
    // 3 total - 2 assigned = 1 available
  })

  it('should prevent over-allocation', () => {
    // Cannot assign unit to 4th delivery if only 3 exist
  })

  it('should recalculate pricing with markup', () => {
    // $5.99 × 1.15 = $6.89
  })
})

// backend/src/tests/PreSalePayment.test.ts
describe('PreSalePaymentPlan', () => {
  it('should calculate fixed payment amount', () => {
    // $100 / 3 = $33.33
  })

  it('should handle exact payment', () => {
    // Balance reduces correctly
  })

  it('should handle overpayment', () => {
    // Extra amount applied to next payment
  })

  it('should detect early completion', () => {
    // All payments made early → status COMPLETED
  })

  it('should detect overdue', () => {
    // Today > limitDate && balance > 0 → status OVERDUE
  })
})
```

### Integration Tests

```typescript
// backend/src/tests/presale.integration.test.ts
describe('Pre-Sale Full Workflow', () => {
  it('should complete full purchase → delivery → payment cycle', async () => {
    // 1. Create purchase with isPresale
    // 2. Verify PreSaleItem created
    // 3. Create delivery
    // 4. Create payment plan
    // 5. Record payment
    // 6. Verify stats updated
  })

  it('should handle mixed deliveries (presale + normal)', async () => {
    // Create delivery with both types
    // Verify payment plan only for presale
  })

  it('should prevent quantity violations', async () => {
    // Try to assign more than available
    // Should fail with validation error
  })
})
```

### Frontend Tests

```typescript
// frontend/src/components/PreSale/PreSaleItemsTable.test.tsx
describe('PreSaleItemsTable', () => {
  it('should render items correctly', () => {
    // Test component rendering
  })

  it('should filter by status', async () => {
    // Test filter functionality
  })

  it('should open details modal', () => {
    // Test modal opening
  })
})

// frontend/src/components/PreSale/PaymentPlanForm.test.tsx
describe('PaymentPlanForm', () => {
  it('should calculate fixed amount correctly', () => {
    // $100 / 3 = $33.33
  })

  it('should validate dates', () => {
    // limit > first payment
  })

  it('should show payment schedule', () => {
    // Calculate dates properly
  })
})
```

### E2E Tests

```bash
# Using Cypress or Playwright
npm run test:e2e

# Test scenarios:
1. Create pre-sale purchase
2. Mark as received
3. View in pre-sale dashboard
4. Create delivery
5. Record payment
6. Verify dashboard stats updated
7. Test payment adjustments
8. Test overdue detection
```

---

## 📊 Database Backup Strategy

### Before Deployment
```bash
# Backup MongoDB
mongoexport --uri=mongodb+srv://... --collection=purchases --out=purchases_backup.json
mongoexport --uri=mongodb+srv://... --collection=deliveries --out=deliveries_backup.json

# Or use:
mongodump --uri=mongodb+srv://... --out=./backup
```

### Rollback Plan
If issues occur after deployment:

```bash
# 1. Stop the application
# 2. Restore from backup
mongorestore --uri=mongodb+srv://... ./backup

# 3. Revert code
git checkout main  # or previous tag
npm install
npm start

# 4. Investigate issues
# 5. Fix and test locally
# 6. Re-deploy
```

---

## 🔐 Security Considerations

### Input Validation
```typescript
// Validate all incoming data
interface CreatePaymentPlanRequest {
  deliveryId: string      // Validate ObjectId format
  totalAmount: number     // Must be > 0
  numberOfPayments: number  // Must be 1-12
  firstPaymentDate: Date  // Must be valid future date
  limitDate: Date         // Must be after firstPaymentDate
}

// Sanitize in middleware
router.post('/payment-plan', validateRequest, async (req, res) => {
  // ... handle
})
```

### Authorization
```typescript
// Ensure user can only:
// - Create deliveries for customers they manage
// - Record payments for their own deliveries
// - Update their own pre-sale items

// Add checks:
if (user._id !== delivery.customerId) {
  return res.status(403).json({ error: 'Unauthorized' })
}
```

### Audit Trail
```typescript
// All payment changes logged
interface PaymentLog {
  paymentId: ObjectId
  userId: ObjectId
  action: 'created' | 'modified' | 'deleted'
  timestamp: Date
  previousValue?: any
  newValue: any
}

// Implement in PreSalePaymentService
PreSalePaymentService.recordPayment = async (paymentPlanId, amount, method) => {
  // ... create payment
  // ... log action
}
```

---

## 📈 Performance Optimization

### Indexes
Already included in models:
```javascript
// PreSaleItem indexes
db.presaleitems.createIndex({ carId: 1 })
db.presaleitems.createIndex({ preSaleStatus: 1 })
db.presaleitems.createIndex({ linkedPurchaseIds: 1 })

// PreSalePaymentPlan indexes
db.presaleypaymentplans.createIndex({ deliveryId: 1 })
db.presaleypaymentplans.createIndex({ status: 1 })
db.presaleypaymentplans.createIndex({ customerId: 1 })
db.presaleypaymentplans.createIndex({ 
  customerId: 1, 
  status: 1  // Composite for common queries
})
```

### Query Optimization
```typescript
// ✅ Good: Populate only needed fields
PreSaleItem.findById(id)
  .select('carId totalQuantity availableQuantity finalSalePrice')
  .populate('linkedPurchaseIds', 'purchaseDate supplerId')

// ❌ Avoid: Populating everything
PreSaleItem.findById(id).populate('*')

// Use lean() for read-only queries
PreSaleItem.find({ status: 'received' }).lean()
```

### Caching Strategy (Optional)
```typescript
// Cache frequently accessed pre-sale items
import NodeCache from 'node-cache'
const cache = new NodeCache({ stdTTL: 300 }) // 5 min TTL

PreSaleItemService.getPreSaleItem = async (id) => {
  const cached = cache.get(id)
  if (cached) return cached
  
  const item = await PreSaleItem.findById(id)
  cache.set(id, item)
  return item
}

// Invalidate on update
PreSaleItemService.updatePreSaleItem = async (id, updates) => {
  const item = await PreSaleItem.findByIdAndUpdate(id, updates)
  cache.del(id)  // Clear cache
  return item
}
```

---

## 🚨 Monitoring & Alerts

### Key Metrics to Monitor
```typescript
// 1. Overdue payments
SELECT COUNT(*) FROM PreSalePaymentPlan 
WHERE status = 'overdue'

// 2. Average payment cycle time
SELECT AVG(DATEDIFF(day, firstPaymentDate, completionDate))

// 3. Pre-sale revenue per month
SELECT SUM(totalAmount) FROM PreSalePaymentPlan
WHERE MONTH(createdAt) = MONTH(NOW())

// 4. Payment success rate
SELECT COUNT(CASE WHEN status = 'completed' THEN 1 END) / COUNT(*) 
FROM PreSalePaymentPlan

// 5. Most popular pre-sale items
SELECT carId, COUNT(*) FROM PreSaleItem
GROUP BY carId ORDER BY COUNT(*) DESC LIMIT 10
```

### Alert Rules
```yaml
# Prometheus/Grafana alerts

- Alert if overdue_payments_count > 10
- Alert if failed_payment_creation > 5 in 1 hour
- Alert if database_query_time > 2 seconds
- Alert if API_presale_error_rate > 5%
```

---

## 📋 Documentation for Users

### User Guide (Optional - Create After Launch)
```markdown
# Pre-Sale Feature Guide

## Creating a Pre-Sale Purchase
1. Go to Purchases → New
2. Check "Is Pre-Sale"
3. Set scheduled release date (optional)
4. Set markup percentage (default 15%)
5. Save

## Managing Pre-Sale Deliveries
1. Go to Pre-Sale Dashboard
2. Find item in "Items to Receive" tab
3. Click "Assign to Delivery"
4. Set customer and quantity
5. Optional: Enable payment plan
6. Save

## Recording Payments
1. Go to delivery details
2. Scroll to payment plan section
3. Click "Record Payment"
4. Enter amount and method
5. Save - status updates automatically

## Dashboard Stats
- Total pre-sale revenue
- Total pre-sale profit
- Payment status summary
```

---

## ✅ Final Deployment Checklist

- [ ] All code reviewed and approved
- [ ] Unit tests passing (>80% coverage)
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Performance tested (queries < 500ms)
- [ ] Security audit completed
- [ ] Database backups created
- [ ] Rollback plan documented
- [ ] Monitoring setup
- [ ] Alert rules configured
- [ ] Documentation complete
- [ ] Team trained on new features
- [ ] User guide prepared (if needed)
- [ ] Staging environment tested
- [ ] Production configuration prepared
- [ ] Go-live approval obtained
- [ ] Post-deployment health check plan ready

---

## 🎉 Success Criteria

Your deployment is successful when:

✅ Pre-sale purchase creation works end-to-end
✅ PreSaleItem aggregation happens automatically
✅ Deliveries can be created with pre-sale items
✅ Payment plans track correctly
✅ Payment recording updates balances
✅ Dashboard shows pre-sale stats
✅ No database errors in logs
✅ API response times < 500ms
✅ User can complete full workflow
✅ No data loss or corruption

---

## 📞 Support

### If Issues Occur
1. Check logs: `docker logs <container>` or cloud provider logs
2. Verify database connection
3. Check API endpoints with Postman
4. Review recent code changes
5. Reference architecture documents
6. Roll back if critical issue
7. Create issue with:
   - Error message
   - Steps to reproduce
   - Expected vs actual behavior
   - Logs/screenshots

---

## 🔄 Continuous Improvement

### Post-Launch
- Monitor performance metrics
- Collect user feedback
- Track error rates
- Optimize slow queries
- Document lessons learned
- Plan for v2 features:
  - Payment reminders (email/SMS)
  - Recurring pre-sales
  - Bulk operations
  - Advanced reporting

