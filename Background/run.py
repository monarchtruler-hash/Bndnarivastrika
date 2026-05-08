import sys
import os
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.db import create_tables, engine
from sqlalchemy import text
import uvicorn

def test_connection():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            return True
    except Exception as e:
        return False

def create_admin_if_not_exists():
    from sqlalchemy.orm import Session
    import Model
    
    with Session(engine) as session:
        admin = session.query(Model.User).filter(Model.User.email == "admin@vastrika.com").first()
        if not admin:
            import uuid
            admin_user = Model.User(
                id=str(uuid.uuid4()),
                name="Admin User",
                email="admin@vastrika.com",
                password="admin123",
                role="admin"
            )
            session.add(admin_user)
            session.commit()

if __name__ == "__main__":    
    if not test_connection():
        sys.exit(1)
    create_tables()
    create_admin_if_not_exists()    
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)