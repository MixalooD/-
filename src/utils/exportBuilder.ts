import type {
  ContentBlock,
  ExportOptions,
  HistoricalFigure,
  Lecture,
  MarginNote,
} from '../types/compendium';
import { stripInlineMarkers } from './lectureSearch';

export interface ExportStats {
  lectureCount: number;
  sectionCount: number;
  noteCount: number;
  figureCount: number;
  characterCount: number;
  wordCount: number;
}

export interface ExportBundle {
  title: string;
  markdown: string;
  plainText: string;
  selectedLectures: Lecture[];
  includedNotes: MarginNote[];
  includedFigures: HistoricalFigure[];
  stats: ExportStats;
}

const DEFAULT_TITLE = 'Конспект лекций: Русская литература XIX века';

function cleanSupplementsOnly(rawText: string): string {
  return rawText
    .replace(/\s*\*\(доп![^)]*\)\*/g, '')
    .replace(/\s*—\s*\(доп!\)/g, '')
    .replace(/\s*,\s*\(доп!\)/g, '')
    .replace(/\s*\(доп![^)]*\)/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function formatMarkdownText(rawText: string, includeSupplements: boolean): string {
  return includeSupplements ? rawText : cleanSupplementsOnly(rawText);
}

function appendPlainBlock(
  block: ContentBlock,
  includeSupplements: boolean,
  lines: string[]
) {
  switch (block.type) {
    case 'paragraph':
      lines.push(stripInlineMarkers(block.text, includeSupplements), '');
      break;
    case 'quote':
      lines.push(
        `«${stripInlineMarkers(block.text, includeSupplements)}»`,
        `— ${block.attribution}`,
        ''
      );
      break;
    case 'note':
      lines.push(
        `${block.label}: ${stripInlineMarkers(block.text, includeSupplements)}`,
        ''
      );
      break;
    case 'bullets':
      block.items.forEach((item, idx) => {
        const prefix = block.ordered ? `${idx + 1}. ` : '• ';
        lines.push(`${prefix}${stripInlineMarkers(item.text, includeSupplements)}`);
        if (item.subBullets) {
          for (const sub of item.subBullets) {
            lines.push(`   – ${stripInlineMarkers(sub, includeSupplements)}`);
          }
        }
      });
      lines.push('');
      break;
  }
}

/**
 * Generates a clean local Markdown document matching the export configuration.
 */
export function buildMarkdownExport(
  options: ExportOptions,
  allLectures: Lecture[],
  allFigures: HistoricalFigure[],
  marginNotes: MarginNote[]
): string {
  const selectedLectures = allLectures.filter((l) =>
    options.selectedLectureIds.includes(l.id)
  );
  const lines: string[] = [];
  const docTitle = options.title.trim() || DEFAULT_TITLE;

  lines.push(`# ${docTitle}`, '');

  for (const lecture of selectedLectures) {
    lines.push(`## ЛЕКЦИЯ ${lecture.number}. ${lecture.title}`);
    lines.push(`*${lecture.sourceLabel} (${lecture.eraSpan})*`, '');

    for (const section of lecture.sections) {
      lines.push(`### ${section.number}. ${section.title}`);
      for (const block of section.blocks) {
        if (block.type === 'paragraph') {
          lines.push(
            formatMarkdownText(block.text, options.includeEditorialSupplements),
            ''
          );
        } else if (block.type === 'quote') {
          lines.push(
            `> *${formatMarkdownText(block.text, options.includeEditorialSupplements)}*`,
            `> — ${block.attribution}`,
            ''
          );
        } else if (block.type === 'note') {
          lines.push(
            `**${block.label}:** ${formatMarkdownText(block.text, options.includeEditorialSupplements)}`,
            ''
          );
        } else if (block.type === 'bullets') {
          block.items.forEach((item, idx) => {
            const prefix = block.ordered ? `${idx + 1}. ` : '- ';
            const text = formatMarkdownText(
              item.text,
              options.includeEditorialSupplements
            );
            lines.push(`${prefix}${text}`);
            if (item.subBullets) {
              for (const sub of item.subBullets) {
                const subText = formatMarkdownText(
                  sub,
                  options.includeEditorialSupplements
                );
                lines.push(`  - ${subText}`);
              }
            }
          });
          lines.push('');
        }
      }
    }

    if (options.includeMarginNotes) {
      const notes = marginNotes.filter((n) => n.lectureId === lecture.id);
      if (notes.length > 0) {
        lines.push('#### Личные заметки на полях');
        for (const n of notes) {
          const prefix = n.sectionTitle ? `**${n.sectionTitle}:** ` : '';
          lines.push(`- ${prefix}${n.content}`);
        }
        lines.push('');
      }
    }
  }

  if (options.includeFiguresAppendix) {
    const figures = allFigures
      .filter((f) =>
        f.lectureIds.some((id) => options.selectedLectureIds.includes(id))
      )
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'ru'));

    if (figures.length > 0) {
      lines.push('## Приложение. Указатель персоналий и дат', '');
      for (const fig of figures) {
        lines.push(
          `- **${fig.fullName}** (${fig.yearsLabel}) — ${fig.role}. ${fig.contextInLectures}`
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Generates a clean plain-text export without Markdown markers for direct pasting.
 */
export function buildPlainTextExport(
  options: ExportOptions,
  allLectures: Lecture[],
  allFigures: HistoricalFigure[],
  marginNotes: MarginNote[]
): string {
  const selectedLectures = allLectures.filter((l) =>
    options.selectedLectureIds.includes(l.id)
  );
  const lines: string[] = [];
  const docTitle = options.title.trim() || DEFAULT_TITLE;

  lines.push(docTitle.toUpperCase(), '');

  for (const lecture of selectedLectures) {
    lines.push(`ЛЕКЦИЯ ${lecture.number}. ${lecture.title}`);
    lines.push(`${lecture.sourceLabel} (${lecture.eraSpan})`, '');

    for (const section of lecture.sections) {
      lines.push(`${section.number}. ${section.title}`);
      for (const block of section.blocks) {
        appendPlainBlock(block, options.includeEditorialSupplements, lines);
      }
    }

    if (options.includeMarginNotes) {
      const notes = marginNotes.filter((n) => n.lectureId === lecture.id);
      if (notes.length > 0) {
        lines.push('Личные заметки на полях:');
        for (const n of notes) {
          const prefix = n.sectionTitle ? `[${n.sectionTitle}] ` : '• ';
          lines.push(`${prefix}${n.content}`);
        }
        lines.push('');
      }
    }
  }

  if (options.includeFiguresAppendix) {
    const figures = allFigures
      .filter((f) =>
        f.lectureIds.some((id) => options.selectedLectureIds.includes(id))
      )
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'ru'));

    if (figures.length > 0) {
      lines.push('ПРИЛОЖЕНИЕ. УКАЗАТЕЛЬ ПЕРСОНАЛИЙ И ДАТ', '');
      for (const fig of figures) {
        lines.push(
          `• ${fig.fullName} (${fig.yearsLabel}) — ${fig.role}. ${fig.contextInLectures}`
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd() + '\n';
}

/**
 * Builds the complete local export bundle (Markdown, Plain Text, selected records, and stats).
 */
export function buildExportBundle(
  options: ExportOptions,
  allLectures: Lecture[],
  allFigures: HistoricalFigure[],
  marginNotes: MarginNote[]
): ExportBundle {
  const selectedLectures = allLectures.filter((l) =>
    options.selectedLectureIds.includes(l.id)
  );
  const includedNotes = options.includeMarginNotes
    ? marginNotes.filter((n) => options.selectedLectureIds.includes(n.lectureId))
    : [];
  const includedFigures = options.includeFiguresAppendix
    ? allFigures
        .filter((f) =>
          f.lectureIds.some((id) => options.selectedLectureIds.includes(id))
        )
        .sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'ru'))
    : [];

  const title = options.title.trim() || DEFAULT_TITLE;
  const markdown = buildMarkdownExport(
    options,
    allLectures,
    allFigures,
    marginNotes
  );
  const plainText = buildPlainTextExport(
    options,
    allLectures,
    allFigures,
    marginNotes
  );
  const sectionCount = selectedLectures.reduce(
    (sum, lecture) => sum + lecture.sections.length,
    0
  );
  const trimmedPlain = plainText.trim();
  const wordCount = trimmedPlain ? trimmedPlain.split(/\s+/).length : 0;

  return {
    title,
    markdown,
    plainText,
    selectedLectures,
    includedNotes,
    includedFigures,
    stats: {
      lectureCount: selectedLectures.length,
      sectionCount,
      noteCount: includedNotes.length,
      figureCount: includedFigures.length,
      characterCount: plainText.length,
      wordCount,
    },
  };
}

/**
 * Sanitizes a Cyrillic/Latin title into a safe download filename.
 */
export function buildExportFilename(title: string, extension: 'md' | 'txt'): string {
  const cleaned = title
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 72)
    .replace(/-+$/g, '');
  return `${cleaned || 'slovesnost-xix-konspekt'}.${extension}`;
}
