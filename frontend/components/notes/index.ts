// Enhanced Notes System Components
export { RichTextEditor } from './RichTextEditor';
export { NotesManager } from './NotesManager';
export { NoteEditor } from './NoteEditor';
export { NotesDisplay } from './NotesDisplay';
export { ImportExport, NotesImportExport } from './ImportExport';
export { NoteLinking } from './NoteLinking';
export { Collaboration } from './Collaboration';

// Re-export types for convenience
export type {
  EnhancedNote,
  NoteCategory,
  NoteTag,
  NoteTemplate,
  NoteSearchFilters,
  NoteSortOptions,
  NoteViewMode,
  NoteDisplayOptions,
  RichTextEditorProps,
  NotesManagerProps,
  NoteEditorProps,
  ImportOptions,
  ExportOptions,
  BulkOperation,
} from '@/types/notes';