'use client';

interface ArrayFieldDef {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

interface SectionArrayItemEditorProps {
  label: string;
  items: Record<string, unknown>[];
  fields: ArrayFieldDef[];
  emptyItem: Record<string, unknown>;
  itemLabel?: (item: Record<string, unknown>, index: number) => string;
  onChange: (items: Record<string, unknown>[]) => void;
}

function readString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value : '';
}

function createItemId(prefix: string): string {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  return `${prefix}_${suffix}`;
}

export function SectionArrayItemEditor({
  label,
  items,
  fields,
  emptyItem,
  itemLabel,
  onChange,
}: SectionArrayItemEditorProps) {
  function updateItem(index: number, key: string, value: string) {
    onChange(
      items.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)),
    );
  }

  function addItem() {
    const nextItem = JSON.parse(JSON.stringify(emptyItem)) as Record<string, unknown>;
    if (!nextItem.id) {
      nextItem.id = createItemId('item');
    }
    onChange([...items, nextItem]);
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveItem(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) {
      return;
    }

    const next = items.slice();
    const [item] = next.splice(index, 1);
    next.splice(targetIndex, 0, item);
    onChange(next);
  }

  const inputClassName =
    'mt-1 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20';

  return (
    <div className="SectionArrayItemEditor space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-300">{label}</p>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-slate-400">
          {items.length} 件
        </span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/15 px-3 py-4 text-xs text-slate-400">
          項目がありません。追加ボタンから作成してください。
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const heading = itemLabel?.(item, index) ?? `項目 ${index + 1}`;

            return (
              <article
                key={typeof item.id === 'string' ? item.id : `item-${index}`}
                className="SectionArrayItemEditor_item rounded-xl border border-white/10 bg-slate-950/40 p-3"
              >
                <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-white">{heading}</p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="上へ移動"
                      disabled={index === 0}
                      onClick={() => moveItem(index, 'up')}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="下へ移動"
                      disabled={index === items.length - 1}
                      onClick={() => moveItem(index, 'down')}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-rose-400/30 px-2 py-1 text-xs text-rose-200 transition hover:bg-rose-400/10"
                      aria-label="削除"
                      onClick={() => removeItem(index)}
                    >
                      削除
                    </button>
                  </div>
                </header>

                <div className="grid gap-3">
                  {fields.map((field) => (
                    <label key={field.key} className="block">
                      <span className="text-xs font-medium text-slate-300">{field.label}</span>
                      {field.multiline ? (
                        <textarea
                          className={inputClassName}
                          rows={3}
                          value={readString(item, field.key)}
                          placeholder={field.placeholder}
                          onChange={(event) => updateItem(index, field.key, event.target.value)}
                        />
                      ) : (
                        <input
                          className={inputClassName}
                          type="text"
                          value={readString(item, field.key)}
                          placeholder={field.placeholder}
                          onChange={(event) => updateItem(index, field.key, event.target.value)}
                        />
                      )}
                    </label>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="rounded-full border border-sky-400/40 bg-sky-400/10 px-3 py-1.5 text-xs font-medium text-sky-100 transition hover:bg-sky-400/20"
        onClick={addItem}
      >
        項目を追加
      </button>
    </div>
  );
}

function readArray(data: Record<string, unknown>, key: string): Record<string, unknown>[] {
  const value = data[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object' && !Array.isArray(entry))
    .map((entry) => ({ ...entry }));
}

function writeArray(data: Record<string, unknown>, key: string, items: Record<string, unknown>[]): Record<string, unknown> {
  return { ...data, [key]: items };
}

export function CardListItemsEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const cards = readArray(data, 'cards');

  return (
    <SectionArrayItemEditor
      label="カード"
      items={cards}
      fields={[
        { key: 'title', label: 'タイトル' },
        { key: 'body', label: '本文', multiline: true },
        { key: 'description', label: '説明', multiline: true, placeholder: 'body と同義。どちらか使用' },
      ]}
      emptyItem={{ id: '', title: '', body: '', description: '' }}
      itemLabel={(item, index) => {
        const title = readString(item, 'title');
        return title.trim().length > 0 ? title : `カード ${index + 1}`;
      }}
      onChange={(items) => onChange(writeArray(data, 'cards', items))}
    />
  );
}

export function FeatureListItemsEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const items = readArray(data, 'items');

  return (
    <SectionArrayItemEditor
      label="特徴"
      items={items}
      fields={[
        { key: 'title', label: 'タイトル' },
        { key: 'description', label: '説明', multiline: true },
      ]}
      emptyItem={{ id: '', title: '', description: '' }}
      itemLabel={(item, index) => {
        const title = readString(item, 'title');
        return title.trim().length > 0 ? title : `特徴 ${index + 1}`;
      }}
      onChange={(nextItems) => onChange(writeArray(data, 'items', nextItems))}
    />
  );
}

export function FaqItemsEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
}) {
  const items = readArray(data, 'items');

  return (
    <SectionArrayItemEditor
      label="FAQ 項目"
      items={items}
      fields={[
        { key: 'question', label: '質問' },
        { key: 'answer', label: '回答', multiline: true },
      ]}
      emptyItem={{ id: '', question: '', answer: '' }}
      itemLabel={(item, index) => {
        const question = readString(item, 'question');
        return question.trim().length > 0 ? question : `質問 ${index + 1}`;
      }}
      onChange={(nextItems) => onChange(writeArray(data, 'items', nextItems))}
    />
  );
}
