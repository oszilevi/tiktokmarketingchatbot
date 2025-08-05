'use client';

import React, { useState, useCallback } from 'react';
import {
  EnhancedNote,
  NoteCategory,
  NoteViewMode,
  NoteDisplayOptions,
} from '@/types/notes';

interface NotesDisplayProps {
  notes: EnhancedNote[];
  categories: NoteCategory[];
  displayOptions: NoteDisplayOptions;
  selectedNotes: string[];
  onNoteSelect?: (noteId: string, selected: boolean) => void;
  onNoteClick?: (note: EnhancedNote) => void;
  onNoteEdit?: (note: EnhancedNote) => void;
  onNoteDelete?: (note: EnhancedNote) => void;
  onNoteDuplicate?: (note: EnhancedNote) => void;
  onNotePin?: (note: EnhancedNote) => void;
  allowSelection?: boolean;
  loading?: boolean;
}

interface NoteCardProps {
  note: EnhancedNote;
  category?: NoteCategory;
  displayOptions: NoteDisplayOptions;
  isSelected: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onPin?: () => void;
  allowSelection?: boolean;
}

const NoteCard: React.FC<NoteCardProps> = ({
  note,
  category,
  displayOptions,
  isSelected,
  onSelect,
  onClick,
  onEdit,
  onDelete,
  onDuplicate,
  onPin,
  allowSelection = false,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const getPreviewText = useCallback((content: string) => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    return text.length > displayOptions.preview_length
      ? text.substring(0, displayOptions.preview_length) + '...'
      : text;
  }, [displayOptions.preview_length]);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }, []);

  if (displayOptions.view_mode === 'list' || displayOptions.view_mode === 'compact') {
    return (
      <div
        className={`
          bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-all duration-200 cursor-pointer
          ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
          ${note.color ? 'border-l-4' : ''}
          ${displayOptions.view_mode === 'compact' ? 'py-2' : ''}
        `}
        style={note.color ? { borderLeftColor: note.color } : {}}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            {allowSelection && onSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  onSelect(e.target.checked);
                }}
                className="rounded"
              />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className={`font-semibold text-gray-900 truncate ${
                  displayOptions.view_mode === 'compact' ? 'text-sm' : 'text-base'
                }`}>
                  {note.is_pinned && (
                    <svg className="inline w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M16 12V4a1 1 0 00-1-1H9a1 1 0 00-1 1v8H6v2l2 2v6h8v-6l2-2v-2h-2zM10 6h4v6h-4V6z"/>
                    </svg>
                  )}
                  {note.title}
                </h3>
                {displayOptions.show_category && category && (
                  <span
                    className="px-2 py-1 text-xs rounded text-white flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  >
                    {category.icon} {category.name}
                  </span>
                )}
              </div>
              
              {displayOptions.show_preview && displayOptions.view_mode !== 'compact' && (
                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                  {getPreviewText(note.plainTextContent || note.content)}
                </p>
              )}
              
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span>{formatDate(note.updated_at)}</span>
                <span>{note.word_count} words</span>
                <span>{note.reading_time_minutes} min read</span>
                {note.is_public && (
                  <span className="flex items-center text-green-600">
                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                    </svg>
                    Public
                  </span>
                )}
              </div>
              
              {displayOptions.show_tags && note.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {note.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag.id}
                      className="px-2 py-1 text-xs rounded-full text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
              </svg>
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <div className="py-1">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Duplicate
                    </button>
                  )}
                  {onPin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPin();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {note.is_pinned ? 'Unpin' : 'Pin'}
                    </button>
                  )}
                  <div className="border-t border-gray-100"></div>
                  {onDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Card view
  return (
    <div
      className={`
        bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-all duration-200 cursor-pointer h-full flex flex-col
        ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        ${note.color ? 'border-l-4' : ''}
      `}
      style={note.color ? { borderLeftColor: note.color } : {}}
      onClick={onClick}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          {allowSelection && onSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onSelect(e.target.checked);
              }}
              className="rounded flex-shrink-0"
            />
          )}
          <h3 className="font-semibold text-gray-900 text-lg leading-tight flex items-center min-w-0">
            {note.is_pinned && (
              <svg className="w-4 h-4 text-yellow-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M16 12V4a1 1 0 00-1-1H9a1 1 0 00-1 1v8H6v2l2 2v6h8v-6l2-2v-2h-2zM10 6h4v6h-4V6z"/>
              </svg>
            )}
            <span className="truncate">{note.title}</span>
          </h3>
        </div>
        
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
            </svg>
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <div className="py-1">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Edit
                  </button>
                )}
                {onDuplicate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicate();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Duplicate
                  </button>
                )}
                {onPin && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPin();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    {note.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                <div className="border-t border-gray-100"></div>
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="flex-1 flex flex-col">
        {displayOptions.show_preview && (
          <p className="text-gray-600 mb-4 leading-relaxed flex-1">
            {getPreviewText(note.plainTextContent || note.content)}
          </p>
        )}

        {/* Tags */}
        {displayOptions.show_tags && note.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1">
            {note.tags.slice(0, 4).map(tag => (
              <span
                key={tag.id}
                className="px-2 py-1 text-xs rounded-full text-white"
                style={{ backgroundColor: tag.color }}
              >
                {tag.name}
              </span>
            ))}
            {note.tags.length > 4 && (
              <span className="px-2 py-1 text-xs rounded-full bg-gray-200 text-gray-600">
                +{note.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Card Footer */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-3 text-gray-500">
            <span>{formatDate(note.updated_at)}</span>
            <span>{note.word_count} words</span>
            <span>{note.reading_time_minutes} min read</span>
          </div>
          
          <div className="flex items-center space-x-2">
            {displayOptions.show_category && category && (
              <span
                className="px-2 py-1 text-xs rounded text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.icon} {category.name}
              </span>
            )}
            {note.is_public && (
              <span className="flex items-center text-green-600 text-xs">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                Public
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotesDisplay: React.FC<NotesDisplayProps> = ({
  notes,
  categories,
  displayOptions,
  selectedNotes,
  onNoteSelect,
  onNoteClick,
  onNoteEdit,
  onNoteDelete,
  onNoteDuplicate,
  onNotePin,
  allowSelection = false,
  loading = false,
}) => {
  // Handle click outside to close menus
  React.useEffect(() => {
    const handleClickOutside = () => {
      // Close any open menus
      const menus = document.querySelectorAll('[data-menu-open]');
      menus.forEach(menu => menu.removeAttribute('data-menu-open'));
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No notes found</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by creating your first note.
        </p>
      </div>
    );
  }

  const getGridClasses = () => {
    if (displayOptions.view_mode === 'list' || displayOptions.view_mode === 'compact') {
      return 'space-y-2';
    }
    
    switch (displayOptions.cards_per_row) {
      case 1:
        return 'grid grid-cols-1 gap-6';
      case 2:
        return 'grid grid-cols-1 md:grid-cols-2 gap-6';
      case 4:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';
      default:
        return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    }
  };

  return (
    <div className={getGridClasses()}>
      {notes.map(note => {
        const category = categories.find(c => c.id === note.category_id);
        return (
          <NoteCard
            key={note.id}
            note={note}
            category={category}
            displayOptions={displayOptions}
            isSelected={selectedNotes.includes(note.id)}
            onSelect={onNoteSelect ? (selected) => onNoteSelect(note.id, selected) : undefined}
            onClick={onNoteClick ? () => onNoteClick(note) : undefined}
            onEdit={onNoteEdit ? () => onNoteEdit(note) : undefined}
            onDelete={onNoteDelete ? () => onNoteDelete(note) : undefined}
            onDuplicate={onNoteDuplicate ? () => onNoteDuplicate(note) : undefined}
            onPin={onNotePin ? () => onNotePin(note) : undefined}
            allowSelection={allowSelection}
          />
        );
      })}
    </div>
  );
};