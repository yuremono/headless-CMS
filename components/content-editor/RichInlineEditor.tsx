'use client';

import { useEffect, useRef } from 'react';
import { adminFieldControl, adminFormatBtn, adminFormatBtnActive } from '@/components/admin-layout/admin-ui-classes';

interface RichInlineEditorProps {
  value: string;
  onChange: (html: string) => void;
  readOnly?: boolean;
  ariaLabel?: string;
}

/**
 * 軽量なインライン専用リッチテキストエディタ（contentEditable）。
 *
 * 編集者が front 開発者なしでタイトル等の一部だけ装飾できるようにするのが目的。
 * - 太字: <strong> / 斜体: <em> / アクセント: <span class="accent"> / 改行: <br>
 * - 段落（<p><div>）は作らず、インライン要素のみを生成する。
 * - 出力 HTML は保存時にサーバ側 sanitize-html で許可タグのみへ正規化される。
 */
function wrapSelection(tagName: string, className?: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return;
  }

  const range = selection.getRangeAt(0);
  const wrapper = document.createElement(tagName);
  if (className) {
    wrapper.className = className;
  }

  try {
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
    selection.removeAllRanges();
  } catch {
    // 複数ブロックをまたぐ選択など surroundContents 不可のケースは無視する。
  }
}

export function RichInlineEditor({ value, onChange, readOnly = false, ariaLabel }: RichInlineEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  // 外部 value とのズレを防ぐため、フォーカスが無いときのみ DOM を同期する。
  useEffect(() => {
    const node = editorRef.current;
    if (node && document.activeElement !== node && node.innerHTML !== value) {
      node.innerHTML = value ?? '';
    }
  }, [value]);

  function emitChange() {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }

  function applyTag(tagName: string, className?: string) {
    if (readOnly) {
      return;
    }
    wrapSelection(tagName, className);
    emitChange();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter') {
      // 段落 <div> 生成を避け、<br> を挿入する。
      event.preventDefault();
      document.execCommand('insertHTML', false, '<br>');
      emitChange();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    // 装飾を持ち込まないようプレーンテキストとして貼り付ける。
    event.preventDefault();
    const text = event.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    emitChange();
  }

  return (
    <div data-l="RichEditor" className="RichInlineEditor mt-2 block">
      {!readOnly ? (
        <div
          data-l="EditorToolbar"
          className="mb-2 flex flex-wrap gap-2"
          role="toolbar"
          aria-label="書式"
        >
          <button
            type="button"
            className={adminFormatBtn}
            onClick={() => applyTag('strong')}
          >
            太字
          </button>
          <button
            type="button"
            className={`${adminFormatBtn} italic`}
            onClick={() => applyTag('em')}
          >
            斜体
          </button>
          <button
            type="button"
            className={adminFormatBtnActive}
            onClick={() => applyTag('span', 'accent')}
          >
            アクセント
          </button>
        </div>
      ) : null}
      <div
        data-l="EditorArea"
        ref={editorRef}
        className={`${adminFieldControl} min-h-[3rem]`}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel ?? 'リッチテキスト'}
        onInput={emitChange}
        onBlur={emitChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
      />
    </div>
  );
}
