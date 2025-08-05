'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RichTextEditorProps, EditorFormat } from '@/types/notes';

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing your note...',
  readOnly = false,
  minHeight = 200,
  maxHeight = 600,
  showWordCount = true,
  enableMarkdownShortcuts = true,
}) => {
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [format, setFormat] = useState<EditorFormat>({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    highlight: false,
    code: false,
    link: false,
  });
  const [wordCount, setWordCount] = useState(0);
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Calculate word count
  useEffect(() => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    const words = text ? text.split(/\s+/).length : 0;
    setWordCount(words);
  }, [content]);

  // Handle text formatting
  const applyFormat = useCallback((formatType: keyof EditorFormat, value?: string) => {
    if (readOnly) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const beforeText = content.substring(0, start);
    const afterText = content.substring(end);

    let newText = '';
    let newContent = '';

    switch (formatType) {
      case 'bold':
        newText = selectedText ? `**${selectedText}**` : '**bold text**';
        break;
      case 'italic':
        newText = selectedText ? `*${selectedText}*` : '*italic text*';
        break;
      case 'underline':
        newText = selectedText ? `<u>${selectedText}</u>` : '<u>underlined text</u>';
        break;
      case 'strikethrough':
        newText = selectedText ? `~~${selectedText}~~` : '~~strikethrough text~~';
        break;
      case 'highlight':
        newText = selectedText ? `<mark>${selectedText}</mark>` : '<mark>highlighted text</mark>';
        break;
      case 'code':
        newText = selectedText ? `\`${selectedText}\`` : '`code`';
        break;
      case 'link':
        if (value) {
          newText = selectedText ? `[${selectedText}](${value})` : `[link text](${value})`;
          setShowLinkDialog(false);
          setLinkUrl('');
        } else {
          setShowLinkDialog(true);
          return;
        }
        break;
    }

    newContent = beforeText + newText + afterText;
    onChange(newContent);

    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      const newStart = start;
      const newEnd = start + newText.length;
      textarea.setSelectionRange(newStart, newEnd);
    }, 0);
  }, [content, onChange, readOnly]);

  // Insert block elements
  const insertBlock = useCallback((blockType: string) => {
    if (readOnly) return;

    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeText = content.substring(0, start);
    const afterText = content.substring(start);

    let insertText = '';
    const lineStart = beforeText.lastIndexOf('\n') + 1;
    const isStartOfLine = start === lineStart;

    switch (blockType) {
      case 'heading1':
        insertText = isStartOfLine ? '# Heading 1\n' : '\n# Heading 1\n';
        break;
      case 'heading2':
        insertText = isStartOfLine ? '## Heading 2\n' : '\n## Heading 2\n';
        break;
      case 'heading3':
        insertText = isStartOfLine ? '### Heading 3\n' : '\n### Heading 3\n';
        break;
      case 'bulletList':
        insertText = isStartOfLine ? '- List item\n' : '\n- List item\n';
        break;
      case 'orderedList':
        insertText = isStartOfLine ? '1. List item\n' : '\n1. List item\n';
        break;
      case 'codeBlock':
        insertText = isStartOfLine ? '```\ncode here\n```\n' : '\n```\ncode here\n```\n';
        break;
      case 'blockquote':
        insertText = isStartOfLine ? '> Quote\n' : '\n> Quote\n';
        break;
    }

    const newContent = beforeText + insertText + afterText;
    onChange(newContent);

    // Restore focus
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + insertText.length, start + insertText.length);
    }, 0);
  }, [content, onChange, readOnly]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (readOnly) return;

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

    if (cmdOrCtrl) {
      switch (e.key) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'u':
          e.preventDefault();
          applyFormat('underline');
          break;
        case 'k':
          e.preventDefault();
          applyFormat('link');
          break;
        case '`':
          e.preventDefault();
          applyFormat('code');
          break;
      }
    }
  }, [applyFormat, readOnly]);

  // Handle markdown shortcuts
  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    const newContent = e.currentTarget.value;
    onChange(newContent);

    if (!enableMarkdownShortcuts) return;

    // Auto-convert markdown shortcuts
    const textarea = e.currentTarget;
    const cursorPos = textarea.selectionStart;
    const lineStart = newContent.lastIndexOf('\n', cursorPos - 1) + 1;
    const lineText = newContent.substring(lineStart, cursorPos);

    // Check for space after markdown syntax
    if (e.nativeEvent instanceof InputEvent && e.nativeEvent.data === ' ') {
      let replacement = '';
      let shouldReplace = false;

      if (lineText === '- ') {
        replacement = '• ';
        shouldReplace = true;
      } else if (/^\d+\. $/.test(lineText)) {
        // Keep numbered lists as is
        return;
      } else if (lineText === '> ') {
        // Keep blockquotes as is
        return;
      }

      if (shouldReplace) {
        const beforeLine = newContent.substring(0, lineStart);
        const afterCursor = newContent.substring(cursorPos);
        const newText = beforeLine + replacement + afterCursor;
        onChange(newText);
        
        setTimeout(() => {
          textarea.setSelectionRange(lineStart + replacement.length, lineStart + replacement.length);
        }, 0);
      }
    }
  }, [onChange, enableMarkdownShortcuts]);

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      {!readOnly && (
        <div className="border-b border-gray-200 p-2 bg-gray-50">
          <div className="flex flex-wrap gap-1">
            {/* Text Formatting */}
            <div className="flex border-r border-gray-300 pr-2 mr-2">
              <button
                type="button"
                onClick={() => applyFormat('bold')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Bold (Ctrl+B)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h8a4 4 0 0 1 4 4 3.5 3.5 0 0 1-1.9 3.1A4 4 0 0 1 18 15.5a4.5 4.5 0 0 1-4.5 4.5H6V4zm7 6.5a1.5 1.5 0 1 0 0-3H9v3h4zm.5 6.5a2 2 0 1 0 0-4H9v4h4.5z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => applyFormat('italic')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Italic (Ctrl+I)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4h-8z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => applyFormat('underline')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Underline (Ctrl+U)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 17c3.31 0 6-2.69 6-6V3h-2.5v8c0 1.93-1.57 3.5-3.5 3.5S8.5 12.93 8.5 11V3H6v8c0 3.31 2.69 6 6 6zm-7 2v2h14v-2H5z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => applyFormat('strikethrough')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Strikethrough"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 14h18v-2H3v2zm5-4h8v3h2V7.5C16 6.12 14.88 5 13.5 5h-3C9.12 5 8 6.12 8 7.5V10zm2-2.5c0-.28.22-.5.5-.5h3c.28 0 .5.22.5.5V8h-4V7.5z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => applyFormat('highlight')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Highlight"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 14l3 3-3 3h12v-2H8.41l1.59-1.59L8.41 15H18v-2H6v1zm2.41-5L10 7.41 13.59 11 17 7.59 15.59 6.17 12 9.76 8.41 6.17 7 7.59l2.41 2.41z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => applyFormat('code')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Inline Code"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => applyFormat('link')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Insert Link (Ctrl+K)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H6.9C4.29 7 2.4 8.89 2.4 11.5S4.29 16 6.9 16h4v-1.9H6.9c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9.1-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.61 0 4.5-1.89 4.5-4.5S19.71 7 17.1 7z"/>
                </svg>
              </button>
            </div>

            {/* Block Formatting */}
            <div className="flex border-r border-gray-300 pr-2 mr-2">
              <button
                type="button"
                onClick={() => insertBlock('heading1')}
                className="p-2 hover:bg-gray-200 rounded transition-colors text-sm font-bold"
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => insertBlock('heading2')}
                className="p-2 hover:bg-gray-200 rounded transition-colors text-sm font-bold"
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertBlock('heading3')}
                className="p-2 hover:bg-gray-200 rounded transition-colors text-sm font-bold"
                title="Heading 3"
              >
                H3
              </button>
            </div>

            {/* Lists and Blocks */}
            <div className="flex">
              <button
                type="button"
                onClick={() => insertBlock('bulletList')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Bullet List"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => insertBlock('orderedList')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Numbered List"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => insertBlock('codeBlock')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Code Block"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 6H6v2h2V6zm0 4H6v2h2v-2zm0 4H6v2h2v-2zm6-8h-2v2h2V6zm0 4h-2v2h2v-2zm0 4h-2v2h2v-2zm4-8v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h12c1.1 0 2 .9 2 2z"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={() => insertBlock('blockquote')}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Quote"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 17h3l2-4V7H5v6h3l-2 4zm8 0h3l2-4V7h-6v6h3l-2 4z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          readOnly={readOnly}
          className="w-full p-4 border-none resize-none focus:outline-none font-mono text-sm leading-relaxed"
          style={{
            minHeight: minHeight,
            maxHeight: maxHeight,
          }}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 px-4 py-2 bg-gray-50 flex justify-between items-center text-sm text-gray-600">
        <div className="flex items-center space-x-4">
          {showWordCount && (
            <span>{wordCount} words</span>
          )}
          <span>{Math.ceil(wordCount / 200)} min read</span>
        </div>
        <div className="text-xs text-gray-500">
          Markdown supported
        </div>
      </div>

      {/* Link Dialog */}
      {showLinkDialog && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80">
            <h3 className="text-lg font-semibold mb-4">Insert Link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  applyFormat('link', linkUrl);
                } else if (e.key === 'Escape') {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                }
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => {
                  setShowLinkDialog(false);
                  setLinkUrl('');
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applyFormat('link', linkUrl)}
                disabled={!linkUrl}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};