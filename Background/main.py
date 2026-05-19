from fastapi import FastAPI, Form, File, UploadFile, Depends, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import Optional, List
import uuid
import json
import re
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from io import BytesIO
from datetime import datetime, timedelta
from pytz import UTC  # Add this import at the top

# Or use this approach without pytz
from datetime import datetime, timezone
import os
from dotenv import load_dotenv
from pydantic import BaseModel

import Model as Db_Model
from backend.db import get_db

load_dotenv()

app = FastAPI(title="Nari-Vastrika API", version="1.0.0")

# Pydantic models for request validation
class StockUpdate(BaseModel):
    stock: int

class StockDecrease(BaseModel):
    quantity: int

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============ EMAIL CONFIGURATION ============
EMAIL_CONFIG = {
    "smtp_server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
    "smtp_port": int(os.getenv("SMTP_PORT", 587)),
    "sender_email": os.getenv("SENDER_EMAIL", "yourstore@gmail.com"),
    "sender_password": os.getenv("SENDER_PASSWORD", ""),
    "admin_email": os.getenv("ADMIN_EMAIL", "admin@vastrika.com")
}

# ============ HELPER FUNCTIONS ============

def _safe_json(val):
    if val is None:
        return []
    if isinstance(val, list):
        return val
    try:
        return json.loads(val)
    except Exception:
        return val if val else []

def _serialize_product(p, db=None):
    images_data = []
    if db and hasattr(p, 'images') and p.images:
        for img in p.images:
            images_data.append({
                "id": img.id,
                "filename": img.filename,
                "is_primary": getattr(img, "is_primary", False)
            })
    
    return {
        "id": p.id,
        "name": p.name,
        "category": p.category,
        "subcategory": p.subcategory,
        "cost": p.cost,
        "price_inr": p.cost,
        "stock": p.stock,
        "description": p.description,
        "includedComponents": _safe_json(p.includedComponents),
        "OccasionType": _safe_json(p.OccasionType),
        "sizes": _safe_json(p.sizes),
        "colors": _safe_json(p.colors),
        "images": images_data,
    }

def _serialize_order(o):
    return {
        "id": o.id,
        "customer_name": o.customer_name,
        "customer_email": o.customer_email,
        "customer_phone": o.customer_phone,
        "address": o.address,
        "pincode": o.pincode,
        "order_type": o.order_type,
        "upi_transaction_id": o.upi_transaction_id,
        "is_payment_verified": o.is_payment_verified,
        "items": _safe_json(o.items),
        "total": o.total,
        "total_inr": o.total,
        "status": o.status,
        "date": o.created_at.isoformat() if o.created_at else None,
        "user_id": o.user_id,
    }

# ============ EMAIL FUNCTIONS ============

def send_order_confirmation_email(order_details, customer_email, customer_name):
    """Send order confirmation email to customer"""
    try:
        if not EMAIL_CONFIG["sender_password"]:
            return False
            
        subject = f"✨ Order Confirmed! - {order_details['id']} - Nari-Vastrika"
        
        total_amount = order_details.get('total_inr', order_details.get('total', 0))
        current_date = datetime.now().strftime('%B %d, %Y at %I:%M %p')
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Order Confirmation</title>
            <style>
                body {{
                    font-family: 'Segoe UI', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f5f5f5;
                    margin: 0;
                    padding: 0;
                }}
                .container {{
                    max-width: 600px;
                    margin: 20px auto;
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
                }}
                .header {{
                    background: linear-gradient(135deg, #c9a96e 0%, #b8925a 100%);
                    color: white;
                    padding: 30px;
                    text-align: center;
                }}
                .header h1 {{
                    margin: 0;
                    font-size: 28px;
                    letter-spacing: 2px;
                }}
                .header p {{
                    margin: 10px 0 0;
                    opacity: 0.9;
                }}
                .content {{
                    padding: 30px;
                    background: white;
                }}
                .greeting {{
                    font-size: 18px;
                    margin-bottom: 20px;
                    color: #333;
                }}
                .order-card {{
                    background: #f9f9f9;
                    border-radius: 10px;
                    padding: 20px;
                    margin: 20px 0;
                    border-left: 4px solid #c9a96e;
                }}
                .order-title {{
                    font-size: 16px;
                    font-weight: bold;
                    color: #c9a96e;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }}
                .order-row {{
                    display: flex;
                    justify-content: space-between;
                    padding: 8px 0;
                    border-bottom: 1px solid #eee;
                }}
                .order-row:last-child {{
                    border-bottom: none;
                }}
                .item-list {{
                    margin: 15px 0;
                }}
                .item {{
                    display: flex;
                    justify-content: space-between;
                    padding: 10px 0;
                    border-bottom: 1px solid #e0e0e0;
                }}
                .item-name {{
                    flex: 2;
                    font-weight: 500;
                }}
                .item-qty {{
                    flex: 1;
                    text-align: center;
                    color: #666;
                }}
                .item-price {{
                    flex: 1;
                    text-align: right;
                    font-weight: 600;
                    color: #c9a96e;
                }}
                .total-section {{
                    margin-top: 15px;
                    padding-top: 15px;
                    border-top: 2px solid #c9a96e;
                    font-size: 18px;
                    font-weight: bold;
                    display: flex;
                    justify-content: space-between;
                }}
                .status-badge {{
                    display: inline-block;
                    padding: 5px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: bold;
                    text-transform: uppercase;
                }}
                .status-processing {{
                    background: #fff3cd;
                    color: #856404;
                }}
                .shipping-info {{
                    background: #f0f0f0;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 20px 0;
                }}
                .shipping-info h4 {{
                    margin: 0 0 10px 0;
                    color: #c9a96e;
                }}
                .button {{
                    display: inline-block;
                    background: #c9a96e;
                    color: white;
                    padding: 12px 25px;
                    text-decoration: none;
                    border-radius: 25px;
                    margin: 20px 0;
                    font-weight: bold;
                }}
                .button:hover {{
                    background: #b8925a;
                }}
                .footer {{
                    background: #f5f5f5;
                    padding: 20px;
                    text-align: center;
                    font-size: 12px;
                    color: #999;
                }}
                @media only screen and (max-width: 480px) {{
                    .container {{ margin: 10px; }}
                    .content {{ padding: 20px; }}
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>✨ Nari-Vastrika ✨</h1>
                    <p>Luxury Redefined</p>
                </div>
                <div class="content">
                    <div class="greeting">Dear <strong>{customer_name}</strong>,</div>
                    <p>Thank you for shopping with Nari-Vastrika! Your order has been successfully placed and is being processed with care.</p>
                    
                    <div class="order-card">
                        <div class="order-title">📋 ORDER DETAILS</div>
                        <div class="order-row"><span>Order ID:</span><strong>{order_details['id']}</strong></div>
                        <div class="order-row"><span>Order Date:</span><strong>{current_date}</strong></div>
                        <div class="order-row"><span>Order Type:</span><strong>{order_details.get('order_type', 'purchase').upper()}</strong></div>
                        <div class="order-row"><span>Status:</span><span class="status-badge status-processing">{order_details.get('status', 'Processing')}</span></div>
                    </div>
                    
                    <div class="order-card">
                        <div class="order-title">🛍️ ITEMS ORDERED</div>
                        <div class="item-list">"""
        
        items = order_details.get('items', [])
        for item in items:
            item_name = item.get('name', 'Product')
            item_qty = item.get('qty', 1)
            item_price = item.get('price', 0)
            html_content += f"""
                            <div class="item">
                                <span class="item-name">{item_name}</span>
                                <span class="item-qty">× {item_qty}</span>
                                <span class="item-price">₹{item_price:.2f}</span>
                            </div>"""
        
        html_content += f"""
                        </div>
                        <div class="total-section"><span>Total Amount:</span><span>₹{total_amount:.2f}</span></div>
                    </div>
                    
                    <div class="shipping-info">
                        <h4>🚚 DELIVERY ADDRESS</h4>
                        <p>{order_details.get('address', 'N/A')}<br>
                        Pincode: {order_details.get('pincode', 'N/A')}<br>
                        Phone: {order_details.get('customer_phone', 'N/A')}<br>
                        Email: {order_details.get('customer_email', customer_email)}</p>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="http://localhost:5173/profile" class="button">📦 Track Your Order</a>
                    </div>
                    
                    <div class="order-card">
                        <div class="order-title">💫 WHAT'S NEXT?</div>
                        <p>We'll send you updates when:</p>
                        <ul style="margin: 10px 0 0 20px; color: #666;">
                            <li>✓ Your order is confirmed</li>
                            <li>✓ Your order is shipped</li>
                            <li>✓ Your order is out for delivery</li>
                            <li>✓ Your order is delivered</li>
                        </ul>
                    </div>
                </div>
                <div class="footer">
                    <p>© 2024 Nari-Vastrika. All rights reserved.</p>
                    <p>Need help? Contact us at: <a href="mailto:support@vastrika.com" style="color:#c9a96e;">support@vastrika.com</a> | +91 98765 43210</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_CONFIG['sender_email']
        msg['To'] = customer_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
            server.starttls()
            server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
            server.send_message(msg)
        
        return True
        
    except Exception as e:
        return False

def send_order_status_update_email(order_details, customer_email, customer_name, old_status, new_status):
    """Send order status update email to customer"""
    try:
        if not EMAIL_CONFIG["sender_password"]:
            return False
            
        status_messages = {
            "Processing": "Your order has been received and is being processed.",
            "Confirmed": "✅ Great news! Your payment has been verified and your order is confirmed.",
            "Shipped": "🚚 Your order is on the way! Track your shipment below.",
            "Delivered": "🎉 Your order has been delivered! We hope you love your purchase.",
            "Cancelled": "❌ Your order has been cancelled. Contact support if this was a mistake."
        }
        
        emojis = {"Processing": "⏳", "Confirmed": "✅", "Shipped": "🚚", "Delivered": "🎉", "Cancelled": "❌"}
        
        subject = f"{emojis.get(new_status, '📦')} Order Status Update - {order_details['id']} - Nari-Vastrika"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8">
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; }}
            .header {{ background: linear-gradient(135deg, #c9a96e, #b8925a); color: white; padding: 30px; text-align: center; }}
            .content {{ padding: 30px; }}
            .status-update {{ background: #f9f9f9; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center; }}
            .old-status {{ text-decoration: line-through; color: #999; }}
            .arrow {{ font-size: 24px; margin: 10px 0; }}
            .new-status {{ font-size: 28px; font-weight: bold; color: #c9a96e; }}
            .button {{ display: inline-block; background: #c9a96e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 25px; }}
            .footer {{ background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #999; }}
        </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>✨ Nari-Vastrika ✨</h1><p>Order Status Update</p></div>
                <div class="content">
                    <h2>Hello {customer_name},</h2>
                    <div class="status-update">
                        <div class="old-status">Previous: {old_status}</div>
                        <div class="arrow">↓</div>
                        <div class="new-status">{emojis.get(new_status, '📦')} {new_status}</div>
                    </div>
                    <div class="message">{status_messages.get(new_status, 'Your order status has been updated.')}</div>
                    <div style="text-align: center;"><a href="http://localhost:5173/profile" class="button">📦 Track Your Order</a></div>
                </div>
                <div class="footer"><p>© 2024 Vastrika | support@vastrika.com</p></div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_CONFIG['sender_email']
        msg['To'] = customer_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
            server.starttls()
            server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
            server.send_message(msg)
        
        return True
    except Exception as e:
        return False

def send_admin_notification_email(order_details, admin_email):
    """Send notification to admin about new order"""
    try:
        if not EMAIL_CONFIG["sender_password"]:
            return False
            
        subject = f"🆕 New Order Received - {order_details['id']}"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head><style>
            body {{ font-family: Arial, sans-serif; background: #f5f5f5; }}
            .container {{ max-width: 600px; margin: 20px auto; background: white; border-radius: 12px; overflow: hidden; }}
            .header {{ background: #c9a96e; color: white; padding: 20px; text-align: center; }}
            .content {{ padding: 20px; }}
            .order-detail {{ background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 15px 0; }}
        </style>
        </head>
        <body>
            <div class="container">
                <div class="header"><h1>🆕 New Order Alert!</h1></div>
                <div class="content">
                    <p>A new order has been placed:</p>
                    <div class="order-detail">
                        <p><strong>Order ID:</strong> {order_details['id']}</p>
                        <p><strong>Customer:</strong> {order_details.get('customer_name')}</p>
                        <p><strong>Phone:</strong> {order_details.get('customer_phone')}</p>
                        <p><strong>Email:</strong> {order_details.get('customer_email')}</p>
                        <p><strong>Total:</strong> ₹{order_details.get('total_inr', order_details.get('total', 0)):.2f}</p>
                        <p><strong>Type:</strong> {order_details.get('order_type', 'purchase')}</p>
                    </div>
                    <a href="http://localhost:5173/admin" style="background:#c9a96e; color:white; padding:10px 20px; text-decoration:none; border-radius:5px;">View in Admin Panel →</a>
                </div>
            </div>
        </body>
        </html>
        """
        
        msg = MIMEMultipart('alternative')
        msg['From'] = EMAIL_CONFIG['sender_email']
        msg['To'] = admin_email
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))
        
        with smtplib.SMTP(EMAIL_CONFIG['smtp_server'], EMAIL_CONFIG['smtp_port']) as server:
            server.starttls()
            server.login(EMAIL_CONFIG['sender_email'], EMAIL_CONFIG['sender_password'])
            server.send_message(msg)
        return True
    except Exception as e:
        return False

# ============ PRODUCTS ============

@app.post("/nari-vastrika/ADDproducts/")
async def create_product(
    id: str = Form(...),
    name: str = Form(...),
    category: str = Form(...),
    subcategory: str = Form(...),
    cost: float = Form(...),
    stock: int = Form(0),
    description: Optional[str] = Form(None),
    includedComponents: Optional[str] = Form(None),
    OccasionType: Optional[str] = Form(None),
    sizes: Optional[str] = Form(None),
    colors: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
):
    existing = db.query(Db_Model.Product).filter(Db_Model.Product.id == id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Product with id '{id}' already exists")

    product = Db_Model.Product(
        id=id,
        name=name,
        category=category,
        subcategory=subcategory,
        cost=cost,
        stock=stock,
        description=description,
        includedComponents=json.dumps(includedComponents.split(",") if includedComponents else []),
        OccasionType=json.dumps(OccasionType.split(",") if OccasionType else []),
        sizes=json.dumps(sizes.split(",") if sizes else []),
        colors=json.dumps(colors.split(",") if colors else []),
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    saved_images = []
    if images:
        for idx, img in enumerate(images):
            if img and img.filename:
                file_bytes = await img.read()
                filename = f"{uuid.uuid4()}_{img.filename}"
                db_image = Db_Model.ProductImage(
                    filename=filename,
                    data=file_bytes,
                    product_id=product.id,
                    is_primary=(idx == 0)
                )
                db.add(db_image)
                saved_images.append(filename)
        db.commit()

    return {
        "message": "Product added successfully!",
        "product_id": product.id,
        "images_saved": len(saved_images),
    }

@app.get("/nari-vastrika/products/")
def list_products(
    category: Optional[str] = None,
    subcategory: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(Db_Model.Product)
    if category:
        q = q.filter(Db_Model.Product.category == category)
    if subcategory:
        q = q.filter(Db_Model.Product.subcategory == subcategory)
    if search:
        q = q.filter(Db_Model.Product.name.ilike(f"%{search}%"))
    
    products = q.all()
    return [_serialize_product(p, db) for p in products]

@app.get("/nari-vastrika/products/{product_id}")
def get_product(product_id: str, db: Session = Depends(get_db)):
    p = db.query(Db_Model.Product).filter(Db_Model.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return _serialize_product(p, db)

@app.get("/nari-vastrika/products/images/{image_id}")
def get_product_image(image_id: int, db: Session = Depends(get_db)):
    image = db.query(Db_Model.ProductImage).filter(Db_Model.ProductImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    return StreamingResponse(BytesIO(image.data), media_type="image/jpeg")

@app.put("/nari-vastrika/products/{product_id}")
async def update_product(
    product_id: str,
    name: Optional[str] = Form(None),
    category: Optional[str] = Form(None),
    subcategory: Optional[str] = Form(None),
    cost: Optional[float] = Form(None),
    stock: Optional[int] = Form(None),
    description: Optional[str] = Form(None),
    includedComponents: Optional[str] = Form(None),
    OccasionType: Optional[str] = Form(None),
    sizes: Optional[str] = Form(None),
    colors: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
):
    p = db.query(Db_Model.Product).filter(Db_Model.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")

    if name: p.name = name
    if category: p.category = category
    if subcategory: p.subcategory = subcategory
    if cost is not None: p.cost = cost
    if stock is not None: p.stock = stock
    if description: p.description = description
    if includedComponents: p.includedComponents = json.dumps(includedComponents.split(","))
    if OccasionType: p.OccasionType = json.dumps(OccasionType.split(","))
    if sizes: p.sizes = json.dumps(sizes.split(","))
    if colors: p.colors = json.dumps(colors.split(","))

    if images:
        for img in images:
            if img and img.filename:
                file_bytes = await img.read()
                db_image = Db_Model.ProductImage(
                    filename=f"{uuid.uuid4()}_{img.filename}",
                    data=file_bytes,
                    product_id=p.id,
                )
                db.add(db_image)

    db.commit()
    db.refresh(p)
    return {"message": "Product updated!", "product_id": p.id}

@app.delete("/nari-vastrika/products/{product_id}")
def delete_product(product_id: str, db: Session = Depends(get_db)):
    p = db.query(Db_Model.Product).filter(Db_Model.Product.id == product_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for img in p.images:
        db.delete(img)
    db.delete(p)
    db.commit()
    return {"message": "Product deleted.", "product_id": product_id}

# ============ DISCOUNTS ============

@app.post("/nari-vastrika/admin/discounts/set")
def set_discount(
    discount_percent: float = Form(...),
    product_id: Optional[str] = Form(None),
    expires_in_days: Optional[int] = Form(30),
    db: Session = Depends(get_db),
):
    if discount_percent < 0 or discount_percent > 100:
        raise HTTPException(status_code=400, detail="Discount must be between 0 and 100")
    
    if product_id:
        db.query(Db_Model.ProductDiscount).filter(
            Db_Model.ProductDiscount.product_id == product_id,
            Db_Model.ProductDiscount.is_active == True
        ).update({"is_active": False})
    else:
        db.query(Db_Model.ProductDiscount).filter(
            Db_Model.ProductDiscount.is_global == True,
            Db_Model.ProductDiscount.is_active == True
        ).update({"is_active": False})
    
    expires_at = datetime.now() + timedelta(days=expires_in_days) if expires_in_days else None
    
    new_discount = Db_Model.ProductDiscount(
        product_id=product_id,
        discount_percent=discount_percent,
        is_active=True,
        is_global=(product_id is None),
        expires_at=expires_at,
        created_by="admin"
    )
    db.add(new_discount)
    db.commit()
    
    return {"message": f"Discount of {discount_percent}% applied", "discount_id": new_discount.id}

@app.get("/nari-vastrika/products/with-discounts/")
def get_products_with_discounts(
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Db_Model.Product)
    if category:
        q = q.filter(Db_Model.Product.category == category)
    
    products = q.all()
    
    active_discounts = db.query(Db_Model.ProductDiscount).filter(
        Db_Model.ProductDiscount.is_active == True,
        (Db_Model.ProductDiscount.expires_at > datetime.now()) | (Db_Model.ProductDiscount.expires_at == None)
    ).all()
    
    discount_map = {}
    global_discount = None
    
    for discount in active_discounts:
        if discount.is_global:
            global_discount = discount.discount_percent
        elif discount.product_id:
            discount_map[discount.product_id] = discount.discount_percent
    
    result = []
    for p in products:
        product_data = _serialize_product(p, db)
        discount = discount_map.get(p.id, global_discount)
        
        if discount:
            product_data["discount"] = discount
            product_data["original_price"] = product_data["price_inr"]
            product_data["discounted_price"] = product_data["price_inr"] * (1 - discount / 100)
        
        result.append(product_data)
    
    return result


@app.get("/nari-vastrika/products/weekly-deals/")
def get_weekly_deals(
    limit: int = 8,
    db: Session = Depends(get_db)
):
    """
    Get products for weekly deals (last 7 days)
    """
    # Use timezone-aware current time
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)
    
    products = db.query(Db_Model.Product).filter(
        Db_Model.Product.created_at >= week_ago
    ).order_by(
        Db_Model.Product.created_at.desc()
    ).limit(limit).all()
    
    # If not enough products, get the most recent ones
    if len(products) < limit:
        additional_products = db.query(Db_Model.Product).order_by(
            Db_Model.Product.created_at.desc()
        ).limit(limit - len(products)).all()
        
        existing_ids = {p.id for p in products}
        for p in additional_products:
            if p.id not in existing_ids:
                products.append(p)
    
    # Get active discounts
    active_discounts = db.query(Db_Model.ProductDiscount).filter(
        Db_Model.ProductDiscount.is_active == True,
        (Db_Model.ProductDiscount.expires_at > now) | (Db_Model.ProductDiscount.expires_at == None)
    ).all()
    
    discount_map = {}
    global_discount = None
    
    for discount in active_discounts:
        if discount.is_global:
            global_discount = discount.discount_percent
        elif discount.product_id:
            discount_map[discount.product_id] = discount.discount_percent
    
    result = []
    for p in products:
        product_data = _serialize_product(p, db)
        
        # Add date info - handle timezone comparison safely
        if p.created_at:
            # If p.created_at is timezone-aware, make now timezone-aware too
            if p.created_at.tzinfo is not None:
                days_ago = (now - p.created_at).days
            else:
                # If it's naive, make it aware or convert to naive
                days_ago = (datetime.now() - p.created_at).days
        else:
            days_ago = 0
        
        product_data["created_at"] = p.created_at.isoformat() if p.created_at else None
        product_data["days_ago"] = days_ago
        product_data["is_new"] = days_ago <= 7
        
        # Add discount
        discount = discount_map.get(p.id, global_discount)
        if discount:
            product_data["discount"] = discount
            product_data["original_price"] = product_data["price_inr"]
            product_data["discounted_price"] = product_data["price_inr"] * (1 - discount / 100)
        
        result.append(product_data)
    
    return {
        "success": True,
        "products": result,
        "total": len(result),
        "week_start": week_ago.isoformat(),
        "week_end": now.isoformat()
    }


@app.get("/nari-vastrika/products/similar/{product_id}")
def get_similar_products(product_id: str, limit: int = 4, db: Session = Depends(get_db)):
    product = db.query(Db_Model.Product).filter(Db_Model.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    similar = db.query(Db_Model.Product).filter(
        Db_Model.Product.id != product_id,
        Db_Model.Product.category == product.category
    ).limit(limit).all()
    
    if len(similar) < limit:
        more = db.query(Db_Model.Product).filter(
            Db_Model.Product.id != product_id,
            Db_Model.Product.category != product.category
        ).limit(limit - len(similar)).all()
        similar.extend(more)
    
    active_discounts = db.query(Db_Model.ProductDiscount).filter(
        Db_Model.ProductDiscount.is_active == True,
        (Db_Model.ProductDiscount.expires_at > datetime.now()) | (Db_Model.ProductDiscount.expires_at == None)
    ).all()
    
    discount_map = {}
    global_discount = None
    
    for discount in active_discounts:
        if discount.is_global:
            global_discount = discount.discount_percent
        elif discount.product_id:
            discount_map[discount.product_id] = discount.discount_percent
    
    result = []
    for p in similar:
        product_data = _serialize_product(p, db)
        discount = discount_map.get(p.id, global_discount)
        
        if discount:
            product_data["discount"] = discount
            product_data["original_price"] = product_data["price_inr"]
            product_data["discounted_price"] = product_data["price_inr"] * (1 - discount / 100)
        
        result.append(product_data)
    
    return result

# ============ ORDERS ============

@app.post("/nari-vastrika/orders/")
def create_order(
    order: dict, 
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    """
    Create an order with automatic stock update
    """
    try:
        items = order.get("items", [])
        if isinstance(items, str):
            try:
                items = json.loads(items)
            except:
                items = []
        if not isinstance(items, list):
            items = []

        # ========== STOCK VALIDATION ==========
        stock_errors = []
        products_to_update = []
        
        for item in items:
            product = db.query(Db_Model.Product).filter(
                Db_Model.Product.id == item.get("productId")
            ).first()
            
            if not product:
                stock_errors.append(f"Product '{item.get('name')}' not found")
            elif product.stock < item.get("qty", 0):
                stock_errors.append(
                    f"Insufficient stock for '{product.name}'. "
                    f"Available: {product.stock}, Requested: {item.get('qty')}"
                )
            else:
                products_to_update.append({
                    "product": product,
                    "qty": item.get("qty", 0)
                })
        
        if stock_errors:
            raise HTTPException(
                status_code=400, 
                detail={"message": "Stock validation failed", "errors": stock_errors}
            )
        
        # ========== CREATE ORDER ==========
        order_id = f"ORD-{uuid.uuid4().hex[:8].upper()}"
        
        total = order.get("total", 0)
        if total == 0:
            for item in items:
                total += item.get("price", 0) * item.get("qty", 1)

        db_order = Db_Model.Order(
            id=order_id,
            customer_name=order.get("customer_name"),
            customer_email=order.get("customer_email"),
            customer_phone=order.get("customer_phone"),
            address=order.get("address"),
            pincode=order.get("pincode"),
            order_type=order.get("order_type", "purchase"),
            upi_transaction_id=order.get("upi_transaction_id"),
            is_payment_verified=False,
            items=items,
            total=total,
            status="Pending Verification" if order.get("order_type") == "purchase" else "Processing",
            user_id=order.get("user_id"),
        )

        db.add(db_order)
        
        # ========== UPDATE STOCK ==========
        stock_updates = []
        for update_data in products_to_update:
            product = update_data["product"]
            qty = update_data["qty"]
            old_stock = product.stock
            product.stock -= qty
            stock_updates.append({
                "product_id": product.id,
                "name": product.name,
                "old_stock": old_stock,
                "new_stock": product.stock,
                "reduced_by": qty
            })
            print(f"✅ Stock updated: {product.name} - {old_stock} → {product.stock}")
        
        db.commit()
        db.refresh(db_order)
        
        # ========== SEND EMAILS ==========
        order_details = _serialize_order(db_order)
        order_details["stock_updates"] = stock_updates
        
        if order.get("customer_email"):
            background_tasks.add_task(
                send_order_confirmation_email,
                order_details,
                order.get("customer_email"),
                order.get("customer_name")
            )
            
            background_tasks.add_task(
                send_admin_notification_email,
                order_details,
                EMAIL_CONFIG["admin_email"]
            )

        return {
            "message": "Order placed successfully! Stock updated automatically.", 
            "order_id": order_id,
            "stock_updates": stock_updates
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"❌ Order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")

@app.get("/nari-vastrika/orders/")
def list_orders(
    user_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    q = db.query(Db_Model.Order)
    if user_id:
        q = q.filter(Db_Model.Order.user_id == user_id)
    orders = q.order_by(Db_Model.Order.created_at.desc()).all()
    return [_serialize_order(o) for o in orders]

@app.patch("/nari-vastrika/orders/{order_id}/status")
def update_order_status(
    order_id: str, 
    status: str = Form(...), 
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    order = db.query(Db_Model.Order).filter(Db_Model.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    allowed_statuses = ["Processing", "Confirmed", "Shipped", "Delivered", "Cancelled", "Pending Verification"]
    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400, 
            detail=f"Status must be one of {allowed_statuses}"
        )
    
    old_status = order.status
    
    if old_status == status:
        return {
            "message": "Status unchanged.", 
            "order_id": order_id, 
            "status": status,
            "email_sent": False
        }
    
    # Handle stock restoration on cancellation
    if status == "Cancelled" and old_status not in ["Delivered", "Cancelled"]:
        items = _safe_json(order.items)
        restored_stock = []
        for item in items:
            product = db.query(Db_Model.Product).filter(
                Db_Model.Product.id == item.get("productId")
            ).first()
            if product:
                qty = item.get("qty", 0)
                old_product_stock = product.stock
                product.stock += qty
                restored_stock.append({
                    "product_id": product.id,
                    "name": product.name,
                    "old_stock": old_product_stock,
                    "new_stock": product.stock,
                    "restored_by": qty
                })
                print(f"🔄 Stock restored for cancelled order: {product.name} - {old_product_stock} → {product.stock}")
        
        order.status = status
        db.commit()
        
        # Send email about cancellation with stock restoration info
        order_details = _serialize_order(order)
        order_details["restored_stock"] = restored_stock
        
        if order.customer_email:
            background_tasks.add_task(
                send_order_status_update_email,
                order_details,
                order.customer_email,
                order.customer_name,
                old_status,
                status
            )
        
        return {
            "message": f"Order cancelled and stock restored",
            "order_id": order_id,
            "old_status": old_status,
            "new_status": status,
            "restored_stock": restored_stock
        }
    
    # Normal status update without stock change
    order.status = status
    
    if status == "Confirmed" and order.order_type == "purchase" and not order.is_payment_verified:
        order.is_payment_verified = True
        order.verified_at = datetime.now()
        order.verified_by_admin_id = "system"
    
    db.commit()
    db.refresh(order)
    
    order_details = _serialize_order(order)
    
    if order.customer_email:
        background_tasks.add_task(
            send_order_status_update_email,
            order_details,
            order.customer_email,
            order.customer_name,
            old_status,
            status
        )
    
    return {
        "message": f"Order status updated from '{old_status}' to '{status}'",
        "order_id": order_id,
        "old_status": old_status,
        "new_status": status,
        "email_sent": bool(order.customer_email),
        "customer_email": order.customer_email
    }

# ============ PRODUCT STOCK MANAGEMENT ENDPOINTS ============

@app.patch("/nari-vastrika/products/{product_id}/stock")
def update_product_stock(
    product_id: str,
    stock_update: StockUpdate,
    db: Session = Depends(get_db)
):
    """
    Update product stock quantity manually
    """
    try:
        product = db.query(Db_Model.Product).filter(Db_Model.Product.id == product_id).first()
        
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product with id '{product_id}' not found"
            )
        
        if stock_update.stock < 0:
            raise HTTPException(
                status_code=400,
                detail="Stock cannot be negative"
            )
        
        old_stock = product.stock
        product.stock = stock_update.stock
        
        db.commit()
        db.refresh(product)
        
        return {
            "success": True,
            "message": "Stock updated successfully",
            "product_id": product_id,
            "product_name": product.name,
            "old_stock": old_stock,
            "new_stock": product.stock
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating stock: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update stock: {str(e)}"
        )

@app.get("/nari-vastrika/debug/products")
def debug_products(db: Session = Depends(get_db)):
    """
    Debug endpoint to see all product IDs and their stock
    """
    products = db.query(Db_Model.Product).all()
    return {
        "total_products": len(products),
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "stock": p.stock,
                "category": p.category,
                "subcategory": p.subcategory
            }
            for p in products
        ]
    }

@app.post("/nari-vastrika/orders/verify-upi")
async def verify_upi_transaction(
    upi_transaction_id: str = Form(...),
    amount: float = Form(...),
    db: Session = Depends(get_db)
):
    clean_utr = upi_transaction_id.strip().upper()
    utr_patterns = [
        r'^\d{12}$',           
        r'^[A-Z0-9]{12,16}$',
        r'^[A-Za-z0-9]{10,20}$',
    ]
    
    is_valid_format = any(re.match(pattern, clean_utr) for pattern in utr_patterns)
    
    if not is_valid_format:
        raise HTTPException(
            status_code=400, 
            detail="Invalid Transaction ID. Please enter a valid UPI Reference Number (12 digits)"
        )
    
    existing = db.query(Db_Model.Order).filter(
        Db_Model.Order.upi_transaction_id == clean_utr,
        Db_Model.Order.is_payment_verified == True
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Transaction ID already used")
    
    return {
        "verified": True,
        "message": "Transaction ID verified. Our team will confirm payment within 24 hours.",
        "transaction_id": clean_utr
    }

@app.post("/nari-vastrika/admin/verify-payment/{order_id}")
def verify_payment(
    order_id: str,
    admin_id: str = Form("admin"),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: Session = Depends(get_db)
):
    order = db.query(Db_Model.Order).filter(Db_Model.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.is_payment_verified:
        raise HTTPException(status_code=400, detail="Payment already verified")
    
    old_status = order.status
    order.is_payment_verified = True
    order.verified_by_admin_id = admin_id
    order.verified_at = datetime.now()
    order.status = "Confirmed"
    
    db.commit()
    
    if order.customer_email:
        order_details = _serialize_order(order)
        background_tasks.add_task(
            send_order_status_update_email,
            order_details,
            order.customer_email,
            order.customer_name,
            old_status,
            "Confirmed"
        )
    
    return {"message": "Payment verified successfully", "order_id": order_id}

@app.get("/nari-vastrika/admin/pending-verifications/")
def get_pending_verifications(db: Session = Depends(get_db)):
    orders = db.query(Db_Model.Order).filter(
        Db_Model.Order.order_type == "purchase",
        Db_Model.Order.is_payment_verified == False,
        Db_Model.Order.upi_transaction_id.isnot(None)
    ).all()
    
    return [_serialize_order(o) for o in orders]

# ============ USERS ============

@app.post("/nari-vastrika/users/register")
def register_user(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    if db.query(Db_Model.User).filter(Db_Model.User.email == email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = Db_Model.User(
        id=str(uuid.uuid4()),
        name=name,
        email=email,
        password=password,
        phone=phone,
        address=address,
        role="customer",
    )
    db.add(user)
    db.commit()
    return {"message": "User registered!", "user_id": user.id, "name": user.name, "role": user.role}

@app.post("/nari-vastrika/users/login")
def login_user(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db),
):
    user = db.query(Db_Model.User).filter(
        Db_Model.User.email == email, 
        Db_Model.User.password == password
    ).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"message": "Login successful", "user_id": user.id, "name": user.name, "role": user.role}

@app.get("/nari-vastrika/users/{user_id}")
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(Db_Model.User).filter(Db_Model.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "address": user.address,
        "role": user.role,
        "joined": user.joined.isoformat() if user.joined else None,
    }

@app.put("/nari-vastrika/users/{user_id}")
def update_user(
    user_id: str,
    name: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    user = db.query(Db_Model.User).filter(Db_Model.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if name: user.name = name
    if phone: user.phone = phone
    if address: user.address = address
    db.commit()
    return {"message": "User updated!"}

# ============ ADMIN STATS ============

@app.get("/nari-vastrika/admin/stats")
def get_admin_stats(db: Session = Depends(get_db)):
    products_count = db.query(Db_Model.Product).count()
    orders_count = db.query(Db_Model.Order).count()
    customers_count = db.query(Db_Model.User).filter(Db_Model.User.role == "customer").count()
    
    total_revenue = db.query(Db_Model.Order).filter(
        Db_Model.Order.order_type == "purchase",
        Db_Model.Order.is_payment_verified == True
    ).all()
    revenue = sum(o.total for o in total_revenue)
    
    return {
        "products": products_count,
        "orders": orders_count,
        "customers": customers_count,
        "revenue": revenue,
    }

# ============ PRODUCT STOCK MANAGEMENT ENDPOINTS ============

@app.patch("/nari-vastrika/products/{product_id}/stock")
async def update_product_stock(
    product_id: str,
    stock_update: StockUpdate,
    db: Session = Depends(get_db)
):
    """
    Update product stock quantity
    """
    try:
        # Find the product - adjust the model name as per your Model.py
        # If your model is called 'Product', use Db_Model.Product
        # If it's called 'Products', use Db_Model.Products
        product = db.query(Db_Model.Product).filter(Db_Model.Product.id == product_id).first()
        
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product with id '{product_id}' not found"
            )
        
        # Validate stock is not negative
        if stock_update.stock < 0:
            raise HTTPException(
                status_code=400,
                detail="Stock cannot be negative"
            )
        
        # Store old stock for response
        old_stock = product.stock
        
        # Update stock
        product.stock = stock_update.stock
        
        # Commit to database
        db.commit()
        db.refresh(product)
        
        return {
            "success": True,
            "message": "Stock updated successfully",
            "product_id": product_id,
            "old_stock": old_stock,
            "new_stock": product.stock,
            "product_name": product.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating stock: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update stock: {str(e)}"
        )


@app.post("/nari-vastrika/products/{product_id}/decrease-stock")
async def decrease_product_stock(
    product_id: str,
    decrease_data: StockDecrease,
    db: Session = Depends(get_db)
):
    """
    Decrease product stock by a specific quantity (useful for orders)
    """
    try:
        product = db.query(Db_Model.Product).filter(Db_Model.Product.id == product_id).first()
        
        if not product:
            raise HTTPException(
                status_code=404,
                detail=f"Product with id '{product_id}' not found"
            )
        
        if product.stock < decrease_data.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock. Available: {product.stock}, Requested: {decrease_data.quantity}"
            )
        
        # Decrease stock
        product.stock -= decrease_data.quantity
        
        db.commit()
        db.refresh(product)
        
        return {
            "success": True,
            "message": "Stock decreased successfully",
            "product_id": product_id,
            "remaining_stock": product.stock,
            "decreased_by": decrease_data.quantity,
            "product_name": product.name
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error decreasing stock: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to decrease stock: {str(e)}"
        )


@app.post("/nari-vastrika/products/batch-update-stock")
async def batch_update_stock(
    updates: List[dict],
    db: Session = Depends(get_db)
):
    """
    Batch update stock for multiple products (useful for cart checkout)
    Expected format: [{"product_id": "xxx", "quantity": 5}, ...]
    """
    results = []
    errors = []
    
    try:
        for update in updates:
            product = db.query(Db_Model.Product).filter(
                Db_Model.Product.id == update.get("product_id")
            ).first()
            
            if not product:
                errors.append(f"Product '{update.get('product_id')}' not found")
                continue
            
            quantity = update.get("quantity", 0)
            
            if product.stock < quantity:
                errors.append(f"Insufficient stock for '{product.name}'. Available: {product.stock}")
                continue
            
            # Decrease stock
            product.stock -= quantity
            
            results.append({
                "product_id": product.id,
                "name": product.name,
                "new_stock": product.stock,
                "reduced_by": quantity
            })
        
        # Commit all changes if no errors
        if results:
            db.commit()
        
        return {
            "success": len(errors) == 0,
            "updated_products": results,
            "errors": errors,
            "total_updated": len(results)
        }
        
    except Exception as e:
        db.rollback()
        print(f"Error in batch update: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update stock: {str(e)}"
        )


# Optional: Debug endpoint to check product IDs
@app.get("/nari-vastrika/debug/products")
async def debug_products(db: Session = Depends(get_db)):
    """
    Debug endpoint to see all product IDs and names
    """
    try:
        products = db.query(Db_Model.Product).all()
        return {
            "total_products": len(products),
            "products": [
                {
                    "id": p.id,
                    "name": p.name,
                    "stock": p.stock,
                    "category": getattr(p, 'category', 'N/A')
                }
                for p in products
            ]
        }
    except Exception as e:
        return {"error": str(e)}


# Update your existing order creation endpoint to include stock validation
@app.post("/nari-vastrika/orders/")
async def create_order(
    order_data: dict,
    db: Session = Depends(get_db)
):
    """
    Create an order and automatically decrease stock
    """
    try:
        # First, validate stock for all items
        items = order_data.get("items", [])
        stock_errors = []
        
        for item in items:
            product = db.query(Db_Model.Product).filter(
                Db_Model.Product.id == item.get("productId")
            ).first()
            
            if not product:
                stock_errors.append(f"Product '{item.get('name')}' not found")
            elif product.stock < item.get("qty", 0):
                stock_errors.append(
                    f"Insufficient stock for '{product.name}'. "
                    f"Available: {product.stock}, Requested: {item.get('qty')}"
                )
        
        if stock_errors:
            raise HTTPException(
                status_code=400,
                detail={"message": "Stock validation failed", "errors": stock_errors}
            )
        
        # Create order (your existing order creation logic)
        # ... your existing code to create order ...
        
        # After order is created, decrease stock for each item
        for item in items:
            product = db.query(Db_Model.Product).filter(
                Db_Model.Product.id == item.get("productId")
            ).first()
            if product:
                product.stock -= item.get("qty", 0)
        
        db.commit()
        
        return {
            "success": True,
            "message": "Order created and stock updated successfully"
            # ... rest of your order response
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating order: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create order: {str(e)}"
        )


# ============ ADMIN PROFILE MANAGEMENT ============

@app.put("/nari-vastrika/admin/profile/{admin_id}")
def update_admin_profile(
    admin_id: str,
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    current_password: Optional[str] = Form(None),
    new_password: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Admin can update their own profile information
    Can update: name, email, phone, address, password
    """
    # Find the admin user
    admin = db.query(Db_Model.User).filter(Db_Model.User.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    # Check if trying to update password
    if new_password:
        # Verify current password
        if not current_password:
            raise HTTPException(status_code=400, detail="Current password required to change password")
        
        if admin.password != current_password:
            raise HTTPException(status_code=401, detail="Current password is incorrect")
        
        # Update to new password
        admin.password = new_password
    
    # Update basic info
    if name:
        admin.name = name
    if phone:
        admin.phone = phone
    if address:
        admin.address = address
    if email:
        # Check if email is already taken by another user
        existing = db.query(Db_Model.User).filter(
            Db_Model.User.email == email,
            Db_Model.User.id != admin_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken by another user")
        admin.email = email
    
    db.commit()
    db.refresh(admin)
    
    return {
        "message": "Profile updated successfully",
        "admin": {
            "id": admin.id,
            "name": admin.name,
            "email": admin.email,
            "phone": admin.phone,
            "address": admin.address,
            "role": admin.role
        }
    }

@app.get("/nari-vastrika/admin/profile/{admin_id}")
def get_admin_profile(
    admin_id: str,
    db: Session = Depends(get_db)
):
    """Get admin profile information"""
    admin = db.query(Db_Model.User).filter(Db_Model.User.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    return {
        "id": admin.id,
        "name": admin.name,
        "email": admin.email,
        "phone": admin.phone,
        "address": admin.address,
        "role": admin.role,
        "joined": admin.joined.isoformat() if admin.joined else None
    }
@app.get("/nari-vastrika/admin/users/")
def get_all_users(
    db: Session = Depends(get_db)
):
    """Get all users (admin only)"""
    users = db.query(Db_Model.User).all()
    return [
        {
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "phone": u.phone,
            "address": u.address,
            "role": u.role,
            "joined": u.joined.isoformat() if u.joined else None,
        }
        for u in users
    ]

@app.get("/nari-vastrika/admin/users/{user_id}")
def get_user_by_id(
    user_id: str,
    db: Session = Depends(get_db)
):
    """Get specific user by ID (admin only)"""
    user = db.query(Db_Model.User).filter(Db_Model.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "address": user.address,
        "role": user.role,
        "joined": user.joined.isoformat() if user.joined else None,
    }

@app.put("/nari-vastrika/admin/users/{user_id}")
def admin_update_user(
    user_id: str,
    name: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    phone: Optional[str] = Form(None),
    address: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to update user details including role
    """
    user = db.query(Db_Model.User).filter(Db_Model.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update fields if provided
    if name:
        user.name = name
    if email:
        # Check if email is already taken by another user
        existing = db.query(Db_Model.User).filter(
            Db_Model.User.email == email,
            Db_Model.User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already taken by another user")
        user.email = email
    if phone:
        user.phone = phone
    if address:
        user.address = address
    if role and role in ["customer", "admin"]:
        user.role = role
    elif role:
        raise HTTPException(status_code=400, detail="Role must be 'customer' or 'admin'")
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "User updated successfully",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "address": user.address,
            "role": user.role,
        }
    }

@app.delete("/nari-vastrika/admin/users/{user_id}")
def admin_delete_user(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to delete a user
    """
    # Don't allow deleting yourself
    # You would need to pass current admin ID - for simplicity, just check
    user = db.query(Db_Model.User).filter(Db_Model.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent deleting the last admin
    admin_count = db.query(Db_Model.User).filter(Db_Model.User.role == "admin").count()
    if user.role == "admin" and admin_count <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete the last admin user")
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.name} deleted successfully"}

@app.post("/nari-vastrika/admin/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: str,
    new_password: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Admin endpoint to reset user password
    """
    user = db.query(Db_Model.User).filter(Db_Model.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    user.password = new_password
    db.commit()
    
    return {"message": f"Password reset successfully for {user.name}"}
# ============ TEST EMAIL ENDPOINT ============

@app.post("/nari-vastrika/test-email/")
def test_email(to_email: str = Form(...)):
    """Test email configuration"""
    if not EMAIL_CONFIG["sender_password"]:
        return {"success": False, "message": "Email not configured. Please set SENDER_PASSWORD in .env"}
    
    test_order = {
        "id": "TEST-001",
        "total_inr": 2999,
        "status": "Processing",
        "customer_name": "Test User",
        "address": "123 Test Street, Test City",
        "pincode": "500001",
        "customer_phone": "9876543210",
        "customer_email": to_email,
        "items": [{"name": "Test Product", "qty": 2, "price": 1500}],
        "order_type": "purchase"
    }
    
    result = send_order_confirmation_email(test_order, to_email, "Test User")
    return {"success": result, "message": "Test email sent!" if result else "Failed to send test email"}

# ============ ROOT ENDPOINT ============

@app.get("/")
def root():
    return {
        "message": "Welcome to Nari-Vastrika API", 
        "status": "running",
        "email_configured": bool(EMAIL_CONFIG["sender_password"])
    }

# ============ RUN SERVER ============
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
