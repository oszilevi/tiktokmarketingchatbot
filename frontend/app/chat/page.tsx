'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authApi, chatApi } from '@/lib/api';

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
  note?: {
    id: number;
    title: string;
    content: string;
  };
}

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  duration: string;
  views: string;
  creator: string;
  description: string;
  tags: string[];
  url: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'gallery' | 'notes'>('chat');
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authApi.getMe();
        setUser(userData);
        
        // Load chat history
        const history = await chatApi.getMessages();
        const formattedMessages = history.flatMap((msg: { id: number; content: string; response: string; created_at: string; notes?: Array<{ id: number; title: string; content: string }> }) => [
          {
            id: msg.id,
            text: msg.content,
            isUser: true,
            timestamp: new Date(msg.created_at),
            status: 'sent' as const,
            note: msg.notes?.[0]
          },
          {
            id: msg.id + 10000,
            text: msg.response,
            isUser: false,
            timestamp: new Date(msg.created_at),
          }
        ]).filter((msg: { text: string }) => msg.text);
        
        setMessages(formattedMessages);
      } catch {
        // Clear any invalid token
        authApi.logout();
        // Force redirect to login
        window.location.href = '/login';
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: inputMessage,
      isUser: true,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);

    try {
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
        )
      );
      
      // Create bot message with empty text
      const botMessage: Message = {
        id: Date.now() + 1,
        text: '',
        isUser: false,
        timestamp: new Date(),
        contentType: 'text',
      };
      
      setMessages((prev) => [...prev, botMessage]);
      
      // Stream the response
      let fullResponse = '';
      let noteData: { id: number; title: string; content: string } | null = null;
      
      await chatApi.sendMessageStream(inputMessage, (chunk) => {
        fullResponse += chunk;
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === botMessage.id ? { ...msg, text: fullResponse } : msg
          )
        );
      });
      
      // Parse the streaming response to get the note
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/chat/stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0]}`,
          },
          body: JSON.stringify({ message: inputMessage }),
        });
        
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line.includes('note')) {
                const data = JSON.parse(line.substring(6));
                if (data.note) {
                  noteData = data.note;
                  // Update the user message with the note
                  setMessages((prev) => 
                    prev.map((msg) => 
                      msg.id === userMessage.id ? { ...msg, note: noteData || undefined } : msg
                    )
                  );
                }
              }
            }
          }
        }
      } catch (e) {
        console.error('Error getting note:', e);
      }
      
      // After streaming is complete, check for special content types
      const lowerInput = inputMessage.toLowerCase();
      if (lowerInput.includes('image')) {
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === botMessage.id ? {
              ...msg,
              contentType: 'image',
              text: 'Here\'s a great TikTok thumbnail idea for your video:',
              content: {
                imageUrl: 'https://picsum.photos/400/600?random=' + Date.now(),
                title: 'Eye-catching TikTok Thumbnail',
                description: 'Use bright colors and bold text to grab attention in the feed'
              }
            } : msg
          )
        );
      } else if (lowerInput.includes('video') || lowerInput.includes('example')) {
        // Generate sample videos for gallery
        const sampleVideos: Video[] = [
          {
            id: '1',
            title: 'Dance Challenge Tutorial',
            thumbnail: 'https://picsum.photos/300/400?random=1',
            duration: '0:15',
            views: '2.3M',
            creator: '@dancepro',
            description: 'Learn the latest viral dance moves step by step',
            tags: ['dance', 'tutorial', 'viral'],
            url: 'https://www.w3schools.com/html/mov_bbb.mp4'
          },
          {
            id: '2',
            title: 'Quick Recipe: 60 Second Pasta',
            thumbnail: 'https://picsum.photos/300/400?random=2',
            duration: '0:59',
            views: '5.1M',
            creator: '@quickchef',
            description: 'Make delicious pasta in under a minute',
            tags: ['cooking', 'recipe', 'quick'],
            url: 'https://www.w3schools.com/html/mov_bbb.mp4'
          },
          {
            id: '3',
            title: 'Comedy Skit: Office Life',
            thumbnail: 'https://picsum.photos/300/400?random=3',
            duration: '0:30',
            views: '1.8M',
            creator: '@funnyguy',
            description: 'Relatable office humor everyone will love',
            tags: ['comedy', 'office', 'relatable'],
            url: 'https://www.w3schools.com/html/mov_bbb.mp4'
          },
          {
            id: '4',
            title: 'DIY Room Makeover',
            thumbnail: 'https://picsum.photos/300/400?random=4',
            duration: '0:45',
            views: '3.2M',
            creator: '@diyhome',
            description: 'Transform your room on a budget',
            tags: ['diy', 'home', 'makeover'],
            url: 'https://www.w3schools.com/html/mov_bbb.mp4'
          },
          {
            id: '5',
            title: 'Pet Tricks Compilation',
            thumbnail: 'https://picsum.photos/300/400?random=5',
            duration: '0:25',
            views: '7.5M',
            creator: '@petlover',
            description: 'Amazing tricks by talented pets',
            tags: ['pets', 'tricks', 'cute'],
            url: 'https://www.w3schools.com/html/mov_bbb.mp4'
          },
          {
            id: '6',
            title: 'Fitness Challenge Day 1',
            thumbnail: 'https://picsum.photos/300/400?random=6',
            duration: '0:20',
            views: '900K',
            creator: '@fitlife',
            description: 'Start your fitness journey today',
            tags: ['fitness', 'challenge', 'health'],
            url: 'https://www.w3schools.com/html/mov_bbb.mp4'
          }
        ];
        
        setVideos(sampleVideos);
        setViewMode('gallery');
        
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === botMessage.id ? {
              ...msg,
              text: 'I\'ve found some trending TikTok videos for inspiration! Click on any video to see more details.'
            } : msg
          )
        );
      }
    } catch {
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
        )
      );
      const errorMessage: Message = {
        id: Date.now() + 1,
        text: 'Sorry, I encountered an error. Please try again.',
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push('/login');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-200"></div>
            <div className="absolute inset-0 animate-spin rounded-full h-12 w-12 border-4 border-transparent border-t-indigo-600"></div>
          </div>
          <p className="text-gray-600 animate-pulse">Loading your chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Video Gallery Overlay */}
      {viewMode === 'gallery' && (
        <div className="fixed inset-0 bg-black/50 z-50 animate-fade-in">
          <div className="h-full flex flex-col bg-white">
            {/* Gallery Header */}
            <div className="bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">TikTok Video Inspiration</h2>
              <button
                onClick={() => setViewMode('chat')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Video Grid */}
            <div className="flex-1 overflow-auto p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {videos.map((video, index) => (
                  <div
                    key={video.id}
                    onClick={() => setSelectedVideo(video)}
                    className="cursor-pointer group animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="relative aspect-[9/16] rounded-xl overflow-hidden bg-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                      <Image 
                        src={video.thumbnail} 
                        alt={video.title}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="absolute bottom-0 left-0 right-0 p-3">
                          <p className="text-white text-sm font-semibold line-clamp-2">{video.title}</p>
                          <p className="text-white/80 text-xs mt-1">{video.views} views</p>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center transform scale-0 group-hover:scale-100 transition-transform duration-300">
                          <svg className="w-8 h-8 text-gray-900 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{video.creator}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Selected Video Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slide-up">
            <div className="flex flex-col lg:flex-row h-full">
              {/* Video Player Section */}
              <div className="lg:w-1/2 bg-black flex items-center justify-center">
                <div className="relative w-full aspect-[9/16] max-h-[70vh]">
                  <video 
                    controls 
                    autoPlay
                    className="w-full h-full"
                    poster={selectedVideo.thumbnail}
                  >
                    <source src={selectedVideo.url} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                </div>
              </div>
              
              {/* Video Details Section */}
              <div className="lg:w-1/2 p-6 overflow-y-auto">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-2xl font-bold text-gray-900 flex-1 mr-4">{selectedVideo.title}</h3>
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center space-x-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold">{selectedVideo.creator[1].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedVideo.creator}</p>
                      <p className="text-sm text-gray-600">{selectedVideo.views} views</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                    Follow
                  </button>
                </div>
                
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-700">{selectedVideo.description}</p>
                </div>
                
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedVideo.tags.map((tag, idx) => (
                      <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors cursor-pointer">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Content Creation Tips</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="text-sm text-gray-700">Hook viewers in the first 3 seconds</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="text-sm text-gray-700">Use trending audio for better reach</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="text-sm text-gray-700">Keep videos under 30 seconds</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span className="text-sm text-gray-700">Add captions for accessibility</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-6 flex gap-3">
                  <button className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                    Use as Template
                  </button>
                  <button className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                    Save for Later
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">AI Chat Assistant</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowNotes(!showNotes)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors duration-200 ${
                showNotes ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-sm font-medium">Notes</span>
            </button>
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 rounded-full">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-gray-700">{user.username}</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors duration-200 px-3 py-1.5 hover:bg-red-50 rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex mx-auto w-full transition-all duration-500 max-w-7xl">
        {/* Notes Sidebar */}
        {showNotes && (
          <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Chat Notes</h3>
              <p className="text-sm text-gray-600 mt-1">AI-generated summaries of your conversations</p>
            </div>
            <div className="p-4 space-y-3">
              {messages.filter(msg => msg.note).map((msg) => (
                <div key={msg.id} className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer">
                  <h4 className="font-medium text-gray-900 text-sm mb-1">{msg.note?.title}</h4>
                  <p className="text-xs text-gray-600 line-clamp-2">{msg.note?.content}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(msg.timestamp).toLocaleString()}
                  </p>
                </div>
              ))}
              {messages.filter(msg => msg.note).length === 0 && (
                <p className="text-sm text-gray-500 text-center py-8">
                  No notes yet. Start chatting to generate notes!
                </p>
              )}
            </div>
          </div>
        )}
        
        <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full animate-fade-in">
              <div className="text-center space-y-6 max-w-md">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center">
                  <svg className="w-12 h-12 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10h1a3 3 0 013 3v1m0 4v1a3 3 0 01-3 3h-1m-4 0H9a3 3 0 01-3-3v-1m0-4v-1a3 3 0 013-3h1m-4 0V5a3 3 0 013-3h1m4 0h1a3 3 0 013 3v1m-8 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">TikTok Content Assistant</h3>
                  <p className="text-gray-600">I&apos;ll help you create amazing TikTok content with ideas, visuals, and tips!</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  <div className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-2xl group-hover:scale-110 transition-transform">🎨</span>
                      <h4 className="font-semibold text-gray-900">Visual Ideas</h4>
                    </div>
                    <p className="text-sm text-gray-600">Type &quot;image&quot; for thumbnail inspiration</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-2xl group-hover:scale-110 transition-transform">📝</span>
                      <h4 className="font-semibold text-gray-900">Content Tips</h4>
                    </div>
                    <p className="text-sm text-gray-600">Type &quot;tips&quot; or &quot;list&quot; for best practices</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-2xl group-hover:scale-110 transition-transform">🎬</span>
                      <h4 className="font-semibold text-gray-900">Video Examples</h4>
                    </div>
                    <p className="text-sm text-gray-600">Type &quot;video&quot; for sample content</p>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-2xl group-hover:scale-110 transition-transform">📢</span>
                      <h4 className="font-semibold text-gray-900">Trending Topics</h4>
                    </div>
                    <p className="text-sm text-gray-600">Ask about current trends</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">Try typing: &quot;image&quot;, &quot;tips&quot;, &quot;video&quot;, or ask any question!</p>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'gallery' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between animate-slide-up">
                  <div className="flex items-center space-x-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-blue-800">
                      Video gallery is open! Click on any video to see details or click the X to return to chat.
                    </p>
                  </div>
                  <button
                    onClick={() => setViewMode('chat')}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    Back to Chat
                  </button>
                </div>
              )}
              {messages.map((message, index) => {
                const hasMediaContent = message.contentType && message.contentType !== 'text';
                const maxWidthClass = hasMediaContent ? 'max-w-sm lg:max-w-lg xl:max-w-2xl' : 'max-w-xs lg:max-w-md xl:max-w-lg';
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-slide-up transition-all duration-500`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className={`flex ${message.isUser ? 'flex-row-reverse' : 'flex-row'} items-start space-x-2 ${maxWidthClass}`}>
                      <div className={`flex-shrink-0 ${message.isUser ? 'ml-2' : 'mr-2'} mt-1`}>
                        {message.isUser ? (
                          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">{user.username[0].toUpperCase()}</span>
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col space-y-2">
                        <div
                          className={`group relative px-4 py-3 rounded-2xl ${
                            message.isUser
                              ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                              : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                          } ${message.status === 'error' ? 'ring-2 ring-red-500 ring-opacity-50' : ''}`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</p>
                          <div className={`flex items-center space-x-2 mt-1.5`}>
                            <p
                              className={`text-xs ${
                                message.isUser ? 'text-indigo-100' : 'text-gray-400'
                              }`}
                            >
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {message.isUser && message.status && (
                              <span className="text-xs">
                                {message.status === 'sending' && (
                                  <svg className="w-3 h-3 text-indigo-200 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                )}
                                {message.status === 'sent' && (
                                  <svg className="w-3 h-3 text-indigo-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                                {message.status === 'error' && (
                                  <svg className="w-3 h-3 text-red-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Dynamic content rendering */}
                        {!message.isUser && message.contentType === 'image' && message.content?.imageUrl && (
                          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in">
                            <Image 
                              src={message.content.imageUrl} 
                              alt={message.content.title || 'TikTok content'}
                              width={400}
                              height={300}
                              className="w-full h-auto rounded-t-xl"
                            />
                            {(message.content.title || message.content.description) && (
                              <div className="p-4">
                                {message.content.title && (
                                  <h3 className="font-semibold text-gray-900 mb-1">{message.content.title}</h3>
                                )}
                                {message.content.description && (
                                  <p className="text-sm text-gray-600">{message.content.description}</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        {!message.isUser && message.contentType === 'list' && message.content?.listItems && (
                          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 animate-fade-in">
                            {message.content.title && (
                              <h3 className="font-semibold text-gray-900 mb-3">{message.content.title}</h3>
                            )}
                            <ul className="space-y-2">
                              {message.content.listItems.map((item, idx) => (
                                <li 
                                  key={idx} 
                                  className="flex items-start space-x-2 text-sm text-gray-700 animate-slide-up"
                                  style={{ animationDelay: `${idx * 100}ms` }}
                                >
                                  <span className="text-indigo-600 mt-0.5">•</span>
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
          {loading && (
            <div className="flex justify-start animate-slide-up">
              <div className="flex items-end space-x-2">
                <div className="flex-shrink-0 mr-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
                <div className="bg-white text-gray-900 border border-gray-200 shadow-sm px-4 py-3 rounded-2xl">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-xs text-gray-500 ml-2">AI is thinking...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 sm:p-6 bg-white border-t border-gray-200">
          <div className="flex items-end space-x-4">
            <div className="flex-1 relative">
              <textarea
                value={inputMessage}
                onChange={(e) => {
                  setInputMessage(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="w-full px-4 py-3 pr-12 bg-gray-50 text-gray-900 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 hover:border-gray-400 min-h-[48px] max-h-[120px] placeholder-gray-500"
                disabled={loading}
                rows={1}
                style={{ color: '#111827' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => viewMode === 'gallery' ? setViewMode('chat') : setViewMode('gallery')}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  title="Toggle video gallery"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4" />
                  </svg>
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="flex-shrink-0 p-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transform transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {loading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
        </form>
        </div>
      </main>
    </div>
  );
}