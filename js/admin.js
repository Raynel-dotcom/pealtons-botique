/**
 * js/admin.js — Admin dashboard: product CRUD, order management, stats.
 *
 * Exports:
 *   openAdminModal()
 *   loadAdminOrders()
 *   loadAdminProducts()
 *   loadAdminDashboardData()
 *   switchAdminTab(tab)
 *   handleSaveProduct(event)
 *   deleteProduct(productId)
 *   editProduct(productId)
 *   openProductFormModal()
 *   updateOrderStatus(orderId, newStatus)
 *   handleImageFileSelect(event)
 */

import { formatUGX, showToast, openModal, closeModal, getFallbackImage, handleImgError } from './utils.js';

// Access Supabase from window (set by app.js)
const getSupabase = () => window.supabase;

// ── Admin State ─────────────────────────────────────────────────────────────────────
let editingProductId = null;
let selectedImageFile = null;

// ── Admin Modal ───────────────────────────────────────────────────────────────────────
export async function openAdminModal() {
  // Check if user is admin
  const { currentProfile } = await import('./auth.js');
  if (!currentProfile || currentProfile.role !== 'admin') {
    showToast('Access denied. Admin only.');
    return;
  }
  
  openModal('adminModal');
  loadAdminProducts();
}

// ── Product CRUD ───────────────────────────────────────────────────────────────────────
export async function loadAdminProducts() {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    renderAdminProductsTable(data || []);
  } catch (error) {
    console.error('Failed to load products:', error);
    showToast('Failed to load products');
  }
}

function renderAdminProductsTable(products) {
  const tbody = document.getElementById('adminProductsTableBody');
  if (!tbody) return;

  if (products.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px; color:var(--gray);">No products found</td></tr>';
    return;
  }

  tbody.innerHTML = products.map(product => {
    const stockClass = product.stock === 0 ? 'stock-out' : product.stock < 5 ? 'stock-low' : 'stock-ok';
    const stockLabel = product.stock === 0 ? 'Out of Stock' : product.stock < 5 ? `Low (${product.stock})` : 'In Stock';
    
    return `
      <tr>
        <td>
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${product.image || getFallbackImage(product)}" alt="${product.name}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;" onerror="handleImgError(this, '${getFallbackImage(product)}')" />
            <div>
              <div style="font-weight:600;">${product.name}</div>
              <div style="font-size:11px; color:var(--gray);">${product.category}</div>
            </div>
          </div>
        </td>
        <td>${formatUGX(product.price)}</td>
        <td>${product.type === 'rent' ? 'Rental' : 'Sale'}</td>
        <td><span class="stock-info ${stockClass}">${stockLabel}</span></td>
        <td>${product.sizes ? product.sizes.join(', ') : '-'}</td>
        <td>
          <button class="btn-edit" onclick="window.editProduct && window.editProduct('${product.id}')">Edit</button>
          <button class="btn-delete" onclick="window.deleteProduct && window.deleteProduct('${product.id}')">Delete</button>
        </td>
      </tr>
    `;
  }).join('');
}

export function openProductFormModal(productId = null) {
  editingProductId = productId;
  selectedImageFile = null;
  
  const title = document.getElementById('productFormTitle');
  const form = document.getElementById('productForm');
  
  if (title) {
    title.textContent = productId ? 'Edit Product' : 'Add New Product';
  }
  
  if (form) {
    form.reset();
  }
  
  if (productId) {
    // Load product data for editing
    loadProductForEdit(productId);
  }
  
  openModal('productFormModal');
}

async function loadProductForEdit(productId) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) throw error;

    if (data) {
      document.getElementById('pfName').value = data.name || '';
      document.getElementById('pfCategory').value = data.category || '';
      document.getElementById('pfType').value = data.type || 'sale';
      document.getElementById('pfPrice').value = data.price || '';
      document.getElementById('pfStock').value = data.stock || '';
      document.getElementById('pfSizes').value = data.sizes ? data.sizes.join(', ') : '';
      document.getElementById('pfDescription').value = data.description || '';
    }
  } catch (error) {
    console.error('Failed to load product:', error);
    showToast('Failed to load product data');
  }
}

export async function handleSaveProduct(event) {
  event.preventDefault();
  
  const supabase = getSupabase();
  if (!supabase) {
    showToast('Database not available');
    return;
  }

  const name = document.getElementById('pfName').value;
  const category = document.getElementById('pfCategory').value;
  const type = document.getElementById('pfType').value;
  const price = Number(document.getElementById('pfPrice').value);
  const stock = Number(document.getElementById('pfStock').value);
  const sizesStr = document.getElementById('pfSizes').value;
  const description = document.getElementById('pfDescription').value;
  
  const sizes = sizesStr ? sizesStr.split(',').map(s => s.trim()).filter(s => s) : [];
  
  try {
    let imageUrl = '';
    
    // Handle image upload if file selected
    if (selectedImageFile) {
      imageUrl = await uploadProductImage(selectedImageFile);
    } else if (editingProductId) {
      // Keep existing image if editing and no new file
      const { data } = await supabase.from('products').select('image').eq('id', editingProductId).single();
      imageUrl = data?.image || '';
    } else {
      imageUrl = getFallbackImage({ name });
    }
    
    const productData = {
      name,
      category,
      type,
      price,
      stock,
      sizes,
      description,
      image: imageUrl
    };

    if (editingProductId) {
      // Update existing product
      const { error } = await supabase
        .from('products')
        .update(productData)
        .eq('id', editingProductId);

      if (error) throw error;
      showToast('Product updated successfully');
    } else {
      // Create new product
      const { error } = await supabase
        .from('products')
        .insert(productData);

      if (error) throw error;
      showToast('Product added successfully');
    }

    closeModal('productFormModal');
    loadAdminProducts();
  } catch (error) {
    console.error('Failed to save product:', error);
    showToast('Failed to save product');
  }
}

async function uploadProductImage(file) {
  const supabase = getSupabase();
  if (!supabase) return getFallbackImage({ name: 'product' });

  try {
    const fileName = `${Date.now()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Image upload failed:', error);
    return getFallbackImage({ name: 'product' });
  }
}

export async function deleteProduct(productId) {
  if (!confirm('Are you sure you want to delete this product?')) return;

  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) throw error;
    showToast('Product deleted successfully');
    loadAdminProducts();
  } catch (error) {
    console.error('Failed to delete product:', error);
    showToast('Failed to delete product');
  }
}

export function editProduct(productId) {
  openProductFormModal(productId);
}

export function handleImageFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    selectedImageFile = file;
  }
}

// ── Admin Tabs ────────────────────────────────────────────────────────────────────────
export function switchAdminTab(tab) {
  const tabs = document.querySelectorAll('.admin-tab');
  const contents = document.querySelectorAll('.admin-tab-content');
  
  tabs.forEach(t => t.classList.remove('active'));
  contents.forEach(c => c.style.display = 'none');
  
  const tabIndex = tab === 'products' ? 0 : tab === 'orders' ? 1 : 2;
  tabs[tabIndex].classList.add('active');
  
  if (tab === 'products') {
    document.getElementById('adminProductsContent').style.display = 'block';
    loadAdminProducts();
  } else if (tab === 'orders') {
    document.getElementById('adminOrdersContent').style.display = 'block';
    loadAdminOrders();
  } else {
    document.getElementById('adminDashboardContent').style.display = 'block';
    loadAdminDashboardData();
  }
}

export async function loadAdminOrders() {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    renderAdminOrdersTable(data || []);
  } catch (error) {
    console.error('Failed to load orders:', error);
    showToast('Failed to load orders');
  }
}

function renderAdminOrdersTable(orders) {
  const tbody = document.getElementById('adminOrdersTableBody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px; color:var(--gray);">No orders found</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td>${order.id}</td>
      <td>${order.customer_name}</td>
      <td>${order.customer_phone}</td>
      <td>${formatUGX(order.total)}</td>
      <td><span class="status-badge status-${order.status}">${order.status}</span></td>
      <td>
        <select onchange="window.updateOrderStatus && window.updateOrderStatus('${order.id}', this.value)" style="padding:4px 8px; font-size:12px;">
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
          <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
          <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
          <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
    </tr>
  `).join('');
}

export async function updateOrderStatus(orderId, newStatus) {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) throw error;
    showToast('Order status updated');
    loadAdminOrders();
  } catch (error) {
    console.error('Failed to update order status:', error);
    showToast('Failed to update order status');
  }
}

export async function loadAdminDashboardData() {
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    // Get product count
    const { count: productCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true });

    // Get order count
    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Get total revenue
    const { data: orders } = await supabase
      .from('orders')
      .select('total')
      .in('status', ['delivered', 'shipped']);

    const totalRevenue = orders ? orders.reduce((sum, o) => sum + (o.total || 0), 0) : 0;

    // Update dashboard stats
    const productCountEl = document.getElementById('statProductCount');
    const orderCountEl = document.getElementById('statOrderCount');
    const revenueEl = document.getElementById('statRevenue');

    if (productCountEl) productCountEl.textContent = productCount || 0;
    if (orderCountEl) orderCountEl.textContent = orderCount || 0;
    if (revenueEl) revenueEl.textContent = formatUGX(totalRevenue);
  } catch (error) {
    console.error('Failed to load dashboard data:', error);
  }
}

// ── Initialization ───────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Expose functions to window for inline HTML handlers
  window.openAdminModal = openAdminModal;
  window.loadAdminProducts = loadAdminProducts;
  window.loadAdminOrders = loadAdminOrders;
  window.loadAdminDashboardData = loadAdminDashboardData;
  window.switchAdminTab = switchAdminTab;
  window.handleSaveProduct = handleSaveProduct;
  window.deleteProduct = deleteProduct;
  window.editProduct = editProduct;
  window.openProductFormModal = openProductFormModal;
  window.updateOrderStatus = updateOrderStatus;
  window.handleImageFileSelect = handleImageFileSelect;
});
