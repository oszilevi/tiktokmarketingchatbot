import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key-here',
});

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { detail: "Message cannot be empty" },
        { status: 400 }
      );
    }

    const systemPrompt = `You are a helpful TikTok content creation assistant. You help users create engaging TikTok content, provide tips, and give creative suggestions. 

Your responses should be:
- Engaging and conversational
- Focused on TikTok content creation
- Helpful with practical tips
- Creative and inspiring

User: demo_user`;

    try {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7
      });

      const gptResponse = response.choices[0].message.content?.trim() || 'Sorry, I could not generate a response.';

      return NextResponse.json({
        response: gptResponse,
        user: "demo_user",
        message_id: Date.now(),
        note: {
          id: 1,
          title: "Chat Summary",
          content: `Discussion about: ${message.substring(0, 50)}...`
        }
      });
    } catch (openaiError) {
      console.error('OpenAI API Error:', openaiError);
      return NextResponse.json({
        response: `I'm having trouble connecting to my AI brain right now. But I can still help you with TikTok content! You said: '${message}'. What kind of TikTok content are you looking to create?`,
        user: "demo_user",
        message_id: Date.now(),
        note: {
          id: 1,
          title: "Chat Summary",
          content: `Discussion about: ${message.substring(0, 50)}...`
        }
      });
    }
  } catch (error) {
    console.error('Chat endpoint error:', error);
    return NextResponse.json(
      { detail: "Failed to process message" },
      { status: 500 }
    );
  }
}