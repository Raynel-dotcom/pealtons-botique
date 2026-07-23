/**
 * js/app.js — Supabase client init, product fetch, catalog render,
 *             filters, search, SEO JSON-LD injection, DOMContentLoaded init.
 */

import { formatUGX, showToast, openModal, closeModal, NEUTRAL_PLACEHOLDER_SVG, getFallbackImage, handleImgError } from './utils.js';

// ── Supabase Configuration ────────────────────────────────────────────────────────
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

// Initialize Supabase client (using CDN global)
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// ── State ────────────────────────────────────────────────────────────────────────
let allProducts = [];
let activeCategory = 'all';
let searchDebounceTimer = null;

// Filter state
const filterState = {
  keyword: '',
  category: 'all',
  minPrice: null,
  maxPrice: null
};

// Default filter state for reset
const defaultFilterState = { ...filterState };

// ── Default Seed Products (fallback when Supabase unavailable) ────────────────
const DEFAULT_SEED_PRODUCTS = [
  {
    id: 'seed-1',
    name: 'Classic Black Tuxedo',
    category: 'rent-suits',
    type: 'rent',
    price: 150000,
    stock: 5,
    description: 'Elegant black tuxedo perfect for formal events and weddings.',
    image: 'pics/mens suits/black suit.jfif'
  },
  {
    id: 'seed-2',
    name: 'Designer Handbag',
    category: 'ladies',
    type: 'sale',
    price: 85000,
    stock: 12,
    description: 'Premium leather handbag with gold accents.',
    image: 'pics/hand bags/black bag.jfif'
  },
  {
    id: 'seed-3',
    name: 'Wedding Gown',
    category: 'rent-gowns',
    type: 'rent',
    price: 200000,
    stock: 3,
    description: 'Beautiful white wedding gown with intricate lace details.',
    image: 'pics/women gowns/wedding gowns.jfif'
  },
  {
    id: 'seed-4',
    name: 'Casual T-Shirt',
    category: 'mens',
    type: 'sale',
    price: 45000,
    stock: 25,
    description: 'Comfortable cotton t-shirt for everyday wear.',
    image: 'pics/mens clothes/tshirts.jfif'
  }
];

// ── Product Fetching ─────────────────────────────────────────────────────────────
async function fetchProducts() {
  if (!supabase) {
    console.warn('Supabase not available, using seed products');
    allProducts = DEFAULT_SEED_PRODUCTS;
    return DEFAULT_SEED_PRODUCTS;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    allProducts = data || DEFAULT_SEED_PRODUCTS;
    
    // Dispatch event after products are loaded
    window.dispatchEvent(new CustomEvent('boutique:products-loaded', { detail: allProducts }));
    
    return allProducts;
  } catch (err) {
    console.error('Failed to fetch products:', err);
    allProducts = DEFAULT_SEED_PRODUCTS;
    return DEFAULT_SEED_PRODUCTS;
  }
}

// ── Catalog Rendering ───────────────────────────────────────────────────────────
function renderCatalog(products = allProducts) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  // Apply filters first
  const filtered = applyFilters(products);

  if (filtered.length === 0) {
    grid.innerHTML = `
      <div class="loading-wrap">
        <p style="font-size: 14px; color: var(--gray);">No products match your filters.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filtered.map(product => buildProductCard(product)).join('');
  
  // Attach image load handlers
  grid.querySelectorAll('.product-img-wrap img').forEach(img => {
    img.onload = () => img.classList.add('loaded');
    const product = filtered.find(p => p.id === img.dataset.productId);
    if (product) {
      img.onerror = () => handleImgError(img, getFallbackImage(product));
    }
  });
}

// ── Filter Application ───────────────────────────────────────────────────────────
function applyFilters(products) {
  let filtered = [...products];

  // Filter by keyword (search)
  if (filterState.keyword) {
    const keyword = filterState.keyword.toLowerCase();
    filtered = filtered.filter(p => 
      (p.name && p.name.toLowerCase().includes(keyword)) ||
      (p.description && p.description.toLowerCase().includes(keyword))
    );
  }

  // Filter by category
  if (filterState.category !== 'all') {
    filtered = filtered.filter(p => p.category === filterState.category);
  }

  // Filter by price range
  if (filterState.minPrice !== null) {
    filtered = filtered.filter(p => p.price >= filterState.minPrice);
  }
  if (filterState.maxPrice !== null) {
    filtered = filtered.filter(p => p.price <= filterState.maxPrice);
  }

  return filtered;
}

// ── Filter Event Handlers ───────────────────────────────────────────────────────
function handleSearchInput(value) {
  filterState.keyword = value;
  
  // Debounce search input (300ms)
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }
  
  searchDebounceTimer = setTimeout(() => {
    renderCatalog(allProducts);
  }, 300);
}

function handleFilterChange() {
  // Update filter state from DOM inputs
  const categorySelect = document.getElementById('filterCategory');
  const minPriceInput = document.getElementById('filterMinPrice');
  const maxPriceInput = document.getElementById('filterMaxPrice');
  
  if (categorySelect) {
    filterState.category = categorySelect.value;
  }
  
  if (minPriceInput) {
    filterState.minPrice = minPriceInput.value ? Number(minPriceInput.value) : null;
  }
  
  if (maxPriceInput) {
    filterState.maxPrice = maxPriceInput.value ? Number(maxPriceInput.value) : null;
  }
  
  renderCatalog(allProducts);
}

function clearFilters() {
  // Reset filter state
  Object.assign(filterState, defaultFilterState);
  
  // Reset DOM inputs
  const searchInput = document.getElementById('searchInput');
  const categorySelect = document.getElementById('filterCategory');
  const minPriceInput = document.getElementById('filterMinPrice');
  const maxPriceInput = document.getElementById('filterMaxPrice');
  
  if (searchInput) searchInput.value = '';
  if (categorySelect) categorySelect.value = 'all';
  if (minPriceInput) minPriceInput.value = '';
  if (maxPriceInput) maxPriceInput.value = '';
  
  renderCatalog(allProducts);
}

function buildProductCard(product) {
  const isOutOfStock = product.stock === 0;
  const fallback = getFallbackImage(product);
  const imageUrl = product.image || fallback;
  
  const typeLabel = product.type === 'rent' ? 'For Rent' : 'For Sale';
  const typeClass = product.type === 'rent' ? 'rent' : '';
  
  const stockStatus = isOutOfStock 
    ? '<span class="stock-info stock-out">Out of Stock</span>'
    : product.stock < 5 
      ? `<span class="stock-info stock-low">Only ${product.stock} left</span>`
      : '<span class="stock-info stock-ok">In Stock</span>';

  return `
    <div class="product-card ${isOutOfStock ? 'out-of-stock' : ''}" data-product-id="${product.id}" onclick="window.openProductDetail && window.openProductDetail('${product.id}')">
      <div class="product-img-wrap">
        <div class="img-skeleton"></div>
        <img 
          src="${imageUrl}" 
          alt="${product.name}" 
          data-product-id="${product.id}"
          loading="lazy"
        />
        <span class="product-type-badge ${typeClass}">${typeLabel}</span>
        ${isOutOfStock ? '<span class="out-badge">SOLD OUT</span>' : ''}
        <button 
          class="wishlist-btn" 
          data-product-id="${product.id}"
          onclick="event.stopPropagation(); window.toggleWishlist && window.toggleWishlist('${product.id}')"
        >
          ♡
        </button>
      </div>
      <div class="product-info">
        <div>
          <div class="product-category-tag">${formatCategory(product.category)}</div>
          <div class="product-name">${product.name}</div>
          <div class="product-desc">${product.description || ''}</div>
          <div class="product-price-row">
            <span class="product-price">${formatUGX(product.price)}<small>/${product.type === 'rent' ? 'day' : 'item'}</small></span>
          </div>
          ${stockStatus}
        </div>
        <button 
          class="btn-add-cart" 
          ${isOutOfStock ? 'disabled' : ''}
          onclick="event.stopPropagation(); window.addToCart && window.addToCart('${product.id}')"
        >
          ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
        </button>
      </div>
    </div>
  `;
}

function formatCategory(category) {
  const labels = {
    'mens': "Men's Wear",
    'ladies': "Ladies' Wear",
    'rent-suits': 'Suit Rentals',
    'rent-gowns': 'Gown Rentals'
  };
  return labels[category] || category;
}

// ── Category Filtering ───────────────────────────────────────────────────────────
function filterCategory(category) {
  activeCategory = category;
  
  // Update nav links
  document.querySelectorAll('.nav-links a').forEach(link => {
    link.classList.remove('active');
    if (link.id === `nav-${category}`) link.classList.add('active');
  });
  
  // Update drawer nav links
  document.querySelectorAll('.nav-drawer-links a').forEach(link => {
    link.classList.remove('active');
    if (link.id === `drawer-nav-${category}`) link.classList.add('active');
  });
  
  // Update category buttons
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.id === `cbtn-${category}`) btn.classList.add('active');
  });
  
  renderCatalog();
}

// ── Mobile Navigation Drawer ─────────────────────────────────────────────────────
function openDrawer() {
  const drawer = document.getElementById('navDrawer');
  const overlay = document.getElementById('navDrawerOverlay');
  if (drawer) drawer.classList.add('open');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  const drawer = document.getElementById('navDrawer');
  const overlay = document.getElementById('navDrawerOverlay');
  if (drawer) drawer.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

// ── Scroll to Section ────────────────────────────────────────────────────────────
function scrollToSection(sectionId) {
  const section = document.getElementById(sectionId);
  if (section) {
    section.scrollIntoView({ behavior: 'smooth' });
  }
}

// ── SEO: Dynamic Product JSON-LD Injection ───────────────────────────────────────
function injectProductJsonLd(products) {
  // Remove existing product JSON-LD if present
  const existingScript = document.getElementById('product-json-ld');
  if (existingScript) {
    existingScript.remove();
  }

  // Build JSON-LD structure
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: products.map((product, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'Product',
        name: product.name,
        description: product.description || '',
        offers: {
          '@type': 'Offer',
          price: product.price,
          priceCurrency: 'UGX',
          availability: product.stock > 0 
            ? 'https://schema.org/InStock' 
            : 'https://schema.org/OutOfStock'
        }
      }
    }))
  };

  // Create and inject script tag
  const script = document.createElement('script');
  script.id = 'product-json-ld';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(jsonLd);
  document.head.appendChild(script);
}

// ── Product Detail View ───────────────────────────────────────────────────────────
let selectedSize = null;
let rentalStart = null;
let rentalEnd = null;

// SQL Migration Note for Supabase:
// ALTER TABLE products ADD COLUMN sizes text[] DEFAULT '{}';

function buildProductDetailHTML(product) {
  const fallback = getFallbackImage(product);
  const imageUrl = product.image || fallback;
  const isOutOfStock = product.stock === 0;
  
  const stockStatus = isOutOfStock 
    ? '<span class="pd-stock out-of-stock">Out of Stock</span>'
    : product.stock < 5 
      ? `<span class="pd-stock low-stock">Only ${product.stock} left in stock</span>`
      : '<span class="pd-stock in-stock">In Stock</span>';

  const sizeSelectorHTML = product.sizes && product.sizes.length > 0 
    ? `
      <div class="pd-size-section">
        <label style="font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gray); font-weight:600; margin-bottom:8px; display:block;">Select Size</label>
        <div class="size-chips" id="sizeChips">
          ${product.sizes.map((size, idx) => `
            <button 
              class="size-chip" 
              data-size="${size}"
              onclick="window.selectSize && window.selectSize('${size}')"
            >
              ${size}
            </button>
          `).join('')}
        </div>
        <div class="pd-validation-msg" id="sizeValidationMsg">Please select a size</div>
      </div>
    `
    : '';

  const rentalDatePickerHTML = product.type === 'rent'
    ? `
      <div class="pd-rental-section">
        <label style="font-size:11px; letter-spacing:1.5px; text-transform:uppercase; color:var(--gray); font-weight:600; margin-bottom:8px; display:block;">Rental Period</label>
        <div class="rental-date-row">
          <div>
            <label style="font-size:10px; color:var(--gray); margin-bottom:4px; display:block;">Start Date</label>
            <input 
              type="date" 
              id="rentalStartDate" 
              class="rental-date-input"
              onchange="window.handleRentalDateChange && window.handleRentalDateChange()"
            />
          </div>
          <div>
            <label style="font-size:10px; color:var(--gray); margin-bottom:4px; display:block;">End Date</label>
            <input 
              type="date" 
              id="rentalEndDate" 
              class="rental-date-input"
              onchange="window.handleRentalDateChange && window.handleRentalDateChange()"
            />
          </div>
        </div>
        <div class="rental-cost-preview" id="rentalCostPreview">
          <span style="font-size:12px; color:var(--gray);">Select dates to see total</span>
        </div>
        <div class="pd-validation-msg" id="rentalValidationMsg">Please select rental start and end dates</div>
      </div>
    `
    : '';

  return `
    <div class="pd-gallery">
      <div class="pd-main-img-wrap">
        <img id="pdMainImg" src="${imageUrl}" alt="${product.name}" onerror="handleImgError(this, '${fallback}')" />
      </div>
      <div class="pd-thumbs">
        <div class="pd-thumb active" onclick="window.setMainImage && window.setMainImage('${imageUrl}')">
          <img src="${imageUrl}" alt="${product.name}" />
        </div>
      </div>
    </div>
    <div class="pd-info">
      <div class="pd-category">${formatCategory(product.category)}</div>
      <div class="pd-price">${formatUGX(product.price)}<small>/${product.type === 'rent' ? 'day' : 'item'}</small></div>
      ${stockStatus}
      <div class="pd-description">${product.description || ''}</div>
      ${sizeSelectorHTML}
      ${rentalDatePickerHTML}
      <button 
        class="btn-primary" 
        style="width:100%; margin-top:12px;"
        ${isOutOfStock ? 'disabled' : ''}
        onclick="window.handleDetailAddToCart && window.handleDetailAddToCart('${product.id}')"
      >
        ${isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  `;
}

function openProductDetail(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) {
    showToast('Product not found');
    return;
  }

  // Reset selected size and rental dates
  selectedSize = null;
  rentalStart = null;
  rentalEnd = null;

  // Update modal title
  const titleEl = document.getElementById('pdProductName');
  if (titleEl) titleEl.textContent = product.name;

  // Build and inject content
  const contentEl = document.getElementById('pdContent');
  if (contentEl) {
    contentEl.innerHTML = buildProductDetailHTML(product);
  }

  // Initialize rental date picker if rental product
  if (product.type === 'rent') {
    initRentalDatePicker(product.price);
  }

  // Open modal
  openModal('productDetailModal');
}

function initRentalDatePicker(price) {
  const startDateInput = document.getElementById('rentalStartDate');
  const endDateInput = document.getElementById('rentalEndDate');
  
  if (!startDateInput || !endDateInput) return;

  // Set min date to today
  const today = new Date().toISOString().split('T')[0];
  startDateInput.min = today;
  startDateInput.value = '';
  
  // Set end date min to day after start date (will be updated dynamically)
  endDateInput.min = '';
  endDateInput.value = '';
}

function handleRentalDateChange() {
  const startDateInput = document.getElementById('rentalStartDate');
  const endDateInput = document.getElementById('rentalEndDate');
  const costPreview = document.getElementById('rentalCostPreview');
  
  if (!startDateInput || !endDateInput || !costPreview) return;

  const startValue = startDateInput.value;
  const endValue = endDateInput.value;

  // Update end date min constraint
  if (startValue) {
    const startDate = new Date(startValue);
    const nextDay = new Date(startDate);
    nextDay.setDate(nextDay.getDate() + 1);
    endDateInput.min = nextDay.toISOString().split('T')[0];
  }

  // Calculate rental cost if both dates selected
  if (startValue && endValue) {
    const start = new Date(startValue);
    const end = new Date(endValue);
    
    if (end <= start) {
      costPreview.innerHTML = '<span style="font-size:12px; color:var(--red);">End date must be after start date</span>';
      rentalStart = null;
      rentalEnd = null;
      return;
    }

    const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const currentProduct = allProducts.find(p => document.getElementById('pdProductName').textContent === p.name);
    
    if (currentProduct) {
      const total = currentProduct.price * days;
      costPreview.innerHTML = `<span style="font-size:14px; font-weight:700; color:var(--gold);">${days} day(s) × ${formatUGX(currentProduct.price)} = ${formatUGX(total)}</span>`;
      rentalStart = startValue;
      rentalEnd = endValue;
      
      // Check availability for rental products
      if (supabase && currentProduct.type === 'rent') {
        checkRentalAvailability(currentProduct.id, startValue, endValue, costPreview);
      }
    }
  } else {
    costPreview.innerHTML = '<span style="font-size:12px; color:var(--gray);">Select dates to see total</span>';
    rentalStart = null;
    rentalEnd = null;
  }

  // Hide validation message
  const validationMsg = document.getElementById('rentalValidationMsg');
  if (validationMsg) {
    validationMsg.classList.remove('show');
  }
}

// SQL Migration Note for Supabase:
// ALTER TABLE order_items ADD COLUMN rental_start timestamptz;
// ALTER TABLE order_items ADD COLUMN rental_end timestamptz;

async function checkRentalAvailability(productId, startDate, endDate, costPreviewElement) {
  if (!supabase) return;

  try {
    // Check for overlapping rental periods in order_items
    // Overlap condition: (new_start <= existing_end) AND (new_end >= existing_start)
    const { data, error } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', productId)
      .gte('rental_end', startDate)
      .lte('rental_start', endDate);

    if (error) {
      console.error('Availability check failed:', error);
      return;
    }

    // If any overlapping orders found, show unavailable message
    if (data && data.length > 0) {
      costPreviewElement.innerHTML = '<span style="font-size:12px; color:var(--red);">⚠️ This item is unavailable for the selected dates</span>';
      rentalStart = null;
      rentalEnd = null;
    }
  } catch (err) {
    console.error('Availability check error:', err);
  }
}

function setMainImage(src) {
  const mainImg = document.getElementById('pdMainImg');
  if (mainImg) {
    mainImg.src = src;
  }
}

function selectSize(size) {
  selectedSize = size;
  
  // Update chip styles
  document.querySelectorAll('.size-chip').forEach(chip => {
    chip.classList.remove('active');
    if (chip.dataset.size === size) {
      chip.classList.add('active');
    }
  });
  
  // Hide validation message
  const validationMsg = document.getElementById('sizeValidationMsg');
  if (validationMsg) {
    validationMsg.classList.remove('show');
  }
}

function handleDetailAddToCart(productId) {
  const product = allProducts.find(p => p.id === productId);
  if (!product) return;

  // Check size selection for products with sizes
  if (product.sizes && product.sizes.length > 0 && !selectedSize) {
    const validationMsg = document.getElementById('sizeValidationMsg');
    if (validationMsg) {
      validationMsg.classList.add('show');
    }
    return;
  }

  // Check rental dates for rental products
  if (product.type === 'rent' && (!rentalStart || !rentalEnd)) {
    const validationMsg = document.getElementById('rentalValidationMsg');
    if (validationMsg) {
      validationMsg.classList.add('show');
    }
    return;
  }

  // Call cart add function (will be implemented in cart.js)
  if (window.addToCart) {
    window.addToCart(productId, selectedSize, rentalStart, rentalEnd);
  } else {
    showToast('Cart functionality not yet available');
  }
}

// ── Initialization ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  // Expose functions to window for inline HTML handlers
  window.allProducts = allProducts;
  window.renderCatalog = renderCatalog;
  window.filterCategory = filterCategory;
  window.scrollToSection = scrollToSection;
  window.openProductDetail = openProductDetail;
  window.openDrawer = openDrawer;
  window.closeDrawer = closeDrawer;
  window.setMainImage = setMainImage;
  window.selectSize = selectSize;
  window.handleDetailAddToCart = handleDetailAddToCart;
  window.handleSearchInput = handleSearchInput;
  window.handleFilterChange = handleFilterChange;
  window.clearFilters = clearFilters;
  window.handleRentalDateChange = handleRentalDateChange;
  
  // Fetch and render products
  await fetchProducts();
  renderCatalog();
  
  // Inject product JSON-LD for SEO
  injectProductJsonLd(allProducts);
});
