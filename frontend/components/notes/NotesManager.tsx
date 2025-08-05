'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  NotesManagerProps,
  EnhancedNote,
  NoteCategory,
  NoteTag,
  NoteSearchFilters,
  NoteSortOptions,
  NoteViewMode,
  NoteDisplayOptions,
  BulkOperation,
} from '@/types/notes';

interface NotesManagerState {
  notes: EnhancedNote[];
  categories: NoteCategory[];
  tags: NoteTag[];
  selectedNotes: string[];
  filters: NoteSearchFilters;
  sortOptions: NoteSortOptions;
  displayOptions: NoteDisplayOptions;
  showFilters: boolean;
  showBulkActions: boolean;
  loading: boolean;
  error: string | null;
}

export const NotesManager: React.FC<NotesManagerProps> = ({
  initialFilters = {},
  initialViewMode = 'card',
  showCategories = true,
  showTags = true,
  allowBulkOperations = true,
  maxNotesPerPage = 20,
}) => {
  const [state, setState] = useState<NotesManagerState>({
    notes: [],
    categories: [],
    tags: [],
    selectedNotes: [],
    filters: {
      query: '',
      category_ids: [],
      tag_ids: [],
      ...initialFilters,
    },
    sortOptions: {
      field: 'updated_at',
      direction: 'desc',
    },
    displayOptions: {
      view_mode: initialViewMode,
      show_preview: true,
      show_metadata: true,
      show_tags: true,
      show_category: true,
      cards_per_row: 3,
      preview_length: 150,
    },
    showFilters: false,
    showBulkActions: false,
    loading: false,
    error: null,
  });

  // Mock data for demonstration
  const mockNotes: EnhancedNote[] = [
    {
      id: '1',
      title: 'TikTok Marketing Strategy',
      content: '<h2>Content Strategy</h2><p>Focus on <strong>authentic storytelling</strong> and <em>trending hashtags</em>.</p><ul><li>Post 3-5 times daily</li><li>Use trending sounds</li><li>Engage with comments quickly</li></ul>',
      plainTextContent: 'Content Strategy Focus on authentic storytelling and trending hashtags. Post 3-5 times daily Use trending sounds Engage with comments quickly',
      created_at: '2024-01-15T10:00:00Z',
      updated_at: '2024-01-16T14:30:00Z',
      category_id: 'strategy',
      tags: [
        { id: 'marketing', name: 'Marketing', color: '#3B82F6', created_at: '2024-01-01T00:00:00Z' },
        { id: 'social-media', name: 'Social Media', color: '#10B981', created_at: '2024-01-01T00:00:00Z' },
      ],
      is_pinned: true,
      is_archived: false,
      is_public: false,
      word_count: 45,
      reading_time_minutes: 1,
      color: '#FEF3C7',
      related_notes: ['2'],
      metadata: {
        source: 'manual',
        version: 1,
        keywords: ['marketing', 'strategy', 'content'],
      },
    },
    {
      id: '2',
      title: 'Viral Video Ideas',
      content: '<h1>Trending Content Ideas</h1><p>Collection of viral video concepts:</p><blockquote>Dance challenges are making a comeback!</blockquote><h3>Current Trends:</h3><ol><li>Before/After transformations</li><li>Behind-the-scenes content</li><li>Educational quick tips</li></ol>',
      plainTextContent: 'Trending Content Ideas Collection of viral video concepts: Dance challenges are making a comeback! Current Trends: Before/After transformations Behind-the-scenes content Educational quick tips',
      created_at: '2024-01-14T09:15:00Z',
      updated_at: '2024-01-15T16:20:00Z',
      category_id: 'ideas',
      tags: [
        { id: 'viral', name: 'Viral', color: '#EF4444', created_at: '2024-01-01T00:00:00Z' },
        { id: 'content', name: 'Content Ideas', color: '#8B5CF6', created_at: '2024-01-01T00:00:00Z' },
      ],
      is_pinned: false,
      is_archived: false,
      is_public: true,
      word_count: 32,
      reading_time_minutes: 1,
      related_notes: ['1'],
      metadata: {
        source: 'manual',
        version: 2,
        keywords: ['viral', 'trends', 'ideas'],
      },
    },
    {
      id: '3',
      title: 'Analytics Report - Week 1',
      content: '<h2>Performance Metrics</h2><p>Weekly analytics summary:</p><ul><li><strong>Views:</strong> 125,000 (+15%)</li><li><strong>Engagement:</strong> 8.5% (+2.1%)</li><li><strong>Followers:</strong> +1,200</li></ul><pre><code>Engagement Rate = (Likes + Comments + Shares) / Views * 100</code></pre>',
      plainTextContent: 'Performance Metrics Weekly analytics summary: Views: 125,000 (+15%) Engagement: 8.5% (+2.1%) Followers: +1,200 Engagement Rate = (Likes + Comments + Shares) / Views * 100',
      created_at: '2024-01-13T11:00:00Z',
      updated_at: '2024-01-13T11:00:00Z',
      category_id: 'analytics',
      tags: [
        { id: 'data', name: 'Data', color: '#06B6D4', created_at: '2024-01-01T00:00:00Z' },
        { id: 'metrics', name: 'Metrics', color: '#F59E0B', created_at: '2024-01-01T00:00:00Z' },
      ],
      is_pinned: false,
      is_archived: false,
      is_public: false,
      word_count: 28,
      reading_time_minutes: 1,
      metadata: {
        source: 'auto-generated',
        ai_generated: true,
        version: 1,
        keywords: ['analytics', 'performance', 'metrics'],
      },
    },
  ];

  const mockCategories: NoteCategory[] = [
    {
      id: 'strategy',
      name: 'Strategy',
      description: 'Marketing and content strategies',
      color: '#3B82F6',
      icon: '🎯',
      sort_order: 1,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'ideas',
      name: 'Ideas',
      description: 'Content ideas and inspiration',
      color: '#10B981',
      icon: '💡',
      sort_order: 2,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'analytics',
      name: 'Analytics',
      description: 'Performance data and insights',
      color: '#8B5CF6',
      icon: '📊',
      sort_order: 3,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'scripts',
      name: 'Scripts',
      description: 'Video scripts and dialogues',
      color: '#F59E0B',
      icon: '📝',
      sort_order: 4,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ];

  // Initialize with mock data
  useEffect(() => {
    setState(prev => ({
      ...prev,
      notes: mockNotes,
      categories: mockCategories,
      tags: Array.from(new Set(mockNotes.flatMap(note => note.tags))),
    }));
  }, []);

  // Filter and sort notes
  const filteredAndSortedNotes = useMemo(() => {
    let filtered = state.notes;

    // Apply filters
    if (state.filters.query) {
      const query = state.filters.query.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.plainTextContent?.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.name.toLowerCase().includes(query))
      );
    }

    if (state.filters.category_ids && state.filters.category_ids.length > 0) {
      filtered = filtered.filter(note =>
        note.category_id && state.filters.category_ids!.includes(note.category_id)
      );
    }

    if (state.filters.tag_ids && state.filters.tag_ids.length > 0) {
      filtered = filtered.filter(note =>
        note.tags.some(tag => state.filters.tag_ids!.includes(tag.id))
      );
    }

    if (state.filters.is_pinned !== undefined) {
      filtered = filtered.filter(note => note.is_pinned === state.filters.is_pinned);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const { field, direction } = state.sortOptions;
      let aValue: any, bValue: any;

      switch (field) {
        case 'title':
          aValue = a.title;
          bValue = b.title;
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case 'updated_at':
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
          break;
        case 'word_count':
          aValue = a.word_count;
          bValue = b.word_count;
          break;
        case 'reading_time':
          aValue = a.reading_time_minutes;
          bValue = b.reading_time_minutes;
          break;
        default:
          aValue = new Date(a.updated_at);
          bValue = new Date(b.updated_at);
      }

      if (direction === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [state.notes, state.filters, state.sortOptions]);

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, query },
    }));
  }, []);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: Partial<NoteSearchFilters>) => {
    setState(prev => ({
      ...prev,
      filters: { ...prev.filters, ...newFilters },
    }));
  }, []);

  // Handle sort changes
  const handleSortChange = useCallback((sortOptions: NoteSortOptions) => {
    setState(prev => ({
      ...prev,
      sortOptions,
    }));
  }, []);

  // Handle view mode changes
  const handleViewModeChange = useCallback((viewMode: NoteViewMode) => {
    setState(prev => ({
      ...prev,
      displayOptions: { ...prev.displayOptions, view_mode: viewMode },
    }));
  }, []);

  // Handle note selection
  const handleNoteSelection = useCallback((noteId: string, selected: boolean) => {
    setState(prev => ({
      ...prev,
      selectedNotes: selected
        ? [...prev.selectedNotes, noteId]
        : prev.selectedNotes.filter(id => id !== noteId),
    }));
  }, []);

  // Handle bulk operations
  const handleBulkOperation = useCallback((operation: BulkOperation) => {
    console.log('Bulk operation:', operation);
    // Implementation would handle the actual bulk operation
    setState(prev => ({
      ...prev,
      selectedNotes: [],
      showBulkActions: false,
    }));
  }, []);

  // Get note preview text
  const getPreviewText = useCallback((note: EnhancedNote) => {
    const text = note.plainTextContent || note.content.replace(/<[^>]*>/g, '');
    return text.length > state.displayOptions.preview_length
      ? text.substring(0, state.displayOptions.preview_length) + '...'
      : text;
  }, [state.displayOptions.preview_length]);

  // Format date
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

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Notes</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setState(prev => ({ ...prev, showFilters: !prev.showFilters }))}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              New Note
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search notes..."
            value={state.filters.query || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filters Panel */}
        {state.showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Categories Filter */}
              {showCategories && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {state.categories.map(category => (
                      <label key={category.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={state.filters.category_ids?.includes(category.id) || false}
                          onChange={(e) => {
                            const categoryIds = state.filters.category_ids || [];
                            handleFilterChange({
                              category_ids: e.target.checked
                                ? [...categoryIds, category.id]
                                : categoryIds.filter(id => id !== category.id)
                            });
                          }}
                          className="mr-2 rounded"
                        />
                        <span className="text-sm flex items-center">
                          <span className="mr-1">{category.icon}</span>
                          {category.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags Filter */}
              {showTags && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {state.tags.map(tag => (
                      <label key={tag.id} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={state.filters.tag_ids?.includes(tag.id) || false}
                          onChange={(e) => {
                            const tagIds = state.filters.tag_ids || [];
                            handleFilterChange({
                              tag_ids: e.target.checked
                                ? [...tagIds, tag.id]
                                : tagIds.filter(id => id !== tag.id)
                            });
                          }}
                          className="mr-2 rounded"
                        />
                        <span
                          className="text-xs px-2 py-1 rounded-full text-white"
                          style={{ backgroundColor: tag.color }}
                        >
                          {tag.name}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Other Filters */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Options</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={state.filters.is_pinned === true}
                      onChange={(e) => handleFilterChange({
                        is_pinned: e.target.checked ? true : undefined
                      })}
                      className="mr-2 rounded"
                    />
                    <span className="text-sm">Pinned only</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-600">
            {filteredAndSortedNotes.length} notes
          </span>
          {allowBulkOperations && state.selectedNotes.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-600">
                {state.selectedNotes.length} selected
              </span>
              <button
                onClick={() => setState(prev => ({ ...prev, showBulkActions: !prev.showBulkActions }))}
                className="text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
              >
                Actions
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Sort Options */}
          <select
            value={`${state.sortOptions.field}-${state.sortOptions.direction}`}
            onChange={(e) => {
              const [field, direction] = e.target.value.split('-');
              handleSortChange({
                field: field as any,
                direction: direction as 'asc' | 'desc',
              });
            }}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="updated_at-desc">Recently Updated</option>
            <option value="created_at-desc">Recently Created</option>
            <option value="title-asc">Title A-Z</option>
            <option value="title-desc">Title Z-A</option>
            <option value="word_count-desc">Most Words</option>
            <option value="word_count-asc">Least Words</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded overflow-hidden">
            <button
              onClick={() => handleViewModeChange('card')}
              className={`px-3 py-1 text-sm ${
                state.displayOptions.view_mode === 'card'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } transition-colors`}
            >
              Cards
            </button>
            <button
              onClick={() => handleViewModeChange('list')}
              className={`px-3 py-1 text-sm ${
                state.displayOptions.view_mode === 'list'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              } transition-colors`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {state.showBulkActions && state.selectedNotes.length > 0 && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-blue-700 mr-4">
              {state.selectedNotes.length} notes selected
            </span>
            <button
              onClick={() => handleBulkOperation({
                operation: 'categorize',
                note_ids: state.selectedNotes,
                parameters: { category_id: 'ideas' }
              })}
              className="text-sm px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
            >
              Categorize
            </button>
            <button
              onClick={() => handleBulkOperation({
                operation: 'tag',
                note_ids: state.selectedNotes,
                parameters: { tag_ids: ['marketing'] }
              })}
              className="text-sm px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
            >
              Tag
            </button>
            <button
              onClick={() => handleBulkOperation({
                operation: 'archive',
                note_ids: state.selectedNotes,
                parameters: { archive: true }
              })}
              className="text-sm px-3 py-1 bg-white border border-blue-300 text-blue-700 rounded hover:bg-blue-50 transition-colors"
            >
              Archive
            </button>
            <button
              onClick={() => handleBulkOperation({
                operation: 'delete',
                note_ids: state.selectedNotes,
              })}
              className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Notes Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {state.loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredAndSortedNotes.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No notes found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {state.filters.query || state.filters.category_ids?.length || state.filters.tag_ids?.length
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by creating your first note.'}
            </p>
          </div>
        ) : (
          <div className={
            state.displayOptions.view_mode === 'card'
              ? `grid gap-4 ${
                  state.displayOptions.cards_per_row === 1 ? 'grid-cols-1' :
                  state.displayOptions.cards_per_row === 2 ? 'grid-cols-1 md:grid-cols-2' :
                  'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
                }`
              : 'space-y-2'
          }>
            {filteredAndSortedNotes.map(note => (
              <div
                key={note.id}
                className={`
                  ${state.displayOptions.view_mode === 'card'
                    ? 'bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow'
                    : 'bg-white border border-gray-200 rounded p-4 hover:bg-gray-50'
                  }
                  ${note.color ? 'border-l-4' : ''}
                  ${allowBulkOperations ? 'cursor-pointer' : ''}
                `}
                style={note.color ? { borderLeftColor: note.color } : {}}
                onClick={() => allowBulkOperations && handleNoteSelection(note.id, !state.selectedNotes.includes(note.id))}
              >
                {/* Note Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    {allowBulkOperations && (
                      <input
                        type="checkbox"
                        checked={state.selectedNotes.includes(note.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleNoteSelection(note.id, e.target.checked);
                        }}
                        className="rounded"
                      />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      {note.is_pinned && (
                        <svg className="w-4 h-4 text-yellow-500 mr-1" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 12V4a1 1 0 00-1-1H9a1 1 0 00-1 1v8H6v2l2 2v6h8v-6l2-2v-2h-2zM10 6h4v6h-4V6z"/>
                        </svg>
                      )}
                      {note.title}
                    </h3>
                  </div>
                  <div className="flex items-center space-x-1">
                    {note.is_public && (
                      <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                      </svg>
                    )}
                    <button className="text-gray-400 hover:text-gray-600">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Note Content Preview */}
                {state.displayOptions.show_preview && (
                  <p className="text-gray-600 mb-3 leading-relaxed">
                    {getPreviewText(note)}
                  </p>
                )}

                {/* Note Metadata */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>{formatDate(note.updated_at)}</span>
                    <span>{note.word_count} words</span>
                    <span>{note.reading_time_minutes} min read</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Category */}
                    {state.displayOptions.show_category && note.category_id && (
                      <span
                        className="px-2 py-1 text-xs rounded text-white"
                        style={{
                          backgroundColor: state.categories.find(c => c.id === note.category_id)?.color || '#6B7280'
                        }}
                      >
                        {state.categories.find(c => c.id === note.category_id)?.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Tags */}
                {state.displayOptions.show_tags && note.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {note.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 text-xs rounded-full text-white"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};