'use client';

import React, { useState, useCallback } from 'react';
import {
  EnhancedNote,
  ChatMessageNoteLink,
  GalleryItemNoteLink,
  NoteLink,
} from '@/types/notes';

interface NoteLinkingProps {
  note: EnhancedNote;
  onLinkToMessage?: (noteId: string, messageId: string, context?: string) => Promise<void>;
  onLinkToGallery?: (noteId: string, galleryItemId: string, context?: string) => Promise<void>;
  onLinkToNote?: (sourceNoteId: string, targetNoteId: string, linkType: string, description?: string) => Promise<void>;
  onUnlink?: (linkId: string, linkType: 'message' | 'gallery' | 'note') => Promise<void>;
  availableNotes?: EnhancedNote[];
  linkedMessages?: ChatMessageNoteLink[];
  linkedGalleryItems?: GalleryItemNoteLink[];
  linkedNotes?: NoteLink[];
}

interface LinkingState {
  showLinkModal: boolean;
  linkType: 'message' | 'gallery' | 'note' | null;
  searchQuery: string;
  selectedItem: any;
  linkContext: string;
  linkDescription: string;
  loading: boolean;
  error: string | null;
}

// Mock data for demonstration
const MOCK_MESSAGES = [
  {
    id: 'msg_1',
    content: 'Can you help me create a viral TikTok script about productivity tips?',
    timestamp: '2024-01-15T10:30:00Z',
    user: 'user',
  },
  {
    id: 'msg_2',
    content: 'What are the best hashtags for fitness content?',
    timestamp: '2024-01-15T11:00:00Z',
    user: 'user',
  },
  {
    id: 'msg_3',
    content: 'How do I make my cooking videos more engaging?',
    timestamp: '2024-01-15T11:30:00Z',
    user: 'user',
  },
];

const MOCK_GALLERY_ITEMS = [
  {
    id: 'gallery_1',
    title: 'Morning Routine Video Script',
    type: 'script',
    thumbnail: '/placeholder-thumb.jpg',
    created_at: '2024-01-14T09:00:00Z',
  },
  {
    id: 'gallery_2',
    title: 'Workout Motivation Ideas',
    type: 'idea',
    thumbnail: '/placeholder-thumb.jpg',
    created_at: '2024-01-13T15:30:00Z',
  },
  {
    id: 'gallery_3',
    title: 'Recipe Video Template',
    type: 'template',
    thumbnail: '/placeholder-thumb.jpg',
    created_at: '2024-01-12T12:00:00Z',
  },
];

export const NoteLinking: React.FC<NoteLinkingProps> = ({
  note,
  onLinkToMessage,
  onLinkToGallery,
  onLinkToNote,
  onUnlink,
  availableNotes = [],
  linkedMessages = [],
  linkedGalleryItems = [],
  linkedNotes = [],
}) => {
  const [state, setState] = useState<LinkingState>({
    showLinkModal: false,
    linkType: null,
    searchQuery: '',
    selectedItem: null,
    linkContext: '',
    linkDescription: '',
    loading: false,
    error: null,
  });

  const openLinkModal = useCallback((linkType: 'message' | 'gallery' | 'note') => {
    setState(prev => ({
      ...prev,
      showLinkModal: true,
      linkType,
      searchQuery: '',
      selectedItem: null,
      linkContext: '',
      linkDescription: '',
      error: null,
    }));
  }, []);

  const closeLinkModal = useCallback(() => {
    setState(prev => ({
      ...prev,
      showLinkModal: false,
      linkType: null,
      selectedItem: null,
      linkContext: '',
      linkDescription: '',
      error: null,
    }));
  }, []);

  const handleCreateLink = useCallback(async () => {
    if (!state.selectedItem || !state.linkType) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      switch (state.linkType) {
        case 'message':
          if (onLinkToMessage) {
            await onLinkToMessage(note.id, state.selectedItem.id, state.linkContext);
          }
          break;
        case 'gallery':
          if (onLinkToGallery) {
            await onLinkToGallery(note.id, state.selectedItem.id, state.linkContext);
          }
          break;
        case 'note':
          if (onLinkToNote) {
            await onLinkToNote(note.id, state.selectedItem.id, 'related', state.linkDescription);
          }
          break;
      }
      closeLinkModal();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create link',
        loading: false,
      }));
    }
  }, [state, note.id, onLinkToMessage, onLinkToGallery, onLinkToNote, closeLinkModal]);

  const handleUnlink = useCallback(async (linkId: string, linkType: 'message' | 'gallery' | 'note') => {
    if (!onUnlink) return;

    try {
      await onUnlink(linkId, linkType);
    } catch (error) {
      console.error('Failed to unlink:', error);
    }
  }, [onUnlink]);

  const getFilteredItems = useCallback(() => {
    const query = state.searchQuery.toLowerCase();
    
    switch (state.linkType) {
      case 'message':
        return MOCK_MESSAGES.filter(msg =>
          msg.content.toLowerCase().includes(query)
        );
      case 'gallery':
        return MOCK_GALLERY_ITEMS.filter(item =>
          item.title.toLowerCase().includes(query)
        );
      case 'note':
        return availableNotes.filter(n =>
          n.id !== note.id && // Don't include current note
          !linkedNotes.some(link => link.target_note_id === n.id) && // Don't include already linked notes
          (n.title.toLowerCase().includes(query) || 
           n.plainTextContent?.toLowerCase().includes(query))
        );
      default:
        return [];
    }
  }, [state.linkType, state.searchQuery, availableNotes, note.id, linkedNotes]);

  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  }, []);

  return (
    <div className="space-y-4">
      {/* Link Creation Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => openLinkModal('message')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Link to Message
        </button>
        <button
          onClick={() => openLinkModal('gallery')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Link to Gallery
        </button>
        <button
          onClick={() => openLinkModal('note')}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          Link to Note
        </button>
      </div>

      {/* Existing Links */}
      <div className="space-y-3">
        {/* Linked Messages */}
        {linkedMessages.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Linked Messages ({linkedMessages.length})
            </h4>
            <div className="space-y-2">
              {linkedMessages.map(link => {
                const message = MOCK_MESSAGES.find(m => m.id === link.chat_message_id);
                return (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">
                        {message?.content || 'Message not found'}
                      </p>
                      {link.link_context && (
                        <p className="text-xs text-gray-600 mt-1">Context: {link.link_context}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(link.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnlink(link.id, 'message')}
                      className="ml-3 p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Remove link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Linked Gallery Items */}
        {linkedGalleryItems.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Linked Gallery Items ({linkedGalleryItems.length})
            </h4>
            <div className="space-y-2">
              {linkedGalleryItems.map(link => {
                const item = MOCK_GALLERY_ITEMS.find(i => i.id === link.gallery_item_id);
                return (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {item?.title || 'Gallery item not found'}
                      </p>
                      <p className="text-xs text-gray-600 capitalize">
                        {item?.type}
                      </p>
                      {link.link_context && (
                        <p className="text-xs text-gray-600 mt-1">Context: {link.link_context}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(link.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnlink(link.id, 'gallery')}
                      className="ml-3 p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Remove link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Linked Notes */}
        {linkedNotes.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Linked Notes ({linkedNotes.length})
            </h4>
            <div className="space-y-2">
              {linkedNotes.map(link => {
                const linkedNote = availableNotes.find(n => n.id === link.target_note_id);
                return (
                  <div key={link.id} className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {linkedNote?.title || 'Note not found'}
                      </p>
                      <p className="text-xs text-gray-600 capitalize">
                        {link.link_type} link
                      </p>
                      {link.description && (
                        <p className="text-xs text-gray-600 mt-1">{link.description}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(link.created_at)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnlink(link.id, 'note')}
                      className="ml-3 p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                      title="Remove link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* No Links Message */}
        {linkedMessages.length === 0 && linkedGalleryItems.length === 0 && linkedNotes.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            <p className="text-sm">No links created yet</p>
            <p className="text-xs">Connect this note to messages, gallery items, or other notes</p>
          </div>
        )}
      </div>

      {/* Link Creation Modal */}
      {state.showLinkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Link to {state.linkType === 'message' ? 'Message' : state.linkType === 'gallery' ? 'Gallery Item' : 'Note'}
              </h3>
              <button
                onClick={closeLinkModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder={`Search ${state.linkType}s...`}
                value={state.searchQuery}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Items List */}
            <div className="mb-4 max-h-60 overflow-y-auto">
              <div className="space-y-2">
                {getFilteredItems().map(item => (
                  <div
                    key={item.id}
                    onClick={() => setState(prev => ({ ...prev, selectedItem: item }))}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      state.selectedItem?.id === item.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {state.linkType === 'message' ? (item as any).content : 
                           state.linkType === 'gallery' ? (item as any).title :
                           (item as any).title}
                        </p>
                        {state.linkType === 'gallery' && (
                          <p className="text-xs text-gray-600 capitalize">{(item as any).type}</p>
                        )}
                        {state.linkType === 'note' && (
                          <p className="text-xs text-gray-600">{(item as any).word_count} words</p>
                        )}
                        <p className="text-xs text-gray-500">
                          {formatDate(state.linkType === 'message' ? (item as any).timestamp : (item as any).created_at)}
                        </p>
                      </div>
                      {state.selectedItem?.id === item.id && (
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Context/Description Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {state.linkType === 'note' ? 'Description (optional)' : 'Context (optional)'}
              </label>
              <textarea
                value={state.linkType === 'note' ? state.linkDescription : state.linkContext}
                onChange={(e) => setState(prev => ({
                  ...prev,
                  [state.linkType === 'note' ? 'linkDescription' : 'linkContext']: e.target.value
                }))}
                placeholder={`Why are you linking this ${state.linkType}?`}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Error Message */}
            {state.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-600">{state.error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={closeLinkModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateLink}
                disabled={!state.selectedItem || state.loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {state.loading ? 'Creating Link...' : 'Create Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};