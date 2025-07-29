from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import AsyncGenerator
import os
import json
import asyncio
from openai import OpenAI

app = FastAPI()

# Get allowed origins from environment variable
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "your-openai-api-key-here")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

# Initialize OpenAI client
openai_client = OpenAI(api_key=OPENAI_API_KEY)

# Simple in-memory storage (resets on restart)
users = {}
messages = []

class UserCreate(BaseModel):
    username: str
    password: str

class MessageCreate(BaseModel):
    message: str

async def get_gpt_response(user_message: str, username: str) -> str:
    """Get response from OpenAI GPT model"""
    try:
        system_prompt = f"""You are a helpful TikTok content creation assistant. You help users create engaging TikTok content, provide tips, and give creative suggestions. 

Your responses should be:
- Engaging and conversational
- Focused on TikTok content creation
- Helpful with practical tips
- Creative and inspiring

User: {username}"""

        response = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"OpenAI API Error: {str(e)}")
        return f"I'm having trouble connecting to my AI brain right now. But I can still help you with TikTok content! You said: '{user_message}'. What kind of TikTok content are you looking to create?"

async def stream_gpt_response(user_message: str, username: str) -> AsyncGenerator[str, None]:
    """Stream response from OpenAI GPT model"""
    try:
        system_prompt = f"""You are a helpful TikTok content creation assistant. You help users create engaging TikTok content, provide tips, and give creative suggestions. 

Your responses should be:
- Engaging and conversational
- Focused on TikTok content creation
- Helpful with practical tips
- Creative and inspiring

User: {username}"""

        stream = openai_client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ],
            max_tokens=500,
            temperature=0.7,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content is not None:
                yield f"data: {json.dumps({'chunk': chunk.choices[0].delta.content})}\n\n"
                
        yield "data: {\"done\": true}\n\n"
        
    except Exception as e:
        print(f"OpenAI API Error: {str(e)}")
        yield f"data: {json.dumps({'error': 'Failed to get response'})}\n\n"

@app.post("/register")
async def register(user: UserCreate):
    if user.username in users:
        raise HTTPException(status_code=400, detail="Username already registered")
    users[user.username] = {"password": user.password, "id": len(users) + 1}
    return {"message": "User created successfully"}

@app.post("/token")
async def login(username: str = "", password: str = ""):
    if username not in users or users[username]["password"] != password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"access_token": f"fake-token-{username}", "token_type": "bearer"}

@app.get("/me")
async def get_me():
    # For demo purposes, return a mock user
    return {"username": "demo_user", "id": 1}

@app.get("/messages")
async def get_messages():
    # Return empty array for now
    return []

@app.post("/chat")
async def chat_endpoint(message: MessageCreate):
    user_message = message.message
    if not user_message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    try:
        # Get response from GPT
        gpt_response = await get_gpt_response(user_message, "demo_user")
        
        return {
            "response": gpt_response,
            "user": "demo_user",
            "message_id": len(messages) + 1,
            "note": {
                "id": 1,
                "title": "Chat Summary",
                "content": f"Discussion about: {user_message[:50]}..."
            }
        }
    except Exception as e:
        print(f"Chat endpoint error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process message")

@app.post("/chat/stream")
async def chat_stream_endpoint(message: MessageCreate):
    user_message = message.message
    if not user_message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    return StreamingResponse(
        stream_gpt_response(user_message, "demo_user"),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@app.get("/")
async def root():
    return {"message": "TikTok Marketing Chat API is running"}

# For Vercel
app = app