export type AppSection = 'lectures' | 'figures' | 'chronology' | 'docs';

export interface ContentBullet {
  text: string;
  subBullets?: string[];
}

export type ContentBlock =
  | {
      type: 'paragraph';
      text: string;
    }
  | {
      type: 'bullets';
      ordered?: boolean;
      items: ContentBullet[];
    }
  | {
      type: 'quote';
      text: string;
      attribution: string;
    }
  | {
      type: 'note';
      label: string;
      text: string;
    };

export interface LectureSection {
  id: string;
  number: string;
  title: string;
  blocks: ContentBlock[];
}

export interface Lecture {
  id: string;
  number: number;
  romanNumeral: string;
  shortTitle: string;
  title: string;
  sourceLabel: string;
  eraSpan: string;
  leadSummary: string;
  plateImage: string;
  plateCaption: string;
  plateAlt: string;
  epigraph: {
    quote: string;
    author: string;
  };
  keyConcepts: string[];
  sections: LectureSection[];
}

export type FigureCategory =
  | 'writers'
  | 'scholars'
  | 'decembrists_history'
  | 'foreign';

export interface HistoricalFigure {
  id: string;
  fullName: string;
  shortName: string;
  sortKey: string;
  birthYear: number;
  yearsLabel: string;
  category: FigureCategory;
  role: string;
  contextInLectures: string;
  lectureIds: string[];
}

export type TimelineEra = 'ballad' | 'salon' | 'decembrism' | 'pushkin';

export interface TimelineEvent {
  id: string;
  year: number;
  yearLabel: string;
  title: string;
  author?: string;
  era: TimelineEra;
  description: string;
  lectureId: string;
}

export interface MarginNote {
  id: string;
  lectureId: string;
  sectionTitle?: string;
  content: string;
  createdAt: string;
}

export interface ExportOptions {
  title: string;
  selectedLectureIds: string[];
  includeEditorialSupplements: boolean;
  includeMarginNotes: boolean;
  includeFiguresAppendix: boolean;
}

export interface GoogleDocRecord {
  documentId: string;
  title: string;
  url: string;
  action: 'created' | 'appended' | 'opened';
  updatedAt: string;
}

export type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'bold'; value: string }
  | { type: 'italic'; value: string }
  | { type: 'supplement'; value: string };
