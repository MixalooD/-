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
  buildExportBundle,
  buildExportFilename,
  buildMarkdownExport,
  buildPlainTextExport,
} from './exportBuilder';

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

test('buildMarkdownExport outputs structured markdown with optional supplements, notes, and figures', () => {
  const md = buildMarkdownExport(
    {
      title: 'Экспорт лекций',
      selectedLectureIds: ['lecture-2'],
      includeEditorialSupplements: true,
      includeMarginNotes: true,
      includeFiguresAppendix: true,
    },
    LECTURES,
    HISTORICAL_FIGURES,
    [
      {
        id: 'note-1',
        lectureId: 'lecture-2',
        sectionTitle: '2.1. Введение',
        content: 'Сопоставить кружки начала века.',
        createdAt: '23.11.2026',
      },
    ]
  );
  assert.match(md, /^# Экспорт лекций/);
  assert.match(md, /## ЛЕКЦИЯ 2\./);
  assert.match(md, /#### Личные заметки на полях/);
  assert.match(md, /Сопоставить кружки начала века\./);
  assert.match(md, /## Приложение\. Указатель персоналий и дат/);
});

test('buildPlainTextExport strips markdown formatting and optionally omits supplements', () => {
  const txt = buildPlainTextExport(
    {
      title: 'Чистый текст',
      selectedLectureIds: ['lecture-3'],
      includeEditorialSupplements: false,
      includeMarginNotes: false,
      includeFiguresAppendix: false,
    },
    LECTURES,
    HISTORICAL_FIGURES,
    []
  );
  assert.equal(txt.includes('**'), false);
  assert.equal(txt.includes('(доп!)'), false);
  assert.match(txt, /ЛЕКЦИЯ 3\./);
});

test('buildExportBundle calculates accurate stats and sorted figures for selected lectures', () => {
  const bundle = buildExportBundle(
    {
      title: 'Подборка двух лекций',
      selectedLectureIds: ['lecture-1', 'lecture-5'],
      includeEditorialSupplements: true,
      includeMarginNotes: true,
      includeFiguresAppendix: true,
    },
    LECTURES,
    HISTORICAL_FIGURES,
    [
      {
        id: 'note-a',
        lectureId: 'lecture-1',
        content: 'Сравнить Людмилу и Светлану.',
        createdAt: '23.11.2026',
      },
      {
        id: 'note-b',
        lectureId: 'lecture-6',
        content: 'Не должна попасть в выборку.',
        createdAt: '23.11.2026',
      },
    ]
  );
  assert.equal(bundle.stats.lectureCount, 2);
  assert.equal(bundle.stats.noteCount, 1);
  assert.ok(bundle.stats.sectionCount >= 6);
  assert.ok(bundle.stats.figureCount > 5);
  assert.ok(bundle.stats.wordCount > 200);
});

test('buildExportFilename creates clean Cyrillic-safe filenames', () => {
  assert.equal(
    buildExportFilename('Лекция 1: Баллады / Жуковский?', 'md'),
    'Лекция-1-Баллады-Жуковский.md'
  );
  assert.equal(buildExportFilename('   ', 'txt'), 'slovesnost-xix-konspekt.txt');
});
