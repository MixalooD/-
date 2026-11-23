import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { FigureCategory, HistoricalFigure, Lecture } from '../types/compendium';
import { filterFigures } from '../utils/lectureSearch';

interface FiguresRegistryProps {
  figures: HistoricalFigure[];
  lectures: Lecture[];
  initialSearch?: string;
  onJumpToLecture: (lectureId: string) => void;
}

const CATEGORY_TABS: Array<{ id: FigureCategory | 'all'; label: string }> = [
  { id: 'all', label: 'Все персоналии' },
  { id: 'writers', label: 'Поэты и писатели' },
  { id: 'scholars', label: 'Исследователи и критики' },
  { id: 'decembrists_history', label: 'Декабристы и эпоха' },
  { id: 'foreign', label: 'Зарубежные авторы' },
];

const CATEGORY_LABELS: Record<FigureCategory, string> = {
  writers: 'Поэты и писатели',
  scholars: 'Исследователи и критики',
  decembrists_history: 'Декабристы и эпоха',
  foreign: 'Зарубежные авторы',
};

export function FiguresRegistry({
  figures,
  lectures,
  initialSearch = '',
  onJumpToLecture,
}: FiguresRegistryProps) {
  const [query, setQuery] = useState(initialSearch);
  const [category, setCategory] = useState<FigureCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'alpha' | 'birthYear'>('alpha');

  const lectureMap = useMemo(() => {
    const map = new Map<string, Lecture>();
    for (const lecture of lectures) {
      map.set(lecture.id, lecture);
    }
    return map;
  }, [lectures]);

  const filtered = useMemo(
    () => filterFigures(figures, query, category, sortBy),
    [figures, query, category, sortBy]
  );

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-10 pb-20">
      <header className="pb-6 border-b border-[#D6CEBE]">
        <p className="font-mono text-xs tracking-wider text-[#57534E] tabular-nums">
          Именной указатель · {figures.length} персоналий · Полные ФИО и годы жизни
        </p>
        <h1 className="mt-2 font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917]">
          Персоналии, критики и исследователи
        </h1>
        <p className="mt-2.5 text-sm text-[#57534E] max-w-2xl leading-relaxed">
          Справочник всех исторических лиц, поэтов, декабристов и филологов,
          упомянутых в курсе лекций, с перекрёстными ссылками на соответствующие
          разделы.
        </p>
      </header>

      {/* Filter & Search Toolbar */}
      <div className="mt-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div
          className="flex flex-wrap items-center gap-1 p-1 bg-[#F2EDE4] rounded-md"
          role="tablist"
          aria-label="Фильтр по категории персоналий"
        >
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(tab.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                    : 'text-[#57534E] hover:text-[#1C1917]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <label htmlFor="figures-search" className="sr-only">
              Поиск по фамилии или контексту
            </label>
            <Search
              className="w-4 h-4 text-[#57534E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="figures-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Фамилия, произведение, роль…"
              className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-[#D6CEBE] rounded-md text-[#1C1917] placeholder:text-[#78716C] focus:outline-none focus:border-[#1E3A8A]"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Очистить поиск персоналий"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#57534E] hover:text-[#1C1917] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label
              htmlFor="figures-sort"
              className="text-xs text-[#57534E] whitespace-nowrap"
            >
              Сортировка:
            </label>
            <select
              id="figures-sort"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as 'alpha' | 'birthYear')
              }
              className="px-3 py-2 text-xs bg-white border border-[#D6CEBE] rounded-md text-[#1C1917] focus:outline-none focus:border-[#1E3A8A]"
            >
              <option value="alpha">По алфавиту</option>
              <option value="birthYear">По году рождения</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <p className="mt-5 text-xs font-mono text-[#57534E] tabular-nums">
        Отображено записей: {filtered.length} из {figures.length}
      </p>

      {/* Editorial Index List */}
      {filtered.length === 0 ? (
        <div className="mt-8 py-12 text-center border border-[#E6DFD3] rounded-md bg-[#F2EDE4]/40">
          <p className="font-editorial text-2xl text-[#1C1917]">
            Записи не найдены
          </p>
          <p className="mt-2 text-sm text-[#57534E]">
            Измените поисковый запрос или сбросьте фильтр категории.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('all');
            }}
            className="mt-4 px-4 py-2 text-xs font-medium text-[#1E3A8A] border border-[#1E3A8A] rounded-md hover:bg-[#1E3A8A] hover:text-white transition-colors cursor-pointer"
          >
            Сбросить фильтры
          </button>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-[#E6DFD3] border-y border-[#D6CEBE]">
          {filtered.map((figure) => (
            <div
              key={figure.id}
              className="py-5 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-baseline"
            >
              <div className="md:col-span-4">
                <h2 className="font-editorial text-xl font-semibold text-[#1C1917] leading-snug">
                  {figure.fullName}
                </h2>
                <p className="mt-1 text-xs text-[#57534E] tabular-nums">
                  <span className="font-mono text-[#78350F]">
                    {figure.yearsLabel}
                  </span>
                  <span className="mx-1.5" aria-hidden="true">
                    ·
                  </span>
                  <span>{CATEGORY_LABELS[figure.category]}</span>
                </p>
              </div>

              <div className="md:col-span-5">
                <p className="text-xs font-medium text-[#57534E]">
                  {figure.role}
                </p>
                <p className="mt-1 text-sm text-[#292524] leading-relaxed">
                  {figure.contextInLectures}
                </p>
              </div>

              <div className="md:col-span-3 md:text-right flex flex-wrap md:justify-end gap-x-3 gap-y-1">
                {figure.lectureIds.map((lecId) => {
                  const lec = lectureMap.get(lecId);
                  if (!lec) return null;
                  return (
                    <button
                      key={lecId}
                      type="button"
                      onClick={() => onJumpToLecture(lecId)}
                      className="text-xs font-medium text-[#1E3A8A] hover:underline whitespace-nowrap cursor-pointer"
                    >
                      Лекция {lec.number} ({lec.shortTitle})
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
