import React, { useState, useEffect, Fragment } from "react";
import { productsAPI, ordersAPI, usersAPI, adminAPI } from "./services/api";
import Logo from './assets/logo.png';
import Hero1 from './assets/Hero1.jpg';
import "./App.css";

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const ADMIN_INFO = {
  name: "Priya Sharma",
  phone: "+91 98765 43210",
  upiId: "priya.luxe@upi",
};

const COLOR_PALETTE = [
  { name: "Red", hex: "#e53935" }, { name: "Dark Red", hex: "#b71c1c" },
  { name: "Pink", hex: "#e91e8c" }, { name: "Orange", hex: "#fb8c00" },
  { name: "Yellow", hex: "#fdd835" }, { name: "Gold", hex: "#c9a84c" },
  { name: "Green", hex: "#43a047" }, { name: "Teal", hex: "#00897b" },
  { name: "Blue", hex: "#1e88e5" }, { name: "Navy", hex: "#1a237e" },
  { name: "Purple", hex: "#8e24aa" }, { name: "Brown", hex: "#6d4c41" },
  { name: "Cognac", hex: "#a0522d" }, { name: "Tan", hex: "#d2b48c" },
  { name: "Beige", hex: "#f5f0e8" }, { name: "White", hex: "#f5f5f5" },
  { name: "Silver", hex: "#9e9e9e" }, { name: "Grey", hex: "#616161" },
  { name: "Black", hex: "#212121" }, { name: "Turquoise", hex: "#26c6da" },
];

const COLOR_HEX = Object.fromEntries(COLOR_PALETTE.map(c => [c.name, c.hex]));

const ALL_CATEGORIES = ["All", "Kurti", "Saree", "Jewelry", "Bags", "Footwear", "Beauty", "Watches", "Clothing", "Home"];
const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "6", "7", "8", "9", "10", "50ml", "100ml"];

const SUBCATEGORY_MAP = {
  Kurti: ["Anarkali Kurti", "Kaftan Style Kurti", "Kurti Tops", "Overlay Kurti", "Printed Kurti", "Straight Cut Kurti", "Slit Kurti"],
  Saree: ["Kanchipuram Pattu", "Banarasi Silk", "Chanderi Silk", "Tant Cotton", "Kota Doria", "Paithani Silk", "Mysore Silk", "Tussar Silk"],
  Jewelry: ["Bangles", "Bracelets", "Chokers", "Necklaces", "Earrings", "Rings"],
  Bags: ["Tote Bags", "Sling Bags", "Clutch", "Backpack"],
  Footwear: ["Chelsea Boots", "Juttis", "Sandals", "Heels"],
  Beauty: ["Perfumes", "Skincare", "Makeup"],
  Watches: ["Luxury Watches", "Sports Watches", "Casual Watches"],
  Clothing: ["Blazers", "Dresses", "Tops", "Trousers"],
  Home: ["Lighting", "Decor", "Textiles"],
};

const OCCASION_OPTIONS = ["Casual", "Formal", "Wedding", "Festival", "Party", "Business", "Evening", "Home Decor"];

// ─── PRODUCT IMAGE COMPONENT ───────────────────────────────────────────────────

function ProductImage({ imageId, alt, fit = "contain", className = "", style = {} }) {
  const [imgError, setImgError] = useState(false);
  const fallbackImage = "https://via.placeholder.com/500?text=No+Image";
  
  const fitClass = {
    contain: "image-fit-contain",
    cover: "image-fit-cover",
    fill: "image-fit-fill"
  }[fit] || "image-fit-contain";

  const imageUrl = imageId && !imgError ? productsAPI.getImageUrl(imageId) : fallbackImage;

  return (
    <img
      src={imageUrl}
      alt={alt}
      className={`${fitClass} ${className}`}
      style={style}
      onError={() => setImgError(true)}
    />
  );
}

// ─── IMAGE SLIDER COMPONENT ───────────────────────────────────────────────────

function ImageSlider({ images, productName, fit = "contain", height = "400px" }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState({});

  if (!images || images.length === 0) {
    return (
      <div className="image-slider" style={{ height }}>
        <div className="slider-container" style={{ height: '100%' }}>
          <img 
            src="https://via.placeholder.com/800x600?text=No+Images+Available" 
            alt="No images"
            className="image-fit-contain"
            style={{ height: '100%', width: '100%' }}
          />
        </div>
      </div>
    );
  }

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleImageError = (index) => {
    setImageErrors(prev => ({ ...prev, [index]: true }));
  };

  const fitClass = fit === "contain" ? "image-fit-contain" : "image-fit-cover";
  const currentImage = images[currentIndex];
  const imageUrl = imageErrors[currentIndex] 
    ? "https://via.placeholder.com/800x600?text=Image+Load+Failed"
    : (currentImage ? productsAPI.getImageUrl(currentImage.id) : "https://via.placeholder.com/800x600?text=No+Image");

  return (
    <div className="image-slider" style={{ height }}>
      <div className="slider-container" style={{ height: '100%', position: 'relative' }}>
        <img 
          src={imageUrl}
          alt={`${productName} - ${currentIndex + 1}`}
          className={fitClass}
          style={{ width: '100%', height: '100%' }}
          onError={() => handleImageError(currentIndex)}
        />
        {images.length > 1 && (
          <>
            <button className="slider-nav prev" onClick={prevSlide}>❮</button>
            <button className="slider-nav next" onClick={nextSlide}>❯</button>
            <div className="slider-dots">
              {images.map((_, idx) => (
                <span
                  key={idx}
                  className={`dot ${idx === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(idx)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── DISCOUNT MANAGER COMPONENT ───────────────────────────────────────────────

function DiscountManager({ products, onDiscountApplied }) {
  const [discountPercent, setDiscountPercent] = useState("");
  const [selectedProduct, setSelectedProduct] = useState("");
  const [applyToAll, setApplyToAll] = useState(false);

  const handleApplyDiscount = async () => {
    if (!discountPercent) return;
    
    try {
      await adminAPI.setDiscount(
        parseFloat(discountPercent),
        applyToAll ? null : selectedProduct,
        30
      );
      alert(applyToAll ? `Applied ${discountPercent}% discount to all products` : `Applied ${discountPercent}% discount to product`);
      setDiscountPercent("");
      setSelectedProduct("");
      setApplyToAll(false);
      if (onDiscountApplied) onDiscountApplied();
    } catch (err) {
      console.error("Failed to set discount:", err);
      alert("Failed to set discount");
    }
  };

  return (
    <div className="discount-manager">
      <h3 className="discount-title">🎯 Product Discounts</h3>
      <div className="discount-form">
        <input
          type="number"
          className="form-input"
          placeholder="Discount % (0-100)"
          value={discountPercent}
          onChange={(e) => setDiscountPercent(e.target.value)}
          min="0"
          max="100"
        />
        <select
          className="form-input"
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
          disabled={applyToAll}
        >
          <option value="">Select Product</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={applyToAll}
            onChange={(e) => setApplyToAll(e.target.checked)}
          />
          Apply to all products
        </label>
        <button className="btn btn-gold" onClick={handleApplyDiscount}>
          Apply Discount
        </button>
      </div>
    </div>
  );
}

// ─── SPLASH COMPONENT ─────────────────────────────────────────────────────────

function Splash() {
  return (
    <div className="splash">
      <div className="splash-logo"><img src={Logo} className="logo-img"/></div>
      <div className="splash-sub">Curated Excellence</div>
      <div className="splash-bar" />
    </div>
  );
}

// ─── PRODUCT DETAIL FULL COMPONENT ────────────────────────────────────────────

function ProductDetailFull({ product, qty, setQty, user, onAddToCart, onLoadSimilar }) {
  const [similarProducts, setSimilarProducts] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  
  useEffect(() => {
    loadSimilarProducts();
  }, [product.id]);
  
  const loadSimilarProducts = async () => {
    setLoadingSimilar(true);
    try {
      const data = await productsAPI.getSimilar(product.id, 4);
      setSimilarProducts(data);
    } catch (err) {
      console.error("Failed to load similar products:", err);
    } finally {
      setLoadingSimilar(false);
    }
  };
  
  return (
    <div className="product-detail">
      <div className="product-detail-grid">
        <div className="product-detail-imgs">
          <ImageSlider 
            images={product.images || []} 
            productName={product.name}
            fit="contain"
            height="500px"
          />
        </div>
        <div className="product-detail-info">
          <div className="product-category">{product.category}{product.subcategory ? ` · ${product.subcategory}` : ""}</div>
          <div className="product-detail-name">{product.name}</div>
          <div className="product-detail-desc">{product.description}</div>

          {product.OccasionType?.length > 0 && (
            <div className="detail-row"><span className="detail-label">Occasion:</span>
              <div className="tag-list">{product.OccasionType.map(o => <span key={o} className="tag">{o}</span>)}</div>
            </div>
          )}
          {product.sizes?.length > 0 && (
            <div className="detail-row"><span className="detail-label">Sizes:</span>
              <div className="tag-list">{product.sizes.map(s => <span key={s} className="tag">{s}</span>)}</div>
            </div>
          )}
          {product.colors?.length > 0 && (
            <div className="detail-row"><span className="detail-label">Colors:</span>
              <div className="color-dots large">
                {product.colors.map(c => (
                  <span key={c} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <span className="color-dot lg" title={c} style={{ background: COLOR_HEX[c] || "#888" }} />
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{c}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {product.includedComponents?.length > 0 && (
            <div className="detail-row"><span className="detail-label">Included:</span>
              <span style={{ fontSize: 14, color: "var(--text-muted)" }}>{product.includedComponents.join(", ")}</span>
            </div>
          )}

          <div className="product-price-section">
            {product.discount ? (
              <>
                <span className="original-price large">₹{product.original_price?.toLocaleString("en-IN")}</span>
                <span className="discounted-price large">₹{product.discounted_price?.toLocaleString("en-IN")}</span>
                <span className="discount-badge large">{product.discount}% OFF</span>
              </>
            ) : (
              <div className="product-detail-price">₹{product.price_inr?.toLocaleString("en-IN")}</div>
            )}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>{product.stock} in stock</div>

          <div className="qty-control">
            <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
            <span className="qty-value">{qty}</span>
            <button className="qty-btn" onClick={() => setQty(q => Math.min(product.stock, q + 1))}>+</button>
          </div>

          {user?.role !== "admin" && (
            <button className="btn btn-gold" style={{ width: "100%", padding: "14px", fontSize: 14 }} onClick={() => onAddToCart(product)}>
              Add to Cart
            </button>
          )}
        </div>
      </div>
      
      {/* Similar Products Section */}
      {!loadingSimilar && similarProducts.length > 0 && (
        <div className="similar-products">
          <div className="section-title-small">🔄 You May Also Like</div>
          <div className="similar-grid">
            {similarProducts.map(p => (
              <div key={p.id} className="similar-card" onClick={() => onLoadSimilar(p)}>
                <ProductImage 
                  imageId={p.images?.[0]?.id} 
                  alt={p.name}
                  fit="contain"
                  style={{ width: '100%', height: '180px' }}
                />
                <div className="similar-info">
                  <h4>{p.name}</h4>
                  {p.discount ? (
                    <>
                      <div className="price-row">
                        <span className="original-small">₹{p.original_price?.toLocaleString("en-IN")}</span>
                        <span className="discount-small">₹{p.discounted_price?.toLocaleString("en-IN")}</span>
                      </div>
                      <span className="discount-badge-small">{p.discount}% OFF</span>
                    </>
                  ) : (
                    <span className="price-small">₹{p.price_inr?.toLocaleString("en-IN")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CART MODAL ───────────────────────────────────────────────────────────────

function CartModal({ cart, setCart, cartTotal, checkoutType, setCheckoutType, adminInfo, user, onPlaceOrder, onLogin }) {
  return (
    <>
      <div className="modal-title">Your Cart</div>
      {cart.length === 0 && <div className="no-data">Your cart is empty.</div>}
      {cart.map(item => (
        <div key={item.id} className="cart-item">
          <ProductImage 
            imageId={item.images?.[0]?.id} 
            alt={item.name}
            fit="contain"
            style={{ width: '64px', height: '64px', borderRadius: '4px' }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500 }}>{item.name}</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Qty: {item.qty}</div>
          </div>
          <div className="text-gold">₹{(item.cost * item.qty).toLocaleString("en-IN")}</div>
          <button className="btn btn-danger btn-sm" onClick={() => setCart(c => c.filter(i => i.id !== item.id))}>✕</button>
        </div>
      ))}

      {cart.length > 0 && (
        <>
          <div className="flex justify-between" style={{ marginTop: 16, fontSize: 18, fontWeight: 600, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <span>Total</span>
            <span className="text-gold">₹{cartTotal.toLocaleString("en-IN")}</span>
          </div>

          {!checkoutType && (
            <div className="checkout-type-selector">
              <div className="checkout-type-label">How would you like to proceed?</div>
              <div className="checkout-type-btns">
                <button className="checkout-type-btn" onClick={() => setCheckoutType("booking")}>
                  <span className="ctype-icon">📅</span>
                  <span className="ctype-title">Book Order</span>
                  <span className="ctype-sub">Reserve items · Pay later</span>
                </button>
                <button className="checkout-type-btn purchase" onClick={() => setCheckoutType("purchase")}>
                  <span className="ctype-icon">🛒</span>
                  <span className="ctype-title">Purchase Now</span>
                  <span className="ctype-sub">Pay via UPI & confirm</span>
                </button>
              </div>
            </div>
          )}

          {checkoutType && (
            <>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 12 }} onClick={() => setCheckoutType(null)}>
                ← Back
              </button>
              <CheckoutForm
                type={checkoutType}
                total={cartTotal}
                adminInfo={adminInfo}
                onConfirm={(data) => onPlaceOrder(data, checkoutType)}
              />
            </>
          )}
        </>
      )}
    </>
  );
}

// ─── CHECKOUT FORM ────────────────────────────────────────────────────────────

function CheckoutForm({ type, total, adminInfo, onConfirm, onClose }) {
  const [form, setForm] = useState({ 
    name: "", 
    phone: "", 
    email: "",  
    address: "", 
    pincode: "", 
    upiTransactionId: "" 
  });
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [verificationMessage, setVerificationMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Real-time validation helpers
  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length === 10 || cleaned.length === 0;
  };

  const validatePincode = (pincode) => {
    const cleaned = pincode.replace(/\D/g, "");
    return cleaned.length === 6 || cleaned.length === 0;
  };

  const validateEmail = (email) => {
    if (!email) return true; // Optional field
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validate = () => {
    if (!form.name.trim()) return "Full name is required";
    if (!form.name.trim().match(/^[a-zA-Z\s]{2,50}$/)) return "Please enter a valid name (only letters)";
    
    const phoneClean = form.phone.replace(/\D/g, "");
    if (phoneClean.length < 10) return "Valid 10-digit phone number required";
    if (phoneClean.length > 10) return "Phone number cannot exceed 10 digits";
    
    if (form.email && !validateEmail(form.email)) return "Please enter a valid email address";
    
    if (!form.address.trim()) return "Delivery address is required";
    if (form.address.trim().length < 10) return "Please enter a complete address (min 10 characters)";
    
    const pincodeClean = form.pincode.replace(/\D/g, "");
    if (pincodeClean.length !== 6) return "Valid 6-digit pincode required";
    
    return null;
  };

  const verifyUPITransaction = async () => {
    if (!form.upiTransactionId.trim()) {
      setError("Please enter UPI Transaction ID");
      return;
    }

    // Validate UPI Transaction ID format
    const utrRegex = /^[A-Z0-9]{10,16}$/i;
    if (!utrRegex.test(form.upiTransactionId.trim())) {
      setError("Invalid Transaction ID format. It should be 10-16 characters (letters and numbers only)");
      return;
    }

    setIsVerifying(true);
    setError("");
    
    try {
      const verifyFormData = new FormData();
      verifyFormData.append("upi_transaction_id", form.upiTransactionId.trim().toUpperCase());
      verifyFormData.append("amount", total);
      
      const response = await fetch("http://localhost:8000/nari-vastrika/orders/verify-upi", {
        method: "POST",
        body: verifyFormData
      });
      
      const data = await response.json();
      
      if (response.ok && data.verified) {
        setIsVerified(true);
        setVerificationMessage("✅ Transaction ID verified successfully! Your order will be processed.");
        setError("");
      } else {
        setError(data.detail || "Invalid Transaction ID. Please check and try again.");
        setIsVerified(false);
        setVerificationMessage("");
      }
    } catch (err) {
      console.error("Verification error:", err);
      setError("Verification failed. Please check your internet connection and try again.");
      setIsVerified(false);
      setVerificationMessage("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    // Validate form
    const err = validate();
    if (err) {
      setError(err);
      // Scroll to error
      document.querySelector('.error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    if (type === "purchase" && !isVerified) {
      setError("Please verify your UPI Transaction ID first");
      document.querySelector('.upi-verification-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    
    // Show confirmation dialog for booking
    if (type === "booking") {
      const confirmed = window.confirm(
        "📅 Confirm Booking\n\n" +
        "Your items will be reserved for 24 hours.\n" +
        "Our team will contact you within 2 hours to confirm availability and arrange payment.\n\n" +
        "Click OK to confirm your booking."
      );
      if (!confirmed) return;
    }
    
    // Show confirmation for purchase
    if (type === "purchase") {
      const confirmed = window.confirm(
        "✅ Confirm Purchase\n\n" +
        `Total Amount: ₹${total.toLocaleString("en-IN")}\n` +
        `Transaction ID: ${form.upiTransactionId}\n\n` +
        "Click OK to place your order. You will receive a confirmation email shortly."
      );
      if (!confirmed) return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    try {
      await onConfirm(form);
    } catch (err) {
      setError("Failed to place order. Please try again.");
      setIsSubmitting(false);
    }
  };

  // Auto-format phone number as user types
  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 10) value = value.slice(0, 10);
    if (value.length > 0) {
      // Format as +91 XXXXX XXXXX for display
      if (value.length <= 5) {
        value = value;
      } else {
        value = `${value.slice(0, 5)} ${value.slice(5)}`;
      }
    }
    set("phone", value);
  };

  // Auto-format pincode
  const handlePincodeChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 6) value = value.slice(0, 6);
    set("pincode", value);
  };

  return (
    <div className="checkout-form">
      <div className="checkout-form-title">
        {type === "purchase" ? (
          <>
            <span className="title-icon">🛒</span>
            Purchase Details
          </>
        ) : (
          <>
            <span className="title-icon">📅</span>
            Booking Details
          </>
        )}
      </div>

      {type === "purchase" && (
        <div className="admin-payment-info">
          <div className="admin-payment-title">💳 Send Payment To</div>
          <div className="admin-payment-row">
            <span>Account Name</span>
            <strong>{adminInfo.name}</strong>
          </div>
          <div className="admin-payment-row">
            <span>Phone / WhatsApp</span>
            <strong>{adminInfo.phone}</strong>
          </div>
          <div className="admin-payment-row">
            <span>UPI ID</span>
            <strong>{adminInfo.upiId}</strong>
          </div>
          <div className="admin-payment-total">
            <span>Amount to Pay:</span>
            <span>₹{total.toLocaleString("en-IN")}</span>
          </div>
          <div className="admin-payment-note">
            ⚠️ Complete the UPI payment first, then verify your Transaction ID below
          </div>
        </div>
      )}

      {type === "booking" && (
        <div className="booking-note">
          <span className="booking-icon">📅</span>
          <div className="booking-text">
            <strong>Booking Confirmation</strong>
            <p>Your items will be reserved for 24 hours. Our team will contact you within 2 hours on the phone number provided to confirm availability and arrange payment. You can also WhatsApp us at {adminInfo.phone}</p>
          </div>
        </div>
      )}

      <div className="form-group">
        <label className="form-label">
          Full Name <span className="required">*</span>
        </label>
        <input 
          className="form-input" 
          placeholder="Your full name" 
          value={form.name} 
          onChange={e => set("name", e.target.value.replace(/[^a-zA-Z\s]/g, ""))}
          maxLength={50}
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">
          Phone Number <span className="required">*</span>
        </label>
        <input 
          className="form-input" 
          placeholder="98765 43210" 
          value={form.phone} 
          onChange={handlePhoneChange}
          type="tel"
        />
        <small className="form-hint">We'll send order updates via WhatsApp/SMS</small>
      </div>

      <div className="form-group">
        <label className="form-label">Email Address</label>
        <input 
          className="form-input" 
          type="email" 
          placeholder="your@email.com" 
          value={form.email}  
          onChange={e => set("email", e.target.value)} 
        />
        <small className="form-hint">Optional - Receive order confirmation via email</small>
      </div>
      
      <div className="form-group">
        <label className="form-label">
          Delivery Address <span className="required">*</span>
        </label>
        <textarea 
          className="form-input" 
          rows={3} 
          placeholder="House no., Street, Area, City, State" 
          value={form.address} 
          onChange={e => set("address", e.target.value)}
          maxLength={200}
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">
          Pincode <span className="required">*</span>
        </label>
        <input 
          className="form-input" 
          placeholder="6-digit pincode" 
          maxLength={6} 
          value={form.pincode} 
          onChange={handlePincodeChange}
          type="text"
          inputMode="numeric"
        />
      </div>

      {type === "purchase" && (
        <>
          <div className="form-group">
            <label className="form-label">
              UPI Transaction ID <span className="required">*</span>
            </label>
            <div className="upi-verification-row">
              <input 
                className="form-input" 
                placeholder="e.g. TXN1234567890" 
                value={form.upiTransactionId} 
                onChange={(e) => {
                  set("upiTransactionId", e.target.value.toUpperCase());
                  setIsVerified(false);
                  setVerificationMessage("");
                  setError("");
                }}
                maxLength={16}
              />
              <button 
                type="button" 
                className={`btn verify-btn ${isVerified ? 'verified' : ''}`}
                onClick={verifyUPITransaction}
                disabled={isVerifying || !form.upiTransactionId || isVerified}
              >
                {isVerifying ? (
                  <span className="spinner-small">⟳</span>
                ) : isVerified ? (
                  "✓ Verified"
                ) : (
                  "Verify"
                )}
              </button>
            </div>
            {verificationMessage && (
              <div className="verification-success">{verificationMessage}</div>
            )}
            <small className="form-hint">Enter the Transaction ID from your UPI app after making payment</small>
          </div>
          
          <div className="payment-instructions">
            <p><strong>📱 How to find Transaction ID:</strong></p>
            <ul>
              <li><strong>Google Pay:</strong> Open app → Tap transaction → Copy "Transaction ID" (starts with TXN)</li>
              <li><strong>PhonePe:</strong> Open app → History → Tap transaction → Copy "Transaction ID"</li>
              <li><strong>PayTM:</strong> Open app → Passbook → Tap transaction → Copy "Order ID"</li>
              <li><strong>Amazon Pay:</strong> Open app → Your Orders → Tap transaction → Copy "Transaction ID"</li>
              <li><strong>BHIM App:</strong> Open app → Transaction History → Copy "UTR Number"</li>
            </ul>
            <div className="sample-id">
              <strong>Example:</strong> TXN1234567890 or 123456789012
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}
      
      <button 
        className={`btn btn-gold submit-btn ${isSubmitting ? 'loading' : ''}`}
        style={{ width: "100%", padding: "14px", marginTop: 12 }} 
        onClick={handleSubmit}
        disabled={(type === "purchase" && !isVerified) || isSubmitting}
      >
        {isSubmitting ? (
          <span className="loading-spinner">⟳</span>
        ) : (
          type === "purchase" ? "✅ Confirm Purchase" : "📅 Confirm Booking"
        )}
      </button>
    </div>
  );
}
// ─── COLOR PALETTE PICKER ─────────────────────────────────────────────────────

function ColorPalettePicker({ selectedColors, onChange }) {
  const toggle = (colorName) => {
    if (selectedColors.includes(colorName)) {
      onChange(selectedColors.filter(c => c !== colorName));
    } else {
      onChange([...selectedColors, colorName]);
    }
  };

  return (
    <div className="color-palette-picker">
      <div className="color-palette-grid">
        {COLOR_PALETTE.map(({ name, hex }) => (
          <button key={name} type="button" title={name} className={`palette-swatch ${selectedColors.includes(name) ? "selected" : ""}`} style={{ background: hex }} onClick={() => toggle(name)}>
            {selectedColors.includes(name) && <span className="swatch-check">✓</span>}
          </button>
        ))}
      </div>
      {selectedColors.length > 0 && (
        <div className="selected-colors-list">
          {selectedColors.map(c => (
            <div key={c} className="color-tag">
              <span className="color-dot sm" style={{ background: COLOR_HEX[c] || "#888" }} />
              {c}
              <button onClick={() => toggle(c)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", marginLeft: 4 }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── PRODUCT FORM ─────────────────────────────────────────────────────────────

function ProductForm({ product, onSave }) {
  const [form, setForm] = useState({
    productId: product?.id || "",
    name: product?.name || "",
    category: product?.category || "",
    sub_category: product?.subcategory || "",
    price: product?.cost || "",
    stock: product?.stock || "",
    sizes: product?.sizes || [],
    colors: product?.colors || [],
    occasion: product?.OccasionType || [],
    description: product?.description || "",
    includedItems: product?.includedComponents?.join(", ") || "",
    imageFiles: []
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = () => {
    if (!form.name || !form.category || !form.price) {
      alert("Please fill required fields");
      return;
    }
    onSave(form);
  };

  return (
    <>
      <div className="modal-title">{product ? "✏️ Edit Product" : "✨ Add New Product"}</div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Product ID</label>
          <input className="form-input" placeholder="e.g. SAR-025" value={form.productId} onChange={e => set("productId", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input className="form-input" placeholder="Product name" value={form.name} onChange={e => set("name", e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="form-input" value={form.category} onChange={e => { set("category", e.target.value); set("sub_category", ""); }}>
            <option value="">-- Select Category --</option>
            {Object.keys(SUBCATEGORY_MAP).map(c => (<option key={c} value={c}>{c}</option>))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Sub Category</label>
          <select className="form-input" value={form.sub_category} onChange={e => set("sub_category", e.target.value)} disabled={!form.category}>
            <option value="">-- Select Sub Category --</option>
            {form.category && SUBCATEGORY_MAP[form.category]?.map(sub => (<option key={sub} value={sub}>{sub}</option>))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Price (INR) *</label>
          <input className="form-input" type="number" placeholder="0" value={form.price} onChange={e => set("price", e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Stock Quantity</label>
          <input className="form-input" type="number" placeholder="0" value={form.stock} onChange={e => set("stock", e.target.value)} />
        </div>
      </div>

      {/* Sizes Section - Visual Tags */}
      <div className="form-group">
        <label className="form-label">📏 Available Sizes</label>
        <SizeSelector selectedSizes={form.sizes} onChange={(sizes) => set("sizes", sizes)} />
        {form.sizes.length > 0 && (
          <div className="selected-badges">
            {form.sizes.map(s => (<span key={s} className="selected-badge size-badge">{s}</span>))}
          </div>
        )}
      </div>

      {/* Occasion Type Section - Visual Tags */}
      <div className="form-group">
        <label className="form-label">🎯 Occasion Type</label>
        <OccasionSelector selectedOccasions={form.occasion} onChange={(occasions) => set("occasion", occasions)} />
        {form.occasion.length > 0 && (
          <div className="selected-badges">
            {form.occasion.map(o => (<span key={o} className="selected-badge occasion-badge">{o}</span>))}
          </div>
        )}
      </div>

      {/* Colors Section */}
      <div className="form-group">
        <label className="form-label">🎨 Colors</label>
        <ColorPalettePicker selectedColors={form.colors} onChange={v => set("colors", v)} />
      </div>

      {/* Images Section */}
      <div className="form-group">
        <label className="form-label">📸 Product Images</label>
        <label className="file-upload-btn">
          📁 Upload Images
          <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => {
            const files = Array.from(e.target.files);
            setForm(f => ({ ...f, imageFiles: [...f.imageFiles, ...files] }));
          }} />
        </label>
        {form.imageFiles.length > 0 && (
          <div className="img-preview-list">
            {form.imageFiles.map((f, i) => (
              <div key={i} className="img-preview-item">
                <img src={URL.createObjectURL(f)} alt={`preview-${i}`} />
                {i === 0 && <div className="img-primary-badge">Primary</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">📝 Description</label>
        <textarea className="form-input" rows={3} placeholder="Product description..." value={form.description} onChange={e => set("description", e.target.value)} />
      </div>

      <div className="form-group">
        <label className="form-label">📦 Included Items</label>
        <textarea className="form-input" rows={2} placeholder="e.g. Saree with Blouse Cloth, Gift Box…" value={form.includedItems} onChange={e => set("includedItems", e.target.value)} />
      </div>

      <button className="btn btn-gold" style={{ width: "100%", padding: "14px" }} onClick={handleSubmit}>
        {product ? "🔄 Update Product" : "✨ Add Product"}
      </button>
    </>
  );
}

// ─── PROFILE EDIT FORM ────────────────────────────────────────────────────────

function ProfileEditForm({ user, onSave }) {
  const [form, setForm] = useState({ ...user });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <>
      <div className="form-group"><label className="form-label">Full Name</label>
        <input className="form-input" value={form.name || ""} onChange={e => set("name", e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Email</label>
        <input className="form-input" type="email" value={form.email || ""} onChange={e => set("email", e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Phone</label>
        <input className="form-input" type="tel" value={form.phone || ""} onChange={e => set("phone", e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Address</label>
        <textarea className="form-input" rows={3} value={form.address || ""} onChange={e => set("address", e.target.value)} /></div>
      <button className="btn btn-gold" style={{ width: "100%", padding: "14px" }} onClick={() => onSave(form)}>Save Changes</button>
    </>
  );
}

// ─── LOGIN FORM ───────────────────────────────────────────────────────────────

function LoginForm({ onLogin, onSwitch }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  const submit = async () => {
    const err = await onLogin(email, password);
    if (err) setError(err);
  };
  
  return (
    <>
      <div className="modal-title">Welcome Back</div>
      <div className="form-group"><label className="form-label">Email</label>
        <input className="form-input" type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Password</label>
        <input className="form-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} /></div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-gold" style={{ width: "100%", padding: "14px", marginTop: 8 }} onClick={submit}>Login</button>
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
        New here? <button style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer" }} onClick={onSwitch}>Create Account</button>
      </div>
    </>
  );
}

// ─── SIGNUP FORM ──────────────────────────────────────────────────────────────

function SignupForm({ onSignup, onSwitch }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", address: "" });
  const [error, setError] = useState("");
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  
  const submit = async () => {
    if (!form.name || !form.email || !form.password) { setError("Name, email and password required"); return; }
    const err = await onSignup(form);
    if (err) setError(err);
  };
  
  return (
    <>
      <div className="modal-title">Create Account</div>
      <div className="form-group"><label className="form-label">Full Name</label>
        <input className="form-input" placeholder="Your name" value={form.name} onChange={e => set("name", e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Email</label>
        <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => set("email", e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Password</label>
        <input className="form-input" type="password" placeholder="••••••••" value={form.password} onChange={e => set("password", e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Phone</label>
        <input className="form-input" type="tel" placeholder="+91 00000 00000" value={form.phone} onChange={e => set("phone", e.target.value)} /></div>
      <div className="form-group"><label className="form-label">Address</label>
        <textarea className="form-input" rows={2} placeholder="Your address" value={form.address} onChange={e => set("address", e.target.value)} /></div>
      {error && <div className="error">{error}</div>}
      <button className="btn btn-gold" style={{ width: "100%", padding: "14px", marginTop: 8 }} onClick={submit}>Create Account</button>
      <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: "var(--text-muted)" }}>
        Already have an account? <button style={{ background: "none", border: "none", color: "var(--gold)", cursor: "pointer" }} onClick={onSwitch}>Login</button>
      </div>
    </>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function Modal({ children, onClose, wide }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: wide ? 860 : 560 }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: -12 }}>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <div className="footer-logo">LUXE</div>
          <div className="footer-tagline">Curated Excellence, Delivered.</div>
          <div className="footer-desc">Handpicked luxury goods for those who appreciate the finest in craftsmanship and design.</div>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Shop</div>
          <div className="footer-links">
            {["Sarees", "Kurtis", "Jewelry", "Bags", "Footwear", "Watches"].map(c => <div key={c} className="footer-link">{c}</div>)}
          </div>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Help</div>
          <div className="footer-links">
            {["Track Order", "Returns & Exchange", "Size Guide", "FAQ", "Contact Us"].map(l => <div key={l} className="footer-link">{l}</div>)}
          </div>
        </div>
        <div className="footer-col">
          <div className="footer-col-title">Contact</div>
          <div className="footer-contact-row">📞 {ADMIN_INFO.phone}</div>
          <div className="footer-contact-row">💳 UPI: {ADMIN_INFO.upiId}</div>
          <div className="footer-contact-row">📍 Hyderabad, Telangana</div>
          <div style={{ marginTop: 20 }}>
            <div className="footer-col-title" style={{ marginBottom: 12 }}>Follow Us</div>
            <div className="footer-socials">
              {["I", "F", "P", "Y"].map((s, i) => <div key={i} className="footer-social">{s}</div>)}
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div>© 2024 LUXE. All rights reserved.</div>
        <div className="footer-bottom-links">
          <span>Privacy Policy</span><span>Terms of Service</span><span>Shipping Policy</span>
        </div>
      </div>
    </footer>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [page, setPage] = useState("home");
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [modal, setModal] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [adminTab, setAdminTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [qty, setQty] = useState(1);
  const [profileEdit, setProfileEdit] = useState(false);
  const [checkoutType, setCheckoutType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminStats, setAdminStats] = useState({});
  const [latestProducts, setLatestProducts] = useState([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const setLoadingUsers = () =>{
    console.log("Done");
  }

  // Add these state variables
const [expandedOrder, setExpandedOrder] = useState(null);
const [expandedItems, setExpandedItems] = useState(null);
const [showAddressFor, setShowAddressFor] = useState(null);
const [verifyingPayment, setVerifyingPayment] = useState(false);

// Add these functions
const toggleOrderDetails = (orderId) => {
  setExpandedOrder(expandedOrder === orderId ? null : orderId);
};

const toggleItems = (orderId) => {
  setExpandedItems(expandedItems === orderId ? null : orderId);
};

const toggleAddress = (orderId) => {
  setShowAddressFor(showAddressFor === orderId ? null : orderId);
};

const viewOrderDetails = (order) => {
  setExpandedOrder(expandedOrder === order.id ? null : order.id);
};
  const loadAllUsers = async () => {
    setLoadingUsers(true);
    try {
      const users = await adminAPI.getAllUsers();
      setAllUsers(users);
    } catch (err) {
      console.error("Failed to load users:", err);
      showToast("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };
const verifyPaymentAndUpdate = async (orderId) => {
  setVerifyingPayment(true);
  try {
    const formData = new FormData();
    formData.append("admin_id", user?.id || "admin");
    
    const response = await fetch(`http://localhost:8000/nari-vastrika/admin/verify-payment/${orderId}`, {
      method: "POST",
      body: formData
    });
    
    if (response.ok) {
      showToast("✅ Payment verified successfully! Order confirmed.");
      await loadOrders(); // Refresh orders
      await loadAdminStats(); // Refresh stats
    } else {
      const error = await response.json();
      showToast(error.detail || "Failed to verify payment");
    }
  } catch (err) {
    console.error("Payment verification failed:", err);
    showToast("Failed to verify payment. Please try again.");
  } finally {
    setVerifyingPayment(false);
  }
};

const cancelOrder = async (orderId) => {
  if (!window.confirm("⚠️ Are you sure you want to cancel this order? This action cannot be undone.")) {
    return;
  }
  
  try {
    await updateOrderStatus(orderId, "Cancelled");
    showToast("Order cancelled successfully");
  } catch (err) {
    showToast("Failed to cancel order");
  }
};

  // Search / filter state
  const [searchQ, setSearchQ] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterColor, setFilterColor] = useState("");
  const [filterSize, setFilterSize] = useState("");
  const [filterSubCat, setFilterSubCat] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Load data
  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productsAPI.getWithDiscounts();
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products:", err);
      showToast("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  const loadOrders = async () => {
    try {
      const data = await ordersAPI.getAll();
      setOrders(data);
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
  };

  const loadLatestProducts = async () => {
    try {
      const data = await productsAPI.getLatest(8);
      setLatestProducts(data);
    } catch (err) {
      console.error("Failed to load latest products:", err);
    }
  };

  const loadAdminStats = async () => {
    try {
      const stats = await adminAPI.getStats();
      setAdminStats(stats);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  // Auto-rotate slider for latest collections
  useEffect(() => {
    if (latestProducts.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlideIndex((prev) => (prev + 1) % latestProducts.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [latestProducts.length]);

  useEffect(() => {
    loadProducts();
    loadOrders();
    loadLatestProducts();
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      loadAdminStats();
    }
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    const t = setTimeout(() => setShowSplash(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleLogin = async (email, password) => {
    try {
      const data = await usersAPI.login(email, password);
      const userData = { id: data.user_id, name: data.name, role: data.role };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      setModal(null);
      showToast(`Welcome back, ${data.name.split(" ")[0]}!`);
      if (data.role === "admin") setPage("admin");
      return null;
    } catch (err) {
      return err.message;
    }
  };

  const handleSignup = async (data) => {
    try {
      const result = await usersAPI.register(data);
      const userData = { id: result.user_id, name: result.name, role: result.role };
      setUser(userData);
      localStorage.setItem("user", JSON.stringify(userData));
      setModal(null);
      showToast(`Welcome to LUXE, ${data.name.split(" ")[0]}!`);
      return null;
    } catch (err) {
      return err.message;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
    setPage("home");
    setCart([]);
    showToast("Logged out.");
  };

  const addToCart = (product) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === product.id);
      if (exists) {
        return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + qty } : i);
      }
      return [...prev, { ...product, qty }];
    });
    showToast(`${product.name} added to cart!`);
    setModal(null);
    setQty(1);
  };

  const deleteProduct = async (id) => {
    try {
      await productsAPI.delete(id);
      await loadProducts();
      showToast("Product deleted.");
    } catch (err) {
      showToast("Failed to delete product");
    }
  };

  const saveProduct = async (data) => {
    const formData = new FormData();
    formData.append("id", data.productId);
    formData.append("name", data.name);
    formData.append("category", data.category);
    formData.append("subcategory", data.sub_category);
    formData.append("cost", data.price);
    formData.append("stock", data.stock);
    formData.append("description", data.description);
    formData.append("includedComponents", data.includedItems);
    formData.append("OccasionType", (data.occasion || []).join(","));
    formData.append("sizes", (data.sizes || []).join(","));
    formData.append("colors", (data.colors || []).join(","));
    (data.imageFiles || []).forEach(f => formData.append("images", f));

    try {
      if (data.productId && products.find(p => p.id === data.productId)) {
        await productsAPI.update(data.productId, formData);
        showToast("Product updated!");
      } else {
        await productsAPI.create(formData);
        showToast("Product added!");
      }
      await loadProducts();
      await loadLatestProducts();
    } catch (err) {
      showToast("Failed to save product");
    }
    setModal(null);
    setEditingProduct(null);
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      await ordersAPI.updateStatus(orderId, status);
      await loadOrders();
      showToast("Order updated.");
    } catch (err) {
      showToast("Failed to update order");
    }
  };

  const saveProfile = async (updated) => {
    try {
      await usersAPI.updateProfile(updated.id, updated);
      setUser(updated);
      showToast("Profile updated!");
    } catch (err) {
      showToast("Failed to update profile");
    }
    setProfileEdit(false);
  };
  // Add these state variables
const [showAdminProfileEdit, setShowAdminProfileEdit] = useState(false);
const [adminProfile, setAdminProfile] = useState(null);

// Add this function
const loadAdminProfile = async () => {
  if (user?.id) {
    try {
      const profile = await adminAPI.getAdminProfile(user.id);
      setAdminProfile(profile);
    } catch (err) {
      console.error("Failed to load admin profile:", err);
    }
  }
};

const updateAdminProfile = async (profileData) => {
  const result = await adminAPI.updateAdminProfile(user.id, profileData);
  // Update the user state with new info
  setUser({
    ...user,
    name: result.admin.name,
    email: result.admin.email,
  });
  // Update localStorage
  localStorage.setItem("user", JSON.stringify({
    ...user,
    name: result.admin.name,
    email: result.admin.email,
  }));
  return result;
};

// Add to useEffect
useEffect(() => {
  if (user?.role === "admin") {
    loadAdminStats();
    loadAllUsers();
    loadAdminProfile(); // Add this
  }
}, [user]);

  const placeOrder = async (formData, type) => {
  const orderData = {
    customer_name: formData.name,
    customer_email: formData.email,  // ADD THIS LINE
    customer_phone: formData.phone,
    address: formData.address,
    pincode: formData.pincode,
    order_type: type,
    upi_transaction_id: formData.upiTransactionId,
    items: cart.map(i => ({ productId: i.id, name: i.name, qty: i.qty, price: i.cost })),
    total: cartTotal,
    user_id: user?.id || null,
  };

  try {
    await ordersAPI.create(orderData);
    setCart([]);
    setModal(null);
    setCheckoutType(null);
    await loadOrders();
    showToast(type === "purchase" ? "Order placed! 🎉" : "Booking confirmed! 📅");
  } catch (err) {
    showToast("Failed to place order");
  }
};

  // Computed values
  const allSubcats = Array.from(new Set(products.filter(p => filterCat === "All" || p.category === filterCat).map(p => p.subcategory).filter(Boolean)));
  
  const filteredProducts = products.filter(p => {
    const q = searchQ.toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) ||
      (p.subcategory || "").toLowerCase().includes(q) ||
      (p.colors || []).some(c => c.toLowerCase().includes(q)) ||
      (p.OccasionType || []).some(o => o.toLowerCase().includes(q));
    const matchCat = filterCat === "All" || p.category === filterCat;
    const matchColor = !filterColor || (p.colors || []).includes(filterColor);
    const matchSize = !filterSize || (p.sizes || []).includes(filterSize);
    const matchSubCat = !filterSubCat || p.subcategory === filterSubCat;
    const pINR = p.cost;
    return matchQ && matchCat && matchColor && matchSize && matchSubCat &&
      (!priceMin || pINR >= Number(priceMin)) && (!priceMax || pINR <= Number(priceMax));
  });

  const userOrders = orders.filter(o => o.user_id === user?.id);
  const cartTotal = cart.reduce((s, i) => s + i.cost * i.qty, 0);
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  if (showSplash) return <Splash />;

  return (
    <>
      <nav className="nav">
        <div className="nav-logo" onClick={() => setPage("home")}><img src={Logo} className="nav-logo-img"/></div>
        <div className="nav-links">
          <button className={`nav-link ${page === "home" ? "active" : ""}`} onClick={() => setPage("home")}>Shop</button>
          {user?.role === "admin" && <button className={`nav-link ${page === "admin" ? "active" : ""}`} onClick={() => setPage("admin")}>Admin</button>}
          {user && <button className={`nav-link ${page === "profile" ? "active" : ""}`} onClick={() => setPage("profile")}>Profile</button>}
          {user?.role !== "admin" && (
            <button className="cart-btn btn-outline" onClick={() => setModal("cart")}>
              🛍 Cart {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          )}
          {!user ? (
            <button className="btn btn-gold" onClick={() => setModal("login")}>Login</button>
          ) : (
            <button className="btn btn-outline" onClick={logout}>Logout</button>
          )}
        </div>
      </nav>

      {page === "home" && (
        <>
          <div className="hero">
  <div className="hero-overlay" />
  <div className="hero-bg" style={{ backgroundImage: `url(${Hero1})` }} />
  <div className="hero-content">
    <div className="hero-tag">New Collection 2024</div>
    <h1 className="hero-title">Where Craft<br />Meets Desire</h1>
    <p className="hero-sub">Discover handpicked luxury goods curated for the discerning eye.</p>
    <button 
      className="btn btn-gold hero-cta" 
      onClick={() => document.getElementById("products-section")?.scrollIntoView({ behavior: "smooth" })}
    >
      Explore Collection
    </button>
  </div>
</div>
          {/* LATEST COLLECTIONS SLIDER */}
          {latestProducts.length > 0 && (
            <div className="section latest-collections">
              <div className="section-header">
                <div>
                  <div className="section-title">✨ Latest Collections</div>
                  <div className="section-sub">Fresh arrivals just for you</div>
                </div>
              </div>
              
              <div className="hero-slider">
                <div className="slider-main">
                  <div className="slider-image-container">
                    <ImageSlider 
                      images={latestProducts[currentSlideIndex]?.images || []} 
                      productName={latestProducts[currentSlideIndex]?.name}
                      fit="contain"
                      height="400px"
                    />
                  </div>
                  <div className="slider-info">
                    <h3>{latestProducts[currentSlideIndex]?.name}</h3>
                    <p>{latestProducts[currentSlideIndex]?.description?.substring(0, 100)}...</p>
                    <div className="price-section">
                      {latestProducts[currentSlideIndex]?.discount ? (
                        <>
                          <span className="original-price">₹{latestProducts[currentSlideIndex]?.original_price?.toLocaleString("en-IN")}</span>
                          <span className="discounted-price">₹{latestProducts[currentSlideIndex]?.discounted_price?.toLocaleString("en-IN")}</span>
                          <span className="discount-badge">{latestProducts[currentSlideIndex]?.discount}% OFF</span>
                        </>
                      ) : (
                        <span className="price">₹{latestProducts[currentSlideIndex]?.price_inr?.toLocaleString("en-IN")}</span>
                      )}
                    </div>
                    <button 
                      className="btn btn-gold"
                      onClick={() => {
                        setSelectedProduct(latestProducts[currentSlideIndex]);
                        setModal("productDetail");
                      }}
                    >
                      Shop Now
                    </button>
                  </div>
                </div>
                <div className="slider-thumbnails">
                  {latestProducts.map((product, idx) => (
                    <div
                      key={product.id}
                      className={`thumbnail ${idx === currentSlideIndex ? 'active' : ''}`}
                      onClick={() => setCurrentSlideIndex(idx)}
                    >
                      <ProductImage 
                        imageId={product.images?.[0]?.id}
                        alt={product.name}
                        fit="cover"
                        style={{ width: '80px', height: '80px' }}
                      />
                      {product.discount && <span className="thumb-discount">{product.discount}%</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="section" id="products-section">
            <div className="section-header">
              <div>
                <div className="section-title">Our Collection</div>
                <div className="section-sub">Handpicked, Timeless, Yours</div>
              </div>
              <button className="filter-toggle-btn" onClick={() => setShowFilters(f => !f)}>
                ⚙ Filters {showFilters ? "▲" : "▼"}
              </button>
            </div>

            <div className="search-area">
              <input className="form-input search-main" placeholder="Search by name, color, category, occasion, size…" value={searchQ} onChange={e => setSearchQ(e.target.value)} />
            </div>

            {showFilters && (
              <div className="filters-panel">
                <div className="filter-row">
                  {[
                    ["Category", <select key="cat" className="form-input" value={filterCat} onChange={e => { setFilterCat(e.target.value); setFilterSubCat(""); }}>{ALL_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>],
                    ["Sub Category", <select key="sub" className="form-input" value={filterSubCat} onChange={e => setFilterSubCat(e.target.value)}><option value="">All</option>{allSubcats.map(s => <option key={s}>{s}</option>)}</select>],
                    ["Color", <select key="color" className="form-input" value={filterColor} onChange={e => setFilterColor(e.target.value)}><option value="">All Colors</option>{COLOR_PALETTE.map(c => <option key={c.name}>{c.name}</option>)}</select>],
                    ["Size", <select key="size" className="form-input" value={filterSize} onChange={e => setFilterSize(e.target.value)}><option value="">All Sizes</option>{ALL_SIZES.map(s => <option key={s}>{s}</option>)}</select>],
                    ["Min Price (₹)", <input key="min" className="form-input" type="number" placeholder="0" value={priceMin} onChange={e => setPriceMin(e.target.value)} />],
                    ["Max Price (₹)", <input key="max" className="form-input" type="number" placeholder="99999" value={priceMax} onChange={e => setPriceMax(e.target.value)} />],
                  ].map(([label, el]) => (
                    <div className="filter-item" key={label}><label className="filter-label">{label}</label>{el}</div>
                  ))}
                </div>
                <button className="btn btn-outline btn-sm" style={{ marginTop: 8 }} onClick={() => { setFilterCat("All"); setFilterColor(""); setFilterSize(""); setFilterSubCat(""); setPriceMin(""); setPriceMax(""); setSearchQ(""); }}>
                  Clear All Filters
                </button>
              </div>
            )}

            {loading ? (
              <div className="loading-spinner">Loading...</div>
            ) : (
              <div className="products-grid">
                {filteredProducts.map(p => (
                  <div key={p.id} className="product-card" onClick={() => { setSelectedProduct(p); setQty(1); setModal("productDetail"); }}>
                    <div className="product-img-wrap">
                      {p.images && p.images.length > 0 ? (
                        <ProductImage 
                          imageId={p.images[0].id} 
                          alt={p.name}
                          fit="contain"
                          className="product-card-image"
                          style={{ width: '100%', height: '100%' }}
                        />
                      ) : (
                        <img 
                          src="https://via.placeholder.com/300x300?text=No+Image" 
                          alt={p.name}
                          className="image-fit-contain"
                          style={{ width: '100%', height: '100%' }}
                        />
                      )}
                      {p.stock <= 5 && <div className="low-stock-badge">Only {p.stock} left!</div>}
                      {p.discount && <div className="discount-badge-corner">{p.discount}% OFF</div>}
                    </div>
                    <div className="product-card-body">
                      <div className="product-category">{p.category}{p.subcategory ? ` · ${p.subcategory}` : ""}</div>
                      <div className="product-name">{p.name}</div>
                      <div className="product-desc">{p.description?.substring(0, 80)}...</div>
                      {p.colors?.length > 0 && (
                        <div className="color-dots">
                          {p.colors.slice(0, 5).map(c => <span key={c} className="color-dot" title={c} style={{ background: COLOR_HEX[c] || "#888" }} />)}
                        </div>
                      )}
                      <div className="product-price-section">
                        {p.discount ? (
                          <>
                            <span className="original-price">₹{p.original_price?.toLocaleString("en-IN")}</span>
                            <span className="discounted-price">₹{p.discounted_price?.toLocaleString("en-IN")}</span>
                          </>
                        ) : (
                          <span className="product-price">₹{p.price_inr?.toLocaleString("en-IN")}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredProducts.length === 0 && <div className="no-data" style={{ gridColumn: "1/-1" }}>No products found.</div>}
              </div>
            )}
          </div>
        </>
      )}

      {/* PROFILE PAGE */}
      {page === "profile" && user && (
        <div className="section">
          <div className="section-title">Your Profile</div>
          <div className="section-sub">Personal Account</div>
          <div className="profile-grid">
            <div>
              <div className="profile-card mb-24">
                <div className="avatar">{user.name?.charAt(0)}</div>
                <div className="profile-name">{user.name}</div>
                <div className="profile-role">{user.role}</div>
                <button className="btn btn-outline" style={{ marginTop: 24, width: "100%" }} onClick={() => setProfileEdit(!profileEdit)}>
                  {profileEdit ? "Cancel" : "Edit Profile"}
                </button>
              </div>
              <div className="card-box">
                <div className="card-box-title">My Orders</div>
                {userOrders.length === 0 && <div className="text-muted" style={{ fontSize: 14 }}>No orders yet.</div>}
                {userOrders.map(o => (
                  <div key={o.id} className="order-row">
                    <div className="flex justify-between items-center mb-8">
                      <span style={{ fontWeight: 600 }}>{o.id}</span>
                      <div className="flex gap-8">
                        <span className={`badge ${o.order_type === "booking" ? "badge-blue" : "badge-purple"}`}>{o.order_type || "purchase"}</span>
                        <span className={`badge ${o.status === "Delivered" ? "badge-green" : "badge-amber"}`}>{o.status}</span>
                      </div>
                    </div>
                    {o.items?.map(i => <div key={i.productId} style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>{i.name} × {i.qty}</div>)}
                    <div style={{ fontSize: 15, color: "var(--gold)", marginTop: 8 }}>₹{o.total_inr?.toLocaleString("en-IN")}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{new Date(o.date).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card-box" style={{ padding: 36 }}>
              <div className="card-box-title" style={{ fontSize: 24, marginBottom: 28 }}>{profileEdit ? "Edit Information" : "Personal Information"}</div>
              {profileEdit ? (
                <ProfileEditForm user={user} onSave={saveProfile} />
              ) : (
                <div>
                  {[["Full Name", user.name], ["Email", user.email], ["Phone", user.phone || "—"], ["Address", user.address || "—"]].map(([l, v]) => (
                    <div key={l} style={{ marginBottom: 24 }}>
                      <div className="form-label">{l}</div>
                      <div style={{ fontSize: 16 }}>{v}</div>
                      <div className="divider" style={{ margin: "16px 0" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN PAGE */}
      {page === "admin" && user?.role === "admin" && (
        <div className="admin-layout">
          <div className="admin-sidebar">
            <div className="admin-sidebar-title">Admin Panel</div>
            {[["dashboard", "📊 Dashboard"], ["products", "📦 Products"], ["discounts", "🎯 Discounts"], ["orders", "🛒 Orders"]].map(([k, l]) => (
              <div key={k} className={`admin-nav-item ${adminTab === k ? "active" : ""}`} onClick={() => setAdminTab(k)}>{l}</div>
            ))}
              <div className="admin-profile-btn" onClick={() => setShowAdminProfileEdit(true)}>
        👤 Edit My Profile       
    </div>
          </div>
          
          <div className="admin-content">
            {adminTab === "dashboard" && (
              <>
                <div className="admin-page-title">Dashboard</div>
                <div className="stats-grid">
                  {[
                    ["Products", adminStats.products || 0, "In catalog"],
                    ["Orders", adminStats.orders || 0, "Total orders"],
                    ["Revenue", `₹${(adminStats.revenue || 0).toLocaleString("en-IN")}`, "Gross"],
                    ["Customers", adminStats.customers || 0, "Registered"],
                  ].map(([l, v, s]) => (
                    <div key={l} className="stat-card">
                      <div className="stat-label">{l}</div>
                      <div className="stat-value">{v}</div>
                      <div className="stat-sub">{s}</div>
                    </div>
                  ))}
                </div>
                <div className="admin-section-title">Recent Orders</div>
                <table>
                  <thead><tr><th>Order ID</th><th>Type</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
                  <tbody>
                    {orders.slice(-5).reverse().map(o => (
                      <tr key={o.id}>
                        <td data-label="ID">{o.id}</td>
                        <td data-label="Type"><span className={`badge ${o.order_type === "booking" ? "badge-blue" : "badge-purple"}`}>{o.order_type || "purchase"}</span></td>
                        <td data-label="Items">{o.items?.map(i => i.name).join(", ")}</td>
                        <td data-label="Total" className="text-gold">₹{o.total_inr?.toLocaleString("en-IN")}</td>
                        <td data-label="Status"><span className={`badge ${o.status === "Delivered" ? "badge-green" : "badge-amber"}`}>{o.status}</span></td>
                        <td data-label="Date" className="text-muted">{new Date(o.date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}

            {adminTab === "products" && (
              <>
                <div className="flex justify-between items-center mb-32">
                  <div>
                    <div className="admin-page-title">Products</div>
                    <div className="text-muted" style={{ fontSize: 13 }}>{products.length} items</div>
                  </div>
                  <button className="btn btn-gold" onClick={() => { setEditingProduct(null); setModal("productForm"); }}>+ Add Product</button>
                </div>
                <table>
                  <thead><tr><th></th><th>Name</th><th>Category</th><th>Colors</th><th>Sizes</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
                  <tbody>
                    {products.map(p => (
                      <tr key={p.id}>
                        <td data-label="Image"><img className="thumb" src={p.images?.[0] ? productsAPI.getImageUrl(p.images[0].id) : "https://via.placeholder.com/48"} alt={p.name} /></td>
                        <td data-label="Name" style={{ fontWeight: 500 }}>{p.name}</td>
                        <td data-label="Category" className="text-muted">{p.category}</td>
                        <td data-label="Colors"><div className="color-dots">{(p.colors || []).slice(0, 4).map(c => <span key={c} className="color-dot" title={c} style={{ background: COLOR_HEX[c] || "#888" }} />)}</div></td>
                        <td data-label="Sizes" className="text-muted" style={{ fontSize: 12 }}>{(p.sizes || []).join(", ")}</td>
                        <td data-label="Price" className="text-gold">₹{p.cost.toLocaleString("en-IN")}</td>
                        <td data-label="Stock">{p.stock}</td>
                        <td data-label="Actions"><div className="flex gap-8">
                          <button className="btn btn-outline btn-sm" onClick={() => { setEditingProduct(p); setModal("productForm"); }}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteProduct(p.id)}>Delete</button>
                        </div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            {adminTab === "users" && (
  <UserManagement
    users={allUsers}
    onUpdateUser={updateUser}
    onDeleteUser={deleteUser}
    onResetPassword={resetUserPassword}
  />
)}
            {adminTab === "discounts" && (
              <>
                <div className="admin-page-title">🎯 Discount Management</div>
                <DiscountManager products={products} onDiscountApplied={loadProducts} />
              </>
            )}
{adminTab === "orders" && (
  <>
    <div className="admin-orders-header">
      <div>
        <div className="admin-page-title">📦 Orders Management</div>
        <div className="text-muted" style={{ fontSize: 13 }}>
          {orders.length} total orders | 
          {orders.filter(o => o.status === "Pending Verification").length} pending verification | 
          {orders.filter(o => o.status === "Processing").length} processing | 
          {orders.filter(o => o.status === "Shipped").length} shipped | 
          {orders.filter(o => o.status === "Delivered").length} delivered
        </div>
      </div>
      <div className="admin-actions">
        <button className="btn btn-outline btn-sm" onClick={() => loadOrders()}>
          🔄 Refresh
        </button>
      </div>
    </div>

    {/* Pending Verifications Section */}
    {orders.filter(o => o.status === "Pending Verification").length > 0 && (
      <div className="pending-verifications-section">
        <div className="section-title-small">
          ⏳ Pending Payment Verifications ({orders.filter(o => o.status === "Pending Verification").length})
        </div>
        <div className="pending-cards">
          {orders.filter(o => o.status === "Pending Verification").map(o => (
            <div key={o.id} className="pending-card">
              <div className="pending-card-header">
                <span className="order-id">{o.id}</span>
                <span className="pending-badge">⏳ Pending</span>
              </div>
              <div className="pending-card-body">
                <div className="pending-info-grid">
                  <div className="pending-info">
                    <strong>Customer:</strong> {o.customer_name}
                  </div>
                  <div className="pending-info">
                    <strong>Phone:</strong> <a href={`tel:${o.customer_phone}`}>{o.customer_phone}</a>
                  </div>
                  <div className="pending-info">
                    <strong>Email:</strong> <a href={`mailto:${o.customer_email}`}>{o.customer_email || "—"}</a>
                  </div>
                  <div className="pending-info">
                    <strong>Amount:</strong> <span className="text-gold">₹{o.total_inr?.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="pending-info">
                    <strong>UPI Transaction ID:</strong> 
                    <code className="transaction-id">{o.upi_transaction_id || "—"}</code>
                  </div>
                </div>
                <div className="pending-actions">
                  <button 
                    className="btn btn-success btn-sm"
                    onClick={() => verifyPaymentAndUpdate(o.id)}
                  >
                    ✅ Verify Payment & Confirm Order
                  </button>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                  >
                    📋 View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* Orders Table */}
    <div className="orders-table-container">
      <table className="orders-table">
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Customer Details</th>
            <th>Items</th>
            <th>Total</th>
            <th>Status</th>
            <th>Payment</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <Fragment key={o.id}>
              <tr>
                <td data-label="Order ID">
                  {o.id}
                  {o.order_type === "booking" && <span className="order-type-badge booking">📅 Booking</span>}
                  {o.order_type === "purchase" && <span className="order-type-badge purchase">🛒 Purchase</span>}
                </td>
                <td data-label="Customer Details">
                  <div className="customer-details">
                    <div><strong>{o.customer_name || "Guest"}</strong></div>
                    <div><a href={`tel:${o.customer_phone}`}>📞 {o.customer_phone || "—"}</a></div>
                    {o.customer_email && <div><a href={`mailto:${o.customer_email}`}>✉️ {o.customer_email}</a></div>}
                  </div>
                </td>
                <td data-label="Items">
                  {o.items?.slice(0, 2).map((i, idx) => (
                    <div key={idx}>{i.name} × {i.qty}</div>
                  ))}
                  {o.items?.length > 2 && (
                    <button className="view-more-items" onClick={() => setExpandedItems(expandedItems === o.id ? null : o.id)}>
                      +{o.items.length - 2} more
                    </button>
                  )}
                  {expandedItems === o.id && o.items?.slice(2).map((i, idx) => (
                    <div key={idx} className="full-item">{i.name} × {i.qty}</div>
                  ))}
                </td>
                <td className="text-gold">₹{o.total_inr?.toLocaleString("en-IN")}</td>
                <td>
                  <select 
                    className={`status-select`}
                    value={o.status} 
                    onChange={e => updateOrderStatus(o.id, e.target.value)}
                  >
                    <option value="Pending Verification">⏳ Pending Verification</option>
                    <option value="Processing">⚙️ Processing</option>
                    <option value="Confirmed">✅ Confirmed</option>
                    <option value="Shipped">🚚 Shipped</option>
                    <option value="Delivered">🎉 Delivered</option>
                    <option value="Cancelled">❌ Cancelled</option>
                  </select>
                </td>
                <td>
                  {o.order_type === "purchase" && (
                    o.is_payment_verified ? 
                      <span className="payment-verified">✅ Verified</span> :
                      <span className="payment-pending">⏳ Pending</span>
                  )}
                  {o.order_type === "booking" && <span>📅 Booked</span>}
                </td>
                <td className="text-muted">
                  {new Date(o.date).toLocaleDateString()}
                </td>
                <td>
                  <button 
                    className="btn btn-outline btn-sm"
                    onClick={() => setExpandedOrder(expandedOrder === o.id ? null : o.id)}
                  >
                    {expandedOrder === o.id ? "▲" : "▼"} Details
                  </button>
                </td>
              </tr>
              {expandedOrder === o.id && (
                <tr className="order-details-row">
                  <td colSpan="8">
                    <div className="order-details-expanded">
                      <h4>📋 Complete Order Details</h4>
                      <p><strong>Address:</strong> {o.address}</p>
                      <p><strong>Pincode:</strong> {o.pincode}</p>
                      {o.upi_transaction_id && (
                        <p><strong>UPI Transaction ID:</strong> <code>{o.upi_transaction_id}</code></p>
                      )}
                      <h4>🛍️ All Items</h4>
                      {o.items?.map((item, idx) => (
                        <div key={idx}>{item.name} - Qty: {item.qty} - ₹{item.price}</div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  </>
)}
          </div>
        </div>
      )}
             {showAdminProfileEdit && (
  <Modal onClose={() => setShowAdminProfileEdit(false)}>
    <AdminProfileEdit
      admin={adminProfile}
      onUpdate={updateAdminProfile}
      onClose={() => setShowAdminProfileEdit(false)}
    />
  </Modal>
)}
 

      {/* MODALS */}
      {modal === "login" && <Modal onClose={() => setModal(null)}><LoginForm onLogin={handleLogin} onSwitch={() => setModal("signup")} /></Modal>}
      {modal === "signup" && <Modal onClose={() => setModal(null)}><SignupForm onSignup={handleSignup} onSwitch={() => setModal("login")} /></Modal>}
      {modal === "productDetail" && selectedProduct && (
        <Modal onClose={() => setModal(null)} wide>
          <ProductDetailFull
            product={selectedProduct} 
            qty={qty} 
            setQty={setQty}
            user={user} 
            onAddToCart={addToCart}
            onLoadSimilar={async (product) => {
              setSelectedProduct(product);
              setQty(1);
            }}
          />
        </Modal>
      )}
      {modal === "cart" && (
        <Modal onClose={() => { setModal(null); setCheckoutType(null); }}>
          <CartModal
            cart={cart} setCart={setCart} cartTotal={cartTotal}
            checkoutType={checkoutType} setCheckoutType={setCheckoutType}
            adminInfo={ADMIN_INFO} user={user}
            onPlaceOrder={placeOrder}
            onLogin={() => setModal("login")}
          />
        </Modal>
      )}
      {modal === "productForm" && (
        <Modal onClose={() => { setModal(null); setEditingProduct(null); }} wide>
          <ProductForm product={editingProduct} onSave={saveProduct} />
        </Modal>
      )}

      {toast && <div className="toast">{toast}</div>}
      <Footer />
    </>
  );
}

// ============ SIZE SELECTOR COMPONENT ============
function SizeSelector({ selectedSizes, onChange }) {
  const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "6", "7", "8", "9", "10", "50ml", "100ml"];
  
  const toggleSize = (size) => {
    if (selectedSizes.includes(size)) {
      onChange(selectedSizes.filter(s => s !== size));
    } else {
      onChange([...selectedSizes, size]);
    }
  };

  return (
    <div className="size-selector">
      <div className="size-tag-grid">
        {ALL_SIZES.map(size => (
          <button
            key={size}
            type="button"
            className={`size-tag ${selectedSizes.includes(size) ? 'selected' : ''}`}
            onClick={() => toggleSize(size)}
          >
            {size}
          </button>
        ))}
      </div>
      {selectedSizes.length > 0 && (
        <div className="selected-badges">
          {selectedSizes.map(s => (
            <span key={s} className="selected-badge size-badge">
              {s}
              <button 
                onClick={() => toggleSize(s)} 
                className="remove-badge"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ OCCASION SELECTOR COMPONENT ============
function OccasionSelector({ selectedOccasions, onChange }) {
  const OCCASION_OPTIONS = ["Casual", "Formal", "Wedding", "Festival", "Party", "Business", "Evening", "Home Decor"];
  
  const getOccasionIcon = (occasion) => {
    const icons = {
      "Wedding": "💒",
      "Festival": "🎉",
      "Party": "🎭",
      "Formal": "👔",
      "Casual": "👕",
      "Business": "💼",
      "Evening": "🌙",
      "Home Decor": "🏠"
    };
    return icons[occasion] || "✨";
  };

  const toggleOccasion = (occasion) => {
    if (selectedOccasions.includes(occasion)) {
      onChange(selectedOccasions.filter(o => o !== occasion));
    } else {
      onChange([...selectedOccasions, occasion]);
    }
  };

  return (
    <div className="occasion-selector">
      <div className="occasion-tag-grid">
        {OCCASION_OPTIONS.map(occasion => (
          <button
            key={occasion}
            type="button"
            className={`occasion-tag ${selectedOccasions.includes(occasion) ? 'selected' : ''}`}
            onClick={() => toggleOccasion(occasion)}
          >
            <span className="occasion-icon">{getOccasionIcon(occasion)}</span>
            <span>{occasion}</span>
          </button>
        ))}
      </div>
      {selectedOccasions.length > 0 && (
        <div className="selected-badges">
          {selectedOccasions.map(o => (
            <span key={o} className="selected-badge occasion-badge">
              {getOccasionIcon(o)} {o}
              <button 
                onClick={() => toggleOccasion(o)} 
                className="remove-badge"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// User Management Component
function UserManagement({ users, onUpdateUser, onDeleteUser, onResetPassword }) {
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showResetPassword, setShowResetPassword] = useState(null);
  const [newPassword, setNewPassword] = useState("");

  const handleEdit = (user) => {
    setEditingUser(user.id);
    setEditForm({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
      role: user.role,
    });
  };

  const handleSave = async (userId) => {
    await onUpdateUser(userId, editForm);
    setEditingUser(null);
  };

  const handleResetPassword = async (userId) => {
    if (!newPassword || newPassword.length < 4) {
      alert("Password must be at least 4 characters");
      return;
    }
    await onResetPassword(userId, newPassword);
    setShowResetPassword(null);
    setNewPassword("");
  };

  return (
    <div className="user-management">
      <div className="admin-page-title">👥 User Management</div>
      <div className="text-muted mb-32">Manage customer and admin accounts</div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>User ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Role</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td data-label="User ID" className="user-id">{user.id?.substring(0, 8)}...</td>
                <td data-label="Name">
                  {editingUser === user.id ? (
                    <input
                      className="form-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      style={{ width: "150px" }}
                    />
                  ) : (
                    <strong>{user.name}</strong>
                  )}
                </td>
                <td data-label="Email">
                  {editingUser === user.id ? (
                    <input
                      className="form-input"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      style={{ width: "180px" }}
                    />
                  ) : (
                    <a href={`mailto:${user.email}`}>{user.email}</a>
                  )}
                </td>
                <td data-label="Phone">
                  {editingUser === user.id ? (
                    <input
                      className="form-input"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      style={{ width: "120px" }}
                    />
                  ) : (
                    user.phone || "—"
                  )}
                </td>
                <td data-label="Address">
                  {editingUser === user.id ? (
                    <textarea
                      className="form-input"
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      style={{ width: "150px", fontSize: "11px" }}
                      rows={2}
                    />
                  ) : (
                    <span title={user.address}>{user.address?.substring(0, 30) || "—"}</span>
                  )}
                </td>
                <td data-label="Role">
                  {editingUser === user.id ? (
                    <select
                      className="form-input"
                      value={editForm.role}
                      onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                      style={{ width: "100px" }}
                    >
                      <option value="customer">Customer</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`role-badge ${user.role}`}>
                      {user.role === "admin" ? "👑 Admin" : "👤 Customer"}
                    </span>
                  )}
                </td>
                <td data-label="Joined" className="text-muted" style={{ fontSize: "11px" }}>
                  {new Date(user.joined).toLocaleDateString()}
                </td>
                <td data-label="Actions">
                  <div className="user-actions">
                    {editingUser === user.id ? (
                      <>
                        <button className="btn btn-success btn-sm" onClick={() => handleSave(user.id)}>
                          💾 Save
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => setEditingUser(null)}>
                          ✖ Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button className="btn btn-outline btn-sm" onClick={() => handleEdit(user)}>
                          ✏️ Edit
                        </button>
                        {showResetPassword === user.id ? (
                          <div className="reset-password-form">
                            <input
                              type="password"
                              className="form-input"
                              placeholder="New password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              style={{ width: "120px" }}
                            />
                            <button className="btn btn-success btn-sm" onClick={() => handleResetPassword(user.id)}>
                              Confirm
                            </button>
                            <button className="btn btn-outline btn-sm" onClick={() => setShowResetPassword(null)}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-warning btn-sm" onClick={() => setShowResetPassword(user.id)}>
                            🔑 Reset Password
                          </button>
                        )}
                        {user.role !== "admin" && (
                          <button className="btn btn-danger btn-sm" onClick={() => onDeleteUser(user.id)}>
                            🗑 Delete
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Admin Profile Edit Component
function AdminProfileEdit({ admin, onUpdate, onClose }) {
  const [form, setForm] = useState({
    name: admin?.name || "",
    email: admin?.email || "",
    phone: admin?.phone || "",
    address: admin?.address || "",
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    
    // Validate
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    
    if (!form.email.trim()) {
      setError("Email is required");
      return;
    }
    
    // Password validation
    if (form.new_password) {
      if (!form.current_password) {
        setError("Current password is required to set new password");
        return;
      }
      if (form.new_password.length < 4) {
        setError("New password must be at least 4 characters");
        return;
      }
      if (form.new_password !== form.confirm_password) {
        setError("New password and confirm password do not match");
        return;
      }
    }
    
    setLoading(true);
    try {
      const updateData = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
      };
      
      if (form.current_password && form.new_password) {
        updateData.current_password = form.current_password;
        updateData.new_password = form.new_password;
      }
      
      const result = await onUpdate(updateData);
      setSuccess("✅ Profile updated successfully!");
      
      // Clear password fields
      setForm({
        ...form,
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
      
      // Close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-profile-edit">
      <div className="modal-title">👤 Edit Admin Profile</div>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="form-group">
        <label className="form-label">Full Name *</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your full name"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Email Address *</label>
        <input
          className="form-input"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="admin@example.com"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Phone Number</label>
        <input
          className="form-input"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          placeholder="+91 98765 43210"
        />
      </div>
      
      <div className="form-group">
        <label className="form-label">Address</label>
        <textarea
          className="form-input"
          rows={3}
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Your address"
        />
      </div>
      
      <div className="divider"></div>
      
      <h4 className="password-section-title">🔐 Change Password</h4>
      <p className="password-hint">Leave empty if you don't want to change password</p>
      
      <div className="form-group">
        <label className="form-label">Current Password</label>
        <input
          className="form-input"
          type="password"
          value={form.current_password}
          onChange={(e) => setForm({ ...form, current_password: e.target.value })}
          placeholder="Enter current password"
        />
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input
            className="form-input"
            type="password"
            value={form.new_password}
            onChange={(e) => setForm({ ...form, new_password: e.target.value })}
            placeholder="New password (min 4 chars)"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input
            className="form-input"
            type="password"
            value={form.confirm_password}
            onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
            placeholder="Confirm new password"
          />
        </div>
      </div>
      
      <div className="form-actions">
        <button className="btn btn-outline" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-gold" onClick={handleSubmit} disabled={loading}>
          {loading ? "Saving..." : "💾 Save Changes"}
        </button>
      </div>
    </div>
  );
}