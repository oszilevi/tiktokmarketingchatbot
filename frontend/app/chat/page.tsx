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
  status?: 'sending' | 'sent' | 'error' | 'thinking';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const [deletedSessionIds, setDeletedSessionIds] = useState<Set<number>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [contextualChips, setContextualChips] = useState<Array<{label: string, prompt: string, color: string}>>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const lastActivityRef = useRef<Date>(new Date());

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
        
        // Filter out any sessions that were deleted in this session
        const filteredSessionData = sessionData.filter(s => !deletedSessionIds.has(s.id));
        setSessions(filteredSessionData);
        
        // Set current session to the most recent one, or create a new one if none exist
        if (filteredSessionData.length > 0) {
          const mostRecent = filteredSessionData[0]; // Already sorted by updated_at desc
          setCurrentSession(mostRecent);
          loadSessionMessages(mostRecent);
        } else {
          // Create a default session and show onboarding for new users
          const newSession = await chatApi.createSession('New Chat');
          setSessions([newSession]);
          setCurrentSession(newSession);
          setMessages([]);
          setShowOnboarding(true); // Show onboarding for new users
        }
      } catch (error) {
        console.error('Failed to initialize chat:', error);
        authApi.logout();
        router.push('/login');
      }
    };

    initializeChat();
  }, [router, deletedSessionIds]);

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
  const switchToSession = async (session: ChatSession) => {
    // Find the most up-to-date session from our state
    const updatedSession = sessions.find(s => s.id === session.id) || session;
    setCurrentSession(updatedSession);
    loadSessionMessages(updatedSession);
    setViewMode('chat');
    
    // Close mobile menu after selection
    setIsMobileMenuOpen(false);
    
    // Optional: Fetch fresh session data to ensure we have the latest messages
    // This is useful if the user has multiple tabs open or uses multiple devices
    try {
      const freshSessions = await chatApi.getSessions();
      if (freshSessions && Array.isArray(freshSessions)) {
        const freshSession = freshSessions.find(s => s.id === session.id);
        if (freshSession) {
          setSessions(freshSessions);
          setCurrentSession(freshSession);
          loadSessionMessages(freshSession);
        }
      }
    } catch (error) {
      console.error('Failed to refresh session data:', error);
      // Continue with cached data if refresh fails
    }
  };

  // Create a new session
  const createNewSession = async () => {
    try {
      const newSession = await chatApi.createSession('New Chat');
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
      setViewMode('chat');
      setIsMobileMenuOpen(false); // Close mobile menu
    } catch (error) {
      console.error('Failed to create new session:', error);
    }
  };

  // Delete a session with animation
  const deleteSession = async (sessionId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering session switch
    
    try {
      // Start delete animation
      setDeletingSessionId(sessionId);
      
      // Wait for animation to start
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // If deleting current session, switch to another or create new
      if (currentSession?.id === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          await switchToSession(remainingSessions[0]);
        } else {
          await createNewSession();
        }
      }
      
      // Delete from database
      console.log('Attempting to delete session:', sessionId);
      const deleteResult = await chatApi.deleteSession(sessionId);
      console.log('Delete result:', deleteResult);
      
      // Track this session as deleted to prevent refresh from bringing it back
      setDeletedSessionIds(prev => new Set([...prev, sessionId]));
      
      // Remove from local state after successful deletion
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setDeletingSessionId(null);
    } catch (error) {
      console.error('Failed to delete session:', error);
      setDeletingSessionId(null);
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Periodically refresh sessions to catch updates from other tabs/devices
  useEffect(() => {
    // Only refresh if user has been active in the last 5 minutes
    const refreshInterval = setInterval(async () => {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current.getTime();
      
      if (timeSinceLastActivity < 5 * 60 * 1000 && currentSession) { // 5 minutes
        try {
          const freshSessions = await chatApi.getSessions();
          if (freshSessions && Array.isArray(freshSessions)) {
            // Filter out sessions that we've deleted locally
            const filteredSessions = freshSessions.filter(s => !deletedSessionIds.has(s.id));
            setSessions(filteredSessions);
            
            // Update current session if it exists in fresh data
            const freshCurrentSession = filteredSessions.find(s => s.id === currentSession.id);
            if (freshCurrentSession && freshCurrentSession.messages.length !== currentSession.messages.length) {
              setCurrentSession(freshCurrentSession);
              loadSessionMessages(freshCurrentSession);
            }
          }
        } catch (error) {
          console.error('Failed to refresh sessions:', error);
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(refreshInterval);
  }, [currentSession, deletedSessionIds]);

  // Track user activity
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = new Date();
    };

    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('click', updateActivity);

    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('click', updateActivity);
    };
  }, []);

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

    // Create thinking bot message for streaming
    const botMessage: Message = {
      id: Date.now() + 1,
      text: '',
      isUser: false,
      timestamp: new Date(),
      status: 'thinking',
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
            msg.id === botMessage.id ? { 
              ...msg, 
              text: fullResponse,
              status: undefined // Clear thinking status when content arrives
            } : msg
          )
        );
      });

      // Update the session's messages array with the new message
      const newMessage = {
        id: Date.now(),
        content: messageText,
        response: fullResponse,
        created_at: new Date().toISOString()
      };

      // Update sessions state to include the new message
      setSessions(prev => 
        prev.map(session => 
          session.id === currentSession.id 
            ? { 
                ...session, 
                messages: [...(session.messages || []), newMessage],
                updated_at: new Date().toISOString()
              } 
            : session
        )
      );

      // Update current session as well
      setCurrentSession(prev => 
        prev ? { 
          ...prev, 
          messages: [...(prev.messages || []), newMessage],
          updated_at: new Date().toISOString()
        } : null
      );

      // Handle special content types based on user input
      handleSpecialContent(messageText.toLowerCase(), botMessage.id);

      // Update contextual chips based on conversation
      updateContextualChips(messageText.toLowerCase());

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
            ? { ...msg, text: 'Sorry, I encountered an error. Please try again.', status: undefined } 
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

  // Update contextual chips based on conversation
  const updateContextualChips = (userInput: string) => {
    let newChips: Array<{label: string, prompt: string, color: string}> = [];

    if (userInput.includes('idea') || userInput.includes('trend')) {
      newChips = [
        { label: 'More Ideas', prompt: 'Give me 5 more creative video ideas', color: 'from-blue-500 to-indigo-500' },
        { label: 'Script It', prompt: 'Create a script for the first idea', color: 'from-green-500 to-emerald-500' },
        { label: 'Add Music', prompt: 'Suggest music for these video ideas', color: 'from-pink-500 to-rose-500' }
      ];
    } else if (userInput.includes('script') || userInput.includes('write')) {
      newChips = [
        { label: 'Shorten It', prompt: 'Make this script shorter and punchier', color: 'from-orange-500 to-red-500' },
        { label: 'Add Hooks', prompt: 'Add more engaging hooks to this script', color: 'from-purple-500 to-indigo-500' },
        { label: 'New Version', prompt: 'Create a different version of this script', color: 'from-teal-500 to-cyan-500' }
      ];
    } else if (userInput.includes('tip') || userInput.includes('advice')) {
      newChips = [
        { label: 'Examples', prompt: 'Show me examples of these tips in action', color: 'from-amber-500 to-orange-500' },
        { label: 'Advanced Tips', prompt: 'Give me advanced TikTok growth strategies', color: 'from-red-500 to-pink-500' },
        { label: 'Common Mistakes', prompt: 'What mistakes should I avoid on TikTok?', color: 'from-gray-500 to-slate-500' }
      ];
    } else if (userInput.includes('sound') || userInput.includes('music')) {
      newChips = [
        { label: 'Genre Focus', prompt: 'Focus on pop music trends for TikTok', color: 'from-pink-500 to-purple-500' },
        { label: 'Dance Beats', prompt: 'Find trending sounds perfect for dance videos', color: 'from-indigo-500 to-blue-500' },
        { label: 'Viral Audio', prompt: 'What makes audio go viral on TikTok?', color: 'from-green-500 to-teal-500' }
      ];
    } else {
      // Default follow-up chips
      newChips = [
        { label: 'Get Ideas', prompt: 'Show me trending TikTok video ideas', color: 'from-indigo-500 to-purple-500' },
        { label: 'Quick Tips', prompt: 'Give me 3 quick viral tips', color: 'from-green-500 to-emerald-500' },
        { label: 'Create Script', prompt: 'Help me write a TikTok script', color: 'from-orange-500 to-red-500' }
      ];
    }

    setContextualChips(newChips);
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
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Consolidated Header with Navigation */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 py-2 md:py-3">
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            <div className="flex items-center space-x-2 md:space-x-3">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 md:w-5 md:h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg md:text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  TikTok Assistant
                </h1>
              </div>
              <div className="md:hidden">
                <h1 className="text-base font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  TikTok AI
                </h1>
              </div>
            </div>
          </div>

          {/* Integrated Navigation Tabs */}
          <div className="hidden md:flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('chat')}
              className={`py-1.5 px-4 rounded-lg font-medium transition-all duration-200 text-sm flex items-center space-x-1.5 ${
                viewMode === 'chat' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Chat</span>
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`py-1.5 px-4 rounded-lg font-medium transition-all duration-200 text-sm flex items-center space-x-1.5 ${
                viewMode === 'gallery' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Gallery</span>
            </button>
            <button
              onClick={() => setViewMode('notes')}
              className={`py-1.5 px-4 rounded-lg font-medium transition-all duration-200 text-sm flex items-center space-x-1.5 ${
                viewMode === 'notes' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Notes</span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs md:text-sm font-semibold">
                {user.username.charAt(0).toUpperCase()}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="hidden md:block px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors duration-200 text-sm font-medium"
            >
              Logout
            </button>
            <button
              onClick={handleLogout}
              className="md:hidden p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="md:hidden border-t border-gray-200 px-4 py-2">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('chat')}
              className={`flex-1 py-2 px-2 rounded-lg font-medium transition-all duration-200 text-xs flex items-center justify-center ${
                viewMode === 'chat' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Chat</span>
            </button>
            <button
              onClick={() => setViewMode('gallery')}
              className={`flex-1 py-2 px-2 rounded-lg font-medium transition-all duration-200 text-xs flex items-center justify-center ${
                viewMode === 'gallery' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Gallery</span>
            </button>
            <button
              onClick={() => setViewMode('notes')}
              className={`flex-1 py-2 px-2 rounded-lg font-medium transition-all duration-200 text-xs flex items-center justify-center ${
                viewMode === 'notes' 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Notes</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Mobile overlay */}
        {isMobileMenuOpen && (
          <div 
            className="lg:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-0 w-80 min-w-80 bg-white/95 lg:bg-white/80 backdrop-blur-sm shadow-xl border-r border-gray-200 flex flex-col transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <button
              onClick={createNewSession}
              className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <span className="mr-2">✨</span>
              Start New Chat
            </button>
          </div>

          {/* Chat Sessions List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Recent Chats
              </h3>
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`transform transition-all duration-300 ${
                      deletingSessionId === session.id 
                        ? 'translate-x-full opacity-0 scale-95' 
                        : 'translate-x-0 opacity-100 scale-100'
                    }`}
                  >
                    <button
                      onClick={() => switchToSession(session)}
                      className={`w-full text-left p-3 rounded-xl transition-all duration-200 group hover:shadow-md relative overflow-hidden ${
                        currentSession?.id === session.id
                          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 shadow-sm'
                          : 'bg-white/60 hover:bg-white border border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between min-w-0">
                        <div className="flex-1 min-w-0 pr-2">
                          <div className={`font-medium text-sm truncate ${
                            currentSession?.id === session.id 
                              ? 'text-indigo-900' 
                              : 'text-gray-900 group-hover:text-gray-700'
                          }`}>
                            {session.title}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center">
                            <svg className="w-3 h-3 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="truncate">{new Date(session.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {session.messages && session.messages.length > 0 && (
                            <div className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs flex-shrink-0">
                              {session.messages.length}
                            </div>
                          )}
                          <button
                            onClick={(e) => deleteSession(session.id, e)}
                            disabled={deletingSessionId === session.id}
                            className={`p-1.5 rounded-full transition-all duration-200 ${
                              deletingSessionId === session.id
                                ? 'opacity-50 cursor-not-allowed'
                                : 'opacity-0 group-hover:opacity-100 hover:bg-red-100 hover:scale-110'
                            }`}
                            title="Delete chat"
                          >
                            {deletingSessionId === session.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-500 border-t-transparent" />
                            ) : (
                              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Mobile swipe indicator */}
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-red-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200 lg:hidden" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-white/50">

          {/* Notes View */}
          {viewMode === 'notes' && (
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Session Notes</h3>
                {currentSession?.notes && currentSession.notes.length > 0 ? (
                  <div className="space-y-4">
                    {currentSession.notes.map((note) => (
                      <div key={note.id} className="bg-white rounded-lg border border-gray-200 p-4 md:p-6 hover:shadow-md transition-shadow">
                        <h4 className="font-semibold text-gray-900 text-base md:text-lg">{note.title}</h4>
                        <p className="text-gray-600 mt-2 text-sm md:text-base">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-6">
                      <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">No Notes Yet</h3>
                    <p className="text-gray-600 max-w-md mx-auto text-sm md:text-base px-4">
                      Notes will be automatically generated as you chat. Start a conversation to see them appear here!
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        {/* Chat View */}
        {viewMode === 'chat' && (
          <>
            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto px-3 md:px-4 py-4 md:py-6">
              <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 max-w-lg mx-auto px-4">
                      <button
                        onClick={() => setInputMessage("Show me trending TikTok video ideas")}
                        className="text-left p-3 md:p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <span className="text-xl md:text-2xl mb-1 block">🎬</span>
                        <span className="text-xs md:text-sm font-medium">Trending Ideas</span>
                      </button>
                      <button
                        onClick={() => setInputMessage("Give me tips for viral content")}
                        className="text-left p-3 md:p-4 bg-white rounded-xl border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all"
                      >
                        <span className="text-xl md:text-2xl mb-1 block">💡</span>
                        <span className="text-xs md:text-sm font-medium">Viral Tips</span>
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
                        <div className={`px-4 py-3 md:px-6 md:py-4 rounded-2xl shadow-sm text-sm md:text-base ${
                          message.isUser 
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white' 
                            : 'bg-white border border-gray-200'
                        }`}>
                          {/* Thinking Animation */}
                          {!message.isUser && message.status === 'thinking' ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-gray-500 text-xs md:text-sm mr-2">AI is thinking</span>
                              <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-sm md:text-base ${message.isUser ? 'text-white' : 'text-gray-900'}`}>
                              {message.text}
                            </p>
                          )}
                          
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
                              message.status === 'error' ? 'text-red-500' : 
                              message.status === 'thinking' ? 'text-indigo-500' :
                              'text-gray-400'
                            }`}>
                              {message.status === 'sending' && '• Sending...'}
                              {message.status === 'sent' && '• Sent'}
                              {message.status === 'error' && '• Failed'}
                              {message.status === 'thinking' && '• Thinking...'}
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
            <form onSubmit={handleSendMessage} className="p-3 md:p-6 bg-white/80 backdrop-blur-sm border-t border-gray-200">
              <div className="max-w-4xl mx-auto">
                {/* Prompt Control Chips */}
                <div className="mb-4 overflow-x-auto">
                  <div className="flex space-x-2 pb-2 min-w-max">
                    <button
                      type="button"
                      onClick={() => setInputMessage("Show me trending TikTok video ideas")}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs md:text-sm font-medium rounded-full hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 flex items-center space-x-1 whitespace-nowrap"
                    >
                      <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Trending Ideas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMessage("Give me viral TikTok tips and best practices")}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs md:text-sm font-medium rounded-full hover:from-green-600 hover:to-emerald-600 transition-all duration-200 flex items-center space-x-1 whitespace-nowrap"
                    >
                      <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                      <span>Viral Tips</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMessage("Create a script for a cooking TikTok video")}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs md:text-sm font-medium rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-200 flex items-center space-x-1 whitespace-nowrap"
                    >
                      <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Create Script</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMessage("What are the current trending sounds on TikTok?")}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs md:text-sm font-medium rounded-full hover:from-pink-600 hover:to-rose-600 transition-all duration-200 flex items-center space-x-1 whitespace-nowrap"
                    >
                      <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                      </svg>
                      <span>Trending Sounds</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMessage("Help me plan a dance challenge video")}
                      className="px-3 py-1.5 md:px-4 md:py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs md:text-sm font-medium rounded-full hover:from-purple-600 hover:to-indigo-600 transition-all duration-200 flex items-center space-x-1 whitespace-nowrap"
                    >
                      <svg className="w-3 h-3 md:w-4 md:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h3a1 1 0 110 2h-1v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6H4a1 1 0 110-2h3zM9 6v10a1 1 0 102 0V6a1 1 0 10-2 0zm4 0v10a1 1 0 102 0V6a1 1 0 10-2 0z" />
                      </svg>
                      <span>Dance Challenge</span>
                    </button>
                  </div>
                </div>

                {/* Contextual Follow-up Chips */}
                {contextualChips.length > 0 && (
                  <div className="mb-3 overflow-x-auto">
                    <div className="flex space-x-2 pb-2 min-w-max">
                      <span className="text-xs text-gray-500 flex items-center whitespace-nowrap mr-2">Follow up:</span>
                      {contextualChips.map((chip, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setInputMessage(chip.prompt)}
                          className={`px-3 py-1 bg-gradient-to-r ${chip.color} text-white text-xs font-medium rounded-full hover:shadow-md transition-all duration-200 whitespace-nowrap border border-white/20`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex space-x-2 md:space-x-4">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask me anything about TikTok content..."
                    className="flex-1 px-4 py-3 md:px-6 md:py-4 bg-gray-50 text-gray-900 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 text-sm md:text-base"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="px-6 py-3 md:px-8 md:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-full hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 text-sm md:text-base"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 md:h-5 md:w-5 border-2 border-white border-t-transparent" />
                    ) : (
                      <span className="hidden md:inline">Send</span>
                    )}
                    {!loading && (
                      <svg className="w-4 h-4 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </>
        )}

          {/* Gallery View */}
          {viewMode === 'gallery' && (
            <div className="flex-1 overflow-auto p-4 md:p-6">
              <div className="max-w-7xl mx-auto">
                <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Video Gallery</h3>
                {currentSession?.gallery_videos && currentSession.gallery_videos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 md:gap-4">
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
                )}
              </div>
            </div>
          )}

        </div>

        {/* Video Modal */}
        {selectedVideo && (
          <div 
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 md:p-4"
            onClick={() => setSelectedVideo(null)}
          >
            <div 
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 md:p-6">
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <h2 className="text-lg md:text-2xl font-bold text-gray-900 pr-2">{selectedVideo.title}</h2>
                  <button
                    onClick={() => setSelectedVideo(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <p className="text-gray-600 text-sm md:text-base">{selectedVideo.description}</p>
                  <div className="flex items-center space-x-2 md:space-x-4 text-xs md:text-sm text-gray-500 flex-wrap">
                    <span>{selectedVideo.creator}</span>
                    <span>•</span>
                    <span>{selectedVideo.views} views</span>
                    <span>•</span>
                    <span>{selectedVideo.duration}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 md:gap-2 mt-4">
                    {selectedVideo.tags.map((tag) => (
                      <span 
                        key={tag}
                        className="px-2 py-1 md:px-3 md:py-1 bg-gray-100 text-gray-700 text-xs md:text-sm rounded-full"
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

        {/* Onboarding Modal */}
        {showOnboarding && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-6 md:p-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full mb-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Welcome to TikTok AI!</h2>
                  <p className="text-gray-600 text-lg">Your personal assistant for viral content creation</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                    <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">Generate Video Ideas</h3>
                    <p className="text-sm text-gray-600">Get trending TikTok content ideas tailored to your style</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">Create Scripts</h3>
                    <p className="text-sm text-gray-600">Generate engaging scripts and captions for your videos</p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border border-orange-200">
                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">Save to Gallery</h3>
                    <p className="text-sm text-gray-600">Organize your best content ideas in a visual gallery</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
                    <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">Smart Notes</h3>
                    <p className="text-sm text-gray-600">Automatic note-taking and conversation summaries</p>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 mb-6">
                  <h4 className="font-semibold text-gray-900 mb-2">💡 Quick Start Tips:</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Ask: &quot;Show me trending video ideas&quot; for instant inspiration</li>
                    <li>• Say: &quot;Create a script about...&quot; for ready-to-use content</li>
                    <li>• Try: &quot;Give me viral tips&quot; for proven strategies</li>
                    <li>• Use the tabs above to switch between Chat, Gallery, and Notes</li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowOnboarding(false);
                      setInputMessage("Show me trending TikTok video ideas");
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Get Started with Ideas
                  </button>
                  <button
                    onClick={() => setShowOnboarding(false)}
                    className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors duration-200"
                  >
                    Skip Tour
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}