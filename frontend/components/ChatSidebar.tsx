'use client';

import { useState } from 'react';

interface ChatSession {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  onNewChat: () => void;
  onSessionSwitch: (session: ChatSession) => void;
  viewMode: 'chat' | 'gallery' | 'notes';
  onViewModeChange: (mode: 'chat' | 'gallery' | 'notes') => void;
}

export default function ChatSidebar({
  sessions,
  currentSession,
  onNewChat,
  onSessionSwitch,
  viewMode,
  onViewModeChange,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  return (
    <aside className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-full">
      {/* New Chat Button */}
      <div className="p-4">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-3">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <svg 
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="px-4 pb-4">
        <div className="flex bg-gray-200 rounded-lg p-1">
          {(['chat', 'gallery', 'notes'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => onViewModeChange(mode)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium capitalize transition-all duration-200 ${
                viewMode === mode
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {mode === 'chat' && (
                <div className="flex items-center justify-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span>Chat</span>
                </div>
              )}
              {mode === 'gallery' && (
                <div className="flex items-center justify-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Gallery</span>
                </div>
              )}
              {mode === 'notes' && (
                <div className="flex items-center justify-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Notes</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Recent Conversations
        </h3>
        
        {filteredSessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No conversations found</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredSessions.map((session) => (
              <button
                key={session.id}
                onClick={() => onSessionSwitch(session)}
                className={`w-full text-left p-3 rounded-lg transition-all duration-200 group ${
                  currentSession?.id === session.id
                    ? 'bg-white shadow-sm border border-gray-200'
                    : 'hover:bg-white/60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${
                      currentSession?.id === session.id ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {session.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatDate(session.updated_at)}
                    </p>
                  </div>
                  
                  {/* Options button (hidden by default, shown on hover) */}
                  <button
                    className="ml-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-gray-100 transition-opacity duration-200"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Add delete/rename functionality here
                    }}
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>{sessions.length} conversations</span>
          <button className="hover:text-gray-700 transition-colors">
            Manage storage
          </button>
        </div>
      </div>
    </aside>
  );
}