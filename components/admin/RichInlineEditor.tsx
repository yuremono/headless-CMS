'use client';

import { useEffect, useRef } from 'react';

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
    <div className="RichInlineEditor mt-2">
      {!readOnly ? (
        <div className="rich_inline_editor_toolbar mb-2 flex flex-wrap gap-2" role="toolbar" aria-label="書式">
          <button
            type="button"
            className="rich_inline_editor_btn rounded-lg border border-white/15 bg-slate-950/60 px-3 py-1 text-xs font-semibold text-white transition hover:bg-slate-800"
            onClick={() => applyTag('strong')}
          >
            太字
          </button>
          <button
            type="button"
            className="rich_inline_editor_btn rounded-lg border border-white/15 bg-slate-950/60 px-3 py-1 text-xs italic text-white transition hover:bg-slate-800"
            onClick={() => applyTag('em')}
          >
            斜体
          </button>
          <button
            type="button"
            className="rich_inline_editor_btn rounded-lg border border-sky-400/40 bg-sky-400/10 px-3 py-1 text-xs text-sky-100 transition hover:bg-sky-400/20"
            onClick={() => applyTag('span', 'accent')}
          >
            アクセント
          </button>
        </div>
      ) : null}
      <div
        ref={editorRef}
        className="rich_inline_editor_area min-h-[3rem] w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm text-white outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
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
