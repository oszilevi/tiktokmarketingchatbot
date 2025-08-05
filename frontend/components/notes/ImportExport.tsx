'use client';

import React, { useState, useCallback } from 'react';
import {
  EnhancedNote,
  ImportOptions,
  ExportOptions,
  NoteCategory,
  NoteTag,
} from '@/types/notes';

interface ImportExportProps {
  notes?: EnhancedNote[];
  categories: NoteCategory[];
  onImport?: (notes: Partial<EnhancedNote>[]) => Promise<void>;
  onExport?: (notes: EnhancedNote[], options: ExportOptions) => Promise<void>;
}

interface ImportState {
  showImportModal: boolean;
  importFile: File | null;
  importOptions: ImportOptions;
  importing: boolean;
  importError: string | null;
  previewNotes: Partial<EnhancedNote>[];
}

interface ExportState {
  showExportModal: boolean;
  exportOptions: ExportOptions;
  exporting: boolean;
  exportError: string | null;
}

// Utility functions for import/export
export class NotesImportExport {
  // Convert HTML to Markdown
  static htmlToMarkdown(html: string): string {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
      .replace(/<u[^>]*>(.*?)<\/u>/gi, '_$1_')
      .replace(/<del[^>]*>(.*?)<\/del>/gi, '~~$1~~')
      .replace(/<mark[^>]*>(.*?)<\/mark>/gi, '==$1==')
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, '```\n$1\n```\n\n')
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
      .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, content) => {
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n') + '\n';
      })
      .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, content) => {
        let counter = 1;
        return content.replace(/<li[^>]*>(.*?)<\/li>/gi, () => `${counter++}. $1\n`) + '\n';
      })
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<[^>]*>/g, '') // Remove any remaining HTML tags
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
  }

  // Convert Markdown to HTML
  static markdownToHtml(markdown: string): string {
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<u>$1</u>')
      .replace(/~~(.*?)~~/g, '<del>$1</del>')
      .replace(/==(.*?)==/g, '<mark>$1</mark>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/```\n([\s\S]*?)\n```/g, '<pre><code>$1</code></pre>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/^\- (.*$)/gim, '<li>$1</li>')
      .replace(/^(\d+)\. (.*$)/gim, '<li>$1. $2</li>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\n/g, '<br>')
      .replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>')
      .replace(/(<li>\d+\..*<\/li>)/g, '<ol>$1</ol>');
  }

  // Parse imported file
  static async parseImportFile(file: File, options: ImportOptions): Promise<Partial<EnhancedNote>[]> {
    const content = await file.text();
    const notes: Partial<EnhancedNote>[] = [];

    switch (options.format) {
      case 'markdown':
        return this.parseMarkdownFile(content, options);
      case 'json':
        return this.parseJsonFile(content, options);
      case 'plain-text':
        return this.parsePlainTextFile(content, options);
      case 'html':
        return this.parseHtmlFile(content, options);
      default:
        throw new Error(`Unsupported import format: ${options.format}`);
    }
  }

  private static parseMarkdownFile(content: string, options: ImportOptions): Partial<EnhancedNote>[] {
    // Split by main headings to create separate notes
    const sections = content.split(/^# /m).filter(section => section.trim());
    
    return sections.map((section, index) => {
      const lines = section.split('\n');
      const title = lines[0]?.trim() || `Imported Note ${index + 1}`;
      const noteContent = lines.slice(1).join('\n').trim();
      
      return {
        id: `imported_${Date.now()}_${index}`,
        title,
        content: options.preserve_formatting ? this.markdownToHtml(noteContent) : noteContent,
        plainTextContent: noteContent.replace(/[*#`~_\[\]()]/g, ''),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category_id: options.default_category_id,
        tags: options.auto_tag ? this.extractTags(noteContent) : [],
        is_pinned: false,
        is_archived: false,
        is_public: false,
        word_count: noteContent.split(/\s+/).length,
        reading_time_minutes: Math.ceil(noteContent.split(/\s+/).length / 200),
        metadata: {
          source: 'imported',
          import_source: 'markdown',
          original_format: 'markdown',
          version: 1,
        },
      };
    });
  }

  private static parseJsonFile(content: string, options: ImportOptions): Partial<EnhancedNote>[] {
    try {
      const data = JSON.parse(content);
      const notes = Array.isArray(data) ? data : [data];
      
      return notes.map((note, index) => ({
        ...note,
        id: note.id || `imported_${Date.now()}_${index}`,
        created_at: note.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        category_id: note.category_id || options.default_category_id,
        metadata: {
          ...note.metadata,
          source: 'imported',
          import_source: 'json',
          version: (note.metadata?.version || 0) + 1,
        },
      }));
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
  }

  private static parsePlainTextFile(content: string, options: ImportOptions): Partial<EnhancedNote>[] {
    // Create a single note from plain text
    const title = content.split('\n')[0]?.substring(0, 50) || 'Imported Text Note';
    
    return [{
      id: `imported_${Date.now()}`,
      title: title.length < 50 ? title : title + '...',
      content: content,
      plainTextContent: content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category_id: options.default_category_id,
      tags: options.auto_tag ? this.extractTags(content) : [],
      is_pinned: false,
      is_archived: false,
      is_public: false,
      word_count: content.split(/\s+/).length,
      reading_time_minutes: Math.ceil(content.split(/\s+/).length / 200),
      metadata: {
        source: 'imported',
        import_source: 'plain-text',
        original_format: 'plain-text',
        version: 1,
      },
    }];
  }

  private static parseHtmlFile(content: string, options: ImportOptions): Partial<EnhancedNote>[] {
    const title = content.match(/<title>(.*?)<\/title>/i)?.[1] || 'Imported HTML Note';
    const bodyContent = content.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || content;
    
    return [{
      id: `imported_${Date.now()}`,
      title,
      content: options.preserve_formatting ? bodyContent : this.htmlToMarkdown(bodyContent),
      plainTextContent: bodyContent.replace(/<[^>]*>/g, ''),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      category_id: options.default_category_id,
      tags: options.auto_tag ? this.extractTags(bodyContent) : [],
      is_pinned: false,
      is_archived: false,
      is_public: false,
      word_count: bodyContent.replace(/<[^>]*>/g, '').split(/\s+/).length,
      reading_time_minutes: Math.ceil(bodyContent.replace(/<[^>]*>/g, '').split(/\s+/).length / 200),
      metadata: {
        source: 'imported',
        import_source: 'html',
        original_format: 'html',
        version: 1,
      },
    }];
  }

  private static extractTags(content: string): NoteTag[] {
    const keywords = ['marketing', 'strategy', 'ideas', 'tips', 'viral', 'content', 'social', 'tiktok'];
    const foundTags: NoteTag[] = [];
    
    keywords.forEach(keyword => {
      if (content.toLowerCase().includes(keyword)) {
        foundTags.push({
          id: keyword,
          name: keyword.charAt(0).toUpperCase() + keyword.slice(1),
          color: '#6B7280',
          created_at: new Date().toISOString(),
        });
      }
    });
    
    return foundTags.slice(0, 3); // Limit to 3 auto-tags
  }

  // Export notes to various formats
  static async exportNotes(notes: EnhancedNote[], options: ExportOptions): Promise<void> {
    switch (options.format) {
      case 'markdown':
        return this.exportToMarkdown(notes, options);
      case 'json':
        return this.exportToJson(notes, options);
      case 'html':
        return this.exportToHtml(notes, options);
      case 'plain-text':
        return this.exportToPlainText(notes, options);
      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  private static exportToMarkdown(notes: EnhancedNote[], options: ExportOptions): void {
    let content = '# Exported Notes\n\n';
    
    if (options.include_metadata) {
      content += `*Exported on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}*\n\n`;
      content += `*Total notes: ${notes.length}*\n\n---\n\n`;
    }
    
    notes.forEach((note, index) => {
      content += `# ${note.title}\n\n`;
      
      if (options.include_metadata) {
        content += `**Created:** ${new Date(note.created_at).toLocaleDateString()}\n`;
        content += `**Updated:** ${new Date(note.updated_at).toLocaleDateString()}\n`;
        content += `**Word Count:** ${note.word_count}\n`;
        if (note.tags.length > 0) {
          content += `**Tags:** ${note.tags.map(tag => tag.name).join(', ')}\n`;
        }
        content += '\n';
      }
      
      content += this.htmlToMarkdown(note.content) + '\n\n';
      
      if (index < notes.length - 1) {
        content += '---\n\n';
      }
    });
    
    this.downloadFile(content, 'notes-export.md', 'text/markdown');
  }

  private static exportToJson(notes: EnhancedNote[], options: ExportOptions): void {
    const exportData = {
      exported_at: new Date().toISOString(),
      total_notes: notes.length,
      notes: options.include_metadata ? notes : notes.map(note => ({
        id: note.id,
        title: note.title,
        content: note.content,
        created_at: note.created_at,
        updated_at: note.updated_at,
        tags: note.tags,
      })),
    };
    
    const content = JSON.stringify(exportData, null, 2);
    this.downloadFile(content, 'notes-export.json', 'application/json');
  }

  private static exportToHtml(notes: EnhancedNote[], options: ExportOptions): void {
    let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Exported Notes</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .note { margin-bottom: 40px; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .note-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .note-meta { font-size: 14px; color: #6b7280; margin-bottom: 15px; }
        .note-content { line-height: 1.6; }
        .tag { display: inline-block; padding: 2px 8px; background: #f3f4f6; border-radius: 12px; font-size: 12px; margin-right: 5px; }
        h1, h2, h3 { color: #111827; }
        code { background: #f3f4f6; padding: 2px 4px; border-radius: 4px; }
        pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; }
    </style>
</head>
<body>
    <h1>Exported Notes</h1>
`;
    
    if (options.include_metadata) {
      html += `<p><em>Exported on ${new Date().toLocaleString()}</em></p>`;
      html += `<p><em>Total notes: ${notes.length}</em></p>`;
    }
    
    notes.forEach(note => {
      html += `<div class="note">`;
      html += `<div class="note-title">${note.title}</div>`;
      
      if (options.include_metadata) {
        html += `<div class="note-meta">`;
        html += `Created: ${new Date(note.created_at).toLocaleDateString()} | `;
        html += `Updated: ${new Date(note.updated_at).toLocaleDateString()} | `;
        html += `${note.word_count} words`;
        if (note.tags.length > 0) {
          html += ` | Tags: ${note.tags.map(tag => `<span class="tag">${tag.name}</span>`).join('')}`;
        }
        html += `</div>`;
      }
      
      html += `<div class="note-content">${note.content}</div>`;
      html += `</div>`;
    });
    
    html += `</body></html>`;
    
    this.downloadFile(html, 'notes-export.html', 'text/html');
  }

  private static exportToPlainText(notes: EnhancedNote[], options: ExportOptions): void {
    let content = 'EXPORTED NOTES\n' + '='.repeat(50) + '\n\n';
    
    if (options.include_metadata) {
      content += `Exported on: ${new Date().toLocaleString()}\n`;
      content += `Total notes: ${notes.length}\n\n`;
      content += '-'.repeat(50) + '\n\n';
    }
    
    notes.forEach((note, index) => {
      content += `${note.title.toUpperCase()}\n`;
      content += '='.repeat(note.title.length) + '\n\n';
      
      if (options.include_metadata) {
        content += `Created: ${new Date(note.created_at).toLocaleDateString()}\n`;
        content += `Updated: ${new Date(note.updated_at).toLocaleDateString()}\n`;
        content += `Word Count: ${note.word_count}\n`;
        if (note.tags.length > 0) {
          content += `Tags: ${note.tags.map(tag => tag.name).join(', ')}\n`;
        }
        content += '\n';
      }
      
      content += note.plainTextContent || note.content.replace(/<[^>]*>/g, '') + '\n\n';
      
      if (index < notes.length - 1) {
        content += '-'.repeat(50) + '\n\n';
      }
    });
    
    this.downloadFile(content, 'notes-export.txt', 'text/plain');
  }

  private static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const ImportExport: React.FC<ImportExportProps> = ({
  notes = [],
  categories,
  onImport,
  onExport,
}) => {
  const [importState, setImportState] = useState<ImportState>({
    showImportModal: false,
    importFile: null,
    importOptions: {
      format: 'markdown',
      preserve_formatting: true,
      auto_categorize: true,
      auto_tag: true,
    },
    importing: false,
    importError: null,
    previewNotes: [],
  });

  const [exportState, setExportState] = useState<ExportState>({
    showExportModal: false,
    exportOptions: {
      format: 'markdown',
      include_metadata: true,
      include_attachments: false,
      template: 'default',
    },
    exporting: false,
    exportError: null,
  });

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportState(prev => ({
      ...prev,
      importFile: file,
      importError: null,
      previewNotes: [],
    }));

    try {
      const previewNotes = await NotesImportExport.parseImportFile(file, importState.importOptions);
      setImportState(prev => ({
        ...prev,
        previewNotes: previewNotes.slice(0, 3), // Show only first 3 for preview
      }));
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        importError: error instanceof Error ? error.message : 'Failed to parse file',
      }));
    }
  }, [importState.importOptions]);

  const handleImport = useCallback(async () => {
    if (!importState.importFile || !onImport) return;

    setImportState(prev => ({ ...prev, importing: true, importError: null }));

    try {
      const parsedNotes = await NotesImportExport.parseImportFile(
        importState.importFile,
        importState.importOptions
      );
      await onImport(parsedNotes);
      setImportState(prev => ({
        ...prev,
        showImportModal: false,
        importFile: null,
        previewNotes: [],
        importing: false,
      }));
    } catch (error) {
      setImportState(prev => ({
        ...prev,
        importError: error instanceof Error ? error.message : 'Import failed',
        importing: false,
      }));
    }
  }, [importState.importFile, importState.importOptions, onImport]);

  const handleExport = useCallback(async () => {
    if (notes.length === 0) return;

    setExportState(prev => ({ ...prev, exporting: true, exportError: null }));

    try {
      if (onExport) {
        await onExport(notes, exportState.exportOptions);
      } else {
        await NotesImportExport.exportNotes(notes, exportState.exportOptions);
      }
      setExportState(prev => ({
        ...prev,
        showExportModal: false,
        exporting: false,
      }));
    } catch (error) {
      setExportState(prev => ({
        ...prev,
        exportError: error instanceof Error ? error.message : 'Export failed',
        exporting: false,
      }));
    }
  }, [notes, exportState.exportOptions, onExport]);

  return (
    <div className="flex space-x-2">
      {/* Import Button */}
      {onImport && (
        <button
          onClick={() => setImportState(prev => ({ ...prev, showImportModal: true }))}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
          </svg>
          Import
        </button>
      )}

      {/* Export Button */}
      <button
        onClick={() => setExportState(prev => ({ ...prev, showExportModal: true }))}
        disabled={notes.length === 0}
        className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        Export ({notes.length})
      </button>

      {/* Import Modal */}
      {importState.showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Import Notes</h3>
              <button
                onClick={() => setImportState(prev => ({ ...prev, showImportModal: false }))}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Import Options */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={importState.importOptions.format}
                  onChange={(e) => setImportState(prev => ({
                    ...prev,
                    importOptions: { ...prev.importOptions, format: e.target.value as any }
                  }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="markdown">Markdown</option>
                  <option value="json">JSON</option>
                  <option value="html">HTML</option>
                  <option value="plain-text">Plain Text</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Default Category</label>
                <select
                  value={importState.importOptions.default_category_id || ''}
                  onChange={(e) => setImportState(prev => ({
                    ...prev,
                    importOptions: { ...prev.importOptions, default_category_id: e.target.value || undefined }
                  }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.icon} {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Import Options Checkboxes */}
            <div className="flex flex-wrap gap-4 mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={importState.importOptions.preserve_formatting}
                  onChange={(e) => setImportState(prev => ({
                    ...prev,
                    importOptions: { ...prev.importOptions, preserve_formatting: e.target.checked }
                  }))}
                  className="mr-2 rounded"
                />
                <span className="text-sm">Preserve formatting</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={importState.importOptions.auto_tag}
                  onChange={(e) => setImportState(prev => ({
                    ...prev,
                    importOptions: { ...prev.importOptions, auto_tag: e.target.checked }
                  }))}
                  className="mr-2 rounded"
                />
                <span className="text-sm">Auto-tag</span>
              </label>
            </div>

            {/* File Upload */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select File</label>
              <input
                type="file"
                accept=".md,.json,.html,.txt"
                onChange={handleFileSelect}
                className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Error Message */}
            {importState.importError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm text-red-600">{importState.importError}</p>
              </div>
            )}

            {/* Preview */}
            {importState.previewNotes.length > 0 && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Preview (first 3 notes):</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {importState.previewNotes.map((note, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded border">
                      <div className="font-medium text-sm">{note.title}</div>
                      <div className="text-xs text-gray-600">
                        {note.word_count} words • {note.tags?.length || 0} tags
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setImportState(prev => ({ ...prev, showImportModal: false }))}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importState.importFile || importState.importing}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {importState.importing ? 'Importing...' : 'Import Notes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {exportState.showExportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Export Notes</h3>
              <button
                onClick={() => setExportState(prev => ({ ...prev, showExportModal: false }))}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                <select
                  value={exportState.exportOptions.format}
                  onChange={(e) => setExportState(prev => ({
                    ...prev,
                    exportOptions: { ...prev.exportOptions, format: e.target.value as any }
                  }))}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="markdown">Markdown (.md)</option>
                  <option value="json">JSON (.json)</option>
                  <option value="html">HTML (.html)</option>
                  <option value="plain-text">Plain Text (.txt)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={exportState.exportOptions.include_metadata}
                    onChange={(e) => setExportState(prev => ({
                      ...prev,
                      exportOptions: { ...prev.exportOptions, include_metadata: e.target.checked }
                    }))}
                    className="mr-2 rounded"
                  />
                  <span className="text-sm">Include metadata (dates, tags, etc.)</span>
                </label>
              </div>

              {/* Error Message */}
              {exportState.exportError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-600">{exportState.exportError}</p>
                </div>
              )}

              <div className="text-sm text-gray-600">
                {notes.length} notes will be exported
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setExportState(prev => ({ ...prev, showExportModal: false }))}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                disabled={exportState.exporting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {exportState.exporting ? 'Exporting...' : 'Export'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};