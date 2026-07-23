/**
 * js/payment.js — Flutterwave integration, payment step rendering,
 *                 callback handlers for success and failure.
 *
 * Exports:
 *   initiateFlutterwavePayment(options)
 *
 * Note: window.FlutterwaveCheckout is provided by the Flutterwave CDN script
 * loaded before this module in index.html.
 */

import { formatUGX, showToast } from './utils.js';

// ── Flutterwave Configuration ───────────────────────────────────────────────────────
const FLUTTERWAVE_PUBLIC_KEY = 'YOUR_FLUTTERWAVE_PUBLIC_KEY'; // Replace with actual key

// ── Payment Initiation ─────────────────────────────────────────────────────────────
export function initiateFlutterwavePayment(options) {
  // Check if Flutterwave SDK is available
  if (!window.FlutterwaveCheckout) {
    showToast('Payment gateway not available. Please try again or contact us via WhatsApp.');
    // Fallback: redirect to WhatsApp
    window.open('https://wa.me/256772387102', '_blank');
    return;
  }

  const paymentOptions = {
    public_key: FLUTTERWAVE_PUBLIC_KEY,
    tx_ref: generateTransactionRef(),
    amount: options.amount,
    currency: 'UGX',
    payment_options: 'mobilemoneyuganda',
    customer: {
      email: options.customerEmail || 'customer@example.com',
      phone_number: options.customerPhone,
      name: options.customerName
    },
    customizations: {
      title: 'Pealtons Boutique',
      description: 'Payment for luxury fashion items',
      logo: 'https://pealtonsboutique.com/logo.png'
    },
    callback: function(response) {
      if (response.status === 'successful') {
        // Payment successful - call finaliseOrder
        if (window.finaliseOrder) {
          window.finaliseOrder(response.transaction_id, response.tx_ref);
        }
      } else {
        // Payment failed
        handlePaymentFailure(response);
      }
    },
    onclose: function() {
      // Modal closed without completing payment
      // Do nothing - user can try again
    },
    meta: {
      cart_items: JSON.stringify(options.cartItems),
      customer_address: options.customerAddress
    }
  };

  // Add mobile money specific options based on selected method
  if (options.paymentMethod === 'mtn') {
    paymentOptions.payment_method = 'mtn';
  } else if (options.paymentMethod === 'airtel') {
    paymentOptions.payment_method = 'airtel';
  }

  // Open Flutterwave checkout
  window.FlutterwaveCheckout(paymentOptions);
}

// ── Transaction Reference Generation ───────────────────────────────────────────────
function generateTransactionRef() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  return `PB-${timestamp}-${random}`;
}

// ── Payment Failure Handler ───────────────────────────────────────────────────────
function handlePaymentFailure(response) {
  const errorMsg = response.message || 'Payment failed. Please try again.';
  showToast(errorMsg);
  
  // Do NOT insert any order into the database on payment failure
  // This is handled by the callback not calling finaliseOrder
}

// ── Expose to window for cart.js callback ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.initiateFlutterwavePayment = initiateFlutterwavePayment;
});
