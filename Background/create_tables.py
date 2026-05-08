#!/usr/bin/env python
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, String, Float, Integer, LargeBinary, ForeignKey, Text, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import Session
import os
import uuid
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:Chinna%402025@localhost:5432/Vastrika")

print("=" * 60)
print("Vastrika Database Setup")
print("=" * 60)

engine = create_engine(DATABASE_URL, echo=False)
Base = declarative_base()

# Define Models (same as before)
class Product(Base):
    __tablename__ = "products"
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    subcategory = Column(String, nullable=True)
    cost = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    includedComponents = Column(Text, nullable=True)
    OccasionType = Column(Text, nullable=True)
    sizes = Column(Text, nullable=True)
    colors = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ProductImage(Base):
    __tablename__ = "product_images"
    id = Column(Integer, primary_key=True, autoincrement=True)
    filename = Column(String, nullable=False)
    data = Column(LargeBinary, nullable=False)
    product_id = Column(String, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    is_primary = Column(Boolean, default=False)

class Order(Base):
    __tablename__ = "orders"
    id = Column(String, primary_key=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, nullable=False)
    address = Column(Text, nullable=False)
    pincode = Column(String, nullable=False)
    order_type = Column(String, default="purchase")
    upi_transaction_id = Column(String, nullable=True)
    items = Column(JSONB, nullable=False)
    total = Column(Float, nullable=False)
    status = Column(String, default="Processing")
    user_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    address = Column(Text, nullable=True)
    role = Column(String, default="customer")
    joined = Column(DateTime(timezone=True), server_default=func.now())

def create_tables():
    """Create all tables"""
    print("\n📦 Creating tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully!")

def create_admin_if_not_exists():
    """Create admin user if no users exist"""
    print("\n👤 Checking for admin user...")
    
    with Session(engine) as session:
        # Check if any users exist
        result = session.execute(text("SELECT COUNT(*) FROM users"))
        count = result.fetchone()[0]
        
        if count == 0:
            print("   No users found. Creating admin user...")
            admin_id = str(uuid.uuid4())
            
            session.execute(
                text("""
                    INSERT INTO users (id, name, email, password, role, joined)
                    VALUES (:id, :name, :email, :password, :role, NOW())
                """),
                {
                    "id": admin_id,
                    "name": "Admin User",
                    "email": "admin@vastrika.com",
                    "password": "admin123",
                    "role": "admin"
                }
            )
            session.commit()
            print("   ✅ Admin user created!")
            print(f"   Email: admin@vastrika.com")
            print(f"   Password: admin123")
        else:
            # Check if admin exists
            result = session.execute(
                text("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
            )
            admin = result.fetchone()
            
            if admin:
                print(f"   ✅ Admin user already exists:")
                print(f"   Email: {admin[2]}")  # email is at index 2
            else:
                print("   ⚠️  No admin user found but other users exist.")
                print("   You may need to create an admin manually.")

def list_tables_and_counts():
    """List all tables with row counts"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    print(f"\n📋 Database Tables:")
    with Session(engine) as session:
        for table in tables:
            try:
                result = session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.fetchone()[0]
                print(f"   - {table}: {count} rows")
            except:
                print(f"   - {table}: (error counting)")

if __name__ == "__main__":
    try:
        # Test connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("✅ Database connection successful!")
        
        # Create tables
        create_tables()
        
        # Create admin user
        create_admin_if_not_exists()
        
        # Show all tables
        list_tables_and_counts()
        
        print("\n" + "=" * 60)
        print("✨ Database setup complete!")
        print("=" * 60)
        print("\n🔐 Login Credentials:")
        print("   Email: admin@vastrika.com")
        print("   Password: admin123")
        print("\n🚀 Start the server:")
        print("   python run.py")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Make sure PostgreSQL is running")
        print("2. Check if database 'Vastrika' exists")
        print("3. Verify your password in .env file")