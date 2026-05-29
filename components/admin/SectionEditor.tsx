'use client';

import { useMemo, useState } from 'react';
import { SectionFieldForm } from './SectionFieldForm';

export interface SectionItem {
  type: string;
  id: string;
  visible?: boolean;
  data: Record<string, unknown>;
}

interface SectionEditorProps {
  label: string;
  value: string | number | boolean;
  sectionTemplates?: string[];
  helpText?: string;
  onChange: (value: string) => void;
}

const SECTION_TYPE_LABELS: Record<string, string> = {
  hero: 'ヒーロー',
  titleGroup: 'タイトル群',
  textBlock: 'テキストブロック',
  imageText: '画像とテキスト',
  cardList: 'カード一覧',
  featureList: '特徴一覧',
  faq: 'FAQ',
  cta: 'CTA',
  newsList: 'お知らせ一覧',
  gallery: 'ギャラリー',
  companyProfile: '会社情報',
  access: 'アクセス',
  contactLead: 'お問い合わせ導線',
};

const DEFAULT_SECTION_DATA: Record<string, Record<string, unknown>> = {
  hero: {
    title: '',
    lead: '',
    image: { url: '', alt: '' },
    button: { label: '', href: '' },
  },
  titleGroup: { title: '', lead: '' },
  textBlock: { title: '', body: '' },
  imageText: {
    title: '',
    body: '',
    imagePosition: 'right',
    image: { url: '', alt: '' },
  },
  cardList: { title: '', summary: '', cards: [] },
  featureList: { title: '', items: [] },
  faq: { title: '', items: [] },
  cta: {
    title: '',
    body: '',
    button: { label: '', href: '' },
  },
};

function createSectionId(type: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return `sec_${type}_${suffix}`;
}

function normalizeSectionItem(raw: unknown): SectionItem | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const item = raw as Record<string, unknown>;
  const type = typeof item.type === 'string' ? item.type : '';
  const id = typeof item.id === 'string' ? item.id : createSectionId(type || 'section');
  const visible = item.visible === false ? false : true;
  const data =
    item.data && typeof item.data === 'object' && !Array.isArray(item.data)
      ? (item.data as Record<string, unknown>)
      : {};

  if (!type) {
    return null;
  }

  return { type, id, visible, data };
}

export function parseSectionArray(value: string | number | boolean): SectionItem[] {
  if (Array.isArray(value)) {
    return value.map(normalizeSectionItem).filter((item): item is SectionItem => Boolean(item));
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return parsed.map(normalizeSectionItem).filter((item): item is SectionItem => Boolean(item));
    }

    const single = normalizeSectionItem(parsed);
    return single ? [single] : [];
  } catch {
    return [];
  }
}

function serializeSections(sections: SectionItem[]): string {
  return JSON.stringify(sections, null, 2);
}

function getSectionLabel(type: string): string {
  return SECTION_TYPE_LABELS[type] ?? type;
}

function createSection(type: string): SectionItem {
  const defaults = DEFAULT_SECTION_DATA[type] ?? { title: '', body: '' };

  return {
    type,
    id: createSectionId(type),
    visible: true,
    data: JSON.parse(JSON.stringify(defaults)) as Record<string, unknown>,
  };
}

function duplicateSection(section: SectionItem): SectionItem {
  return {
    type: section.type,
    id: createSectionId(section.type),
    visible: section.visible !== false,
    data: JSON.parse(JSON.stringify(section.data)) as Record<string, unknown>,
  };
}

function moveSection(sections: SectionItem[], index: number, direction: 'up' | 'down'): SectionItem[] {
  const targetIndex = direction === 'up' ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= sections.length) {
    return sections;
  }

  return reorderSection(sections, index, targetIndex);
}

function reorderSection(sections: SectionItem[], fromIndex: number, toIndex: number): SectionItem[] {
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    fromIndex >= sections.length ||
    toIndex < 0 ||
    toIndex >= sections.length
  ) {
    return sections;
  }

  const next = sections.slice();
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function SectionEditor({ label, value, sectionTemplates = [], helpText, onChange }: SectionEditorProps) {
  const sections = useMemo(() => parseSectionArray(value), [value]);
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});
  const [selectedType, setSelectedType] = useState(sectionTemplates[0] ?? 'hero');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const availableTemplates = sectionTemplates.length > 0 ? sectionTemplates : Object.keys(SECTION_TYPE_LABELS);

  function updateSections(next: SectionItem[]) {
    onChange(serializeSections(next));
  }

  function toggleOpen(id: string) {
    setOpenIds((current) => ({ ...current, [id]: !current[id] }));
  }

  function handleAdd() {
    if (!selectedType) {
      return;
    }

    const next = [...sections, createSection(selectedType)];
    updateSections(next);
    setOpenIds((current) => ({ ...current, [next[next.length - 1].id]: true }));
  }

  function handleRemove(index: number) {
    updateSections(sections.filter((_, itemIndex) => itemIndex !== index));
  }

  function handleMove(index: number, direction: 'up' | 'down') {
    updateSections(moveSection(sections, index, direction));
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    updateSections(reorderSection(sections, fromIndex, toIndex));
  }

  function clearDragState() {
    setDragIndex(null);
    setDropIndex(null);
  }

  function handleDuplicate(index: number) {
    const copy = duplicateSection(sections[index]);
    const next = sections.slice();
    next.splice(index + 1, 0, copy);
    updateSections(next);
    setOpenIds((current) => ({ ...current, [copy.id]: true }));
  }

  function handleToggleVisible(index: number) {
    updateSections(
      sections.map((section, itemIndex) =>
        itemIndex === index ? { ...section, visible: section.visible === false } : section,
      ),
    );
  }

  function handleDataChange(index: number, data: Record<string, unknown>) {
    updateSections(
      sections.map((section, itemIndex) => (itemIndex === index ? { ...section, data } : section)),
    );
  }

  return (
    <div className="SectionEditor lg:col-span-2">
      <div className="SectionEditor_header flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          {helpText ? <p className="mt-1 text-xs leading-5 text-slate-400">{helpText}</p> : null}
        </div>
        <span className="SectionEditor_count rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
          {sections.length} 件
        </span>
      </div>

      <div className="SectionEditor_list mt-4 space-y-3">
        {sections.length === 0 ? (
          <p className="SectionEditor_empty rounded-2xl border border-dashed border-white/15 px-4 py-6 text-sm text-slate-400">
            セクションがありません。下の追加ボタンから作成してください。
          </p>
        ) : (
          sections.map((section, index) => {
            const isOpen = openIds[section.id] ?? false;
            const isHidden = section.visible === false;
            const previewTitle =
              typeof section.data.title === 'string' && section.data.title.trim().length > 0
                ? section.data.title
                : '（タイトル未入力）';

            const isDragging = dragIndex === index;
            const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;

            return (
              <article
                key={section.id}
                className={`SectionEditor_item rounded-2xl border bg-slate-950/50 ${
                  isHidden ? 'border-amber-400/30 opacity-70' : 'border-white/10'
                } ${isDragging ? 'SectionEditor_item_is_dragging' : ''} ${
                  isDropTarget ? 'SectionEditor_item_drop_target' : ''
                }`}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = 'move';
                  if (dragIndex !== null && dragIndex !== index) {
                    setDropIndex(index);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null) {
                    handleReorder(dragIndex, index);
                  }
                  clearDragState();
                }}
              >
                <header className="SectionEditor_itemHeader flex flex-wrap items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    draggable
                    className="SectionEditor_dragHandle shrink-0"
                    aria-label="並び替え（ドラッグ）"
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('text/plain', String(index));
                      setDragIndex(index);
                      setDropIndex(index);
                    }}
                    onDragEnd={clearDragState}
                  >
                    <span aria-hidden="true">⋮⋮</span>
                  </button>
                  <button
                    type="button"
                    className="SectionEditor_toggle flex min-w-0 flex-1 items-center gap-3 text-left"
                    aria-expanded={isOpen}
                    onClick={() => toggleOpen(section.id)}
                  >
                    <span className="rounded-full bg-sky-400/15 px-2 py-0.5 text-xs text-sky-200">
                      {getSectionLabel(section.type)}
                    </span>
                    {isHidden ? (
                      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs text-amber-100">
                        非表示
                      </span>
                    ) : null}
                    <span className={`truncate text-sm font-medium ${isHidden ? 'text-slate-400' : 'text-white'}`}>
                      {previewTitle}
                    </span>
                    <span className="truncate text-xs text-slate-500">{section.id}</span>
                  </button>

                  <div className="SectionEditor_actions flex items-center gap-1">
                    <button
                      type="button"
                      className="SectionEditor_duplicate rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/5"
                      aria-label="複製"
                      onClick={() => handleDuplicate(index)}
                    >
                      複製
                    </button>
                    <button
                      type="button"
                      className={`SectionEditor_visibility rounded-lg border px-2 py-1 text-xs transition ${
                        isHidden
                          ? 'border-emerald-400/30 text-emerald-200 hover:bg-emerald-400/10'
                          : 'border-amber-400/30 text-amber-200 hover:bg-amber-400/10'
                      }`}
                      aria-label={isHidden ? '表示に戻す' : '非表示にする'}
                      onClick={() => handleToggleVisible(index)}
                    >
                      {isHidden ? '表示' : '非表示'}
                    </button>
                    <button
                      type="button"
                      className="SectionEditor_move rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="上へ移動"
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="SectionEditor_move rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="下へ移動"
                      disabled={index === sections.length - 1}
                      onClick={() => handleMove(index, 'down')}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="SectionEditor_remove rounded-lg border border-rose-400/30 px-2 py-1 text-xs text-rose-200 transition hover:bg-rose-400/10"
                      aria-label="削除"
                      onClick={() => handleRemove(index)}
                    >
                      削除
                    </button>
                  </div>
                </header>

                {isOpen ? (
                  <div className="SectionEditor_body border-t border-white/10 px-4 py-4">
                    <SectionFieldForm
                      type={section.type}
                      data={section.data}
                      onChange={(data) => handleDataChange(index, data)}
                    />
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>

      <div className="SectionEditor_add mt-4 flex flex-wrap items-end gap-3">
        <label className="block min-w-[12rem] flex-1">
          <span className="text-xs font-medium text-slate-300">追加する型</span>
          <select
            className="mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
            value={selectedType}
            onChange={(event) => setSelectedType(event.target.value)}
          >
            {availableTemplates.map((type) => (
              <option key={type} value={type}>
                {getSectionLabel(type)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="SectionEditor_addButton rounded-full border border-sky-400/40 bg-sky-400/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:bg-sky-400/20"
          onClick={handleAdd}
        >
          セクションを追加
        </button>
      </div>
    </div>
  );
}
