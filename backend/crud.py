from sqlalchemy.orm import Session
from database import User, Message, Note
from typing import List, Optional

def get_user_by_username(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, username: str, hashed_password: str):
    db_user = User(username=username, hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def create_message(db: Session, user_id: int, content: str, response: str):
    # Create user message
    user_message = Message(
        user_id=user_id,
        content=content,
        response="",
        is_user=True
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)
    
    # Create AI response
    ai_message = Message(
        user_id=user_id,
        content=response,
        response="",
        is_user=False
    )
    db.add(ai_message)
    db.commit()
    db.refresh(ai_message)
    
    return user_message, ai_message

def get_user_messages(db: Session, user_id: int, limit: int = 50):
    return db.query(Message).filter(
        Message.user_id == user_id
    ).order_by(Message.created_at.desc()).limit(limit).all()

def create_note(db: Session, user_id: int, message_id: int, title: str, content: str):
    note = Note(
        user_id=user_id,
        message_id=message_id,
        title=title,
        content=content
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note

def get_message_notes(db: Session, message_id: int):
    return db.query(Note).filter(Note.message_id == message_id).all()

def get_user_notes(db: Session, user_id: int):
    return db.query(Note).filter(Note.user_id == user_id).order_by(Note.created_at.desc()).all()