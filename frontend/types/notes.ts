// Enhanced Notes System Types and Interfaces

export interface BaseNote {
  id: string;
  title: string;
  content: string; // Rich-text HTML content
  plainTextContent?: string; // For search and preview
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface EnhancedNote extends BaseNote {
  category_id?: string;
  tags: NoteTag[];
  template_id?: string;
  parent_note_id?: string; // For hierarchical organization
  linked_chat_message_id?: string;
  linked_gallery_item_id?: string;
  is_pinned: boolean;
  is_archived: boolean;
  is_public: boolean;
  word_count: number;
  reading_time_minutes: number;
  color?: string; // For visual organization
  attachments?: NoteAttachment[];
  related_notes?: string[]; // Array of note IDs
  metadata?: NoteMetadata;
}

export interface NoteCategory {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  parent_category_id?: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface NoteTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
  user_id?: string;
}

export interface NoteTemplate {
  id: string;
  name: string;
  description?: string;
  content: string; // Rich-text HTML template
  category: 'script' | 'idea' | 'research' | 'tip' | 'project' | 'meeting' | 'custom';
  is_system: boolean; // System templates vs user templates
  is_public: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
  user_id?: string;
}

export interface NoteAttachment {
  id: string;
  note_id: string;
  filename: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
}

export interface NoteMetadata {
  source?: 'manual' | 'auto-generated' | 'imported';
  import_source?: string;
  original_format?: 'markdown' | 'plain-text' | 'html' | 'pdf';
  ai_generated?: boolean;
  version: number;
  last_ai_summary?: string;
  keywords?: string[];
}

export interface NoteLink {
  id: string;
  source_note_id: string;
  target_note_id: string;
  link_type: 'reference' | 'related' | 'parent-child' | 'sequence';
  description?: string;
  created_at: string;
}

export interface ChatMessageNoteLink {
  id: string;
  note_id: string;
  chat_message_id: string;
  session_id: string;
  link_context?: string;
  created_at: string;
}

export interface GalleryItemNoteLink {
  id: string;
  note_id: string;
  gallery_item_id: string;
  link_context?: string;
  created_at: string;
}

// Search and Filter Types
export interface NoteSearchFilters {
  query?: string;
  category_ids?: string[];
  tag_ids?: string[];
  date_range?: {
    start: string;
    end: string;
  };
  content_type?: 'all' | 'manual' | 'auto-generated' | 'imported';
  is_pinned?: boolean;
  is_archived?: boolean;
  has_attachments?: boolean;
  word_count_range?: {
    min: number;
    max: number;
  };
}

export interface NoteSearchResult {
  note: EnhancedNote;
  relevance_score: number;
  highlighted_content?: string;
  matched_fields: string[];
}

export interface NoteSortOptions {
  field: 'title' | 'created_at' | 'updated_at' | 'word_count' | 'reading_time' | 'relevance';
  direction: 'asc' | 'desc';
}

// Display and UI Types
export type NoteViewMode = 'card' | 'list' | 'compact' | 'detailed';

export interface NoteDisplayOptions {
  view_mode: NoteViewMode;
  show_preview: boolean;
  show_metadata: boolean;
  show_tags: boolean;
  show_category: boolean;
  cards_per_row: number;
  preview_length: number;
}

// Editor Types
export interface EditorFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  highlight: boolean;
  code: boolean;
  link: boolean;
}

export interface EditorBlock {
  type: 'paragraph' | 'heading1' | 'heading2' | 'heading3' | 'bulletList' | 'orderedList' | 'codeBlock' | 'blockquote';
  content?: string;
  level?: number; // for headings
  language?: string; // for code blocks
}

// Import/Export Types
export interface ImportOptions {
  format: 'markdown' | 'html' | 'plain-text' | 'json';
  preserve_formatting: boolean;
  auto_categorize: boolean;
  auto_tag: boolean;
  default_category_id?: string;
}

export interface ExportOptions {
  format: 'markdown' | 'html' | 'pdf' | 'plain-text' | 'json';
  include_metadata: boolean;
  include_attachments: boolean;
  template?: 'default' | 'professional' | 'minimal';
}

export interface BulkOperation {
  operation: 'move' | 'tag' | 'delete' | 'archive' | 'categorize';
  note_ids: string[];
  parameters?: {
    category_id?: string;
    tag_ids?: string[];
    archive?: boolean;
  };
}

// Collaboration Types
export interface NoteShare {
  id: string;
  note_id: string;
  shared_by_user_id: string;
  shared_with_user_id?: string;
  share_link?: string;
  permissions: 'read' | 'comment' | 'edit';
  expires_at?: string;
  created_at: string;
}

export interface NoteComment {
  id: string;
  note_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  is_resolved: boolean;
}

// State Management Types
export interface NotesState {
  notes: EnhancedNote[];
  categories: NoteCategory[];
  tags: NoteTag[];
  templates: NoteTemplate[];
  current_note: EnhancedNote | null;
  search_results: NoteSearchResult[];
  filters: NoteSearchFilters;
  sort_options: NoteSortOptions;
  display_options: NoteDisplayOptions;
  loading: boolean;
  error: string | null;
}

// API Response Types
export interface NotesResponse {
  notes: EnhancedNote[];
  total_count: number;
  page: number;
  page_size: number;
  has_next: boolean;
}

export interface CategoriesResponse {
  categories: NoteCategory[];
  total_count: number;
}

export interface TagsResponse {
  tags: NoteTag[];
  total_count: number;
}

// Legacy compatibility (for gradual migration)
export interface LegacyNote {
  id: number;
  title: string;
  content: string;
  created_at: string;
}

// Utility types for component props
export interface NotesManagerProps {
  initialFilters?: NoteSearchFilters;
  initialViewMode?: NoteViewMode;
  showCategories?: boolean;
  showTags?: boolean;
  allowBulkOperations?: boolean;
  maxNotesPerPage?: number;
}

export interface NoteEditorProps {
  note?: EnhancedNote;
  template?: NoteTemplate;
  onSave: (note: Partial<EnhancedNote>) => Promise<void>;
  onCancel: () => void;
  readOnly?: boolean;
  showTemplateSelector?: boolean;
}

export interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  minHeight?: number;
  maxHeight?: number;
  showWordCount?: boolean;
  enableMarkdownShortcuts?: boolean;
}