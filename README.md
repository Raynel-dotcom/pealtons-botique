# 🛍️ ÉLITE BOUTIQUE — Supabase E-Commerce Frontend

A modern, high-performance boutique e-commerce web application powered directly by **Supabase**.

## ⚡ Architecture
- **Frontend:** Single-page HTML/CSS/Vanilla JS (`index.html`) using `@supabase/supabase-js` CDN client.
- **Backend & Database:** Supabase PostgreSQL with Row Level Security (RLS) policies.
- **Storage:** Supabase Storage (`product-images` bucket).
- **Authentication:** Supabase Auth (Email & Password).

---

## 🚀 How to Run Locally

No build tools, Node, Python, or npm servers are required!

1. Open `index.html` (or `frontend/index.html`) directly in any modern web browser.
2. Alternatively, serve using any static web server (VS Code Live Server, GitHub Pages, Vercel, Netlify).

---

## 🔑 Database Tables & Setup
- `products`: Product catalog items with image URLs, stock, pricing, and category (`mens`, `ladies`, `rent-suits`, `rent-gowns`).
- `orders`: Orders placed by guest or registered customers.
- `profiles`: Customer and admin profiles (`role = 'admin'` or `'customer'`).
- `product-images`: Public read Supabase Storage bucket for product photo uploads.
