const API_BASE = "http://localhost:8000/nari-vastrika";

export const productsAPI = {
  getWithDiscounts: async () => {
    const res = await fetch(`${API_BASE}/products/with-discounts/`);
    if (!res.ok) throw new Error("Failed to fetch products");
    return res.json();
  },
  
  getLatest: async (limit = 8) => {
    const res = await fetch(`${API_BASE}/products/latest/?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch latest products");
    return res.json();
  },
  
  getSimilar: async (productId, limit = 4) => {
    const res = await fetch(`${API_BASE}/products/similar/${productId}?limit=${limit}`);
    if (!res.ok) throw new Error("Failed to fetch similar products");
    return res.json();
  },
  
  create: async (formData) => {
    const res = await fetch(`${API_BASE}/ADDproducts/`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Failed to create product");
    return res.json();
  },
  
  update: async (id, formData) => {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: "PUT", body: formData });
    if (!res.ok) throw new Error("Failed to update product");
    return res.json();
  },
  
  delete: async (id) => {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete product");
    return res.json();
  },
  
  getImageUrl: (imageId) => `${API_BASE}/products/images/${imageId}`,
};

export const ordersAPI = {
  getAll: async () => {
    const res = await fetch(`${API_BASE}/orders/`);
    if (!res.ok) throw new Error("Failed to fetch orders");
    return res.json();
  },
  
  create: async (orderData) => {
    const res = await fetch(`${API_BASE}/orders/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });
    if (!res.ok) throw new Error("Failed to place order");
    return res.json();
  },
  
  updateStatus: async (orderId, status) => {
    const formData = new FormData();
    formData.append("status", status);
    const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
      method: "PATCH",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to update order status");
    return res.json();
  },
  
  verifyUPI: async (transactionId, amount) => {
    const formData = new FormData();
    formData.append("upi_transaction_id", transactionId);
    formData.append("amount", amount);
    const res = await fetch(`${API_BASE}/orders/verify-upi`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Verification failed");
    return res.json();
  },
  
  verifyPayment: async (orderId) => {
    const formData = new FormData();
    formData.append("admin_id", "admin");
    const res = await fetch(`${API_BASE}/admin/verify-payment/${orderId}`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Payment verification failed");
    return res.json();
  },
  
  getPendingVerifications: async () => {
    const res = await fetch(`${API_BASE}/admin/pending-verifications/`);
    if (!res.ok) throw new Error("Failed to fetch pending verifications");
    return res.json();
  },
};

export const usersAPI = {
  register: async (userData) => {
    const formData = new FormData();
    Object.entries(userData).forEach(([k, v]) => v && formData.append(k, v));
    const res = await fetch(`${API_BASE}/users/register`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Registration failed");
    return res.json();
  },
  
  login: async (email, password) => {
    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);
    const res = await fetch(`${API_BASE}/users/login`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Invalid credentials");
    return res.json();
  },
  
  getProfile: async (userId) => {
    const res = await fetch(`${API_BASE}/users/${userId}`);
    if (!res.ok) throw new Error("Failed to fetch profile");
    return res.json();
  },
  
  updateProfile: async (userId, data) => {
    const formData = new FormData();
    Object.entries(data).forEach(([k, v]) => v && formData.append(k, v));
    const res = await fetch(`${API_BASE}/users/${userId}`, { method: "PUT", body: formData });
    if (!res.ok) throw new Error("Failed to update profile");
    return res.json();
  },
};

export const adminAPI = {
  getStats: async () => {
    const res = await fetch(`${API_BASE}/admin/stats`);
    if (!res.ok) throw new Error("Failed to fetch stats");
    return res.json();
  },
  
  setDiscount: async (discountPercent, productId = null, expiresInDays = 30) => {
    const formData = new FormData();
    formData.append("discount_percent", discountPercent);
    if (productId) formData.append("product_id", productId);
    formData.append("expires_in_days", expiresInDays);
    const res = await fetch(`${API_BASE}/admin/discounts/set`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to set discount");
    return res.json();
  },
  // Add to adminAPI in services/api.js
  // ... existing methods ...
  
  // Admin Profile Management
  getAdminProfile: async (adminId) => {
    const res = await fetch(`${API_BASE}/admin/profile/${adminId}`);
    if (!res.ok) throw new Error("Failed to fetch admin profile");
    return res.json();
  },
  
  updateAdminProfile: async (adminId, profileData) => {
    const formData = new FormData();
    if (profileData.name) formData.append("name", profileData.name);
    if (profileData.email) formData.append("email", profileData.email);
    if (profileData.phone) formData.append("phone", profileData.phone);
    if (profileData.address) formData.append("address", profileData.address);
    if (profileData.current_password) formData.append("current_password", profileData.current_password);
    if (profileData.new_password) formData.append("new_password", profileData.new_password);
    
    const res = await fetch(`${API_BASE}/admin/profile/${adminId}`, {
      method: "PUT",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to update profile");
    return res.json();
  },
};