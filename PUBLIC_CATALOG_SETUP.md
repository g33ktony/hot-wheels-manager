# Public Catalog Browser - Setup Guide

## ✅ Implementation Complete!

The public catalog browser has been successfully implemented. This feature allows anonymous users to browse your Hot Wheels catalog, see availability and pricing, and contact you via Facebook Messenger.

---

## 🔧 Required Setup

### 1. Environment Variables

#### Backend (.env)

Add these variables to `/backend/.env`:

```bash
# Google reCAPTCHA v3
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key_here

# Rate Limiting (optional - defaults provided)
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100          # Public catalog limit
```

#### Frontend (.env)

Add these variables to `/frontend/.env`:

```bash
# Google reCAPTCHA v3
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key_here

# Facebook Messenger
VITE_FACEBOOK_PAGE_ID=your_facebook_page_id_here
```

---

## 🔑 Getting API Keys

### Google reCAPTCHA v3

1. **Go to:** https://www.google.com/recaptcha/admin/create
2. **Select:** reCAPTCHA v3
3. **Add domains:**
   - `localhost` (for development)
   - Your production domain (e.g., `yoursite.com`)
4. **Copy keys:**
   - **Site Key** → Frontend `.env` as `VITE_RECAPTCHA_SITE_KEY`
   - **Secret Key** → Backend `.env` as `RECAPTCHA_SECRET_KEY`

### Facebook Page ID (for Messenger)

**Option 1: From Page Settings**
1. Go to your Facebook Page
2. Click "About" → "Page Transparency"
3. Find "Page ID" under "More Info"

**Option 2: From URL**
1. Go to your Facebook Page
2. Look at the URL: `https://www.facebook.com/[PAGE_ID]`
3. The number after `/` is your Page ID

**Copy the Page ID:**
- Add to Frontend `.env` as `VITE_FACEBOOK_PAGE_ID`

---

## 📁 Files Created

### Backend
```
/backend/src
  /models
    Lead.ts                              ✅ Lead tracking with estado/municipio
  /controllers
    publicController.ts                  ✅ Search catalog, create leads, track views
  /routes
    publicRoutes.ts                      ✅ Public API routes
  /middleware
    rateLimiter.ts                       ✅ Public & lead rate limiters
  index.ts                               ✅ Integrated public routes
```

### Frontend
```
/frontend/src
  /pages/public
    CatalogBrowser.tsx                   ✅ Main catalog browser page
  /components/public
    PublicLayout.tsx                     ✅ Public-facing layout
    LeadCaptureModal.tsx                 ✅ Lead form with reCAPTCHA
    CatalogItemDetailModal.tsx           ✅ Item details with Messenger link
  /services
    public.ts                            ✅ Public API service (no auth)
  App.tsx                                ✅ Routes updated (/ → /browse)
  index.html                             ✅ reCAPTCHA script added
```

---

## 🚀 Features Implemented

### ✅ Public Catalog Browser (`/browse`)

**Search & Filters:**
- Text search (model, series, car make)
- Year filter (2000-2024)
- Series filter
- Pagination (20 items per page)

**Catalog Display:**
- Grid layout (1-4 columns responsive)
- Photos with full-screen viewer
- Model details (series, year, color, etc.)

**Inventory Integration:**
- Shows **"Disponible"** badge for in-stock items
- Displays **your price** for available items
- Shows **eBay price** comparison (if available in catalog)
- **"Entrega inmediata"** label for available items

### ✅ Lead Capture System

**Required Before Browsing:**
- Name, Email
- Estado (Mexican state selector)
- Municipio (city/municipality)
- Optional: Phone, Message

**Features:**
- Google reCAPTCHA v3 verification (spam protection)
- Rate limiting (5 submissions/hour per IP)
- localStorage persistence (no need to re-submit)
- Email uniqueness (updates existing leads)
- Tracks viewed items for analytics

### ✅ Item Detail Modal

**For Available Items:**
- Full item details
- Your price prominently displayed
- eBay price comparison (strikethrough)
- Stock quantity
- **Facebook Messenger** button with pre-filled message
- Full-screen image viewer

**For Out-of-Stock Items:**
- "Notify when available" button
- Captures lead with specific item interest
- Tracks `requestType: 'notify'`

### ✅ Facebook Messenger Integration

When user clicks "Contactar por Messenger":
- Opens Facebook Messenger
- Pre-fills message with:
  ```
  Hola! Estoy interesado en: [Model Name]
  Serie: [Series]
  Año: [Year]
  Link: [Current URL]
  ```

### ✅ Security Features

**Backend:**
- Rate limiting (100 req/15min for catalog, 5 req/hour for leads)
- reCAPTCHA v3 verification (score > 0.5)
- No authentication required (public access)
- Explicit field selection (no data leakage)
- No inventory/sales data exposed

**Frontend:**
- Separate API client (no auth tokens sent)
- Lead form validation
- reCAPTCHA integration
- localStorage for lead capture tracking

---

## 🧪 Testing Checklist

### Local Testing

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test Public Catalog:**
   - Go to `http://localhost:5173/` → Should redirect to `/browse`
   - Search for a model (e.g., "Corvette")
   - Apply filters (year, series)
   - Click pagination

4. **Test Lead Capture:**
   - Click on any item → Should show lead form
   - Fill out form (valid email, select estado, enter municipio)
   - Submit → Should show success message
   - Refresh page → Should NOT show form again (localStorage check)

5. **Test Item Details:**
   - After lead captured, click on an available item
   - Verify pricing displays
   - Click "Contactar por Messenger" → Should open Messenger
   - Click photo → Should open full-screen viewer

6. **Test Out-of-Stock Flow:**
   - Click on unavailable item
   - Click "Notificarme cuando esté disponible"
   - Verify lead form pre-fills with item details

7. **Test Rate Limiting:**
   - Clear localStorage
   - Submit lead form 6 times within 1 hour
   - 6th submission should fail with rate limit error

8. **Test Admin Access:**
   - Navigate to `/login`
   - Log in with admin credentials
   - Verify all admin features work normally

---

## 📊 Lead Management

### View Leads in Database

**MongoDB Shell:**
```bash
use hotwheels
db.leads.find().pretty()
```

**Query Examples:**
```javascript
// Get all leads from a specific estado
db.leads.find({ estado: "Nuevo León" })

// Get leads interested in specific item
db.leads.find({ "interestedInItem.catalogId": "CATALOG_ID" })

// Get leads who requested notifications
db.leads.find({ "interestedInItem.requestType": "notify" })

// Count leads per estado
db.leads.aggregate([
  { $group: { _id: "$estado", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

### Future Enhancement: Admin Lead Dashboard

Can be added later:
- View all leads in admin panel
- Filter by estado/municipio
- Contact status tracking
- Email integration for notifications

---

## 🔐 Security Best Practices

### reCAPTCHA
- **v3 is invisible** - no user interaction needed
- **Score threshold: 0.5** - balance between UX and security
- **Monitor scores** - adjust threshold if needed
- **Action name: 'submit_lead'** - tracks specific action

### Rate Limiting
- **Catalog: 100 req/15min** - prevents scraping
- **Leads: 5 req/hour** - prevents spam
- **IP-based** - tracks by client IP
- **Bypass in dev mode** - easier testing

### Data Privacy
- **No sensitive data exposed** - catalog data only
- **Email encryption** - stored securely
- **GDPR compliance** - user consent implicit in form submission
- **No tracking cookies** - only localStorage for UX

---

## 🚢 Deployment Checklist

### Before Deploying to Production

- [ ] Set `RECAPTCHA_SECRET_KEY` in backend env
- [ ] Set `VITE_RECAPTCHA_SITE_KEY` in frontend env
- [ ] Set `VITE_FACEBOOK_PAGE_ID` in frontend env
- [ ] Add production domain to reCAPTCHA allowed domains
- [ ] Test reCAPTCHA in production (not localhost)
- [ ] Verify rate limiting works in production
- [ ] Test Messenger integration from production URL
- [ ] Add SEO meta tags (if not already present)
- [ ] Test mobile responsiveness
- [ ] Verify HTTPS is enabled (reCAPTCHA requires HTTPS in prod)

### SEO Optimization (Optional)

Add to `/frontend/index.html`:
```html
<meta name="description" content="Explora nuestro catálogo de Hot Wheels. Miles de modelos disponibles para coleccionistas.">
<meta name="keywords" content="hot wheels, catálogo, coleccionables, diecast">
<meta property="og:title" content="Hot Wheels Catalog Browser">
<meta property="og:description" content="Explora miles de modelos Hot Wheels">
<meta property="og:image" content="/og-image.jpg">
```

---

## 🎨 Customization Options

### Branding

**Change Logo/Brand Name:**
- Edit `/frontend/src/components/public/PublicLayout.tsx`
- Update emoji (🏎️) or add custom logo image

**Change Colors:**
- Availability badge: Line 263 in `CatalogBrowser.tsx`
- Button colors: Use Tailwind classes in components
- Theme: Already supports dark/light mode

### Messaging

**Pre-filled Messenger Text:**
- Edit `getMessengerLink()` in `CatalogItemDetailModal.tsx`
- Customize the message template

**Lead Form Fields:**
- Add/remove fields in `LeadCaptureModal.tsx`
- Update backend `Lead` model to match

**Email Templates (Future):**
- Install email service (SendGrid, Mailgun)
- Send confirmation emails to leads
- Send notification emails to admin

---

## 🐛 Troubleshooting

### reCAPTCHA Not Working

**Error: "reCAPTCHA token is required"**
- Check `VITE_RECAPTCHA_SITE_KEY` is set in frontend `.env`
- Verify reCAPTCHA script loaded (check browser console)
- Ensure domain is added to reCAPTCHA admin panel

**Error: "Verificación de reCAPTCHA falló"**
- Check `RECAPTCHA_SECRET_KEY` is set in backend `.env`
- Verify keys match (site key ↔ secret key pair)
- Check reCAPTCHA score threshold (currently 0.5)

### Messenger Link Not Working

**Button doesn't open Messenger:**
- Check `VITE_FACEBOOK_PAGE_ID` is set
- Verify Page ID is correct (numeric ID, not username)
- Test on mobile device (Messenger app should open)

### Rate Limiting Issues

**Getting rate limited during testing:**
- Clear browser cache and cookies
- Use incognito/private mode
- Wait for rate limit window to expire
- Temporarily increase limits in `.env` for testing

### No Items Showing

**Catalog search returns empty:**
- Verify MongoDB has Hot Wheels catalog data
- Check backend console for errors
- Test API directly: `GET http://localhost:3001/api/public/catalog/search?q=test`

**Items show but no availability:**
- Verify you have inventory items with `quantity > 0`
- Check `carId` matches between catalog and inventory
- Ensure `reservedQuantity` is less than `quantity`

---

## 📈 Future Enhancements

### Short-term
- [ ] Admin dashboard to view/manage leads
- [ ] Email notifications when leads submit
- [ ] WhatsApp integration (alternative to Messenger)
- [ ] Export leads to CSV
- [ ] Lead status tracking (contacted, converted, etc.)

### Medium-term
- [ ] Auto-reply email to leads
- [ ] Add eBay price data to catalog
- [ ] Image gallery (multiple photos per item)
- [ ] Wishlist functionality for leads
- [ ] Share catalog items on social media

### Long-term
- [ ] Public API for third-party integrations
- [ ] Mobile app (React Native)
- [ ] Multi-language support
- [ ] Advanced search (by color, wheel type, etc.)
- [ ] AI-powered recommendations

---

## ✅ Summary

**What's Implemented:**
- ✅ Public catalog browser with search & filters
- ✅ Inventory availability integration
- ✅ Pricing display (your price + eBay comparison)
- ✅ Lead capture with estado/municipio
- ✅ Google reCAPTCHA v3 protection
- ✅ Facebook Messenger integration
- ✅ Rate limiting & security
- ✅ Mobile-responsive design
- ✅ Dark/light theme support

**What You Need to Do:**
1. Get Google reCAPTCHA keys
2. Get Facebook Page ID
3. Add environment variables
4. Test locally
5. Deploy to production

**Routes:**
- `/` → Redirects to `/browse` (public catalog)
- `/browse` → Public catalog browser
- `/login` → Admin login (existing)
- `/dashboard` → Admin dashboard (protected)

**Contact for Support:**
If you encounter issues during setup, check the troubleshooting section above or review the implementation in the created files.

---

🎉 **Congratulations! Your public catalog is ready to launch!**
