export interface AdminOverview {
  totalUsers: number;
  activeUsers: number;
  totalCategories: number;
  totalQuestions: number;
  totalCodingQuestions: number;
  totalInterviews: number;
  openFeedbackCount: number;
}

export interface AdminUser {
  id: string;
  email: string;
  isActive: boolean;
  emailVerified: boolean;
  role: { id: string; name: 'STUDENT' | 'ADMIN' };
  profile: { fullName: string } | null;
  createdAt: string;
}

export interface AdminCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
}

export type QuestionType = 'TECHNICAL' | 'HR' | 'BEHAVIORAL';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface AdminQuestion {
  id: string;
  categoryId: string;
  category: AdminCategory;
  type: QuestionType;
  difficulty: Difficulty;
  questionText: string;
  modelAnswer: string;
  keywords: string[];
}

export interface TestCase {
  input: string;
  expectedOutput: string;
}

export interface AdminCodingQuestion {
  id: string;
  categoryId: string;
  category: AdminCategory;
  title: string;
  description: string;
  difficulty: Difficulty;
  testCases: TestCase[];
  supportedLanguages: string[];
}

export interface AdminSkill {
  id: string;
  name: string;
  category: string | null;
}

export type FeedbackStatus = 'OPEN' | 'IN_REVIEW' | 'RESOLVED';

export interface AdminFeedback {
  id: string;
  subject: string;
  message: string;
  status: FeedbackStatus;
  createdAt: string;
  user: { email: string };
}

export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  ip: string;
}
