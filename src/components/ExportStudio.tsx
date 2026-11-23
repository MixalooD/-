import { useMemo, useState } from 'react';
import { Check, Copy, Download, Printer } from 'lucide-react';
import type {
  ContentBlock,
  ExportOptions,
  HistoricalFigure,
  Lecture,
  MarginNote,
} from '../types/compendium';
import {
  buildExportBundle,
  buildExportFilename,
} from '../utils/exportBuilder';
import { stripInlineMarkers } from '../utils/lectureSearch';
import { RichText } from './RichText';

interface ExportStudioProps {
  lectures: Lecture[];
  figures: HistoricalFigure[];
  marginNotes: MarginNote[];
  exportOptions: ExportOptions;
  onUpdateExportOptions: (next: ExportOptions) => void;
}

export function ExportStudio({
  lectures,
  figures,
  marginNotes,
  exportOptions,
  onUpdateExportOptions,
}: ExportStudioProps) {
  const [previewFormat, setPreviewFormat] = useState<'markdown' | 'plain'>(
    'markdown'
  );
  const [selectionError, setSelectionError] = useState('');
  const [copiedFormat, setCopiedFormat] = useState<'markdown' | 'plain' | null>(
    null
  );
  const [downloadedExt, setDownloadedExt] = useState<'md' | 'txt' | null>(null);

  const bundle = useMemo(
    () => buildExportBundle(exportOptions, lectures, figures, marginNotes),
    [exportOptions, lectures, figures, marginNotes]
  );

  const toggleLecture = (lectureId: string) => {
    const exists = exportOptions.selectedLectureIds.includes(lectureId);
    const nextIds = exists
      ? exportOptions.selectedLectureIds.filter((id) => id !== lectureId)
      : [...exportOptions.selectedLectureIds, lectureId];
    onUpdateExportOptions({
      ...exportOptions,
      selectedLectureIds: nextIds,
    });
    if (nextIds.length > 0 && selectionError) {
      setSelectionError('');
    }
  };

  const selectAllLectures = () => {
    onUpdateExportOptions({
      ...exportOptions,
      selectedLectureIds: lectures.map((l) => l.id),
    });
    setSelectionError('');
  };

  const clearSelectedLectures = () => {
    onUpdateExportOptions({
      ...exportOptions,
      selectedLectureIds: [],
    });
  };

  const ensureValidSelection = (): boolean => {
    if (exportOptions.selectedLectureIds.length === 0) {
      setSelectionError('Выберите хотя бы одну лекцию для экспорта или печати.');
      return false;
    }
    setSelectionError('');
    return true;
  };

  const handleDownload = (ext: 'md' | 'txt') => {
    if (!ensureValidSelection()) return;
    const content = ext === 'md' ? bundle.markdown : bundle.plainText;
    const mimeType =
      ext === 'md'
        ? 'text/markdown;charset=utf-8'
        : 'text/plain;charset=utf-8';
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildExportFilename(bundle.title, ext);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadedExt(ext);
    window.setTimeout(() => setDownloadedExt(null), 2200);
  };

  const handleCopy = async () => {
    if (!ensureValidSelection()) return;
    const text =
      previewFormat === 'markdown' ? bundle.markdown : bundle.plainText;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedFormat(previewFormat);
    window.setTimeout(() => setCopiedFormat(null), 2200);
  };

  const handlePrint = () => {
    if (!ensureValidSelection()) return;
    window.print();
  };

  const activePreviewText =
    previewFormat === 'markdown' ? bundle.markdown : bundle.plainText;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pb-20">
      {/* Interactive Export Studio (hidden during print) */}
      <div className="print:hidden">
        <section className="pt-7 pb-6 border-b border-[#E6DFD3]">
          <p className="font-mono text-xs tracking-wider text-[#57534E]">
            Автономный экспорт · Markdown · Текст · Печать / PDF
          </p>
          <h1 className="mt-1.5 font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917]">
            Экспорт и печать конспекта
          </h1>
          <p className="mt-2 text-sm text-[#57534E] leading-relaxed max-w-2xl">
            Соберите полную подборку курса или отдельную лекцию, скачайте файл в
            формате Markdown или чистом тексте, скопируйте в буфер обмена либо
            распечатайте в PDF без регистрации и внешних сервисов.
          </p>
        </section>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Document Settings & Lecture Selection */}
          <section className="lg:col-span-5 space-y-7">
            <div>
              <label
                htmlFor="export-doc-title"
                className="block text-xs font-medium text-[#292524] mb-1.5"
              >
                Заголовок документа
              </label>
              <input
                id="export-doc-title"
                type="text"
                value={exportOptions.title}
                onChange={(e) =>
                  onUpdateExportOptions({
                    ...exportOptions,
                    title: e.target.value,
                  })
                }
                placeholder="Конспект лекций: История русской литературы XIX века"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1E3A8A]"
              />
            </div>

            <div className="pt-5 border-t border-[#E6DFD3]">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                  Состав подборки
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <button
                    type="button"
                    onClick={selectAllLectures}
                    className="text-[#1E3A8A] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Выбрать все
                  </button>
                  <span className="text-[#D6CEBE]" aria-hidden="true">
                    /
                  </span>
                  <button
                    type="button"
                    onClick={clearSelectedLectures}
                    className="text-[#57534E] hover:text-[#1C1917] hover:underline whitespace-nowrap cursor-pointer"
                  >
                    Сбросить
                  </button>
                </div>
              </div>

              <ul className="mt-4 divide-y divide-[#E6DFD3] border-y border-[#E6DFD3]">
                {lectures.map((lecture) => {
                  const checked = exportOptions.selectedLectureIds.includes(
                    lecture.id
                  );
                  const noteCount = marginNotes.filter(
                    (n) => n.lectureId === lecture.id
                  ).length;
                  return (
                    <li key={lecture.id}>
                      <label className="py-3 flex items-start gap-3 cursor-pointer hover:bg-[#F2EDE4]/50 px-1.5 -mx-1.5 rounded-xs transition-colors">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLecture(lecture.id)}
                          className="mt-0.5 w-4 h-4 accent-[#1E3A8A] shrink-0 cursor-pointer"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-[#1C1917] leading-snug">
                            <span className="font-mono text-xs text-[#78350F] mr-1.5 tabular-nums">
                              0{lecture.number}
                            </span>
                            {lecture.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-[#57534E] tabular-nums">
                            {lecture.sourceLabel} · {lecture.sections.length}{' '}
                            разд.
                            {noteCount > 0 ? ` · заметок: ${noteCount}` : ''}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {selectionError && (
                <p role="alert" className="mt-3 text-xs text-[#991B1B]">
                  {selectionError}
                </p>
              )}
            </div>

            <div className="pt-5 border-t border-[#E6DFD3] space-y-3">
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                Параметры текста
              </h2>

              <label className="flex items-start gap-3 text-sm text-[#292524] cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeEditorialSupplements}
                  onChange={(e) =>
                    onUpdateExportOptions({
                      ...exportOptions,
                      includeEditorialSupplements: e.target.checked,
                    })
                  }
                  className="mt-0.5 w-4 h-4 accent-[#1E3A8A] shrink-0 cursor-pointer"
                />
                <span>
                  <span className="block font-medium">
                    Редакторские уточнения (доп!)
                  </span>
                  <span className="block text-xs text-[#57534E]">
                    Сохранять восстановленные даты, имена и пояснения контекста.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[#292524] cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeMarginNotes}
                  onChange={(e) =>
                    onUpdateExportOptions({
                      ...exportOptions,
                      includeMarginNotes: e.target.checked,
                    })
                  }
                  className="mt-0.5 w-4 h-4 accent-[#1E3A8A] shrink-0 cursor-pointer"
                />
                <span>
                  <span className="block font-medium tabular-nums">
                    Личные заметки на полях ({marginNotes.length})
                  </span>
                  <span className="block text-xs text-[#57534E]">
                    Добавлять ваши локальные выписки в конце каждой выбранной
                    лекции.
                  </span>
                </span>
              </label>

              <label className="flex items-start gap-3 text-sm text-[#292524] cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportOptions.includeFiguresAppendix}
                  onChange={(e) =>
                    onUpdateExportOptions({
                      ...exportOptions,
                      includeFiguresAppendix: e.target.checked,
                    })
                  }
                  className="mt-0.5 w-4 h-4 accent-[#1E3A8A] shrink-0 cursor-pointer"
                />
                <span>
                  <span className="block font-medium">
                    Приложение: указатель персоналий и дат
                  </span>
                  <span className="block text-xs text-[#57534E]">
                    Алфавитный справочник имён, встречающихся в выбранных
                    лекциях.
                  </span>
                </span>
              </label>
            </div>
          </section>

          {/* Right Column: Actions & Live Preview */}
          <section className="lg:col-span-7 space-y-6">
            {/* Summary Strip & Action Bar */}
            <div className="p-5 sm:p-6 bg-[#F2EDE4]/65 border border-[#E6DFD3] rounded-md space-y-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-[#57534E] tabular-nums">
                <span>Лекций: {bundle.stats.lectureCount}</span>
                <span aria-hidden="true">·</span>
                <span>Разделов: {bundle.stats.sectionCount}</span>
                <span aria-hidden="true">·</span>
                <span>Заметок: {bundle.stats.noteCount}</span>
                <span aria-hidden="true">·</span>
                <span>Персоналий: {bundle.stats.figureCount}</span>
                <span aria-hidden="true">·</span>
                <span>
                  Слов: {bundle.stats.wordCount.toLocaleString('ru-RU')}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDownload('md')}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
                >
                  {downloadedExt === 'md' ? (
                    <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {downloadedExt === 'md'
                      ? 'Файл .md сохранён'
                      : 'Скачать Markdown (.md)'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload('txt')}
                  className="px-4 py-2.5 text-sm font-medium text-[#1C1917] bg-white hover:bg-[#FBF9F5] border border-[#D6CEBE] rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
                >
                  {downloadedExt === 'txt' ? (
                    <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {downloadedExt === 'txt' ? 'Файл .txt сохранён' : 'Скачать .txt'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-4 py-2.5 text-sm font-medium text-[#1C1917] bg-white hover:bg-[#FBF9F5] border border-[#D6CEBE] rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
                >
                  {copiedFormat === previewFormat ? (
                    <Check className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>
                    {copiedFormat === previewFormat
                      ? 'Скопировано'
                      : 'Копировать'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2.5 text-sm font-medium text-[#1E3A8A] bg-white hover:bg-[#FBF9F5] border border-[#1E3A8A]/35 rounded-md transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E3A8A]"
                >
                  <Printer className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Печать / PDF</span>
                </button>
              </div>
            </div>

            {/* Live Preview Container */}
            <div className="border border-[#E6DFD3] rounded-md bg-white overflow-hidden">
              <div className="px-5 py-3.5 border-b border-[#E6DFD3] bg-[#FBF9F5] flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-editorial text-xl font-semibold text-[#1C1917]">
                  Предпросмотр документа
                </h2>

                <div
                  role="tablist"
                  aria-label="Формат предпросмотра"
                  className="inline-flex items-center gap-1 p-1 bg-[#F2EDE4] rounded-md"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewFormat === 'markdown'}
                    onClick={() => setPreviewFormat('markdown')}
                    className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors whitespace-nowrap cursor-pointer ${
                      previewFormat === 'markdown'
                        ? 'bg-white text-[#1C1917]'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    Markdown
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={previewFormat === 'plain'}
                    onClick={() => setPreviewFormat('plain')}
                    className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors whitespace-nowrap cursor-pointer ${
                      previewFormat === 'plain'
                        ? 'bg-white text-[#1C1917]'
                        : 'text-[#57534E] hover:text-[#1C1917]'
                    }`}
                  >
                    Чистый текст
                  </button>
                </div>
              </div>

              {bundle.selectedLectures.length === 0 ? (
                <div className="p-8 text-center text-sm text-[#57534E]">
                  Выберите хотя бы одну лекцию слева, чтобы сформировать
                  конспект для скачивания или печати.
                </div>
              ) : (
                <pre className="p-5 sm:p-6 max-h-[560px] overflow-auto text-xs sm:text-[13px] font-mono leading-relaxed text-[#292524] whitespace-pre-wrap break-words">
                  {activePreviewText}
                </pre>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Dedicated Book-Style Printable Sheet (visible only when printing / saving to PDF) */}
      <article className="hidden print:block print-sheet text-[#1C1917]">
        <header className="pb-4 border-b border-[#1C1917]/30 mb-6">
          <h1 className="font-editorial text-3xl font-bold leading-tight">
            {bundle.title}
          </h1>
          <p className="mt-1.5 text-xs text-[#57534E]">
            История русской литературы первой половины XIX века · Лекций в
            подборке: {bundle.stats.lectureCount}
          </p>
        </header>

        <div className="space-y-8">
          {bundle.selectedLectures.map((lecture) => {
            const notesForLecture = bundle.includedNotes.filter(
              (n) => n.lectureId === lecture.id
            );
            return (
              <section key={lecture.id} className="print-lecture-block">
                <p className="font-mono text-xs text-[#57534E]">
                  ЛЕКЦИЯ {lecture.romanNumeral} · {lecture.sourceLabel} (
                  {lecture.eraSpan})
                </p>
                <h2 className="mt-1 font-editorial text-2xl font-semibold">
                  {lecture.title}
                </h2>
                <blockquote className="my-3 py-2 border-y border-[#D6CEBE] italic text-sm">
                  «{lecture.epigraph.quote}» — {lecture.epigraph.author}
                </blockquote>

                <div className="space-y-5 mt-4">
                  {lecture.sections.map((section) => (
                    <div key={section.id} className="space-y-2.5">
                      <h3 className="font-editorial text-xl font-semibold">
                        {section.number}. {section.title}
                      </h3>
                      {section.blocks.map((block, idx) => (
                        <PrintableBlock
                          key={idx}
                          block={block}
                          includeSupplements={
                            exportOptions.includeEditorialSupplements
                          }
                        />
                      ))}
                    </div>
                  ))}
                </div>

                {notesForLecture.length > 0 && (
                  <div className="mt-5 pt-3 border-t border-[#D6CEBE]">
                    <h4 className="font-editorial text-lg font-semibold">
                      Личные заметки на полях
                    </h4>
                    <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
                      {notesForLecture.map((note) => (
                        <li key={note.id}>
                          {note.sectionTitle ? `${note.sectionTitle}: ` : ''}
                          {note.content}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            );
          })}

          {bundle.includedFigures.length > 0 && (
            <section className="pt-4 border-t border-[#1C1917]/30">
              <h2 className="font-editorial text-2xl font-semibold mb-3">
                Приложение. Указатель персоналий и дат
              </h2>
              <ul className="space-y-1.5 text-sm">
                {bundle.includedFigures.map((fig) => (
                  <li key={fig.id}>
                    <strong>{fig.fullName}</strong> ({fig.yearsLabel}) —{' '}
                    {fig.role}. {fig.contextInLectures}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </article>
    </div>
  );
}

function PrintableBlock({
  block,
  includeSupplements,
}: {
  block: ContentBlock;
  includeSupplements: boolean;
}) {
  const renderText = (raw: string) =>
    includeSupplements ? (
      <RichText text={raw} highlightSupplements={false} />
    ) : (
      stripInlineMarkers(raw, false)
    );

  if (block.type === 'paragraph') {
    return <p className="text-sm leading-relaxed">{renderText(block.text)}</p>;
  }

  if (block.type === 'quote') {
    return (
      <blockquote className="my-2 pl-4 py-1 italic text-sm">
        «{renderText(block.text)}» — {block.attribution}
      </blockquote>
    );
  }

  if (block.type === 'note') {
    return (
      <p className="text-sm leading-relaxed">
        <strong>{block.label}:</strong> {renderText(block.text)}
      </p>
    );
  }

  const ListTag = block.ordered ? 'ol' : 'ul';
  return (
    <ListTag
      className={`text-sm leading-relaxed space-y-1 pl-5 ${
        block.ordered ? 'list-decimal' : 'list-disc'
      }`}
    >
      {block.items.map((item, idx) => (
        <li key={idx}>
          {renderText(item.text)}
          {item.subBullets && item.subBullets.length > 0 && (
            <ul className="mt-1 list-[circle] pl-5 space-y-0.5">
              {item.subBullets.map((sub, subIdx) => (
                <li key={subIdx}>{renderText(sub)}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ListTag>
  );
}
