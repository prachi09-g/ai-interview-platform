import type { InterviewCategory, InterviewType } from './dashboard.types';

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type QuestionType = 'TECHNICAL' | 'HR' | 'BEHAVIORAL';

export interface SessionQuestion {
  responseId: string;
  questionId: string;
  questionText: string;
  type: QuestionType;
  difficulty: Difficulty;
  isAnswered: boolean;
}

export interface EvaluationBreakdown {
  keywordMatch: { score: number; matchedKeywords: string[]; missedKeywords: string[] };
  semanticSimilarity: number;
  grammarScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  feedback: string;
}

export type EvaluationStatus = 'unanswered' | 'evaluating' | 'evaluated';

export interface InterviewResponseDetail {
  id: string;
  interviewId: string;
  questionId: string;
  transcript: string | null;
  audioUrl: string | null;
  score: number | null;
  evaluationBreakdown: EvaluationBreakdown | null;
  evaluationStatus: EvaluationStatus;
  answeredAt: string;
  question?: {
    id: string;
    questionText: string;
    modelAnswer: string;
    type: QuestionType;
    difficulty: Difficulty;
  };
}

export interface MockInterviewDetail {
  id: string;
  type: InterviewType;
  difficulty: Difficulty;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED';
  overallScore: number | null;
  isBookmarked: boolean;
  startedAt: string;
  completedAt: string | null;
  category: InterviewCategory;
  responses: InterviewResponseDetail[];
}

/**
 * POST /interviews and POST /interviews/:id/complete return a
 * MockInterview row with only `category` included — no `responses` (the
 * full session detail with responses only comes from GET /interviews/:id).
 * Typing create()/complete()'s result as the full MockInterviewDetail
 * would silently claim a `responses` array that isn't actually there.
 */
export type MockInterviewSummaryDetail = Omit<MockInterviewDetail, 'responses'>;

export interface CreateInterviewPayload {
  categoryId: string;
  type: Extract<InterviewType, 'TECHNICAL' | 'HR' | 'BEHAVIORAL'>;
  difficulty: Difficulty;
  questionCount?: number;
}
