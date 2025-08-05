'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RichTextEditor } from './RichTextEditor';
import {
  NoteEditorProps,
  EnhancedNote,
  NoteCategory,
  NoteTag,
  NoteTemplate,
} from '@/types/notes';

interface NoteEditorState {
  title: string;
  content: string;
  category_id: string;
  tags: NoteTag[];
  template_id?: string;
  is_pinned: boolean;
  is_public: boolean;
  color?: string;
  saving: boolean;
  error: string | null;
}

const PREDEFINED_COLORS = [
  '#FEF3C7', // yellow
  '#DBEAFE', // blue
  '#D1FAE5', // green
  '#FCE7F3', // pink
  '#E0E7FF', // indigo
  '#FED7D7', // red
  '#E6FFFA', // teal
  '#F3E8FF', // purple
];

const DEFAULT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Start with an empty note',
    content: '',
    category: 'custom',
    is_system: true,
    is_public: true,
    usage_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'script-template',
    name: 'Video Script',
    description: 'Template for TikTok video scripts',
    content: `<h1>Video Script</h1>

<h2>Hook (0-3 seconds)</h2>
<p><em>Grab attention with a compelling opening</em></p>
<blockquote>Example: "You won't believe what happened next..."</blockquote>

<h2>Main Content (3-15 seconds)</h2>
<ul>
<li><strong>Point 1:</strong> Key message or tip</li>
<li><strong>Point 2:</strong> Supporting information</li>
<li><strong>Point 3:</strong> Additional value</li>
</ul>

<h2>Call to Action (15-30 seconds)</h2>
<p>Tell viewers what to do next:</p>
<ul>
<li>Follow for more tips</li>
<li>Like if this helped</li>
<li>Comment your thoughts</li>
<li>Share with friends</li>
</ul>

<h2>Hashtags</h2>
<p><code>#TikTok #Content #Viral #Tips</code></p>`,
    category: 'script',
    is_system: true,
    is_public: true,
    usage_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'idea-template',
    name: 'Content Idea',
    description: 'Template for brainstorming content ideas',
    content: `<h1>Content Idea</h1>

<h2>Concept</h2>
<p><em>Brief description of the idea</em></p>

<h2>Target Audience</h2>
<p>Who is this content for?</p>

<h2>Key Points</h2>
<ul>
<li>Main message</li>
<li>Supporting points</li>
<li>Unique angle</li>
</ul>

<h2>Execution Notes</h2>
<p>How to bring this idea to life:</p>
<ul>
<li>Visual elements needed</li>
<li>Props or setup required</li>
<li>Timing considerations</li>
</ul>

<h2>Success Metrics</h2>
<p>What defines success for this content?</p>

<h2>Related Ideas</h2>
<p>Variations or follow-up content ideas</p>`,
    category: 'idea',
    is_system: true,
    is_public: true,
    usage_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'meeting-template',
    name: 'Meeting Notes',
    description: 'Template for meeting documentation',
    content: `<h1>Meeting Notes</h1>

<h2>Meeting Details</h2>
<ul>
<li><strong>Date:</strong> [Date]</li>
<li><strong>Time:</strong> [Time]</li>
<li><strong>Attendees:</strong> [Names]</li>
<li><strong>Purpose:</strong> [Meeting objective]</li>
</ul>

<h2>Agenda</h2>
<ol>
<li>Topic 1</li>
<li>Topic 2</li>
<li>Topic 3</li>
</ol>

<h2>Key Discussions</h2>
<p>Summary of main points discussed</p>

<h2>Decisions Made</h2>
<ul>
<li>Decision 1</li>
<li>Decision 2</li>
</ul>

<h2>Action Items</h2>
<ul>
<li><strong>[Name]:</strong> Action item with deadline</li>
<li><strong>[Name]:</strong> Action item with deadline</li>
</ul>

<h2>Next Steps</h2>
<p>What happens next and when</p>`,
    category: 'custom',
    is_system: true,
    is_public: true,
    usage_count: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const MOCK_CATEGORIES: NoteCategory[] = [
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
    id: 'scripts',
    name: 'Scripts',
    description: 'Video scripts and dialogues',
    color: '#F59E0B',
    icon: '📝',
    sort_order: 4,
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
];

const AVAILABLE_TAGS: NoteTag[] = [
  { id: 'marketing', name: 'Marketing', color: '#3B82F6', created_at: '2024-01-01T00:00:00Z' },
  { id: 'viral', name: 'Viral', color: '#EF4444', created_at: '2024-01-01T00:00:00Z' },
  { id: 'content', name: 'Content Ideas', color: '#8B5CF6', created_at: '2024-01-01T00:00:00Z' },
  { id: 'social-media', name: 'Social Media', color: '#10B981', created_at: '2024-01-01T00:00:00Z' },
  { id: 'strategy', name: 'Strategy', color: '#F59E0B', created_at: '2024-01-01T00:00:00Z' },
  { id: 'tips', name: 'Tips', color: '#06B6D4', created_at: '2024-01-01T00:00:00Z' },
  { id: 'trends', name: 'Trends', color: '#EC4899', created_at: '2024-01-01T00:00:00Z' },
];

export const NoteEditor: React.FC<NoteEditorProps> = ({
  note,
  template,
  onSave,
  onCancel,
  readOnly = false,
  showTemplateSelector = true,
}) => {
  const [state, setState] = useState<NoteEditorState>({
    title: note?.title || '',
    content: note?.content || template?.content || '',
    category_id: note?.category_id || '',
    tags: note?.tags || [],
    template_id: template?.id,
    is_pinned: note?.is_pinned || false,
    is_public: note?.is_public || false,
    color: note?.color,
    saving: false,
    error: null,
  });

  const [showTagInput, setShowTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [availableTemplates] = useState<NoteTemplate[]>(DEFAULT_TEMPLATES);

  // Initialize with template content if provided
  useEffect(() => {
    if (template && !note) {
      setState(prev => ({
        ...prev,
        content: template.content,
        template_id: template.id,
        title: template.name === 'Blank Note' ? '' : `New ${template.name}`,
      }));
    }
  }, [template, note]);

  // Calculate word count and reading time
  const wordCount = state.content.replace(/<[^>]*>/g, '').trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  // Handle form submission
  const handleSave = useCallback(async () => {
    if (!state.title.trim()) {
      setState(prev => ({ ...prev, error: 'Title is required' }));
      return;
    }

    setState(prev => ({ ...prev, saving: true, error: null }));

    try {
      const noteData: Partial<EnhancedNote> = {
        title: state.title.trim(),
        content: state.content,
        plainTextContent: state.content.replace(/<[^>]*>/g, ''),
        category_id: state.category_id || undefined,
        tags: state.tags,
        is_pinned: state.is_pinned,
        is_public: state.is_public,
        color: state.color,
        word_count: wordCount,
        reading_time_minutes: readingTime,
        template_id: state.template_id,
        updated_at: new Date().toISOString(),
        metadata: {
          source: 'manual',
          version: (note?.metadata?.version || 0) + 1,
        },
      };

      if (!note) {
        noteData.id = `note_${Date.now()}`;
        noteData.created_at = new Date().toISOString();
      }

      await onSave(noteData);
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save note',
        saving: false,
      }));
    }
  }, [state, note, onSave, wordCount, readingTime]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template: NoteTemplate) => {
    setState(prev => ({
      ...prev,
      content: template.content,
      template_id: template.id,
      title: prev.title || (template.name === 'Blank Note' ? '' : `New ${template.name}`),
    }));
  }, []);

  // Handle tag addition
  const handleAddTag = useCallback((tag: NoteTag) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.find(t => t.id === tag.id) 
        ? prev.tags 
        : [...prev.tags, tag],
    }));
  }, []);

  // Handle tag removal
  const handleRemoveTag = useCallback((tagId: string) => {
    setState(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t.id !== tagId),
    }));
  }, []);

  // Handle new tag creation
  const handleCreateNewTag = useCallback(() => {
    if (newTagName.trim()) {
      const newTag: NoteTag = {
        id: `tag_${Date.now()}`,
        name: newTagName.trim(),
        color: '#6B7280',
        created_at: new Date().toISOString(),
      };
      handleAddTag(newTag);
      setNewTagName('');
      setShowTagInput(false);
    }
  }, [newTagName, handleAddTag]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">
            {note ? 'Edit Note' : 'New Note'}
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={onCancel}
              disabled={state.saving}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            {!readOnly && (
              <button
                onClick={handleSave}
                disabled={state.saving || !state.title.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              >
                {state.saving ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Note'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Template Selector */}
        {showTemplateSelector && !note && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start with a template
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTemplates.map(template => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                    state.template_id === template.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400 text-gray-700'
                  }`}
                >
                  {template.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Message */}
        {state.error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{state.error}</p>
          </div>
        )}
      </div>

      {/* Note Metadata */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={state.title}
              onChange={(e) => setState(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter note title..."
              readOnly={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              value={state.category_id}
              onChange={(e) => setState(prev => ({ ...prev, category_id: e.target.value }))}
              disabled={readOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="">No category</option>
              {MOCK_CATEGORIES.map(category => (
                <option key={category.id} value={category.id}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Color
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setState(prev => ({ ...prev, color: undefined }))}
                className={`w-8 h-8 rounded border-2 ${
                  !state.color ? 'border-gray-400' : 'border-gray-200'
                } bg-white hover:border-gray-500 transition-colors`}
                disabled={readOnly}
              />
              {PREDEFINED_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setState(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded border-2 ${
                    state.color === color ? 'border-gray-400' : 'border-gray-200'
                  } hover:border-gray-500 transition-colors`}
                  style={{ backgroundColor: color }}
                  disabled={readOnly}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {state.tags.map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-1 text-xs rounded-full text-white"
                  style={{ backgroundColor: tag.color }}
                >
                  {tag.name}
                  {!readOnly && (
                    <button
                      onClick={() => handleRemoveTag(tag.id)}
                      className="ml-1 hover:bg-black hover:bg-opacity-20 rounded-full p-0.5"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </span>
              ))}
            </div>
            {!readOnly && (
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.filter(tag => !state.tags.find(t => t.id === tag.id)).map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => handleAddTag(tag)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-full hover:bg-gray-50 transition-colors"
                  >
                    + {tag.name}
                  </button>
                ))}
                {showTagInput ? (
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      placeholder="New tag name"
                      className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateNewTag();
                        } else if (e.key === 'Escape') {
                          setShowTagInput(false);
                          setNewTagName('');
                        }
                      }}
                      autoFocus
                    />
                    <button
                      onClick={handleCreateNewTag}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowTagInput(false);
                        setNewTagName('');
                      }}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="px-2 py-1 text-xs border border-dashed border-gray-400 rounded-full text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    + New tag
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Options */}
          <div className="md:col-span-2 flex items-center space-x-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.is_pinned}
                onChange={(e) => setState(prev => ({ ...prev, is_pinned: e.target.checked }))}
                disabled={readOnly}
                className="mr-2 rounded"
              />
              <span className="text-sm text-gray-700">Pin this note</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={state.is_public}
                onChange={(e) => setState(prev => ({ ...prev, is_public: e.target.checked }))}
                disabled={readOnly}
                className="mr-2 rounded"
              />
              <span className="text-sm text-gray-700">Make public</span>
            </label>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <RichTextEditor
          content={state.content}
          onChange={(content) => setState(prev => ({ ...prev, content }))}
          readOnly={readOnly}
          showWordCount={true}
          enableMarkdownShortcuts={true}
          placeholder="Start writing your note..."
        />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex justify-between items-center text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          <span>{wordCount} words</span>
          <span>{readingTime} min read</span>
          {note && (
            <>
              <span>Created {new Date(note.created_at).toLocaleDateString()}</span>
              <span>Modified {new Date(state.saving ? new Date().toISOString() : note.updated_at).toLocaleDateString()}</span>
            </>
          )}
        </div>
        <div>
          {state.saving && <span className="text-blue-600">Saving...</span>}
        </div>
      </div>
    </div>
  );
};