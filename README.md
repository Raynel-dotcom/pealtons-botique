# 🛍️ Pealtons Boutique — Modern E-Commerce Frontend

A modern, high-performance boutique e-commerce web application powered directly by **Supabase**.

## ⚡ Architecture
- **Frontend:** Modular HTML/CSS/Vanilla JS with ES modules (`index.html`, `css/`, `js/`) using `@supabase/supabase-js` CDN client.
- **Backend & Database:** Supabase PostgreSQL with Row Level Security (RLS) policies.
- **Storage:** Supabase Storage (`product-images` bucket).
- **Authentication:** Supabase Auth (Email & Password).
- **Payment:** Flutterwave Mobile Money integration (MTN, Airtel).

---

## 📁 Project Structure

```
pealtons-botique/
├── index.html              # Single entry point (HTML markup)
├── css/
│   └── styles.css          # All styles (variables, components, responsive)
├── js/
│   ├── utils.js            # Shared helpers (formatUGX, showToast, modals)
│   ├── app.js              # Supabase client, product fetch, catalog render, filters
│   ├── auth.js             # Authentication, wishlist management
│   ├── cart.js             # Shopping cart, checkout
│   ├── admin.js            # Admin dashboard, product management
│   └── payment.js          # Flutterwave payment integration
├── pics/                   # Local product images
├── sitemap.xml             # SEO sitemap
└── README.md
```

---

## 🚀 How to Run Locally

No build tools, Node, Python, or npm servers are required!

1. Open `index.html` directly in any modern web browser.
2. Alternatively, serve using any static web server (VS Code Live Server, GitHub Pages, Vercel, Netlify).

---

## 🔑 Database Tables & Setup
- `products`: Product catalog items with image URLs, stock, pricing, category, and sizes array.
- `orders`: Orders placed by guest or registered customers with payment_ref and status.
- `profiles`: Customer and admin profiles (`role = 'admin'` or `'customer'`).
- `wishlists`: User wishlist items with UNIQUE constraint on (user_id, product_id).
- `notification_logs`: SMS/WhatsApp notification error logging.
- `product-images`: Public read Supabase Storage bucket for product photo uploads.

---

## ✨ Features Implemented
- **Responsive Navigation:** Mobile hamburger menu with drawer
- **Product Catalog:** Dynamic rendering with Supabase fallback to seed products
- **Product Detail View:** Modal with gallery, size selection, stock status
- **Search & Filters:** Debounced search, category, price range filtering
- **WhatsApp FAB:** Floating chat button for customer support
- **SEO:** Dynamic JSON-LD injection, meta tags, sitemap
- **Size Selection:** Chip-based size picker with validation
- **Cart System:** Add to cart, quantity management, checkout flow
- **Authentication:** Login/register, user profiles, admin dashboard
- **Payment Integration:** Flutterwave Mobile Money (MTN, Airtel)
- **Wishlist:** Save items for later (authenticated users)
- **Rental System:** Date picker, cost preview, availability checking
- **Admin Dashboard:** Product CRUD, order management, stats
- **Order Notifications:** SMS/WhatsApp via Africa's Talking Edge Function

---

## 🎨 Design System

### Colors
- **Gold**: `#C9A962` - Primary accent
- **Black**: `#1A1A1A` - Primary text
- **White**: `#FFFFFF` - Background
- **Cream**: `#F5F1EB` - Secondary background
- **Gray**: `#888888` - Secondary text
- **Green**: `#27AE60` - Success/stock
- **Red**: `#E74C3C` - Error/out of stock

### Typography
- **Headings**: Cormorant Garamond (serif)
- **Body**: System sans-serif

### Breakpoints
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

---

## 🔑 Configuration

Update the Supabase credentials in `js/app.js`:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

Update the Flutterwave public key in `js/payment.js`:

```javascript
const FLUTTERWAVE_PUBLIC_KEY = 'YOUR_FLUTTERWAVE_PUBLIC_KEY';
```

---

## 📝 SQL Migration Notes

The following migrations are documented in the code:

### Products Table
```sql
ALTER TABLE products ADD COLUMN sizes text[] DEFAULT '{}';
```

### Orders Table
```sql
ALTER TABLE orders ADD COLUMN payment_ref text;
ALTER TABLE orders ADD COLUMN status text DEFAULT 'pending';
```

### Order Items Table (for rentals)
```sql
CREATE TABLE order_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid REFERENCES orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  rental_start timestamptz,
  rental_end timestamptz,
  created_at timestamptz DEFAULT now()
);
```

---

## 🤝 Support

For questions or support, contact via WhatsApp at +256772387102.

---

## 📄 License

Proprietary - Pealtons Boutique
