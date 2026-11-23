import { useEffect, useState } from 'react';
import { LECTURES } from './data/lectures';
import { HISTORICAL_FIGURES } from './data/figures';
import { TIMELINE_EVENTS } from './data/timeline';
import type {
  AppSection,
  ExportOptions,
  MarginNote,
} from './types/compendium';
import { TopBar } from './components/TopBar';
import { LectureReader } from './components/LectureReader';
import { FiguresRegistry } from './components/FiguresRegistry';
import { ChronologyView } from './components/ChronologyView';
import { ExportStudio } from './components/ExportStudio';

const NOTES_STORAGE_KEY = 'slovesnost_xix_margin_notes_v1';

const DEFAULT_NOTES: MarginNote[] = [
  {
    id: 'seed-note-1',
    lectureId: 'lecture-1',
    sectionTitle: '1.3. Триада переложений баллады «Ленора» Г. А. Бюргера',
    content:
      'Обратить внимание на контраст финалов: ропот Людмилы → гибель, смирение Светланы → пробуждение, народная прямота Ольги у Катенина.',
    createdAt: 'Архивная заметка',
  },
  {
    id: 'seed-note-2',
    lectureId: 'lecture-5',
    sectionTitle: '5.4. Петербургский период (1817–1820)',
    content:
      'Ключевое слово «пока» в послании «К Чаадаеву» отличает трезвый историзм Пушкина от риторики декабристов.',
    createdAt: 'Архивная заметка',
  },
];

function loadInitialNotes(): MarginNote[] {
  try {
    const raw = window.localStorage.getItem(NOTES_STORAGE_KEY);
    if (!raw) return DEFAULT_NOTES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_NOTES;
  } catch {
    return DEFAULT_NOTES;
  }
}

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('lectures');
  const [activeLectureId, setActiveLectureId] = useState<string>(LECTURES[0].id);
  const [figureSearchSeed, setFigureSearchSeed] = useState<string>('');

  const [marginNotes, setMarginNotes] = useState<MarginNote[]>(loadInitialNotes);

  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    title: 'Конспект лекций: История русской литературы I половины XIX века',
    selectedLectureIds: LECTURES.map((l) => l.id),
    includeEditorialSupplements: true,
    includeMarginNotes: true,
    includeFiguresAppendix: true,
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        NOTES_STORAGE_KEY,
        JSON.stringify(marginNotes)
      );
    } catch {
      // Ignore storage quota issues gracefully
    }
  }, [marginNotes]);

  const handleAddNote = (
    lectureId: string,
    content: string,
    sectionTitle?: string
  ) => {
    const newNote: MarginNote = {
      id: `note-${Date.now()}`,
      lectureId,
      sectionTitle,
      content,
      createdAt: new Date().toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
    };
    setMarginNotes((prev) => [newNote, ...prev]);
  };

  const handleDeleteNote = (noteId: string) => {
    setMarginNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const handleExportLecture = (lectureId: string) => {
    const lecture = LECTURES.find((l) => l.id === lectureId);
    setExportOptions((prev) => ({
      ...prev,
      title: lecture
        ? `Лекция ${lecture.number}. ${lecture.title}`
        : prev.title,
      selectedLectureIds: [lectureId],
    }));
    setActiveSection('export');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleJumpToLecture = (lectureId: string) => {
    setActiveLectureId(lectureId);
    setActiveSection('lectures');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInspectFigure = (figureSortKey: string) => {
    setFigureSearchSeed(figureSortKey);
    setActiveSection('figures');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickExport = () => {
    setActiveSection('export');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917] print:bg-white">
      <TopBar
        activeSection={activeSection}
        onNavigate={(section) => {
          if (section === 'figures') {
            setFigureSearchSeed('');
          }
          setActiveSection(section);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onQuickExport={handleQuickExport}
      />

      <main className="flex-1">
        {activeSection === 'lectures' && (
          <LectureReader
            lectures={LECTURES}
            figures={HISTORICAL_FIGURES}
            activeLectureId={activeLectureId}
            onSelectLecture={setActiveLectureId}
            marginNotes={marginNotes}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onExportLecture={handleExportLecture}
            onInspectFigure={handleInspectFigure}
          />
        )}

        {activeSection === 'figures' && (
          <FiguresRegistry
            key={figureSearchSeed || 'all-figures'}
            figures={HISTORICAL_FIGURES}
            lectures={LECTURES}
            initialSearch={figureSearchSeed}
            onJumpToLecture={handleJumpToLecture}
          />
        )}

        {activeSection === 'chronology' && (
          <ChronologyView
            events={TIMELINE_EVENTS}
            lectures={LECTURES}
            onJumpToLecture={handleJumpToLecture}
          />
        )}

        {activeSection === 'export' && (
          <ExportStudio
            lectures={LECTURES}
            figures={HISTORICAL_FIGURES}
            marginNotes={marginNotes}
            exportOptions={exportOptions}
            onUpdateExportOptions={setExportOptions}
          />
        )}
      </main>

      <footer className="border-t border-[#E6DFD3] bg-[#FBF9F5] py-6 print:hidden">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#57534E]">
          <p>
            Словесность XIX · Конспект лекций по истории русской литературы
            первой половины XIX века
          </p>
          <p className="font-mono tabular-nums">
            Записи № 86, 89, 91–92, 96, 98, 100
          </p>
        </div>
      </footer>
    </div>
  );
}
