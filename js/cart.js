/**
 * js/cart.js — Cart state, cart drawer UI, checkout flow, order finalisation.
 *
 * Exports:
 *   cart             — mutable cart array (line items)
 *   addToCart(productId, size, rentalStart, rentalEnd)
 *   changeCartQty(productId, delta)
 *   removeFromCart(productId)
 *   updateCartUI()
 *   openCart()
 *   closeCart()
 *   openCheckoutModal()
 */

import { formatUGX, showToast, openModal, closeModal, getFallbackImage, handleImgError } from './utils.js';
import { currentUser } from './auth.js';

// ── Cart State ────────────────────────────────────────────────────────────────────
export let cart = [];

// ── Cart Operations ────────────────────────────────────────────────────────────────
export function addToCart(productId, size = null, rentalStart = null, rentalEnd = null) {
  // Access allProducts from window (set by app.js)
  const allProducts = window.allProducts || [];
  const product = allProducts.find(p => p.id === productId);
  
  if (!product) {
    showToast('Product not found');
    return;
  }

  // Check if item already exists in cart (same product, size, and rental dates)
  const existingIndex = cart.findIndex(item => 
    item.productId === productId && 
    item.size === size &&
    item.rentalStart === rentalStart &&
    item.rentalEnd === rentalEnd
  );

  if (existingIndex !== -1) {
    // Increment quantity
    cart[existingIndex].quantity += 1;
  } else {
    // Add new item
    const cartItem = {
      productId,
      name: product.name,
      price: product.price,
      type: product.type,
      image: product.image || getFallbackImage(product),
      size,
      rentalStart,
      rentalEnd,
      quantity: 1
    };

    // Calculate rental total if rental item
    if (product.type === 'rent' && rentalStart && rentalEnd) {
      const start = new Date(rentalStart);
      const end = new Date(rentalEnd);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      cartItem.rentalTotal = product.price * days;
      cartItem.days = days;
    }

    cart.push(cartItem);
  }

  updateCartUI();
  showToast('Added to cart');
}

export function changeCartQty(productId, delta) {
  const index = cart.findIndex(item => item.productId === productId);
  if (index === -1) return;

  cart[index].quantity += delta;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1);
  }

  updateCartUI();
}

export function removeFromCart(productId) {
  const index = cart.findIndex(item => item.productId === productId);
  if (index === -1) return;

  cart.splice(index, 1);
  updateCartUI();
}

// ── Cart UI ───────────────────────────────────────────────────────────────────────
export function updateCartUI() {
  const cartItemsList = document.getElementById('cartItemsList');
  const cartTotalSum = document.getElementById('cartTotalSum');
  const cartBadge = document.getElementById('cartBadge');
  const drawerCartBadge = document.getElementById('drawerCartBadge');

  if (!cartItemsList) return;

  // Update badge
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (cartBadge) cartBadge.textContent = totalItems;
  if (drawerCartBadge) drawerCartBadge.textContent = totalItems;

  // Render cart items
  if (cart.length === 0) {
    cartItemsList.innerHTML = '<p style="text-align:center; color:var(--gray); padding:40px 0;">Your cart is empty</p>';
    if (cartTotalSum) cartTotalSum.textContent = formatUGX(0);
    return;
  }

  cartItemsList.innerHTML = cart.map(item => buildCartItemHTML(item)).join('');

  // Calculate total
  const total = cart.reduce((sum, item) => {
    if (item.type === 'rent' && item.rentalTotal) {
      return sum + (item.rentalTotal * item.quantity);
    }
    return sum + (item.price * item.quantity);
  }, 0);

  if (cartTotalSum) cartTotalSum.textContent = formatUGX(total);
}

function buildCartItemHTML(item) {
  const sizeDisplay = item.size ? `<div style="font-size:11px; color:var(--gold);">Size: ${item.size}</div>` : '';
  
  let rentalInfo = '';
  if (item.type === 'rent' && item.rentalStart && item.rentalEnd) {
    rentalInfo = `
      <div style="font-size:11px; color:var(--gray); margin-top:4px;">
        ${item.rentalStart} to ${item.rentalEnd} (${item.days} day${item.days > 1 ? 's' : ''})
      </div>
    `;
  }

  const priceDisplay = item.type === 'rent' && item.rentalTotal 
    ? formatUGX(item.rentalTotal)
    : formatUGX(item.price);

  return `
    <div class="cart-item" data-product-id="${item.productId}">
      <div class="cart-item-img">
        <img src="${item.image}" alt="${item.name}" onerror="handleImgError(this, '${getFallbackImage({name: item.name})}')" />
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.name}</div>
        ${sizeDisplay}
        ${rentalInfo}
        <div class="cart-item-price">${priceDisplay}</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="window.changeCartQty && window.changeCartQty('${item.productId}', -1)">−</button>
          <span>${item.quantity}</span>
          <button class="qty-btn" onclick="window.changeCartQty && window.changeCartQty('${item.productId}', 1)">+</button>
        </div>
      </div>
      <button class="btn-remove" onclick="window.removeFromCart && window.removeFromCart('${item.productId}')">✕</button>
    </div>
  `;
}

// ── Cart Drawer ────────────────────────────────────────────────────────────────────
export function openCart() {
  const overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

export function closeCart() {
  const overlay = document.getElementById('cartOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = '';
}

export function closeCartOutside(event) {
  if (event.target.id === 'cartOverlay') {
    closeCart();
  }
}

// ── Checkout ───────────────────────────────────────────────────────────────────────
export function openCheckoutModal() {
  if (cart.length === 0) {
    showToast('Your cart is empty');
    return;
  }

  // Populate checkout summary
  const summaryItems = document.getElementById('coSummaryItems');
  const summaryTotal = document.getElementById('coSummaryTotal');
  
  if (summaryItems) {
    summaryItems.innerHTML = cart.map(item => {
      const sizeText = item.size ? ` (${item.size})` : '';
      const rentalText = item.type === 'rent' && item.rentalStart 
        ? `<br/><small style="color:var(--gray);">${item.rentalStart} - ${item.rentalEnd}</small>` 
        : '';
      return `<div>${item.name}${sizeText} × ${item.quantity}${rentalText}</div>`;
    }).join('');
  }

  const total = cart.reduce((sum, item) => {
    if (item.type === 'rent' && item.rentalTotal) {
      return sum + (item.rentalTotal * item.quantity);
    }
    return sum + (item.price * item.quantity);
  }, 0);

  if (summaryTotal) {
    summaryTotal.textContent = formatUGX(total);
  }

  openModal('checkoutModal');
}

/* SQL Migration Note for Supabase:
   Add payment_ref and status columns to orders table:
   ALTER TABLE orders ADD COLUMN payment_ref text;
   ALTER TABLE orders ADD COLUMN status text DEFAULT 'pending';
*/

export async function handleCheckout(event) {
  event.preventDefault();
  
  const name = document.getElementById('coName').value;
  const phone = document.getElementById('coPhone').value;
  const address = document.getElementById('coAddress').value;
  
  // Get selected payment method
  const paymentMethodInput = document.querySelector('input[name="paymentMethod"]:checked');
  const paymentMethod = paymentMethodInput ? paymentMethodInput.value : 'mtn';
  
  // Calculate total
  const total = cart.reduce((sum, item) => {
    if (item.type === 'rent' && item.rentalTotal) {
      return sum + (item.rentalTotal * item.quantity);
    }
    return sum + (item.price * item.quantity);
  }, 0);
  
  // Prepare payment options
  const paymentOptions = {
    amount: total,
    customerName: name,
    customerPhone: phone,
    customerAddress: address,
    paymentMethod: paymentMethod,
    cartItems: cart
  };
  
  // Close checkout modal and initiate payment
  closeModal('checkoutModal');
  
  if (window.initiateFlutterwavePayment) {
    window.initiateFlutterwavePayment(paymentOptions);
  } else {
    showToast('Payment system not available');
  }
}

export async function finaliseOrder(paymentRef, txRef) {
  // Access Supabase from window (set by app.js)
  const supabase = window.supabase;
  
  if (!supabase) {
    showToast('System error: Database not available');
    return;
  }
  
  try {
    // Get customer info from checkout form
    const name = document.getElementById('coName').value;
    const phone = document.getElementById('coPhone').value;
    const address = document.getElementById('coAddress').value;
    
    // Calculate total
    const total = cart.reduce((sum, item) => {
      if (item.type === 'rent' && item.rentalTotal) {
        return sum + (item.rentalTotal * item.quantity);
      }
      return sum + (item.price * item.quantity);
    }, 0);
    
    // Insert order into Supabase
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: currentUser ? currentUser.id : null,
        customer_name: name,
        customer_phone: phone,
        customer_address: address,
        total: total,
        payment_ref: paymentRef,
        status: 'pending',
        items: cart
      })
      .select()
      .single();
    
    if (orderError) throw orderError;
    
    // Clear cart
    cart = [];
    updateCartUI();
    
    // Close checkout modal if still open
    closeModal('checkoutModal');
    
    // Show success modal with order ID
    const successModalBody = document.getElementById('successModalBody');
    if (successModalBody) {
      successModalBody.innerHTML = `
        Thank you for shopping with Pealtons Boutique.<br/><br/>
        <strong>Order ID:</strong> ${orderData.id}<br/>
        <strong>Payment Reference:</strong> ${paymentRef}<br/><br/>
        We will process your order within 24 hours.
      `;
    }
    
    openModal('successModal');
    showToast('Order placed successfully!');
    
  } catch (error) {
    console.error('Failed to finalise order:', error);
    showToast('Failed to save order. Please contact us.');
  }
}

// ── Initialization ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Expose functions to window for inline HTML handlers
  window.addToCart = addToCart;
  window.changeCartQty = changeCartQty;
  window.removeFromCart = removeFromCart;
  window.openCart = openCart;
  window.closeCart = closeCart;
  window.closeCartOutside = closeCartOutside;
  window.openCheckoutModal = openCheckoutModal;
  window.handleCheckout = handleCheckout;
  window.finaliseOrder = finaliseOrder;
  
  // Initial cart UI update
  updateCartUI();
});
