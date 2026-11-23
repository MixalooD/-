import type {
  ContentBlock,
  ExportOptions,
  HistoricalFigure,
  Lecture,
  MarginNote,
} from '../types/compendium';
import { parseInlineFormatting, stripInlineMarkers } from './lectureSearch';

export interface GoogleDocsBatchRequest {
  insertText?: {
    location: { index: number };
    text: string;
  };
  updateParagraphStyle?: {
    range: { startIndex: number; endIndex: number };
    paragraphStyle: {
      namedStyleType: 'TITLE' | 'SUBTITLE' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'NORMAL_TEXT';
    };
    fields: 'namedStyleType';
  };
  updateTextStyle?: {
    range: { startIndex: number; endIndex: number };
    textStyle: {
      bold?: boolean;
      italic?: boolean;
    };
    fields: string;
  };
}

export interface CompendiumDocPlan {
  title: string;
  plainText: string;
  requests: GoogleDocsBatchRequest[];
  stats: {
    lectureCount: number;
    sectionCount: number;
    characterCount: number;
    paragraphCount: number;
    noteCount: number;
    figureCount: number;
  };
}

/**
 * Extracts a Google Docs document ID from a full Google Docs URL or validates a raw ID.
 */
export function extractGoogleDocId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match full Google Docs URL: https://docs.google.com/document/d/<ID>/...
  const urlMatch = trimmed.match(
    /^https?:\/\/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{15,})(?:[/?#].*)?$/
  );
  if (urlMatch) {
    return urlMatch[1];
  }

  // Match raw document ID (typically 25-60 chars, allow >= 15 alphanumeric, dash, underscore)
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed) && !trimmed.includes('http')) {
    return trimmed;
  }

  return null;
}

interface TextRunSpan {
  start: number;
  end: number;
  bold?: boolean;
  italic?: boolean;
}

function buildInlinePlainAndSpans(
  rawText: string,
  includeSupplements: boolean
): { text: string; spans: TextRunSpan[] } {
  let source = rawText;
  if (!includeSupplements) {
    source = source
      .replace(/\s*\*\(доп![^)]*\)\*/g, '')
      .replace(/\s*—\s*\(доп!\)/g, '')
      .replace(/\s*,\s*\(доп!\)/g, '')
      .replace(/\s*\(доп![^)]*\)/g, '');
  }

  const tokens = parseInlineFormatting(source);
  let out = '';
  const spans: TextRunSpan[] = [];

  for (const token of tokens) {
    if (!token.value) continue;
    const start = out.length;
    out += token.value;
    const end = out.length;

    if (token.type === 'bold' && end > start) {
      spans.push({ start, end, bold: true });
    } else if (token.type === 'italic' && end > start) {
      spans.push({ start, end, italic: true });
    } else if (token.type === 'supplement' && end > start) {
      spans.push({ start, end, italic: true });
    }
  }

  return { text: out, spans };
}

/**
 * Builds deterministic Google Docs API v1 batchUpdate requests with exact UTF-16 index math.
 * baseIndex = 1 for a newly created document, or (bodyEndIndex - 1) when appending to an existing Doc.
 */
export function buildCompendiumDocumentPlan(
  options: ExportOptions,
  allLectures: Lecture[],
  allFigures: HistoricalFigure[],
  marginNotes: MarginNote[],
  baseIndex = 1
): CompendiumDocPlan {
  const selectedLectures = allLectures.filter((lecture) =>
    options.selectedLectureIds.includes(lecture.id)
  );
  const includedNotes = options.includeMarginNotes
    ? marginNotes.filter((note) =>
        options.selectedLectureIds.includes(note.lectureId)
      )
    : [];
  const includedFigures = options.includeFiguresAppendix
    ? allFigures.filter((fig) =>
        fig.lectureIds.some((id) => options.selectedLectureIds.includes(id))
      )
    : [];

  let fullText = '';
  let cursor = baseIndex;
  let paragraphCount = 0;
  let sectionCount = 0;

  const paragraphRequests: GoogleDocsBatchRequest[] = [];
  const textStyleRequests: GoogleDocsBatchRequest[] = [];

  const appendParagraph = (
    rawText: string,
    style: 'TITLE' | 'SUBTITLE' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'NORMAL_TEXT',
    prefix = '',
    forceItalic = false
  ) => {
    const { text, spans } = buildInlinePlainAndSpans(
      rawText,
      options.includeEditorialSupplements
    );
    const line = `${prefix}${text}\n`;
    const startIndex = cursor;
    const endIndex = cursor + line.length;

    fullText += line;
    cursor = endIndex;
    paragraphCount += 1;

    if (style !== 'NORMAL_TEXT') {
      paragraphRequests.push({
        updateParagraphStyle: {
          range: { startIndex, endIndex },
          paragraphStyle: { namedStyleType: style },
          fields: 'namedStyleType',
        },
      });
    }

    if (forceItalic && endIndex - 1 > startIndex) {
      textStyleRequests.push({
        updateTextStyle: {
          range: { startIndex, endIndex: endIndex - 1 },
          textStyle: { italic: true },
          fields: 'italic',
        },
      });
    } else {
      const prefixOffset = prefix.length;
      for (const span of spans) {
        const absStart = startIndex + prefixOffset + span.start;
        const absEnd = startIndex + prefixOffset + span.end;
        if (absEnd > absStart) {
          const textStyle: { bold?: boolean; italic?: boolean } = {};
          const fields: string[] = [];
          if (span.bold) {
            textStyle.bold = true;
            fields.push('bold');
          }
          if (span.italic) {
            textStyle.italic = true;
            fields.push('italic');
          }
          if (fields.length > 0) {
            textStyleRequests.push({
              updateTextStyle: {
                range: { startIndex: absStart, endIndex: absEnd },
                textStyle,
                fields: fields.join(','),
              },
            });
          }
        }
      }
    }
  };

  if (baseIndex > 1) {
    // When appending to an existing document, insert a clear leading newline separator
    fullText += '\n';
    cursor += 1;
  }

  const docTitle = options.title.trim() || 'Конспект лекций: Русская литература XIX века';
  appendParagraph(docTitle, baseIndex === 1 ? 'TITLE' : 'HEADING_1');
  appendParagraph(
    `История русской литературы первой половины XIX века · Лекций в подборке: ${selectedLectures.length}`,
    'SUBTITLE'
  );

  for (const lecture of selectedLectures) {
    appendParagraph(
      `ЛЕКЦИЯ ${lecture.number}. ${lecture.title}`,
      'HEADING_1'
    );
    appendParagraph(`${lecture.sourceLabel} (${lecture.eraSpan})`, 'NORMAL_TEXT', '', true);

    for (const section of lecture.sections) {
      sectionCount += 1;
      appendParagraph(`${section.number}. ${section.title}`, 'HEADING_2');

      for (const block of section.blocks) {
        appendContentBlock(block, appendParagraph);
      }
    }

    const lectureNotes = includedNotes.filter((n) => n.lectureId === lecture.id);
    if (lectureNotes.length > 0) {
      appendParagraph('Личные заметки на полях', 'HEADING_3');
      for (const note of lectureNotes) {
        const prefix = note.sectionTitle ? `[${note.sectionTitle}] ` : '• ';
        appendParagraph(note.content, 'NORMAL_TEXT', prefix);
      }
    }
  }

  if (includedFigures.length > 0) {
    appendParagraph('Приложение. Указатель персоналий и дат', 'HEADING_1');
    const sortedFigures = [...includedFigures].sort((a, b) =>
      a.sortKey.localeCompare(b.sortKey, 'ru')
    );
    for (const figure of sortedFigures) {
      appendParagraph(
        `**${figure.fullName}** (${figure.yearsLabel}) — ${figure.role}. ${figure.contextInLectures}`,
        'NORMAL_TEXT',
        '• '
      );
    }
  }

  const requests: GoogleDocsBatchRequest[] = [];
  if (fullText.length > 0) {
    requests.push({
      insertText: {
        location: { index: baseIndex },
        text: fullText,
      },
    });
    requests.push(...paragraphRequests, ...textStyleRequests);
  }

  return {
    title: docTitle,
    plainText: fullText,
    requests,
    stats: {
      lectureCount: selectedLectures.length,
      sectionCount,
      characterCount: fullText.length,
      paragraphCount,
      noteCount: includedNotes.length,
      figureCount: includedFigures.length,
    },
  };
}

function appendContentBlock(
  block: ContentBlock,
  appendParagraph: (
    rawText: string,
    style: 'TITLE' | 'SUBTITLE' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'NORMAL_TEXT',
    prefix?: string,
    forceItalic?: boolean
  ) => void
) {
  switch (block.type) {
    case 'paragraph':
      appendParagraph(block.text, 'NORMAL_TEXT');
      break;
    case 'quote':
      appendParagraph(`«${block.text}» — ${block.attribution}`, 'NORMAL_TEXT', '', true);
      break;
    case 'note':
      appendParagraph(`**${block.label}:** ${block.text}`, 'NORMAL_TEXT');
      break;
    case 'bullets':
      block.items.forEach((item, index) => {
        const marker = block.ordered ? `${index + 1}. ` : '• ';
        appendParagraph(item.text, 'NORMAL_TEXT', marker);
        if (item.subBullets) {
          for (const sub of item.subBullets) {
            appendParagraph(sub, 'NORMAL_TEXT', '   – ');
          }
        }
      });
      break;
  }
}

export interface ParsedGoogleDoc {
  documentId: string;
  title: string;
  paragraphs: string[];
  endIndex: number;
  characterCount: number;
}

/**
 * Extracts readable paragraphs and the safe append endIndex from a Google Docs API v1 document response.
 */
export function extractPlainTextFromGoogleDoc(docJson: {
  documentId?: string;
  title?: string;
  body?: {
    content?: Array<{
      endIndex?: number;
      paragraph?: {
        elements?: Array<{
          textRun?: { content?: string };
        }>;
      };
    }>;
  };
}): ParsedGoogleDoc {
  const paragraphs: string[] = [];
  let maxEndIndex = 1;

  const content = docJson.body?.content ?? [];
  for (const element of content) {
    if (typeof element.endIndex === 'number' && element.endIndex > maxEndIndex) {
      maxEndIndex = element.endIndex;
    }
    if (element.paragraph?.elements) {
      const line = element.paragraph.elements
        .map((el) => el.textRun?.content ?? '')
        .join('')
        .replace(/\n+$/, '');
      if (line.trim().length > 0) {
        paragraphs.push(line);
      }
    }
  }

  const characterCount = paragraphs.reduce((acc, p) => acc + p.length, 0);

  return {
    documentId: docJson.documentId ?? '',
    title: docJson.title ?? 'Без названия',
    paragraphs,
    // Google Docs requires inserting before the final trailing newline of the body
    endIndex: Math.max(1, maxEndIndex - 1),
    characterCount,
  };
}

/**
 * Generates a clean local Markdown document matching the exact Google Docs export configuration.
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
  const docTitle = options.title.trim() || 'Конспект лекций: Русская литература XIX века';

  lines.push(`# ${docTitle}`, '');

  for (const lecture of selectedLectures) {
    lines.push(`## ЛЕКЦИЯ ${lecture.number}. ${lecture.title}`);
    lines.push(`*${lecture.sourceLabel} (${lecture.eraSpan})*`, '');

    for (const section of lecture.sections) {
      lines.push(`### ${section.number}. ${section.title}`);
      for (const block of section.blocks) {
        if (block.type === 'paragraph') {
          lines.push(
            options.includeEditorialSupplements
              ? block.text
              : stripInlineMarkers(block.text, false),
            ''
          );
        } else if (block.type === 'quote') {
          lines.push(`> *${block.text}*`, `> — ${block.attribution}`, '');
        } else if (block.type === 'note') {
          lines.push(`**${block.label}:** ${block.text}`, '');
        } else if (block.type === 'bullets') {
          block.items.forEach((item, idx) => {
            const prefix = block.ordered ? `${idx + 1}. ` : '- ';
            const text = options.includeEditorialSupplements
              ? item.text
              : stripInlineMarkers(item.text, false);
            lines.push(`${prefix}${text}`);
            if (item.subBullets) {
              for (const sub of item.subBullets) {
                const subText = options.includeEditorialSupplements
                  ? sub
                  : stripInlineMarkers(sub, false);
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
          lines.push(`- ${n.content}`);
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
