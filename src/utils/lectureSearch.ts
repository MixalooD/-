import type {
  ContentBlock,
  FigureCategory,
  HistoricalFigure,
  InlineToken,
  Lecture,
  TimelineEra,
  TimelineEvent,
} from '../types/compendium';

/**
 * Parses **bold**, *italic*, and (доп! ...) editorial supplement segments into safe React tokens.
 */
export function parseInlineFormatting(input: string): InlineToken[] {
  if (!input) return [];

  const tokens: InlineToken[] = [];
  // Match (доп! ...), standalone (доп!), **bold**, or *italic*
  const pattern = /(\(доп![^)]*\)|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({
        type: 'text',
        value: input.slice(lastIndex, match.index),
      });
    }

    const segment = match[0];
    if (segment.startsWith('(доп!')) {
      tokens.push({
        type: 'supplement',
        value: segment,
      });
    } else if (segment.startsWith('**') && segment.endsWith('**')) {
      tokens.push({
        type: 'bold',
        value: segment.slice(2, -2),
      });
    } else if (segment.startsWith('*') && segment.endsWith('*')) {
      tokens.push({
        type: 'italic',
        value: segment.slice(1, -1),
      });
    } else {
      tokens.push({ type: 'text', value: segment });
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < input.length) {
    tokens.push({
      type: 'text',
      value: input.slice(lastIndex),
    });
  }

  return tokens;
}

/**
 * Removes markdown markers and optionally removes (доп! ...) annotations for clean plain text.
 */
export function stripInlineMarkers(
  input: string,
  includeEditorialSupplements = true
): string {
  let result = input;
  if (!includeEditorialSupplements) {
    result = result
      .replace(/\s*\*\(доп![^)]*\)\*/g, '')
      .replace(/\s*—\s*\(доп!\)/g, '')
      .replace(/\s*,\s*\(доп!\)/g, '')
      .replace(/\s*\(доп![^)]*\)/g, '');
  }
  return result
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export interface LectureSearchHit {
  lectureId: string;
  lectureNumber: number;
  lectureTitle: string;
  matchCount: number;
  matchedSections: Array<{
    sectionId: string;
    sectionTitle: string;
    excerpt: string;
  }>;
}

function collectBlockText(block: ContentBlock): string {
  switch (block.type) {
    case 'paragraph':
      return stripInlineMarkers(block.text, true);
    case 'quote':
      return `${stripInlineMarkers(block.text, true)} ${block.attribution}`;
    case 'note':
      return `${block.label} ${stripInlineMarkers(block.text, true)}`;
    case 'bullets':
      return block.items
        .map((item) => {
          const base = stripInlineMarkers(item.text, true);
          const subs = item.subBullets
            ? item.subBullets.map((s) => stripInlineMarkers(s, true)).join(' ')
            : '';
          return `${base} ${subs}`;
        })
        .join(' ');
  }
}

function makeExcerpt(text: string, normalizedQuery: string): string {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(normalizedQuery);
  if (idx === -1) return text.slice(0, 140);
  const start = Math.max(0, idx - 55);
  const end = Math.min(text.length, idx + normalizedQuery.length + 85);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < text.length ? '…' : '';
  return `${prefix}${text.slice(start, end).trim()}${suffix}`;
}

export function searchLectures(
  lectures: Lecture[],
  query: string
): LectureSearchHit[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const hits: LectureSearchHit[] = [];

  for (const lecture of lectures) {
    let matchCount = 0;
    const matchedSections: LectureSearchHit['matchedSections'] = [];

    const headerHaystack = `${lecture.title} ${lecture.leadSummary} ${lecture.keyConcepts.join(' ')}`.toLowerCase();
    if (headerHaystack.includes(normalized)) {
      matchCount += 1;
    }

    for (const section of lecture.sections) {
      const sectionText = [
        section.title,
        ...section.blocks.map(collectBlockText),
      ].join(' ');
      const lower = sectionText.toLowerCase();

      if (lower.includes(normalized)) {
        // Count occurrences safely
        let countInSection = 0;
        let pos = 0;
        while ((pos = lower.indexOf(normalized, pos)) !== -1) {
          countInSection += 1;
          pos += normalized.length;
        }
        matchCount += countInSection;
        matchedSections.push({
          sectionId: section.id,
          sectionTitle: section.title,
          excerpt: makeExcerpt(sectionText, normalized),
        });
      }
    }

    if (matchCount > 0) {
      hits.push({
        lectureId: lecture.id,
        lectureNumber: lecture.number,
        lectureTitle: lecture.title,
        matchCount,
        matchedSections,
      });
    }
  }

  return hits;
}

export function filterFigures(
  figures: HistoricalFigure[],
  query: string,
  category: FigureCategory | 'all',
  sortBy: 'alpha' | 'birthYear'
): HistoricalFigure[] {
  const normalized = query.trim().toLowerCase();

  const filtered = figures.filter((fig) => {
    if (category !== 'all' && fig.category !== category) {
      return false;
    }
    if (!normalized) return true;
    const haystack = `${fig.fullName} ${fig.shortName} ${fig.role} ${fig.contextInLectures} ${fig.yearsLabel}`.toLowerCase();
    return haystack.includes(normalized);
  });

  return [...filtered].sort((a, b) => {
    if (sortBy === 'birthYear') {
      return a.birthYear - b.birthYear;
    }
    return a.sortKey.localeCompare(b.sortKey, 'ru');
  });
}

export function filterTimeline(
  events: TimelineEvent[],
  era: TimelineEra | 'all'
): TimelineEvent[] {
  const filtered =
    era === 'all' ? events : events.filter((event) => event.era === era);
  return [...filtered].sort((a, b) => a.year - b.year);
}
