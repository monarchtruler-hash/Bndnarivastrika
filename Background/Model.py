from sqlalchemy import Column, String, Float, Integer, LargeBinary, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from backend.db import Base


class Product(Base):
    __tablename__ = "products"

    id              = Column(String, primary_key=True, index=True)
    name            = Column(String, nullable=False)
    category        = Column(String, nullable=False)
    subcategory     = Column(String, nullable=True)
    cost            = Column(Float, nullable=False)
    stock           = Column(Integer, default=0)
    description     = Column(Text, nullable=True)
    includedComponents = Column(Text, nullable=True)
    OccasionType    = Column(Text, nullable=True)
    sizes           = Column(Text, nullable=True)
    colors          = Column(Text, nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())

    images = relationship("ProductImage", back_populates="product", cascade="all, delete-orphan")
    discounts = relationship("ProductDiscount", back_populates="product", cascade="all, delete-orphan")


class ProductImage(Base):
    __tablename__ = "product_images"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    filename   = Column(String, nullable=False)
    data       = Column(LargeBinary, nullable=False)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, default=False)

    product = relationship("Product", back_populates="images")


class ProductDiscount(Base):
    __tablename__ = "product_discounts"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=True)
    discount_percent = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    created_by = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_global = Column(Boolean, default=False)
    
    product = relationship("Product", back_populates="discounts")


class Order(Base):
    __tablename__ = "orders"

    id                  = Column(String, primary_key=True)
    customer_name       = Column(String, nullable=False)
    customer_phone      = Column(String, nullable=False)
    customer_email      = Column(String, nullable=True)
    address             = Column(Text, nullable=False)
    pincode             = Column(String, nullable=False)
    order_type          = Column(String, default="purchase")
    upi_transaction_id  = Column(String, nullable=True)
    is_payment_verified = Column(Boolean, default=False)
    verified_by_admin_id = Column(String, nullable=True)
    verified_at         = Column(DateTime(timezone=True), nullable=True)
    items               = Column(JSONB, nullable=False)
    total               = Column(Float, nullable=False)
    status              = Column(String, default="Processing")
    user_id             = Column(String, nullable=True)
    created_at          = Column(DateTime(timezone=True), server_default=func.now())


class User(Base):
    __tablename__ = "users"

    id        = Column(String, primary_key=True)
    name      = Column(String, nullable=False)
    email     = Column(String, unique=True, nullable=False, index=True)
    password  = Column(String, nullable=False)
    phone     = Column(String, nullable=True)
    address   = Column(Text, nullable=True)
    role      = Column(String, default="customer")
    joined    = Column(DateTime(timezone=True), server_default=func.now())