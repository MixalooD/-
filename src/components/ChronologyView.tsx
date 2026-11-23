import { useMemo, useState } from 'react';
import type { Lecture, TimelineEra, TimelineEvent } from '../types/compendium';
import {
  BYRON_VS_PUSHKIN,
  LENORA_TRIAD,
  PUSHKIN_PERIODIZATION,
} from '../data/timeline';
import { filterTimeline } from '../utils/lectureSearch';

interface ChronologyViewProps {
  events: TimelineEvent[];
  lectures: Lecture[];
  onJumpToLecture: (lectureId: string) => void;
}

const ERA_FILTERS: Array<{ id: TimelineEra | 'all'; label: string }> = [
  { id: 'all', label: 'Вся эпоха (1773–1877)' },
  { id: 'ballad', label: 'Баллада и романтизм' },
  { id: 'salon', label: 'Литературный быт и Вяземский' },
  { id: 'decembrism', label: 'Декабризм' },
  { id: 'pushkin', label: 'Пушкинский путь' },
];

export function ChronologyView({
  events,
  lectures,
  onJumpToLecture,
}: ChronologyViewProps) {
  const [selectedEra, setSelectedEra] = useState<TimelineEra | 'all'>('all');

  const lectureMap = useMemo(() => {
    const map = new Map<string, Lecture>();
    for (const l of lectures) map.set(l.id, l);
    return map;
  }, [lectures]);

  const filteredEvents = useMemo(
    () => filterTimeline(events, selectedEra),
    [events, selectedEra]
  );

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-10 py-10 pb-20 space-y-16">
      {/* Header */}
      <header className="pb-6 border-b border-[#D6CEBE]">
        <p className="font-mono text-xs tracking-wider text-[#57534E] tabular-nums">
          1773–1877 · Хронология произведений, полемик и филологических сопоставлений
        </p>
        <h1 className="mt-2 font-editorial text-3xl sm:text-4xl font-semibold text-[#1C1917]">
          Хронология эпохи и сравнительные схемы
        </h1>
        <p className="mt-2.5 text-sm text-[#57534E] max-w-2xl leading-relaxed">
          Ключевые даты литературного процесса, периодизация «трёх семилетий»
          А. С. Пушкина по В. С. Непомнящему, триада переложений «Леноры» и
          сопоставление байронической и пушкинской романтической поэмы.
        </p>
      </header>

      {/* Section 1: Pushkin's Three Seven-Year Periods */}
      <section aria-labelledby="pushkin-periods-heading">
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pb-4 border-b border-[#E6DFD3]">
          <h2
            id="pushkin-periods-heading"
            className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917]"
          >
            Периодизация «трёх семилетий» А. С. Пушкина
          </h2>
          <span className="text-xs text-[#57534E]">
            По концепции В. С. Непомнящего · Лекция V
          </span>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PUSHKIN_PERIODIZATION.map((item, idx) => (
            <div
              key={item.stage}
              className="p-5 bg-[#F2EDE4]/60 border border-[#E6DFD3] rounded-md flex flex-col justify-between"
            >
              <div>
                <p className="font-mono text-xs text-[#78350F] tabular-nums">
                  0{idx + 1} · {item.years}
                </p>
                <h3 className="mt-2 font-editorial text-2xl font-semibold text-[#1C1917]">
                  {item.stage}
                </h3>
                <p className="mt-1 text-xs font-medium text-[#1E3A8A]">
                  {item.question}
                </p>
                <p className="mt-3 text-sm text-[#292524] leading-relaxed">
                  {item.summary}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 2: Comparative Philological Tables */}
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        {/* Triad of Lenora */}
        <div>
          <div className="pb-3 border-b border-[#E6DFD3] flex items-baseline justify-between gap-2">
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Триада переложений «Леноры» Г. А. Бюргера
            </h2>
            <button
              type="button"
              onClick={() => onJumpToLecture('lecture-1')}
              className="text-xs font-medium text-[#1E3A8A] hover:underline whitespace-nowrap cursor-pointer"
            >
              К лекции I
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#D6CEBE] text-xs font-mono text-[#57534E]">
                  <th className="py-2.5 pr-4 font-medium">Произведение</th>
                  <th className="py-2.5 pr-4 font-medium">Поэтика и стиль</th>
                  <th className="py-2.5 font-medium">Характер и финал</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DFD3]">
                {LENORA_TRIAD.map((row) => (
                  <tr key={row.work} className="align-top">
                    <td className="py-3.5 pr-4">
                      <p className="font-semibold text-[#1C1917]">{row.work}</p>
                      <p className="text-xs text-[#57534E] mt-0.5">
                        {row.author}
                      </p>
                    </td>
                    <td className="py-3.5 pr-4 text-[#292524] leading-relaxed">
                      {row.style}
                    </td>
                    <td className="py-3.5 text-[#292524] leading-relaxed">
                      <p>{row.heroine}</p>
                      <p className="mt-1 text-xs text-[#57534E]">{row.finale}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Byron vs Pushkin */}
        <div>
          <div className="pb-3 border-b border-[#E6DFD3] flex items-baseline justify-between gap-2">
            <h2 className="font-editorial text-2xl font-semibold text-[#1C1917]">
              Байрон и южные поэмы Пушкина
            </h2>
            <button
              type="button"
              onClick={() => onJumpToLecture('lecture-6')}
              className="text-xs font-medium text-[#1E3A8A] hover:underline whitespace-nowrap cursor-pointer"
            >
              К лекции VI
            </button>
          </div>
          <p className="mt-2.5 text-xs text-[#57534E]">
            По труду В. М. Жирмунского «Байрон и Пушкин» (1924): три отступления
            Пушкина от байронического канона.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#D6CEBE] text-xs font-mono text-[#57534E]">
                  <th className="py-2.5 pr-4 font-medium">Критерий</th>
                  <th className="py-2.5 pr-4 font-medium">Дж. Г. Байрон</th>
                  <th className="py-2.5 font-medium">А. С. Пушкин</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6DFD3]">
                {BYRON_VS_PUSHKIN.map((row) => (
                  <tr key={row.criterion} className="align-top">
                    <td className="py-3.5 pr-4 font-medium text-[#1C1917]">
                      {row.criterion}
                    </td>
                    <td className="py-3.5 pr-4 text-[#57534E] leading-relaxed">
                      {row.byron}
                    </td>
                    <td className="py-3.5 text-[#292524] leading-relaxed">
                      {row.pushkin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 3: Filterable Chronological Archive */}
      <section aria-labelledby="timeline-heading">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E6DFD3]">
          <h2
            id="timeline-heading"
            className="font-editorial text-2xl sm:text-3xl font-semibold text-[#1C1917]"
          >
            Хронологическая лента событий и текстов
          </h2>

          <div
            className="flex flex-wrap items-center gap-1 p-1 bg-[#F2EDE4] rounded-md"
            role="tablist"
            aria-label="Фильтр хронологии по темам"
          >
            {ERA_FILTERS.map((era) => {
              const active = selectedEra === era.id;
              return (
                <button
                  key={era.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedEra(era.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap cursor-pointer ${
                    active
                      ? 'bg-[#FBF9F5] text-[#1C1917] shadow-xs'
                      : 'text-[#57534E] hover:text-[#1C1917]'
                  }`}
                >
                  {era.label}
                </button>
              );
            })}
          </div>
        </div>

        <ol className="mt-6 divide-y divide-[#E6DFD3] border-b border-[#D6CEBE]">
          {filteredEvents.map((event) => {
            const lecture = lectureMap.get(event.lectureId);
            return (
              <li
                key={event.id}
                className="py-5 grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-6 items-baseline"
              >
                <div className="md:col-span-2">
                  <span className="font-mono text-sm font-medium text-[#78350F] tabular-nums">
                    {event.yearLabel}
                  </span>
                </div>

                <div className="md:col-span-7">
                  <h3 className="font-editorial text-xl font-semibold text-[#1C1917]">
                    {event.title}
                  </h3>
                  {event.author && (
                    <p className="mt-0.5 text-xs text-[#57534E]">
                      {event.author}
                    </p>
                  )}
                  <p className="mt-1.5 text-sm text-[#292524] leading-relaxed">
                    {event.description}
                  </p>
                </div>

                <div className="md:col-span-3 md:text-right">
                  {lecture && (
                    <button
                      type="button"
                      onClick={() => onJumpToLecture(lecture.id)}
                      className="text-xs font-medium text-[#1E3A8A] hover:underline whitespace-nowrap cursor-pointer"
                    >
                      Лекция {lecture.number} · {lecture.shortTitle}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
