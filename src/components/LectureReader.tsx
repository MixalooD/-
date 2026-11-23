import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type {
  ContentBlock,
  HistoricalFigure,
  Lecture,
  MarginNote,
} from '../types/compendium';
import { COMPENDIUM_META } from '../data/lectures';
import { searchLectures } from '../utils/lectureSearch';
import { ArchivalPlate } from './ArchivalPlate';
import { RichText } from './RichText';

interface LectureReaderProps {
  lectures: Lecture[];
  figures: HistoricalFigure[];
  activeLectureId: string;
  onSelectLecture: (lectureId: string) => void;
  marginNotes: MarginNote[];
  onAddNote: (lectureId: string, content: string, sectionTitle?: string) => void;
  onDeleteNote: (noteId: string) => void;
  onSendLectureToDocs: (lectureId: string) => void;
  onInspectFigure: (figureName: string) => void;
}

export function LectureReader({
  lectures,
  figures,
  activeLectureId,
  onSelectLecture,
  marginNotes,
  onAddNote,
  onDeleteNote,
  onSendLectureToDocs,
  onInspectFigure,
}: LectureReaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightSupplements, setHighlightSupplements] = useState(true);
  const [noteInput, setNoteInput] = useState('');
  const [noteSection, setNoteSection] = useState('');
  const [noteError, setNoteError] = useState('');
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeIndex = Math.max(
    0,
    lectures.findIndex((l) => l.id === activeLectureId)
  );
  const activeLecture = lectures[activeIndex] ?? lectures[0];

  useEffect(() => {
    const activeTabEl = tabRefs.current[activeLecture.id];
    activeTabEl?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    });
  }, [activeLecture.id]);

  const searchHits = useMemo(
    () => searchLectures(lectures, searchQuery),
    [lectures, searchQuery]
  );

  const lectureNotes = useMemo(
    () => marginNotes.filter((n) => n.lectureId === activeLecture.id),
    [marginNotes, activeLecture.id]
  );

  const mentionedFigures = useMemo(
    () =>
      figures
        .filter((f) => f.lectureIds.includes(activeLecture.id))
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'ru')),
    [figures, activeLecture.id]
  );

  const handleJumpToSection = (lectureId: string, sectionId: string) => {
    onSelectLecture(lectureId);
    setSearchQuery('');
    window.setTimeout(() => {
      const target = document.getElementById(sectionId);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleNoteSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleaned = noteInput.trim();
    if (!cleaned) {
      setNoteError('Введите текст заметки перед сохранением.');
      return;
    }
    onAddNote(activeLecture.id, cleaned, noteSection || undefined);
    setNoteInput('');
    setNoteSection('');
    setNoteError('');
  };

  const prevLecture = activeIndex > 0 ? lectures[activeIndex - 1] : null;
  const nextLecture =
    activeIndex < lectures.length - 1 ? lectures[activeIndex + 1] : null;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 pb-20">
      {/* Archival Course Masthead & Search Utility */}
      <section className="pt-6 pb-5 border-b border-[#E6DFD3]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5">
          <div className="max-w-3xl">
            <p className="font-mono text-xs tracking-wider text-[#57534E] tabular-nums">
              {COMPENDIUM_META.recordingOrder} · 6 лекций · I половина XIX века
            </p>
            <h1 className="mt-1.5 font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917] leading-[1.12]">
              {COMPENDIUM_META.title}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-[#57534E] leading-relaxed max-w-2xl">
              {COMPENDIUM_META.editorialNote}
            </p>
          </div>

          <div className="w-full lg:w-[330px] shrink-0 space-y-2.5">
            <div className="relative">
              <label htmlFor="lecture-search" className="sr-only">
                Поиск по конспекту всех шести лекций
              </label>
              <Search
                className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="lecture-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по цитатам, темам, именам…"
                className="w-full pl-9 pr-9 py-2 text-sm bg-white border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1E3A8A]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Очистить поиск по лекциям"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <label className="inline-flex items-center gap-2.5 text-xs text-[#57534E] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={highlightSupplements}
                onChange={(e) => setHighlightSupplements(e.target.checked)}
                className="w-4 h-4 accent-[#1E3A8A] rounded-xs cursor-pointer"
              />
              <span>Подсвечивать уточнения (доп!) в тексте</span>
            </label>
          </div>
        </div>

        {/* Live Search Results Panel */}
        {searchQuery.trim().length > 0 && (
          <div
            className="mt-4 p-5 bg-[#F2EDE4]/80 border border-[#D6CEBE] rounded-md"
            aria-live="polite"
          >
            <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#E6DFD3]">
              <p className="text-xs font-medium text-[#292524] tabular-nums">
                Результаты поиска по запросу «{searchQuery.trim()}»: найдено в{' '}
                {searchHits.length} из {lectures.length} лекций
              </p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#1E3A8A] hover:underline whitespace-nowrap cursor-pointer"
              >
                Скрыть результаты
              </button>
            </div>

            {searchHits.length === 0 ? (
              <p className="mt-3 text-sm text-[#57534E]">
                Совпадений в тексте лекций не найдено. Попробуйте другой термин
                или фамилию.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-[#E6DFD3]">
                {searchHits.map((hit) => (
                  <div key={hit.lectureId} className="py-3 first:pt-1 last:pb-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectLecture(hit.lectureId);
                          setSearchQuery('');
                        }}
                        className="font-editorial text-lg font-semibold text-[#1E3A8A] hover:underline text-left cursor-pointer"
                      >
                        Лекция {hit.lectureNumber}. {hit.lectureTitle}
                      </button>
                      <span className="font-mono text-xs text-[#57534E] tabular-nums">
                        Совпадений: {hit.matchCount}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {hit.matchedSections.slice(0, 3).map((sec) => (
                        <button
                          key={sec.sectionId}
                          type="button"
                          onClick={() =>
                            handleJumpToSection(hit.lectureId, sec.sectionId)
                          }
                          className="block w-full text-left text-xs text-[#57534E] hover:text-[#1C1917] transition-colors cursor-pointer"
                        >
                          <span className="font-medium text-[#292524]">
                            {sec.sectionTitle}:
                          </span>{' '}
                          {sec.excerpt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Horizontal Chapter Navigation Strip (01–06) */}
      <nav
        aria-label="Выбор лекции"
        className="py-3 border-b border-[#E6DFD3] overflow-x-auto"
      >
        <div className="flex items-center gap-2 min-w-max">
          {lectures.map((lecture) => {
            const isSelected = lecture.id === activeLecture.id;
            return (
              <button
                key={lecture.id}
                ref={(el) => {
                  tabRefs.current[lecture.id] = el;
                }}
                type="button"
                onClick={() => onSelectLecture(lecture.id)}
                aria-current={isSelected ? 'true' : undefined}
                className={`px-3.5 py-2 text-xs sm:text-sm rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#1C1917] text-[#FBF9F5] font-medium'
                    : 'bg-transparent text-[#57534E] hover:bg-[#F2EDE4] hover:text-[#1C1917]'
                }`}
              >
                <span className="font-mono text-xs opacity-75 tabular-nums">
                  0{lecture.number}
                </span>
                <span>{lecture.shortTitle}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Asymmetric Two-Column Reading Canvas (70% Main Prose / 30% Margin Rail) */}
      <div className="mt-7 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Main Editorial Reading Column */}
        <article className="lg:col-span-8 max-w-[740px]">
          <header className="pb-6 border-b border-[#D6CEBE]">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-[#57534E] tabular-nums">
              <span>ЛЕКЦИЯ {activeLecture.romanNumeral}</span>
              <span aria-hidden="true">/</span>
              <span>{activeLecture.sourceLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{activeLecture.eraSpan}</span>
            </div>

            <h2 className="mt-3 font-editorial text-3xl sm:text-4xl lg:text-[2.6rem] font-semibold text-[#1C1917] leading-[1.15]">
              {activeLecture.title}
            </h2>

            <p className="mt-4 text-[15px] sm:text-base text-[#57534E] leading-[1.7] max-w-[66ch]">
              {activeLecture.leadSummary}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#57534E]">
              <span className="font-medium text-[#292524]">Ключевые темы:</span>
              {activeLecture.keyConcepts.map((concept, idx) => (
                <span key={concept}>
                  {concept}
                  {idx < activeLecture.keyConcepts.length - 1 && (
                    <span className="ml-2 text-[#A8A29E]" aria-hidden="true">
                      ·
                    </span>
                  )}
                </span>
              ))}
            </div>
          </header>

          {/* Editorial Archival Plate */}
          <ArchivalPlate
            src={activeLecture.plateImage}
            alt={activeLecture.plateAlt}
            caption={activeLecture.plateCaption}
            fallbackTitle={activeLecture.title}
          />

          {/* Pull Quote Epigraph (Top/Bottom Hairlines — no left accent bar) */}
          <blockquote className="my-8 py-6 border-y border-[#D6CEBE] text-center px-4">
            <p className="font-editorial italic text-2xl sm:text-[1.75rem] text-[#1C1917] leading-snug">
              «{activeLecture.epigraph.quote}»
            </p>
            <footer className="mt-2.5 text-xs text-[#57534E]">
              — {activeLecture.epigraph.author}
            </footer>
          </blockquote>

          {/* Lecture Sections */}
          <div className="space-y-12">
            {activeLecture.sections.map((section, sectionIdx) => (
              <section
                key={section.id}
                id={section.id}
                className="scroll-mt-24 pt-2"
              >
                <div className="flex items-baseline gap-3 pb-3 border-b border-[#E6DFD3]">
                  <span className="font-mono text-xs text-[#78350F] tabular-nums shrink-0">
                    {section.number}
                  </span>
                  <h3 className="font-editorial text-2xl sm:text-[1.7rem] font-semibold text-[#1C1917] leading-snug">
                    {section.title}
                  </h3>
                </div>

                <div className="mt-5 space-y-5 max-w-[68ch]">
                  {section.blocks.map((block, blockIdx) => (
                    <LectureBlockView
                      key={blockIdx}
                      block={block}
                      isOpeningParagraph={sectionIdx === 0 && blockIdx === 0}
                      highlightSupplements={highlightSupplements}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>

          {/* Previous / Next Lecture Footer Navigation */}
          <nav
            aria-label="Переход между лекциями"
            className="mt-14 pt-6 border-t border-[#D6CEBE] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
          >
            {prevLecture ? (
              <button
                type="button"
                onClick={() => {
                  onSelectLecture(prevLecture.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group text-left py-2 px-3 -mx-3 rounded-md hover:bg-[#F2EDE4] transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5 text-xs font-mono text-[#57534E]">
                  <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                  Предыдущая лекция
                </span>
                <span className="mt-1 block font-editorial text-lg font-semibold text-[#1C1917] group-hover:text-[#1E3A8A]">
                  {prevLecture.number}. {prevLecture.shortTitle}
                </span>
              </button>
            ) : (
              <div />
            )}

            {nextLecture && (
              <button
                type="button"
                onClick={() => {
                  onSelectLecture(nextLecture.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="group text-left sm:text-right py-2 px-3 -mx-3 rounded-md hover:bg-[#F2EDE4] transition-colors cursor-pointer"
              >
                <span className="flex items-center sm:justify-end gap-1.5 text-xs font-mono text-[#57534E]">
                  Следующая лекция
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span className="mt-1 block font-editorial text-lg font-semibold text-[#1C1917] group-hover:text-[#1E3A8A]">
                  {nextLecture.number}. {nextLecture.shortTitle}
                </span>
              </button>
            )}
          </nav>
        </article>

        {/* Right Margin Rail (30%): TOC, Personal Margin Notes, Mentioned Figures, Export */}
        <aside className="lg:col-span-4 lg:sticky lg:top-20 space-y-8">
          {/* Table of Contents for Current Lecture */}
          <div className="pb-6 border-b border-[#E6DFD3]">
            <h3 className="font-editorial text-xl font-semibold text-[#1C1917]">
              Содержание лекции
            </h3>
            <ol className="mt-3 space-y-2">
              {activeLecture.sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="flex items-baseline gap-2.5 text-sm text-[#57534E] hover:text-[#1E3A8A] transition-colors leading-snug"
                  >
                    <span className="font-mono text-xs text-[#78350F] tabular-nums shrink-0">
                      {section.number}
                    </span>
                    <span>{section.title}</span>
                  </a>
                </li>
              ))}
            </ol>

            <button
              type="button"
              onClick={() => onSendLectureToDocs(activeLecture.id)}
              className="mt-5 w-full py-2.5 px-4 text-xs sm:text-sm font-medium text-[#1E3A8A] bg-[#F2EDE4] hover:bg-[#E6DFD3] border border-[#D6CEBE] rounded-md transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Отправить эту лекцию в Google Docs</span>
            </button>
          </div>

          {/* Personal Study Margin Notes (Заметки на полях) */}
          <div className="pb-6 border-b border-[#E6DFD3]">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-editorial text-xl font-semibold text-[#1C1917]">
                Заметки на полях
              </h3>
              <span className="font-mono text-xs text-[#57534E] tabular-nums">
                {lectureNotes.length}
              </span>
            </div>
            <p className="mt-1 text-xs text-[#57534E] leading-relaxed">
              Сохраняются локально и могут быть включены при экспорте в Google
              Docs.
            </p>

            <form onSubmit={handleNoteSubmit} className="mt-4 space-y-2.5">
              <div>
                <label
                  htmlFor="margin-note-section"
                  className="block text-xs text-[#57534E] mb-1"
                >
                  Раздел (необязательно)
                </label>
                <select
                  id="margin-note-section"
                  value={noteSection}
                  onChange={(e) => setNoteSection(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
                >
                  <option value="">Ко всей лекции</option>
                  {activeLecture.sections.map((sec) => (
                    <option key={sec.id} value={`${sec.number}. ${sec.title}`}>
                      {sec.number}. {sec.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="margin-note-input"
                  className="block text-xs text-[#57534E] mb-1"
                >
                  Текст заметки
                </label>
                <textarea
                  id="margin-note-input"
                  rows={3}
                  value={noteInput}
                  onChange={(e) => {
                    setNoteInput(e.target.value);
                    if (noteError) setNoteError('');
                  }}
                  placeholder="Выписка, вопрос к семинару, параллель с другим произведением…"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1E3A8A] resize-y"
                />
              </div>

              {noteError && (
                <p role="alert" className="text-xs text-[#991B1B]">
                  {noteError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2 px-4 text-xs font-medium text-white bg-[#1C1917] hover:bg-[#292524] rounded-md transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Сохранить заметку</span>
              </button>
            </form>

            {lectureNotes.length > 0 && (
              <ul
                className="mt-4 space-y-3"
                data-testid="margin-notes-list"
              >
                {lectureNotes.map((note) => (
                  <li
                    key={note.id}
                    className="p-3.5 bg-[#F2EDE4]/70 border border-[#E6DFD3] rounded-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-mono text-[#78350F] leading-snug">
                        {note.sectionTitle || `Лекция ${activeLecture.number}`} ·{' '}
                        {note.createdAt}
                      </p>
                      <button
                        type="button"
                        onClick={() => onDeleteNote(note.id)}
                        aria-label={`Удалить заметку «${note.content.slice(0, 32)}»`}
                        className="p-1 text-[#57534E] hover:text-[#991B1B] transition-colors shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="mt-1.5 text-sm text-[#1C1917] leading-relaxed whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Key Historical Figures Mentioned in This Lecture */}
          <div>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-editorial text-xl font-semibold text-[#1C1917]">
                Персоналии лекции
              </h3>
              <span className="font-mono text-xs text-[#57534E] tabular-nums">
                {mentionedFigures.length}
              </span>
            </div>
            <ul className="mt-3 divide-y divide-[#E6DFD3]">
              {mentionedFigures.map((fig) => (
                <li key={fig.id} className="py-2 first:pt-0">
                  <button
                    type="button"
                    onClick={() => onInspectFigure(fig.sortKey)}
                    className="w-full text-left group flex items-baseline justify-between gap-2 cursor-pointer"
                  >
                    <span className="text-sm text-[#292524] group-hover:text-[#1E3A8A] transition-colors">
                      {fig.shortName}
                    </span>
                    <span className="font-mono text-xs text-[#78716C] tabular-nums shrink-0">
                      {fig.yearsLabel}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}

interface LectureBlockViewProps {
  block: ContentBlock;
  isOpeningParagraph: boolean;
  highlightSupplements: boolean;
}

function LectureBlockView({
  block,
  isOpeningParagraph,
  highlightSupplements,
}: LectureBlockViewProps) {
  if (block.type === 'paragraph') {
    return (
      <p
        className={`text-[15.5px] text-[#292524] leading-[1.78] ${
          isOpeningParagraph
            ? 'first-letter:font-editorial first-letter:text-5xl first-letter:font-semibold first-letter:float-left first-letter:mr-3 first-letter:mt-1 first-letter:leading-[0.82] first-letter:text-[#1C1917]'
            : ''
        }`}
      >
        <RichText
          text={block.text}
          highlightSupplements={highlightSupplements}
        />
      </p>
    );
  }

  if (block.type === 'quote') {
    return (
      <blockquote className="my-6 py-5 px-5 border-y border-[#D6CEBE] bg-[#F2EDE4]/45">
        <p className="font-editorial italic text-xl text-[#1C1917] leading-relaxed">
          «<RichText text={block.text} highlightSupplements={highlightSupplements} />»
        </p>
        <footer className="mt-2 text-xs text-[#57534E]">
          — {block.attribution}
        </footer>
      </blockquote>
    );
  }

  if (block.type === 'note') {
    return (
      <div className="p-4 sm:p-5 bg-[#F2EDE4]/70 border border-[#E6DFD3] rounded-md">
        <p className="text-xs font-mono tracking-wide text-[#78350F] mb-1.5">
          {block.label}
        </p>
        <p className="text-sm text-[#292524] leading-[1.7]">
          <RichText
            text={block.text}
            highlightSupplements={highlightSupplements}
          />
        </p>
      </div>
    );
  }

  const ListTag = block.ordered ? 'ol' : 'ul';

  return (
    <ListTag
      className={`space-y-3.5 text-[15px] text-[#292524] leading-[1.74] ${
        block.ordered ? 'list-decimal pl-5' : 'list-disc pl-5'
      } marker:text-[#78350F]`}
    >
      {block.items.map((item, idx) => (
        <li key={idx} className="pl-1">
          <RichText
            text={item.text}
            highlightSupplements={highlightSupplements}
          />
          {item.subBullets && item.subBullets.length > 0 && (
            <ul className="mt-2.5 space-y-2 list-[circle] pl-5 text-[14.5px] text-[#44403C] marker:text-[#A8A29E]">
              {item.subBullets.map((sub, subIdx) => (
                <li key={subIdx} className="pl-1">
                  <RichText
                    text={sub}
                    highlightSupplements={highlightSupplements}
                  />
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ListTag>
  );
}
