import { useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FilePlus2,
  FileText,
  FolderOpen,
  LogOut,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  ExportOptions,
  GoogleDocRecord,
  HistoricalFigure,
  Lecture,
  MarginNote,
} from '../types/compendium';
import {
  buildCompendiumDocumentPlan,
  buildMarkdownExport,
  extractGoogleDocId,
  type ParsedGoogleDoc,
} from '../utils/googleDocsBuilder';
import {
  appendToGoogleDoc,
  createFormattedGoogleDoc,
  fetchGoogleDocById,
  GoogleDocsApiError,
} from '../services/googleDocsApi';
import { getAccessToken } from '../services/googleAuth';
import { GoogleSignInButton } from './GoogleSignInButton';
import { ConfirmModal } from './ConfirmModal';

interface GoogleDocsStudioProps {
  lectures: Lecture[];
  figures: HistoricalFigure[];
  marginNotes: MarginNote[];
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  authError: string | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onSessionExpired: () => void;
  exportOptions: ExportOptions;
  onUpdateExportOptions: (next: ExportOptions) => void;
  recentDocs: GoogleDocRecord[];
  onRecordDoc: (record: GoogleDocRecord) => void;
}

export function GoogleDocsStudio({
  lectures,
  figures,
  marginNotes,
  user,
  needsAuth,
  isLoggingIn,
  authError,
  onLogin,
  onLogout,
  onSessionExpired,
  exportOptions,
  onUpdateExportOptions,
  recentDocs,
  onRecordDoc,
}: GoogleDocsStudioProps) {
  const [studioTab, setStudioTab] = useState<'create' | 'append'>('create');

  // Create Doc state
  const [titleError, setTitleError] = useState('');
  const [selectionError, setSelectionError] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<{
    documentId: string;
    title: string;
    url: string;
  } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [copiedLocal, setCopiedLocal] = useState(false);

  // Open & Append state
  const [docUrlInput, setDocUrlInput] = useState('');
  const [docUrlError, setDocUrlError] = useState('');
  const [isLoadingDoc, setIsLoadingDoc] = useState(false);
  const [loadedDoc, setLoadedDoc] = useState<ParsedGoogleDoc | null>(null);
  const [appendSuccess, setAppendSuccess] = useState<string | null>(null);
  const [confirmAppendOpen, setConfirmAppendOpen] = useState(false);
  const [isAppending, setIsAppending] = useState(false);

  const parsedInputId = useMemo(
    () => extractGoogleDocId(docUrlInput),
    [docUrlInput]
  );

  const docPlan = useMemo(
    () =>
      buildCompendiumDocumentPlan(
        exportOptions,
        lectures,
        figures,
        marginNotes,
        1
      ),
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

  const validateSelection = (requireTitle: boolean): boolean => {
    let valid = true;
    if (requireTitle && !exportOptions.title.trim()) {
      setTitleError('Укажите название документа Google Docs.');
      valid = false;
    } else {
      setTitleError('');
    }
    if (exportOptions.selectedLectureIds.length === 0) {
      setSelectionError('Выберите хотя бы одну лекцию для экспорта.');
      valid = false;
    } else {
      setSelectionError('');
    }
    return valid;
  };

  const handleCreateGoogleDoc = async () => {
    setApiError(null);
    setCreateSuccess(null);

    if (!validateSelection(true)) return;

    const token = await getAccessToken();
    if (!token) {
      onSessionExpired();
      setApiError('Выполните вход через Google, чтобы создать документ в Google Docs.');
      return;
    }

    setIsCreating(true);
    try {
      const result = await createFormattedGoogleDoc(token, docPlan);
      setCreateSuccess(result);
      onRecordDoc({
        documentId: result.documentId,
        title: result.title,
        url: result.url,
        action: 'created',
        updatedAt: new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    } catch (err) {
      if (err instanceof GoogleDocsApiError && err.requiresReauth) {
        onSessionExpired();
      }
      setApiError(
        err instanceof Error
          ? err.message
          : 'Не удалось создать документ Google Docs.'
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleFetchExistingDoc = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiError(null);
    setAppendSuccess(null);

    if (!docUrlInput.trim()) {
      setDocUrlError('Вставьте ссылку на Google Docs или идентификатор документа.');
      return;
    }
    if (!parsedInputId) {
      setDocUrlError(
        'Не удалось распознать ID документа. Используйте ссылку вида https://docs.google.com/document/d/…/edit'
      );
      return;
    }
    setDocUrlError('');

    const token = await getAccessToken();
    if (!token) {
      onSessionExpired();
      setApiError('Выполните вход через Google, чтобы открыть документ.');
      return;
    }

    setIsLoadingDoc(true);
    try {
      const parsed = await fetchGoogleDocById(token, parsedInputId);
      setLoadedDoc(parsed);
      onRecordDoc({
        documentId: parsed.documentId,
        title: parsed.title,
        url: `https://docs.google.com/document/d/${parsed.documentId}/edit`,
        action: 'opened',
        updatedAt: new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
    } catch (err) {
      setLoadedDoc(null);
      if (err instanceof GoogleDocsApiError && err.requiresReauth) {
        onSessionExpired();
      }
      setApiError(
        err instanceof Error
          ? err.message
          : 'Не удалось загрузить документ Google Docs.'
      );
    } finally {
      setIsLoadingDoc(false);
    }
  };

  const handleRequestAppendConfirmation = () => {
    setApiError(null);
    setAppendSuccess(null);
    if (!loadedDoc) {
      setDocUrlError('Сначала откройте существующий документ Google Docs.');
      return;
    }
    if (!validateSelection(false)) return;
    setConfirmAppendOpen(true);
  };

  const handleConfirmAppend = async () => {
    if (!loadedDoc) return;
    const token = await getAccessToken();
    if (!token) {
      setConfirmAppendOpen(false);
      onSessionExpired();
      setApiError('Сессия Google истекла. Войдите снова и повторите действие.');
      return;
    }

    setIsAppending(true);
    try {
      const appendPlan = buildCompendiumDocumentPlan(
        exportOptions,
        lectures,
        figures,
        marginNotes,
        loadedDoc.endIndex
      );
      const res = await appendToGoogleDoc(token, loadedDoc.documentId, appendPlan);
      setConfirmAppendOpen(false);
      setAppendSuccess(
        `Материалы (${appendPlan.stats.lectureCount} лекц.) успешно добавлены в конец документа «${loadedDoc.title}».`
      );
      onRecordDoc({
        documentId: res.documentId,
        title: loadedDoc.title,
        url: res.url,
        action: 'appended',
        updatedAt: new Date().toLocaleTimeString('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      });
      // Refresh loaded document preview so the user sees updated content
      const refreshed = await fetchGoogleDocById(token, loadedDoc.documentId);
      setLoadedDoc(refreshed);
    } catch (err) {
      setConfirmAppendOpen(false);
      if (err instanceof GoogleDocsApiError && err.requiresReauth) {
        onSessionExpired();
      }
      setApiError(
        err instanceof Error
          ? err.message
          : 'Не удалось обновить документ Google Docs.'
      );
    } finally {
      setIsAppending(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!validateSelection(true)) return;
    const markdown = buildMarkdownExport(
      exportOptions,
      lectures,
      figures,
      marginNotes
    );
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'konspekt-russkaya-literatura-19-vek.md';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyPlainText = async () => {
    if (!validateSelection(false)) return;
    try {
      await navigator.clipboard.writeText(docPlan.plainText);
      setCopiedLocal(true);
      window.setTimeout(() => setCopiedLocal(false), 2000);
    } catch {
      setApiError('Браузер ограничил доступ к буферу обмена.');
    }
  };

  const selectedLectureNames = lectures
    .filter((l) => exportOptions.selectedLectureIds.includes(l.id))
    .map((l) => `Лекция ${l.number}. ${l.shortTitle}`);

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-10 pb-20">
      {/* Header & Google Account Connection Strip */}
      <header className="pb-6 border-b border-[#D6CEBE] flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-2xl">
          <p className="font-mono text-xs tracking-wider text-[#57534E]">
            Google Docs · Экспорт, чтение и дополнение конспекта
          </p>
          <h1 className="mt-2 font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917]">
            Мастерская документов Google Docs
          </h1>
          <p className="mt-2.5 text-sm text-[#57534E] leading-relaxed">
            Создайте структурированный Google Doc со всеми заголовками,
            выделенными именами, цитатами, вашими заметками на полях и указателем
            персоналий — или откройте существующий документ для чтения и
            дополнения.
          </p>
        </div>

        {/* Auth Control Card */}
        <div className="p-4 bg-[#F2EDE4]/70 border border-[#E6DFD3] rounded-md min-w-[290px]">
          {needsAuth || !user ? (
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-[#292524]">
                Подключите аккаунт Google для работы с Google Docs
              </p>
              <GoogleSignInButton
                onClick={onLogin}
                disabled={isLoggingIn}
                label={isLoggingIn ? 'Выполняется вход…' : 'Sign in with Google'}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-mono text-[#14532D]">
                  Подключено к Google Docs
                </p>
                <p className="mt-0.5 text-sm font-medium text-[#1C1917] truncate">
                  {user.displayName || user.email}
                </p>
                {user.email && user.displayName && (
                  <p className="text-xs text-[#57534E] truncate">{user.email}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="px-3 py-2 text-xs font-medium text-[#57534E] hover:text-[#1C1917] border border-[#D6CEBE] bg-[#FBF9F5] rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Выйти</span>
              </button>
            </div>
          )}

          {authError && (
            <p role="alert" className="mt-2.5 text-xs text-[#991B1B]">
              {authError}
            </p>
          )}
        </div>
      </header>

      {/* Studio Mode Switcher */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div
          className="inline-flex items-center gap-1 p-1 bg-[#F2EDE4] rounded-md"
          role="tablist"
          aria-label="Режим работы с Google Docs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={studioTab === 'create'}
            onClick={() => {
              setStudioTab('create');
              setApiError(null);
            }}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-sm transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              studioTab === 'create'
                ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <FilePlus2 className="w-4 h-4" aria-hidden="true" />
            <span>Создать новый Google Doc</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={studioTab === 'append'}
            onClick={() => {
              setStudioTab('append');
              setApiError(null);
            }}
            className={`px-4 py-2 text-xs sm:text-sm font-medium rounded-sm transition-colors inline-flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              studioTab === 'append'
                ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <FolderOpen className="w-4 h-4" aria-hidden="true" />
            <span>Открыть и дополнить существующий</span>
          </button>
        </div>

        {/* Local offline export utilities */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyPlainText}
            className="px-3.5 py-2 text-xs font-medium text-[#292524] border border-[#D6CEBE] hover:bg-[#F2EDE4] rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            {copiedLocal ? (
              <Check className="w-3.5 h-3.5 text-[#14532D]" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{copiedLocal ? 'Скопировано' : 'Копировать текст'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="px-3.5 py-2 text-xs font-medium text-[#292524] border border-[#D6CEBE] hover:bg-[#F2EDE4] rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Скачать .md</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Studio Grid */}
      <div className="mt-7 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Left Column: Configuration & Controls */}
        <div className="lg:col-span-5 min-w-0 space-y-5">
          {studioTab === 'create' ? (
            <div className="space-y-3">
              <div>
                <label
                  htmlFor="gdoc-title-input"
                  className="block text-xs font-medium text-[#292524] mb-1.5"
                >
                  Название нового документа Google Docs
                </label>
                <input
                  id="gdoc-title-input"
                  type="text"
                  value={exportOptions.title}
                  onChange={(e) => {
                    onUpdateExportOptions({
                      ...exportOptions,
                      title: e.target.value,
                    });
                    if (titleError) setTitleError('');
                  }}
                  placeholder="Например: Конспект лекций — Русская литература XIX века"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1E3A8A]"
                />
                {titleError && (
                  <p role="alert" className="mt-1.5 text-xs text-[#991B1B]">
                    {titleError}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleCreateGoogleDoc}
                disabled={isCreating}
                className="w-full py-2.5 px-5 text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-md transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                <FileText className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {isCreating
                    ? 'Создание документа в Google Docs…'
                    : 'Создать форматированный Google Doc'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <form
                onSubmit={handleFetchExistingDoc}
                className="p-4 bg-[#F2EDE4]/60 border border-[#E6DFD3] rounded-md space-y-3"
              >
                <div>
                  <label
                    htmlFor="existing-doc-url"
                    className="block text-xs font-medium text-[#292524] mb-1.5"
                  >
                    Ссылка на существующий Google Doc или его ID
                  </label>
                  <input
                    id="existing-doc-url"
                    type="text"
                    value={docUrlInput}
                    onChange={(e) => {
                      setDocUrlInput(e.target.value);
                      if (docUrlError) setDocUrlError('');
                    }}
                    placeholder="https://docs.google.com/document/d/.../edit"
                    className="w-full px-3.5 py-2 text-sm bg-white border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1E3A8A]"
                  />
                  {parsedInputId && (
                    <p className="mt-1.5 font-mono text-xs text-[#14532D]">
                      Распознан ID документа: {parsedInputId}
                    </p>
                  )}
                  {docUrlError && (
                    <p role="alert" className="mt-1.5 text-xs text-[#991B1B]">
                      {docUrlError}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoadingDoc}
                  className="w-full py-2 px-4 text-sm font-medium text-[#1C1917] bg-[#FBF9F5] hover:bg-[#E6DFD3] border border-[#D6CEBE] rounded-md transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isLoadingDoc
                    ? 'Загрузка документа…'
                    : 'Загрузить документ из Google Docs'}
                </button>
              </form>

              <button
                type="button"
                onClick={handleRequestAppendConfirmation}
                disabled={isAppending || !loadedDoc}
                className="w-full py-2.5 px-5 text-sm font-medium text-white bg-[#1E3A8A] hover:bg-[#172E6E] rounded-md transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <FilePlus2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {isAppending
                    ? 'Добавление в документ…'
                    : 'Дополнить открытый Google Doc'}
                </span>
              </button>
            </div>
          )}

          {apiError && (
            <div
              role="alert"
              className="p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-md text-xs text-[#991B1B] leading-relaxed"
            >
              {apiError}
            </div>
          )}

          {createSuccess && (
            <div
              role="status"
              className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-md space-y-2"
            >
              <p className="text-xs font-semibold text-[#14532D]">
                Документ создан в Google Docs
              </p>
              <p className="text-sm text-[#1C1917]">{createSuccess.title}</p>
              <a
                href={createSuccess.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1E3A8A] hover:underline"
              >
                <span>Открыть в Google Docs</span>
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
              </a>
            </div>
          )}

          {appendSuccess && (
            <div
              role="status"
              className="p-4 bg-[#F0FDF4] border border-[#BBF7D0] rounded-md text-xs text-[#14532D] leading-relaxed"
            >
              {appendSuccess}
            </div>
          )}

          {/* Lecture Selection Checklist */}
          <fieldset className="pt-4 border-t border-[#E6DFD3] min-w-0 w-full">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2.5">
              <legend className="font-editorial text-xl font-semibold text-[#1C1917]">
                Состав документа ({exportOptions.selectedLectureIds.length} из{' '}
                {lectures.length})
              </legend>
              <div className="flex items-center gap-3 text-xs shrink-0">
                <button
                  type="button"
                  onClick={selectAllLectures}
                  className="text-[#1E3A8A] hover:underline whitespace-nowrap cursor-pointer"
                >
                  Выбрать все
                </button>
                <button
                  type="button"
                  onClick={clearSelectedLectures}
                  className="text-[#57534E] hover:text-[#1C1917] whitespace-nowrap cursor-pointer"
                >
                  Снять все
                </button>
              </div>
            </div>

            <div className="divide-y divide-[#E6DFD3] border-y border-[#D6CEBE]">
              {lectures.map((lecture) => {
                const checked = exportOptions.selectedLectureIds.includes(
                  lecture.id
                );
                return (
                  <label
                    key={lecture.id}
                    className={`flex items-start gap-3 py-2.5 px-1 transition-colors cursor-pointer ${
                      checked ? 'opacity-100' : 'opacity-65 hover:opacity-100'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleLecture(lecture.id)}
                      className="mt-0.5 w-4 h-4 accent-[#1E3A8A] cursor-pointer shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#1C1917] leading-snug">
                        {lecture.number}. {lecture.shortTitle}
                      </p>
                      <p className="font-mono text-xs text-[#57534E] leading-snug">
                        {lecture.sourceLabel} · {lecture.sections.length} разд.
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {selectionError && (
              <p role="alert" className="mt-2 text-xs text-[#991B1B]">
                {selectionError}
              </p>
            )}
          </fieldset>

          {/* Additional Export Switches */}
          <fieldset className="pt-3 space-y-2">
            <legend className="font-editorial text-lg font-semibold text-[#1C1917] mb-1.5">
              Дополнительные элементы
            </legend>

            <label className="flex items-center gap-2.5 text-sm text-[#292524] cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeEditorialSupplements}
                onChange={(e) =>
                  onUpdateExportOptions({
                    ...exportOptions,
                    includeEditorialSupplements: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[#1E3A8A] cursor-pointer"
              />
              <span>Сохранить филологические уточнения (доп!)</span>
            </label>

            <label className="flex items-center gap-2.5 text-sm text-[#292524] cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeMarginNotes}
                onChange={(e) =>
                  onUpdateExportOptions({
                    ...exportOptions,
                    includeMarginNotes: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[#1E3A8A] cursor-pointer"
              />
              <span>
                Включить личные заметки на полях ({marginNotes.length})
              </span>
            </label>

            <label className="flex items-center gap-2.5 text-sm text-[#292524] cursor-pointer">
              <input
                type="checkbox"
                checked={exportOptions.includeFiguresAppendix}
                onChange={(e) =>
                  onUpdateExportOptions({
                    ...exportOptions,
                    includeFiguresAppendix: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[#1E3A8A] cursor-pointer"
              />
              <span>Добавить приложение «Указатель персоналий и дат»</span>
            </label>
          </fieldset>
        </div>

        {/* Right Column: Live Document Preview & Session History */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quantitative Document Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-5 border-b border-[#E6DFD3]">
            <div>
              <p className="text-xs text-[#57534E]">Лекций</p>
              <p className="mt-1 font-mono text-xl font-medium text-[#1C1917] tabular-nums">
                {docPlan.stats.lectureCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#57534E]">Разделов</p>
              <p className="mt-1 font-mono text-xl font-medium text-[#1C1917] tabular-nums">
                {docPlan.stats.sectionCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#57534E]">Персоналий</p>
              <p className="mt-1 font-mono text-xl font-medium text-[#1C1917] tabular-nums">
                {docPlan.stats.figureCount}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#57534E]">Символов</p>
              <p className="mt-1 font-mono text-xl font-medium text-[#1C1917] tabular-nums">
                {docPlan.stats.characterCount.toLocaleString('ru-RU')}
              </p>
            </div>
          </div>

          {/* Loaded Existing Doc View when in Append Mode */}
          {studioTab === 'append' && (
            <div className="p-6 bg-white border border-[#D6CEBE] rounded-md">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-3 border-b border-[#E6DFD3]">
                <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                  {loadedDoc
                    ? `Открытый документ: ${loadedDoc.title}`
                    : 'Предпросмотр открытого Google Doc'}
                </h2>
                {loadedDoc && (
                  <a
                    href={`https://docs.google.com/document/d/${loadedDoc.documentId}/edit`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3A8A] hover:underline"
                  >
                    <span>Открыть оригинал</span>
                    <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                  </a>
                )}
              </div>

              {!loadedDoc ? (
                <p className="mt-4 text-sm text-[#57534E] leading-relaxed">
                  Вставьте ссылку на существующий документ Google Docs слева и
                  нажмите «Загрузить документ из Google Docs», чтобы просмотреть
                  его содержимое и безопасно добавить выбранные лекции в конец
                  файла.
                </p>
              ) : (
                <div className="mt-4 space-y-2 max-h-64 overflow-y-auto pr-2">
                  <p className="font-mono text-xs text-[#57534E] tabular-nums">
                    Абзацев: {loadedDoc.paragraphs.length} · Символов:{' '}
                    {loadedDoc.characterCount.toLocaleString('ru-RU')}
                  </p>
                  {loadedDoc.paragraphs.length === 0 ? (
                    <p className="text-sm italic text-[#78716C]">
                      Документ пока пуст — новые разделы будут вставлены с самого
                      начала.
                    </p>
                  ) : (
                    loadedDoc.paragraphs.slice(0, 20).map((para, i) => (
                      <p
                        key={i}
                        className="text-sm text-[#292524] leading-relaxed"
                      >
                        {para}
                      </p>
                    ))
                  )}
                  {loadedDoc.paragraphs.length > 20 && (
                    <p className="text-xs italic text-[#78716C]">
                      … и ещё {loadedDoc.paragraphs.length - 20} абзацев
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Formatted Page Preview Sheet (Deduplicated Title + Clean Typography) */}
          <div className="bg-white border border-[#D6CEBE] rounded-md p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-[#E6DFD3]">
              <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
                Предпросмотр макета Google Docs
              </h2>
              <span className="font-mono text-xs text-[#57534E] tabular-nums">
                Запросов форматирования: {docPlan.requests.length}
              </span>
            </div>

            {docPlan.stats.lectureCount === 0 ? (
              <p className="mt-6 text-sm text-[#57534E]">
                Выберите хотя бы одну лекцию слева, чтобы увидеть структуру
                будущего документа.
              </p>
            ) : (
              <div className="mt-5 max-h-[540px] overflow-y-auto pr-2 space-y-2.5 text-sm text-[#292524] leading-relaxed">
                {docPlan.plainText
                  .slice(0, 6500)
                  .split('\n')
                  .filter((line) => line.trim().length > 0)
                  .map((line, index) => {
                    if (index === 0) {
                      return (
                        <p
                          key={index}
                          className="font-editorial text-2xl font-semibold text-[#1C1917] leading-snug"
                        >
                          {line}
                        </p>
                      );
                    }
                    if (index === 1) {
                      return (
                        <p
                          key={index}
                          className="text-xs font-mono text-[#57534E] pb-3 border-b border-[#E6DFD3]"
                        >
                          {line}
                        </p>
                      );
                    }
                    if (
                      line.startsWith('ЛЕКЦИЯ ') ||
                      line.startsWith('Приложение.')
                    ) {
                      return (
                        <p
                          key={index}
                          className="pt-3 font-editorial text-xl font-semibold text-[#1C1917]"
                        >
                          {line}
                        </p>
                      );
                    }
                    if (/^\d+\.\d+\./.test(line)) {
                      return (
                        <p
                          key={index}
                          className="pt-2 font-semibold text-[14px] text-[#1E3A8A]"
                        >
                          {line}
                        </p>
                      );
                    }
                    return (
                      <p
                        key={index}
                        className="text-[13.5px] leading-[1.68] text-[#292524]"
                      >
                        {line}
                      </p>
                    );
                  })}
                {docPlan.plainText.length > 6500 && (
                  <p className="pt-3 text-xs italic text-[#78716C]">
                    … в предпросмотре показаны первые 6 500 из{' '}
                    {docPlan.plainText.length.toLocaleString('ru-RU')} символов;
                    при экспорте в Google Docs передаётся полный форматированный
                    текст.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Session Recent Docs List */}
          {recentDocs.length > 0 && (
            <div className="pt-2">
              <h3 className="font-editorial text-xl font-semibold text-[#1C1917]">
                Документы текущей сессии
              </h3>
              <ul className="mt-3 divide-y divide-[#E6DFD3] border-y border-[#D6CEBE]">
                {recentDocs.map((rec) => (
                  <li
                    key={`${rec.documentId}-${rec.updatedAt}`}
                    className="py-3 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#1C1917] truncate">
                        {rec.title}
                      </p>
                      <p className="font-mono text-xs text-[#57534E] tabular-nums">
                        {rec.action === 'created'
                          ? 'Создан'
                          : rec.action === 'appended'
                            ? 'Дополнен'
                            : 'Открыт'}{' '}
                        · {rec.updatedAt}
                      </p>
                    </div>
                    <a
                      href={rec.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#1E3A8A] hover:underline whitespace-nowrap shrink-0"
                    >
                      <span>Открыть</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Mandatory Confirmation Modal before mutating an existing Google Doc */}
      <ConfirmModal
        isOpen={confirmAppendOpen}
        title="Дополнить документ Google Docs?"
        description={
          loadedDoc
            ? `В конец существующего документа «${loadedDoc.title}» будет добавлен выбранный конспект. Существующий текст документа останется без удаления, но файл будет изменён.`
            : ''
        }
        details={[
          `Документ: ${loadedDoc?.title ?? ''}`,
          `Выбрано лекций (${selectedLectureNames.length}): ${selectedLectureNames.join(', ')}`,
          `Объём добавляемого текста: ${docPlan.stats.characterCount.toLocaleString('ru-RU')} символов`,
          exportOptions.includeMarginNotes && docPlan.stats.noteCount > 0
            ? `Включая личные заметки: ${docPlan.stats.noteCount}`
            : 'Без личных заметок на полях',
          exportOptions.includeFiguresAppendix
            ? `Включая указатель персоналий (${docPlan.stats.figureCount} записей)`
            : 'Без приложения персоналий',
        ]}
        confirmLabel="Подтвердить добавление"
        isBusy={isAppending}
        onConfirm={handleConfirmAppend}
        onCancel={() => setConfirmAppendOpen(false)}
      />
    </div>
  );
}
