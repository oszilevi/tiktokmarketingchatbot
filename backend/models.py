from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Pydantic models for API

class UserCreate(BaseModel):
    username: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    id: int
    username: str
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class MessageCreate(BaseModel):
    message: str

class MessageResponse(BaseModel):
    id: int
    content: str
    response: str
    is_user: bool
    created_at: datetime
    notes: List['NoteResponse'] = []
    
    class Config:
        from_attributes = True

class NoteCreate(BaseModel):
    title: str
    content: str
    message_id: int

class NoteResponse(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime
    message_id: int
    
    class Config:
        from_attributes = True

# Update forward references
MessageResponse.model_rebuild()