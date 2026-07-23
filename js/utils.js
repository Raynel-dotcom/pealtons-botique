/**
 * js/utils.js — Shared helper utilities for Pealtons Boutique
 *
 * Exported symbols:
 *   formatUGX(n)                    — format a number as UGX currency string
 *   showToast(msg)                  — display a transient toast notification
 *   openModal(id)                   — open a .modal-bg element by element id
 *   closeModal(id)                  — close a .modal-bg element by element id
 *   NEUTRAL_PLACEHOLDER_SVG         — HTML string for the neutral product placeholder
 *   getFallbackImage(product)       — resolve the best local fallback image path for a product
 *   handleImgError(img, fallback)   — <img> onerror handler with one-shot fallback
 */

// ── Currency formatter ────────────────────────────────────────────────────────

/**
 * Format a number as a UGX currency string.
 * @param {number|string} n
 * @returns {string} e.g. "UGX 150,000"
 */
export function formatUGX(n) {
  return 'UGX ' + Number(n || 0).toLocaleString();
}

// ── Toast notification ────────────────────────────────────────────────────────

/**
 * Show a brief toast message at the bottom of the screen.
 * @param {string} msg
 */
export function showToast(msg) {
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3500);
  }
}

// ── Modal helpers ─────────────────────────────────────────────────────────────

/**
 * Open a modal overlay by its element id.
 * @param {string} id — the id of a .modal-bg or .cart-overlay element
 */
export function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

/**
 * Close a modal overlay by its element id.
 * @param {string} id — the id of a .modal-bg or .cart-overlay element
 */
export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// ── Neutral placeholder SVG ───────────────────────────────────────────────────

/**
 * HTML string for the neutral product placeholder graphic.
 * Injected when no image is available after all fallback attempts.
 */
export const NEUTRAL_PLACEHOLDER_SVG = `
  <div class="neutral-placeholder">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <path d="M16 10a4 4 0 0 1-8 0"></path>
    </svg>
    <span>Boutique Item</span>
  </div>
`;

// ── Fallback image resolution ─────────────────────────────────────────────────

/**
 * Fast local asset fallback map keyed by product category.
 * @private
 */
const LOCAL_FALLBACKS = {
  bags:         ['pics/hand bags/black bag.jfif', 'pics/hand bags/Fall handbags.jfif'],
  ladies:       ['pics/hand bags/black bag.jfif', 'pics/hand bags/Fall handbags.jfif'],
  mens:         ['pics/mens clothes/gents.jfif', 'pics/mens clothes/tshirts.jfif'],
  'rent-suits': ['pics/mens suits/black suit.jfif', 'pics/mens suits/blue suit.jfif'],
  'rent-gowns': ['pics/women gowns/wedding gowns.jfif', 'pics/women gowns/maids 1.jfif']
};

/**
 * Resolve the most appropriate local fallback image path for a product,
 * based on its name keywords and category.
 *
 * @param {{ name?: string, category?: string }|null} product
 * @returns {string} relative image path
 */
export function getFallbackImage(product) {
  if (!product) return 'pics/mens suits/black suit.jfif';
  const cat  = product.category || '';
  const name = (product.name || '').toLowerCase();

  if (name.includes('gown') || cat === 'rent-gowns') {
    if (name.includes('wedding')) return 'pics/women gowns/wedding gowns.jfif';
    return 'pics/women gowns/maids 1.jfif';
  }
  if (name.includes('suit') || cat === 'rent-suits') {
    if (name.includes('blue')) return 'pics/mens suits/blue suit.jfif';
    return 'pics/mens suits/black suit.jfif';
  }
  if (name.includes('bag') || name.includes('handbag') || cat === 'ladies') {
    if (name.includes('black')) return 'pics/hand bags/black bag.jfif';
    return 'pics/hand bags/Fall handbags.jfif';
  }
  if (
    name.includes('shirt') || name.includes('tshirt') ||
    name.includes('pant') || name.includes('trouser') ||
    cat === 'mens'
  ) {
    if (name.includes('tshirt') || name.includes('t-shirt')) return 'pics/mens clothes/tshirts.jfif';
    return 'pics/mens clothes/gents.jfif';
  }

  const list = LOCAL_FALLBACKS[cat] || LOCAL_FALLBACKS.mens;
  return list[0];
}

// ── Image error handler ───────────────────────────────────────────────────────

/**
 * Handle an <img> load error with a single fallback attempt.
 * On first error: swap src to the fallback path.
 * On second error: hide the image (and its skeleton sibling) and insert
 * the neutral placeholder SVG into the parent element.
 *
 * Usage in HTML:
 *   onerror="handleImgError(this, 'path/to/fallback.jpg')"
 *
 * @param {HTMLImageElement} img
 * @param {string} fallback — local fallback image path
 */
export function handleImgError(img, fallback) {
  if (img.dataset.triedFallback) {
    // Second failure — give up and show placeholder
    img.style.display = 'none';
    const skeleton = img.previousElementSibling;
    if (skeleton) skeleton.style.display = 'none';
    img.parentNode.insertAdjacentHTML('beforeend', NEUTRAL_PLACEHOLDER_SVG);
    return;
  }
  img.dataset.triedFallback = 'true';
  img.src = fallback;
}
