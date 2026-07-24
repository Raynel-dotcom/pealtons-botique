/**
 * js/auth.js — Supabase Auth session management, user profile, wishlist CRUD.
 *
 * Exports:
 *   currentUser       — currently authenticated user (or null)
 *   currentProfile    — profile row from Supabase (or null)
 *   wishlistIds       — Set of product_id strings in the user's wishlist
 *   checkUserSession()
 *   handleAuthLogin(event)
 *   handleAuthRegister(event)
 *   handleAuthLogout()
 *   updateUserUI()
 *   openAuthModal()
 *   loadWishlist()
 *   toggleWishlist(productId)
 */

import { showToast, openModal, closeModal, formatUGX } from './utils.js';

// ── Auth State ─────────────────────────────────────────────────────────────────────
export let currentUser    = null;
export let currentProfile = null;
export let wishlistIds    = new Set();

// Access Supabase from window (set by app.js)
const getSupabase = () => window.supabase;

// ── Auth Functions ──────────────────────────────────────────────────────────────────
export async function signUp(email, password, name) {
  const supabase = getSupabase();
  if (!supabase) {
    showToast('Authentication system not available');
    return false;
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name
        }
      }
    });

    if (error) throw error;

    if (data.user) {
      // Create profile record
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          email: email,
          name: name,
          role: 'customer'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      showToast('Account created successfully! Please check your email to verify.');
      return true;
    } else {
      showToast('Registration successful. Please check your email to verify your account.');
      return true;
    }
  } catch (error) {
    console.error('Sign up error:', error);
    showToast(error.message || 'Registration failed');
    return false;
  }
}

export async function signIn(email, password) {
  const supabase = getSupabase();
  if (!supabase) {
    showToast('Authentication system not available');
    return false;
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (data.user) {
      showToast('Welcome back!');
      await loadUserProfile(data.user.id);
      await loadWishlist();
      updateUserUI();
      closeModal('authModal');
      return true;
    }
  } catch (error) {
    console.error('Sign in error:', error);
    showToast(error.message || 'Login failed');
    return false;
  }
}

export async function signOut() {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    await supabase.auth.signOut();
    currentUser = null;
    currentProfile = null;
    wishlistIds.clear();
    updateUserUI();
    showToast('You have been logged out');
  } catch (error) {
    console.error('Sign out error:', error);
    showToast('Failed to sign out');
  }
}

// ── Profile Management ──────────────────────────────────────────────────────────────
async function loadUserProfile(userId) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;
    currentProfile = data;
  } catch (error) {
    console.error('Profile load error:', error);
  }
}

// ── Auth State Change Listener ──────────────────────────────────────────────────────
export function checkUserSession() {
  const supabase = getSupabase();
  if (!supabase) return;

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      currentUser = session.user;
      await loadUserProfile(session.user.id);
      await loadWishlist();
      updateUserUI();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProfile = null;
      wishlistIds.clear();
      updateUserUI();
    } else if (event === 'PASSWORD_RECOVERY') {
      // Supabase sent the user back here after they clicked the email reset link.
      // Show the "choose a new password" form instead of the normal homepage.
      openModal('resetPasswordModal');
    }
  });
}

// ── Password Reset ───────────────────────────────────────────────────────────────────
export async function handleResetPassword(event) {
  event.preventDefault();
  const supabase = getSupabase();
  if (!supabase) {
    showToast('Authentication system not available');
    return;
  }

  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmNewPassword').value;

  if (newPassword.length < 6) {
    showToast('Password must be at least 6 characters');
    return;
  }
  if (newPassword !== confirmPassword) {
    showToast('Passwords do not match');
    return;
  }

  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;

    showToast('Password updated — you can log in with it now');
    closeModal('resetPasswordModal');
  } catch (error) {
    console.error('Password update error:', error);
    showToast(error.message || 'Could not update password');
  }
}

// ── UI Updates ───────────────────────────────────────────────────────────────────────
export function updateUserUI() {
  const btnAuth = document.getElementById('btnAuth');
  const drawerBtnAuth = document.getElementById('drawerBtnAuth');
  const userAvatarBtn = document.getElementById('userAvatarBtn');
  const btnMyOrders = document.getElementById('btnMyOrders');
  const adminButton = document.getElementById('btnAdminDash');

  if (currentUser && currentProfile) {
    // User is logged in
    if (btnAuth) btnAuth.style.display = 'none';
    if (drawerBtnAuth) drawerBtnAuth.style.display = 'none';
    if (btnMyOrders) btnMyOrders.style.display = 'inline-block';
    if (userAvatarBtn) {
      userAvatarBtn.style.display = 'flex';
      const initial = (currentProfile.name || currentProfile.email || 'U').trim().charAt(0).toUpperCase();
      userAvatarBtn.textContent = initial;
      userAvatarBtn.title = `View My Account — ${currentProfile.name || currentProfile.email || ''}`;
    }
    // Fill in the "My Account" modal with the real logged-in user's info
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileRole = document.getElementById('profileRole');
    if (profileName) profileName.textContent = currentProfile.name || 'Customer';
    if (profileEmail) profileEmail.textContent = currentProfile.email || currentUser.email || '';
    if (profileRole) profileRole.textContent = (currentProfile.role || 'customer').toUpperCase();
    if (adminButton) {
      adminButton.style.display = currentProfile.role === 'admin' ? 'inline-block' : 'none';
    }
  } else {
    // User is logged out
    if (btnAuth) btnAuth.style.display = 'inline-block';
    if (drawerBtnAuth) drawerBtnAuth.style.display = 'inline-block';
    if (btnMyOrders) btnMyOrders.style.display = 'none';
    if (userAvatarBtn) userAvatarBtn.style.display = 'none';
    if (adminButton) adminButton.style.display = 'none';
  }
}

export function openAuthModal() {
  openModal('authModal');
}

export async function openMyOrdersModal() {
  openModal('myOrdersModal');
  await loadMyOrders();
}

async function loadMyOrders() {
  const listEl = document.getElementById('myOrdersList');
  if (!listEl) return;
  listEl.innerHTML = '<div class="loading-wrap"><div class="spinner"></div></div>';

  const supabase = getSupabase();
  if (!supabase || !currentUser) {
    listEl.innerHTML = '<p style="text-align:center; color:var(--gray); padding:20px;">Please sign in to see your orders.</p>';
    return;
  }

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!data || data.length === 0) {
      listEl.innerHTML = '<p style="text-align:center; color:var(--gray); padding:20px;">You haven\'t placed any orders yet.</p>';
      return;
    }

    listEl.innerHTML = data.map(order => `
      <div style="border:1px solid var(--border); border-radius:6px; padding:14px 16px; margin-bottom:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span style="font-weight:600; font-size:13px;">Order #${String(order.id).slice(0, 8)}</span>
          <span class="status-badge status-${order.status}">${order.status}</span>
        </div>
        <div style="font-size:13px; color:var(--gray); margin-top:6px;">
          ${new Date(order.created_at).toLocaleDateString()} — ${formatUGX(order.total)}
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load my orders:', error);
    listEl.innerHTML = '<p style="text-align:center; color:var(--red); padding:20px;">Could not load your orders — please try again shortly.</p>';
  }
}

// ── Form Handlers ───────────────────────────────────────────────────────────────────
export async function handleAuthLogin(event) {
  event.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  await signIn(email, password);
}

export async function handleAuthRegister(event) {
  event.preventDefault();
  const name = document.getElementById('registerName').value;
  const email = document.getElementById('registerEmail').value;
  const password = document.getElementById('registerPassword').value;
  await signUp(email, password, name);
}

export function handleAuthLogout() {
  signOut();
}

export function switchAuthTab(tab) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabs = document.querySelectorAll('.auth-tab');
  const title = document.getElementById('authModalTitle');

  tabs.forEach(t => t.classList.remove('active'));

  if (tab === 'login') {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    tabs[0].classList.add('active');
    if (title) title.textContent = 'Sign In';
  } else {
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
    tabs[1].classList.add('active');
    if (title) title.textContent = 'Create Account';
  }
}

// ── Wishlist ────────────────────────────────────────────────────────────────────────
export async function loadWishlist() {
  const supabase = getSupabase();
  if (!supabase || !currentUser) return;

  try {
    const { data, error } = await supabase
      .from('wishlists')
      .select('product_id')
      .eq('user_id', currentUser.id);

    if (error) throw error;

    wishlistIds = new Set(data.map(item => item.product_id));
    updateWishlistUI();
  } catch (error) {
    console.error('Wishlist load error:', error);
  }
}

export async function toggleWishlist(productId) {
  const supabase = getSupabase();
  if (!supabase || !currentUser) {
    showToast('Please log in to save items to your wishlist');
    openAuthModal();
    return;
  }

  try {
    if (wishlistIds.has(productId)) {
      // Remove from wishlist
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('product_id', productId);

      if (error) throw error;

      wishlistIds.delete(productId);
      showToast('Removed from wishlist');
    } else {
      // Add to wishlist
      const { error } = await supabase
        .from('wishlists')
        .insert({
          user_id: currentUser.id,
          product_id: productId
        });

      if (error) throw error;

      wishlistIds.add(productId);
      showToast('Added to wishlist');
    }

    updateWishlistUI();
  } catch (error) {
    console.error('Wishlist toggle error:', error);
    showToast('Failed to update wishlist');
  }
}

function updateWishlistUI() {
  // Update heart icons on product cards
  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const productId = btn.dataset.productId;
    if (wishlistIds.has(productId)) {
      btn.classList.add('active');
      btn.innerHTML = '♥';
    } else {
      btn.classList.remove('active');
      btn.innerHTML = '♡';
    }
  });
}

// ── Initialization ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Expose functions to window for inline HTML handlers
  window.handleAuthLogin = handleAuthLogin;
  window.handleAuthRegister = handleAuthRegister;
  window.handleAuthLogout = handleAuthLogout;
  window.handleResetPassword = handleResetPassword;
  window.openAuthModal = openAuthModal;
  window.openMyOrdersModal = openMyOrdersModal;
  window.switchAuthTab = switchAuthTab;
  window.toggleWishlist = toggleWishlist;
  
  // Check for existing session
  checkUserSession();
});
