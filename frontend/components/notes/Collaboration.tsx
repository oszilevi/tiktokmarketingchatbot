'use client';

import React, { useState, useCallback } from 'react';
import {
  EnhancedNote,
  NoteShare,
  NoteComment,
} from '@/types/notes';

interface CollaborationProps {
  note: EnhancedNote;
  shares?: NoteShare[];
  comments?: NoteComment[];
  onShare?: (noteId: string, shareOptions: Partial<NoteShare>) => Promise<void>;
  onUnshare?: (shareId: string) => Promise<void>;
  onComment?: (noteId: string, content: string) => Promise<void>;
  onDeleteComment?: (commentId: string) => Promise<void>;
  onResolveComment?: (commentId: string) => Promise<void>;
  currentUserId?: string;
  readOnly?: boolean;
}

interface ShareModalState {
  showModal: boolean;
  shareType: 'link' | 'user' | null;
  permissions: 'read' | 'comment' | 'edit';
  expiresIn: string;
  userEmail: string;
  generating: boolean;
  error: string | null;
}

export const Collaboration: React.FC<CollaborationProps> = ({
  note,
  shares = [],
  comments = [],
  onShare,
  onUnshare,
  onComment,
  onDeleteComment,
  onResolveComment,
  currentUserId = 'current-user',
  readOnly = false,
}) => {
  const [shareState, setShareState] = useState<ShareModalState>({
    showModal: false,
    shareType: null,
    permissions: 'read',
    expiresIn: '7d',
    userEmail: '',
    generating: false,
    error: null,
  });

  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const openShareModal = useCallback((type: 'link' | 'user') => {
    setShareState(prev => ({
      ...prev,
      showModal: true,
      shareType: type,
      error: null,
    }));
  }, []);

  const closeShareModal = useCallback(() => {
    setShareState(prev => ({
      ...prev,
      showModal: false,
      shareType: null,
      userEmail: '',
      error: null,
    }));
  }, []);

  const handleCreateShare = useCallback(async () => {
    if (!onShare || !shareState.shareType) return;

    setShareState(prev => ({ ...prev, generating: true, error: null }));

    try {
      const shareOptions: Partial<NoteShare> = {
        permissions: shareState.permissions,
        expires_at: shareState.expiresIn !== 'never' 
          ? new Date(Date.now() + parseInt(shareState.expiresIn) * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
      };

      if (shareState.shareType === 'user' && shareState.userEmail) {
        // In a real implementation, you'd resolve the email to a user ID
        shareOptions.shared_with_user_id = `user_${shareState.userEmail}`;
      } else {
        // Generate a share link
        shareOptions.share_link = `${window.location.origin}/notes/shared/${note.id}/${Date.now()}`;
      }

      await onShare(note.id, shareOptions);
      closeShareModal();
    } catch (error) {
      setShareState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create share',
        generating: false,
      }));
    }
  }, [note.id, shareState, onShare, closeShareModal]);

  const handleAddComment = useCallback(async () => {
    if (!onComment || !newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await onComment(note.id, newComment.trim());
      setNewComment('');
    } catch (error) {
      console.error('Failed to add comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  }, [note.id, newComment, onComment]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'read':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>;
      case 'comment':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>;
      case 'edit':
        return <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Sharing Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Sharing & Collaboration</h3>
          {!readOnly && (
            <div className="flex space-x-2">
              <button
                onClick={() => openShareModal('link')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Share Link
              </button>
              <button
                onClick={() => openShareModal('user')}
                className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Share with User
              </button>
            </div>
          )}
        </div>

        {/* Active Shares */}
        {shares.length > 0 ? (
          <div className="space-y-2">
            {shares.map(share => (
              <div key={share.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-gray-600">
                    {getPermissionIcon(share.permissions)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {share.shared_with_user_id ? 'Shared with user' : 'Public link'}
                    </p>
                    <p className="text-xs text-gray-600 capitalize">
                      {share.permissions} access
                      {share.expires_at && ` • Expires ${formatDate(share.expires_at)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {share.share_link && (
                    <button
                      onClick={() => navigator.clipboard.writeText(share.share_link!)}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                      title="Copy link"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h2m0 16h2a2 2 0 002-2V8a2 2 0 00-2-2h-2m0 16V4m0 0V4" />
                      </svg>
                    </button>
                  )}
                  {onUnshare && (
                    <button
                      onClick={() => onUnshare(share.id)}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                      title="Remove share"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="text-sm">This note hasn&apos;t been shared yet</p>
            <p className="text-xs">Share it to collaborate with others</p>
          </div>
        )}
      </div>

      {/* Comments Section */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Comments ({comments.length})
        </h3>

        {/* Add Comment */}
        {!readOnly && onComment && (
          <div className="mb-4">
            <div className="border border-gray-300 rounded-lg">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-3 border-0 rounded-t-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
              <div className="flex justify-end p-2 bg-gray-50 rounded-b-lg">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submittingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments List */}
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className={`p-4 rounded-lg border ${
                comment.is_resolved ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-700">
                        {comment.user_id.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        User {comment.user_id}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(comment.created_at)}
                        {comment.updated_at !== comment.created_at && ' (edited)'}
                      </p>
                    </div>
                  </div>
                  
                  {comment.is_resolved && (
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium text-green-800 bg-green-100 rounded-full">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Resolved
                    </span>
                  )}
                </div>
                
                <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                  {comment.content}
                </p>
                
                {!readOnly && (comment.user_id === currentUserId || !comment.is_resolved) && (
                  <div className="flex items-center space-x-2">
                    {!comment.is_resolved && onResolveComment && (
                      <button
                        onClick={() => onResolveComment(comment.id)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium"
                      >
                        Mark as Resolved
                      </button>
                    )}
                    {(comment.user_id === currentUserId || currentUserId === note.user_id) && onDeleteComment && (
                      <button
                        onClick={() => onDeleteComment(comment.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500">
            <svg className="mx-auto h-8 w-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-sm">No comments yet</p>
            <p className="text-xs">Start a discussion about this note</p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {shareState.showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {shareState.shareType === 'link' ? 'Share Link' : 'Share with User'}
              </h3>
              <button
                onClick={closeShareModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {shareState.shareType === 'user' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    User Email
                  </label>
                  <input
                    type="email"
                    value={shareState.userEmail}
                    onChange={(e) => setShareState(prev => ({ ...prev, userEmail: e.target.value }))}
                    placeholder="user@example.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Permissions
                </label>
                <select
                  value={shareState.permissions}
                  onChange={(e) => setShareState(prev => ({ ...prev, permissions: e.target.value as 'read' | 'comment' | 'edit' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="read">Can view</option>
                  <option value="comment">Can comment</option>
                  <option value="edit">Can edit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expires
                </label>
                <select
                  value={shareState.expiresIn}
                  onChange={(e) => setShareState(prev => ({ ...prev, expiresIn: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="1">1 day</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                  <option value="never">Never</option>
                </select>
              </div>

              {shareState.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-600">{shareState.error}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={closeShareModal}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateShare}
                disabled={shareState.generating || (shareState.shareType === 'user' && !shareState.userEmail)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {shareState.generating ? 'Creating...' : 'Create Share'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};