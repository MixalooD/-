import test from 'node:test';
import assert from 'node:assert/strict';
import { LECTURES } from '../data/lectures';
import { HISTORICAL_FIGURES } from '../data/figures';
import { TIMELINE_EVENTS } from '../data/timeline';
import {
  filterFigures,
  filterTimeline,
  parseInlineFormatting,
  searchLectures,
  stripInlineMarkers,
} from './lectureSearch';
import {
  buildCompendiumDocumentPlan,
  buildMarkdownExport,
  extractGoogleDocId,
  extractPlainTextFromGoogleDoc,
} from './googleDocsBuilder';

test('parseInlineFormatting splits bold, italic, and (доп!) tokens safely', () => {
  const tokens = parseInlineFormatting(
    'Филолог **С. С. Аверинцев** писал *«Ангел тишины»* (доп! из стихотворения «Мечта», 1834).'
  );
  assert.equal(tokens.some((t) => t.type === 'bold' && t.value === 'С. С. Аверинцев'), true);
  assert.equal(tokens.some((t) => t.type === 'italic' && t.value === '«Ангел тишины»'), true);
  assert.equal(
    tokens.some((t) => t.type === 'supplement' && t.value === '(доп! из стихотворения «Мечта», 1834)'),
    true
  );
});

test('stripInlineMarkers optionally removes editorial supplements', () => {
  const raw = 'Стихотворение **«Кассандра»** (1809, (доп!)) — *классический пример*.';
  const withSupplements = stripInlineMarkers(raw, true);
  const withoutSupplements = stripInlineMarkers(raw, false);
  assert.match(withSupplements, /\(доп!\)/);
  assert.equal(withoutSupplements.includes('доп!'), false);
  assert.equal(withoutSupplements.includes('**'), false);
});

test('searchLectures finds Cyrillic terms accurately across all 6 lectures', () => {
  assert.equal(LECTURES.length, 6);
  const hits = searchLectures(LECTURES, 'Тогенбург');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].lectureId, 'lecture-1');
  assert.ok(hits[0].matchCount >= 2);

  const pushkinHits = searchLectures(LECTURES, 'Алеко');
  assert.equal(pushkinHits.length, 1);
  assert.equal(pushkinHits[0].lectureId, 'lecture-6');

  const emptyHits = searchLectures(LECTURES, '   ');
  assert.equal(emptyHits.length, 0);
});

test('filterFigures filters by category, Cyrillic query, and sorts reliably', () => {
  const decembrists = filterFigures(HISTORICAL_FIGURES, 'Пестель', 'decembrists_history', 'alpha');
  assert.equal(decembrists.length, 1);
  assert.equal(decembrists[0].id, 'pestel');

  const sortedByBirth = filterFigures(HISTORICAL_FIGURES, '', 'all', 'birthYear');
  assert.equal(sortedByBirth[0].id, 'ovid');
  assert.ok(sortedByBirth[0].birthYear < sortedByBirth[sortedByBirth.length - 1].birthYear);
});

test('filterTimeline filters by era and keeps chronological order', () => {
  const pushkinEvents = filterTimeline(TIMELINE_EVENTS, 'pushkin');
  assert.ok(pushkinEvents.length >= 5);
  for (let i = 1; i < pushkinEvents.length; i += 1) {
    assert.ok(pushkinEvents[i].year >= pushkinEvents[i - 1].year);
  }
});

test('extractGoogleDocId parses URLs, raw IDs, and rejects invalid input', () => {
  assert.equal(
    extractGoogleDocId('https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(
    extractGoogleDocId('https://docs.google.com/document/u/1/d/1AbCdEfGhIjKlMnOpQrStUvWx/view'),
    '1AbCdEfGhIjKlMnOpQrStUvWx'
  );
  assert.equal(
    extractGoogleDocId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(extractGoogleDocId('https://example.com/not-a-doc'), null);
  assert.equal(extractGoogleDocId('short'), null);
  assert.equal(extractGoogleDocId(''), null);
});

test('buildCompendiumDocumentPlan generates valid non-overlapping UTF-16 ranges for Google Docs batchUpdate', () => {
  const plan = buildCompendiumDocumentPlan(
    {
      title: 'Тестовый конспект XIX века',
      selectedLectureIds: ['lecture-1', 'lecture-5'],
      includeEditorialSupplements: true,
      includeMarginNotes: true,
      includeFiguresAppendix: true,
    },
    LECTURES,
    HISTORICAL_FIGURES,
    [
      {
        id: 'note-1',
        lectureId: 'lecture-1',
        content: 'Сравнить Людмилу и Светлану к семинару.',
        createdAt: '2026-11-23',
      },
    ],
    1
  );

  assert.equal(plan.stats.lectureCount, 2);
  assert.equal(plan.stats.noteCount, 1);
  assert.ok(plan.stats.figureCount > 5);
  assert.ok(plan.requests.length > 10);

  const insertReq = plan.requests[0];
  assert.ok(insertReq.insertText);
  assert.equal(insertReq.insertText.location.index, 1);

  const maxAllowedEnd = 1 + insertReq.insertText.text.length;
  for (let i = 1; i < plan.requests.length; i += 1) {
    const req = plan.requests[i];
    const range = req.updateParagraphStyle?.range ?? req.updateTextStyle?.range;
    assert.ok(range, `Request ${i} must have a range`);
    assert.ok(range.startIndex >= 1, `startIndex ${range.startIndex} must be >= 1`);
    assert.ok(range.endIndex > range.startIndex, `endIndex must exceed startIndex`);
    assert.ok(
      range.endIndex <= maxAllowedEnd,
      `endIndex ${range.endIndex} exceeds maxAllowedEnd ${maxAllowedEnd}`
    );
  }
});

test('buildCompendiumDocumentPlan respects non-1 baseIndex when appending to existing Google Doc', () => {
  const baseIndex = 245;
  const plan = buildCompendiumDocumentPlan(
    {
      title: 'Дополнение к конспекту',
      selectedLectureIds: ['lecture-3'],
      includeEditorialSupplements: false,
      includeMarginNotes: false,
      includeFiguresAppendix: false,
    },
    LECTURES,
    HISTORICAL_FIGURES,
    [],
    baseIndex
  );

  const insertReq = plan.requests[0];
  assert.equal(insertReq.insertText?.location.index, baseIndex);
  assert.equal(plan.plainText.startsWith('\n'), true);
  assert.equal(plan.plainText.includes('(доп!)'), false);
});

test('extractPlainTextFromGoogleDoc reads document body and computes safe append index', () => {
  const parsed = extractPlainTextFromGoogleDoc({
    documentId: 'doc-123456789012345',
    title: 'Русская литература',
    body: {
      content: [
        { endIndex: 1 },
        {
          endIndex: 20,
          paragraph: {
            elements: [{ textRun: { content: 'Лекция 1. Жуковский\n' } }],
          },
        },
        {
          endIndex: 42,
          paragraph: {
            elements: [{ textRun: { content: 'Основные тезисы.\n' } }],
          },
        },
      ],
    },
  });

  assert.equal(parsed.title, 'Русская литература');
  assert.deepEqual(parsed.paragraphs, ['Лекция 1. Жуковский', 'Основные тезисы.']);
  assert.equal(parsed.endIndex, 41);
});

test('buildMarkdownExport outputs structured markdown for selected lectures', () => {
  const md = buildMarkdownExport(
    {
      title: 'Экспорт лекций',
      selectedLectureIds: ['lecture-2'],
      includeEditorialSupplements: true,
      includeMarginNotes: false,
      includeFiguresAppendix: true,
    },
    LECTURES,
    HISTORICAL_FIGURES,
    []
  );
  assert.match(md, /^# Экспорт лекций/);
  assert.match(md, /## ЛЕКЦИЯ 2\./);
  assert.match(md, /## Приложение\. Указатель персоналий и дат/);
});
