# TikTok Marketing Chatbot

AI-powered chat assistant for TikTok content creation and marketing strategies.

## Features

- 🤖 AI-powered TikTok content suggestions
- 💬 Real-time streaming chat responses
- 🎬 Dynamic video gallery with examples
- 📱 Responsive design

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: FastAPI, Python 3.11, OpenAI API

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/oszilevi/tiktokmarketingchatbot)

## Environment Variables

Set these in your Vercel project:

```
OPENAI_API_KEY=your-openai-api-key
```

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main_simple:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## License

MIT