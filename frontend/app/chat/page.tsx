'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { authApi, chatApi } from '@/lib/supabase-api';

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

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
  gallery_videos: Video[];
  messages: Array<{
    id: number;
    content: string;
    response: string;
    created_at: string;
  }>;
  notes: Array<{
    id: number;
    title: string;
    content: string;
  }>;
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
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [viewMode, setViewMode] = useState<'chat' | 'gallery' | 'notes'>('chat');
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Check authentication and load chat sessions
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const userData = await authApi.getMe();
        setUser(userData);
        
        // Load chat sessions
        console.log('Loading chat sessions...');
        const sessionData = await chatApi.getSessions();
        console.log('Sessions received:', sessionData);
        
        if (!sessionData || !Array.isArray(sessionData)) {
          console.log('No sessions or invalid format');
          setSessions([]);
          // Create a default session
          const newSession = await chatApi.createSession('New Chat');
          setSessions([newSession]);
          setCurrentSession(newSession);
          setMessages([]);
          return;
        }
        
        setSessions(sessionData);
        
        // Set current session to the most recent one, or create a new one if none exist
        if (sessionData.length > 0) {
          const mostRecent = sessionData[0]; // Already sorted by updated_at desc
          setCurrentSession(mostRecent);
          loadSessionMessages(mostRecent);
        } else {
          // Create a default session
          const newSession = await chatApi.createSession('New Chat');
          setSessions([newSession]);
          setCurrentSession(newSession);
          setMessages([]);
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        authApi.logout();
        router.push('/login');
      }
    };

    initializeChat();
  }, [router]);

  // Load messages for a specific session
  const loadSessionMessages = (session: ChatSession) => {
    const formattedMessages = session.messages.flatMap((msg) => [
      {
        id: msg.id * 2,
        text: msg.content,
        isUser: true,
        timestamp: new Date(msg.created_at),
        status: 'sent' as const,
      },
      {
        id: msg.id * 2 + 1,
        text: msg.response,
        isUser: false,
        timestamp: new Date(msg.created_at),
      }
    ]).filter((msg) => msg.text && msg.text.trim());
    
    console.log('Loaded messages for session:', session.id, formattedMessages);
    setMessages(formattedMessages);
  };

  // Switch to a different session
  const switchToSession = (session: ChatSession) => {
    setCurrentSession(session);
    loadSessionMessages(session);
    setViewMode('chat');
  };

  // Create a new session
  const createNewSession = async () => {
    try {
      const newSession = await chatApi.createSession('New Chat');
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      setViewMode('chat');
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent submission if empty, already loading, or no current session
    if (!inputMessage.trim() || loading || !currentSession) return;

    const messageText = inputMessage.trim();
    setInputMessage('');
    setLoading(true);

    // Create user message
    const userMessage: Message = {
      id: Date.now(),
      text: messageText,
      isUser: true,
      timestamp: new Date(),
      status: 'sending',
    };

    // Create empty bot message for streaming
    const botMessage: Message = {
      id: Date.now() + 1,
      text: '',
      isUser: false,
      timestamp: new Date(),
      contentType: 'text',
    };

    // Add both messages immediately
    setMessages(prev => [...prev, userMessage, botMessage]);

    try {
      // Update user message status to sent
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
        )
      );

      // Stream the AI response (ONLY ONE API CALL)
      let fullResponse = '';
      await chatApi.sendMessageStream(messageText, currentSession.id, (chunk) => {
        fullResponse += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === botMessage.id ? { ...msg, text: fullResponse } : msg
          )
        );
      });

      // Handle special content types based on user input
      handleSpecialContent(messageText.toLowerCase(), botMessage.id);

      // Update session title if this is the first message
      if (messages.length === 0) {
        const title = messageText.length > 30 ? messageText.substring(0, 30) + '...' : messageText;
        try {
          await chatApi.updateSession(currentSession.id, { title });
          // Update local session state
          setSessions(prev => 
            prev.map(session => 
              session.id === currentSession.id ? { ...session, title } : session
            )
          );
          setCurrentSession(prev => prev ? { ...prev, title } : null);
        } catch (error) {
          console.error('Failed to update session title:', error);
        }
      }

    } catch (error) {
      console.error('Chat error:', error);
      
      // Mark user message as error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
        )
      );

      // Update bot message with error
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessage.id 
            ? { ...msg, text: 'Sorry, I encountered an error. Please try again.' } 
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialContent = (input: string, botMessageId: number) => {
    if (input.includes('image')) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId ? {
            ...msg,
            contentType: 'image',
            text: 'Here\'s a great TikTok thumbnail idea for your video:',
            content: {
              imageUrl: `https://picsum.photos/400/600?random=${Date.now()}`,
              title: 'Eye-catching TikTok Thumbnail',
              description: 'Use bright colors and bold text to grab attention'
            }
          } : msg
        )
      );
    } else if (input.includes('list') || input.includes('tips')) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId ? {
            ...msg,
            contentType: 'list',
            text: 'Here are some TikTok content tips:',
            content: {
              title: 'TikTok Best Practices',
              listItems: [
                '🎯 Hook viewers in the first 3 seconds',
                '🎵 Use trending sounds and music',
                '📱 Film in vertical format (9:16)',
                '💡 Keep videos between 15-60 seconds',
                '🔄 Post consistently at peak times',
                '#️⃣ Use 3-5 relevant hashtags',
                '💬 Engage with comments quickly'
              ]
            }
          } : msg
        )
      );
    } else if (input.includes('video') || input.includes('example')) {
      // Prepare sample videos
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
          duration: '0:58',
          views: '5.1M',
          creator: '@quickchef',
          description: 'Make restaurant-quality pasta in under a minute',
          tags: ['cooking', 'recipe', 'quick'],
          url: 'https://www.w3schools.com/html/mov_bbb.mp4'
        },
        {
          id: '3',
          title: 'Life Hack: Phone Photography',
          thumbnail: 'https://picsum.photos/300/400?random=3',
          duration: '0:22',
          views: '1.8M',
          creator: '@techsavvy',
          description: 'Professional photos with just your phone',
          tags: ['lifehack', 'photography', 'tips'],
          url: 'https://www.w3schools.com/html/mov_bbb.mp4'
        }
      ];

      // Save videos to current session
      if (currentSession) {
        chatApi.updateSession(currentSession.id, { gallery_videos: sampleVideos })
          .then(() => {
            // Update local session state
            setSessions(prev => 
              prev.map(session => 
                session.id === currentSession.id ? { ...session, gallery_videos: sampleVideos } : session
              )
            );
            setCurrentSession(prev => prev ? { ...prev, gallery_videos: sampleVideos } : null);
          })
          .catch(error => {
            console.error('Failed to save gallery videos:', error);
          });
      }

      setViewMode('gallery');
      
      setMessages(prev => 
        prev.map(msg => 
          msg.id === botMessageId ? {
            ...msg,
            text: 'I\'ve found some trending TikTok videos for inspiration! Click the gallery tab to explore.'
          } : msg
        )
      );
    }
  };

  const handleLogout = () => {
    authApi.logout();
    router.push('/login');
  };

  // Loading state
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
    <div className="flex h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Sidebar */}
      <div className="w-80 bg-white/80 backdrop-blur-sm shadow-xl border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            TikTok Assistant
          </h1>
          <p className="text-sm text-gray-600 mt-1">Welcome back, {user.username}!</p>
          <button
            onClick={createNewSession}
            className="mt-3 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm"
          >
            + New Chat
          </button>
        </div>

        {/* Chat Sessions List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Recent Chats</h3>
            <div className="space-y-2">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => switchToSession(session)}
                  className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${
                    currentSession?.id === session.id
                      ? 'bg-indigo-100 border border-indigo-200'
                      : 'bg-gray-50 hover:bg-gray-100 border border-transparent'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm truncate">
                    {session.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(session.updated_at).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* View Mode Tabs */}
        <div className="flex p-4 space-x-2">
          <button
            onClick={() => setViewMode('chat')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'chat' 
                ? 'bg-indigo-600 text-white shadow-lg transform scale-105' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Chat
          </button>
          <button
            onClick={() => setViewMode('gallery')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'gallery' 
                ? 'bg-indigo-600 text-white shadow-lg transform scale-105' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Gallery
          </button>
          <button
            onClick={() => setViewMode('notes')}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
              viewMode === 'notes' 
                ? 'bg-indigo-600 text-white shadow-lg transform scale-105' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Notes
          </button>
        </div>

        {/* Notes Section */}
        {viewMode === 'notes' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 className="font-semibold text-gray-900 mb-3">Session Notes</h3>
            {currentSession?.notes && currentSession.notes.length > 0 ? (
              currentSession.notes.map((note) => (
                <div key={note.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-medium text-gray-900">{note.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{note.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>No notes for this session yet.</p>
                <p className="text-sm mt-1">Notes will be generated as you chat.</p>
              </div>
            )}
          </div>
        )}

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors duration-200"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat View */}
        {viewMode === 'chat' && (
          <>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6 animate-pulse">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Start Your TikTok Journey!</h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      I&apos;m here to help you create amazing TikTok content. Ask me about trends, ideas, or best practices!
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 max-w-lg mx-auto">
                      <button
                        onClick={() => setInputMessage("Show me trending TikTok video ideas")}
                        className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <span className="text-2xl mb-1 block">🎬</span>
                        <span className="text-sm font-medium">Trending Ideas</span>
                      </button>
                      <button
                        onClick={() => setInputMessage("Give me tips for viral content")}
                        className="text-left p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <span className="text-2xl mb-1 block">💡</span>
                        <span className="text-sm font-medium">Viral Tips</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} animate-fade-in`}
                    >
                      <div className={`max-w-2xl ${message.isUser ? 'order-1' : 'order-2'}`}>
                        <div className={`px-6 py-4 rounded-2xl shadow-sm ${
                          message.isUser 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                            : 'bg-white border border-gray-200'
                        }`}>
                          <p className={`text-sm ${message.isUser ? 'text-white' : 'text-gray-900'}`}>
                            {message.text}
                          </p>
                          
                          {/* Dynamic Content Rendering */}
                          {!message.isUser && message.contentType === 'image' && message.content?.imageUrl && (
                            <div className="mt-4 bg-gray-50 rounded-xl p-4">
                              <Image 
                                src={message.content.imageUrl} 
                                alt={message.content.title || 'TikTok content'}
                                width={400}
                                height={600}
                                className="w-full rounded-lg shadow-md"
                              />
                              {message.content.title && (
                                <h3 className="font-semibold text-gray-900 mt-3">{message.content.title}</h3>
                              )}
                              {message.content.description && (
                                <p className="text-sm text-gray-600 mt-1">{message.content.description}</p>
                              )}
                            </div>
                          )}
                          
                          {!message.isUser && message.contentType === 'list' && message.content?.listItems && (
                            <div className="mt-4 bg-gray-50 rounded-xl p-4">
                              {message.content.title && (
                                <h3 className="font-semibold text-gray-900 mb-3">{message.content.title}</h3>
                              )}
                              <ul className="space-y-2">
                                {message.content.listItems.map((item, idx) => (
                                  <li key={idx} className="flex items-start space-x-2">
                                    <span className="text-indigo-600">•</span>
                                    <span className="text-sm text-gray-700">{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center mt-2 px-2">
                          <span className={`text-xs ${message.isUser ? 'text-gray-600' : 'text-gray-500'}`}>
                            {message.timestamp.toLocaleTimeString()}
                          </span>
                          {message.status && (
                            <span className={`ml-2 text-xs ${
                              message.status === 'error' ? 'text-red-500' : 'text-gray-400'
                            }`}>
                              {message.status === 'sending' && '• Sending...'}
                              {message.status === 'sent' && '• Sent'}
                              {message.status === 'error' && '• Failed'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-6 bg-white/80 backdrop-blur-sm border-t border-gray-200">
              <div className="max-w-4xl mx-auto">
                <div className="flex space-x-4">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me anything about TikTok content..."
                    className="flex-1 px-6 py-4 bg-gray-50 text-gray-900 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-full hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      'Send'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

        {/* Gallery View */}
        {viewMode === 'gallery' && (
          <div className="flex-1 overflow-auto p-6">
            {currentSession?.gallery_videos && currentSession.gallery_videos.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {currentSession.gallery_videos.map((video, index) => (
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
                  </div>
                </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No Videos Yet</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Ask me about videos or examples to populate this gallery with TikTok content ideas!
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Video Modal */}
      {selectedVideo && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-2xl font-bold text-gray-900">{selectedVideo.title}</h2>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="bg-black rounded-xl overflow-hidden mb-4">
                <video 
                  controls 
                  className="w-full"
                  src={selectedVideo.url}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              
              <div className="space-y-3">
                <p className="text-gray-600">{selectedVideo.description}</p>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>{selectedVideo.creator}</span>
                  <span>•</span>
                  <span>{selectedVideo.views} views</span>
                  <span>•</span>
                  <span>{selectedVideo.duration}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedVideo.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}