from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

import os

# Use PostgreSQL in production, SQLite in development
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL:
    # PostgreSQL for production (Vercel)
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    SQLALCHEMY_DATABASE_URL = DATABASE_URL
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    # SQLite for local development
    SQLALCHEMY_DATABASE_URL = "sqlite:///./chat_app.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    messages = relationship("Message", back_populates="user", cascade="all, delete-orphan")
    notes = relationship("Note", back_populates="user", cascade="all, delete-orphan")

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text)
    response = Column(Text)
    is_user = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="messages")
    notes = relationship("Note", back_populates="message", cascade="all, delete-orphan")

class Note(Base):
    __tablename__ = "notes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    message_id = Column(Integer, ForeignKey("messages.id"))
    title = Column(String)
    content = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="notes")
    message = relationship("Message", back_populates="notes")