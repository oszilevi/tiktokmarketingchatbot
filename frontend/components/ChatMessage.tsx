'use client';

import Image from 'next/image';

interface Message {
  id: number;
  text: string;
  isUser: boolean;
  timestamp: Date;
  status?: 'sending' | 'sent' | 'error';
  contentType?: 'text' | 'image' | 'list' | 'video' | 'mixed';
  content?: {
    imageUrl?: string;
    listItems?: string[];
    videoUrl?: string;
    title?: string;
    description?: string;
  };
}

interface ChatMessageProps {
  message: Message;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex items-start space-x-3 max-w-3xl ${message.isUser ? 'flex-row-reverse space-x-reverse' : ''}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          message.isUser 
            ? 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-sm font-medium'
            : 'bg-gradient-to-br from-gray-700 to-gray-900 text-white'
        }`}>
          {message.isUser ? 'U' : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1">
          {/* Name and Time */}
          <div className={`flex items-baseline space-x-2 mb-1 ${message.isUser ? 'justify-end' : ''}`}>
            <span className="text-xs font-medium text-gray-700">
              {message.isUser ? 'You' : 'Assistant'}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
            {message.status && message.isUser && (
              <span className={`text-xs ${
                message.status === 'error' ? 'text-red-500' : 'text-gray-400'
              }`}>
                {message.status === 'sending' && 'Sending...'}
                {message.status === 'error' && 'Failed to send'}
              </span>
            )}
          </div>

          {/* Message Bubble */}
          <div className={`inline-block rounded-2xl px-4 py-3 ${
            message.isUser 
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
              : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
          }`}>
            {/* Text Content */}
            {message.text && (
              <p className={`text-sm leading-relaxed ${message.isUser ? 'text-white' : 'text-gray-900'}`}>
                {message.text}
              </p>
            )}

            {/* Special Content Types */}
            {!message.isUser && message.contentType === 'image' && message.content?.imageUrl && (
              <div className="mt-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <Image 
                    src={message.content.imageUrl} 
                    alt={message.content.title || 'Content image'}
                    width={400}
                    height={600}
                    className="w-full rounded-lg shadow-md"
                  />
                  {message.content.title && (
                    <h4 className="font-semibold text-gray-900 mt-3">{message.content.title}</h4>
                  )}
                  {message.content.description && (
                    <p className="text-sm text-gray-600 mt-1">{message.content.description}</p>
                  )}
                </div>
              </div>
            )}

            {!message.isUser && message.contentType === 'list' && message.content?.listItems && (
              <div className="mt-3">
                <div className="bg-gray-50 rounded-xl p-4">
                  {message.content.title && (
                    <h4 className="font-semibold text-gray-900 mb-3">{message.content.title}</h4>
                  )}
                  <ul className="space-y-2">
                    {message.content.listItems.map((item, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <span className="text-indigo-600 mt-0.5">•</span>
                        <span className="text-sm text-gray-700 leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {!message.isUser && message.contentType === 'video' && message.content?.videoUrl && (
              <div className="mt-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <video 
                    controls 
                    className="w-full rounded-lg shadow-md"
                    src={message.content.videoUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                  {message.content.title && (
                    <h4 className="font-semibold text-gray-900 mt-3">{message.content.title}</h4>
                  )}
                  {message.content.description && (
                    <p className="text-sm text-gray-600 mt-1">{message.content.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {!message.isUser && (
            <div className="flex items-center space-x-1 mt-2">
              <button className="p-1 rounded hover:bg-gray-100 transition-colors duration-200 group">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button className="p-1 rounded hover:bg-gray-100 transition-colors duration-200 group">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button className="p-1 rounded hover:bg-gray-100 transition-colors duration-200 group">
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 10h4.764a2 2 0 001.789-2.894l-3.5-7A2 2 0 008.263 0H4.246c-.163 0-.326.02-.485.06L0 1m7 10V5a2 2 0 012-2h.095c.5 0 .905.405.905.905 0 .714.211 1.412.608 2.006L14 11v9m-7-10h2m5 10h2a2 2 0 002-2v-6a2 2 0 00-2-2h-2.5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}