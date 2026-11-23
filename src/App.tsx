import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { LECTURES } from './data/lectures';
import { HISTORICAL_FIGURES } from './data/figures';
import { TIMELINE_EVENTS } from './data/timeline';
import type {
  AppSection,
  ExportOptions,
  GoogleDocRecord,
  MarginNote,
} from './types/compendium';
import {
  clearAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import { TopBar } from './components/TopBar';
import { LectureReader } from './components/LectureReader';
import { FiguresRegistry } from './components/FiguresRegistry';
import { ChronologyView } from './components/ChronologyView';
import { GoogleDocsStudio } from './components/GoogleDocsStudio';

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

  // Google Workspace Auth state (access token stays strictly in memory inside googleAuth.ts)
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [recentDocs, setRecentDocs] = useState<GoogleDocRecord[]>([]);

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser) => {
        setUser(authedUser);
        setNeedsAuth(false);
        setAuthError(null);
      },
      () => {
        setUser(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

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

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setNeedsAuth(false);
    } catch (err) {
      const errorText = err instanceof Error ? err.message : '';
      let message =
        'Не удалось выполнить вход через Google. Проверьте разрешение на всплывающие окна и попробуйте снова.';
      if (errorText.includes('popup-closed-by-user')) {
        message = 'Окно входа Google было закрыто до завершения авторизации.';
      } else if (errorText.includes('unauthorized-domain')) {
        message = `Домен ${window.location.hostname} не добавлен в список разрешённых (Authorized domains) в настройках Firebase Authentication.`;
      }
      setAuthError(message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setAuthError(null);
  };

  const handleSessionExpired = () => {
    clearAccessToken();
    setNeedsAuth(true);
  };

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

  const handleSendLectureToDocs = (lectureId: string) => {
    const lecture = LECTURES.find((l) => l.id === lectureId);
    setExportOptions((prev) => ({
      ...prev,
      title: lecture
        ? `Лекция ${lecture.number}. ${lecture.title}`
        : prev.title,
      selectedLectureIds: [lectureId],
    }));
    setActiveSection('docs');
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
    setActiveSection('docs');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRecordDoc = (record: GoogleDocRecord) => {
    setRecentDocs((prev) => [record, ...prev].slice(0, 8));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-[#1C1917]">
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
            onSendLectureToDocs={handleSendLectureToDocs}
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

        {activeSection === 'docs' && (
          <GoogleDocsStudio
            lectures={LECTURES}
            figures={HISTORICAL_FIGURES}
            marginNotes={marginNotes}
            user={user}
            needsAuth={needsAuth}
            isLoggingIn={isLoggingIn}
            authError={authError}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onSessionExpired={handleSessionExpired}
            exportOptions={exportOptions}
            onUpdateExportOptions={setExportOptions}
            recentDocs={recentDocs}
            onRecordDoc={handleRecordDoc}
          />
        )}
      </main>

      <footer className="border-t border-[#E6DFD3] bg-[#FBF9F5] py-6">
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
