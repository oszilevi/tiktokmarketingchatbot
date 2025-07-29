# Chat App Backend

FastAPI backend for the chat application with JWT authentication and OpenAI GPT integration.

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
Create a `.env` file in the backend directory with the following content:
```env
# JWT Secret Key (change this in production)
SECRET_KEY=your-secret-key-here-change-in-production

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Optional: Use a different OpenAI model
# OPENAI_MODEL=gpt-4
```

4. Run the server:
```bash
uvicorn main:app --reload
```

The API will be available at http://localhost:8000

## OpenAI Integration

The chat endpoint now integrates with OpenAI's GPT models:
- Uses the model specified in `OPENAI_MODEL` (default: gpt-3.5-turbo)
- Configured as a TikTok content creation assistant
- Includes error handling and fallback responses
- Compatible with o1-mini and other models that don't support system messages
- Set your OpenAI API key in the `.env` file

## API Endpoints

- `POST /register` - Register a new user
- `POST /token` - Login and get JWT token
- `GET /me` - Get current user info (requires authentication)
- `POST /chat` - Send a chat message (requires authentication, uses GPT)

## API Documentation

Visit http://localhost:8000/docs for interactive API documentation.