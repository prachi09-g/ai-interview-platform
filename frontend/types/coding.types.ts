import type { InterviewCategory } from './dashboard.types';

export type SubmissionStatus = 'PENDING' | 'RUNNING' | 'PASSED' | 'FAILED' | 'ERROR';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface CodingQuestionSummary {
  id: string;
  title: string;
  difficulty: Difficulty;
  supportedLanguages: string[];
  category: InterviewCategory;
  createdAt: string;
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface CodingQuestionDetail {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  supportedLanguages: string[];
  category: InterviewCategory;
  visibleTestCase: TestCase | null;
  hiddenTestCaseCount: number;
  createdAt: string;
}

export interface CodingSubmission {
  id: string;
  userId: string;
  codingQuestionId: string;
  language: string;
  code: string;
  status: SubmissionStatus;
  score: number | null;
  runtimeMs: number | null;
  submittedAt: string;
  codingQuestion: { id: string; title: string; difficulty: Difficulty };
}

export interface PaginatedResult<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
